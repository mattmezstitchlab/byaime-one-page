import { Router } from "express";
import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { clerkClient, getAuth } from "@clerk/express";
import { and, asc, eq, gt, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db, filesTable, invitationsTable, laboratoryFeedbackTable, localBridgeSessionsTable, localImportJobsTable, localPairingTokensTable, localReferencesTable, localScanJobsTable, membershipsTable, messagesTable, projectsTable, rsvpsTable, songRequestsTable, } from "@workspace/db";
import { z } from "zod";
import { ObjectNotFoundError, ObjectStorageService, } from "../lib/objectStorage";
import { authenticatedUserId, can } from "../lib/permissions";
import { buildParticipantProjection, participantNameById } from "../lib/participantProjection";
import { projectToPublicProfile } from "../lib/publicProfile";
import { buildAuthorizedWeddingBrief } from "../lib/weddingBrief";
import { buildAuthorizedProfileFil } from "../lib/profileFil";
import { createLaboratoryFeedbackInput, formatLaboratoryId, listLaboratoryFeedbackQuery, updateLaboratoryFeedbackInput, } from "../lib/laboratory";
import { mergeProtectedProjectData, projectDataForRole, } from "../lib/projectDataPolicy";
import { assertProviderAccepted } from "../lib/providerResponse";
import { isE2ETestServicesEnabled, sendE2ETestEmail, } from "../lib/e2eTestServices";
import { configuredAppOrigin, createRateLimit, safeDownloadName, signUploadAuthorization, uploadedObjectMetadataMatches, verifyUploadAuthorization, } from "../lib/security";
import { logger } from "../lib/logger";
import { buildNetworkProjection } from "../lib/networkProjection";
import { suggestForProject } from "../lib/aimeLocalScan";
import { sendResendEmail } from "../lib/resend";
const router = Router();
const storage = new ObjectStorageService();
const roles = ["owner", "planner", "family", "viewer"];
const editableRoles = new Set(["owner", "planner", "family"]);
const managedRoles = new Set(["owner", "planner"]);
const allowedTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
]);
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const UPLOAD_TOKEN_TTL_MS = 15 * 60 * 1000;
const PAIRING_TOKEN_TTL_MS = 10 * 60 * 1000;
const BRIDGE_SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const uuid = z.string().uuid();
const laboratoryReadRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    key: (req) => `laboratory-read:${authenticatedUserId(getAuth(req)) ?? req.ip}`,
});
const laboratoryWriteRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    key: (req) => `laboratory-write:${authenticatedUserId(getAuth(req)) ?? req.ip}`,
});
function laboratoryFeedbackResponse(feedback, currentUserId) {
    return {
        id: feedback.id,
        labId: formatLaboratoryId(feedback.sequence),
        type: feedback.type,
        status: feedback.status,
        message: feedback.message,
        context: feedback.context,
        createdAt: feedback.createdAt.toISOString(),
        updatedAt: feedback.updatedAt.toISOString(),
        authoredByCurrentUser: feedback.authorUserId === currentUserId,
    };
}
function hashedToken(value) {
    return createHash("sha256").update(value).digest("hex");
}
function toLocalScanItems(value) {
    return Array.isArray(value) ? value : [];
}
function toScanSuggestions(value) {
    return Array.isArray(value) ? value : [];
}
function scanJobFromRow(job) {
    return {
        id: job.id,
        projectId: job.projectId,
        ownerUserId: job.ownerUserId,
        folders: job.folders,
        createdAt: job.createdAt.toISOString(),
        status: job.status,
        completedAt: job.completedAt?.toISOString(),
        results: toLocalScanItems(job.results),
        suggestions: toScanSuggestions(job.suggestions),
        error: job.error ?? undefined,
    };
}
function importJobFromRow(job) {
    return {
        id: job.id,
        projectId: job.projectId,
        ownerUserId: job.ownerUserId,
        localReferenceId: job.localReferenceId,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        error: job.error ?? undefined,
    };
}
async function consumePairingToken(token) {
    const now = new Date();
    const [pairing] = await db
        .update(localPairingTokensTable)
        .set({ consumedAt: now })
        .where(and(eq(localPairingTokensTable.tokenHash, hashedToken(token)), isNull(localPairingTokensTable.consumedAt), gt(localPairingTokensTable.expiresAt, now)))
        .returning();
    return pairing;
}
async function nextQueuedScanJob(userId) {
    const [job] = await db
        .select()
        .from(localScanJobsTable)
        .where(and(eq(localScanJobsTable.ownerUserId, userId), eq(localScanJobsTable.status, "queued")))
        .orderBy(asc(localScanJobsTable.createdAt))
        .limit(1);
    return job ? scanJobFromRow(job) : undefined;
}
async function nextQueuedImportJob(userId) {
    const [job] = await db
        .select()
        .from(localImportJobsTable)
        .where(and(eq(localImportJobsTable.ownerUserId, userId), eq(localImportJobsTable.status, "queued")))
        .orderBy(asc(localImportJobsTable.createdAt))
        .limit(1);
    return job ? importJobFromRow(job) : undefined;
}
function authorizeCron(req, res) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        res.status(503).json({ error: "CRON_SECRET manquant" });
        return false;
    }
    if (req.get("authorization") !== "Bearer " + secret) {
        res.status(401).json({ error: "Cron non autorisé" });
        return false;
    }
    return true;
}
const localWebRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 180,
    key: (req) => `aime-local-web:${req.ip}:${req.path}`,
});
const localBridgeRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    key: (req) => `aime-local-bridge:${req.ip}:${req.path}`,
});
function shouldSimulateProviderFailure(req) {
    return (process.env.NODE_ENV !== "production" &&
        process.env.AIME_E2E_RUN === "1" &&
        req.get("x-aime-e2e-provider") === "failure");
}
async function sendEmail(path, body) {
    if (isE2ETestServicesEnabled())
        return sendE2ETestEmail();
    if (path !== "/emails")
        throw new Error(`Unsupported Resend path: ${path}`);
    return sendResendEmail(JSON.parse(body));
}
async function deliverMessage(message, simulateProviderFailure = false) {
    try {
        if (simulateProviderFailure) {
            throw new Error("Échec fournisseur simulé pour le scénario E2E");
        }
        const providerResponse = await sendEmail("/emails", JSON.stringify({
            from: "AIME <onboarding@resend.dev>",
            to: message.recipients,
            subject: message.subject,
            html: `<div>${escapeHtml(message.body).replaceAll("\n", "<br>")}</div>`,
        }));
        assertProviderAccepted(providerResponse, "le message");
        const [sent] = await db
            .update(messagesTable)
            .set({ status: "sent", sentAt: new Date(), providerError: null })
            .where(eq(messagesTable.id, message.id))
            .returning();
        return { message: sent, error: undefined };
    }
    catch (error) {
        const providerError = error instanceof Error ? error.message : "Erreur Resend";
        const [failed] = await db
            .update(messagesTable)
            .set({ status: "failed", providerError })
            .where(eq(messagesTable.id, message.id))
            .returning();
        return { message: failed, error: providerError };
    }
}
async function deliverScheduledMessages() {
    const dueMessages = await db
        .update(messagesTable)
        .set({ status: "pending" })
        .where(and(eq(messagesTable.status, "scheduled"), lte(messagesTable.scheduledAt, new Date())))
        .returning();
    for (const message of dueMessages) {
        const result = await deliverMessage(message);
        if (result.error) {
            logger.warn({ messageId: message.id, projectId: message.projectId, providerError: result.error }, "Scheduled email provider failure recorded");
        }
        else {
            logger.info({ messageId: message.id, projectId: message.projectId }, "Scheduled email delivered");
        }
    }
}
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
    const scheduledDeliveryTimer = setInterval(() => {
        void deliverScheduledMessages().catch((error) => {
            logger.warn({ error }, "Scheduled email sweep failed");
        });
    }, 30_000);
    scheduledDeliveryTimer.unref?.();
}
router.get("/cron/scheduled-messages", async (req, res) => {
    if (!authorizeCron(req, res))
        return;
    await deliverScheduledMessages();
    res.json({ ok: true });
});
const projectInput = z.object({
    title: z.string().trim().min(1).max(160),
    data: z.record(z.string(), z.unknown()),
});
const projectUpdate = projectInput.extend({ updatedAt: z.string().datetime() });
const inviteInput = z.object({
    email: z.string().email(),
    role: z.enum(roles).exclude(["owner"]),
});
const fileInput = z.object({
    projectId: z.string().uuid(),
    name: z.string().trim().min(1).max(240),
    contentType: z.string(),
    size: z.number().int().positive().max(MAX_FILE_SIZE),
});
const fileFinalize = fileInput.extend({
    objectPath: z.string().regex(/^\/objects\/uploads\/[a-f0-9-]+$/i),
    finalizeToken: z.string().min(32).max(4096),
});
const messageInput = z.object({
    kind: z.enum([
        "invitation",
        "rsvp_reminder",
        "practical_info",
        "provider_follow_up",
        "thank_you",
        "event_change",
    ]),
    recipients: z.array(z.string().email()).min(1).max(100),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(20_000),
    confirmed: z.literal(true),
    timelineEventId: z.string().trim().min(1).max(200).optional(),
    scheduledAt: z.string().datetime().optional(),
});
const messageScheduleInput = z.object({
    scheduledAt: z.string().datetime(),
});
const rsvpInput = z.object({
    status: z.enum(["confirmed", "declined"]),
    attendance: z.object({
        ceremony: z.boolean(),
        cocktail: z.boolean(),
        dinner: z.boolean(),
        brunch: z.boolean(),
    }),
    dietary: z.string().max(1000).optional(),
    plusOne: z.boolean(),
    notes: z.string().max(2000).optional(),
});
const participantUploadInput = z.object({
    name: z.string().trim().min(1).max(240),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4"]),
    size: z.number().int().positive().max(MAX_FILE_SIZE),
});
const participantMediaFinalize = participantUploadInput.extend({
    objectPath: z.string().regex(/^\/objects\/uploads\/[a-f0-9-]+$/i),
    finalizeToken: z.string().min(32).max(4096),
    caption: z.string().trim().max(1_000).optional(),
    visibility: z.enum(["couple", "guests"]),
    consent: z.literal(true),
});
const songRequestInput = z.object({
    title: z.string().trim().min(1).max(200),
    artist: z.string().trim().min(1).max(200),
    message: z.string().trim().max(1_000).optional(),
});
const localPairingTokenInput = z.object({
    bridgeLabel: z.string().trim().min(1).max(120).optional(),
});
const localPairInput = z.object({
    token: z.string().min(24).max(256),
    bridgeId: z.string().trim().min(8).max(240),
    bridgeVersion: z.string().trim().min(1).max(80).optional(),
});
const localBridgeSessionInput = z.object({
    sessionToken: z.string().min(32).max(256),
});
const localAuthorizedFoldersInput = z.object({
    folders: z.array(z.string().trim().min(1).max(240)).max(30),
});
const localScanRequestInput = z.object({
    folders: z.array(z.string().trim().min(1).max(240)).max(30).optional(),
});
const localScanItemSchema = z.object({
    name: z.string().trim().min(1).max(240),
    extension: z.string().trim().max(20).default(""),
    fileType: z.string().trim().min(1).max(40),
    documentType: z.string().trim().max(40).optional(),
    size: z.number().int().nonnegative(),
    modifiedAt: z.string().datetime(),
    relativePath: z.string().trim().min(1).max(600),
    sourceFolder: z.string().trim().min(1).max(240),
    localIdentifier: z.string().trim().min(16).max(256),
    fingerprint: z.string().trim().max(256).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    entities: z.record(z.string(), z.unknown()).optional(),
});
const localScanResultInput = z.object({
    sessionToken: z.string().min(32).max(256),
    results: z.array(localScanItemSchema).max(20_000),
    error: z.string().trim().max(500).optional(),
});
const localReferenceCreateInput = z.object({
    localIdentifier: z.string().trim().min(16).max(256),
    fingerprint: z.string().trim().max(256).optional(),
    filename: z.string().trim().min(1).max(240),
    relativePath: z.string().trim().min(1).max(600),
    sourceFolder: z.string().trim().min(1).max(240),
    extension: z.string().trim().max(20).optional(),
    fileType: z.string().trim().min(1).max(40),
    size: z.number().int().nonnegative(),
    modifiedAt: z.string().datetime(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    linkedEntityKind: z.string().trim().max(80).optional(),
    linkedEntityId: z.string().trim().max(160).optional(),
    linkedTimelineEventId: z.string().trim().max(160).optional(),
});
const localReferenceStateInput = z.object({
    state: z.enum(["local", "linked", "imported", "ignored"]),
});
const bridgeImportFinalizeInput = z.object({
    sessionToken: z.string().min(32).max(256),
    objectPath: z.string().regex(/^\/objects\/uploads\/[a-f0-9-]+$/i),
    finalizeToken: z.string().min(32).max(4096),
    projectId: z.string().uuid(),
    localReferenceId: z.string().uuid(),
    name: z.string().trim().min(1).max(240),
    contentType: z.string().trim().min(1).max(140),
    size: z.number().int().positive().max(MAX_FILE_SIZE),
});
async function activeRsvp(token) {
    if (!uuid.safeParse(token).success)
        return undefined;
    const [link] = await db
        .select({
        id: rsvpsTable.id,
        projectId: rsvpsTable.projectId,
        guestId: rsvpsTable.guestId,
        token: rsvpsTable.token,
        revoked: rsvpsTable.revoked,
    })
        .from(rsvpsTable)
        .where(and(eq(rsvpsTable.token, token), eq(rsvpsTable.revoked, false)));
    return link;
}
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    })[character]);
}
function uploadSecret() {
    const secret = process.env.SESSION_SECRET;
    if (!secret)
        throw new Error("SESSION_SECRET is required for upload finalization");
    return secret;
}
function auth(req, res, next) {
    const value = getAuth(req);
    const userId = authenticatedUserId(value);
    if (!userId) {
        res.status(401).json({ error: "Authentification requise" });
        return;
    }
    req.userId = userId;
    next();
}
async function membership(projectId, userId) {
    const [member] = await db
        .select()
        .from(membershipsTable)
        .where(and(eq(membershipsTable.projectId, projectId), eq(membershipsTable.userId, userId)));
    return member;
}
function ensureBridgeSessionToken(input) {
    return { sessionTokenHash: signUploadAuthorization({ token: input }, uploadSecret()) };
}
async function activeBridgeSessionByToken(sessionToken) {
    const { sessionTokenHash } = ensureBridgeSessionToken(sessionToken);
    const [session] = await db
        .select()
        .from(localBridgeSessionsTable)
        .where(and(eq(localBridgeSessionsTable.sessionTokenHash, sessionTokenHash), isNull(localBridgeSessionsTable.revokedAt)));
    if (!session)
        return undefined;
    if (session.expiresAt.getTime() <= Date.now())
        return undefined;
    return session;
}
function authorizeBridgeOrigin(req, res) {
    const origin = req.get("origin");
    if (origin && !/^https?:\/\/localhost(?::\d+)?$/.test(origin) && !/^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)) {
        res.status(403).json({ error: "Origine locale requise" });
        return false;
    }
    return true;
}
function isSafeRelativePath(value) {
    if (!value || value.startsWith("/") || value.startsWith("\\"))
        return false;
    const unix = value.replaceAll("\\", "/");
    return !unix.split("/").some((segment) => segment === "..");
}
router.param("id", (req, res, next, value) => {
    if (!uuid.safeParse(String(value)).success) {
        res.status(404).json({ error: "Ressource introuvable" });
        return;
    }
    next();
});
router.get("/public/profiles/:id", async (req, res) => {
    const projectId = z.string().uuid().safeParse(String(req.params.id));
    if (!projectId.success) {
        res.status(404).json({ error: "Profil public introuvable" });
        return;
    }
    const [project] = await db
        .select({
        id: projectsTable.id,
        title: projectsTable.title,
        data: projectsTable.data,
    })
        .from(projectsTable)
        .where(eq(projectsTable.id, projectId.data));
    const profile = project ? projectToPublicProfile(project) : null;
    if (!profile) {
        res.status(404).json({ error: "Profil public introuvable" });
        return;
    }
    res.json(profile);
});
function parseBody(schema, req, res) {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        res
            .status(400)
            .json({ error: "Données invalides", details: result.error.flatten() });
        return;
    }
    return result.data;
}
router.get("/network/subjects", auth, async (req, res) => {
    const rows = await db
        .select({
        id: projectsTable.id,
        title: projectsTable.title,
        data: projectsTable.data,
        role: membershipsTable.role,
    })
        .from(membershipsTable)
        .innerJoin(projectsTable, eq(projectsTable.id, membershipsTable.projectId))
        .where(eq(membershipsTable.userId, req.userId));
    res.setHeader("Cache-Control", "private, no-store");
    res.json(buildNetworkProjection(rows));
});
router.get("/projects", auth, async (req, res) => {
    const rows = await db
        .select({ project: projectsTable, role: membershipsTable.role })
        .from(membershipsTable)
        .innerJoin(projectsTable, eq(projectsTable.id, membershipsTable.projectId))
        .where(eq(membershipsTable.userId, req.userId));
    res.json(rows.map(({ project, role }) => ({
        ...project,
        data: projectDataForRole(project.data, role),
        role,
    })));
});
router.get("/projects/:id/brief", auth, async (req, res) => {
    const member = await membership(String(req.params.id), req.userId);
    if (!member) {
        res.status(404).json({ error: "Monde introuvable" });
        return;
    }
    const [project] = await db
        .select({
        id: projectsTable.id,
        title: projectsTable.title,
        data: projectsTable.data,
    })
        .from(projectsTable)
        .where(eq(projectsTable.id, String(req.params.id)));
    if (!project) {
        res.status(404).json({ error: "Monde introuvable" });
        return;
    }
    res.json(buildAuthorizedWeddingBrief({
        projectId: project.id,
        title: project.title,
        data: project.data,
        role: member.role,
        useWorldLocation: false,
    }));
});
router.get("/projects/:id/fil", auth, async (req, res) => {
    const member = await membership(String(req.params.id), req.userId);
    if (!member) {
        res.status(404).json({ error: "Monde introuvable" });
        return;
    }
    const [project] = await db
        .select({
        id: projectsTable.id,
        title: projectsTable.title,
        data: projectsTable.data,
    })
        .from(projectsTable)
        .where(eq(projectsTable.id, String(req.params.id)));
    if (!project) {
        res.status(404).json({ error: "Monde introuvable" });
        return;
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.json(buildAuthorizedProfileFil({
        projectId: project.id,
        title: project.title,
        data: project.data,
        role: member.role,
    }));
});
router.post("/projects/:id/brief/nearby", auth, async (req, res) => {
    const consent = parseBody(z.object({ consent: z.literal(true) }), req, res);
    if (!consent)
        return;
    const member = await membership(String(req.params.id), req.userId);
    if (!member) {
        res.status(404).json({ error: "Monde introuvable" });
        return;
    }
    const [project] = await db
        .select({
        id: projectsTable.id,
        title: projectsTable.title,
        data: projectsTable.data,
    })
        .from(projectsTable)
        .where(eq(projectsTable.id, String(req.params.id)));
    if (!project) {
        res.status(404).json({ error: "Monde introuvable" });
        return;
    }
    res.json(buildAuthorizedWeddingBrief({
        projectId: project.id,
        title: project.title,
        data: project.data,
        role: member.role,
        useWorldLocation: true,
    }));
});
router.get("/account/export", auth, createRateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    key: (req) => `account-export:${req.userId}`,
}), async (req, res) => {
    const userId = req.userId;
    const ownedProjects = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.ownerUserId, userId));
    const collaborations = await db
        .select({
        projectId: membershipsTable.projectId,
        role: membershipsTable.role,
        email: membershipsTable.email,
        createdAt: membershipsTable.createdAt,
    })
        .from(membershipsTable)
        .where(eq(membershipsTable.userId, userId));
    const uploadedFiles = await db
        .select({
        id: filesTable.id,
        projectId: filesTable.projectId,
        name: filesTable.name,
        contentType: filesTable.contentType,
        size: filesTable.size,
        createdAt: filesTable.createdAt,
    })
        .from(filesTable)
        .where(eq(filesTable.uploaderUserId, userId));
    const sentMessages = await db
        .select({
        id: messagesTable.id,
        projectId: messagesTable.projectId,
        kind: messagesTable.kind,
        recipients: messagesTable.recipients,
        subject: messagesTable.subject,
        body: messagesTable.body,
        status: messagesTable.status,
        sentAt: messagesTable.sentAt,
        createdAt: messagesTable.createdAt,
    })
        .from(messagesTable)
        .where(eq(messagesTable.createdBy, userId));
    const sentInvitations = await db
        .select({
        id: invitationsTable.id,
        projectId: invitationsTable.projectId,
        email: invitationsTable.email,
        role: invitationsTable.role,
        acceptedAt: invitationsTable.acceptedAt,
        revokedAt: invitationsTable.revokedAt,
        createdAt: invitationsTable.createdAt,
    })
        .from(invitationsTable)
        .where(eq(invitationsTable.invitedBy, userId));
    res.setHeader("Content-Disposition", 'attachment; filename="mes-donnees-aime.json"');
    res.setHeader("Cache-Control", "no-store");
    res.json({
        format: "aime-personal-export",
        version: 1,
        exportedAt: new Date().toISOString(),
        ownedProjects,
        collaborations,
        uploadedFiles,
        sentMessages,
        sentInvitations,
    });
});
router.delete("/account", auth, async (req, res) => {
    if (req.body?.confirmation !== "SUPPRIMER MON COMPTE") {
        res
            .status(400)
            .json({ error: "Confirmation SUPPRIMER MON COMPTE requise" });
        return;
    }
    const userId = req.userId;
    const ownedProjects = await db
        .select({ id: projectsTable.id })
        .from(projectsTable)
        .where(eq(projectsTable.ownerUserId, userId));
    const ownedFiles = (await Promise.all(ownedProjects.map(({ id }) => db.select().from(filesTable).where(eq(filesTable.projectId, id))))).flat();
    const userUploadedFiles = await db
        .select()
        .from(filesTable)
        .where(eq(filesTable.uploaderUserId, userId));
    const objectPaths = [
        ...new Set([...ownedFiles, ...userUploadedFiles].map(({ objectPath }) => objectPath)),
    ];
    const deletionResults = await Promise.allSettled(objectPaths.map(async (objectPath) => {
        try {
            await (await storage.getObjectEntityFile(objectPath)).delete();
        }
        catch (error) {
            if (!(error instanceof ObjectNotFoundError))
                throw error;
        }
    }));
    const failedObjects = deletionResults.filter((result) => result.status === "rejected");
    if (failedObjects.length > 0) {
        req.log.error({ userId, failedObjects: failedObjects.length }, "Account deletion stopped before database removal");
        res.status(503).json({
            error: "Certains documents n’ont pas pu être supprimés. Le compte a été conservé afin de réessayer sans perdre leur trace.",
        });
        return;
    }
    await db.transaction(async (tx) => {
        await tx.delete(filesTable).where(eq(filesTable.uploaderUserId, userId));
        await tx.delete(messagesTable).where(eq(messagesTable.createdBy, userId));
        await tx
            .delete(invitationsTable)
            .where(eq(invitationsTable.invitedBy, userId));
        await tx
            .delete(projectsTable)
            .where(eq(projectsTable.ownerUserId, userId));
        await tx
            .delete(membershipsTable)
            .where(eq(membershipsTable.userId, userId));
    });
    try {
        await clerkClient.users.deleteUser(userId);
    }
    catch (error) {
        req.log.error({ error, userId }, "Clerk account deletion failed after application data cleanup");
        res.status(502).json({
            error: "Les données AIME ont été supprimées, mais la fermeture de la connexion doit être relancée.",
        });
        return;
    }
    res.sendStatus(204);
});
router.post("/projects", auth, async (req, res) => {
    const input = parseBody(projectInput, req, res);
    if (!input)
        return;
    const [project] = await db.transaction(async (tx) => {
        const created = await tx
            .insert(projectsTable)
            .values({ ...input, ownerUserId: req.userId })
            .returning();
        await tx.insert(membershipsTable).values({
            projectId: created[0].id,
            userId: req.userId,
            role: "owner",
        });
        return created;
    });
    res.status(201).json({ ...project, role: "owner" });
});
router.put("/projects/:id", auth, async (req, res) => {
    const input = parseBody(projectUpdate, req, res);
    if (!input)
        return;
    const member = await membership(String(req.params.id), req.userId);
    if (!member) {
        res.status(404).json({ error: "Projet introuvable" });
        return;
    }
    if (!editableRoles.has(member.role)) {
        res.status(403).json({ error: "Permission de modification refusée" });
        return;
    }
    const [current] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, String(req.params.id)));
    if (!current) {
        res.status(404).json({ error: "Projet introuvable" });
        return;
    }
    const currentPublished = Boolean(current.data?.publicProfile?.published);
    const nextPublished = Boolean(input.data.publicProfile &&
        input.data.publicProfile.published);
    if (member.role !== "owner" && currentPublished !== nextPublished) {
        res
            .status(403)
            .json({ error: "Seul le propriétaire peut modifier la publication" });
        return;
    }
    if (current.updatedAt.toISOString() !== input.updatedAt) {
        res.status(409).json({
            error: "Le projet a été modifié ailleurs",
            project: {
                ...current,
                data: projectDataForRole(current.data, member.role),
            },
        });
        return;
    }
    const nextData = mergeProtectedProjectData(current.data, input.data, member.role);
    const [updated] = await db
        .update(projectsTable)
        .set({ title: input.title, data: nextData, updatedAt: new Date() })
        .where(and(eq(projectsTable.id, current.id), sql `date_trunc('milliseconds', ${projectsTable.updatedAt}) = ${current.updatedAt}`))
        .returning();
    if (!updated) {
        res.status(409).json({ error: "Conflit de version" });
        return;
    }
    res.json({
        ...updated,
        data: projectDataForRole(updated.data, member.role),
        role: member.role,
    });
});
router.delete("/projects/:id", auth, async (req, res) => {
    if (req.body?.confirmation !== "SUPPRIMER") {
        res.status(400).json({ error: "Confirmation SUPPRIMER requise" });
        return;
    }
    const member = await membership(String(req.params.id), req.userId);
    if (member?.role !== "owner") {
        res.status(403).json({ error: "Seul le propriétaire peut supprimer" });
        return;
    }
    const files = await db
        .select()
        .from(filesTable)
        .where(eq(filesTable.projectId, String(req.params.id)));
    const deletionResults = await Promise.allSettled(files.map(async ({ objectPath }) => {
        try {
            await (await storage.getObjectEntityFile(objectPath)).delete();
        }
        catch (error) {
            if (!(error instanceof ObjectNotFoundError))
                throw error;
        }
    }));
    const failedObjects = deletionResults.filter((result) => result.status === "rejected");
    if (failedObjects.length > 0) {
        req.log.error({ projectId: req.params.id, failedObjects: failedObjects.length }, "Project deletion stopped before database removal");
        res.status(503).json({
            error: "Certains documents n’ont pas pu être supprimés. Le Monde a été conservé afin de réessayer sans perdre sa trace.",
        });
        return;
    }
    await db
        .delete(projectsTable)
        .where(eq(projectsTable.id, String(req.params.id)));
    res.sendStatus(204);
});
router.patch("/projects/:id/privacy", auth, async (req, res) => {
    const input = parseBody(z.object({ retentionDays: z.number().int().min(30).max(3650) }), req, res);
    if (!input)
        return;
    const member = await membership(String(req.params.id), req.userId);
    if (member?.role !== "owner") {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const [project] = await db
        .update(projectsTable)
        .set({ retentionDays: input.retentionDays, updatedAt: new Date() })
        .where(eq(projectsTable.id, String(req.params.id)))
        .returning();
    res.json(project);
});
router.get("/projects/:id/export", auth, async (req, res) => {
    const member = await membership(String(req.params.id), req.userId);
    if (!member) {
        res.status(404).json({ error: "Projet introuvable" });
        return;
    }
    if (!can(member.role, "delete")) {
        res.status(403).json({
            error: "Seul le propriétaire peut exporter toutes les données du Monde",
        });
        return;
    }
    const [project] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, String(req.params.id)));
    res.setHeader("Content-Disposition", `attachment; filename="aime-${project.id}.json"`);
    res.setHeader("Cache-Control", "no-store");
    res.json({
        format: "aime-backup",
        version: 2,
        exportedAt: new Date().toISOString(),
        project: {
            id: project.id,
            title: project.title,
            data: project.data,
            retentionDays: project.retentionDays,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        },
    });
});
router.get("/projects/:id/members", auth, async (req, res) => {
    const member = await membership(String(req.params.id), req.userId);
    if (!member) {
        res.status(404).json({ error: "Projet introuvable" });
        return;
    }
    const members = await db
        .select()
        .from(membershipsTable)
        .where(eq(membershipsTable.projectId, String(req.params.id)));
    const invitations = managedRoles.has(member.role)
        ? await db
            .select()
            .from(invitationsTable)
            .where(eq(invitationsTable.projectId, String(req.params.id)))
        : [];
    res.json({ members, invitations });
});
router.post("/projects/:id/invitations", auth, createRateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    key: (req) => `invite:${req.userId}`,
}), async (req, res) => {
    const input = parseBody(inviteInput, req, res);
    if (!input)
        return;
    const projectId = String(req.params.id);
    const member = await membership(projectId, req.userId);
    if (!managedRoles.has(member?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const [invitation] = await db
        .insert(invitationsTable)
        .values({ projectId, ...input, invitedBy: req.userId })
        .returning();
    const link = `${configuredAppOrigin({
        appUrl: process.env.APP_URL,
        req,
        environment: process.env.NODE_ENV,
    })}/invite/${invitation.token}`;
    try {
        const providerResponse = await sendEmail("/emails", JSON.stringify({
            from: "AIME <onboarding@resend.dev>",
            to: [input.email],
            subject: "Invitation à votre espace mariage AIME",
            html: `<p>Vous êtes invité·e à collaborer sur un mariage dans AIME.</p><p><a href="${link}">Accepter l'invitation</a></p>`,
        }));
        assertProviderAccepted(providerResponse, "l’invitation");
    }
    catch (error) {
        await db
            .delete(invitationsTable)
            .where(eq(invitationsTable.id, invitation.id));
        res.status(502).json({
            error: `Invitation non envoyée: ${error instanceof Error ? error.message : "erreur Resend"}`,
        });
        return;
    }
    res.status(201).json(invitation);
});
router.post("/invitations/:token/accept", auth, async (req, res) => {
    if (!uuid.safeParse(String(req.params.token)).success) {
        res.status(404).json({ error: "Invitation invalide ou révoquée" });
        return;
    }
    const [invite] = await db
        .select()
        .from(invitationsTable)
        .where(and(eq(invitationsTable.token, String(req.params.token)), isNull(invitationsTable.revokedAt), isNull(invitationsTable.acceptedAt)));
    if (!invite) {
        res.status(404).json({ error: "Invitation invalide ou révoquée" });
        return;
    }
    const user = await clerkClient.users.getUser(req.userId);
    const verifiedEmails = user.emailAddresses
        .filter(({ verification }) => verification?.status === "verified")
        .map(({ emailAddress }) => emailAddress.trim().toLowerCase());
    if (!verifiedEmails.includes(invite.email.trim().toLowerCase())) {
        res.status(403).json({
            error: "Cette invitation est destinée à une autre adresse e-mail",
        });
        return;
    }
    await db.transaction(async (tx) => {
        await tx
            .insert(membershipsTable)
            .values({
            projectId: invite.projectId,
            userId: req.userId,
            email: invite.email,
            role: invite.role,
        })
            .onConflictDoNothing();
        await tx
            .update(invitationsTable)
            .set({ acceptedAt: new Date() })
            .where(eq(invitationsTable.id, invite.id));
    });
    res.json({ projectId: invite.projectId });
});
router.delete("/invitations/:id", auth, async (req, res) => {
    const [invite] = await db
        .select()
        .from(invitationsTable)
        .where(eq(invitationsTable.id, String(req.params.id)));
    if (!invite ||
        (await membership(invite.projectId, req.userId))?.role !== "owner") {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    await db
        .update(invitationsTable)
        .set({ revokedAt: new Date() })
        .where(eq(invitationsTable.id, invite.id));
    res.sendStatus(204);
});
router.post("/storage/uploads/request-url", auth, async (req, res) => {
    const input = parseBody(fileInput, req, res);
    if (!input)
        return;
    const member = await membership(input.projectId, req.userId);
    if (!managedRoles.has(member?.role ?? "")) {
        res.status(403).json({ error: "Permission d'envoi refusée" });
        return;
    }
    if (!allowedTypes.has(input.contentType)) {
        res.status(415).json({ error: "Type de fichier non autorisé" });
        return;
    }
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL.split("?")[0]);
    const finalizeToken = signUploadAuthorization({
        ...input,
        objectPath,
        userId: req.userId,
        expiresAt: Date.now() + UPLOAD_TOKEN_TTL_MS,
    }, uploadSecret());
    res.json({ uploadURL, objectPath, finalizeToken });
});
router.post("/storage/files", auth, async (req, res) => {
    const input = parseBody(fileFinalize, req, res);
    if (!input)
        return;
    const member = await membership(input.projectId, req.userId);
    if (!managedRoles.has(member?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const { finalizeToken, ...file } = input;
    if (!verifyUploadAuthorization(finalizeToken, { ...file, userId: req.userId }, uploadSecret())) {
        res
            .status(403)
            .json({ error: "Autorisation de finalisation invalide ou expirée" });
        return;
    }
    const path = await storage.trySetObjectEntityAclPolicy(input.objectPath, {
        owner: req.userId,
        visibility: "private",
    });
    const [storedFile] = await db
        .insert(filesTable)
        .values({ ...file, objectPath: path, uploaderUserId: req.userId })
        .returning();
    res.status(201).json(storedFile);
});
router.get("/projects/:id/files", auth, async (req, res) => {
    const projectId = String(req.params.id);
    const member = await membership(projectId, req.userId);
    if (!managedRoles.has(member?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    res.json(await db
        .select()
        .from(filesTable)
        .where(and(eq(filesTable.projectId, projectId), isNull(filesTable.guestId))));
});
router.get("/storage/files/:id", auth, async (req, res) => {
    const [meta] = await db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, String(req.params.id)));
    const member = meta && (await membership(meta.projectId, req.userId));
    if (!meta || !managedRoles.has(member?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const response = await storage.downloadObject(await storage.getObjectEntityFile(meta.objectPath), 0);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    if (meta.guestId) {
        res.setHeader("Content-Type", meta.contentType);
        res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
        res.setHeader("Content-Disposition", `attachment; filename="${safeDownloadName(meta.name)}"; filename*=UTF-8''${encodeURIComponent(meta.name)}`);
    }
    if (req.query.download === "1")
        res.setHeader("Content-Disposition", `attachment; filename="${safeDownloadName(meta.name)}"; filename*=UTF-8''${encodeURIComponent(meta.name)}`);
    if (response.body)
        Readable.fromWeb(response.body).pipe(res);
});
router.delete("/storage/files/:id", auth, async (req, res) => {
    const [meta] = await db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, String(req.params.id)));
    const member = meta && (await membership(meta.projectId, req.userId));
    if (!meta || !managedRoles.has(member?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    await (await storage.getObjectEntityFile(meta.objectPath)).delete();
    await db.delete(filesTable).where(eq(filesTable.id, meta.id));
    res.sendStatus(204);
});
router.post("/projects/:id/messages", auth, createRateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    key: (req) => `message:${req.userId}`,
}), async (req, res) => {
    const input = parseBody(messageInput, req, res);
    if (!input)
        return;
    const projectId = String(req.params.id);
    const member = await membership(projectId, req.userId);
    if (!managedRoles.has(member?.role ?? "")) {
        res.status(403).json({ error: "Permission d'envoi refusée" });
        return;
    }
    const [message] = await db
        .insert(messagesTable)
        .values({
        projectId,
        kind: input.kind,
        recipients: input.recipients,
        subject: input.subject,
        body: input.body,
        timelineEventId: input.timelineEventId,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        createdBy: req.userId,
        status: input.scheduledAt && new Date(input.scheduledAt) > new Date() ? "scheduled" : "pending",
    })
        .returning();
    if (message.status === "scheduled") {
        req.log.info({ messageId: message.id, projectId, scheduledAt: message.scheduledAt }, "Email scheduled");
        res.status(201).json(message);
        return;
    }
    const result = await deliverMessage(message, shouldSimulateProviderFailure(req));
    if (result.error) {
        req.log.warn({ messageId: message.id, projectId, status: result.message.status, providerError: result.error }, "Email provider failure recorded");
        res.status(502).json(result.message);
        return;
    }
    req.log.info({ messageId: message.id, projectId, status: result.message.status }, "Email delivery recorded");
    res.status(201).json(result.message);
});
router.get("/projects/:id/messages", auth, async (req, res) => {
    const projectId = String(req.params.id);
    const member = await membership(projectId, req.userId);
    if (!member) {
        res.status(404).json({ error: "Projet introuvable" });
        return;
    }
    if (!managedRoles.has(member.role)) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    await deliverScheduledMessages();
    res.json(await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.projectId, projectId)));
});
router.patch("/projects/:id/messages/:messageId", auth, async (req, res) => {
    const projectId = String(req.params.id);
    const messageId = String(req.params.messageId);
    const parsed = messageScheduleInput.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
    }
    const scheduledAt = new Date(parsed.data.scheduledAt);
    if (scheduledAt <= new Date()) {
        res.status(400).json({ error: "La nouvelle date doit être dans le futur" });
        return;
    }
    const member = await membership(projectId, req.userId);
    if (!managedRoles.has(member?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const [message] = await db
        .select()
        .from(messagesTable)
        .where(and(eq(messagesTable.id, messageId), eq(messagesTable.projectId, projectId)));
    if (!message) {
        res.status(404).json({ error: "Message introuvable" });
        return;
    }
    if (message.status !== "scheduled") {
        res.status(409).json({ error: "Seul un rappel programmé peut être replanifié" });
        return;
    }
    const [updated] = await db
        .update(messagesTable)
        .set({ scheduledAt, providerError: null })
        .where(eq(messagesTable.id, messageId))
        .returning();
    res.json(updated);
});
router.post("/projects/:id/messages/:messageId", auth, async (req, res) => {
    const projectId = String(req.params.id);
    const messageId = String(req.params.messageId);
    const member = await membership(projectId, req.userId);
    if (!managedRoles.has(member?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const [message] = await db
        .select()
        .from(messagesTable)
        .where(and(eq(messagesTable.id, messageId), eq(messagesTable.projectId, projectId)));
    if (!message) {
        res.status(404).json({ error: "Message introuvable" });
        return;
    }
    if (message.status !== "scheduled") {
        res.status(409).json({ error: "Seul un rappel programmé peut être annulé" });
        return;
    }
    const [cancelled] = await db
        .update(messagesTable)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(eq(messagesTable.id, messageId))
        .returning();
    res.json(cancelled);
});
router.get("/projects/:id/laboratory-feedback", laboratoryReadRateLimit, auth, async (req, res) => {
    const projectId = String(req.params.id);
    const member = await membership(projectId, req.userId);
    if (!member) {
        res.status(404).json({ error: "Monde introuvable" });
        return;
    }
    const filters = listLaboratoryFeedbackQuery.safeParse(req.query);
    if (!filters.success) {
        res.status(400).json({ error: "Filtres invalides", details: filters.error.flatten() });
        return;
    }
    const conditions = [
        eq(laboratoryFeedbackTable.projectId, projectId),
        filters.data.type ? eq(laboratoryFeedbackTable.type, filters.data.type) : undefined,
        filters.data.status ? eq(laboratoryFeedbackTable.status, filters.data.status) : undefined,
        managedRoles.has(member.role) ? undefined : eq(laboratoryFeedbackTable.authorUserId, req.userId),
    ].filter(Boolean);
    const feedback = await db
        .select()
        .from(laboratoryFeedbackTable)
        .where(and(...conditions))
        .orderBy(sql `${laboratoryFeedbackTable.sequence} desc`);
    res.setHeader("Cache-Control", "private, no-store");
    res.json(feedback.map((item) => laboratoryFeedbackResponse(item, req.userId)));
});
router.post("/projects/:id/laboratory-feedback", laboratoryWriteRateLimit, auth, async (req, res) => {
    const projectId = String(req.params.id);
    const member = await membership(projectId, req.userId);
    if (!member) {
        res.status(404).json({ error: "Monde introuvable" });
        return;
    }
    const input = parseBody(createLaboratoryFeedbackInput, req, res);
    if (!input)
        return;
    const [feedback] = await db
        .insert(laboratoryFeedbackTable)
        .values({
        projectId,
        authorUserId: req.userId,
        type: input.type,
        status: "nouveau",
        message: input.message,
        context: {
            ...input.context,
            projectId,
            role: member.role,
        },
    })
        .returning();
    res.status(201).json(laboratoryFeedbackResponse(feedback, req.userId));
});
router.patch("/projects/:id/laboratory-feedback/:feedbackId", laboratoryWriteRateLimit, auth, async (req, res) => {
    const projectId = String(req.params.id);
    const member = await membership(projectId, req.userId);
    if (!managedRoles.has(member?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const input = parseBody(updateLaboratoryFeedbackInput, req, res);
    if (!input)
        return;
    const [feedback] = await db
        .update(laboratoryFeedbackTable)
        .set({ status: input.status, updatedAt: new Date() })
        .where(and(eq(laboratoryFeedbackTable.id, String(req.params.feedbackId)), eq(laboratoryFeedbackTable.projectId, projectId)))
        .returning();
    if (!feedback) {
        res.status(404).json({ error: "Retour Laboratoire introuvable" });
        return;
    }
    res.json(laboratoryFeedbackResponse(feedback, req.userId));
});
router.get("/projects/:id/rsvp-links", auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const links = await db
        .select()
        .from(rsvpsTable)
        .where(eq(rsvpsTable.projectId, projectId));
    res.json(links);
});
router.post("/projects/:id/rsvp-links/:guestId", auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const [project] = await db
        .select({ data: projectsTable.data })
        .from(projectsTable)
        .where(eq(projectsTable.id, projectId));
    const guests = Array.isArray(project?.data?.guests)
        ? project.data.guests
        : [];
    if (!guests.some((guest) => guest.id === String(req.params.guestId))) {
        res.status(404).json({ error: "Invité introuvable dans ce Monde" });
        return;
    }
    const [link] = await db
        .insert(rsvpsTable)
        .values({ projectId, guestId: String(req.params.guestId) })
        .onConflictDoUpdate({
        target: [rsvpsTable.projectId, rsvpsTable.guestId],
        set: { revoked: false, token: randomUUID() },
    })
        .returning();
    res.status(201).json(link);
});
router.delete("/projects/:id/rsvp-links/:guestId", auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const [updated] = await db
        .update(rsvpsTable)
        .set({ revoked: true })
        .where(and(eq(rsvpsTable.projectId, projectId), eq(rsvpsTable.guestId, String(req.params.guestId))))
        .returning();
    if (!updated) {
        res.status(404).json({ error: "Lien RSVP introuvable" });
        return;
    }
    res.sendStatus(204);
});
router.get("/projects/:id/participant-media", auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const media = await db.select({
        id: filesTable.id, guestId: filesTable.guestId, name: filesTable.name,
        contentType: filesTable.contentType, size: filesTable.size, caption: filesTable.caption,
        consent: filesTable.consent, visibility: filesTable.visibility,
        moderationStatus: filesTable.moderationStatus, createdAt: filesTable.createdAt,
    }).from(filesTable).where(and(eq(filesTable.projectId, projectId), isNotNull(filesTable.guestId)));
    const [project] = await db.select({ data: projectsTable.data }).from(projectsTable).where(eq(projectsTable.id, projectId));
    res.json(media.map((item) => ({
        ...item,
        guestName: participantNameById(project?.data, item.guestId),
    })));
});
router.patch("/projects/:id/participant-media/:mediaId", auth, async (req, res) => {
    const input = parseBody(z.object({ status: z.enum(["pending", "approved", "rejected"]) }), req, res);
    if (!input)
        return;
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const [existing] = await db.select({
        id: filesTable.id,
        consent: filesTable.consent,
    }).from(filesTable).where(and(eq(filesTable.id, String(req.params.mediaId)), eq(filesTable.projectId, projectId), isNotNull(filesTable.guestId)));
    if (!existing) {
        res.status(404).json({ error: "Média introuvable" });
        return;
    }
    if (input.status === "approved" && !existing.consent) {
        res.status(409).json({ error: "Ce média ne peut pas être partagé sans consentement" });
        return;
    }
    const [media] = await db.update(filesTable).set({ moderationStatus: input.status })
        .where(eq(filesTable.id, existing.id))
        .returning();
    res.json(media);
});
router.get("/projects/:id/song-requests", auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const [project] = await db.select({ data: projectsTable.data }).from(projectsTable).where(eq(projectsTable.id, projectId));
    const requests = await db.select().from(songRequestsTable).where(eq(songRequestsTable.projectId, projectId));
    res.json(requests.map((request) => ({
        ...request,
        guestName: participantNameById(project?.data, request.guestId),
    })));
});
router.patch("/projects/:id/song-requests/:requestId", auth, async (req, res) => {
    const input = parseBody(z.object({ status: z.enum(["new", "seen", "accepted", "played", "rejected"]) }), req, res);
    if (!input)
        return;
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const [request] = await db.update(songRequestsTable)
        .set({ status: input.status, updatedAt: new Date() })
        .where(and(eq(songRequestsTable.id, String(req.params.requestId)), eq(songRequestsTable.projectId, projectId)))
        .returning();
    if (!request) {
        res.status(404).json({ error: "Demande musicale introuvable" });
        return;
    }
    res.json(request);
});
router.post("/aime-local/pairing-token", localWebRateLimit, auth, async (req, res) => {
    const input = parseBody(localPairingTokenInput, req, res);
    if (!input)
        return;
    const token = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
    await db.insert(localPairingTokensTable).values({
        tokenHash: hashedToken(token),
        userId: req.userId,
        bridgeLabel: input.bridgeLabel ?? null,
        expiresAt: new Date(Date.now() + PAIRING_TOKEN_TTL_MS),
    });
    res.json({
        token,
        expiresAt: new Date(Date.now() + PAIRING_TOKEN_TTL_MS).toISOString(),
        bridgeLabel: input.bridgeLabel ?? null,
    });
});
router.post("/aime-local/bridge/pair", localBridgeRateLimit, async (req, res) => {
    if (!authorizeBridgeOrigin(req, res))
        return;
    const input = parseBody(localPairInput, req, res);
    if (!input)
        return;
    const pairing = await consumePairingToken(input.token);
    if (!pairing) {
        res.status(403).json({ error: "Code de connexion invalide ou expiré" });
        return;
    }
    const sessionToken = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
    const sessionTokenHash = ensureBridgeSessionToken(sessionToken).sessionTokenHash;
    const now = new Date();
    const expiresAt = new Date(Date.now() + BRIDGE_SESSION_TTL_MS);
    const [saved] = await db
        .insert(localBridgeSessionsTable)
        .values({
        userId: pairing.userId,
        bridgeId: input.bridgeId,
        bridgeVersion: input.bridgeVersion ?? null,
        bridgeLabel: null,
        sessionTokenHash,
        pairedAt: now,
        lastSeenAt: now,
        expiresAt,
    })
        .onConflictDoUpdate({
        target: [localBridgeSessionsTable.userId, localBridgeSessionsTable.bridgeId],
        set: { bridgeVersion: input.bridgeVersion ?? null, sessionTokenHash, lastSeenAt: now, expiresAt, revokedAt: null },
    })
        .returning();
    res.status(201).json({
        bridgeSessionId: saved.id,
        sessionToken,
        expiresAt: saved.expiresAt.toISOString(),
        userId: saved.userId,
    });
});
router.post("/aime-local/bridge/heartbeat", localBridgeRateLimit, async (req, res) => {
    const input = parseBody(localBridgeSessionInput, req, res);
    if (!input)
        return;
    const session = await activeBridgeSessionByToken(input.sessionToken);
    if (!session) {
        res.status(403).json({ error: "Session bridge invalide" });
        return;
    }
    await db
        .update(localBridgeSessionsTable)
        .set({ lastSeenAt: new Date(), expiresAt: new Date(Date.now() + BRIDGE_SESSION_TTL_MS) })
        .where(eq(localBridgeSessionsTable.id, session.id));
    res.json({ ok: true });
});
router.get("/aime-local/bridge/status", localWebRateLimit, auth, async (req, res) => {
    const sessions = await db
        .select()
        .from(localBridgeSessionsTable)
        .where(and(eq(localBridgeSessionsTable.userId, req.userId), isNull(localBridgeSessionsTable.revokedAt)));
    const active = sessions
        .filter((session) => session.expiresAt.getTime() > Date.now())
        .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())[0];
    res.json({
        connected: Boolean(active),
        bridgeId: active?.bridgeId ?? null,
        bridgeVersion: active?.bridgeVersion ?? null,
        lastSeenAt: active?.lastSeenAt?.toISOString() ?? null,
        expiresAt: active?.expiresAt?.toISOString() ?? null,
    });
});
router.delete("/aime-local/bridge/status", localWebRateLimit, auth, async (req, res) => {
    await db
        .update(localBridgeSessionsTable)
        .set({ revokedAt: new Date() })
        .where(and(eq(localBridgeSessionsTable.userId, req.userId), isNull(localBridgeSessionsTable.revokedAt)));
    res.sendStatus(204);
});
router.get("/projects/:id/aime-local/folders", localWebRateLimit, auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!editableRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const [project] = await db.select({ data: projectsTable.data }).from(projectsTable).where(eq(projectsTable.id, projectId));
    const data = (project?.data ?? {});
    const localData = (data.aimeLocal ?? {});
    const folders = Array.isArray(localData.folders) ? localData.folders.filter((value) => typeof value === "string").slice(0, 30) : [];
    res.json({ folders });
});
router.put("/projects/:id/aime-local/folders", localWebRateLimit, auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!editableRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const input = parseBody(localAuthorizedFoldersInput, req, res);
    if (!input)
        return;
    const [project] = await db.select({ data: projectsTable.data }).from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) {
        res.status(404).json({ error: "Projet introuvable" });
        return;
    }
    const current = (project.data ?? {});
    const next = { ...current, aimeLocal: { ...(current.aimeLocal ?? {}), folders: input.folders } };
    const [saved] = await db.update(projectsTable).set({ data: next, updatedAt: new Date() }).where(eq(projectsTable.id, projectId)).returning();
    const localData = saved.data.aimeLocal;
    res.json({ folders: Array.isArray(localData?.folders) ? localData?.folders : [] });
});
router.post("/projects/:id/aime-local/scan", localWebRateLimit, auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!editableRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const input = parseBody(localScanRequestInput, req, res);
    if (!input)
        return;
    const sessions = await db.select().from(localBridgeSessionsTable).where(and(eq(localBridgeSessionsTable.userId, req.userId), isNull(localBridgeSessionsTable.revokedAt)));
    const active = sessions
        .filter((session) => session.expiresAt.getTime() > Date.now())
        .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())[0];
    if (!active) {
        res.status(409).json({ error: "Aucun bridge actif" });
        return;
    }
    const [project] = await db.select({ data: projectsTable.data }).from(projectsTable).where(eq(projectsTable.id, projectId));
    const configuredFolders = Array.isArray(project?.data?.aimeLocal && (project?.data).aimeLocal.folders)
        ? (project?.data).aimeLocal.folders
        : [];
    const folders = (input.folders?.length ? input.folders : configuredFolders).slice(0, 30);
    if (!folders.length) {
        res.status(400).json({ error: "Aucun dossier autorisé configuré" });
        return;
    }
    const id = randomUUID();
    await db.insert(localScanJobsTable).values({
        id,
        projectId,
        ownerUserId: req.userId,
        folders,
        status: "queued",
        results: [],
        suggestions: [],
    });
    res.status(202).json({ jobId: id, status: "queued", folders });
});
router.get("/aime-local/bridge/scan-jobs/next", localBridgeRateLimit, async (req, res) => {
    const sessionToken = String(req.query.sessionToken ?? "");
    const session = await activeBridgeSessionByToken(sessionToken);
    if (!session) {
        res.status(403).json({ error: "Session bridge invalide" });
        return;
    }
    const queued = await nextQueuedScanJob(session.userId);
    if (!queued) {
        res.json({ job: null });
        return;
    }
    res.json({ job: { id: queued.id, projectId: queued.projectId, folders: queued.folders, createdAt: queued.createdAt } });
});
router.post("/aime-local/bridge/scan-jobs/:jobId/result", localBridgeRateLimit, async (req, res) => {
    const input = parseBody(localScanResultInput, req, res);
    if (!input)
        return;
    const session = await activeBridgeSessionByToken(input.sessionToken);
    if (!session) {
        res.status(403).json({ error: "Session bridge invalide" });
        return;
    }
    const [jobRow] = await db
        .select()
        .from(localScanJobsTable)
        .where(and(eq(localScanJobsTable.id, String(req.params.jobId)), eq(localScanJobsTable.ownerUserId, session.userId)));
    if (!jobRow) {
        res.status(404).json({ error: "Scan introuvable" });
        return;
    }
    const job = scanJobFromRow(jobRow);
    const [project] = await db.select({ data: projectsTable.data }).from(projectsTable).where(eq(projectsTable.id, job.projectId));
    const projectData = (project?.data ?? {});
    const results = input.results.filter((item) => isSafeRelativePath(item.relativePath));
    const suggestions = results
        .map((item) => ({
        localIdentifier: item.localIdentifier,
        suggestion: suggestForProject({ name: item.name, documentType: item.documentType ?? "autre", entities: {
                people: [],
                places: Array.isArray(item.entities?.places) ? item.entities?.places : [],
                dates: [],
                amounts: [],
                events: Array.isArray(item.entities?.events) ? item.entities?.events : [],
                resources: Array.isArray(item.entities?.resources) ? item.entities?.resources : [],
                organizations: [],
            } }, projectData),
    }))
        .filter((row) => Boolean(row.suggestion))
        .map((row) => ({ localIdentifier: row.localIdentifier, ...row.suggestion }));
    await db
        .update(localScanJobsTable)
        .set({
        results,
        suggestions,
        status: input.error ? "failed" : "done",
        error: input.error,
        completedAt: new Date(),
        updatedAt: new Date(),
    })
        .where(eq(localScanJobsTable.id, job.id));
    res.json({ ok: true, suggestions: suggestions.length });
});
router.get("/projects/:id/aime-local/scans/latest", localWebRateLimit, auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!editableRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const jobs = await db
        .select()
        .from(localScanJobsTable)
        .where(and(eq(localScanJobsTable.ownerUserId, req.userId), eq(localScanJobsTable.projectId, projectId)));
    const latest = jobs
        .map(scanJobFromRow)
        .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt))[0];
    if (!latest) {
        res.json({ job: null });
        return;
    }
    res.json({ job: latest });
});
router.get("/projects/:id/aime-local/references", localWebRateLimit, auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!editableRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const rows = await db
        .select()
        .from(localReferencesTable)
        .where(and(eq(localReferencesTable.projectId, projectId), eq(localReferencesTable.ownerUserId, req.userId)));
    res.json(rows);
});
router.post("/projects/:id/aime-local/references", localWebRateLimit, auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!editableRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const input = parseBody(localReferenceCreateInput, req, res);
    if (!input)
        return;
    if (!isSafeRelativePath(input.relativePath)) {
        res.status(400).json({ error: "Chemin local invalide" });
        return;
    }
    const [saved] = await db
        .insert(localReferencesTable)
        .values({
        projectId,
        ownerUserId: req.userId,
        localIdentifier: input.localIdentifier,
        fingerprint: input.fingerprint ?? null,
        filename: input.filename,
        relativePath: input.relativePath,
        sourceFolder: input.sourceFolder,
        extension: input.extension ?? null,
        fileType: input.fileType,
        size: input.size,
        modifiedAt: new Date(input.modifiedAt),
        metadata: input.metadata ?? {},
        linkedEntityKind: input.linkedEntityKind ?? null,
        linkedEntityId: input.linkedEntityId ?? null,
        linkedTimelineEventId: input.linkedTimelineEventId ?? null,
        state: "linked",
    })
        .onConflictDoUpdate({
        target: [localReferencesTable.projectId, localReferencesTable.ownerUserId, localReferencesTable.localIdentifier],
        set: {
            fingerprint: input.fingerprint ?? null,
            filename: input.filename,
            relativePath: input.relativePath,
            sourceFolder: input.sourceFolder,
            extension: input.extension ?? null,
            fileType: input.fileType,
            size: input.size,
            modifiedAt: new Date(input.modifiedAt),
            metadata: input.metadata ?? {},
            linkedEntityKind: input.linkedEntityKind ?? null,
            linkedEntityId: input.linkedEntityId ?? null,
            linkedTimelineEventId: input.linkedTimelineEventId ?? null,
            state: "linked",
            lastSeenAt: new Date(),
        },
    })
        .returning();
    res.status(201).json(saved);
});
router.patch("/projects/:id/aime-local/references/:referenceId/state", localWebRateLimit, auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!editableRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const input = parseBody(localReferenceStateInput, req, res);
    if (!input)
        return;
    const [saved] = await db
        .update(localReferencesTable)
        .set({ state: input.state, lastSeenAt: new Date() })
        .where(and(eq(localReferencesTable.id, String(req.params.referenceId)), eq(localReferencesTable.projectId, projectId), eq(localReferencesTable.ownerUserId, req.userId)))
        .returning();
    if (!saved) {
        res.status(404).json({ error: "Référence locale introuvable" });
        return;
    }
    res.json(saved);
});
router.post("/projects/:id/aime-local/references/:referenceId/import", localWebRateLimit, auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const [reference] = await db
        .select()
        .from(localReferencesTable)
        .where(and(eq(localReferencesTable.id, String(req.params.referenceId)), eq(localReferencesTable.projectId, projectId), eq(localReferencesTable.ownerUserId, req.userId)));
    if (!reference) {
        res.status(404).json({ error: "Référence locale introuvable" });
        return;
    }
    const jobId = randomUUID();
    await db.insert(localImportJobsTable).values({
        id: jobId,
        projectId,
        ownerUserId: req.userId,
        localReferenceId: reference.id,
        status: "queued",
    });
    res.status(202).json({ jobId, status: "queued" });
});
router.get("/projects/:id/aime-local/import-jobs/:jobId", localWebRateLimit, auth, async (req, res) => {
    const projectId = String(req.params.id);
    if (!editableRoles.has((await membership(projectId, req.userId))?.role ?? "")) {
        res.status(403).json({ error: "Permission refusée" });
        return;
    }
    const [jobRow] = await db
        .select()
        .from(localImportJobsTable)
        .where(and(eq(localImportJobsTable.id, String(req.params.jobId)), eq(localImportJobsTable.projectId, projectId), eq(localImportJobsTable.ownerUserId, req.userId)));
    if (!jobRow) {
        res.status(404).json({ error: "Import introuvable" });
        return;
    }
    res.json(importJobFromRow(jobRow));
});
router.get("/aime-local/bridge/import-jobs/next", localBridgeRateLimit, async (req, res) => {
    const sessionToken = String(req.query.sessionToken ?? "");
    const session = await activeBridgeSessionByToken(sessionToken);
    if (!session) {
        res.status(403).json({ error: "Session bridge invalide" });
        return;
    }
    const next = await nextQueuedImportJob(session.userId);
    if (!next) {
        res.json({ job: null });
        return;
    }
    const [reference] = await db.select().from(localReferencesTable).where(eq(localReferencesTable.id, next.localReferenceId));
    if (!reference) {
        await db
            .update(localImportJobsTable)
            .set({
            status: "failed",
            error: "Référence locale introuvable",
            updatedAt: new Date(),
        })
            .where(eq(localImportJobsTable.id, next.id));
        res.json({ job: null });
        return;
    }
    res.json({
        job: {
            id: next.id,
            projectId: next.projectId,
            localReferenceId: next.localReferenceId,
            filename: reference.filename,
            relativePath: reference.relativePath,
            sourceFolder: reference.sourceFolder,
            size: reference.size,
        },
    });
});
router.post("/aime-local/bridge/import-jobs/:jobId/request-upload-url", localBridgeRateLimit, async (req, res) => {
    const input = parseBody(bridgeImportFinalizeInput.omit({ objectPath: true, finalizeToken: true, localReferenceId: true }), req, res);
    if (!input)
        return;
    const session = await activeBridgeSessionByToken(input.sessionToken);
    if (!session) {
        res.status(403).json({ error: "Session bridge invalide" });
        return;
    }
    const [jobRow] = await db
        .select()
        .from(localImportJobsTable)
        .where(and(eq(localImportJobsTable.id, String(req.params.jobId)), eq(localImportJobsTable.ownerUserId, session.userId), eq(localImportJobsTable.projectId, input.projectId)));
    if (!jobRow) {
        res.status(404).json({ error: "Import introuvable" });
        return;
    }
    const job = importJobFromRow(jobRow);
    if (!allowedTypes.has(input.contentType)) {
        res.status(415).json({ error: "Type de fichier non autorisé" });
        return;
    }
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL.split("?")[0]);
    const finalizeToken = signUploadAuthorization({
        projectId: input.projectId,
        name: input.name,
        size: input.size,
        contentType: input.contentType,
        objectPath,
        userId: session.userId,
        expiresAt: Date.now() + UPLOAD_TOKEN_TTL_MS,
    }, uploadSecret());
    await db
        .update(localImportJobsTable)
        .set({ status: "uploading", updatedAt: new Date(), error: null })
        .where(eq(localImportJobsTable.id, job.id));
    res.json({ uploadURL, objectPath, finalizeToken });
});
router.post("/aime-local/bridge/import-jobs/:jobId/finalize", localBridgeRateLimit, async (req, res) => {
    const input = parseBody(bridgeImportFinalizeInput, req, res);
    if (!input)
        return;
    const session = await activeBridgeSessionByToken(input.sessionToken);
    if (!session) {
        res.status(403).json({ error: "Session bridge invalide" });
        return;
    }
    const [jobRow] = await db
        .select()
        .from(localImportJobsTable)
        .where(and(eq(localImportJobsTable.id, String(req.params.jobId)), eq(localImportJobsTable.ownerUserId, session.userId), eq(localImportJobsTable.projectId, input.projectId), eq(localImportJobsTable.localReferenceId, input.localReferenceId)));
    if (!jobRow) {
        res.status(404).json({ error: "Import introuvable" });
        return;
    }
    const job = importJobFromRow(jobRow);
    if (!verifyUploadAuthorization(input.finalizeToken, {
        projectId: input.projectId,
        name: input.name,
        size: input.size,
        contentType: input.contentType,
        objectPath: input.objectPath,
        userId: session.userId,
    }, uploadSecret())) {
        res.status(403).json({ error: "Autorisation de finalisation invalide ou expirée" });
        return;
    }
    const objectPath = await storage.trySetObjectEntityAclPolicy(input.objectPath, {
        owner: session.userId,
        visibility: "private",
    });
    const [storedFile] = await db
        .insert(filesTable)
        .values({
        projectId: input.projectId,
        uploaderUserId: session.userId,
        objectPath,
        name: input.name,
        contentType: input.contentType,
        size: input.size,
    })
        .returning();
    await db
        .update(localReferencesTable)
        .set({ state: "imported", importedFileId: storedFile.id, lastSeenAt: new Date() })
        .where(and(eq(localReferencesTable.id, input.localReferenceId), eq(localReferencesTable.projectId, input.projectId), eq(localReferencesTable.ownerUserId, session.userId)));
    await db
        .update(localImportJobsTable)
        .set({ status: "done", updatedAt: new Date(), error: null })
        .where(eq(localImportJobsTable.id, job.id));
    res.status(201).json({ file: storedFile, status: "imported" });
});
router.get("/rsvp/:token", createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    key: (req) => `rsvp-read:${req.ip}`,
}), async (req, res) => {
    if (!uuid.safeParse(String(req.params.token)).success) {
        res.status(404).json({ error: "Lien RSVP invalide" });
        return;
    }
    const [link] = await db
        .select({ rsvp: rsvpsTable, project: projectsTable })
        .from(rsvpsTable)
        .innerJoin(projectsTable, eq(projectsTable.id, rsvpsTable.projectId))
        .where(eq(rsvpsTable.token, String(req.params.token)));
    if (!link || link.rsvp.revoked) {
        res.status(404).json({ error: "Lien RSVP invalide" });
        return;
    }
    res.setHeader("Cache-Control", "no-store");
    const songRequests = await db.select({
        id: songRequestsTable.id, title: songRequestsTable.title, artist: songRequestsTable.artist,
        message: songRequestsTable.message, status: songRequestsTable.status, createdAt: songRequestsTable.createdAt,
    }).from(songRequestsTable).where(and(eq(songRequestsTable.projectId, link.rsvp.projectId), eq(songRequestsTable.guestId, link.rsvp.guestId)));
    const contributions = await db.select({
        id: filesTable.id,
        guestId: filesTable.guestId,
        name: filesTable.name,
        contentType: filesTable.contentType,
        size: filesTable.size,
        caption: filesTable.caption,
        moderationStatus: filesTable.moderationStatus,
        visibility: filesTable.visibility,
        createdAt: filesTable.createdAt,
    }).from(filesTable).where(and(eq(filesTable.projectId, link.rsvp.projectId), isNotNull(filesTable.guestId), or(eq(filesTable.guestId, link.rsvp.guestId), and(eq(filesTable.moderationStatus, "approved"), eq(filesTable.visibility, "guests")))));
    res.json({
        projectTitle: link.project.title,
        response: link.rsvp.response,
        ...buildParticipantProjection(link.project.data, link.rsvp.guestId),
        songRequests,
        contributions: contributions.map((media) => ({
            ...media,
            canView: media.guestId === link.rsvp.guestId ||
                (media.moderationStatus === "approved" && media.visibility === "guests"),
        })),
    });
});
router.post("/rsvp/:token/media/uploads/request-url", createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 12,
    key: (req) => `rsvp-media-upload:${req.ip}:${String(req.params.token)}`,
}), async (req, res) => {
    const input = parseBody(participantUploadInput, req, res);
    if (!input)
        return;
    const link = await activeRsvp(String(req.params.token));
    if (!link) {
        res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
        return;
    }
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL.split("?")[0]);
    const finalizeToken = signUploadAuthorization({ ...input, objectPath, projectId: link.projectId, guestId: link.guestId, rsvpId: link.id, expiresAt: Date.now() + UPLOAD_TOKEN_TTL_MS }, uploadSecret());
    res.setHeader("Cache-Control", "no-store");
    res.json({ uploadURL, objectPath, finalizeToken });
});
router.post("/rsvp/:token/media", createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 12,
    key: (req) => `rsvp-media-finalize:${req.ip}:${String(req.params.token)}`,
}), async (req, res) => {
    const input = parseBody(participantMediaFinalize, req, res);
    if (!input)
        return;
    const link = await activeRsvp(String(req.params.token));
    if (!link) {
        res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
        return;
    }
    const { finalizeToken, visibility, caption, consent, ...uploaded } = input;
    if (!verifyUploadAuthorization(finalizeToken, {
        ...uploaded, projectId: link.projectId, guestId: link.guestId, rsvpId: link.id,
    }, uploadSecret())) {
        res.status(403).json({ error: "Autorisation de finalisation invalide ou expirée" });
        return;
    }
    let uploadedObject;
    try {
        uploadedObject = await storage.getObjectEntityFile(uploaded.objectPath);
        const [metadata] = await uploadedObject.getMetadata();
        if (!uploadedObjectMetadataMatches(uploaded, metadata)) {
            await uploadedObject.delete().catch(() => undefined);
            res.status(400).json({ error: "Le fichier reçu ne correspond pas au type ou à la taille autorisés" });
            return;
        }
    }
    catch (error) {
        if (error instanceof ObjectNotFoundError) {
            res.status(400).json({ error: "Le fichier envoyé est introuvable" });
            return;
        }
        throw error;
    }
    const path = await storage.trySetObjectEntityAclPolicy(uploaded.objectPath, {
        owner: `rsvp:${link.guestId}`,
        visibility: "private",
    });
    const [media] = await db.transaction(async (tx) => {
        const [active] = await tx.select({ id: rsvpsTable.id })
            .from(rsvpsTable)
            .where(and(eq(rsvpsTable.id, link.id), eq(rsvpsTable.token, link.token), eq(rsvpsTable.revoked, false)));
        if (!active)
            return [];
        return tx.insert(filesTable).values({
            ...uploaded,
            objectPath: path,
            projectId: link.projectId,
            guestId: link.guestId,
            uploaderUserId: `rsvp:${link.guestId}`,
            moderationStatus: "pending",
            visibility,
            caption,
            consent,
        }).returning();
    });
    if (!media) {
        res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
        return;
    }
    res.status(201).json({
        id: media.id, name: media.name, contentType: media.contentType, size: media.size,
        caption: media.caption, visibility: media.visibility, moderationStatus: media.moderationStatus, createdAt: media.createdAt,
    });
});
router.get("/rsvp/:token/media/:mediaId", createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    key: (req) => `rsvp-media-read:${req.ip}:${String(req.params.token)}`,
}), async (req, res) => {
    const link = await activeRsvp(String(req.params.token));
    if (!link || !uuid.safeParse(String(req.params.mediaId)).success) {
        res.status(404).json({ error: "Média introuvable" });
        return;
    }
    const [media] = await db.select().from(filesTable).where(and(eq(filesTable.id, String(req.params.mediaId)), eq(filesTable.projectId, link.projectId), or(eq(filesTable.guestId, link.guestId), and(eq(filesTable.moderationStatus, "approved"), eq(filesTable.visibility, "guests")))));
    if (!media) {
        res.status(404).json({ error: "Média introuvable" });
        return;
    }
    const response = await storage.downloadObject(await storage.getObjectEntityFile(media.objectPath), 0);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("Content-Type", media.contentType);
    res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
    res.setHeader("Content-Disposition", `inline; filename="${safeDownloadName(media.name)}"; filename*=UTF-8''${encodeURIComponent(media.name)}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    if (response.body)
        Readable.fromWeb(response.body).pipe(res);
});
router.post("/rsvp/:token/song-requests", createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    key: (req) => `rsvp-song-request:${req.ip}:${String(req.params.token)}`,
}), async (req, res) => {
    const input = parseBody(songRequestInput, req, res);
    if (!input)
        return;
    const link = await activeRsvp(String(req.params.token));
    if (!link) {
        res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
        return;
    }
    const [request] = await db.insert(songRequestsTable)
        .values({ ...input, projectId: link.projectId, guestId: link.guestId, status: "new" })
        .returning();
    res.status(201).json(request);
});
router.put("/rsvp/:token", createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 12,
    key: (req) => `rsvp-write:${req.ip}:${String(req.params.token)}`,
}), async (req, res) => {
    if (!uuid.safeParse(String(req.params.token)).success) {
        res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
        return;
    }
    const input = parseBody(rsvpInput, req, res);
    if (!input)
        return;
    const projectGuestPatch = JSON.stringify({
        rsvp: input.status === "confirmed" ? "confirme" : "decline",
        attendance: input.attendance,
        dietary: input.dietary ?? "",
        plusOne: input.plusOne,
    });
    const updated = await db.transaction(async (tx) => {
        const respondedAt = new Date();
        const [saved] = await tx
            .update(rsvpsTable)
            .set({ response: input, respondedAt })
            .where(and(eq(rsvpsTable.token, String(req.params.token)), eq(rsvpsTable.revoked, false)))
            .returning();
        if (!saved)
            return undefined;
        await tx
            .update(projectsTable)
            .set({
            data: sql `jsonb_set(
            ${projectsTable.data},
            '{guests}',
            COALESCE((
              SELECT jsonb_agg(
                CASE
                  WHEN guest ->> 'id' = ${saved.guestId}
                    THEN guest || ${projectGuestPatch}::jsonb
                  ELSE guest
                END
                ORDER BY position
              )
              FROM jsonb_array_elements(
                COALESCE(${projectsTable.data} -> 'guests', '[]'::jsonb)
              ) WITH ORDINALITY AS entries(guest, position)
            ), '[]'::jsonb),
            true
          )`,
            updatedAt: respondedAt,
        })
            .where(eq(projectsTable.id, saved.projectId));
        return saved;
    });
    if (!updated) {
        res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
        return;
    }
    res.json({ response: updated.response, respondedAt: updated.respondedAt });
});
export default router;
//# sourceMappingURL=aime.js.map
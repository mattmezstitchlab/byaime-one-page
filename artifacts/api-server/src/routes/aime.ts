import { claimRsvp } from "../lib/claimRsvp";
import { claimAttestation } from "../lib/claimAttestation";
import { countersignedMoments, profileProof } from "../lib/attestationClaim";
import { attestationResponseSchema, buildAttestationPortal, checkCounterpart, decideResponse, isDuplicateResponse } from "../lib/attestationLink";
import { canAccessClaimedRsvp, claimConsentSchema, claimRecipientSchema, participationWithRsvp, withoutRsvpCopies, rsvpFieldsChanged, normalizedClaimEmail, claimedParticipantWorld } from "../lib/rsvpClaim";
import { cardSchema, participationSchema, projectWithCards, profileInputSchema, functioningSchema, assignmentErrors, assignmentSchema } from "../lib/universalCard";
import { stripCardProjection, type CardParticipant, type ProfessionalProfile, type ProfessionalAssignment } from "@workspace/aime-domain";
import { Router, type IRouter, type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { clerkClient, getAuth } from "@clerk/express";
import { and, asc, eq, gt, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import {
  db,
  attestationLinksTable,
  attestationsTable,
  universalCardsTable,
  professionalProfilesTable,
  professionalAssignmentsTable,
  filesTable,
  invitationsTable,
  membershipsTable,
  messagesTable,
  projectsTable,
  rsvpsTable,
  songRequestsTable,
} from "@workspace/db";
import { z } from "zod";
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from "../lib/objectStorage";
import { authenticatedUserId, can, type ProjectRole } from "../lib/permissions";
import { buildParticipantProjection, participantNameById } from "../lib/participantProjection";
import { projectToPublicProfile, projectToPublicReport } from "../lib/publicProfile";
import { buildAuthorizedWeddingBrief } from "../lib/weddingBrief";
import { buildAuthorizedProfileFil } from "../lib/profileFil";
import {
  mergeProtectedProjectData,
  projectDataForRole,
} from "../lib/projectDataPolicy";
import { assertProviderAccepted } from "../lib/providerResponse";
import {
  isE2ETestServicesEnabled,
  sendE2ETestEmail,
} from "../lib/e2eTestServices";
import {
  configuredAppOrigin,
  createRateLimit,
  safeDownloadName,
  signUploadAuthorization,
  uploadedObjectMetadataMatches,
  verifyUploadAuthorization,
} from "../lib/security";
import { logger } from "../lib/logger";
import {
  answerLocally as answerAimeLocally,
  chatConfigFromEnv,
  classifyDocument,
  completeWithModel,
} from "../lib/aimeChat";
import { sendResendEmail } from "../lib/resend";

type AuthedRequest = Parameters<RequestHandler>[0] & { userId?: string };
const router: IRouter = Router();
const storage = new ObjectStorageService();
const roles = ["owner", "planner", "family", "viewer"] as const;
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
const uuid = z.string().uuid();

function authorizeCron(req: AuthedRequest, res: Parameters<RequestHandler>[1]): boolean {
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

function shouldSimulateProviderFailure(req: AuthedRequest): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.AIME_E2E_RUN === "1" &&
    req.get("x-aime-e2e-provider") === "failure"
  );
}

async function sendEmail(path: string, body: string): Promise<Response> {
  if (isE2ETestServicesEnabled()) return sendE2ETestEmail();
  if (path !== "/emails") throw new Error(`Unsupported Resend path: ${path}`);
  return sendResendEmail(JSON.parse(body) as Parameters<typeof sendResendEmail>[0]);
}

type MessageRecord = typeof messagesTable.$inferSelect;

async function deliverMessage(message: MessageRecord, simulateProviderFailure = false) {
  try {
    if (simulateProviderFailure) {
      throw new Error("Échec fournisseur simulé pour le scénario E2E");
    }
    const providerResponse = await sendEmail(
      "/emails",
      JSON.stringify({
        from: "AIME <onboarding@resend.dev>",
        to: message.recipients,
        subject: message.subject,
        html: `<div>${escapeHtml(message.body).replaceAll("\n", "<br>")}</div>`,
      }),
    );
    assertProviderAccepted(providerResponse, "le message");
    const [sent] = await db
      .update(messagesTable)
      .set({ status: "sent", sentAt: new Date(), providerError: null })
      .where(eq(messagesTable.id, message.id))
      .returning();
    return { message: sent, error: undefined };
  } catch (error) {
    const providerError =
      error instanceof Error ? error.message : "Erreur Resend";
    const [failed] = await db
      .update(messagesTable)
      .set({ status: "failed", providerError })
      .where(eq(messagesTable.id, message.id))
      .returning();
    return { message: failed, error: providerError };
  }
}

async function deliverScheduledMessages(): Promise<void> {
  const dueMessages = await db
    .update(messagesTable)
    .set({ status: "pending" })
    .where(
      and(
        eq(messagesTable.status, "scheduled"),
        lte(messagesTable.scheduledAt, new Date()),
      ),
    )
    .returning();
  for (const message of dueMessages) {
    const result = await deliverMessage(message);
    if (result.error) {
      logger.warn(
        { messageId: message.id, projectId: message.projectId, providerError: result.error },
        "Scheduled email provider failure recorded",
      );
    } else {
      logger.info(
        { messageId: message.id, projectId: message.projectId },
        "Scheduled email delivered",
      );
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

router.get("/cron/scheduled-messages", async (req: AuthedRequest, res): Promise<void> => {
  if (!authorizeCron(req, res)) return;
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
function optionalUserId(req: Parameters<RequestHandler>[0]): string | undefined {
  try { return authenticatedUserId(getAuth(req)); } catch { return undefined; }
}
function rsvpOwnerCondition(userId?: string) {
  const anonymous = and(isNull(rsvpsTable.claimedAt), isNull(rsvpsTable.claimedCardUserId));
  return userId ? or(anonymous, eq(rsvpsTable.claimedCardUserId, userId))! : anonymous!;
}
type RsvpLink = { id: string; projectId: string; guestId: string; token: string; revoked: boolean };

async function activeRsvp(token: string, userId?: string): Promise<RsvpLink | undefined> {
  if (!uuid.safeParse(token).success) return undefined;
  const [link] = await db
    .select({
      id: rsvpsTable.id,
      projectId: rsvpsTable.projectId,
      guestId: rsvpsTable.guestId,
      token: rsvpsTable.token,
      revoked: rsvpsTable.revoked,
    })
    .from(rsvpsTable)
    .where(and(eq(rsvpsTable.token, token), eq(rsvpsTable.revoked, false), rsvpOwnerCondition(userId)));
  return link;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!,
  );
}

function uploadSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret)
    throw new Error("SESSION_SECRET is required for upload finalization");
  return secret;
}

function auth(
  req: AuthedRequest,
  res: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2],
) {
  const value = getAuth(req);
  const userId = authenticatedUserId(value);
  if (!userId) {
    res.status(401).json({ error: "Authentification requise" });
    return;
  }
  req.userId = userId;
  next();
}

async function membership(projectId: string, userId: string, allowParticipant = false) {
  const [member] = await db
    .select()
    .from(membershipsTable)
    .where(
      and(
        eq(membershipsTable.projectId, projectId),
        eq(membershipsTable.userId, userId),
      ),
    );
  return member?.participantOnly && !allowParticipant ? undefined : member;
}

function toProfessionalProfile(row: typeof professionalProfilesTable.$inferSelect): ProfessionalProfile {
  const parsed = functioningSchema.safeParse(row.data);
  const data = parsed.success ? parsed.data : ({
    parameters: {},
    availability: { timezone: "Europe/Paris", weekly: [], windows: [], unavailable: [] },
    coveredMoments: [],
    legacyNotes: {},
  } as any);
  return { ...row, data, updatedAt: row.updatedAt.toISOString() };
}
async function memberAssignments(memberId: string): Promise<ProfessionalAssignment[]> {
  const rows = await db.select().from(professionalAssignmentsTable).where(eq(professionalAssignmentsTable.membershipId, memberId));
  return rows.flatMap(row => {
    const parsed = assignmentSchema.safeParse({ ...(row.data as object), id: row.id, profileId: row.profileId });
    return parsed.success ? [parsed.data] : [];
  });
}
async function cardProjectData(projectId: string, data: unknown, role: ProjectRole, userId: string, participantOnly = false) {
  const rows = await db.select({ memberId: membershipsTable.id, userId: universalCardsTable.userId, card: universalCardsTable.data, participation: membershipsTable.participation })
    .from(membershipsTable).innerJoin(universalCardsTable, eq(membershipsTable.cardUserId, universalCardsTable.userId))
    .where(eq(membershipsTable.projectId, projectId));
  const interventions = await db.select({ assignment: professionalAssignmentsTable, profile: professionalProfilesTable })
    .from(professionalAssignmentsTable)
    .innerJoin(membershipsTable, eq(professionalAssignmentsTable.membershipId, membershipsTable.id))
    .innerJoin(professionalProfilesTable, eq(professionalAssignmentsTable.profileId, professionalProfilesTable.id))
    .where(eq(membershipsTable.projectId, projectId));
  const claimed = await db.select().from(rsvpsTable).where(eq(rsvpsTable.projectId, projectId));
  const participants = rows.flatMap(row => {
    if (role === "viewer" && row.userId !== userId) return [];
    const link = claimed.find(r => r.claimedCardUserId === row.userId);
    const card = cardSchema.safeParse(row.card), participation = participationSchema.safeParse(link ? participationWithRsvp(row.participation, link.response) : row.participation);
    const own = interventions.filter(i => i.assignment.membershipId === row.memberId);
    if (!card.success || !participation.success) return [];
    const assignments = own.flatMap(({ assignment: a }) => {
      const parsed = assignmentSchema.safeParse({ ...(a.data as object), id: a.id, profileId: a.profileId });
      return parsed.success ? [parsed.data] : [];
    });
    return [{
      userId: row.userId, card: card.data,
      participation: { ...participation.data, assignments },
      profiles: own.map(i => toProfessionalProfile(i.profile)),
    } as CardParticipant];
  });
  if (participantOnly) {
    const link = claimed.find(r => r.claimedCardUserId === userId);
    return projectWithCards(claimedParticipantWorld(data, link?.guestId ?? ''), participants.filter(p => p.userId === userId));
  }
  return projectDataForRole(projectWithCards(data, participants), role);
}
router.get("/me/professional-profiles", auth, async (req: AuthedRequest, res) => {
  res.setHeader("Cache-Control", "no-store");
  const rows = await db.select().from(professionalProfilesTable).where(eq(professionalProfilesTable.cardUserId, req.userId!));
  res.json(rows.map(toProfessionalProfile));
});
router.put("/me/professional-profiles", auth, async (req: AuthedRequest, res) => {
  const input = parseBody(profileInputSchema, req, res); if (!input) return;
  const [card] = await db.select().from(universalCardsTable).where(eq(universalCardsTable.userId, req.userId!));
  if (!card) { res.status(409).json({ error: "Créez votre carte avant votre profil métier." }); return; }
  const [current] = await db.select().from(professionalProfilesTable).where(and(eq(professionalProfilesTable.cardUserId, req.userId!), eq(professionalProfilesTable.profession, input.profession)));
  if ((current?.updatedAt.toISOString() ?? null) !== input.updatedAt) { res.status(409).json({ error: "Ce profil métier a changé. Rechargez-le." }); return; }
  const values = { data: input.data, updatedAt: new Date(Math.max(Date.now(), (current?.updatedAt.getTime() ?? 0) + 1)) };
  const saved = current
    ? await db.update(professionalProfilesTable).set(values).where(and(eq(professionalProfilesTable.id, current.id), sql`date_trunc('milliseconds', ${professionalProfilesTable.updatedAt}) = ${current.updatedAt}`)).returning()
    : await db.insert(professionalProfilesTable).values({ ...values, profession: input.profession, cardUserId: req.userId! }).onConflictDoNothing().returning();
  if (!saved[0]) { res.status(409).json({ error: "Conflit de version du profil métier" }); return; }
  res.json(toProfessionalProfile(saved[0]));
});

router.get("/me/card", auth, async (req: AuthedRequest, res) => {
  res.setHeader("Cache-Control", "no-store");
  const [card] = await db.select().from(universalCardsTable).where(eq(universalCardsTable.userId, req.userId!));
  res.json(card ?? null);
});
router.put("/me/card", auth, async (req: AuthedRequest, res) => {
  const input = parseBody(z.object({ data: cardSchema, updatedAt: z.string().datetime().nullable() }), req, res);
  if (!input) return;
  const [current] = await db.select().from(universalCardsTable).where(eq(universalCardsTable.userId, req.userId!));
  if ((current?.updatedAt.toISOString() ?? null) !== input.updatedAt) {
    res.status(409).json({ error: "Votre carte a changé. Rechargez-la avant de modifier." }); return;
  }
  const values = { data: input.data, updatedAt: new Date(Math.max(Date.now(), (current?.updatedAt.getTime() ?? 0) + 1)) };
  const result = current
    ? await db.update(universalCardsTable).set(values).where(and(eq(universalCardsTable.userId, req.userId!), sql`date_trunc('milliseconds', ${universalCardsTable.updatedAt}) = ${current.updatedAt}`)).returning()
    : await db.insert(universalCardsTable).values({ userId: req.userId!, ...values }).onConflictDoNothing().returning();
  if (!result[0]) { res.status(409).json({ error: "Conflit de version de la carte" }); return; }
  res.json(result[0]);
});
router.get("/projects/:id/my-participation", auth, async (req: AuthedRequest, res) => {
  const member = await membership(String(req.params.id), req.userId!, true);
  if (!member) { res.status(404).json({ error: "Mariage introuvable" }); return; }
  res.setHeader("Cache-Control", "no-store");
  const [link] = await db.select().from(rsvpsTable).where(and(eq(rsvpsTable.projectId, member.projectId), eq(rsvpsTable.claimedCardUserId, req.userId!)));
  res.json(link ? { ...participationWithRsvp(member.participation, link.response), assignments: await memberAssignments(member.id), linkedRsvp: { token: link.token, revoked: link.revoked } } : member.participation ? { ...(member.participation as object), assignments: await memberAssignments(member.id) } : null);
});
router.put("/projects/:id/my-participation", auth, async (req: AuthedRequest, res) => {
  const input = parseBody(participationSchema, req, res);
  if (!input) return;
  const member = await membership(String(req.params.id), req.userId!, true);
  if (!member) { res.status(404).json({ error: "Rejoignez ce mariage par invitation avant de vous y associer." }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, member.projectId));
  if ((project?.data as any)?.closure?.closedAt) { res.status(409).json({ error: "Ce mariage est clôturé." }); return; }
  const [card] = await db.select().from(universalCardsTable).where(eq(universalCardsTable.userId, req.userId!));
  if (!card) { res.status(409).json({ error: "Créez votre carte auparavant." }); return; }
  const result = await db.transaction(async tx => {
    // Parent then child lock order: a closed/deleted project cannot race a context save.
    const [latestProject] = await tx.select().from(projectsTable).where(eq(projectsTable.id, member.projectId)).for("share");
    if (!latestProject || (latestProject.data as any)?.closure?.closedAt) return { error: "Mariage clôturé ou introuvable" };
    const [latestMember] = await tx.select().from(membershipsTable).where(eq(membershipsTable.id, member.id)).for("update");
    if (!latestMember) return { error: "Association introuvable" };
    const [linked] = await tx.select().from(rsvpsTable).where(and(eq(rsvpsTable.projectId, member.projectId), eq(rsvpsTable.claimedCardUserId, req.userId!))).for("share");
    if (linked && rsvpFieldsChanged(input, latestMember.participation, linked.response).length) return { error: "Le RSVP lié a changé ou a été modifié ici. Rechargez et utilisez le portail de l’invitation pour ses réponses ; aucune copie ne sera enregistrée." };
    const profiles = (await tx.select().from(professionalProfilesTable).where(eq(professionalProfilesTable.cardUserId, req.userId!))).map(toProfessionalProfile);
    const stored = await tx.select().from(professionalAssignmentsTable).where(eq(professionalAssignmentsTable.membershipId, member.id));
    const assignments = input.assignments ?? stored.flatMap(a => {
      const parsed = assignmentSchema.safeParse({ ...(a.data as object), id: a.id, profileId: a.profileId });
      return parsed.success ? [parsed.data] : [];
    });
    const issues = assignmentErrors(req.userId!, input.roles, assignments, profiles, ((latestProject.data as any)?.timeline ?? []), input);
    if (issues.length) return { error: issues.join(" · ") };
    const { assignments: _assignments, ...context } = input;
    await tx.update(membershipsTable).set({ cardUserId: req.userId!, participation: linked ? withoutRsvpCopies(context) : context }).where(eq(membershipsTable.id, member.id));
    if (input.assignments !== undefined) {
      await tx.delete(professionalAssignmentsTable).where(eq(professionalAssignmentsTable.membershipId, member.id));
      if (assignments.length) await tx.insert(professionalAssignmentsTable).values(assignments.map(({ id, profileId, ...data }) => ({ id, profileId, membershipId: member.id, userId: req.userId!, data })));
    }
    return { context, assignments };
  });
  if (result.error) { res.status(422).json({ error: result.error }); return; }
  res.json({ ...result.context, assignments: result.assignments });
});

// Possession of a bearer RSVP link alone never proves the recipient's identity.
router.get("/rsvp/:token/claim", auth, createRateLimit({ windowMs: 900000, max: 20, key: req => `claim-preview:${(req as AuthedRequest).userId}` }), async (req: AuthedRequest, res) => {
  if (!uuid.safeParse(String(req.params.token)).success) { res.status(404).json({ error: "Invitation invalide" }); return; }
  res.setHeader("Cache-Control", "no-store");
  const user = await clerkClient.users.getUser(req.userId!);
  const verifiedEmails = user.emailAddresses.filter(e => e.verification?.status === "verified").map(e => e.emailAddress);
  const result = await claimRsvp(db, { token: String(req.params.token), userId: req.userId!, verifiedEmails, confirm: false });
  res.status(result.error ? result.status! : 200).json(result);
});
router.post("/rsvp/:token/claim", auth, createRateLimit({ windowMs: 900000, max: 10, key: req => `claim-confirm:${(req as AuthedRequest).userId}` }), async (req: AuthedRequest, res) => {
  if (!uuid.safeParse(String(req.params.token)).success) { res.status(404).json({ error: "Invitation invalide" }); return; }
  if (!parseBody(claimConsentSchema, req, res)) return;
  res.setHeader("Cache-Control", "no-store");
  const user = await clerkClient.users.getUser(req.userId!);
  const verifiedEmails = user.emailAddresses.filter(e => e.verification?.status === "verified").map(e => e.emailAddress);
  const result = await claimRsvp(db, { token: String(req.params.token), userId: req.userId!, verifiedEmails, confirm: true });
  res.status(result.error ? result.status! : 200).json(result);
});
router.patch("/projects/:id/rsvp-links/:guestId/claim-recipient", auth, async (req: AuthedRequest, res) => {
  const input = parseBody(claimRecipientSchema, req, res); if (!input) return;
  const member = await membership(String(req.params.id), req.userId!);
  if (!member || !managedRoles.has(member.role)) { res.status(403).json({ error: "Confirmation réservée aux organisateurs autorisés." }); return; }
  const result = await db.transaction(async tx => {
    const [project] = await tx.select().from(projectsTable).where(eq(projectsTable.id, member.projectId)).for("update");
    if (!project || (project.data as any)?.closure?.closedAt) return { error: "Mariage clôturé ou introuvable" };
    const links = await tx.select().from(rsvpsTable).where(eq(rsvpsTable.projectId, member.projectId));
    const link = links.find(r => r.guestId === String(req.params.guestId));
    if (!link || link.claimedAt || link.revoked) return { error: "Invitation absente, révoquée ou déjà rattachée. Aucun transfert automatique n’est autorisé." };
    if (links.some(r => r.id !== link.id && !r.revoked && normalizedClaimEmail(r.claimEmail) === input.email)) return { error: "Utilisez une adresse personnelle unique pour chaque invitation." };
    await tx.update(rsvpsTable).set({ claimEmail: input.email }).where(eq(rsvpsTable.id, link.id));
    return { confirmed: true };
  });
  res.status(result.error ? 409 : 200).json(result);
});

router.param("id", (req, res, next, value) => {
  if (!uuid.safeParse(String(value)).success) {
    res.status(404).json({ error: "Ressource introuvable" });
    return;
  }
  next();
});

router.get("/public/profiles/:id", async (req, res): Promise<void> => {
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

router.get("/public/reports/:id", async (req, res): Promise<void> => {
  const projectId = z.string().uuid().safeParse(String(req.params.id));
  if (!projectId.success) {
    res.status(404).json({ error: "Bilan introuvable" });
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
  const report = project ? projectToPublicReport(project) : null;
  if (!report) {
    res.status(404).json({ error: "Bilan introuvable" });
    return;
  }
  res.json(report);
});

function parseBody<T>(
  schema: z.ZodType<T>,
  req: AuthedRequest,
  res: Parameters<RequestHandler>[1],
): T | undefined {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ error: "Données invalides", details: result.error.flatten() });
    return;
  }
  return result.data;
}

router.get(
  "/projects",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const rows = await db
      .select({ project: projectsTable, role: membershipsTable.role, participantOnly: membershipsTable.participantOnly })
      .from(membershipsTable)
      .innerJoin(
        projectsTable,
        eq(projectsTable.id, membershipsTable.projectId),
      )
      .where(eq(membershipsTable.userId, req.userId!));
    res.json(
      await Promise.all(rows.map(async ({ project, role, participantOnly }) => ({
        ...project,
        data: await cardProjectData(project.id, project.data, role, req.userId!, participantOnly),
        role,
      }))),
    );
  },
);

router.get(
  "/projects/:id/brief",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const member = await membership(String(req.params.id), req.userId!);
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
    res.json(
      buildAuthorizedWeddingBrief({
        projectId: project.id,
        title: project.title,
        data: await cardProjectData(project.id, project.data, member.role, req.userId!),
        role: member.role,
        useWorldLocation: false,
      }),
    );
  },
);

router.get(
  "/projects/:id/fil",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const member = await membership(String(req.params.id), req.userId!);
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
    res.json(
      buildAuthorizedProfileFil({
        projectId: project.id,
        title: project.title,
        data: await cardProjectData(project.id, project.data, member.role, req.userId!),
        role: member.role,
      }),
    );
  },
);

router.post(
  "/projects/:id/brief/nearby",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const consent = parseBody(z.object({ consent: z.literal(true) }), req, res);
    if (!consent) return;
    const member = await membership(String(req.params.id), req.userId!);
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
    res.json(
      buildAuthorizedWeddingBrief({
        projectId: project.id,
        title: project.title,
        data: await cardProjectData(project.id, project.data, member.role, req.userId!),
        role: member.role,
        useWorldLocation: true,
      }),
    );
  },
);

router.get(
  "/account/export",
  auth,
  createRateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    key: (req) => `account-export:${(req as AuthedRequest).userId}`,
  }),
  async (req: AuthedRequest, res): Promise<void> => {
    const userId = req.userId!;
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
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="mes-donnees-aime.json"',
    );
    res.setHeader("Cache-Control", "no-store");
    res.json({
      format: "aime-personal-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      claimedInvitations: await db.select({ projectId: rsvpsTable.projectId, guestId: rsvpsTable.guestId, response: rsvpsTable.response, claimedAt: rsvpsTable.claimedAt }).from(rsvpsTable).where(eq(rsvpsTable.claimedCardUserId, userId)),
      claimedAttestations: await db.select({ projectId: attestationLinksTable.projectId, eventId: attestationLinksTable.eventId, providerId: attestationLinksTable.providerId, claimedAt: attestationLinksTable.claimedAt }).from(attestationLinksTable).where(eq(attestationLinksTable.claimedCardUserId, userId)),
      professionalProfiles: await db.select().from(professionalProfilesTable).where(eq(professionalProfilesTable.cardUserId, userId)),
      professionalAssignments: await db.select().from(professionalAssignmentsTable).where(eq(professionalAssignmentsTable.userId, userId)),
      universalCard: await db.select().from(universalCardsTable).where(eq(universalCardsTable.userId, userId)),
      participations: await db.select({ projectId: membershipsTable.projectId, participation: membershipsTable.participation }).from(membershipsTable).where(eq(membershipsTable.userId, userId)),
      ownedProjects,
      collaborations,
      uploadedFiles,
      sentMessages,
      sentInvitations,
    });
  },
);

router.delete(
  "/account",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    if (req.body?.confirmation !== "SUPPRIMER MON COMPTE") {
      res
        .status(400)
        .json({ error: "Confirmation SUPPRIMER MON COMPTE requise" });
      return;
    }
    const userId = req.userId!;
    const ownedProjects = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.ownerUserId, userId));
    const ownedFiles = (
      await Promise.all(
        ownedProjects.map(({ id }) =>
          db.select().from(filesTable).where(eq(filesTable.projectId, id)),
        ),
      )
    ).flat();
    const userUploadedFiles = await db
      .select()
      .from(filesTable)
      .where(eq(filesTable.uploaderUserId, userId));
    const objectPaths = [
      ...new Set(
        [...ownedFiles, ...userUploadedFiles].map(
          ({ objectPath }) => objectPath,
        ),
      ),
    ];
    const deletionResults = await Promise.allSettled(
      objectPaths.map(async (objectPath) => {
        try {
          await (await storage.getObjectEntityFile(objectPath)).delete();
        } catch (error) {
          if (!(error instanceof ObjectNotFoundError)) throw error;
        }
      }),
    );
    const failedObjects = deletionResults.filter(
      (result) => result.status === "rejected",
    );
    if (failedObjects.length > 0) {
      req.log.error(
        { userId, failedObjects: failedObjects.length },
        "Account deletion stopped before database removal",
      );
      res.status(503).json({
        error:
          "Certains documents n’ont pas pu être supprimés. Le compte a été conservé afin de réessayer sans perdre leur trace.",
      });
      return;
    }
    await db.transaction(async (tx) => {
      await tx.update(rsvpsTable).set({ claimEmail: null }).where(eq(rsvpsTable.claimedCardUserId, userId));
      await tx.delete(universalCardsTable).where(eq(universalCardsTable.userId, userId));
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
    } catch (error) {
      req.log.error(
        { error, userId },
        "Clerk account deletion failed after application data cleanup",
      );
      res.status(502).json({
        error:
          "Les données AIME ont été supprimées, mais la fermeture de la connexion doit être relancée.",
      });
      return;
    }
    res.sendStatus(204);
  },
);

router.post(
  "/projects",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const input = parseBody(projectInput, req, res);
    if (!input) return;
    const [project] = await db.transaction(async (tx) => {
      const created = await tx
        .insert(projectsTable)
        .values({ ...input, data: stripCardProjection(input.data), ownerUserId: req.userId! })
        .returning();
      await tx.insert(membershipsTable).values({
        projectId: created[0].id,
        userId: req.userId!,
        role: "owner",
      });
      return created;
    });
    res.status(201).json({ ...project, role: "owner" });
  },
);

router.put(
  "/projects/:id",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const input = parseBody(projectUpdate, req, res);
    if (!input) return;
    const member = await membership(String(req.params.id), req.userId!);
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
    const currentPublished = Boolean(
      (current.data as Record<string, any> | null)?.publicProfile?.published,
    );
    const nextPublished = Boolean(
      input.data.publicProfile &&
      (input.data.publicProfile as Record<string, unknown>).published,
    );
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
          data: await cardProjectData(current.id, current.data, member.role, req.userId!),
        },
      });
      return;
    }
    const nextData = mergeProtectedProjectData(
      current.data,
      stripCardProjection(input.data),
      member.role,
    );
    const [updated] = await db
      .update(projectsTable)
      .set({ title: input.title, data: nextData, updatedAt: new Date() })
      .where(
        and(
          eq(projectsTable.id, current.id),
          sql`date_trunc('milliseconds', ${projectsTable.updatedAt}) = ${current.updatedAt}`,
        ),
      )
      .returning();
    if (!updated) {
      res.status(409).json({ error: "Conflit de version" });
      return;
    }
    res.json({
      ...updated,
      data: await cardProjectData(updated.id, updated.data, member.role, req.userId!),
      role: member.role,
    });
  },
);

router.delete(
  "/projects/:id",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    if (req.body?.confirmation !== "SUPPRIMER") {
      res.status(400).json({ error: "Confirmation SUPPRIMER requise" });
      return;
    }
    const member = await membership(String(req.params.id), req.userId!);
    if (member?.role !== "owner") {
      res.status(403).json({ error: "Seul le propriétaire peut supprimer" });
      return;
    }
    const files = await db
      .select()
      .from(filesTable)
      .where(eq(filesTable.projectId, String(req.params.id)));
    const deletionResults = await Promise.allSettled(
      files.map(async ({ objectPath }) => {
        try {
          await (await storage.getObjectEntityFile(objectPath)).delete();
        } catch (error) {
          if (!(error instanceof ObjectNotFoundError)) throw error;
        }
      }),
    );
    const failedObjects = deletionResults.filter(
      (result) => result.status === "rejected",
    );
    if (failedObjects.length > 0) {
      req.log.error(
        { projectId: req.params.id, failedObjects: failedObjects.length },
        "Project deletion stopped before database removal",
      );
      res.status(503).json({
        error:
          "Certains documents n’ont pas pu être supprimés. Le Monde a été conservé afin de réessayer sans perdre sa trace.",
      });
      return;
    }
    await db
      .delete(projectsTable)
      .where(eq(projectsTable.id, String(req.params.id)));
    res.sendStatus(204);
  },
);

router.patch(
  "/projects/:id/privacy",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const input = parseBody(
      z.object({ retentionDays: z.number().int().min(30).max(3650) }),
      req,
      res,
    );
    if (!input) return;
    const member = await membership(String(req.params.id), req.userId!);
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
  },
);

router.get(
  "/projects/:id/export",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const member = await membership(String(req.params.id), req.userId!);
    if (!member) {
      res.status(404).json({ error: "Projet introuvable" });
      return;
    }
    if (!can(member.role as ProjectRole, "delete")) {
      res.status(403).json({
        error: "Seul le propriétaire peut exporter toutes les données du Monde",
      });
      return;
    }
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, String(req.params.id)));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="aime-${project.id}.json"`,
    );
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
  },
);

router.get(
  "/projects/:id/members",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const member = await membership(String(req.params.id), req.userId!);
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
  },
);

router.post(
  "/projects/:id/invitations",
  auth,
  createRateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    key: (req) => `invite:${(req as AuthedRequest).userId}`,
  }),
  async (req: AuthedRequest, res): Promise<void> => {
    const input = parseBody(inviteInput, req, res);
    if (!input) return;
    const projectId = String(req.params.id);
    const member = await membership(projectId, req.userId!);
    if (!managedRoles.has(member?.role ?? "")) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    const [invitation] = await db
      .insert(invitationsTable)
      .values({ projectId, ...input, invitedBy: req.userId! })
      .returning();
    const link = `${configuredAppOrigin({
      appUrl: process.env.APP_URL,
      req,
      environment: process.env.NODE_ENV,
    })}/invite/${invitation.token}`;
    try {
      const providerResponse = await sendEmail(
        "/emails",
        JSON.stringify({
          from: "AIME <onboarding@resend.dev>",
          to: [input.email],
          subject: "Invitation à votre espace mariage AIME",
          html: `<p>Vous êtes invité·e à collaborer sur un mariage dans AIME.</p><p><a href="${link}">Accepter l'invitation</a></p>`,
        }),
      );
      assertProviderAccepted(providerResponse, "l’invitation");
    } catch (error) {
      await db
        .delete(invitationsTable)
        .where(eq(invitationsTable.id, invitation.id));
      res.status(502).json({
        error: `Invitation non envoyée: ${error instanceof Error ? error.message : "erreur Resend"}`,
      });
      return;
    }
    res.status(201).json(invitation);
  },
);

router.post(
  "/invitations/:token/accept",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    if (!uuid.safeParse(String(req.params.token)).success) {
      res.status(404).json({ error: "Invitation invalide ou révoquée" });
      return;
    }
    const [invite] = await db
      .select()
      .from(invitationsTable)
      .where(
        and(
          eq(invitationsTable.token, String(req.params.token)),
          isNull(invitationsTable.revokedAt),
          isNull(invitationsTable.acceptedAt),
        ),
      );
    if (!invite) {
      res.status(404).json({ error: "Invitation invalide ou révoquée" });
      return;
    }
    const user = await clerkClient.users.getUser(req.userId!);
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
          userId: req.userId!,
          email: invite.email,
          role: invite.role,
        })
        .onConflictDoUpdate({ target: [membershipsTable.projectId, membershipsTable.userId], set: {
          role: sql`CASE WHEN ${membershipsTable.participantOnly} THEN ${invite.role}::aime_member_role ELSE ${membershipsTable.role} END`,
          participantOnly: false,
        } });
      await tx
        .update(invitationsTable)
        .set({ acceptedAt: new Date() })
        .where(eq(invitationsTable.id, invite.id));
    });
    res.json({ projectId: invite.projectId });
  },
);

router.delete(
  "/invitations/:id",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const [invite] = await db
      .select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, String(req.params.id)));
    if (
      !invite ||
      (await membership(invite.projectId, req.userId!))?.role !== "owner"
    ) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    await db
      .update(invitationsTable)
      .set({ revokedAt: new Date() })
      .where(eq(invitationsTable.id, invite.id));
    res.sendStatus(204);
  },
);

router.post(
  "/storage/uploads/request-url",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const input = parseBody(fileInput, req, res);
    if (!input) return;
    const member = await membership(input.projectId, req.userId!);
    if (!managedRoles.has(member?.role ?? "")) {
      res.status(403).json({ error: "Permission d'envoi refusée" });
      return;
    }
    if (!allowedTypes.has(input.contentType)) {
      res.status(415).json({ error: "Type de fichier non autorisé" });
      return;
    }
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(
      uploadURL.split("?")[0],
    );
    const finalizeToken = signUploadAuthorization(
      {
        ...input,
        objectPath,
        userId: req.userId!,
        expiresAt: Date.now() + UPLOAD_TOKEN_TTL_MS,
      },
      uploadSecret(),
    );
    res.json({ uploadURL, objectPath, finalizeToken });
  },
);

router.post(
  "/storage/files",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const input = parseBody(fileFinalize, req, res);
    if (!input) return;
    const member = await membership(input.projectId, req.userId!);
    if (!managedRoles.has(member?.role ?? "")) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    const { finalizeToken, ...file } = input;
    if (
      !verifyUploadAuthorization(
        finalizeToken,
        { ...file, userId: req.userId! },
        uploadSecret(),
      )
    ) {
      res
        .status(403)
        .json({ error: "Autorisation de finalisation invalide ou expirée" });
      return;
    }
    const path = await storage.trySetObjectEntityAclPolicy(input.objectPath, {
      owner: req.userId!,
      visibility: "private",
    });
    const [storedFile] = await db
      .insert(filesTable)
      .values({ ...file, objectPath: path, uploaderUserId: req.userId! })
      .returning();
    res.status(201).json(storedFile);
  },
);

router.get(
  "/projects/:id/files",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const projectId = String(req.params.id);
    const member = await membership(projectId, req.userId!);
    if (!managedRoles.has(member?.role ?? "")) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    res.json(
      await db
        .select()
        .from(filesTable)
        .where(and(eq(filesTable.projectId, projectId), isNull(filesTable.guestId))),
    );
  },
);

router.get(
  "/storage/files/:id",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const [meta] = await db
      .select()
      .from(filesTable)
      .where(eq(filesTable.id, String(req.params.id)));
    const member = meta && (await membership(meta.projectId, req.userId!));
    if (!meta || !managedRoles.has(member?.role ?? "")) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    const response = await storage.downloadObject(
      await storage.getObjectEntityFile(meta.objectPath),
      0,
    );
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    if (meta.guestId) {
      res.setHeader("Content-Type", meta.contentType);
      res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeDownloadName(meta.name)}"; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
      );
    }
    if (req.query.download === "1")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeDownloadName(meta.name)}"; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
      );
    if (response.body) Readable.fromWeb(response.body as never).pipe(res);
  },
);

router.delete(
  "/storage/files/:id",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const [meta] = await db
      .select()
      .from(filesTable)
      .where(eq(filesTable.id, String(req.params.id)));
    const member = meta && (await membership(meta.projectId, req.userId!));
    if (!meta || !managedRoles.has(member?.role ?? "")) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    await (await storage.getObjectEntityFile(meta.objectPath)).delete();
    await db.delete(filesTable).where(eq(filesTable.id, meta.id));
    res.sendStatus(204);
  },
);

router.post(
  "/projects/:id/messages",
  auth,
  createRateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    key: (req) => `message:${(req as AuthedRequest).userId}`,
  }),
  async (req: AuthedRequest, res): Promise<void> => {
    const input = parseBody(messageInput, req, res);
    if (!input) return;
    const projectId = String(req.params.id);
    const member = await membership(projectId, req.userId!);
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
        createdBy: req.userId!,
        status: input.scheduledAt && new Date(input.scheduledAt) > new Date() ? "scheduled" : "pending",
      })
      .returning();
    if (message.status === "scheduled") {
      req.log.info(
        { messageId: message.id, projectId, scheduledAt: message.scheduledAt },
        "Email scheduled",
      );
      res.status(201).json(message);
      return;
    }
    const result = await deliverMessage(message, shouldSimulateProviderFailure(req));
    if (result.error) {
      req.log.warn(
        { messageId: message.id, projectId, status: result.message.status, providerError: result.error },
        "Email provider failure recorded",
      );
      res.status(502).json(result.message);
      return;
    }
    req.log.info(
      { messageId: message.id, projectId, status: result.message.status },
      "Email delivery recorded",
    );
    res.status(201).json(result.message);
  },
);

router.get(
  "/projects/:id/messages",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const projectId = String(req.params.id);
    const member = await membership(projectId, req.userId!);
    if (!member) {
      res.status(404).json({ error: "Projet introuvable" });
      return;
    }
    if (!managedRoles.has(member.role)) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    await deliverScheduledMessages();
    res.json(
      await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.projectId, projectId)),
    );
  },
);

router.patch(
  "/projects/:id/messages/:messageId",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
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
    const member = await membership(projectId, req.userId!);
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
  },
);

router.post(
  "/projects/:id/messages/:messageId",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const projectId = String(req.params.id);
    const messageId = String(req.params.messageId);
    const member = await membership(projectId, req.userId!);
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
  },
);

router.get(
  "/projects/:id/rsvp-links",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const projectId = String(req.params.id);
    if (
      !managedRoles.has((await membership(projectId, req.userId!))?.role ?? "")
    ) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    const links = await db
      .select()
      .from(rsvpsTable)
      .where(eq(rsvpsTable.projectId, projectId));
    res.json(links);
  },
);

router.post(
  "/projects/:id/rsvp-links/:guestId",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const projectId = String(req.params.id);
    if (
      !managedRoles.has((await membership(projectId, req.userId!))?.role ?? "")
    ) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    const [project] = await db
      .select({ data: projectsTable.data })
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId));
    const guests = Array.isArray(
      (project?.data as Record<string, unknown> | undefined)?.guests,
    )
      ? (project!.data as { guests: Array<{ id?: unknown }> }).guests
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
  },
);

router.delete(
  "/projects/:id/rsvp-links/:guestId",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const projectId = String(req.params.id);
    if (
      !managedRoles.has((await membership(projectId, req.userId!))?.role ?? "")
    ) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    const [updated] = await db
      .update(rsvpsTable)
      .set({ revoked: true })
      .where(
        and(
          eq(rsvpsTable.projectId, projectId),
          eq(rsvpsTable.guestId, String(req.params.guestId)),
        ),
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Lien RSVP introuvable" });
      return;
    }
    res.sendStatus(204);
  },
);

/* ── Partie double : liens d'attestation ───────────────────────────
   Un prestataire relié à un Moment contresigne le fait tel qu'il lui est
   montré. Même mécanique que le RSVP : un jeton, pas de compte. Le Monde ne
   peut jamais écrire une attestation ; elle n'entre que par la réponse au
   lien, et le journal (aime_attestations) est append-only. */

const attestationHistory = async (linkId: string) => {
  const rows = await db.select().from(attestationsTable).where(eq(attestationsTable.linkId, linkId)).orderBy(asc(attestationsTable.respondedAt));
  return rows.map(row => ({ status: row.status, hash: row.hash, respondedAt: row.respondedAt.toISOString(), amountCents: row.amountCents, note: row.note }));
};

router.get(
  "/projects/:id/attestation-links",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId!))?.role ?? "")) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    const links = await db.select().from(attestationLinksTable).where(eq(attestationLinksTable.projectId, projectId));
    /* L'organisateur voit si les Moments sont rattachés, jamais à quel compte. */
    res.json(links.map(({ claimedCardUserId: _card, ...link }) => (link.revoked ? { ...link, token: "" } : link)));
  },
);

router.post(
  "/projects/:id/attestation-links/:eventId/:providerId",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId!))?.role ?? "")) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    const [project] = await db.select({ data: projectsTable.data }).from(projectsTable).where(eq(projectsTable.id, projectId));
    const eventId = String(req.params.eventId);
    const providerId = String(req.params.providerId);
    const check = checkCounterpart(project?.data, eventId, providerId);
    if (!check.ok) {
      const reasons = {
        event: "Moment introuvable dans ce Monde",
        provider: "Professionnel introuvable dans ce Monde",
        relation: "Ce professionnel n'est pas relié à ce Moment",
        suggested: "Une suggestion ne se fait pas attester : adoptez d'abord le Moment",
      } as const;
      res.status(check.reason === "relation" || check.reason === "suggested" ? 409 : 404).json({ error: reasons[check.reason] });
      return;
    }
    const [link] = await db
      .insert(attestationLinksTable)
      .values({ projectId, eventId, providerId, createdBy: req.userId! })
      .onConflictDoUpdate({
        target: [attestationLinksTable.projectId, attestationLinksTable.eventId, attestationLinksTable.providerId],
        set: { revoked: false, token: randomUUID() },
      })
      .returning();
    res.status(201).json(link);
  },
);

router.delete(
  "/projects/:id/attestation-links/:eventId/:providerId",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId!))?.role ?? "")) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    const [updated] = await db
      .update(attestationLinksTable)
      .set({ revoked: true })
      .where(and(
        eq(attestationLinksTable.projectId, projectId),
        eq(attestationLinksTable.eventId, String(req.params.eventId)),
        eq(attestationLinksTable.providerId, String(req.params.providerId)),
      ))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Lien d'attestation introuvable" });
      return;
    }
    res.sendStatus(204);
  },
);

router.get(
  "/attestation/:token",
  createRateLimit({ windowMs: 15 * 60 * 1000, max: 60, key: (req) => `attestation-read:${req.ip}` }),
  async (req, res): Promise<void> => {
    if (!uuid.safeParse(String(req.params.token)).success) {
      res.status(404).json({ error: "Lien d'attestation invalide" });
      return;
    }
    const [row] = await db
      .select({ link: attestationLinksTable, project: projectsTable })
      .from(attestationLinksTable)
      .innerJoin(projectsTable, eq(projectsTable.id, attestationLinksTable.projectId))
      .where(eq(attestationLinksTable.token, String(req.params.token)));
    if (!row || row.link.revoked) {
      res.status(404).json({ error: "Lien d'attestation invalide" });
      return;
    }
    const portal = buildAttestationPortal(row.project.data, row.project.title, row.link.eventId, row.link.providerId, await attestationHistory(row.link.id));
    if (!portal) {
      res.status(404).json({ error: "Ce Moment n'existe plus dans ce Monde." });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(portal);
  },
);

router.post(
  "/attestation/:token",
  createRateLimit({ windowMs: 15 * 60 * 1000, max: 20, key: (req) => `attestation-write:${req.ip}:${String(req.params.token)}` }),
  async (req, res): Promise<void> => {
    const input = parseBody(attestationResponseSchema, req, res);
    if (!input) return;
    if (!uuid.safeParse(String(req.params.token)).success) {
      res.status(404).json({ error: "Lien d'attestation invalide" });
      return;
    }
    const result = await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ link: attestationLinksTable, project: projectsTable })
        .from(attestationLinksTable)
        .innerJoin(projectsTable, eq(projectsTable.id, attestationLinksTable.projectId))
        .where(eq(attestationLinksTable.token, String(req.params.token)))
        .for("update");
      if (!row || row.link.revoked) return { status: 404 as const, error: "Lien d'attestation invalide" };
      const decision = decideResponse(row.project.data, row.link.eventId, row.link.providerId, input);
      if (!decision.ok) return { status: decision.status, error: decision.error };
      const history = await tx.select({ status: attestationsTable.status, hash: attestationsTable.hash }).from(attestationsTable)
        .where(eq(attestationsTable.linkId, row.link.id)).orderBy(asc(attestationsTable.respondedAt));
      if (isDuplicateResponse(history, input)) return { status: 200 as const, duplicate: true };
      const [entry] = await tx.insert(attestationsTable).values({
        linkId: row.link.id,
        projectId: row.link.projectId,
        eventId: row.link.eventId,
        providerId: row.link.providerId,
        status: input.status,
        hash: decision.hash,
        amountCents: decision.fact.amountCents,
        time: new Date(decision.fact.time),
        note: input.status === "conteste" ? input.note ?? null : null,
      }).returning();
      /* Projection dans le Monde : la même écriture, relue par le client sans
         appel supplémentaire. Le serveur la protège de toute sauvegarde
         (projectDataPolicy relit `attestations` depuis la base) : la table
         reste la source, la projection suit. On ne touche PAS à `updatedAt` :
         la contrepartie n'écrit pas le Monde, elle écrit à côté — le verrou
         optimiste du propriétaire ne doit pas se déclencher. */
      const data = (row.project.data && typeof row.project.data === "object" ? row.project.data : {}) as Record<string, unknown>;
      const attestations = Array.isArray(data.attestations) ? data.attestations : [];
      await tx.update(projectsTable).set({
        data: {
          ...data,
          attestations: [...attestations, {
            id: entry.id, eventId: entry.eventId, providerId: entry.providerId, status: entry.status, hash: entry.hash,
            respondedAt: entry.respondedAt.getTime(), amountCents: entry.amountCents, time: entry.time.getTime(),
            ...(entry.note ? { note: entry.note } : {}),
          }],
        },
      }).where(eq(projectsTable.id, row.project.id));
      return { status: 201 as const, entry };
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(result.status).json(result.status === 200 ? { duplicate: true } : result.entry);
  },
);

/* LE PROFIL QUI NAÎT REMPLI. La contrepartie rattache ses Moments d'un Monde
   à sa Carte. Comme pour le RSVP : la possession du lien ne prouve rien,
   l'organisateur confirme une adresse personnelle, le compte doit l'avoir
   vérifiée, et rien n'est transféré automatiquement. */

const verifiedEmailsOf = async (userId: string) => {
  const user = await clerkClient.users.getUser(userId);
  return user.emailAddresses.filter(e => e.verification?.status === "verified").map(e => e.emailAddress);
};

router.get("/attestation/:token/claim", auth, createRateLimit({ windowMs: 900000, max: 20, key: req => `attestation-claim-preview:${(req as AuthedRequest).userId}` }), async (req: AuthedRequest, res) => {
  if (!uuid.safeParse(String(req.params.token)).success) { res.status(404).json({ error: "Lien d'attestation invalide" }); return; }
  res.setHeader("Cache-Control", "no-store");
  const result = await claimAttestation(db, { token: String(req.params.token), userId: req.userId!, verifiedEmails: await verifiedEmailsOf(req.userId!), confirm: false });
  res.status("error" in result ? result.status! : 200).json(result);
});
router.post("/attestation/:token/claim", auth, createRateLimit({ windowMs: 900000, max: 10, key: req => `attestation-claim-confirm:${(req as AuthedRequest).userId}` }), async (req: AuthedRequest, res) => {
  if (!uuid.safeParse(String(req.params.token)).success) { res.status(404).json({ error: "Lien d'attestation invalide" }); return; }
  if (!parseBody(claimConsentSchema, req, res)) return;
  res.setHeader("Cache-Control", "no-store");
  const result = await claimAttestation(db, { token: String(req.params.token), userId: req.userId!, verifiedEmails: await verifiedEmailsOf(req.userId!), confirm: true });
  res.status("error" in result ? result.status! : 200).json(result);
});

/* L'organisateur confirme l'adresse personnelle du prestataire pour ce Monde.
   Elle vaut pour tous ses liens : c'est la même personne. */
router.patch("/projects/:id/attestation-links/:providerId/claim-recipient", auth, async (req: AuthedRequest, res) => {
  const input = parseBody(claimRecipientSchema, req, res); if (!input) return;
  const member = await membership(String(req.params.id), req.userId!);
  if (!member || !managedRoles.has(member.role)) { res.status(403).json({ error: "Confirmation réservée aux organisateurs autorisés." }); return; }
  const providerId = String(req.params.providerId);
  const result = await db.transaction(async tx => {
    const [project] = await tx.select().from(projectsTable).where(eq(projectsTable.id, member.projectId)).for("update");
    if (!project || (project.data as any)?.closure?.closedAt) return { error: "Monde clôturé ou introuvable" };
    const links = await tx.select().from(attestationLinksTable).where(eq(attestationLinksTable.projectId, member.projectId));
    const mine = links.filter(link => link.providerId === providerId && !link.revoked);
    if (!mine.length) return { error: "Aucun lien d'attestation actif pour ce professionnel." };
    if (mine.some(link => link.claimedAt)) return { error: "Ces Moments sont déjà rattachés à une carte. Aucun transfert automatique n'est autorisé." };
    if (links.some(link => link.providerId !== providerId && !link.revoked && normalizedClaimEmail(link.claimEmail) === input.email)) return { error: "Utilisez une adresse personnelle unique pour chaque professionnel." };
    await tx.update(attestationLinksTable).set({ claimEmail: input.email })
      .where(and(eq(attestationLinksTable.projectId, member.projectId), eq(attestationLinksTable.providerId, providerId), eq(attestationLinksTable.revoked, false)));
    return { confirmed: true, links: mine.length };
  });
  res.status("error" in result ? 409 : 200).json(result);
});

/* Ce que la Carte lit : les Moments contresignés par d'autres Mondes.
   Relus à l'instant, jamais copiés — un fait qui bouge périme sa signature. */
router.get("/me/attestations", auth, async (req: AuthedRequest, res) => {
  res.setHeader("Cache-Control", "no-store");
  const links = await db.select().from(attestationLinksTable)
    .where(and(eq(attestationLinksTable.claimedCardUserId, req.userId!), eq(attestationLinksTable.revoked, false)));
  const projectIds = [...new Set(links.map(link => link.projectId))];
  const moments: ReturnType<typeof countersignedMoments> = [];
  for (const projectId of projectIds) {
    const [project] = await db.select({ id: projectsTable.id, title: projectsTable.title, data: projectsTable.data }).from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) continue;
    const mine = links.filter(link => link.projectId === projectId);
    const providerIds = new Set(mine.map(link => link.providerId));
    const history = (await db
      .select({ eventId: attestationsTable.eventId, providerId: attestationsTable.providerId, status: attestationsTable.status, hash: attestationsTable.hash, respondedAt: attestationsTable.respondedAt })
      .from(attestationsTable).where(eq(attestationsTable.projectId, projectId)))
      .filter(row => providerIds.has(row.providerId));
    moments.push(...countersignedMoments(project, mine, history));
  }
  moments.sort((a, b) => b.time - a.time);
  res.json({ moments, proof: profileProof(moments) });
});

router.get(
  "/projects/:id/participant-media",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId!))?.role ?? "")) {
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
  },
);

router.patch(
  "/projects/:id/participant-media/:mediaId",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const input = parseBody(z.object({ status: z.enum(["pending", "approved", "rejected"]) }), req, res);
    if (!input) return;
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId!))?.role ?? "")) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    const [existing] = await db.select({
      id: filesTable.id,
      consent: filesTable.consent,
    }).from(filesTable).where(and(
      eq(filesTable.id, String(req.params.mediaId)),
      eq(filesTable.projectId, projectId),
      isNotNull(filesTable.guestId),
    ));
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
  },
);

router.get(
  "/projects/:id/song-requests",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId!))?.role ?? "")) {
      res.status(403).json({ error: "Permission refusée" });
      return;
    }
    const [project] = await db.select({ data: projectsTable.data }).from(projectsTable).where(eq(projectsTable.id, projectId));
    const requests = await db.select().from(songRequestsTable).where(eq(songRequestsTable.projectId, projectId));
    res.json(requests.map((request) => ({
      ...request,
      guestName: participantNameById(project?.data, request.guestId),
    })));
  },
);

router.patch(
  "/projects/:id/song-requests/:requestId",
  auth,
  async (req: AuthedRequest, res): Promise<void> => {
    const input = parseBody(z.object({ status: z.enum(["new", "seen", "accepted", "played", "rejected"]) }), req, res);
    if (!input) return;
    const projectId = String(req.params.id);
    if (!managedRoles.has((await membership(projectId, req.userId!))?.role ?? "")) {
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
  },
);

router.get(
  "/rsvp/:token",
  createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    key: (req) => `rsvp-read:${req.ip}`,
  }),
  async (req, res): Promise<void> => {
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
    if (!canAccessClaimedRsvp(link.rsvp, optionalUserId(req))) { res.status(401).json({ error: "Cette invitation est rattachée à un compte. Connectez-vous avec ce compte pour continuer." }); return; }
    res.setHeader("Cache-Control", "no-store");
    const songRequests = await db.select({
      id: songRequestsTable.id, title: songRequestsTable.title, artist: songRequestsTable.artist,
      message: songRequestsTable.message, status: songRequestsTable.status, createdAt: songRequestsTable.createdAt,
    }).from(songRequestsTable).where(and(
      eq(songRequestsTable.projectId, link.rsvp.projectId),
      eq(songRequestsTable.guestId, link.rsvp.guestId),
    ));
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
    }).from(filesTable).where(and(
      eq(filesTable.projectId, link.rsvp.projectId),
      isNotNull(filesTable.guestId),
      or(
        eq(filesTable.guestId, link.rsvp.guestId),
        and(eq(filesTable.moderationStatus, "approved"), eq(filesTable.visibility, "guests")),
      ),
    ));
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
  },
);

router.post(
  "/rsvp/:token/media/uploads/request-url",
  createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 12,
    key: (req) => `rsvp-media-upload:${req.ip}:${String(req.params.token)}`,
  }),
  async (req, res): Promise<void> => {
    const input = parseBody(participantUploadInput, req, res);
    if (!input) return;
    const link = await activeRsvp(String(req.params.token), optionalUserId(req));
    if (!link) {
      res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
      return;
    }
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL.split("?")[0]);
    const finalizeToken = signUploadAuthorization(
      { ...input, objectPath, projectId: link.projectId, guestId: link.guestId, rsvpId: link.id, expiresAt: Date.now() + UPLOAD_TOKEN_TTL_MS },
      uploadSecret(),
    );
    res.setHeader("Cache-Control", "no-store");
    res.json({ uploadURL, objectPath, finalizeToken });
  },
);

router.post(
  "/rsvp/:token/media",
  createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 12,
    key: (req) => `rsvp-media-finalize:${req.ip}:${String(req.params.token)}`,
  }),
  async (req, res): Promise<void> => {
    const input = parseBody(participantMediaFinalize, req, res);
    if (!input) return;
    const link = await activeRsvp(String(req.params.token), optionalUserId(req));
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
    } catch (error) {
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
      await tx.select().from(projectsTable).where(eq(projectsTable.id, link.projectId)).for("update");
      const [active] = await tx.select({ id: rsvpsTable.id })
        .from(rsvpsTable)
        .where(and(eq(rsvpsTable.id, link.id), eq(rsvpsTable.token, link.token), eq(rsvpsTable.revoked, false), rsvpOwnerCondition(optionalUserId(req)))).for("update");
      if (!active) return [];
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
  },
);

router.get(
  "/rsvp/:token/media/:mediaId",
  createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    key: (req) => `rsvp-media-read:${req.ip}:${String(req.params.token)}`,
  }),
  async (req, res): Promise<void> => {
    const link = await activeRsvp(String(req.params.token), optionalUserId(req));
    if (!link || !uuid.safeParse(String(req.params.mediaId)).success) {
      res.status(404).json({ error: "Média introuvable" });
      return;
    }
    const [media] = await db.select().from(filesTable).where(and(
      eq(filesTable.id, String(req.params.mediaId)),
      eq(filesTable.projectId, link.projectId),
      or(
        eq(filesTable.guestId, link.guestId),
        and(eq(filesTable.moderationStatus, "approved"), eq(filesTable.visibility, "guests")),
      ),
    ));
    if (!media) {
      res.status(404).json({ error: "Média introuvable" });
      return;
    }
    const response = await storage.downloadObject(await storage.getObjectEntityFile(media.objectPath), 0);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("Content-Type", media.contentType);
    res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${safeDownloadName(media.name)}"; filename*=UTF-8''${encodeURIComponent(media.name)}`,
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    if (response.body) Readable.fromWeb(response.body as never).pipe(res);
  },
);

router.post(
  "/rsvp/:token/song-requests",
  createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    key: (req) => `rsvp-song-request:${req.ip}:${String(req.params.token)}`,
  }),
  async (req, res): Promise<void> => {
    const input = parseBody(songRequestInput, req, res);
    if (!input) return;
    const link = await activeRsvp(String(req.params.token), optionalUserId(req));
    if (!link) {
      res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
      return;
    }
    const [request] = await db.transaction(async tx => {
      await tx.select().from(projectsTable).where(eq(projectsTable.id, link.projectId)).for("update");
      const [active] = await tx.select().from(rsvpsTable).where(and(eq(rsvpsTable.id, link.id), eq(rsvpsTable.token, link.token), eq(rsvpsTable.revoked, false), rsvpOwnerCondition(optionalUserId(req)))).for("update");
      if (!active) return [];
      return tx.insert(songRequestsTable).values({ ...input, projectId: link.projectId, guestId: link.guestId, status: "new" }).returning();
    });
    if (!request) { res.status(404).json({ error: "Lien RSVP invalide ou révoqué" }); return; }
    res.status(201).json(request);
  },
);

router.put(
  "/rsvp/:token",
  createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 12,
    key: (req) => `rsvp-write:${req.ip}:${String(req.params.token)}`,
  }),
  async (req, res): Promise<void> => {
    if (!uuid.safeParse(String(req.params.token)).success) {
      res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
      return;
    }
    const input = parseBody(rsvpInput, req, res);
    if (!input) return;
    const projectGuestPatch = JSON.stringify({
      rsvp: input.status === "confirmed" ? "confirme" : "decline",
      attendance: input.attendance,
      dietary: input.dietary ?? "",
      plusOne: input.plusOne,
    });
    const updated = await db.transaction(async (tx) => {
      const [initial] = await tx.select().from(rsvpsTable).where(eq(rsvpsTable.token, String(req.params.token)));
      if (!initial) return undefined;
      await tx.select().from(projectsTable).where(eq(projectsTable.id, initial.projectId)).for("update");
      const respondedAt = new Date();
      const [saved] = await tx
        .update(rsvpsTable)
        .set({ response: input, respondedAt })
        .where(
          and(
            eq(rsvpsTable.token, String(req.params.token)),
            eq(rsvpsTable.revoked, false),
            rsvpOwnerCondition(optionalUserId(req)),
          ),
        )
        .returning();
      if (!saved) return undefined;
      await tx
        .update(projectsTable)
        .set({
          data: sql`jsonb_set(
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
  },
);

/*
 * L'assistant AIME côté serveur : chaque réponse est ancrée sur le brief
 * autorisé du mariage (rôle vérifié via le membership). Sans clé
 * `AIME_CHAT_API_KEY` — ou si le fournisseur échoue — le régime local
 * renvoie les segments du brief les plus proches, sans invention.
 */
const aimeChatInput = z.object({
  message: z.string().trim().min(1).max(2000),
  locale: z.enum(["fr", "en"]).default("fr"),
});

router.post(
  "/projects/:id/aime/chat",
  auth,
  createRateLimit({
    windowMs: 60 * 60 * 1000,
    max: 60,
    key: (req) => `aime-chat:${(req as AuthedRequest).userId}`,
  }),
  async (req: AuthedRequest, res): Promise<void> => {
    const input = parseBody(aimeChatInput, req, res);
    if (!input) return;
    const member = await membership(String(req.params.id), req.userId!);
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
    const brief = buildAuthorizedWeddingBrief({
      projectId: project.id,
      title: project.title,
      data: project.data,
      role: member.role,
      useWorldLocation: false,
    });
    const locale = input.locale ?? "fr";
    const config = chatConfigFromEnv();
    if (config) {
      const reply = await completeWithModel(input.message, brief, locale, config);
      if (reply) {
        res.json(reply);
        return;
      }
    }
    res.json(answerAimeLocally(input.message, brief, locale));
  },
);

/*
 * Classification d'un document partagé dans l'assistant : le nom du fichier
 * désigne le dossier universel qui l'accueillera. Lecture seule, membre du
 * Monde suffit — le dépôt effectif reste soumis aux droits d'écriture.
 */
const aimeClassifyInput = z.object({
  name: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().max(127).optional().default(""),
});

router.post(
  "/projects/:id/aime/documents/classify",
  auth,
  createRateLimit({
    windowMs: 60 * 60 * 1000,
    max: 120,
    key: (req) => `aime-classify:${(req as AuthedRequest).userId}`,
  }),
  async (req: AuthedRequest, res): Promise<void> => {
    const input = parseBody(aimeClassifyInput, req, res);
    if (!input) return;
    const member = await membership(String(req.params.id), req.userId!);
    if (!member) {
      res.status(404).json({ error: "Monde introuvable" });
      return;
    }
    res.json(classifyDocument({ name: input.name, mimeType: input.mimeType }));
  },
);

export default router;

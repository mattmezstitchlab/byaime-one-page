import { Router, type IRouter, type RequestHandler } from "express";
import { Readable } from "node:stream";
import { clerkClient, getAuth } from "@clerk/express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { and, eq, isNull } from "drizzle-orm";
import {
  db,
  filesTable,
  invitationsTable,
  membershipsTable,
  messagesTable,
  projectsTable,
  rsvpsTable,
} from "@workspace/db";
import { z } from "zod";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";
import { authenticatedUserId } from "../lib/permissions";
import { projectToPublicProfile } from "../lib/publicProfile";

type AuthedRequest = Parameters<RequestHandler>[0] & { userId?: string };
const router: IRouter = Router();
const storage = new ObjectStorageService();
const connectors = new ReplitConnectors();
const roles = ["owner", "planner", "family", "viewer"] as const;
const editableRoles = new Set(["owner", "planner", "family"]);
const managedRoles = new Set(["owner", "planner"]);
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "video/mp4"]);
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function shouldSimulateProviderFailure(req: AuthedRequest): boolean {
  return process.env.NODE_ENV !== "production"
    && process.env.AIME_E2E_RUN === "1"
    && req.get("x-aime-e2e-provider") === "failure";
}

const projectInput = z.object({
  title: z.string().trim().min(1).max(160),
  data: z.record(z.string(), z.unknown()),
});
const projectUpdate = projectInput.extend({ updatedAt: z.string().datetime() });
const inviteInput = z.object({ email: z.string().email(), role: z.enum(roles).exclude(["owner"]) });
const fileInput = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(240),
  contentType: z.string(),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
});
const fileFinalize = fileInput.extend({ objectPath: z.string().regex(/^\/objects\/uploads\/[a-f0-9-]+$/i) });
const messageInput = z.object({
  kind: z.enum(["invitation", "rsvp_reminder", "practical_info", "provider_follow_up", "thank_you"]),
  recipients: z.array(z.string().email()).min(1).max(100),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
  confirmed: z.literal(true),
});
const rsvpInput = z.object({
  status: z.enum(["confirmed", "declined"]),
  attendance: z.object({ ceremony: z.boolean(), cocktail: z.boolean(), dinner: z.boolean(), brunch: z.boolean() }),
  dietary: z.string().max(1000).optional(),
  plusOne: z.boolean(),
  notes: z.string().max(2000).optional(),
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]!);
}

function auth(req: AuthedRequest, res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  const value = getAuth(req);
  const userId = authenticatedUserId(value);
  if (!userId) {
    res.status(401).json({ error: "Authentification requise" });
    return;
  }
  req.userId = userId;
  next();
}

async function membership(projectId: string, userId: string) {
  const [member] = await db.select().from(membershipsTable)
    .where(and(eq(membershipsTable.projectId, projectId), eq(membershipsTable.userId, userId)));
  return member;
}

router.get("/public/profiles/:id", async (req, res): Promise<void> => {
  const projectId = z.string().uuid().safeParse(String(req.params.id));
  if (!projectId.success) {
    res.status(404).json({ error: "Profil public introuvable" });
    return;
  }
  const [project] = await db.select({
    id: projectsTable.id,
    title: projectsTable.title,
    data: projectsTable.data,
  }).from(projectsTable).where(eq(projectsTable.id, projectId.data));
  const profile = project ? projectToPublicProfile(project) : null;
  if (!profile) {
    res.status(404).json({ error: "Profil public introuvable" });
    return;
  }
  res.json(profile);
});

function parseBody<T>(schema: z.ZodType<T>, req: AuthedRequest, res: Parameters<RequestHandler>[1]): T | undefined {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Données invalides", details: result.error.flatten() });
    return;
  }
  return result.data;
}

router.get("/projects", auth, async (req: AuthedRequest, res): Promise<void> => {
  const rows = await db.select({ project: projectsTable, role: membershipsTable.role })
    .from(membershipsTable).innerJoin(projectsTable, eq(projectsTable.id, membershipsTable.projectId))
    .where(eq(membershipsTable.userId, req.userId!));
  res.json(rows.map(({ project, role }) => ({ ...project, role })));
});

router.post("/projects", auth, async (req: AuthedRequest, res): Promise<void> => {
  const input = parseBody(projectInput, req, res);
  if (!input) return;
  const [project] = await db.transaction(async (tx) => {
    const created = await tx.insert(projectsTable).values({ ...input, ownerUserId: req.userId! }).returning();
    await tx.insert(membershipsTable).values({ projectId: created[0].id, userId: req.userId!, role: "owner" });
    return created;
  });
  res.status(201).json({ ...project, role: "owner" });
});

router.put("/projects/:id", auth, async (req: AuthedRequest, res): Promise<void> => {
  const input = parseBody(projectUpdate, req, res);
  if (!input) return;
  const member = await membership(String(req.params.id), req.userId!);
  if (!member) { res.status(404).json({ error: "Projet introuvable" }); return; }
  if (!editableRoles.has(member.role)) { res.status(403).json({ error: "Permission de modification refusée" }); return; }
  const [current] = await db.select().from(projectsTable).where(eq(projectsTable.id, String(req.params.id)));
  if (!current) { res.status(404).json({ error: "Projet introuvable" }); return; }
  const currentPublished = Boolean((current.data as Record<string, any> | null)?.publicProfile?.published);
  const nextPublished = Boolean(input.data.publicProfile && (input.data.publicProfile as Record<string, unknown>).published);
  if (member.role !== "owner" && currentPublished !== nextPublished) {
    res.status(403).json({ error: "Seul le propriétaire peut modifier la publication" });
    return;
  }
  if (current.updatedAt.toISOString() !== input.updatedAt) {
    res.status(409).json({ error: "Le projet a été modifié ailleurs", project: current });
    return;
  }
  const [updated] = await db.update(projectsTable)
    .set({ title: input.title, data: input.data, updatedAt: new Date() })
    .where(and(eq(projectsTable.id, current.id), eq(projectsTable.updatedAt, current.updatedAt))).returning();
  if (!updated) { res.status(409).json({ error: "Conflit de version" }); return; }
  res.json({ ...updated, role: member.role });
});

router.delete("/projects/:id", auth, async (req: AuthedRequest, res): Promise<void> => {
  if (req.body?.confirmation !== "SUPPRIMER") { res.status(400).json({ error: "Confirmation SUPPRIMER requise" }); return; }
  const member = await membership(String(req.params.id), req.userId!);
  if (member?.role !== "owner") { res.status(403).json({ error: "Seul le propriétaire peut supprimer" }); return; }
  const files = await db.select().from(filesTable).where(eq(filesTable.projectId, String(req.params.id)));
  await Promise.all(files.map(async ({ objectPath }) => {
    try { await (await storage.getObjectEntityFile(objectPath)).delete(); } catch (error) {
      if (!(error instanceof ObjectNotFoundError)) req.log.warn({ error, objectPath }, "Object deletion failed");
    }
  }));
  await db.delete(projectsTable).where(eq(projectsTable.id, String(req.params.id)));
  res.sendStatus(204);
});

router.patch("/projects/:id/privacy", auth, async (req: AuthedRequest, res): Promise<void> => {
  const input = parseBody(z.object({ retentionDays: z.number().int().min(30).max(3650) }), req, res);
  if (!input) return;
  const member = await membership(String(req.params.id), req.userId!);
  if (member?.role !== "owner") { res.status(403).json({ error: "Permission refusée" }); return; }
  const [project] = await db.update(projectsTable).set({ retentionDays: input.retentionDays, updatedAt: new Date() })
    .where(eq(projectsTable.id, String(req.params.id))).returning();
  res.json(project);
});

router.get("/projects/:id/export", auth, async (req: AuthedRequest, res): Promise<void> => {
  const member = await membership(String(req.params.id), req.userId!);
  if (!member) { res.status(404).json({ error: "Projet introuvable" }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, String(req.params.id)));
  const members = await db.select().from(membershipsTable).where(eq(membershipsTable.projectId, project.id));
  const files = await db.select().from(filesTable).where(eq(filesTable.projectId, project.id));
  res.setHeader("Content-Disposition", `attachment; filename="aime-${project.id}.json"`);
  res.json({ format: "aime-backup", version: 1, exportedAt: new Date().toISOString(), project, members, files });
});

router.get("/projects/:id/members", auth, async (req: AuthedRequest, res): Promise<void> => {
  const member = await membership(String(req.params.id), req.userId!);
  if (!member) { res.status(404).json({ error: "Projet introuvable" }); return; }
  const members = await db.select().from(membershipsTable).where(eq(membershipsTable.projectId, String(req.params.id)));
  const invitations = managedRoles.has(member.role)
    ? await db.select().from(invitationsTable).where(eq(invitationsTable.projectId, String(req.params.id))) : [];
  res.json({ members, invitations });
});

router.post("/projects/:id/invitations", auth, async (req: AuthedRequest, res): Promise<void> => {
  const input = parseBody(inviteInput, req, res);
  if (!input) return;
  const projectId = String(req.params.id);
  const member = await membership(projectId, req.userId!);
  if (!managedRoles.has(member?.role ?? "")) { res.status(403).json({ error: "Permission refusée" }); return; }
  const [invitation] = await db.insert(invitationsTable).values({ projectId, ...input, invitedBy: req.userId! }).returning();
  const origin = req.get("origin") ?? `${req.protocol}://${req.get("host")}`;
  const link = `${origin}/invite/${invitation.token}`;
  try {
    await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify({ from: "AIME <onboarding@resend.dev>", to: [input.email], subject: "Invitation à votre espace mariage AIME", html: `<p>Vous êtes invité·e à collaborer sur un mariage dans AIME.</p><p><a href="${link}">Accepter l'invitation</a></p>` }),
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    await db.delete(invitationsTable).where(eq(invitationsTable.id, invitation.id));
    res.status(502).json({ error: `Invitation non envoyée: ${error instanceof Error ? error.message : "erreur Resend"}` });
    return;
  }
  res.status(201).json(invitation);
});

router.post("/invitations/:token/accept", auth, async (req: AuthedRequest, res): Promise<void> => {
  const [invite] = await db.select().from(invitationsTable).where(and(
    eq(invitationsTable.token, String(req.params.token)), isNull(invitationsTable.revokedAt), isNull(invitationsTable.acceptedAt),
  ));
  if (!invite) { res.status(404).json({ error: "Invitation invalide ou révoquée" }); return; }
  const user = await clerkClient.users.getUser(req.userId!);
  const verifiedEmails = user.emailAddresses
    .filter(({ verification }) => verification?.status === "verified")
    .map(({ emailAddress }) => emailAddress.trim().toLowerCase());
  if (!verifiedEmails.includes(invite.email.trim().toLowerCase())) {
    res.status(403).json({ error: "Cette invitation est destinée à une autre adresse e-mail" });
    return;
  }
  await db.transaction(async (tx) => {
    await tx.insert(membershipsTable).values({ projectId: invite.projectId, userId: req.userId!, email: invite.email, role: invite.role }).onConflictDoNothing();
    await tx.update(invitationsTable).set({ acceptedAt: new Date() }).where(eq(invitationsTable.id, invite.id));
  });
  res.json({ projectId: invite.projectId });
});

router.delete("/invitations/:id", auth, async (req: AuthedRequest, res): Promise<void> => {
  const [invite] = await db.select().from(invitationsTable).where(eq(invitationsTable.id, String(req.params.id)));
  if (!invite || (await membership(invite.projectId, req.userId!))?.role !== "owner") {
    res.status(403).json({ error: "Permission refusée" }); return;
  }
  await db.update(invitationsTable).set({ revokedAt: new Date() }).where(eq(invitationsTable.id, invite.id));
  res.sendStatus(204);
});

router.post("/storage/uploads/request-url", auth, async (req: AuthedRequest, res): Promise<void> => {
  const input = parseBody(fileInput, req, res);
  if (!input) return;
  const member = await membership(input.projectId, req.userId!);
  if (!managedRoles.has(member?.role ?? "")) { res.status(403).json({ error: "Permission d'envoi refusée" }); return; }
  if (!allowedTypes.has(input.contentType)) { res.status(415).json({ error: "Type de fichier non autorisé" }); return; }
  const uploadURL = await storage.getObjectEntityUploadURL();
  res.json({ uploadURL, objectPath: storage.normalizeObjectEntityPath(uploadURL.split("?")[0]) });
});

router.post("/storage/files", auth, async (req: AuthedRequest, res): Promise<void> => {
  const input = parseBody(fileFinalize, req, res);
  if (!input) return;
  const member = await membership(input.projectId, req.userId!);
  if (!managedRoles.has(member?.role ?? "")) { res.status(403).json({ error: "Permission refusée" }); return; }
  const path = await storage.trySetObjectEntityAclPolicy(input.objectPath, { owner: req.userId!, visibility: "private" });
  const [file] = await db.insert(filesTable).values({ ...input, objectPath: path, uploaderUserId: req.userId! }).returning();
  res.status(201).json(file);
});

router.get("/projects/:id/files", auth, async (req: AuthedRequest, res): Promise<void> => {
  const projectId = String(req.params.id);
  if (!(await membership(projectId, req.userId!))) { res.status(404).json({ error: "Projet introuvable" }); return; }
  res.json(await db.select().from(filesTable).where(eq(filesTable.projectId, projectId)));
});

router.get("/storage/files/:id", auth, async (req: AuthedRequest, res): Promise<void> => {
  const [meta] = await db.select().from(filesTable).where(eq(filesTable.id, String(req.params.id)));
  if (!meta || !(await membership(meta.projectId, req.userId!))) { res.status(404).json({ error: "Fichier introuvable" }); return; }
  const response = await storage.downloadObject(await storage.getObjectEntityFile(meta.objectPath), 0);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (req.query.download === "1") res.setHeader("Content-Disposition", `attachment; filename="${meta.name.replaceAll('"', "")}"`);
  if (response.body) Readable.fromWeb(response.body as never).pipe(res);
});

router.delete("/storage/files/:id", auth, async (req: AuthedRequest, res): Promise<void> => {
  const [meta] = await db.select().from(filesTable).where(eq(filesTable.id, String(req.params.id)));
  const member = meta && await membership(meta.projectId, req.userId!);
  if (!meta || !managedRoles.has(member?.role ?? "")) { res.status(403).json({ error: "Permission refusée" }); return; }
  await (await storage.getObjectEntityFile(meta.objectPath)).delete();
  await db.delete(filesTable).where(eq(filesTable.id, meta.id));
  res.sendStatus(204);
});

router.post("/projects/:id/messages", auth, async (req: AuthedRequest, res): Promise<void> => {
  const input = parseBody(messageInput, req, res);
  if (!input) return;
  const projectId = String(req.params.id);
  const member = await membership(projectId, req.userId!);
  if (!managedRoles.has(member?.role ?? "")) { res.status(403).json({ error: "Permission d'envoi refusée" }); return; }
  const [message] = await db.insert(messagesTable).values({ ...input, projectId, createdBy: req.userId!, status: "pending" }).returning();
  try {
    if (shouldSimulateProviderFailure(req)) throw new Error("Échec fournisseur simulé pour le scénario E2E");
    await connectors.proxy("resend", "/emails", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "AIME <onboarding@resend.dev>",
        to: input.recipients,
        subject: input.subject,
        html: `<div>${escapeHtml(input.body).replaceAll("\n", "<br>")}</div>`,
      }),
    });
    const [sent] = await db.update(messagesTable).set({ status: "sent", sentAt: new Date() }).where(eq(messagesTable.id, message.id)).returning();
    req.log.info({ messageId: message.id, projectId, status: sent.status }, "Email delivery recorded");
    res.status(201).json(sent);
  } catch (error) {
    const providerError = error instanceof Error ? error.message : "Erreur Resend";
    const [failed] = await db.update(messagesTable).set({ status: "failed", providerError }).where(eq(messagesTable.id, message.id)).returning();
    req.log.warn({ messageId: message.id, projectId, status: failed.status, providerError }, "Email provider failure recorded");
    res.status(502).json(failed);
  }
});

router.get("/projects/:id/messages", auth, async (req: AuthedRequest, res): Promise<void> => {
  const projectId = String(req.params.id);
  const member = await membership(projectId, req.userId!);
  if (!member) { res.status(404).json({ error: "Projet introuvable" }); return; }
  if (!managedRoles.has(member.role)) { res.status(403).json({ error: "Permission refusée" }); return; }
  res.json(await db.select().from(messagesTable).where(eq(messagesTable.projectId, projectId)));
});

router.post("/projects/:id/rsvp-links/:guestId", auth, async (req: AuthedRequest, res): Promise<void> => {
  const projectId = String(req.params.id);
  if (!managedRoles.has((await membership(projectId, req.userId!))?.role ?? "")) { res.status(403).json({ error: "Permission refusée" }); return; }
  const [link] = await db.insert(rsvpsTable).values({ projectId, guestId: String(req.params.guestId) })
    .onConflictDoUpdate({ target: [rsvpsTable.projectId, rsvpsTable.guestId], set: { revoked: false, response: null, respondedAt: null } }).returning();
  res.status(201).json(link);
});

router.delete("/projects/:id/rsvp-links/:guestId", auth, async (req: AuthedRequest, res): Promise<void> => {
  const projectId = String(req.params.id);
  if (!managedRoles.has((await membership(projectId, req.userId!))?.role ?? "")) {
    res.status(403).json({ error: "Permission refusée" });
    return;
  }
  const [updated] = await db.update(rsvpsTable).set({ revoked: true })
    .where(and(eq(rsvpsTable.projectId, projectId), eq(rsvpsTable.guestId, String(req.params.guestId)))).returning();
  if (!updated) {
    res.status(404).json({ error: "Lien RSVP introuvable" });
    return;
  }
  res.sendStatus(204);
});

router.get("/rsvp/:token", async (req, res): Promise<void> => {
  const [link] = await db.select({ rsvp: rsvpsTable, project: projectsTable }).from(rsvpsTable)
    .innerJoin(projectsTable, eq(projectsTable.id, rsvpsTable.projectId)).where(eq(rsvpsTable.token, String(req.params.token)));
  if (!link || link.rsvp.revoked) { res.status(404).json({ error: "Lien RSVP invalide" }); return; }
  res.json({ projectTitle: link.project.title, guestId: link.rsvp.guestId, response: link.rsvp.response });
});

router.put("/rsvp/:token", async (req, res): Promise<void> => {
  const input = parseBody(rsvpInput, req, res);
  if (!input) return;
  const [updated] = await db.update(rsvpsTable).set({ response: input, respondedAt: new Date() })
    .where(and(eq(rsvpsTable.token, String(req.params.token)), eq(rsvpsTable.revoked, false))).returning();
  if (!updated) { res.status(404).json({ error: "Lien RSVP invalide ou révoqué" }); return; }
  res.json({ response: updated.response, respondedAt: updated.respondedAt });
});

export default router;
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const memberRole = pgEnum("aime_member_role", ["owner", "planner", "family", "viewer"]);
export const deliveryStatus = pgEnum("aime_delivery_status", ["scheduled", "pending", "sent", "failed", "cancelled"]);
export const localReferenceState = pgEnum("aime_local_reference_state", ["local", "linked", "imported", "ignored"]);
export const laboratoryFeedbackType = pgEnum("aime_laboratory_feedback_type", [
  "bug",
  "remarque",
  "suggestion",
  "idee",
  "question",
  "positif",
  "ux",
  "contenu_donnees",
]);
export const laboratoryFeedbackStatus = pgEnum("aime_laboratory_feedback_status", [
  "nouveau",
  "en_cours",
  "a_verifier",
  "resolu",
  "archive",
]);

export const projectsTable = pgTable("aime_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: text("owner_user_id").notNull(),
  title: text("title").notNull(),
  data: jsonb("data").notNull(),
  retentionDays: integer("retention_days").notNull().default(365),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const membershipsTable = pgTable("aime_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  email: text("email"),
  role: memberRole("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("aime_membership_project_user").on(table.projectId, table.userId)]);

export const invitationsTable = pgTable("aime_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: memberRole("role").notNull(),
  token: uuid("token").notNull().defaultRandom().unique(),
  invitedBy: text("invited_by").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const filesTable = pgTable("aime_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  uploaderUserId: text("uploader_user_id").notNull(),
  objectPath: text("object_path").notNull().unique(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  guestId: text("guest_id"),
  moderationStatus: text("moderation_status").notNull().default("approved"),
  visibility: text("visibility").notNull().default("private"),
  caption: text("caption"),
  consent: boolean("consent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const localBridgeSessionsTable = pgTable("aime_local_bridge_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  bridgeId: text("bridge_id").notNull(),
  bridgeLabel: text("bridge_label"),
  bridgeVersion: text("bridge_version"),
  sessionTokenHash: text("session_token_hash").notNull().unique(),
  pairedAt: timestamp("paired_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("aime_local_bridge_user_bridge").on(table.userId, table.bridgeId),
]);

export const localPairingTokensTable = pgTable("aime_local_pairing_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull(),
  bridgeLabel: text("bridge_label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

export const localReferencesTable = pgTable("aime_local_references", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  ownerUserId: text("owner_user_id").notNull(),
  localIdentifier: text("local_identifier").notNull(),
  fingerprint: text("fingerprint"),
  filename: text("filename").notNull(),
  relativePath: text("relative_path").notNull(),
  sourceFolder: text("source_folder").notNull(),
  extension: text("extension"),
  fileType: text("file_type").notNull(),
  size: integer("size").notNull(),
  modifiedAt: timestamp("modified_at", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  linkedEntityKind: text("linked_entity_kind"),
  linkedEntityId: text("linked_entity_id"),
  linkedTimelineEventId: text("linked_timeline_event_id"),
  state: localReferenceState("state").notNull().default("linked"),
  importedFileId: uuid("imported_file_id").references(() => filesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("aime_local_ref_project_owner_localid").on(
    table.projectId,
    table.ownerUserId,
    table.localIdentifier,
  ),
]);

export const localScanJobsTable = pgTable("aime_local_scan_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  ownerUserId: text("owner_user_id").notNull(),
  folders: text("folders").array().notNull(),
  status: text("status").notNull(),
  results: jsonb("results").notNull().default(sql`'[]'::jsonb`),
  suggestions: jsonb("suggestions").notNull().default(sql`'[]'::jsonb`),
  error: text("error"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const localImportJobsTable = pgTable("aime_local_import_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  ownerUserId: text("owner_user_id").notNull(),
  localReferenceId: uuid("local_reference_id").notNull().references(() => localReferencesTable.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messagesTable = pgTable("aime_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  recipients: text("recipients").array().notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: deliveryStatus("status").notNull().default("pending"),
  providerError: text("provider_error"),
  timelineEventId: text("timeline_event_id"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdBy: text("created_by").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rsvpsTable = pgTable("aime_rsvps", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  guestId: text("guest_id").notNull(),
  token: uuid("token").notNull().defaultRandom().unique(),
  revoked: boolean("revoked").notNull().default(false),
  response: jsonb("response"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("aime_rsvp_project_guest").on(table.projectId, table.guestId)]);

export const songRequestsTable = pgTable("aime_song_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  guestId: text("guest_id").notNull(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  message: text("message"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const laboratoryFeedbackTable = pgTable("aime_laboratory_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  sequence: serial("sequence").notNull(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  authorUserId: text("author_user_id").notNull(),
  type: laboratoryFeedbackType("type").notNull(),
  status: laboratoryFeedbackStatus("status").notNull().default("nouveau"),
  message: text("message").notNull(),
  context: jsonb("context").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("aime_laboratory_feedback_sequence").on(table.sequence),
]);

export const insertProjectSchema = createInsertSchema(projectsTable);
export const insertMembershipSchema = createInsertSchema(membershipsTable);
export const insertInvitationSchema = createInsertSchema(invitationsTable);
export const insertFileSchema = createInsertSchema(filesTable);
export const insertLocalBridgeSessionSchema = createInsertSchema(localBridgeSessionsTable);
export const insertLocalPairingTokenSchema = createInsertSchema(localPairingTokensTable);
export const insertLocalReferenceSchema = createInsertSchema(localReferencesTable);
export const insertLocalScanJobSchema = createInsertSchema(localScanJobsTable);
export const insertLocalImportJobSchema = createInsertSchema(localImportJobsTable);
export const insertMessageSchema = createInsertSchema(messagesTable);
export const insertRsvpSchema = createInsertSchema(rsvpsTable);
export const insertSongRequestSchema = createInsertSchema(songRequestsTable);
export const insertLaboratoryFeedbackSchema = createInsertSchema(laboratoryFeedbackTable);

export type Project = typeof projectsTable.$inferSelect;
export type Membership = typeof membershipsTable.$inferSelect;
export type LocalBridgeSession = typeof localBridgeSessionsTable.$inferSelect;
export type LocalPairingToken = typeof localPairingTokensTable.$inferSelect;
export type LocalReference = typeof localReferencesTable.$inferSelect;
export type LocalScanJob = typeof localScanJobsTable.$inferSelect;
export type LocalImportJob = typeof localImportJobsTable.$inferSelect;
export type SongRequest = typeof songRequestsTable.$inferSelect;
export type LaboratoryFeedback = typeof laboratoryFeedbackTable.$inferSelect;
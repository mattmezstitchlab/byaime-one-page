import {
  boolean,
  check,
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const memberRole = pgEnum("aime_member_role", ["owner", "planner", "family", "viewer"]);
export const deliveryStatus = pgEnum("aime_delivery_status", ["scheduled", "pending", "sent", "failed", "cancelled"]);


export const projectsTable = pgTable("aime_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: text("owner_user_id").notNull(),
  title: text("title").notNull(),
  data: jsonb("data").notNull(),
  retentionDays: integer("retention_days").notNull().default(365),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A person, not a wedding. Clerk owns authentication; userId enforces one card. */
export const universalCardsTable = pgTable("aime_universal_cards", {
  userId: text("user_id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const membershipsTable = pgTable("aime_memberships", {
  participantOnly: boolean("participant_only").notNull().default(false),
  cardUserId: text("card_user_id").references(() => universalCardsTable.userId, { onDelete: "set null" }),
  participation: jsonb("participation"),
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  email: text("email"),
  role: memberRole("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("aime_membership_project_user").on(table.projectId, table.userId), uniqueIndex("aime_membership_id_user").on(table.id, table.userId), check("aime_membership_own_card", sql`${table.cardUserId} IS NULL OR ${table.cardUserId} = ${table.userId}`)]);

/** One functioning profile per profession, owned by the same universal person. */
export const professionalProfilesTable = pgTable("aime_professional_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  cardUserId: text("card_user_id").notNull().references(() => universalCardsTable.userId, { onDelete: "cascade" }),
  profession: text("profession").notNull(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex("aime_profile_card_profession").on(t.cardUserId, t.profession), uniqueIndex("aime_profile_id_user").on(t.id, t.cardUserId)]);

/** Dependent wedding interventions; no identity, no copies of professional defaults. */
export const professionalAssignmentsTable = pgTable("aime_professional_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  membershipId: uuid("membership_id").notNull(),
  userId: text("user_id").notNull(),
  profileId: uuid("profile_id").notNull(),
  data: jsonb("data").notNull(),
}, t => [
  foreignKey({ name: "aime_assignment_member_owner", columns: [t.membershipId, t.userId], foreignColumns: [membershipsTable.id, membershipsTable.userId] }).onDelete("cascade"),
  foreignKey({ name: "aime_assignment_profile_owner", columns: [t.profileId, t.userId], foreignColumns: [professionalProfilesTable.id, professionalProfilesTable.cardUserId] }).onDelete("cascade"),
]);

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
  /** Explicit recipient confirmed by owner/planner, not inferred from a name. */
  claimEmail: text("claim_email"),
  claimedCardUserId: text("claimed_card_user_id").references(() => universalCardsTable.userId, { onDelete: "set null" }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  guestId: text("guest_id").notNull(),
  token: uuid("token").notNull().defaultRandom().unique(),
  revoked: boolean("revoked").notNull().default(false),
  response: jsonb("response"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("aime_rsvp_project_guest").on(table.projectId, table.guestId), uniqueIndex("aime_rsvp_project_card").on(table.projectId, table.claimedCardUserId)]);

/**
 * Partie double : le lien par lequel la contrepartie d'un Moment (un
 * prestataire) contresigne le fait tel qu'il lui est montré. Même mécanique
 * que le RSVP : un jeton, pas de compte. Les réponses sont append-only et
 * portent l'empreinte du fait signé ; le Monde ne peut jamais les écrire.
 */
export const attestationLinksTable = pgTable("aime_attestation_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  eventId: text("event_id").notNull(),
  providerId: text("provider_id").notNull(),
  token: uuid("token").notNull().defaultRandom().unique(),
  revoked: boolean("revoked").notNull().default(false),
  createdBy: text("created_by").notNull(),
  /** Adresse personnelle confirmée par l'organisateur pour ce prestataire — jamais déduite d'un contact. */
  claimEmail: text("claim_email"),
  /** La Carte à laquelle la contrepartie a rattaché ses Moments de ce Monde. */
  claimedCardUserId: text("claimed_card_user_id").references(() => universalCardsTable.userId, { onDelete: "set null" }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("aime_attestation_project_event_provider").on(table.projectId, table.eventId, table.providerId)]);

export const attestationsTable = pgTable("aime_attestations", {
  id: uuid("id").primaryKey().defaultRandom(),
  linkId: uuid("link_id").notNull().references(() => attestationLinksTable.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  eventId: text("event_id").notNull(),
  providerId: text("provider_id").notNull(),
  status: text("status").notNull(),
  hash: text("hash").notNull(),
  amountCents: integer("amount_cents").notNull(),
  time: timestamp("time", { withTimezone: true }).notNull(),
  note: text("note"),
  respondedAt: timestamp("responded_at", { withTimezone: true }).notNull().defaultNow(),
});

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


export const insertProjectSchema = createInsertSchema(projectsTable);
export const insertMembershipSchema = createInsertSchema(membershipsTable);
export const insertInvitationSchema = createInsertSchema(invitationsTable);
export const insertFileSchema = createInsertSchema(filesTable);
export const insertMessageSchema = createInsertSchema(messagesTable);
export const insertRsvpSchema = createInsertSchema(rsvpsTable);
export const insertSongRequestSchema = createInsertSchema(songRequestsTable);

export type Project = typeof projectsTable.$inferSelect;
export type Membership = typeof membershipsTable.$inferSelect;
export type SongRequest = typeof songRequestsTable.$inferSelect;
export type AttestationLink = typeof attestationLinksTable.$inferSelect;
export type AttestationRow = typeof attestationsTable.$inferSelect;

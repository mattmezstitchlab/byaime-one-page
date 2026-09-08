import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
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
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  guestId: text("guest_id").notNull(),
  token: uuid("token").notNull().defaultRandom().unique(),
  revoked: boolean("revoked").notNull().default(false),
  response: jsonb("response"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("aime_rsvp_project_guest").on(table.projectId, table.guestId)]);

export const insertProjectSchema = createInsertSchema(projectsTable);
export const insertMembershipSchema = createInsertSchema(membershipsTable);
export const insertInvitationSchema = createInsertSchema(invitationsTable);
export const insertFileSchema = createInsertSchema(filesTable);
export const insertMessageSchema = createInsertSchema(messagesTable);
export const insertRsvpSchema = createInsertSchema(rsvpsTable);

export type Project = typeof projectsTable.$inferSelect;
export type Membership = typeof membershipsTable.$inferSelect;
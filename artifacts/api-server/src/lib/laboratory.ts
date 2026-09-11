import { z } from "zod";

export const laboratoryFeedbackTypes = [
  "bug",
  "remarque",
  "suggestion",
  "idee",
  "question",
  "positif",
  "ux",
  "contenu_donnees",
] as const;

export const laboratoryFeedbackStatuses = [
  "nouveau",
  "en_cours",
  "a_verifier",
  "resolu",
  "archive",
] as const;

export const laboratoryContextSchema = z.object({
  projectId: z.string().uuid().optional(),
  role: z.enum(["owner", "planner", "family", "viewer"]).optional(),
  route: z.enum(["profile", "world", "laboratory"]).optional(),
  path: z.string().max(120).optional(),
  source: z.string().trim().min(1).max(60).optional(),
  view: z.string().trim().min(1).max(40).optional(),
  phase: z.string().trim().min(1).max(24).optional(),
  panel: z.string().trim().min(1).max(40).optional(),
  auditView: z.string().trim().min(1).max(24).optional(),
  syncStatus: z.string().trim().min(1).max(24).optional(),
  momentId: z.string().trim().min(1).max(120).optional(),
  momentTitle: z.string().trim().min(1).max(200).optional(),
  entityKind: z.string().trim().min(1).max(40).optional(),
  entityId: z.string().trim().min(1).max(120).optional(),
  entityLabel: z.string().trim().min(1).max(200).optional(),
  narrative: z.string().trim().min(1).max(320).optional(),
}).strict();

export const createLaboratoryFeedbackInput = z.object({
  type: z.enum(laboratoryFeedbackTypes),
  message: z.string().trim().min(3).max(4000),
  context: laboratoryContextSchema.default({}),
});

export const updateLaboratoryFeedbackInput = z.object({
  status: z.enum(laboratoryFeedbackStatuses),
});

export const listLaboratoryFeedbackQuery = z.object({
  type: z.enum(laboratoryFeedbackTypes).optional(),
  status: z.enum(laboratoryFeedbackStatuses).optional(),
});

export function formatLaboratoryId(sequence: number): string {
  return `LAB-${String(sequence).padStart(6, "0")}`;
}

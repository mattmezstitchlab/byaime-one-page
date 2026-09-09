"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listLaboratoryFeedbackQuery = exports.updateLaboratoryFeedbackInput = exports.createLaboratoryFeedbackInput = exports.laboratoryContextSchema = exports.laboratoryFeedbackStatuses = exports.laboratoryFeedbackTypes = void 0;
exports.formatLaboratoryId = formatLaboratoryId;
var zod_1 = require("zod");
exports.laboratoryFeedbackTypes = [
    "bug",
    "remarque",
    "suggestion",
    "idee",
    "question",
    "positif",
    "ux",
    "contenu_donnees",
];
exports.laboratoryFeedbackStatuses = [
    "nouveau",
    "en_cours",
    "a_verifier",
    "resolu",
    "archive",
];
exports.laboratoryContextSchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid().optional(),
    role: zod_1.z.enum(["owner", "planner", "family", "viewer"]).optional(),
    route: zod_1.z.enum(["profile", "world", "network", "laboratory"]).optional(),
    path: zod_1.z.string().max(120).optional(),
    source: zod_1.z.string().trim().min(1).max(60).optional(),
    view: zod_1.z.string().trim().min(1).max(40).optional(),
    phase: zod_1.z.string().trim().min(1).max(24).optional(),
    panel: zod_1.z.string().trim().min(1).max(40).optional(),
    auditView: zod_1.z.string().trim().min(1).max(24).optional(),
    syncStatus: zod_1.z.string().trim().min(1).max(24).optional(),
    momentId: zod_1.z.string().trim().min(1).max(120).optional(),
    momentTitle: zod_1.z.string().trim().min(1).max(200).optional(),
    entityKind: zod_1.z.string().trim().min(1).max(40).optional(),
    entityId: zod_1.z.string().trim().min(1).max(120).optional(),
    entityLabel: zod_1.z.string().trim().min(1).max(200).optional(),
    narrative: zod_1.z.string().trim().min(1).max(320).optional(),
}).strict();
exports.createLaboratoryFeedbackInput = zod_1.z.object({
    type: zod_1.z.enum(exports.laboratoryFeedbackTypes),
    message: zod_1.z.string().trim().min(3).max(4000),
    context: exports.laboratoryContextSchema.default({}),
});
exports.updateLaboratoryFeedbackInput = zod_1.z.object({
    status: zod_1.z.enum(exports.laboratoryFeedbackStatuses),
});
exports.listLaboratoryFeedbackQuery = zod_1.z.object({
    type: zod_1.z.enum(exports.laboratoryFeedbackTypes).optional(),
    status: zod_1.z.enum(exports.laboratoryFeedbackStatuses).optional(),
});
function formatLaboratoryId(sequence) {
    return "LAB-".concat(String(sequence).padStart(6, "0"));
}
//# sourceMappingURL=laboratory.js.map
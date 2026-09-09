"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var node_crypto_1 = require("node:crypto");
var node_stream_1 = require("node:stream");
var express_2 = require("@clerk/express");
var drizzle_orm_1 = require("drizzle-orm");
var db_1 = require("@workspace/db");
var zod_1 = require("zod");
var objectStorage_1 = require("../lib/objectStorage");
var permissions_1 = require("../lib/permissions");
var participantProjection_1 = require("../lib/participantProjection");
var publicProfile_1 = require("../lib/publicProfile");
var weddingBrief_1 = require("../lib/weddingBrief");
var profileFil_1 = require("../lib/profileFil");
var laboratory_1 = require("../lib/laboratory");
var projectDataPolicy_1 = require("../lib/projectDataPolicy");
var providerResponse_1 = require("../lib/providerResponse");
var e2eTestServices_1 = require("../lib/e2eTestServices");
var security_1 = require("../lib/security");
var logger_1 = require("../lib/logger");
var networkProjection_1 = require("../lib/networkProjection");
var aimeLocalScan_1 = require("../lib/aimeLocalScan");
var resend_1 = require("../lib/resend");
var router = (0, express_1.Router)();
var storage = new objectStorage_1.ObjectStorageService();
var roles = ["owner", "planner", "family", "viewer"];
var editableRoles = new Set(["owner", "planner", "family"]);
var managedRoles = new Set(["owner", "planner"]);
var allowedTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
]);
var MAX_FILE_SIZE = 25 * 1024 * 1024;
var UPLOAD_TOKEN_TTL_MS = 15 * 60 * 1000;
var PAIRING_TOKEN_TTL_MS = 10 * 60 * 1000;
var BRIDGE_SESSION_TTL_MS = 6 * 60 * 60 * 1000;
var uuid = zod_1.z.string().uuid();
var laboratoryReadRateLimit = (0, security_1.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 120,
    key: function (req) { var _a; return "laboratory-read:".concat((_a = (0, permissions_1.authenticatedUserId)((0, express_2.getAuth)(req))) !== null && _a !== void 0 ? _a : req.ip); },
});
var laboratoryWriteRateLimit = (0, security_1.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    key: function (req) { var _a; return "laboratory-write:".concat((_a = (0, permissions_1.authenticatedUserId)((0, express_2.getAuth)(req))) !== null && _a !== void 0 ? _a : req.ip); },
});
function laboratoryFeedbackResponse(feedback, currentUserId) {
    return {
        id: feedback.id,
        labId: (0, laboratory_1.formatLaboratoryId)(feedback.sequence),
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
    return (0, node_crypto_1.createHash)("sha256").update(value).digest("hex");
}
function toLocalScanItems(value) {
    return Array.isArray(value) ? value : [];
}
function toScanSuggestions(value) {
    return Array.isArray(value) ? value : [];
}
function scanJobFromRow(job) {
    var _a, _b;
    return {
        id: job.id,
        projectId: job.projectId,
        ownerUserId: job.ownerUserId,
        folders: job.folders,
        createdAt: job.createdAt.toISOString(),
        status: job.status,
        completedAt: (_a = job.completedAt) === null || _a === void 0 ? void 0 : _a.toISOString(),
        results: toLocalScanItems(job.results),
        suggestions: toScanSuggestions(job.suggestions),
        error: (_b = job.error) !== null && _b !== void 0 ? _b : undefined,
    };
}
function importJobFromRow(job) {
    var _a;
    return {
        id: job.id,
        projectId: job.projectId,
        ownerUserId: job.ownerUserId,
        localReferenceId: job.localReferenceId,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        error: (_a = job.error) !== null && _a !== void 0 ? _a : undefined,
    };
}
function consumePairingToken(token) {
    return __awaiter(this, void 0, void 0, function () {
        var now, pairing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    now = new Date();
                    return [4 /*yield*/, db_1.db
                            .update(db_1.localPairingTokensTable)
                            .set({ consumedAt: now })
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localPairingTokensTable.tokenHash, hashedToken(token)), (0, drizzle_orm_1.isNull)(db_1.localPairingTokensTable.consumedAt), (0, drizzle_orm_1.gt)(db_1.localPairingTokensTable.expiresAt, now)))
                            .returning()];
                case 1:
                    pairing = (_a.sent())[0];
                    return [2 /*return*/, pairing];
            }
        });
    });
}
function nextQueuedScanJob(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var job;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.localScanJobsTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localScanJobsTable.ownerUserId, userId), (0, drizzle_orm_1.eq)(db_1.localScanJobsTable.status, "queued")))
                        .orderBy((0, drizzle_orm_1.asc)(db_1.localScanJobsTable.createdAt))
                        .limit(1)];
                case 1:
                    job = (_a.sent())[0];
                    return [2 /*return*/, job ? scanJobFromRow(job) : undefined];
            }
        });
    });
}
function nextQueuedImportJob(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var job;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.localImportJobsTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localImportJobsTable.ownerUserId, userId), (0, drizzle_orm_1.eq)(db_1.localImportJobsTable.status, "queued")))
                        .orderBy((0, drizzle_orm_1.asc)(db_1.localImportJobsTable.createdAt))
                        .limit(1)];
                case 1:
                    job = (_a.sent())[0];
                    return [2 /*return*/, job ? importJobFromRow(job) : undefined];
            }
        });
    });
}
function authorizeCron(req, res) {
    var secret = process.env.CRON_SECRET;
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
var localWebRateLimit = (0, security_1.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 180,
    key: function (req) { return "aime-local-web:".concat(req.ip, ":").concat(req.path); },
});
var localBridgeRateLimit = (0, security_1.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 600,
    key: function (req) { return "aime-local-bridge:".concat(req.ip, ":").concat(req.path); },
});
function shouldSimulateProviderFailure(req) {
    return (process.env.NODE_ENV !== "production" &&
        process.env.AIME_E2E_RUN === "1" &&
        req.get("x-aime-e2e-provider") === "failure");
}
function sendEmail(path, body) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if ((0, e2eTestServices_1.isE2ETestServicesEnabled)())
                return [2 /*return*/, (0, e2eTestServices_1.sendE2ETestEmail)()];
            if (path !== "/emails")
                throw new Error("Unsupported Resend path: ".concat(path));
            return [2 /*return*/, (0, resend_1.sendResendEmail)(JSON.parse(body))];
        });
    });
}
function deliverMessage(message_1) {
    return __awaiter(this, arguments, void 0, function (message, simulateProviderFailure) {
        var providerResponse, sent, error_1, providerError, failed;
        if (simulateProviderFailure === void 0) { simulateProviderFailure = false; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 5]);
                    if (simulateProviderFailure) {
                        throw new Error("Échec fournisseur simulé pour le scénario E2E");
                    }
                    return [4 /*yield*/, sendEmail("/emails", JSON.stringify({
                            from: "AIME <onboarding@resend.dev>",
                            to: message.recipients,
                            subject: message.subject,
                            html: "<div>".concat(escapeHtml(message.body).replaceAll("\n", "<br>"), "</div>"),
                        }))];
                case 1:
                    providerResponse = _a.sent();
                    (0, providerResponse_1.assertProviderAccepted)(providerResponse, "le message");
                    return [4 /*yield*/, db_1.db
                            .update(db_1.messagesTable)
                            .set({ status: "sent", sentAt: new Date(), providerError: null })
                            .where((0, drizzle_orm_1.eq)(db_1.messagesTable.id, message.id))
                            .returning()];
                case 2:
                    sent = (_a.sent())[0];
                    return [2 /*return*/, { message: sent, error: undefined }];
                case 3:
                    error_1 = _a.sent();
                    providerError = error_1 instanceof Error ? error_1.message : "Erreur Resend";
                    return [4 /*yield*/, db_1.db
                            .update(db_1.messagesTable)
                            .set({ status: "failed", providerError: providerError })
                            .where((0, drizzle_orm_1.eq)(db_1.messagesTable.id, message.id))
                            .returning()];
                case 4:
                    failed = (_a.sent())[0];
                    return [2 /*return*/, { message: failed, error: providerError }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function deliverScheduledMessages() {
    return __awaiter(this, void 0, void 0, function () {
        var dueMessages, _i, dueMessages_1, message, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db_1.db
                        .update(db_1.messagesTable)
                        .set({ status: "pending" })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.messagesTable.status, "scheduled"), (0, drizzle_orm_1.lte)(db_1.messagesTable.scheduledAt, new Date())))
                        .returning()];
                case 1:
                    dueMessages = _a.sent();
                    _i = 0, dueMessages_1 = dueMessages;
                    _a.label = 2;
                case 2:
                    if (!(_i < dueMessages_1.length)) return [3 /*break*/, 5];
                    message = dueMessages_1[_i];
                    return [4 /*yield*/, deliverMessage(message)];
                case 3:
                    result = _a.sent();
                    if (result.error) {
                        logger_1.logger.warn({ messageId: message.id, projectId: message.projectId, providerError: result.error }, "Scheduled email provider failure recorded");
                    }
                    else {
                        logger_1.logger.info({ messageId: message.id, projectId: message.projectId }, "Scheduled email delivered");
                    }
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
            }
        });
    });
}
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
    var scheduledDeliveryTimer = setInterval(function () {
        void deliverScheduledMessages().catch(function (error) {
            logger_1.logger.warn({ error: error }, "Scheduled email sweep failed");
        });
    }, 30000);
    (_a = scheduledDeliveryTimer.unref) === null || _a === void 0 ? void 0 : _a.call(scheduledDeliveryTimer);
}
router.get("/cron/scheduled-messages", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!authorizeCron(req, res))
                    return [2 /*return*/];
                return [4 /*yield*/, deliverScheduledMessages()];
            case 1:
                _a.sent();
                res.json({ ok: true });
                return [2 /*return*/];
        }
    });
}); });
var projectInput = zod_1.z.object({
    title: zod_1.z.string().trim().min(1).max(160),
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
var projectUpdate = projectInput.extend({ updatedAt: zod_1.z.string().datetime() });
var inviteInput = zod_1.z.object({
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(roles).exclude(["owner"]),
});
var fileInput = zod_1.z.object({
    projectId: zod_1.z.string().uuid(),
    name: zod_1.z.string().trim().min(1).max(240),
    contentType: zod_1.z.string(),
    size: zod_1.z.number().int().positive().max(MAX_FILE_SIZE),
});
var fileFinalize = fileInput.extend({
    objectPath: zod_1.z.string().regex(/^\/objects\/uploads\/[a-f0-9-]+$/i),
    finalizeToken: zod_1.z.string().min(32).max(4096),
});
var messageInput = zod_1.z.object({
    kind: zod_1.z.enum([
        "invitation",
        "rsvp_reminder",
        "practical_info",
        "provider_follow_up",
        "thank_you",
        "event_change",
    ]),
    recipients: zod_1.z.array(zod_1.z.string().email()).min(1).max(100),
    subject: zod_1.z.string().trim().min(1).max(200),
    body: zod_1.z.string().trim().min(1).max(20000),
    confirmed: zod_1.z.literal(true),
    timelineEventId: zod_1.z.string().trim().min(1).max(200).optional(),
    scheduledAt: zod_1.z.string().datetime().optional(),
});
var messageScheduleInput = zod_1.z.object({
    scheduledAt: zod_1.z.string().datetime(),
});
var rsvpInput = zod_1.z.object({
    status: zod_1.z.enum(["confirmed", "declined"]),
    attendance: zod_1.z.object({
        ceremony: zod_1.z.boolean(),
        cocktail: zod_1.z.boolean(),
        dinner: zod_1.z.boolean(),
        brunch: zod_1.z.boolean(),
    }),
    dietary: zod_1.z.string().max(1000).optional(),
    plusOne: zod_1.z.boolean(),
    notes: zod_1.z.string().max(2000).optional(),
});
var participantUploadInput = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(240),
    contentType: zod_1.z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4"]),
    size: zod_1.z.number().int().positive().max(MAX_FILE_SIZE),
});
var participantMediaFinalize = participantUploadInput.extend({
    objectPath: zod_1.z.string().regex(/^\/objects\/uploads\/[a-f0-9-]+$/i),
    finalizeToken: zod_1.z.string().min(32).max(4096),
    caption: zod_1.z.string().trim().max(1000).optional(),
    visibility: zod_1.z.enum(["couple", "guests"]),
    consent: zod_1.z.literal(true),
});
var songRequestInput = zod_1.z.object({
    title: zod_1.z.string().trim().min(1).max(200),
    artist: zod_1.z.string().trim().min(1).max(200),
    message: zod_1.z.string().trim().max(1000).optional(),
});
var localPairingTokenInput = zod_1.z.object({
    bridgeLabel: zod_1.z.string().trim().min(1).max(120).optional(),
});
var localPairInput = zod_1.z.object({
    token: zod_1.z.string().min(24).max(256),
    bridgeId: zod_1.z.string().trim().min(8).max(240),
    bridgeVersion: zod_1.z.string().trim().min(1).max(80).optional(),
});
var localBridgeSessionInput = zod_1.z.object({
    sessionToken: zod_1.z.string().min(32).max(256),
});
var localAuthorizedFoldersInput = zod_1.z.object({
    folders: zod_1.z.array(zod_1.z.string().trim().min(1).max(240)).max(30),
});
var localScanRequestInput = zod_1.z.object({
    folders: zod_1.z.array(zod_1.z.string().trim().min(1).max(240)).max(30).optional(),
});
var localScanItemSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(240),
    extension: zod_1.z.string().trim().max(20).default(""),
    fileType: zod_1.z.string().trim().min(1).max(40),
    documentType: zod_1.z.string().trim().max(40).optional(),
    size: zod_1.z.number().int().nonnegative(),
    modifiedAt: zod_1.z.string().datetime(),
    relativePath: zod_1.z.string().trim().min(1).max(600),
    sourceFolder: zod_1.z.string().trim().min(1).max(240),
    localIdentifier: zod_1.z.string().trim().min(16).max(256),
    fingerprint: zod_1.z.string().trim().max(256).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    entities: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
var localScanResultInput = zod_1.z.object({
    sessionToken: zod_1.z.string().min(32).max(256),
    results: zod_1.z.array(localScanItemSchema).max(20000),
    error: zod_1.z.string().trim().max(500).optional(),
});
var localReferenceCreateInput = zod_1.z.object({
    localIdentifier: zod_1.z.string().trim().min(16).max(256),
    fingerprint: zod_1.z.string().trim().max(256).optional(),
    filename: zod_1.z.string().trim().min(1).max(240),
    relativePath: zod_1.z.string().trim().min(1).max(600),
    sourceFolder: zod_1.z.string().trim().min(1).max(240),
    extension: zod_1.z.string().trim().max(20).optional(),
    fileType: zod_1.z.string().trim().min(1).max(40),
    size: zod_1.z.number().int().nonnegative(),
    modifiedAt: zod_1.z.string().datetime(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    linkedEntityKind: zod_1.z.string().trim().max(80).optional(),
    linkedEntityId: zod_1.z.string().trim().max(160).optional(),
    linkedTimelineEventId: zod_1.z.string().trim().max(160).optional(),
});
var localReferenceStateInput = zod_1.z.object({
    state: zod_1.z.enum(["local", "linked", "imported", "ignored"]),
});
var bridgeImportFinalizeInput = zod_1.z.object({
    sessionToken: zod_1.z.string().min(32).max(256),
    objectPath: zod_1.z.string().regex(/^\/objects\/uploads\/[a-f0-9-]+$/i),
    finalizeToken: zod_1.z.string().min(32).max(4096),
    projectId: zod_1.z.string().uuid(),
    localReferenceId: zod_1.z.string().uuid(),
    name: zod_1.z.string().trim().min(1).max(240),
    contentType: zod_1.z.string().trim().min(1).max(140),
    size: zod_1.z.number().int().positive().max(MAX_FILE_SIZE),
});
function activeRsvp(token) {
    return __awaiter(this, void 0, void 0, function () {
        var link;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!uuid.safeParse(token).success)
                        return [2 /*return*/, undefined];
                    return [4 /*yield*/, db_1.db
                            .select({
                            id: db_1.rsvpsTable.id,
                            projectId: db_1.rsvpsTable.projectId,
                            guestId: db_1.rsvpsTable.guestId,
                            token: db_1.rsvpsTable.token,
                            revoked: db_1.rsvpsTable.revoked,
                        })
                            .from(db_1.rsvpsTable)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.rsvpsTable.token, token), (0, drizzle_orm_1.eq)(db_1.rsvpsTable.revoked, false)))];
                case 1:
                    link = (_a.sent())[0];
                    return [2 /*return*/, link];
            }
        });
    });
}
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, function (character) {
        return ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;",
        })[character];
    });
}
function uploadSecret() {
    var secret = process.env.SESSION_SECRET;
    if (!secret)
        throw new Error("SESSION_SECRET is required for upload finalization");
    return secret;
}
function auth(req, res, next) {
    var value = (0, express_2.getAuth)(req);
    var userId = (0, permissions_1.authenticatedUserId)(value);
    if (!userId) {
        res.status(401).json({ error: "Authentification requise" });
        return;
    }
    req.userId = userId;
    next();
}
function membership(projectId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var member;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.membershipsTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.membershipsTable.projectId, projectId), (0, drizzle_orm_1.eq)(db_1.membershipsTable.userId, userId)))];
                case 1:
                    member = (_a.sent())[0];
                    return [2 /*return*/, member];
            }
        });
    });
}
function ensureBridgeSessionToken(input) {
    return { sessionTokenHash: (0, security_1.signUploadAuthorization)({ token: input }, uploadSecret()) };
}
function activeBridgeSessionByToken(sessionToken) {
    return __awaiter(this, void 0, void 0, function () {
        var sessionTokenHash, session;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sessionTokenHash = ensureBridgeSessionToken(sessionToken).sessionTokenHash;
                    return [4 /*yield*/, db_1.db
                            .select()
                            .from(db_1.localBridgeSessionsTable)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localBridgeSessionsTable.sessionTokenHash, sessionTokenHash), (0, drizzle_orm_1.isNull)(db_1.localBridgeSessionsTable.revokedAt)))];
                case 1:
                    session = (_a.sent())[0];
                    if (!session)
                        return [2 /*return*/, undefined];
                    if (session.expiresAt.getTime() <= Date.now())
                        return [2 /*return*/, undefined];
                    return [2 /*return*/, session];
            }
        });
    });
}
function authorizeBridgeOrigin(req, res) {
    var origin = req.get("origin");
    if (origin && !/^https?:\/\/localhost(?::\d+)?$/.test(origin) && !/^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)) {
        res.status(403).json({ error: "Origine locale requise" });
        return false;
    }
    return true;
}
function isSafeRelativePath(value) {
    if (!value || value.startsWith("/") || value.startsWith("\\"))
        return false;
    var unix = value.replaceAll("\\", "/");
    return !unix.split("/").some(function (segment) { return segment === ".."; });
}
router.param("id", function (req, res, next, value) {
    if (!uuid.safeParse(String(value)).success) {
        res.status(404).json({ error: "Ressource introuvable" });
        return;
    }
    next();
});
router.get("/public/profiles/:id", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, project, profile;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                projectId = zod_1.z.string().uuid().safeParse(String(req.params.id));
                if (!projectId.success) {
                    res.status(404).json({ error: "Profil public introuvable" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select({
                        id: db_1.projectsTable.id,
                        title: db_1.projectsTable.title,
                        data: db_1.projectsTable.data,
                    })
                        .from(db_1.projectsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, projectId.data))];
            case 1:
                project = (_a.sent())[0];
                profile = project ? (0, publicProfile_1.projectToPublicProfile)(project) : null;
                if (!profile) {
                    res.status(404).json({ error: "Profil public introuvable" });
                    return [2 /*return*/];
                }
                res.json(profile);
                return [2 /*return*/];
        }
    });
}); });
function parseBody(schema, req, res) {
    var result = schema.safeParse(req.body);
    if (!result.success) {
        res
            .status(400)
            .json({ error: "Données invalides", details: result.error.flatten() });
        return;
    }
    return result.data;
}
router.get("/network/subjects", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_1.db
                    .select({
                    id: db_1.projectsTable.id,
                    title: db_1.projectsTable.title,
                    data: db_1.projectsTable.data,
                    role: db_1.membershipsTable.role,
                })
                    .from(db_1.membershipsTable)
                    .innerJoin(db_1.projectsTable, (0, drizzle_orm_1.eq)(db_1.projectsTable.id, db_1.membershipsTable.projectId))
                    .where((0, drizzle_orm_1.eq)(db_1.membershipsTable.userId, req.userId))];
            case 1:
                rows = _a.sent();
                res.setHeader("Cache-Control", "private, no-store");
                res.json((0, networkProjection_1.buildNetworkProjection)(rows));
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rows;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_1.db
                    .select({ project: db_1.projectsTable, role: db_1.membershipsTable.role })
                    .from(db_1.membershipsTable)
                    .innerJoin(db_1.projectsTable, (0, drizzle_orm_1.eq)(db_1.projectsTable.id, db_1.membershipsTable.projectId))
                    .where((0, drizzle_orm_1.eq)(db_1.membershipsTable.userId, req.userId))];
            case 1:
                rows = _a.sent();
                res.json(rows.map(function (_a) {
                    var project = _a.project, role = _a.role;
                    return (__assign(__assign({}, project), { data: (0, projectDataPolicy_1.projectDataForRole)(project.data, role), role: role }));
                }));
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/brief", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var member, project;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, membership(String(req.params.id), req.userId)];
            case 1:
                member = _a.sent();
                if (!member) {
                    res.status(404).json({ error: "Monde introuvable" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select({
                        id: db_1.projectsTable.id,
                        title: db_1.projectsTable.title,
                        data: db_1.projectsTable.data,
                    })
                        .from(db_1.projectsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, String(req.params.id)))];
            case 2:
                project = (_a.sent())[0];
                if (!project) {
                    res.status(404).json({ error: "Monde introuvable" });
                    return [2 /*return*/];
                }
                res.json((0, weddingBrief_1.buildAuthorizedWeddingBrief)({
                    projectId: project.id,
                    title: project.title,
                    data: project.data,
                    role: member.role,
                    useWorldLocation: false,
                }));
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/fil", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var member, project;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, membership(String(req.params.id), req.userId)];
            case 1:
                member = _a.sent();
                if (!member) {
                    res.status(404).json({ error: "Monde introuvable" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select({
                        id: db_1.projectsTable.id,
                        title: db_1.projectsTable.title,
                        data: db_1.projectsTable.data,
                    })
                        .from(db_1.projectsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, String(req.params.id)))];
            case 2:
                project = (_a.sent())[0];
                if (!project) {
                    res.status(404).json({ error: "Monde introuvable" });
                    return [2 /*return*/];
                }
                res.setHeader("Cache-Control", "private, no-store");
                res.json((0, profileFil_1.buildAuthorizedProfileFil)({
                    projectId: project.id,
                    title: project.title,
                    data: project.data,
                    role: member.role,
                }));
                return [2 /*return*/];
        }
    });
}); });
router.post("/projects/:id/brief/nearby", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var consent, member, project;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                consent = parseBody(zod_1.z.object({ consent: zod_1.z.literal(true) }), req, res);
                if (!consent)
                    return [2 /*return*/];
                return [4 /*yield*/, membership(String(req.params.id), req.userId)];
            case 1:
                member = _a.sent();
                if (!member) {
                    res.status(404).json({ error: "Monde introuvable" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select({
                        id: db_1.projectsTable.id,
                        title: db_1.projectsTable.title,
                        data: db_1.projectsTable.data,
                    })
                        .from(db_1.projectsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, String(req.params.id)))];
            case 2:
                project = (_a.sent())[0];
                if (!project) {
                    res.status(404).json({ error: "Monde introuvable" });
                    return [2 /*return*/];
                }
                res.json((0, weddingBrief_1.buildAuthorizedWeddingBrief)({
                    projectId: project.id,
                    title: project.title,
                    data: project.data,
                    role: member.role,
                    useWorldLocation: true,
                }));
                return [2 /*return*/];
        }
    });
}); });
router.get("/account/export", auth, (0, security_1.createRateLimit)({
    windowMs: 60 * 60 * 1000,
    max: 5,
    key: function (req) { return "account-export:".concat(req.userId); },
}), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, ownedProjects, collaborations, uploadedFiles, sentMessages, sentInvitations;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = req.userId;
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.projectsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.projectsTable.ownerUserId, userId))];
            case 1:
                ownedProjects = _a.sent();
                return [4 /*yield*/, db_1.db
                        .select({
                        projectId: db_1.membershipsTable.projectId,
                        role: db_1.membershipsTable.role,
                        email: db_1.membershipsTable.email,
                        createdAt: db_1.membershipsTable.createdAt,
                    })
                        .from(db_1.membershipsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.membershipsTable.userId, userId))];
            case 2:
                collaborations = _a.sent();
                return [4 /*yield*/, db_1.db
                        .select({
                        id: db_1.filesTable.id,
                        projectId: db_1.filesTable.projectId,
                        name: db_1.filesTable.name,
                        contentType: db_1.filesTable.contentType,
                        size: db_1.filesTable.size,
                        createdAt: db_1.filesTable.createdAt,
                    })
                        .from(db_1.filesTable)
                        .where((0, drizzle_orm_1.eq)(db_1.filesTable.uploaderUserId, userId))];
            case 3:
                uploadedFiles = _a.sent();
                return [4 /*yield*/, db_1.db
                        .select({
                        id: db_1.messagesTable.id,
                        projectId: db_1.messagesTable.projectId,
                        kind: db_1.messagesTable.kind,
                        recipients: db_1.messagesTable.recipients,
                        subject: db_1.messagesTable.subject,
                        body: db_1.messagesTable.body,
                        status: db_1.messagesTable.status,
                        sentAt: db_1.messagesTable.sentAt,
                        createdAt: db_1.messagesTable.createdAt,
                    })
                        .from(db_1.messagesTable)
                        .where((0, drizzle_orm_1.eq)(db_1.messagesTable.createdBy, userId))];
            case 4:
                sentMessages = _a.sent();
                return [4 /*yield*/, db_1.db
                        .select({
                        id: db_1.invitationsTable.id,
                        projectId: db_1.invitationsTable.projectId,
                        email: db_1.invitationsTable.email,
                        role: db_1.invitationsTable.role,
                        acceptedAt: db_1.invitationsTable.acceptedAt,
                        revokedAt: db_1.invitationsTable.revokedAt,
                        createdAt: db_1.invitationsTable.createdAt,
                    })
                        .from(db_1.invitationsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.invitationsTable.invitedBy, userId))];
            case 5:
                sentInvitations = _a.sent();
                res.setHeader("Content-Disposition", 'attachment; filename="mes-donnees-aime.json"');
                res.setHeader("Cache-Control", "no-store");
                res.json({
                    format: "aime-personal-export",
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    ownedProjects: ownedProjects,
                    collaborations: collaborations,
                    uploadedFiles: uploadedFiles,
                    sentMessages: sentMessages,
                    sentInvitations: sentInvitations,
                });
                return [2 /*return*/];
        }
    });
}); });
router.delete("/account", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, ownedProjects, ownedFiles, userUploadedFiles, objectPaths, deletionResults, failedObjects, error_2;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (((_a = req.body) === null || _a === void 0 ? void 0 : _a.confirmation) !== "SUPPRIMER MON COMPTE") {
                    res
                        .status(400)
                        .json({ error: "Confirmation SUPPRIMER MON COMPTE requise" });
                    return [2 /*return*/];
                }
                userId = req.userId;
                return [4 /*yield*/, db_1.db
                        .select({ id: db_1.projectsTable.id })
                        .from(db_1.projectsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.projectsTable.ownerUserId, userId))];
            case 1:
                ownedProjects = _b.sent();
                return [4 /*yield*/, Promise.all(ownedProjects.map(function (_a) {
                        var id = _a.id;
                        return db_1.db.select().from(db_1.filesTable).where((0, drizzle_orm_1.eq)(db_1.filesTable.projectId, id));
                    }))];
            case 2:
                ownedFiles = (_b.sent()).flat();
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.filesTable)
                        .where((0, drizzle_orm_1.eq)(db_1.filesTable.uploaderUserId, userId))];
            case 3:
                userUploadedFiles = _b.sent();
                objectPaths = __spreadArray([], new Set(__spreadArray(__spreadArray([], ownedFiles, true), userUploadedFiles, true).map(function (_a) {
                    var objectPath = _a.objectPath;
                    return objectPath;
                })), true);
                return [4 /*yield*/, Promise.allSettled(objectPaths.map(function (objectPath) { return __awaiter(void 0, void 0, void 0, function () {
                        var error_3;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 3, , 4]);
                                    return [4 /*yield*/, storage.getObjectEntityFile(objectPath)];
                                case 1: return [4 /*yield*/, (_a.sent()).delete()];
                                case 2:
                                    _a.sent();
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_3 = _a.sent();
                                    if (!(error_3 instanceof objectStorage_1.ObjectNotFoundError))
                                        throw error_3;
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 4:
                deletionResults = _b.sent();
                failedObjects = deletionResults.filter(function (result) { return result.status === "rejected"; });
                if (failedObjects.length > 0) {
                    req.log.error({ userId: userId, failedObjects: failedObjects.length }, "Account deletion stopped before database removal");
                    res.status(503).json({
                        error: "Certains documents n’ont pas pu être supprimés. Le compte a été conservé afin de réessayer sans perdre leur trace.",
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db.transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, tx.delete(db_1.filesTable).where((0, drizzle_orm_1.eq)(db_1.filesTable.uploaderUserId, userId))];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, tx.delete(db_1.messagesTable).where((0, drizzle_orm_1.eq)(db_1.messagesTable.createdBy, userId))];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, tx
                                            .delete(db_1.invitationsTable)
                                            .where((0, drizzle_orm_1.eq)(db_1.invitationsTable.invitedBy, userId))];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, tx
                                            .delete(db_1.projectsTable)
                                            .where((0, drizzle_orm_1.eq)(db_1.projectsTable.ownerUserId, userId))];
                                case 4:
                                    _a.sent();
                                    return [4 /*yield*/, tx
                                            .delete(db_1.membershipsTable)
                                            .where((0, drizzle_orm_1.eq)(db_1.membershipsTable.userId, userId))];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6:
                _b.trys.push([6, 8, , 9]);
                return [4 /*yield*/, express_2.clerkClient.users.deleteUser(userId)];
            case 7:
                _b.sent();
                return [3 /*break*/, 9];
            case 8:
                error_2 = _b.sent();
                req.log.error({ error: error_2, userId: userId }, "Clerk account deletion failed after application data cleanup");
                res.status(502).json({
                    error: "Les données AIME ont été supprimées, mais la fermeture de la connexion doit être relancée.",
                });
                return [2 /*return*/];
            case 9:
                res.sendStatus(204);
                return [2 /*return*/];
        }
    });
}); });
router.post("/projects", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, project;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                input = parseBody(projectInput, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, db_1.db.transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var created;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, tx
                                        .insert(db_1.projectsTable)
                                        .values(__assign(__assign({}, input), { ownerUserId: req.userId }))
                                        .returning()];
                                case 1:
                                    created = _a.sent();
                                    return [4 /*yield*/, tx.insert(db_1.membershipsTable).values({
                                            projectId: created[0].id,
                                            userId: req.userId,
                                            role: "owner",
                                        })];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/, created];
                            }
                        });
                    }); })];
            case 1:
                project = (_a.sent())[0];
                res.status(201).json(__assign(__assign({}, project), { role: "owner" }));
                return [2 /*return*/];
        }
    });
}); });
router.put("/projects/:id", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, member, current, currentPublished, nextPublished, nextData, updated;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                input = parseBody(projectUpdate, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, membership(String(req.params.id), req.userId)];
            case 1:
                member = _c.sent();
                if (!member) {
                    res.status(404).json({ error: "Projet introuvable" });
                    return [2 /*return*/];
                }
                if (!editableRoles.has(member.role)) {
                    res.status(403).json({ error: "Permission de modification refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.projectsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, String(req.params.id)))];
            case 2:
                current = (_c.sent())[0];
                if (!current) {
                    res.status(404).json({ error: "Projet introuvable" });
                    return [2 /*return*/];
                }
                currentPublished = Boolean((_b = (_a = current.data) === null || _a === void 0 ? void 0 : _a.publicProfile) === null || _b === void 0 ? void 0 : _b.published);
                nextPublished = Boolean(input.data.publicProfile &&
                    input.data.publicProfile.published);
                if (member.role !== "owner" && currentPublished !== nextPublished) {
                    res
                        .status(403)
                        .json({ error: "Seul le propriétaire peut modifier la publication" });
                    return [2 /*return*/];
                }
                if (current.updatedAt.toISOString() !== input.updatedAt) {
                    res.status(409).json({
                        error: "Le projet a été modifié ailleurs",
                        project: __assign(__assign({}, current), { data: (0, projectDataPolicy_1.projectDataForRole)(current.data, member.role) }),
                    });
                    return [2 /*return*/];
                }
                nextData = (0, projectDataPolicy_1.mergeProtectedProjectData)(current.data, input.data, member.role);
                return [4 /*yield*/, db_1.db
                        .update(db_1.projectsTable)
                        .set({ title: input.title, data: nextData, updatedAt: new Date() })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.projectsTable.id, current.id), (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["date_trunc('milliseconds', ", ") = ", ""], ["date_trunc('milliseconds', ", ") = ", ""])), db_1.projectsTable.updatedAt, current.updatedAt)))
                        .returning()];
            case 3:
                updated = (_c.sent())[0];
                if (!updated) {
                    res.status(409).json({ error: "Conflit de version" });
                    return [2 /*return*/];
                }
                res.json(__assign(__assign({}, updated), { data: (0, projectDataPolicy_1.projectDataForRole)(updated.data, member.role), role: member.role }));
                return [2 /*return*/];
        }
    });
}); });
router.delete("/projects/:id", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var member, files, deletionResults, failedObjects;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (((_a = req.body) === null || _a === void 0 ? void 0 : _a.confirmation) !== "SUPPRIMER") {
                    res.status(400).json({ error: "Confirmation SUPPRIMER requise" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, membership(String(req.params.id), req.userId)];
            case 1:
                member = _b.sent();
                if ((member === null || member === void 0 ? void 0 : member.role) !== "owner") {
                    res.status(403).json({ error: "Seul le propriétaire peut supprimer" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.filesTable)
                        .where((0, drizzle_orm_1.eq)(db_1.filesTable.projectId, String(req.params.id)))];
            case 2:
                files = _b.sent();
                return [4 /*yield*/, Promise.allSettled(files.map(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                        var error_4;
                        var objectPath = _b.objectPath;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _c.trys.push([0, 3, , 4]);
                                    return [4 /*yield*/, storage.getObjectEntityFile(objectPath)];
                                case 1: return [4 /*yield*/, (_c.sent()).delete()];
                                case 2:
                                    _c.sent();
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_4 = _c.sent();
                                    if (!(error_4 instanceof objectStorage_1.ObjectNotFoundError))
                                        throw error_4;
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 3:
                deletionResults = _b.sent();
                failedObjects = deletionResults.filter(function (result) { return result.status === "rejected"; });
                if (failedObjects.length > 0) {
                    req.log.error({ projectId: req.params.id, failedObjects: failedObjects.length }, "Project deletion stopped before database removal");
                    res.status(503).json({
                        error: "Certains documents n’ont pas pu être supprimés. Le Monde a été conservé afin de réessayer sans perdre sa trace.",
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .delete(db_1.projectsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, String(req.params.id)))];
            case 4:
                _b.sent();
                res.sendStatus(204);
                return [2 /*return*/];
        }
    });
}); });
router.patch("/projects/:id/privacy", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, member, project;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                input = parseBody(zod_1.z.object({ retentionDays: zod_1.z.number().int().min(30).max(3650) }), req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, membership(String(req.params.id), req.userId)];
            case 1:
                member = _a.sent();
                if ((member === null || member === void 0 ? void 0 : member.role) !== "owner") {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .update(db_1.projectsTable)
                        .set({ retentionDays: input.retentionDays, updatedAt: new Date() })
                        .where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, String(req.params.id)))
                        .returning()];
            case 2:
                project = (_a.sent())[0];
                res.json(project);
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/export", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var member, project;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, membership(String(req.params.id), req.userId)];
            case 1:
                member = _a.sent();
                if (!member) {
                    res.status(404).json({ error: "Projet introuvable" });
                    return [2 /*return*/];
                }
                if (!(0, permissions_1.can)(member.role, "delete")) {
                    res.status(403).json({
                        error: "Seul le propriétaire peut exporter toutes les données du Monde",
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.projectsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, String(req.params.id)))];
            case 2:
                project = (_a.sent())[0];
                res.setHeader("Content-Disposition", "attachment; filename=\"aime-".concat(project.id, ".json\""));
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
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/members", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var member, members, invitations, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, membership(String(req.params.id), req.userId)];
            case 1:
                member = _b.sent();
                if (!member) {
                    res.status(404).json({ error: "Projet introuvable" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.membershipsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.membershipsTable.projectId, String(req.params.id)))];
            case 2:
                members = _b.sent();
                if (!managedRoles.has(member.role)) return [3 /*break*/, 4];
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.invitationsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.invitationsTable.projectId, String(req.params.id)))];
            case 3:
                _a = _b.sent();
                return [3 /*break*/, 5];
            case 4:
                _a = [];
                _b.label = 5;
            case 5:
                invitations = _a;
                res.json({ members: members, invitations: invitations });
                return [2 /*return*/];
        }
    });
}); });
router.post("/projects/:id/invitations", auth, (0, security_1.createRateLimit)({
    windowMs: 60 * 60 * 1000,
    max: 30,
    key: function (req) { return "invite:".concat(req.userId); },
}), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, projectId, member, invitation, link, providerResponse, error_5;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                input = parseBody(inviteInput, req, res);
                if (!input)
                    return [2 /*return*/];
                projectId = String(req.params.id);
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                member = _b.sent();
                if (!managedRoles.has((_a = member === null || member === void 0 ? void 0 : member.role) !== null && _a !== void 0 ? _a : "")) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .insert(db_1.invitationsTable)
                        .values(__assign(__assign({ projectId: projectId }, input), { invitedBy: req.userId }))
                        .returning()];
            case 2:
                invitation = (_b.sent())[0];
                link = "".concat((0, security_1.configuredAppOrigin)({
                    appUrl: process.env.APP_URL,
                    req: req,
                    environment: process.env.NODE_ENV,
                }), "/invite/").concat(invitation.token);
                _b.label = 3;
            case 3:
                _b.trys.push([3, 5, , 7]);
                return [4 /*yield*/, sendEmail("/emails", JSON.stringify({
                        from: "AIME <onboarding@resend.dev>",
                        to: [input.email],
                        subject: "Invitation à votre espace mariage AIME",
                        html: "<p>Vous \u00EAtes invit\u00E9\u00B7e \u00E0 collaborer sur un mariage dans AIME.</p><p><a href=\"".concat(link, "\">Accepter l'invitation</a></p>"),
                    }))];
            case 4:
                providerResponse = _b.sent();
                (0, providerResponse_1.assertProviderAccepted)(providerResponse, "l’invitation");
                return [3 /*break*/, 7];
            case 5:
                error_5 = _b.sent();
                return [4 /*yield*/, db_1.db
                        .delete(db_1.invitationsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.invitationsTable.id, invitation.id))];
            case 6:
                _b.sent();
                res.status(502).json({
                    error: "Invitation non envoy\u00E9e: ".concat(error_5 instanceof Error ? error_5.message : "erreur Resend"),
                });
                return [2 /*return*/];
            case 7:
                res.status(201).json(invitation);
                return [2 /*return*/];
        }
    });
}); });
router.post("/invitations/:token/accept", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var invite, user, verifiedEmails;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!uuid.safeParse(String(req.params.token)).success) {
                    res.status(404).json({ error: "Invitation invalide ou révoquée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.invitationsTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.invitationsTable.token, String(req.params.token)), (0, drizzle_orm_1.isNull)(db_1.invitationsTable.revokedAt), (0, drizzle_orm_1.isNull)(db_1.invitationsTable.acceptedAt)))];
            case 1:
                invite = (_a.sent())[0];
                if (!invite) {
                    res.status(404).json({ error: "Invitation invalide ou révoquée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, express_2.clerkClient.users.getUser(req.userId)];
            case 2:
                user = _a.sent();
                verifiedEmails = user.emailAddresses
                    .filter(function (_a) {
                    var verification = _a.verification;
                    return (verification === null || verification === void 0 ? void 0 : verification.status) === "verified";
                })
                    .map(function (_a) {
                    var emailAddress = _a.emailAddress;
                    return emailAddress.trim().toLowerCase();
                });
                if (!verifiedEmails.includes(invite.email.trim().toLowerCase())) {
                    res.status(403).json({
                        error: "Cette invitation est destinée à une autre adresse e-mail",
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db.transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, tx
                                        .insert(db_1.membershipsTable)
                                        .values({
                                        projectId: invite.projectId,
                                        userId: req.userId,
                                        email: invite.email,
                                        role: invite.role,
                                    })
                                        .onConflictDoNothing()];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, tx
                                            .update(db_1.invitationsTable)
                                            .set({ acceptedAt: new Date() })
                                            .where((0, drizzle_orm_1.eq)(db_1.invitationsTable.id, invite.id))];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 3:
                _a.sent();
                res.json({ projectId: invite.projectId });
                return [2 /*return*/];
        }
    });
}); });
router.delete("/invitations/:id", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var invite, _a;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, db_1.db
                    .select()
                    .from(db_1.invitationsTable)
                    .where((0, drizzle_orm_1.eq)(db_1.invitationsTable.id, String(req.params.id)))];
            case 1:
                invite = (_c.sent())[0];
                _a = !invite;
                if (_a) return [3 /*break*/, 3];
                return [4 /*yield*/, membership(invite.projectId, req.userId)];
            case 2:
                _a = ((_b = (_c.sent())) === null || _b === void 0 ? void 0 : _b.role) !== "owner";
                _c.label = 3;
            case 3:
                if (_a) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .update(db_1.invitationsTable)
                        .set({ revokedAt: new Date() })
                        .where((0, drizzle_orm_1.eq)(db_1.invitationsTable.id, invite.id))];
            case 4:
                _c.sent();
                res.sendStatus(204);
                return [2 /*return*/];
        }
    });
}); });
router.post("/storage/uploads/request-url", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, member, uploadURL, objectPath, finalizeToken;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                input = parseBody(fileInput, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, membership(input.projectId, req.userId)];
            case 1:
                member = _b.sent();
                if (!managedRoles.has((_a = member === null || member === void 0 ? void 0 : member.role) !== null && _a !== void 0 ? _a : "")) {
                    res.status(403).json({ error: "Permission d'envoi refusée" });
                    return [2 /*return*/];
                }
                if (!allowedTypes.has(input.contentType)) {
                    res.status(415).json({ error: "Type de fichier non autorisé" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, storage.getObjectEntityUploadURL()];
            case 2:
                uploadURL = _b.sent();
                objectPath = storage.normalizeObjectEntityPath(uploadURL.split("?")[0]);
                finalizeToken = (0, security_1.signUploadAuthorization)(__assign(__assign({}, input), { objectPath: objectPath, userId: req.userId, expiresAt: Date.now() + UPLOAD_TOKEN_TTL_MS }), uploadSecret());
                res.json({ uploadURL: uploadURL, objectPath: objectPath, finalizeToken: finalizeToken });
                return [2 /*return*/];
        }
    });
}); });
router.post("/storage/files", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, member, finalizeToken, file, path, storedFile;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                input = parseBody(fileFinalize, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, membership(input.projectId, req.userId)];
            case 1:
                member = _b.sent();
                if (!managedRoles.has((_a = member === null || member === void 0 ? void 0 : member.role) !== null && _a !== void 0 ? _a : "")) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                finalizeToken = input.finalizeToken, file = __rest(input, ["finalizeToken"]);
                if (!(0, security_1.verifyUploadAuthorization)(finalizeToken, __assign(__assign({}, file), { userId: req.userId }), uploadSecret())) {
                    res
                        .status(403)
                        .json({ error: "Autorisation de finalisation invalide ou expirée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, storage.trySetObjectEntityAclPolicy(input.objectPath, {
                        owner: req.userId,
                        visibility: "private",
                    })];
            case 2:
                path = _b.sent();
                return [4 /*yield*/, db_1.db
                        .insert(db_1.filesTable)
                        .values(__assign(__assign({}, file), { objectPath: path, uploaderUserId: req.userId }))
                        .returning()];
            case 3:
                storedFile = (_b.sent())[0];
                res.status(201).json(storedFile);
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/files", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, member, _a, _b;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                projectId = String(req.params.id);
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                member = _d.sent();
                if (!managedRoles.has((_c = member === null || member === void 0 ? void 0 : member.role) !== null && _c !== void 0 ? _c : "")) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                _b = (_a = res).json;
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.filesTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.filesTable.projectId, projectId), (0, drizzle_orm_1.isNull)(db_1.filesTable.guestId)))];
            case 2:
                _b.apply(_a, [_d.sent()]);
                return [2 /*return*/];
        }
    });
}); });
router.get("/storage/files/:id", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var meta, member, _a, response, _b, _c;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0: return [4 /*yield*/, db_1.db
                    .select()
                    .from(db_1.filesTable)
                    .where((0, drizzle_orm_1.eq)(db_1.filesTable.id, String(req.params.id)))];
            case 1:
                meta = (_e.sent())[0];
                _a = meta;
                if (!_a) return [3 /*break*/, 3];
                return [4 /*yield*/, membership(meta.projectId, req.userId)];
            case 2:
                _a = (_e.sent());
                _e.label = 3;
            case 3:
                member = _a;
                if (!meta || !managedRoles.has((_d = member === null || member === void 0 ? void 0 : member.role) !== null && _d !== void 0 ? _d : "")) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                _c = (_b = storage).downloadObject;
                return [4 /*yield*/, storage.getObjectEntityFile(meta.objectPath)];
            case 4: return [4 /*yield*/, _c.apply(_b, [_e.sent(), 0])];
            case 5:
                response = _e.sent();
                response.headers.forEach(function (value, key) { return res.setHeader(key, value); });
                res.setHeader("X-Content-Type-Options", "nosniff");
                res.setHeader("Cache-Control", "private, no-store");
                if (meta.guestId) {
                    res.setHeader("Content-Type", meta.contentType);
                    res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
                    res.setHeader("Content-Disposition", "attachment; filename=\"".concat((0, security_1.safeDownloadName)(meta.name), "\"; filename*=UTF-8''").concat(encodeURIComponent(meta.name)));
                }
                if (req.query.download === "1")
                    res.setHeader("Content-Disposition", "attachment; filename=\"".concat((0, security_1.safeDownloadName)(meta.name), "\"; filename*=UTF-8''").concat(encodeURIComponent(meta.name)));
                if (response.body)
                    node_stream_1.Readable.fromWeb(response.body).pipe(res);
                return [2 /*return*/];
        }
    });
}); });
router.delete("/storage/files/:id", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var meta, member, _a;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, db_1.db
                    .select()
                    .from(db_1.filesTable)
                    .where((0, drizzle_orm_1.eq)(db_1.filesTable.id, String(req.params.id)))];
            case 1:
                meta = (_c.sent())[0];
                _a = meta;
                if (!_a) return [3 /*break*/, 3];
                return [4 /*yield*/, membership(meta.projectId, req.userId)];
            case 2:
                _a = (_c.sent());
                _c.label = 3;
            case 3:
                member = _a;
                if (!meta || !managedRoles.has((_b = member === null || member === void 0 ? void 0 : member.role) !== null && _b !== void 0 ? _b : "")) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, storage.getObjectEntityFile(meta.objectPath)];
            case 4: return [4 /*yield*/, (_c.sent()).delete()];
            case 5:
                _c.sent();
                return [4 /*yield*/, db_1.db.delete(db_1.filesTable).where((0, drizzle_orm_1.eq)(db_1.filesTable.id, meta.id))];
            case 6:
                _c.sent();
                res.sendStatus(204);
                return [2 /*return*/];
        }
    });
}); });
router.post("/projects/:id/messages", auth, (0, security_1.createRateLimit)({
    windowMs: 60 * 60 * 1000,
    max: 30,
    key: function (req) { return "message:".concat(req.userId); },
}), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, projectId, member, message, result;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                input = parseBody(messageInput, req, res);
                if (!input)
                    return [2 /*return*/];
                projectId = String(req.params.id);
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                member = _b.sent();
                if (!managedRoles.has((_a = member === null || member === void 0 ? void 0 : member.role) !== null && _a !== void 0 ? _a : "")) {
                    res.status(403).json({ error: "Permission d'envoi refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .insert(db_1.messagesTable)
                        .values({
                        projectId: projectId,
                        kind: input.kind,
                        recipients: input.recipients,
                        subject: input.subject,
                        body: input.body,
                        timelineEventId: input.timelineEventId,
                        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
                        createdBy: req.userId,
                        status: input.scheduledAt && new Date(input.scheduledAt) > new Date() ? "scheduled" : "pending",
                    })
                        .returning()];
            case 2:
                message = (_b.sent())[0];
                if (message.status === "scheduled") {
                    req.log.info({ messageId: message.id, projectId: projectId, scheduledAt: message.scheduledAt }, "Email scheduled");
                    res.status(201).json(message);
                    return [2 /*return*/];
                }
                return [4 /*yield*/, deliverMessage(message, shouldSimulateProviderFailure(req))];
            case 3:
                result = _b.sent();
                if (result.error) {
                    req.log.warn({ messageId: message.id, projectId: projectId, status: result.message.status, providerError: result.error }, "Email provider failure recorded");
                    res.status(502).json(result.message);
                    return [2 /*return*/];
                }
                req.log.info({ messageId: message.id, projectId: projectId, status: result.message.status }, "Email delivery recorded");
                res.status(201).json(result.message);
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/messages", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, member, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                projectId = String(req.params.id);
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                member = _c.sent();
                if (!member) {
                    res.status(404).json({ error: "Projet introuvable" });
                    return [2 /*return*/];
                }
                if (!managedRoles.has(member.role)) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, deliverScheduledMessages()];
            case 2:
                _c.sent();
                _b = (_a = res).json;
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.messagesTable)
                        .where((0, drizzle_orm_1.eq)(db_1.messagesTable.projectId, projectId))];
            case 3:
                _b.apply(_a, [_c.sent()]);
                return [2 /*return*/];
        }
    });
}); });
router.patch("/projects/:id/messages/:messageId", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, messageId, parsed, scheduledAt, member, message, updated;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                projectId = String(req.params.id);
                messageId = String(req.params.messageId);
                parsed = messageScheduleInput.safeParse(req.body);
                if (!parsed.success) {
                    res.status(400).json({ error: parsed.error.message });
                    return [2 /*return*/];
                }
                scheduledAt = new Date(parsed.data.scheduledAt);
                if (scheduledAt <= new Date()) {
                    res.status(400).json({ error: "La nouvelle date doit être dans le futur" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                member = _b.sent();
                if (!managedRoles.has((_a = member === null || member === void 0 ? void 0 : member.role) !== null && _a !== void 0 ? _a : "")) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.messagesTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.messagesTable.id, messageId), (0, drizzle_orm_1.eq)(db_1.messagesTable.projectId, projectId)))];
            case 2:
                message = (_b.sent())[0];
                if (!message) {
                    res.status(404).json({ error: "Message introuvable" });
                    return [2 /*return*/];
                }
                if (message.status !== "scheduled") {
                    res.status(409).json({ error: "Seul un rappel programmé peut être replanifié" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .update(db_1.messagesTable)
                        .set({ scheduledAt: scheduledAt, providerError: null })
                        .where((0, drizzle_orm_1.eq)(db_1.messagesTable.id, messageId))
                        .returning()];
            case 3:
                updated = (_b.sent())[0];
                res.json(updated);
                return [2 /*return*/];
        }
    });
}); });
router.post("/projects/:id/messages/:messageId", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, messageId, member, message, cancelled;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                projectId = String(req.params.id);
                messageId = String(req.params.messageId);
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                member = _b.sent();
                if (!managedRoles.has((_a = member === null || member === void 0 ? void 0 : member.role) !== null && _a !== void 0 ? _a : "")) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.messagesTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.messagesTable.id, messageId), (0, drizzle_orm_1.eq)(db_1.messagesTable.projectId, projectId)))];
            case 2:
                message = (_b.sent())[0];
                if (!message) {
                    res.status(404).json({ error: "Message introuvable" });
                    return [2 /*return*/];
                }
                if (message.status !== "scheduled") {
                    res.status(409).json({ error: "Seul un rappel programmé peut être annulé" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .update(db_1.messagesTable)
                        .set({ status: "cancelled", cancelledAt: new Date() })
                        .where((0, drizzle_orm_1.eq)(db_1.messagesTable.id, messageId))
                        .returning()];
            case 3:
                cancelled = (_b.sent())[0];
                res.json(cancelled);
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/laboratory-feedback", laboratoryReadRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, member, filters, conditions, feedback;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                projectId = String(req.params.id);
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                member = _a.sent();
                if (!member) {
                    res.status(404).json({ error: "Monde introuvable" });
                    return [2 /*return*/];
                }
                filters = laboratory_1.listLaboratoryFeedbackQuery.safeParse(req.query);
                if (!filters.success) {
                    res.status(400).json({ error: "Filtres invalides", details: filters.error.flatten() });
                    return [2 /*return*/];
                }
                conditions = [
                    (0, drizzle_orm_1.eq)(db_1.laboratoryFeedbackTable.projectId, projectId),
                    filters.data.type ? (0, drizzle_orm_1.eq)(db_1.laboratoryFeedbackTable.type, filters.data.type) : undefined,
                    filters.data.status ? (0, drizzle_orm_1.eq)(db_1.laboratoryFeedbackTable.status, filters.data.status) : undefined,
                    managedRoles.has(member.role) ? undefined : (0, drizzle_orm_1.eq)(db_1.laboratoryFeedbackTable.authorUserId, req.userId),
                ].filter(Boolean);
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.laboratoryFeedbackTable)
                        .where(drizzle_orm_1.and.apply(void 0, conditions))
                        .orderBy((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["", " desc"], ["", " desc"])), db_1.laboratoryFeedbackTable.sequence))];
            case 2:
                feedback = _a.sent();
                res.setHeader("Cache-Control", "private, no-store");
                res.json(feedback.map(function (item) { return laboratoryFeedbackResponse(item, req.userId); }));
                return [2 /*return*/];
        }
    });
}); });
router.post("/projects/:id/laboratory-feedback", laboratoryWriteRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, member, input, feedback;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                projectId = String(req.params.id);
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                member = _a.sent();
                if (!member) {
                    res.status(404).json({ error: "Monde introuvable" });
                    return [2 /*return*/];
                }
                input = parseBody(laboratory_1.createLaboratoryFeedbackInput, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, db_1.db
                        .insert(db_1.laboratoryFeedbackTable)
                        .values({
                        projectId: projectId,
                        authorUserId: req.userId,
                        type: input.type,
                        status: "nouveau",
                        message: input.message,
                        context: __assign(__assign({}, input.context), { projectId: projectId, role: member.role }),
                    })
                        .returning()];
            case 2:
                feedback = (_a.sent())[0];
                res.status(201).json(laboratoryFeedbackResponse(feedback, req.userId));
                return [2 /*return*/];
        }
    });
}); });
router.patch("/projects/:id/laboratory-feedback/:feedbackId", laboratoryWriteRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, member, input, feedback;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                projectId = String(req.params.id);
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                member = _b.sent();
                if (!managedRoles.has((_a = member === null || member === void 0 ? void 0 : member.role) !== null && _a !== void 0 ? _a : "")) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                input = parseBody(laboratory_1.updateLaboratoryFeedbackInput, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, db_1.db
                        .update(db_1.laboratoryFeedbackTable)
                        .set({ status: input.status, updatedAt: new Date() })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.laboratoryFeedbackTable.id, String(req.params.feedbackId)), (0, drizzle_orm_1.eq)(db_1.laboratoryFeedbackTable.projectId, projectId)))
                        .returning()];
            case 2:
                feedback = (_b.sent())[0];
                if (!feedback) {
                    res.status(404).json({ error: "Retour Laboratoire introuvable" });
                    return [2 /*return*/];
                }
                res.json(laboratoryFeedbackResponse(feedback, req.userId));
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/rsvp-links", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, links;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = managedRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_e.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.rsvpsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.rsvpsTable.projectId, projectId))];
            case 2:
                links = _e.sent();
                res.json(links);
                return [2 /*return*/];
        }
    });
}); });
router.post("/projects/:id/rsvp-links/:guestId", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, project, guests, link;
    var _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = managedRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_f.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select({ data: db_1.projectsTable.data })
                        .from(db_1.projectsTable)
                        .where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, projectId))];
            case 2:
                project = (_f.sent())[0];
                guests = Array.isArray((_e = project === null || project === void 0 ? void 0 : project.data) === null || _e === void 0 ? void 0 : _e.guests)
                    ? project.data.guests
                    : [];
                if (!guests.some(function (guest) { return guest.id === String(req.params.guestId); })) {
                    res.status(404).json({ error: "Invité introuvable dans ce Monde" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .insert(db_1.rsvpsTable)
                        .values({ projectId: projectId, guestId: String(req.params.guestId) })
                        .onConflictDoUpdate({
                        target: [db_1.rsvpsTable.projectId, db_1.rsvpsTable.guestId],
                        set: { revoked: false, token: (0, node_crypto_1.randomUUID)() },
                    })
                        .returning()];
            case 3:
                link = (_f.sent())[0];
                res.status(201).json(link);
                return [2 /*return*/];
        }
    });
}); });
router.delete("/projects/:id/rsvp-links/:guestId", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, updated;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = managedRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_e.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .update(db_1.rsvpsTable)
                        .set({ revoked: true })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.rsvpsTable.projectId, projectId), (0, drizzle_orm_1.eq)(db_1.rsvpsTable.guestId, String(req.params.guestId))))
                        .returning()];
            case 2:
                updated = (_e.sent())[0];
                if (!updated) {
                    res.status(404).json({ error: "Lien RSVP introuvable" });
                    return [2 /*return*/];
                }
                res.sendStatus(204);
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/participant-media", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, media, project;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = managedRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_e.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db.select({
                        id: db_1.filesTable.id, guestId: db_1.filesTable.guestId, name: db_1.filesTable.name,
                        contentType: db_1.filesTable.contentType, size: db_1.filesTable.size, caption: db_1.filesTable.caption,
                        consent: db_1.filesTable.consent, visibility: db_1.filesTable.visibility,
                        moderationStatus: db_1.filesTable.moderationStatus, createdAt: db_1.filesTable.createdAt,
                    }).from(db_1.filesTable).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.filesTable.projectId, projectId), (0, drizzle_orm_1.isNotNull)(db_1.filesTable.guestId)))];
            case 2:
                media = _e.sent();
                return [4 /*yield*/, db_1.db.select({ data: db_1.projectsTable.data }).from(db_1.projectsTable).where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, projectId))];
            case 3:
                project = (_e.sent())[0];
                res.json(media.map(function (item) { return (__assign(__assign({}, item), { guestName: (0, participantProjection_1.participantNameById)(project === null || project === void 0 ? void 0 : project.data, item.guestId) })); }));
                return [2 /*return*/];
        }
    });
}); });
router.patch("/projects/:id/participant-media/:mediaId", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, projectId, _a, _b, existing, media;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                input = parseBody(zod_1.z.object({ status: zod_1.z.enum(["pending", "approved", "rejected"]) }), req, res);
                if (!input)
                    return [2 /*return*/];
                projectId = String(req.params.id);
                _b = (_a = managedRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_e.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db.select({
                        id: db_1.filesTable.id,
                        consent: db_1.filesTable.consent,
                    }).from(db_1.filesTable).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.filesTable.id, String(req.params.mediaId)), (0, drizzle_orm_1.eq)(db_1.filesTable.projectId, projectId), (0, drizzle_orm_1.isNotNull)(db_1.filesTable.guestId)))];
            case 2:
                existing = (_e.sent())[0];
                if (!existing) {
                    res.status(404).json({ error: "Média introuvable" });
                    return [2 /*return*/];
                }
                if (input.status === "approved" && !existing.consent) {
                    res.status(409).json({ error: "Ce média ne peut pas être partagé sans consentement" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db.update(db_1.filesTable).set({ moderationStatus: input.status })
                        .where((0, drizzle_orm_1.eq)(db_1.filesTable.id, existing.id))
                        .returning()];
            case 3:
                media = (_e.sent())[0];
                res.json(media);
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/song-requests", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, project, requests;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = managedRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_e.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db.select({ data: db_1.projectsTable.data }).from(db_1.projectsTable).where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, projectId))];
            case 2:
                project = (_e.sent())[0];
                return [4 /*yield*/, db_1.db.select().from(db_1.songRequestsTable).where((0, drizzle_orm_1.eq)(db_1.songRequestsTable.projectId, projectId))];
            case 3:
                requests = _e.sent();
                res.json(requests.map(function (request) { return (__assign(__assign({}, request), { guestName: (0, participantProjection_1.participantNameById)(project === null || project === void 0 ? void 0 : project.data, request.guestId) })); }));
                return [2 /*return*/];
        }
    });
}); });
router.patch("/projects/:id/song-requests/:requestId", auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, projectId, _a, _b, request;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                input = parseBody(zod_1.z.object({ status: zod_1.z.enum(["new", "seen", "accepted", "played", "rejected"]) }), req, res);
                if (!input)
                    return [2 /*return*/];
                projectId = String(req.params.id);
                _b = (_a = managedRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_e.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db.update(db_1.songRequestsTable)
                        .set({ status: input.status, updatedAt: new Date() })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.songRequestsTable.id, String(req.params.requestId)), (0, drizzle_orm_1.eq)(db_1.songRequestsTable.projectId, projectId)))
                        .returning()];
            case 2:
                request = (_e.sent())[0];
                if (!request) {
                    res.status(404).json({ error: "Demande musicale introuvable" });
                    return [2 /*return*/];
                }
                res.json(request);
                return [2 /*return*/];
        }
    });
}); });
router.post("/aime-local/pairing-token", localWebRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, token;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                input = parseBody(localPairingTokenInput, req, res);
                if (!input)
                    return [2 /*return*/];
                token = (0, node_crypto_1.randomUUID)().replaceAll("-", "") + (0, node_crypto_1.randomUUID)().replaceAll("-", "");
                return [4 /*yield*/, db_1.db.insert(db_1.localPairingTokensTable).values({
                        tokenHash: hashedToken(token),
                        userId: req.userId,
                        bridgeLabel: (_a = input.bridgeLabel) !== null && _a !== void 0 ? _a : null,
                        expiresAt: new Date(Date.now() + PAIRING_TOKEN_TTL_MS),
                    })];
            case 1:
                _c.sent();
                res.json({
                    token: token,
                    expiresAt: new Date(Date.now() + PAIRING_TOKEN_TTL_MS).toISOString(),
                    bridgeLabel: (_b = input.bridgeLabel) !== null && _b !== void 0 ? _b : null,
                });
                return [2 /*return*/];
        }
    });
}); });
router.post("/aime-local/bridge/pair", localBridgeRateLimit, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, pairing, sessionToken, sessionTokenHash, now, expiresAt, saved;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!authorizeBridgeOrigin(req, res))
                    return [2 /*return*/];
                input = parseBody(localPairInput, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, consumePairingToken(input.token)];
            case 1:
                pairing = _c.sent();
                if (!pairing) {
                    res.status(403).json({ error: "Code de connexion invalide ou expiré" });
                    return [2 /*return*/];
                }
                sessionToken = (0, node_crypto_1.randomUUID)().replaceAll("-", "") + (0, node_crypto_1.randomUUID)().replaceAll("-", "");
                sessionTokenHash = ensureBridgeSessionToken(sessionToken).sessionTokenHash;
                now = new Date();
                expiresAt = new Date(Date.now() + BRIDGE_SESSION_TTL_MS);
                return [4 /*yield*/, db_1.db
                        .insert(db_1.localBridgeSessionsTable)
                        .values({
                        userId: pairing.userId,
                        bridgeId: input.bridgeId,
                        bridgeVersion: (_a = input.bridgeVersion) !== null && _a !== void 0 ? _a : null,
                        bridgeLabel: null,
                        sessionTokenHash: sessionTokenHash,
                        pairedAt: now,
                        lastSeenAt: now,
                        expiresAt: expiresAt,
                    })
                        .onConflictDoUpdate({
                        target: [db_1.localBridgeSessionsTable.userId, db_1.localBridgeSessionsTable.bridgeId],
                        set: { bridgeVersion: (_b = input.bridgeVersion) !== null && _b !== void 0 ? _b : null, sessionTokenHash: sessionTokenHash, lastSeenAt: now, expiresAt: expiresAt, revokedAt: null },
                    })
                        .returning()];
            case 2:
                saved = (_c.sent())[0];
                res.status(201).json({
                    bridgeSessionId: saved.id,
                    sessionToken: sessionToken,
                    expiresAt: saved.expiresAt.toISOString(),
                    userId: saved.userId,
                });
                return [2 /*return*/];
        }
    });
}); });
router.post("/aime-local/bridge/heartbeat", localBridgeRateLimit, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, session;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                input = parseBody(localBridgeSessionInput, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, activeBridgeSessionByToken(input.sessionToken)];
            case 1:
                session = _a.sent();
                if (!session) {
                    res.status(403).json({ error: "Session bridge invalide" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .update(db_1.localBridgeSessionsTable)
                        .set({ lastSeenAt: new Date(), expiresAt: new Date(Date.now() + BRIDGE_SESSION_TTL_MS) })
                        .where((0, drizzle_orm_1.eq)(db_1.localBridgeSessionsTable.id, session.id))];
            case 2:
                _a.sent();
                res.json({ ok: true });
                return [2 /*return*/];
        }
    });
}); });
router.get("/aime-local/bridge/status", localWebRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sessions, active;
    var _a, _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0: return [4 /*yield*/, db_1.db
                    .select()
                    .from(db_1.localBridgeSessionsTable)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localBridgeSessionsTable.userId, req.userId), (0, drizzle_orm_1.isNull)(db_1.localBridgeSessionsTable.revokedAt)))];
            case 1:
                sessions = _g.sent();
                active = sessions
                    .filter(function (session) { return session.expiresAt.getTime() > Date.now(); })
                    .sort(function (a, b) { return b.lastSeenAt.getTime() - a.lastSeenAt.getTime(); })[0];
                res.json({
                    connected: Boolean(active),
                    bridgeId: (_a = active === null || active === void 0 ? void 0 : active.bridgeId) !== null && _a !== void 0 ? _a : null,
                    bridgeVersion: (_b = active === null || active === void 0 ? void 0 : active.bridgeVersion) !== null && _b !== void 0 ? _b : null,
                    lastSeenAt: (_d = (_c = active === null || active === void 0 ? void 0 : active.lastSeenAt) === null || _c === void 0 ? void 0 : _c.toISOString()) !== null && _d !== void 0 ? _d : null,
                    expiresAt: (_f = (_e = active === null || active === void 0 ? void 0 : active.expiresAt) === null || _e === void 0 ? void 0 : _e.toISOString()) !== null && _f !== void 0 ? _f : null,
                });
                return [2 /*return*/];
        }
    });
}); });
router.delete("/aime-local/bridge/status", localWebRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_1.db
                    .update(db_1.localBridgeSessionsTable)
                    .set({ revokedAt: new Date() })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localBridgeSessionsTable.userId, req.userId), (0, drizzle_orm_1.isNull)(db_1.localBridgeSessionsTable.revokedAt)))];
            case 1:
                _a.sent();
                res.sendStatus(204);
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/aime-local/folders", localWebRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, project, data, localData, folders;
    var _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = editableRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_g.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db.select({ data: db_1.projectsTable.data }).from(db_1.projectsTable).where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, projectId))];
            case 2:
                project = (_g.sent())[0];
                data = ((_e = project === null || project === void 0 ? void 0 : project.data) !== null && _e !== void 0 ? _e : {});
                localData = ((_f = data.aimeLocal) !== null && _f !== void 0 ? _f : {});
                folders = Array.isArray(localData.folders) ? localData.folders.filter(function (value) { return typeof value === "string"; }).slice(0, 30) : [];
                res.json({ folders: folders });
                return [2 /*return*/];
        }
    });
}); });
router.put("/projects/:id/aime-local/folders", localWebRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, input, project, current, next, saved, localData;
    var _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = editableRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_g.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                input = parseBody(localAuthorizedFoldersInput, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, db_1.db.select({ data: db_1.projectsTable.data }).from(db_1.projectsTable).where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, projectId))];
            case 2:
                project = (_g.sent())[0];
                if (!project) {
                    res.status(404).json({ error: "Projet introuvable" });
                    return [2 /*return*/];
                }
                current = ((_e = project.data) !== null && _e !== void 0 ? _e : {});
                next = __assign(__assign({}, current), { aimeLocal: __assign(__assign({}, ((_f = current.aimeLocal) !== null && _f !== void 0 ? _f : {})), { folders: input.folders }) });
                return [4 /*yield*/, db_1.db.update(db_1.projectsTable).set({ data: next, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, projectId)).returning()];
            case 3:
                saved = (_g.sent())[0];
                localData = saved.data.aimeLocal;
                res.json({ folders: Array.isArray(localData === null || localData === void 0 ? void 0 : localData.folders) ? localData === null || localData === void 0 ? void 0 : localData.folders : [] });
                return [2 /*return*/];
        }
    });
}); });
router.post("/projects/:id/aime-local/scan", localWebRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, input, sessions, active, project, configuredFolders, folders, id;
    var _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = editableRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_g.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                input = parseBody(localScanRequestInput, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, db_1.db.select().from(db_1.localBridgeSessionsTable).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localBridgeSessionsTable.userId, req.userId), (0, drizzle_orm_1.isNull)(db_1.localBridgeSessionsTable.revokedAt)))];
            case 2:
                sessions = _g.sent();
                active = sessions
                    .filter(function (session) { return session.expiresAt.getTime() > Date.now(); })
                    .sort(function (a, b) { return b.lastSeenAt.getTime() - a.lastSeenAt.getTime(); })[0];
                if (!active) {
                    res.status(409).json({ error: "Aucun bridge actif" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db.select({ data: db_1.projectsTable.data }).from(db_1.projectsTable).where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, projectId))];
            case 3:
                project = (_g.sent())[0];
                configuredFolders = Array.isArray(((_e = project === null || project === void 0 ? void 0 : project.data) === null || _e === void 0 ? void 0 : _e.aimeLocal) && (project === null || project === void 0 ? void 0 : project.data).aimeLocal.folders)
                    ? (project === null || project === void 0 ? void 0 : project.data).aimeLocal.folders
                    : [];
                folders = (((_f = input.folders) === null || _f === void 0 ? void 0 : _f.length) ? input.folders : configuredFolders).slice(0, 30);
                if (!folders.length) {
                    res.status(400).json({ error: "Aucun dossier autorisé configuré" });
                    return [2 /*return*/];
                }
                id = (0, node_crypto_1.randomUUID)();
                return [4 /*yield*/, db_1.db.insert(db_1.localScanJobsTable).values({
                        id: id,
                        projectId: projectId,
                        ownerUserId: req.userId,
                        folders: folders,
                        status: "queued",
                        results: [],
                        suggestions: [],
                    })];
            case 4:
                _g.sent();
                res.status(202).json({ jobId: id, status: "queued", folders: folders });
                return [2 /*return*/];
        }
    });
}); });
router.get("/aime-local/bridge/scan-jobs/next", localBridgeRateLimit, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionToken, session, queued;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                sessionToken = String((_a = req.query.sessionToken) !== null && _a !== void 0 ? _a : "");
                return [4 /*yield*/, activeBridgeSessionByToken(sessionToken)];
            case 1:
                session = _b.sent();
                if (!session) {
                    res.status(403).json({ error: "Session bridge invalide" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, nextQueuedScanJob(session.userId)];
            case 2:
                queued = _b.sent();
                if (!queued) {
                    res.json({ job: null });
                    return [2 /*return*/];
                }
                res.json({ job: { id: queued.id, projectId: queued.projectId, folders: queued.folders, createdAt: queued.createdAt } });
                return [2 /*return*/];
        }
    });
}); });
router.post("/aime-local/bridge/scan-jobs/:jobId/result", localBridgeRateLimit, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, session, jobRow, job, project, projectData, results, suggestions;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                input = parseBody(localScanResultInput, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, activeBridgeSessionByToken(input.sessionToken)];
            case 1:
                session = _b.sent();
                if (!session) {
                    res.status(403).json({ error: "Session bridge invalide" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.localScanJobsTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localScanJobsTable.id, String(req.params.jobId)), (0, drizzle_orm_1.eq)(db_1.localScanJobsTable.ownerUserId, session.userId)))];
            case 2:
                jobRow = (_b.sent())[0];
                if (!jobRow) {
                    res.status(404).json({ error: "Scan introuvable" });
                    return [2 /*return*/];
                }
                job = scanJobFromRow(jobRow);
                return [4 /*yield*/, db_1.db.select({ data: db_1.projectsTable.data }).from(db_1.projectsTable).where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, job.projectId))];
            case 3:
                project = (_b.sent())[0];
                projectData = ((_a = project === null || project === void 0 ? void 0 : project.data) !== null && _a !== void 0 ? _a : {});
                results = input.results.filter(function (item) { return isSafeRelativePath(item.relativePath); });
                suggestions = results
                    .map(function (item) {
                    var _a, _b, _c, _d, _e, _f, _g;
                    return ({
                        localIdentifier: item.localIdentifier,
                        suggestion: (0, aimeLocalScan_1.suggestForProject)({ name: item.name, documentType: (_a = item.documentType) !== null && _a !== void 0 ? _a : "autre", entities: {
                                people: [],
                                places: Array.isArray((_b = item.entities) === null || _b === void 0 ? void 0 : _b.places) ? (_c = item.entities) === null || _c === void 0 ? void 0 : _c.places : [],
                                dates: [],
                                amounts: [],
                                events: Array.isArray((_d = item.entities) === null || _d === void 0 ? void 0 : _d.events) ? (_e = item.entities) === null || _e === void 0 ? void 0 : _e.events : [],
                                resources: Array.isArray((_f = item.entities) === null || _f === void 0 ? void 0 : _f.resources) ? (_g = item.entities) === null || _g === void 0 ? void 0 : _g.resources : [],
                                organizations: [],
                            } }, projectData),
                    });
                })
                    .filter(function (row) { return Boolean(row.suggestion); })
                    .map(function (row) { return (__assign({ localIdentifier: row.localIdentifier }, row.suggestion)); });
                return [4 /*yield*/, db_1.db
                        .update(db_1.localScanJobsTable)
                        .set({
                        results: results,
                        suggestions: suggestions,
                        status: input.error ? "failed" : "done",
                        error: input.error,
                        completedAt: new Date(),
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(db_1.localScanJobsTable.id, job.id))];
            case 4:
                _b.sent();
                res.json({ ok: true, suggestions: suggestions.length });
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/aime-local/scans/latest", localWebRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, jobs, latest;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = editableRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_e.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.localScanJobsTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localScanJobsTable.ownerUserId, req.userId), (0, drizzle_orm_1.eq)(db_1.localScanJobsTable.projectId, projectId)))];
            case 2:
                jobs = _e.sent();
                latest = jobs
                    .map(scanJobFromRow)
                    .sort(function (a, b) { var _a, _b; return ((_a = b.completedAt) !== null && _a !== void 0 ? _a : b.createdAt).localeCompare((_b = a.completedAt) !== null && _b !== void 0 ? _b : a.createdAt); })[0];
                if (!latest) {
                    res.json({ job: null });
                    return [2 /*return*/];
                }
                res.json({ job: latest });
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/aime-local/references", localWebRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, rows;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = editableRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_e.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.localReferencesTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localReferencesTable.projectId, projectId), (0, drizzle_orm_1.eq)(db_1.localReferencesTable.ownerUserId, req.userId)))];
            case 2:
                rows = _e.sent();
                res.json(rows);
                return [2 /*return*/];
        }
    });
}); });
router.post("/projects/:id/aime-local/references", localWebRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, input, saved;
    var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    return __generator(this, function (_s) {
        switch (_s.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = editableRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_s.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                input = parseBody(localReferenceCreateInput, req, res);
                if (!input)
                    return [2 /*return*/];
                if (!isSafeRelativePath(input.relativePath)) {
                    res.status(400).json({ error: "Chemin local invalide" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .insert(db_1.localReferencesTable)
                        .values({
                        projectId: projectId,
                        ownerUserId: req.userId,
                        localIdentifier: input.localIdentifier,
                        fingerprint: (_e = input.fingerprint) !== null && _e !== void 0 ? _e : null,
                        filename: input.filename,
                        relativePath: input.relativePath,
                        sourceFolder: input.sourceFolder,
                        extension: (_f = input.extension) !== null && _f !== void 0 ? _f : null,
                        fileType: input.fileType,
                        size: input.size,
                        modifiedAt: new Date(input.modifiedAt),
                        metadata: (_g = input.metadata) !== null && _g !== void 0 ? _g : {},
                        linkedEntityKind: (_h = input.linkedEntityKind) !== null && _h !== void 0 ? _h : null,
                        linkedEntityId: (_j = input.linkedEntityId) !== null && _j !== void 0 ? _j : null,
                        linkedTimelineEventId: (_k = input.linkedTimelineEventId) !== null && _k !== void 0 ? _k : null,
                        state: "linked",
                    })
                        .onConflictDoUpdate({
                        target: [db_1.localReferencesTable.projectId, db_1.localReferencesTable.ownerUserId, db_1.localReferencesTable.localIdentifier],
                        set: {
                            fingerprint: (_l = input.fingerprint) !== null && _l !== void 0 ? _l : null,
                            filename: input.filename,
                            relativePath: input.relativePath,
                            sourceFolder: input.sourceFolder,
                            extension: (_m = input.extension) !== null && _m !== void 0 ? _m : null,
                            fileType: input.fileType,
                            size: input.size,
                            modifiedAt: new Date(input.modifiedAt),
                            metadata: (_o = input.metadata) !== null && _o !== void 0 ? _o : {},
                            linkedEntityKind: (_p = input.linkedEntityKind) !== null && _p !== void 0 ? _p : null,
                            linkedEntityId: (_q = input.linkedEntityId) !== null && _q !== void 0 ? _q : null,
                            linkedTimelineEventId: (_r = input.linkedTimelineEventId) !== null && _r !== void 0 ? _r : null,
                            state: "linked",
                            lastSeenAt: new Date(),
                        },
                    })
                        .returning()];
            case 2:
                saved = (_s.sent())[0];
                res.status(201).json(saved);
                return [2 /*return*/];
        }
    });
}); });
router.patch("/projects/:id/aime-local/references/:referenceId/state", localWebRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, input, saved;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = editableRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_e.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                input = parseBody(localReferenceStateInput, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, db_1.db
                        .update(db_1.localReferencesTable)
                        .set({ state: input.state, lastSeenAt: new Date() })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localReferencesTable.id, String(req.params.referenceId)), (0, drizzle_orm_1.eq)(db_1.localReferencesTable.projectId, projectId), (0, drizzle_orm_1.eq)(db_1.localReferencesTable.ownerUserId, req.userId)))
                        .returning()];
            case 2:
                saved = (_e.sent())[0];
                if (!saved) {
                    res.status(404).json({ error: "Référence locale introuvable" });
                    return [2 /*return*/];
                }
                res.json(saved);
                return [2 /*return*/];
        }
    });
}); });
router.post("/projects/:id/aime-local/references/:referenceId/import", localWebRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, reference, jobId;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = managedRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_e.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.localReferencesTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localReferencesTable.id, String(req.params.referenceId)), (0, drizzle_orm_1.eq)(db_1.localReferencesTable.projectId, projectId), (0, drizzle_orm_1.eq)(db_1.localReferencesTable.ownerUserId, req.userId)))];
            case 2:
                reference = (_e.sent())[0];
                if (!reference) {
                    res.status(404).json({ error: "Référence locale introuvable" });
                    return [2 /*return*/];
                }
                jobId = (0, node_crypto_1.randomUUID)();
                return [4 /*yield*/, db_1.db.insert(db_1.localImportJobsTable).values({
                        id: jobId,
                        projectId: projectId,
                        ownerUserId: req.userId,
                        localReferenceId: reference.id,
                        status: "queued",
                    })];
            case 3:
                _e.sent();
                res.status(202).json({ jobId: jobId, status: "queued" });
                return [2 /*return*/];
        }
    });
}); });
router.get("/projects/:id/aime-local/import-jobs/:jobId", localWebRateLimit, auth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, _a, _b, jobRow;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                projectId = String(req.params.id);
                _b = (_a = editableRoles).has;
                return [4 /*yield*/, membership(projectId, req.userId)];
            case 1:
                if (!_b.apply(_a, [(_d = (_c = (_e.sent())) === null || _c === void 0 ? void 0 : _c.role) !== null && _d !== void 0 ? _d : ""])) {
                    res.status(403).json({ error: "Permission refusée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.localImportJobsTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localImportJobsTable.id, String(req.params.jobId)), (0, drizzle_orm_1.eq)(db_1.localImportJobsTable.projectId, projectId), (0, drizzle_orm_1.eq)(db_1.localImportJobsTable.ownerUserId, req.userId)))];
            case 2:
                jobRow = (_e.sent())[0];
                if (!jobRow) {
                    res.status(404).json({ error: "Import introuvable" });
                    return [2 /*return*/];
                }
                res.json(importJobFromRow(jobRow));
                return [2 /*return*/];
        }
    });
}); });
router.get("/aime-local/bridge/import-jobs/next", localBridgeRateLimit, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionToken, session, next, reference;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                sessionToken = String((_a = req.query.sessionToken) !== null && _a !== void 0 ? _a : "");
                return [4 /*yield*/, activeBridgeSessionByToken(sessionToken)];
            case 1:
                session = _b.sent();
                if (!session) {
                    res.status(403).json({ error: "Session bridge invalide" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, nextQueuedImportJob(session.userId)];
            case 2:
                next = _b.sent();
                if (!next) {
                    res.json({ job: null });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db.select().from(db_1.localReferencesTable).where((0, drizzle_orm_1.eq)(db_1.localReferencesTable.id, next.localReferenceId))];
            case 3:
                reference = (_b.sent())[0];
                if (!!reference) return [3 /*break*/, 5];
                return [4 /*yield*/, db_1.db
                        .update(db_1.localImportJobsTable)
                        .set({
                        status: "failed",
                        error: "Référence locale introuvable",
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(db_1.localImportJobsTable.id, next.id))];
            case 4:
                _b.sent();
                res.json({ job: null });
                return [2 /*return*/];
            case 5:
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
                return [2 /*return*/];
        }
    });
}); });
router.post("/aime-local/bridge/import-jobs/:jobId/request-upload-url", localBridgeRateLimit, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, session, jobRow, job, uploadURL, objectPath, finalizeToken;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                input = parseBody(bridgeImportFinalizeInput.omit({ objectPath: true, finalizeToken: true, localReferenceId: true }), req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, activeBridgeSessionByToken(input.sessionToken)];
            case 1:
                session = _a.sent();
                if (!session) {
                    res.status(403).json({ error: "Session bridge invalide" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.localImportJobsTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localImportJobsTable.id, String(req.params.jobId)), (0, drizzle_orm_1.eq)(db_1.localImportJobsTable.ownerUserId, session.userId), (0, drizzle_orm_1.eq)(db_1.localImportJobsTable.projectId, input.projectId)))];
            case 2:
                jobRow = (_a.sent())[0];
                if (!jobRow) {
                    res.status(404).json({ error: "Import introuvable" });
                    return [2 /*return*/];
                }
                job = importJobFromRow(jobRow);
                if (!allowedTypes.has(input.contentType)) {
                    res.status(415).json({ error: "Type de fichier non autorisé" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, storage.getObjectEntityUploadURL()];
            case 3:
                uploadURL = _a.sent();
                objectPath = storage.normalizeObjectEntityPath(uploadURL.split("?")[0]);
                finalizeToken = (0, security_1.signUploadAuthorization)({
                    projectId: input.projectId,
                    name: input.name,
                    size: input.size,
                    contentType: input.contentType,
                    objectPath: objectPath,
                    userId: session.userId,
                    expiresAt: Date.now() + UPLOAD_TOKEN_TTL_MS,
                }, uploadSecret());
                return [4 /*yield*/, db_1.db
                        .update(db_1.localImportJobsTable)
                        .set({ status: "uploading", updatedAt: new Date(), error: null })
                        .where((0, drizzle_orm_1.eq)(db_1.localImportJobsTable.id, job.id))];
            case 4:
                _a.sent();
                res.json({ uploadURL: uploadURL, objectPath: objectPath, finalizeToken: finalizeToken });
                return [2 /*return*/];
        }
    });
}); });
router.post("/aime-local/bridge/import-jobs/:jobId/finalize", localBridgeRateLimit, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, session, jobRow, job, objectPath, storedFile;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                input = parseBody(bridgeImportFinalizeInput, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, activeBridgeSessionByToken(input.sessionToken)];
            case 1:
                session = _a.sent();
                if (!session) {
                    res.status(403).json({ error: "Session bridge invalide" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select()
                        .from(db_1.localImportJobsTable)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localImportJobsTable.id, String(req.params.jobId)), (0, drizzle_orm_1.eq)(db_1.localImportJobsTable.ownerUserId, session.userId), (0, drizzle_orm_1.eq)(db_1.localImportJobsTable.projectId, input.projectId), (0, drizzle_orm_1.eq)(db_1.localImportJobsTable.localReferenceId, input.localReferenceId)))];
            case 2:
                jobRow = (_a.sent())[0];
                if (!jobRow) {
                    res.status(404).json({ error: "Import introuvable" });
                    return [2 /*return*/];
                }
                job = importJobFromRow(jobRow);
                if (!(0, security_1.verifyUploadAuthorization)(input.finalizeToken, {
                    projectId: input.projectId,
                    name: input.name,
                    size: input.size,
                    contentType: input.contentType,
                    objectPath: input.objectPath,
                    userId: session.userId,
                }, uploadSecret())) {
                    res.status(403).json({ error: "Autorisation de finalisation invalide ou expirée" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, storage.trySetObjectEntityAclPolicy(input.objectPath, {
                        owner: session.userId,
                        visibility: "private",
                    })];
            case 3:
                objectPath = _a.sent();
                return [4 /*yield*/, db_1.db
                        .insert(db_1.filesTable)
                        .values({
                        projectId: input.projectId,
                        uploaderUserId: session.userId,
                        objectPath: objectPath,
                        name: input.name,
                        contentType: input.contentType,
                        size: input.size,
                    })
                        .returning()];
            case 4:
                storedFile = (_a.sent())[0];
                return [4 /*yield*/, db_1.db
                        .update(db_1.localReferencesTable)
                        .set({ state: "imported", importedFileId: storedFile.id, lastSeenAt: new Date() })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.localReferencesTable.id, input.localReferenceId), (0, drizzle_orm_1.eq)(db_1.localReferencesTable.projectId, input.projectId), (0, drizzle_orm_1.eq)(db_1.localReferencesTable.ownerUserId, session.userId)))];
            case 5:
                _a.sent();
                return [4 /*yield*/, db_1.db
                        .update(db_1.localImportJobsTable)
                        .set({ status: "done", updatedAt: new Date(), error: null })
                        .where((0, drizzle_orm_1.eq)(db_1.localImportJobsTable.id, job.id))];
            case 6:
                _a.sent();
                res.status(201).json({ file: storedFile, status: "imported" });
                return [2 /*return*/];
        }
    });
}); });
router.get("/rsvp/:token", (0, security_1.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 60,
    key: function (req) { return "rsvp-read:".concat(req.ip); },
}), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var link, songRequests, contributions;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!uuid.safeParse(String(req.params.token)).success) {
                    res.status(404).json({ error: "Lien RSVP invalide" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db
                        .select({ rsvp: db_1.rsvpsTable, project: db_1.projectsTable })
                        .from(db_1.rsvpsTable)
                        .innerJoin(db_1.projectsTable, (0, drizzle_orm_1.eq)(db_1.projectsTable.id, db_1.rsvpsTable.projectId))
                        .where((0, drizzle_orm_1.eq)(db_1.rsvpsTable.token, String(req.params.token)))];
            case 1:
                link = (_a.sent())[0];
                if (!link || link.rsvp.revoked) {
                    res.status(404).json({ error: "Lien RSVP invalide" });
                    return [2 /*return*/];
                }
                res.setHeader("Cache-Control", "no-store");
                return [4 /*yield*/, db_1.db.select({
                        id: db_1.songRequestsTable.id, title: db_1.songRequestsTable.title, artist: db_1.songRequestsTable.artist,
                        message: db_1.songRequestsTable.message, status: db_1.songRequestsTable.status, createdAt: db_1.songRequestsTable.createdAt,
                    }).from(db_1.songRequestsTable).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.songRequestsTable.projectId, link.rsvp.projectId), (0, drizzle_orm_1.eq)(db_1.songRequestsTable.guestId, link.rsvp.guestId)))];
            case 2:
                songRequests = _a.sent();
                return [4 /*yield*/, db_1.db.select({
                        id: db_1.filesTable.id,
                        guestId: db_1.filesTable.guestId,
                        name: db_1.filesTable.name,
                        contentType: db_1.filesTable.contentType,
                        size: db_1.filesTable.size,
                        caption: db_1.filesTable.caption,
                        moderationStatus: db_1.filesTable.moderationStatus,
                        visibility: db_1.filesTable.visibility,
                        createdAt: db_1.filesTable.createdAt,
                    }).from(db_1.filesTable).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.filesTable.projectId, link.rsvp.projectId), (0, drizzle_orm_1.isNotNull)(db_1.filesTable.guestId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(db_1.filesTable.guestId, link.rsvp.guestId), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.filesTable.moderationStatus, "approved"), (0, drizzle_orm_1.eq)(db_1.filesTable.visibility, "guests")))))];
            case 3:
                contributions = _a.sent();
                res.json(__assign(__assign({ projectTitle: link.project.title, response: link.rsvp.response }, (0, participantProjection_1.buildParticipantProjection)(link.project.data, link.rsvp.guestId)), { songRequests: songRequests, contributions: contributions.map(function (media) { return (__assign(__assign({}, media), { canView: media.guestId === link.rsvp.guestId ||
                            (media.moderationStatus === "approved" && media.visibility === "guests") })); }) }));
                return [2 /*return*/];
        }
    });
}); });
router.post("/rsvp/:token/media/uploads/request-url", (0, security_1.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 12,
    key: function (req) { return "rsvp-media-upload:".concat(req.ip, ":").concat(String(req.params.token)); },
}), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, link, uploadURL, objectPath, finalizeToken;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                input = parseBody(participantUploadInput, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, activeRsvp(String(req.params.token))];
            case 1:
                link = _a.sent();
                if (!link) {
                    res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, storage.getObjectEntityUploadURL()];
            case 2:
                uploadURL = _a.sent();
                objectPath = storage.normalizeObjectEntityPath(uploadURL.split("?")[0]);
                finalizeToken = (0, security_1.signUploadAuthorization)(__assign(__assign({}, input), { objectPath: objectPath, projectId: link.projectId, guestId: link.guestId, rsvpId: link.id, expiresAt: Date.now() + UPLOAD_TOKEN_TTL_MS }), uploadSecret());
                res.setHeader("Cache-Control", "no-store");
                res.json({ uploadURL: uploadURL, objectPath: objectPath, finalizeToken: finalizeToken });
                return [2 /*return*/];
        }
    });
}); });
router.post("/rsvp/:token/media", (0, security_1.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 12,
    key: function (req) { return "rsvp-media-finalize:".concat(req.ip, ":").concat(String(req.params.token)); },
}), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, link, finalizeToken, visibility, caption, consent, uploaded, uploadedObject, metadata, error_6, path, media;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                input = parseBody(participantMediaFinalize, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, activeRsvp(String(req.params.token))];
            case 1:
                link = _a.sent();
                if (!link) {
                    res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
                    return [2 /*return*/];
                }
                finalizeToken = input.finalizeToken, visibility = input.visibility, caption = input.caption, consent = input.consent, uploaded = __rest(input, ["finalizeToken", "visibility", "caption", "consent"]);
                if (!(0, security_1.verifyUploadAuthorization)(finalizeToken, __assign(__assign({}, uploaded), { projectId: link.projectId, guestId: link.guestId, rsvpId: link.id }), uploadSecret())) {
                    res.status(403).json({ error: "Autorisation de finalisation invalide ou expirée" });
                    return [2 /*return*/];
                }
                _a.label = 2;
            case 2:
                _a.trys.push([2, 7, , 8]);
                return [4 /*yield*/, storage.getObjectEntityFile(uploaded.objectPath)];
            case 3:
                uploadedObject = _a.sent();
                return [4 /*yield*/, uploadedObject.getMetadata()];
            case 4:
                metadata = (_a.sent())[0];
                if (!!(0, security_1.uploadedObjectMetadataMatches)(uploaded, metadata)) return [3 /*break*/, 6];
                return [4 /*yield*/, uploadedObject.delete().catch(function () { return undefined; })];
            case 5:
                _a.sent();
                res.status(400).json({ error: "Le fichier reçu ne correspond pas au type ou à la taille autorisés" });
                return [2 /*return*/];
            case 6: return [3 /*break*/, 8];
            case 7:
                error_6 = _a.sent();
                if (error_6 instanceof objectStorage_1.ObjectNotFoundError) {
                    res.status(400).json({ error: "Le fichier envoyé est introuvable" });
                    return [2 /*return*/];
                }
                throw error_6;
            case 8: return [4 /*yield*/, storage.trySetObjectEntityAclPolicy(uploaded.objectPath, {
                    owner: "rsvp:".concat(link.guestId),
                    visibility: "private",
                })];
            case 9:
                path = _a.sent();
                return [4 /*yield*/, db_1.db.transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var active;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, tx.select({ id: db_1.rsvpsTable.id })
                                        .from(db_1.rsvpsTable)
                                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.rsvpsTable.id, link.id), (0, drizzle_orm_1.eq)(db_1.rsvpsTable.token, link.token), (0, drizzle_orm_1.eq)(db_1.rsvpsTable.revoked, false)))];
                                case 1:
                                    active = (_a.sent())[0];
                                    if (!active)
                                        return [2 /*return*/, []];
                                    return [2 /*return*/, tx.insert(db_1.filesTable).values(__assign(__assign({}, uploaded), { objectPath: path, projectId: link.projectId, guestId: link.guestId, uploaderUserId: "rsvp:".concat(link.guestId), moderationStatus: "pending", visibility: visibility, caption: caption, consent: consent })).returning()];
                            }
                        });
                    }); })];
            case 10:
                media = (_a.sent())[0];
                if (!media) {
                    res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
                    return [2 /*return*/];
                }
                res.status(201).json({
                    id: media.id, name: media.name, contentType: media.contentType, size: media.size,
                    caption: media.caption, visibility: media.visibility, moderationStatus: media.moderationStatus, createdAt: media.createdAt,
                });
                return [2 /*return*/];
        }
    });
}); });
router.get("/rsvp/:token/media/:mediaId", (0, security_1.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 60,
    key: function (req) { return "rsvp-media-read:".concat(req.ip, ":").concat(String(req.params.token)); },
}), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var link, media, response, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, activeRsvp(String(req.params.token))];
            case 1:
                link = _c.sent();
                if (!link || !uuid.safeParse(String(req.params.mediaId)).success) {
                    res.status(404).json({ error: "Média introuvable" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db.select().from(db_1.filesTable).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.filesTable.id, String(req.params.mediaId)), (0, drizzle_orm_1.eq)(db_1.filesTable.projectId, link.projectId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(db_1.filesTable.guestId, link.guestId), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.filesTable.moderationStatus, "approved"), (0, drizzle_orm_1.eq)(db_1.filesTable.visibility, "guests")))))];
            case 2:
                media = (_c.sent())[0];
                if (!media) {
                    res.status(404).json({ error: "Média introuvable" });
                    return [2 /*return*/];
                }
                _b = (_a = storage).downloadObject;
                return [4 /*yield*/, storage.getObjectEntityFile(media.objectPath)];
            case 3: return [4 /*yield*/, _b.apply(_a, [_c.sent(), 0])];
            case 4:
                response = _c.sent();
                response.headers.forEach(function (value, key) { return res.setHeader(key, value); });
                res.setHeader("Content-Type", media.contentType);
                res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
                res.setHeader("Content-Disposition", "inline; filename=\"".concat((0, security_1.safeDownloadName)(media.name), "\"; filename*=UTF-8''").concat(encodeURIComponent(media.name)));
                res.setHeader("X-Content-Type-Options", "nosniff");
                res.setHeader("Cache-Control", "private, no-store");
                if (response.body)
                    node_stream_1.Readable.fromWeb(response.body).pipe(res);
                return [2 /*return*/];
        }
    });
}); });
router.post("/rsvp/:token/song-requests", (0, security_1.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    key: function (req) { return "rsvp-song-request:".concat(req.ip, ":").concat(String(req.params.token)); },
}), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, link, request;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                input = parseBody(songRequestInput, req, res);
                if (!input)
                    return [2 /*return*/];
                return [4 /*yield*/, activeRsvp(String(req.params.token))];
            case 1:
                link = _a.sent();
                if (!link) {
                    res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db_1.db.insert(db_1.songRequestsTable)
                        .values(__assign(__assign({}, input), { projectId: link.projectId, guestId: link.guestId, status: "new" }))
                        .returning()];
            case 2:
                request = (_a.sent())[0];
                res.status(201).json(request);
                return [2 /*return*/];
        }
    });
}); });
router.put("/rsvp/:token", (0, security_1.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 12,
    key: function (req) { return "rsvp-write:".concat(req.ip, ":").concat(String(req.params.token)); },
}), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var input, projectGuestPatch, updated;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!uuid.safeParse(String(req.params.token)).success) {
                    res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
                    return [2 /*return*/];
                }
                input = parseBody(rsvpInput, req, res);
                if (!input)
                    return [2 /*return*/];
                projectGuestPatch = JSON.stringify({
                    rsvp: input.status === "confirmed" ? "confirme" : "decline",
                    attendance: input.attendance,
                    dietary: (_a = input.dietary) !== null && _a !== void 0 ? _a : "",
                    plusOne: input.plusOne,
                });
                return [4 /*yield*/, db_1.db.transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var respondedAt, saved;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    respondedAt = new Date();
                                    return [4 /*yield*/, tx
                                            .update(db_1.rsvpsTable)
                                            .set({ response: input, respondedAt: respondedAt })
                                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.rsvpsTable.token, String(req.params.token)), (0, drizzle_orm_1.eq)(db_1.rsvpsTable.revoked, false)))
                                            .returning()];
                                case 1:
                                    saved = (_a.sent())[0];
                                    if (!saved)
                                        return [2 /*return*/, undefined];
                                    return [4 /*yield*/, tx
                                            .update(db_1.projectsTable)
                                            .set({
                                            data: (0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["jsonb_set(\n            ", ",\n            '{guests}',\n            COALESCE((\n              SELECT jsonb_agg(\n                CASE\n                  WHEN guest ->> 'id' = ", "\n                    THEN guest || ", "::jsonb\n                  ELSE guest\n                END\n                ORDER BY position\n              )\n              FROM jsonb_array_elements(\n                COALESCE(", " -> 'guests', '[]'::jsonb)\n              ) WITH ORDINALITY AS entries(guest, position)\n            ), '[]'::jsonb),\n            true\n          )"], ["jsonb_set(\n            ", ",\n            '{guests}',\n            COALESCE((\n              SELECT jsonb_agg(\n                CASE\n                  WHEN guest ->> 'id' = ", "\n                    THEN guest || ", "::jsonb\n                  ELSE guest\n                END\n                ORDER BY position\n              )\n              FROM jsonb_array_elements(\n                COALESCE(", " -> 'guests', '[]'::jsonb)\n              ) WITH ORDINALITY AS entries(guest, position)\n            ), '[]'::jsonb),\n            true\n          )"])), db_1.projectsTable.data, saved.guestId, projectGuestPatch, db_1.projectsTable.data),
                                            updatedAt: respondedAt,
                                        })
                                            .where((0, drizzle_orm_1.eq)(db_1.projectsTable.id, saved.projectId))];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/, saved];
                            }
                        });
                    }); })];
            case 1:
                updated = _b.sent();
                if (!updated) {
                    res.status(404).json({ error: "Lien RSVP invalide ou révoqué" });
                    return [2 /*return*/];
                }
                res.json({ response: updated.response, respondedAt: updated.respondedAt });
                return [2 /*return*/];
        }
    });
}); });
exports.default = router;
var templateObject_1, templateObject_2, templateObject_3;
//# sourceMappingURL=aime.js.map
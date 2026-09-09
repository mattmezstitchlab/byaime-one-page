"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRelativePath = normalizeRelativePath;
exports.classifyFileType = classifyFileType;
exports.classifyDocumentType = classifyDocumentType;
exports.buildLocalIdentifier = buildLocalIdentifier;
exports.fingerprintFile = fingerprintFile;
exports.extractLightEntities = extractLightEntities;
exports.suggestForProject = suggestForProject;
var node_crypto_1 = require("node:crypto");
var node_fs_1 = require("node:fs");
var promises_1 = require("node:fs/promises");
var node_path_1 = require("node:path");
var EXT_TO_TYPE = {
    pdf: "pdf",
    jpg: "image",
    jpeg: "image",
    png: "image",
    webp: "image",
    gif: "image",
    heic: "image",
    mp4: "video",
    mov: "video",
    m4v: "video",
    avi: "video",
    mp3: "audio",
    m4a: "audio",
    wav: "audio",
    aac: "audio",
    flac: "audio",
    txt: "text",
    md: "text",
    csv: "csv",
    json: "json",
    zip: "archive",
    rar: "archive",
    "7z": "archive",
    doc: "document",
    docx: "document",
    xls: "document",
    xlsx: "document",
    ppt: "document",
    pptx: "document",
};
var DOCUMENT_HINTS = [
    { type: "devis", patterns: [/\bdevis\b/i, /\bquote\b/i, /\bestim(ation|ate)\b/i] },
    { type: "contrat", patterns: [/\bcontrat\b/i, /\bcontract\b/i, /\bagreement\b/i] },
    { type: "facture", patterns: [/\bfacture\b/i, /\binvoice\b/i, /\brecu\b/i, /\breçu\b/i] },
    { type: "reservation", patterns: [/\breserv(ation|e)\b/i, /\bbooking\b/i, /\bbillet\b/i, /\bticket\b/i] },
    { type: "liste_invites", patterns: [/\binvit(es|és?)\b/i, /\bguest[-_\s]?list\b/i] },
    { type: "playlist", patterns: [/\bplaylist\b/i, /\bmusic\b/i, /\bset[-_\s]?list\b/i] },
    { type: "planning", patterns: [/\bplanning\b/i, /\bschedule\b/i, /\btimeline\b/i, /\bprogramme\b/i] },
];
var EVENT_HINTS = ["mariage", "wedding", "voyage", "travel", "immobilier", "real-estate", "entreprise", "business"];
var RESOURCE_HINTS = ["traiteur", "cater", "hotel", "dj", "photo", "video", "fleur", "transport", "budget", "provider"];
function emptyEntities() {
    return {
        people: [],
        places: [],
        dates: [],
        amounts: [],
        events: [],
        resources: [],
        organizations: [],
    };
}
function unique(values) {
    return __spreadArray([], new Set(values.map(function (value) { return value.trim(); }).filter(Boolean)), true).slice(0, 12);
}
function normalizeRelativePath(value) {
    var unix = value.replaceAll("\\", "/");
    var normalized = node_path_1.default.posix
        .normalize(unix)
        .replace(/^(\.\.\/)+/, "")
        .replace(/^\/+/, "");
    return normalized === "." ? "" : normalized;
}
function classifyFileType(fileName) {
    var _a;
    var extension = node_path_1.default.extname(fileName).replace(/^\./, "").toLowerCase();
    return (_a = EXT_TO_TYPE[extension]) !== null && _a !== void 0 ? _a : "other";
}
function classifyDocumentType(fileName, snippet) {
    if (snippet === void 0) { snippet = ""; }
    var haystack = "".concat(fileName, " ").concat(snippet).toLowerCase();
    for (var _i = 0, DOCUMENT_HINTS_1 = DOCUMENT_HINTS; _i < DOCUMENT_HINTS_1.length; _i++) {
        var hint = DOCUMENT_HINTS_1[_i];
        if (hint.patterns.some(function (pattern) { return pattern.test(haystack); }))
            return hint.type;
    }
    return "autre";
}
function buildLocalIdentifier(input) {
    var hash = (0, node_crypto_1.createHash)("sha256");
    hash.update(input.sourceFolder);
    hash.update("\n");
    hash.update(normalizeRelativePath(input.relativePath));
    hash.update("\n");
    hash.update(String(input.size));
    hash.update("\n");
    hash.update(input.modifiedAt);
    return hash.digest("hex");
}
function fingerprintFile(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var metadata, hash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, promises_1.stat)(filePath)];
                case 1:
                    metadata = _a.sent();
                    hash = (0, node_crypto_1.createHash)("sha256");
                    hash.update("size:".concat(metadata.size, "\nmtime:").concat(metadata.mtimeMs, "\n"));
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            var stream = (0, node_fs_1.createReadStream)(filePath, { start: 0, end: Math.max(0, Math.min(metadata.size - 1, 1024 * 1024 - 1)) });
                            stream.on("data", function (chunk) { return hash.update(chunk); });
                            stream.on("end", function () { return resolve(); });
                            stream.on("error", reject);
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, hash.digest("hex")];
            }
        });
    });
}
function extractLightEntities(fileName, snippet) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (snippet === void 0) { snippet = ""; }
    var source = "".concat(fileName, "\n").concat(snippet);
    var lower = source.toLowerCase();
    var entities = emptyEntities();
    entities.dates = unique(__spreadArray(__spreadArray(__spreadArray([], (_a = source.match(/\b\d{4}-\d{2}-\d{2}\b/g)) !== null && _a !== void 0 ? _a : [], true), (_b = source.match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g)) !== null && _b !== void 0 ? _b : [], true), (_c = source.match(/\b\d{1,2}\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+\d{4}\b/gi)) !== null && _c !== void 0 ? _c : [], true));
    entities.amounts = unique(__spreadArray(__spreadArray([], (_d = source.match(/\b\d{1,3}(?:[ .,\u00A0]?\d{3})*(?:[.,]\d{2})?\s?(?:€|eur|euros?|usd|\$)/gi)) !== null && _d !== void 0 ? _d : [], true), (_e = source.match(/(?:€|\$)\s?\d{1,3}(?:[ .,\u00A0]?\d{3})*(?:[.,]\d{2})?\b/gi)) !== null && _e !== void 0 ? _e : [], true));
    entities.people = unique((_f = source.match(/\b[A-ZÉÈÊËÀÂÎÏÔÖÙÛÜÇ][a-zéèêëàâîïôöùûüç'-]+\s+[A-ZÉÈÊËÀÂÎÏÔÖÙÛÜÇ][a-zéèêëàâîïôöùûüç'-]+\b/g)) !== null && _f !== void 0 ? _f : []);
    entities.places = unique((_g = source.match(/\b(?:Paris|Lille|Lyon|Marseille|Bordeaux|Strasbourg|Nantes|Toulouse|Nice|Bruxelles|Londres|London)\b/gi)) !== null && _g !== void 0 ? _g : []);
    entities.organizations = unique((_h = source.match(/\b(?:SARL|SAS|EURL|SCI|Mairie|Hôtel|Hotel|Studio|Agence)\s+[A-Za-z0-9'’\-\s]+\b/g)) !== null && _h !== void 0 ? _h : []);
    entities.events = unique(EVENT_HINTS.filter(function (token) { return lower.includes(token); }));
    entities.resources = unique(RESOURCE_HINTS.filter(function (token) { return lower.includes(token); }));
    return entities;
}
function projectTokens(projectData) {
    var _a, _b, _c, _d;
    var universe = String((_a = projectData.universe) !== null && _a !== void 0 ? _a : "");
    var title = String((_b = projectData.title) !== null && _b !== void 0 ? _b : "");
    var city = typeof projectData.city === "object" ? String((_c = projectData.city.value) !== null && _c !== void 0 ? _c : "") : "";
    var venue = typeof projectData.venue === "object" ? String((_d = projectData.venue.value) !== null && _d !== void 0 ? _d : "") : "";
    var providers = Array.isArray(projectData.providers)
        ? projectData.providers.flatMap(function (provider) {
            var _a, _b, _c;
            if (!provider || typeof provider !== "object")
                return [];
            var row = provider;
            return [String((_a = row.name) !== null && _a !== void 0 ? _a : ""), String((_b = row.role) !== null && _b !== void 0 ? _b : ""), String((_c = row.category) !== null && _c !== void 0 ? _c : "")];
        })
        : [];
    return unique(__spreadArray([universe, title, city, venue], providers, true).map(function (value) { return value.toLowerCase(); }));
}
function suggestForProject(file, projectData) {
    var tokens = projectTokens(projectData);
    var haystack = "".concat(file.name, " ").concat(file.entities.events.join(" "), " ").concat(file.entities.resources.join(" "), " ").concat(file.entities.places.join(" ")).toLowerCase();
    var matched = tokens.filter(function (token) { return token.length >= 3 && haystack.includes(token); });
    var weddingHint = haystack.includes("mariage") || haystack.includes("wedding");
    var financeHint = ["devis", "facture", "contrat"].includes(file.documentType);
    var score = Math.min(1, (matched.length * 0.18) + (weddingHint ? 0.28 : 0) + (financeHint ? 0.22 : 0));
    if (score < 0.35)
        return null;
    return {
        score: score,
        reason: matched.length
            ? "Correspondances d\u00E9tect\u00E9es: ".concat(matched.slice(0, 4).join(", "))
            : "Le type de document semble pertinent pour ce Monde.",
        actions: ["link_project", "add_timeline", "import", "ignore"],
    };
}
//# sourceMappingURL=aimeLocalScan.js.map
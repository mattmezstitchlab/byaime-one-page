"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleE2ETestServicesReady = exports.handleE2EStorageUpload = void 0;
exports.isE2ETestServicesEnabled = isE2ETestServicesEnabled;
exports.createE2EObjectFile = createE2EObjectFile;
exports.e2eUploadURL = e2eUploadURL;
exports.e2eObjectId = e2eObjectId;
exports.sendE2ETestEmail = sendE2ETestEmail;
var promises_1 = require("node:fs/promises");
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
function isE2ETestServicesEnabled() {
    return (process.env.NODE_ENV !== "production" && process.env.AIME_E2E_RUN === "1");
}
function storageRoot() {
    var root = process.env.AIME_E2E_STORAGE_DIR;
    if (!root)
        throw new Error("AIME_E2E_STORAGE_DIR is required when AIME_E2E_RUN=1");
    return node_path_1.default.resolve(root);
}
function safeObjectId(value) {
    if (!/^[a-f0-9-]{36}$/i.test(value))
        throw new Error("Invalid E2E object id");
    return value;
}
function objectFilePath(objectId) {
    return node_path_1.default.join(storageRoot(), safeObjectId(objectId));
}
function metadataPath(objectId) {
    return "".concat(objectFilePath(objectId), ".metadata.json");
}
var handleE2EStorageUpload = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var objectId, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                objectId = safeObjectId(String(req.params.objectId));
                return [4 /*yield*/, (0, promises_1.mkdir)(storageRoot(), { recursive: true })];
            case 1:
                _b.sent();
                return [4 /*yield*/, (0, promises_1.writeFile)(objectFilePath(objectId), Buffer.isBuffer(req.body) ? req.body : Buffer.from((_a = req.body) !== null && _a !== void 0 ? _a : ""))];
            case 2:
                _b.sent();
                res.sendStatus(200);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _b.sent();
                req.log.error({ error: error_1 }, "E2E storage upload failed");
                res.status(500).json({ error: "E2E storage upload failed" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.handleE2EStorageUpload = handleE2EStorageUpload;
var handleE2ETestServicesReady = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var emailResponse, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, (0, promises_1.mkdir)(storageRoot(), { recursive: true })];
            case 1:
                _a.sent();
                return [4 /*yield*/, sendE2ETestEmail()];
            case 2:
                emailResponse = _a.sent();
                if (!emailResponse.ok)
                    throw new Error("E2E email transport returned ".concat(emailResponse.status));
                res.json({ storage: "ready", email: "ready" });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                req.log.error({ error: error_2 }, "E2E test services are unavailable");
                res.status(503).json({ error: "E2E test services are unavailable" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.handleE2ETestServicesReady = handleE2ETestServicesReady;
function createE2EObjectFile(objectId) {
    var id = safeObjectId(objectId);
    var filePath = objectFilePath(id);
    var file = {
        name: "uploads/".concat(id),
        exists: function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, (0, promises_1.stat)(filePath)];
                        case 1:
                            _b.sent();
                            return [2 /*return*/, [true]];
                        case 2:
                            _a = _b.sent();
                            return [2 /*return*/, [false]];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        getMetadata: function () {
            return __awaiter(this, void 0, void 0, function () {
                var fileStat, metadata, _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, (0, promises_1.stat)(filePath)];
                        case 1:
                            fileStat = _d.sent();
                            metadata = {};
                            _d.label = 2;
                        case 2:
                            _d.trys.push([2, 4, , 5]);
                            _b = (_a = JSON).parse;
                            return [4 /*yield*/, (0, promises_1.readFile)(metadataPath(id), "utf8")];
                        case 3:
                            metadata = _b.apply(_a, [_d.sent()]);
                            return [3 /*break*/, 5];
                        case 4:
                            _c = _d.sent();
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/, [
                                __assign({ size: String(fileStat.size), contentType: "application/octet-stream" }, metadata),
                            ]];
                    }
                });
            });
        },
        setMetadata: function (value) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, promises_1.writeFile)(metadataPath(id), JSON.stringify(value))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, [value]];
                    }
                });
            });
        },
        createReadStream: function () {
            return (0, node_fs_1.createReadStream)(filePath);
        },
        delete: function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                (0, promises_1.rm)(filePath, { force: true }),
                                (0, promises_1.rm)(metadataPath(id), { force: true }),
                            ])];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, [{}]];
                    }
                });
            });
        },
    };
    return file;
}
function e2eUploadURL(objectId) {
    safeObjectId(objectId);
    return "/api/__e2e/storage/".concat(objectId);
}
function e2eObjectId(rawPath) {
    var _a;
    var match = rawPath.match(/\/(?:objects\/uploads|api\/__e2e\/storage)\/([a-f0-9-]{36})(?:$|[?])/i);
    return (_a = match === null || match === void 0 ? void 0 : match[1]) !== null && _a !== void 0 ? _a : null;
}
function sendE2ETestEmail() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!isE2ETestServicesEnabled())
                throw new Error("E2E email transport is disabled");
            return [2 /*return*/, new Response(JSON.stringify({ id: "e2e-".concat(Date.now()) }), {
                    status: 202,
                    headers: { "Content-Type": "application/json" },
                })];
        });
    });
}

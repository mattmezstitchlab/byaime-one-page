"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.ObjectStorageService = exports.ObjectNotFoundError = exports.objectStorageClient = void 0;
var crypto_1 = require("crypto");
var stream_1 = require("stream");
var storage_1 = require("@google-cloud/storage");
var objectAcl_1 = require("./objectAcl");
var e2eTestServices_1 = require("./e2eTestServices");
function objectStorageProvider() {
    return (process.env.OBJECT_STORAGE_PROVIDER || "gcs").trim().toLowerCase();
}
function createObjectStorageClient() {
    var provider = objectStorageProvider();
    if (provider !== "gcs") {
        throw new Error("Unsupported OBJECT_STORAGE_PROVIDER \"".concat(provider, "\". Supported providers: gcs"));
    }
    var projectId = process.env.GCP_PROJECT_ID || undefined;
    var clientEmail = process.env.GCP_CLIENT_EMAIL || undefined;
    var privateKey = process.env.GCP_PRIVATE_KEY
        ? process.env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined;
    if (clientEmail && privateKey) {
        return new storage_1.Storage({
            projectId: projectId,
            credentials: {
                client_email: clientEmail,
                private_key: privateKey,
            },
        });
    }
    return new storage_1.Storage({ projectId: projectId });
}
exports.objectStorageClient = createObjectStorageClient();
var ObjectNotFoundError = /** @class */ (function (_super) {
    __extends(ObjectNotFoundError, _super);
    function ObjectNotFoundError() {
        var _this = _super.call(this, "Object not found") || this;
        _this.name = "ObjectNotFoundError";
        Object.setPrototypeOf(_this, ObjectNotFoundError.prototype);
        return _this;
    }
    return ObjectNotFoundError;
}(Error));
exports.ObjectNotFoundError = ObjectNotFoundError;
var ObjectStorageService = /** @class */ (function () {
    function ObjectStorageService() {
    }
    ObjectStorageService.prototype.getPublicObjectSearchPaths = function () {
        var _a;
        var bucket = ((_a = process.env.OBJECT_STORAGE_BUCKET) === null || _a === void 0 ? void 0 : _a.trim()) || "";
        var prefixesStr = process.env.OBJECT_STORAGE_PUBLIC_PREFIXES || "";
        if (prefixesStr) {
            var prefixes = Array.from(new Set(prefixesStr
                .split(",")
                .map(function (path) { return path.trim(); })
                .filter(function (path) { return path.length > 0; })));
            return prefixes.map(function (prefix) {
                if (prefix.startsWith("/"))
                    return prefix;
                if (!bucket) {
                    throw new Error("OBJECT_STORAGE_BUCKET is required when OBJECT_STORAGE_PUBLIC_PREFIXES uses relative prefixes.");
                }
                var normalizedPrefix = trimSlashes(prefix);
                return normalizedPrefix
                    ? "/".concat(bucket, "/").concat(normalizedPrefix)
                    : "/".concat(bucket);
            });
        }
        var pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
        var paths = Array.from(new Set(pathsStr
            .split(",")
            .map(function (path) { return path.trim(); })
            .filter(function (path) { return path.length > 0; })));
        if (paths.length === 0) {
            throw new Error("Object storage public paths are not configured. Set OBJECT_STORAGE_PUBLIC_PREFIXES " +
                "(preferred) or PUBLIC_OBJECT_SEARCH_PATHS (legacy).");
        }
        return paths;
    };
    ObjectStorageService.prototype.getPrivateObjectDir = function () {
        var _a;
        var bucket = ((_a = process.env.OBJECT_STORAGE_BUCKET) === null || _a === void 0 ? void 0 : _a.trim()) || "";
        if (bucket) {
            var prefix = trimSlashes(process.env.OBJECT_STORAGE_PRIVATE_PREFIX || "");
            return prefix ? "/".concat(bucket, "/").concat(prefix) : "/".concat(bucket);
        }
        var dir = process.env.PRIVATE_OBJECT_DIR || "";
        if (!dir) {
            throw new Error("Object storage private path is not configured. Set OBJECT_STORAGE_BUCKET " +
                "(and optional OBJECT_STORAGE_PRIVATE_PREFIX) or PRIVATE_OBJECT_DIR (legacy).");
        }
        return dir;
    };
    ObjectStorageService.prototype.searchPublicObject = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, searchPath, fullPath, _b, bucketName, objectName, bucket, file, exists;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _i = 0, _a = this.getPublicObjectSearchPaths();
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        searchPath = _a[_i];
                        fullPath = "".concat(searchPath, "/").concat(filePath);
                        _b = parseObjectPath(fullPath), bucketName = _b.bucketName, objectName = _b.objectName;
                        bucket = exports.objectStorageClient.bucket(bucketName);
                        file = bucket.file(objectName);
                        return [4 /*yield*/, file.exists()];
                    case 2:
                        exists = (_c.sent())[0];
                        if (exists) {
                            return [2 /*return*/, file];
                        }
                        _c.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, null];
                }
            });
        });
    };
    ObjectStorageService.prototype.downloadObject = function (file_1) {
        return __awaiter(this, arguments, void 0, function (file, cacheTtlSec) {
            var metadata, aclPolicy, isPublic, nodeStream, webStream, headers;
            if (cacheTtlSec === void 0) { cacheTtlSec = 3600; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, file.getMetadata()];
                    case 1:
                        metadata = (_a.sent())[0];
                        return [4 /*yield*/, (0, objectAcl_1.getObjectAclPolicy)(file)];
                    case 2:
                        aclPolicy = _a.sent();
                        isPublic = (aclPolicy === null || aclPolicy === void 0 ? void 0 : aclPolicy.visibility) === "public";
                        nodeStream = file.createReadStream();
                        webStream = stream_1.Readable.toWeb(nodeStream);
                        headers = {
                            "Content-Type": metadata.contentType || "application/octet-stream",
                            "Cache-Control": "".concat(isPublic ? "public" : "private", ", max-age=").concat(cacheTtlSec),
                        };
                        if (metadata.size) {
                            headers["Content-Length"] = String(metadata.size);
                        }
                        return [2 /*return*/, new Response(webStream, { headers: headers })];
                }
            });
        });
    };
    ObjectStorageService.prototype.getObjectEntityUploadURL = function () {
        return __awaiter(this, void 0, void 0, function () {
            var privateObjectDir, objectId, fullPath, _a, bucketName, objectName;
            return __generator(this, function (_b) {
                if ((0, e2eTestServices_1.isE2ETestServicesEnabled)()) {
                    return [2 /*return*/, (0, e2eTestServices_1.e2eUploadURL)((0, crypto_1.randomUUID)())];
                }
                privateObjectDir = this.getPrivateObjectDir();
                if (!privateObjectDir) {
                    throw new Error("Object storage private path is not configured. Set OBJECT_STORAGE_BUCKET " +
                        "(and optional OBJECT_STORAGE_PRIVATE_PREFIX) or PRIVATE_OBJECT_DIR (legacy).");
                }
                objectId = (0, crypto_1.randomUUID)();
                fullPath = "".concat(privateObjectDir, "/uploads/").concat(objectId);
                _a = parseObjectPath(fullPath), bucketName = _a.bucketName, objectName = _a.objectName;
                return [2 /*return*/, signObjectURL({
                        bucketName: bucketName,
                        objectName: objectName,
                        method: "PUT",
                        ttlSec: 900,
                    })];
            });
        });
    };
    ObjectStorageService.prototype.getObjectEntityFile = function (objectPath) {
        return __awaiter(this, void 0, void 0, function () {
            var objectId, file, exists_1, parts, entityId, entityDir, objectEntityPath, _a, bucketName, objectName, bucket, objectFile, exists;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(0, e2eTestServices_1.isE2ETestServicesEnabled)()) return [3 /*break*/, 2];
                        objectId = (0, e2eTestServices_1.e2eObjectId)(objectPath);
                        if (!objectId)
                            throw new ObjectNotFoundError();
                        file = (0, e2eTestServices_1.createE2EObjectFile)(objectId);
                        return [4 /*yield*/, file.exists()];
                    case 1:
                        exists_1 = (_b.sent())[0];
                        if (!exists_1)
                            throw new ObjectNotFoundError();
                        return [2 /*return*/, file];
                    case 2:
                        if (!objectPath.startsWith("/objects/")) {
                            throw new ObjectNotFoundError();
                        }
                        parts = objectPath.slice(1).split("/");
                        if (parts.length < 2) {
                            throw new ObjectNotFoundError();
                        }
                        entityId = parts.slice(1).join("/");
                        entityDir = this.getPrivateObjectDir();
                        if (!entityDir.endsWith("/")) {
                            entityDir = "".concat(entityDir, "/");
                        }
                        objectEntityPath = "".concat(entityDir).concat(entityId);
                        _a = parseObjectPath(objectEntityPath), bucketName = _a.bucketName, objectName = _a.objectName;
                        bucket = exports.objectStorageClient.bucket(bucketName);
                        objectFile = bucket.file(objectName);
                        return [4 /*yield*/, objectFile.exists()];
                    case 3:
                        exists = (_b.sent())[0];
                        if (!exists) {
                            throw new ObjectNotFoundError();
                        }
                        return [2 /*return*/, objectFile];
                }
            });
        });
    };
    ObjectStorageService.prototype.normalizeObjectEntityPath = function (rawPath) {
        if ((0, e2eTestServices_1.isE2ETestServicesEnabled)()) {
            var objectId = (0, e2eTestServices_1.e2eObjectId)(rawPath);
            return objectId ? "/objects/uploads/".concat(objectId) : rawPath;
        }
        var rawObjectPath = objectPathFromRawValue(rawPath);
        if (!rawObjectPath)
            return rawPath;
        var objectEntityDir = this.getPrivateObjectDir();
        if (!objectEntityDir.endsWith("/")) {
            objectEntityDir = "".concat(objectEntityDir, "/");
        }
        if (!rawObjectPath.startsWith(objectEntityDir)) {
            return rawObjectPath;
        }
        var entityId = rawObjectPath.slice(objectEntityDir.length);
        return "/objects/".concat(entityId);
    };
    ObjectStorageService.prototype.trySetObjectEntityAclPolicy = function (rawPath, aclPolicy) {
        return __awaiter(this, void 0, void 0, function () {
            var normalizedPath, objectFile;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        normalizedPath = this.normalizeObjectEntityPath(rawPath);
                        if (!normalizedPath.startsWith("/")) {
                            return [2 /*return*/, normalizedPath];
                        }
                        return [4 /*yield*/, this.getObjectEntityFile(normalizedPath)];
                    case 1:
                        objectFile = _a.sent();
                        return [4 /*yield*/, (0, objectAcl_1.setObjectAclPolicy)(objectFile, aclPolicy)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, normalizedPath];
                }
            });
        });
    };
    ObjectStorageService.prototype.canAccessObjectEntity = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var userId = _b.userId, objectFile = _b.objectFile, requestedPermission = _b.requestedPermission;
            return __generator(this, function (_c) {
                return [2 /*return*/, (0, objectAcl_1.canAccessObject)({
                        userId: userId,
                        objectFile: objectFile,
                        requestedPermission: requestedPermission !== null && requestedPermission !== void 0 ? requestedPermission : objectAcl_1.ObjectPermission.READ,
                    })];
            });
        });
    };
    return ObjectStorageService;
}());
exports.ObjectStorageService = ObjectStorageService;
function parseObjectPath(path) {
    if (!path.startsWith("/")) {
        path = "/".concat(path);
    }
    var pathParts = path.split("/");
    if (pathParts.length < 3) {
        throw new Error("Invalid path: must contain at least a bucket name");
    }
    var bucketName = pathParts[1];
    var objectName = pathParts.slice(2).join("/");
    return {
        bucketName: bucketName,
        objectName: objectName,
    };
}
function signObjectURL(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var action, signedURL;
        var bucketName = _b.bucketName, objectName = _b.objectName, method = _b.method, ttlSec = _b.ttlSec;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    action = method === "PUT"
                        ? "write"
                        : method === "DELETE"
                            ? "delete"
                            : "read";
                    return [4 /*yield*/, exports.objectStorageClient
                            .bucket(bucketName)
                            .file(objectName)
                            .getSignedUrl({
                            version: "v4",
                            action: action,
                            expires: Date.now() + ttlSec * 1000,
                        })];
                case 1:
                    signedURL = (_c.sent())[0];
                    return [2 /*return*/, signedURL];
            }
        });
    });
}
function trimSlashes(value) {
    return value.trim().replace(/^\/+|\/+$/g, "");
}
function objectPathFromRawValue(rawPath) {
    if (rawPath.startsWith("/"))
        return rawPath;
    if (!rawPath.startsWith("http://") && !rawPath.startsWith("https://")) {
        return null;
    }
    var url = new URL(rawPath);
    var pathname = url.pathname.startsWith("/") ? url.pathname : "/".concat(url.pathname);
    if (url.hostname.endsWith(".storage.googleapis.com")) {
        var bucketName = url.hostname.slice(0, -".storage.googleapis.com".length);
        return "/".concat(bucketName).concat(pathname);
    }
    return pathname;
}
//# sourceMappingURL=objectStorage.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimit = createRateLimit;
exports.signUploadAuthorization = signUploadAuthorization;
exports.verifyUploadAuthorization = verifyUploadAuthorization;
exports.safeDownloadName = safeDownloadName;
exports.uploadedObjectMetadataMatches = uploadedObjectMetadataMatches;
exports.requestOrigin = requestOrigin;
exports.configuredAppOrigin = configuredAppOrigin;
exports.isTrustedAppOrigin = isTrustedAppOrigin;
var node_crypto_1 = require("node:crypto");
function createRateLimit(_a) {
    var windowMs = _a.windowMs, max = _a.max, key = _a.key;
    var buckets = new Map();
    return function (req, res, next) {
        var now = Date.now();
        var bucketKey = key(req);
        var current = buckets.get(bucketKey);
        var bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
        bucket.count += 1;
        buckets.set(bucketKey, bucket);
        res.setHeader("RateLimit-Limit", String(max));
        res.setHeader("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
        res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
        if (bucket.count > max) {
            res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
            res.status(429).json({ error: "Trop de tentatives. Réessayez dans quelques minutes." });
            return;
        }
        next();
    };
}
function signUploadAuthorization(payload, secret) {
    if (!secret)
        throw new Error("An upload signing secret is required");
    var encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    var signature = (0, node_crypto_1.createHmac)("sha256", secret).update(encoded).digest("base64url");
    return "".concat(encoded, ".").concat(signature);
}
function verifyUploadAuthorization(token, expected, secret, now) {
    if (now === void 0) { now = Date.now(); }
    if (!secret)
        return false;
    var _a = token.split("."), encoded = _a[0], suppliedSignature = _a[1], extra = _a[2];
    if (!encoded || !suppliedSignature || extra)
        return false;
    var expectedSignature = (0, node_crypto_1.createHmac)("sha256", secret).update(encoded).digest();
    var supplied;
    try {
        supplied = Buffer.from(suppliedSignature, "base64url");
    }
    catch (_b) {
        return false;
    }
    if (supplied.length !== expectedSignature.length || !(0, node_crypto_1.timingSafeEqual)(supplied, expectedSignature))
        return false;
    try {
        var payload_1 = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
        if (typeof payload_1.expiresAt !== "number" || payload_1.expiresAt < now)
            return false;
        return Object.entries(expected).every(function (_a) {
            var key = _a[0], value = _a[1];
            return payload_1[key] === value;
        });
    }
    catch (_c) {
        return false;
    }
}
function safeDownloadName(name) {
    return name.replace(/[\u0000-\u001f\u007f"\\]/g, "_").slice(0, 180) || "document";
}
function uploadedObjectMetadataMatches(expected, actual) {
    var actualType = String(actual.contentType || "").split(";", 1)[0].trim().toLowerCase();
    var expectedType = expected.contentType.trim().toLowerCase();
    var actualSize = Number(actual.size);
    return actualType === expectedType && Number.isSafeInteger(actualSize) && actualSize === expected.size;
}
function normalizedOrigin(value) {
    if (!value)
        return undefined;
    try {
        return new URL(value).origin;
    }
    catch (_a) {
        return undefined;
    }
}
function firstForwardedValue(value) {
    var _a;
    var raw = Array.isArray(value) ? value[0] : value;
    var first = (_a = raw === null || raw === void 0 ? void 0 : raw.split(",")[0]) === null || _a === void 0 ? void 0 : _a.trim();
    return first || undefined;
}
function requestOrigin(req) {
    var _a;
    var host = firstForwardedValue(req.headers["x-forwarded-host"]) || ((_a = req.headers.host) === null || _a === void 0 ? void 0 : _a.trim());
    if (!host)
        return undefined;
    var protocol = firstForwardedValue(req.headers["x-forwarded-proto"]) || "https";
    return normalizedOrigin("".concat(protocol, "://").concat(host));
}
function configuredAppOrigin(_a) {
    var appUrl = _a.appUrl, req = _a.req, environment = _a.environment;
    var configured = normalizedOrigin(appUrl);
    if (configured)
        return configured;
    var inferred = req ? requestOrigin(req) : undefined;
    if (inferred)
        return inferred;
    if (environment === "production") {
        throw new Error("APP_URL is required when the public application URL cannot be inferred from the request");
    }
    return "http://localhost";
}
function isTrustedAppOrigin(_a) {
    var origin = _a.origin, req = _a.req, appUrl = _a.appUrl, environment = _a.environment;
    var normalized = normalizedOrigin(origin);
    if (!normalized)
        return false;
    if (normalized === requestOrigin(req))
        return true;
    if (normalized === normalizedOrigin(appUrl))
        return true;
    if (environment !== "production") {
        var hostname = new URL(normalized).hostname;
        return hostname === "localhost" || hostname === "127.0.0.1";
    }
    return false;
}

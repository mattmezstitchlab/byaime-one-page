"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var pino_http_1 = require("pino-http");
var express_2 = require("@clerk/express");
var keys_1 = require("@clerk/shared/keys");
var routes_1 = require("./routes");
var logger_1 = require("./lib/logger");
var e2eTestServices_1 = require("./lib/e2eTestServices");
var clerkProxyMiddleware_1 = require("./middlewares/clerkProxyMiddleware");
var security_1 = require("./lib/security");
var app = (0, express_1.default)();
app.use((0, pino_http_1.default)({
    logger: logger_1.logger,
    serializers: {
        req: function (req) {
            var _a;
            return {
                id: req.id,
                method: req.method,
                url: (_a = req.url) === null || _a === void 0 ? void 0 : _a.split("?")[0],
            };
        },
        res: function (res) {
            return {
                statusCode: res.statusCode,
            };
        },
    },
}));
app.use(clerkProxyMiddleware_1.CLERK_PROXY_PATH, (0, clerkProxyMiddleware_1.clerkProxyMiddleware)());
app.use(function (req, res, next) {
    var origin = req.get("origin");
    if (origin &&
        !(0, security_1.isTrustedAppOrigin)({
            origin: origin,
            req: req,
            appUrl: process.env.APP_URL,
            environment: process.env.NODE_ENV,
        }) &&
        !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        res.status(403).json({ error: "Origine non autorisée" });
        return;
    }
    next();
});
app.use((0, cors_1.default)(function (req, callback) {
    var origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    callback(null, {
        credentials: true,
        origin: !origin
            || (0, security_1.isTrustedAppOrigin)({
                origin: origin,
                req: req,
                appUrl: process.env.APP_URL,
                environment: process.env.NODE_ENV,
            }),
    });
}));
if ((0, e2eTestServices_1.isE2ETestServicesEnabled)()) {
    app.get("/api/__e2e/ready", e2eTestServices_1.handleE2ETestServicesReady);
    app.put("/api/__e2e/storage/:objectId", express_1.default.raw({ type: "*/*", limit: "25mb" }), e2eTestServices_1.handleE2EStorageUpload);
}
app.use(express_1.default.json({ limit: "256kb" }));
app.use((0, express_2.clerkMiddleware)(function (req) {
    var _a;
    return ({
        publishableKey: (0, keys_1.publishableKeyFromHost)((_a = (0, clerkProxyMiddleware_1.getClerkProxyHost)(req)) !== null && _a !== void 0 ? _a : "", process.env.CLERK_PUBLISHABLE_KEY),
    });
}));
app.use("/api", routes_1.default);
exports.default = app;

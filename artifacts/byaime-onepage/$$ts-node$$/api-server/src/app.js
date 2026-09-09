import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import { handleE2ETestServicesReady, handleE2EStorageUpload, isE2ETestServicesEnabled, } from "./lib/e2eTestServices";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost, } from "./middlewares/clerkProxyMiddleware";
import { isTrustedAppOrigin } from "./lib/security";
const app = express();
app.use(pinoHttp({
    logger,
    serializers: {
        req(req) {
            return {
                id: req.id,
                method: req.method,
                url: req.url?.split("?")[0],
            };
        },
        res(res) {
            return {
                statusCode: res.statusCode,
            };
        },
    },
}));
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use((req, res, next) => {
    const origin = req.get("origin");
    if (origin &&
        !isTrustedAppOrigin({
            origin,
            req,
            appUrl: process.env.APP_URL,
            environment: process.env.NODE_ENV,
        }) &&
        !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        res.status(403).json({ error: "Origine non autorisée" });
        return;
    }
    next();
});
app.use(cors((req, callback) => {
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    callback(null, {
        credentials: true,
        origin: !origin
            || isTrustedAppOrigin({
                origin,
                req,
                appUrl: process.env.APP_URL,
                environment: process.env.NODE_ENV,
            }),
    });
}));
if (isE2ETestServicesEnabled()) {
    app.get("/api/__e2e/ready", handleE2ETestServicesReady);
    app.put("/api/__e2e/storage/:objectId", express.raw({ type: "*/*", limit: "25mb" }), handleE2EStorageUpload);
}
app.use(express.json({ limit: "256kb" }));
app.use(clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY),
})));
app.use("/api", router);
export default app;
//# sourceMappingURL=app.js.map
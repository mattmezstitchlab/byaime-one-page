import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  handleE2ETestServicesReady,
  handleE2EStorageUpload,
  isE2ETestServicesEnabled,
} from "./lib/e2eTestServices";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { isTrustedAppOrigin } from "./lib/security";
import { jsonErrorHandler } from "./middlewares/jsonErrorHandler";
import { resolveRequestId } from "./lib/requestId";
import { pool, schemaGuard } from "@workspace/db";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => resolveRequestId(req.headers["x-request-id"]),
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
  }),
);
app.use((req, res, next) => {
  const id = (req as any).id;
  if (id) res.setHeader("x-request-id", String(id));
  const originalJson = res.json.bind(res);
  (res as any).json = (body: any) => {
    if (body && typeof body === "object" && "error" in body && id && !("requestId" in body)) {
      return originalJson({ ...body, requestId: String(id) });
    }
    return originalJson(body);
  };
  next();
});
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (
    origin &&
    !isTrustedAppOrigin({
      origin,
      req,
      appUrl: process.env.APP_URL,
      environment: process.env.NODE_ENV,
    }) &&
    !["GET", "HEAD", "OPTIONS"].includes(req.method)
  ) {
    res.status(403).json({ error: "Origine non autorisée" });
    return;
  }
  next();
});
app.use(
  cors((req, callback) => {
    const origin =
      typeof req.headers.origin === "string" ? req.headers.origin : undefined;
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
  }),
);
if (isE2ETestServicesEnabled()) {
  app.get("/api/__e2e/ready", handleE2ETestServicesReady);
  app.put(
    "/api/__e2e/storage/:objectId",
    express.raw({ type: "*/*", limit: "25mb" }),
    handleE2EStorageUpload,
  );
}
app.use(express.json({ limit: "2mb" }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

/* Le schéma se vérifie tout seul, une fois par processus, avant la première
   route qui touche la base. `/api/healthz` reste hors de ce passage : il doit
   répondre même quand la base ne répond pas. */
const ensureSchemaOnce = schemaGuard(pool, logger);
app.use("/api", (req, _res, next) => {
  if (req.path === "/healthz") return next();
  void ensureSchemaOnce().then(() => next(), next);
});
app.use("/api", router);

/* En dernier : sans ce gestionnaire, la moindre erreur non rattrapée sort en
   page HTML (réponse par défaut d'Express) et le client qui lit `response.json()`
   affiche « Unexpected token '<'… ». C'est ce que `/ma-carte` montrait en
   production. Voir `src/lib/apiFailure.ts`. */
app.use(jsonErrorHandler);

export default app;

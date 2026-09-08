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

const app: Express = express();
const trustedOrigins = new Set(
  (process.env.REPLIT_DOMAINS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean)
    .flatMap((host) => [`https://${host}`, `http://${host}`]),
);
if (process.env.NODE_ENV !== "production") {
  trustedOrigins.add("http://localhost");
  trustedOrigins.add("http://127.0.0.1");
}

function isTrustedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (trustedOrigins.has(origin)) return true;
    return (
      process.env.NODE_ENV !== "production" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

app.use(
  pinoHttp({
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
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (
    origin &&
    !isTrustedOrigin(origin) &&
    !["GET", "HEAD", "OPTIONS"].includes(req.method)
  ) {
    res.status(403).json({ error: "Origine non autorisée" });
    return;
  }
  next();
});
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || isTrustedOrigin(origin)) callback(null, true);
      else callback(null, false);
    },
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
app.use(express.json({ limit: "256kb" }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;

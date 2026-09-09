import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler } from "express";

export function createRateLimit({ windowMs, max, key }: { windowMs: number; max: number; key: (req: Request) => string }): RequestHandler {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = key(req);
    const current = buckets.get(bucketKey);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
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

export function signUploadAuthorization(payload: Record<string, unknown>, secret: string): string {
  if (!secret) throw new Error("An upload signing secret is required");
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyUploadAuthorization(token: string, expected: Record<string, unknown>, secret: string, now = Date.now()): boolean {
  if (!secret) return false;
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return false;
  const expectedSignature = createHmac("sha256", secret).update(encoded).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(suppliedSignature, "base64url"); } catch { return false; }
  if (supplied.length !== expectedSignature.length || !timingSafeEqual(supplied, expectedSignature)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof payload.expiresAt !== "number" || payload.expiresAt < now) return false;
    return Object.entries(expected).every(([key, value]) => payload[key] === value);
  } catch {
    return false;
  }
}

export function safeDownloadName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f"\\]/g, "_").slice(0, 180) || "document";
}

export function uploadedObjectMetadataMatches(
  expected: { contentType: string; size: number },
  actual: { contentType?: unknown; size?: unknown },
): boolean {
  const actualType = String(actual.contentType || "").split(";", 1)[0].trim().toLowerCase();
  const expectedType = expected.contentType.trim().toLowerCase();
  const actualSize = Number(actual.size);
  return actualType === expectedType && Number.isSafeInteger(actualSize) && actualSize === expected.size;
}

function normalizedOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function firstForwardedValue(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const first = raw?.split(",")[0]?.trim();
  return first || undefined;
}

export function requestOrigin(
  req: Pick<Request, "headers">,
): string | undefined {
  const host = firstForwardedValue(req.headers["x-forwarded-host"]) || req.headers.host?.trim();
  if (!host) return undefined;
  const protocol = firstForwardedValue(req.headers["x-forwarded-proto"]) || "https";
  return normalizedOrigin(`${protocol}://${host}`);
}

export function configuredAppOrigin({
  appUrl,
  req,
  environment,
}: {
  appUrl?: string;
  req?: Pick<Request, "headers">;
  environment?: string;
}): string {
  const configured = normalizedOrigin(appUrl);
  if (configured) return configured;
  const inferred = req ? requestOrigin(req) : undefined;
  if (inferred) return inferred;
  if (environment === "production") {
    throw new Error("APP_URL is required when the public application URL cannot be inferred from the request");
  }
  return "http://localhost";
}

export function isTrustedAppOrigin({
  origin,
  req,
  appUrl,
  environment,
}: {
  origin: string;
  req: Pick<Request, "headers">;
  appUrl?: string;
  environment?: string;
}): boolean {
  const normalized = normalizedOrigin(origin);
  if (!normalized) return false;
  if (normalized === requestOrigin(req)) return true;
  if (normalized === normalizedOrigin(appUrl)) return true;
  if (environment !== "production") {
    const hostname = new URL(normalized).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  }
  return false;
}
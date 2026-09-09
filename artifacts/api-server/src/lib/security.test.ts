import { describe, expect, it } from "vitest";
import {
  configuredAppOrigin,
  isTrustedAppOrigin,
  requestOrigin,
  safeDownloadName,
  signUploadAuthorization,
  uploadedObjectMetadataMatches,
  verifyUploadAuthorization,
} from "./security";

describe("upload authorization", () => {
  const secret = "test-secret-with-enough-entropy";
  const payload = {
    projectId: "79239f6e-c987-4b4f-bbda-53c902f19e63",
    objectPath: "/objects/uploads/1c60e503-4371-45b1-a84f-b3be163d23d8",
    name: "contrat.pdf",
    size: 42,
    contentType: "application/pdf",
    userId: "user_123",
    expiresAt: 2_000,
  };

  it("accepts only the exact signed upload before expiry", () => {
    const token = signUploadAuthorization(payload, secret);
    expect(verifyUploadAuthorization(token, { ...payload, expiresAt: undefined }, secret, 1_000)).toBe(false);
    expect(verifyUploadAuthorization(token, {
      projectId: payload.projectId,
      objectPath: payload.objectPath,
      name: payload.name,
      size: payload.size,
      contentType: payload.contentType,
      userId: payload.userId,
    }, secret, 1_000)).toBe(true);
  });

  it("rejects tampering, another user and an expired token", () => {
    const token = signUploadAuthorization(payload, secret);
    expect(verifyUploadAuthorization(`${token}x`, { userId: payload.userId }, secret, 1_000)).toBe(false);
    expect(verifyUploadAuthorization(token, { userId: "user_456" }, secret, 1_000)).toBe(false);
    expect(verifyUploadAuthorization(token, { userId: payload.userId }, secret, 2_001)).toBe(false);
  });
});

describe("security helpers", () => {
  it("sanitizes download header filenames", () => {
    expect(safeDownloadName("devis\r\nX-Evil: yes.pdf")).toBe("devis__X-Evil: yes.pdf");
    expect(safeDownloadName("")).toBe("document");
  });

  it("uses configured domains and fails closed in production", () => {
    expect(configuredAppOrigin({
      appUrl: "https://aime.example/custom/path",
      environment: "production",
    })).toBe("https://aime.example");
    expect(configuredAppOrigin({
      req: {
        headers: {
          host: "preview.example",
          "x-forwarded-proto": "https",
        },
      },
      environment: "production",
    })).toBe("https://preview.example");
    expect(() => configuredAppOrigin({ environment: "production" })).toThrow();
    expect(configuredAppOrigin({ environment: "development" })).toBe("http://localhost");
  });

  it("trusts same-origin and configured origins", () => {
    const req = {
      headers: {
        host: "preview.example",
        origin: "https://preview.example",
        "x-forwarded-proto": "https",
      },
    };
    expect(requestOrigin(req)).toBe("https://preview.example");
    expect(isTrustedAppOrigin({
      origin: "https://preview.example",
      req,
      environment: "production",
    })).toBe(true);
    expect(isTrustedAppOrigin({
      origin: "https://aime.example",
      req,
      appUrl: "https://aime.example",
      environment: "production",
    })).toBe(true);
    expect(isTrustedAppOrigin({
      origin: "https://evil.example",
      req,
      appUrl: "https://aime.example",
      environment: "production",
    })).toBe(false);
  });

  it("rejects uploaded objects whose real type or size differs from the signed claims", () => {
    const expected = { contentType: "image/jpeg", size: 42 };
    expect(uploadedObjectMetadataMatches(expected, { contentType: "image/jpeg", size: "42" })).toBe(true);
    expect(uploadedObjectMetadataMatches(expected, { contentType: "text/html", size: "42" })).toBe(false);
    expect(uploadedObjectMetadataMatches(expected, { contentType: "image/jpeg", size: "42000" })).toBe(false);
    expect(uploadedObjectMetadataMatches(expected, { contentType: "image/jpeg; charset=utf-8", size: "42" })).toBe(true);
  });
});
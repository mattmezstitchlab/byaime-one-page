import { randomUUID } from "crypto";
import { Readable } from "stream";
import { File, Storage } from "@google-cloud/storage";

import {
  canAccessObject,
  getObjectAclPolicy,
  ObjectAclPolicy,
  ObjectPermission,
  setObjectAclPolicy,
} from "./objectAcl";
import {
  createE2EObjectFile,
  e2eObjectId,
  e2eUploadURL,
  isE2ETestServicesEnabled,
} from "./e2eTestServices";

function objectStorageProvider(): string {
  return (process.env.OBJECT_STORAGE_PROVIDER || "gcs").trim().toLowerCase();
}

function createObjectStorageClient(): Storage {
  const provider = objectStorageProvider();
  if (provider !== "gcs") {
    throw new Error(
      `Unsupported OBJECT_STORAGE_PROVIDER "${provider}". Supported providers: gcs`,
    );
  }

  const projectId = process.env.GCP_PROJECT_ID || undefined;
  const clientEmail = process.env.GCP_CLIENT_EMAIL || undefined;
  const privateKey = process.env.GCP_PRIVATE_KEY
    ? process.env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (clientEmail && privateKey) {
    return new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
  }

  return new Storage({ projectId });
}

export const objectStorageClient = createObjectStorageClient();

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const bucket = process.env.OBJECT_STORAGE_BUCKET?.trim() || "";
    const prefixesStr = process.env.OBJECT_STORAGE_PUBLIC_PREFIXES || "";
    if (prefixesStr) {
      const prefixes = Array.from(
        new Set(
          prefixesStr
            .split(",")
            .map((path) => path.trim())
            .filter((path) => path.length > 0),
        ),
      );
      return prefixes.map((prefix) => {
        if (prefix.startsWith("/")) return prefix;
        if (!bucket) {
          throw new Error(
            "OBJECT_STORAGE_BUCKET is required when OBJECT_STORAGE_PUBLIC_PREFIXES uses relative prefixes.",
          );
        }
        const normalizedPrefix = trimSlashes(prefix);
        return normalizedPrefix
          ? `/${bucket}/${normalizedPrefix}`
          : `/${bucket}`;
      });
    }

    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0),
      ),
    );
    if (paths.length === 0) {
      throw new Error(
        "Object storage public paths are not configured. Set OBJECT_STORAGE_PUBLIC_PREFIXES " +
          "(preferred) or PUBLIC_OBJECT_SEARCH_PATHS (legacy).",
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const bucket = process.env.OBJECT_STORAGE_BUCKET?.trim() || "";
    if (bucket) {
      const prefix = trimSlashes(process.env.OBJECT_STORAGE_PRIVATE_PREFIX || "");
      return prefix ? `/${bucket}/${prefix}` : `/${bucket}`;
    }

    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "Object storage private path is not configured. Set OBJECT_STORAGE_BUCKET " +
          "(and optional OBJECT_STORAGE_PRIVATE_PREFIX) or PRIVATE_OBJECT_DIR (legacy).",
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(
    file: File,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type":
        (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) {
      headers["Content-Length"] = String(metadata.size);
    }

    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(): Promise<string> {
    if (isE2ETestServicesEnabled()) {
      return e2eUploadURL(randomUUID());
    }
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "Object storage private path is not configured. Set OBJECT_STORAGE_BUCKET " +
          "(and optional OBJECT_STORAGE_PRIVATE_PREFIX) or PRIVATE_OBJECT_DIR (legacy).",
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (isE2ETestServicesEnabled()) {
      const objectId = e2eObjectId(objectPath);
      if (!objectId) throw new ObjectNotFoundError();
      const file = createE2EObjectFile(objectId);
      const [exists] = await file.exists();
      if (!exists) throw new ObjectNotFoundError();
      return file;
    }
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (isE2ETestServicesEnabled()) {
      const objectId = e2eObjectId(rawPath);
      return objectId ? `/objects/uploads/${objectId}` : rawPath;
    }
    const rawObjectPath = objectPathFromRawValue(rawPath);
    if (!rawObjectPath) return rawPath;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const action =
    method === "PUT"
      ? "write"
      : method === "DELETE"
        ? "delete"
        : "read";

  const [signedURL] = await objectStorageClient
    .bucket(bucketName)
    .file(objectName)
    .getSignedUrl({
      version: "v4",
      action,
      expires: Date.now() + ttlSec * 1000,
    });

  return signedURL;
}

function trimSlashes(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

function objectPathFromRawValue(rawPath: string): string | null {
  if (rawPath.startsWith("/")) return rawPath;
  if (!rawPath.startsWith("http://") && !rawPath.startsWith("https://")) {
    return null;
  }

  const url = new URL(rawPath);
  const pathname = url.pathname.startsWith("/") ? url.pathname : `/${url.pathname}`;
  if (url.hostname.endsWith(".storage.googleapis.com")) {
    const bucketName = url.hostname.slice(
      0,
      -".storage.googleapis.com".length,
    );
    return `/${bucketName}${pathname}`;
  }
  return pathname;
}

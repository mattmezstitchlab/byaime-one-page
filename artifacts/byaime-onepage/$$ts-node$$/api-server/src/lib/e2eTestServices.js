import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
export function isE2ETestServicesEnabled() {
    return (process.env.NODE_ENV !== "production" && process.env.AIME_E2E_RUN === "1");
}
function storageRoot() {
    const root = process.env.AIME_E2E_STORAGE_DIR;
    if (!root)
        throw new Error("AIME_E2E_STORAGE_DIR is required when AIME_E2E_RUN=1");
    return path.resolve(root);
}
function safeObjectId(value) {
    if (!/^[a-f0-9-]{36}$/i.test(value))
        throw new Error("Invalid E2E object id");
    return value;
}
function objectFilePath(objectId) {
    return path.join(storageRoot(), safeObjectId(objectId));
}
function metadataPath(objectId) {
    return `${objectFilePath(objectId)}.metadata.json`;
}
export const handleE2EStorageUpload = async (req, res) => {
    try {
        const objectId = safeObjectId(String(req.params.objectId));
        await mkdir(storageRoot(), { recursive: true });
        await writeFile(objectFilePath(objectId), Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? ""));
        res.sendStatus(200);
    }
    catch (error) {
        req.log.error({ error }, "E2E storage upload failed");
        res.status(500).json({ error: "E2E storage upload failed" });
    }
};
export const handleE2ETestServicesReady = async (req, res) => {
    try {
        await mkdir(storageRoot(), { recursive: true });
        const emailResponse = await sendE2ETestEmail();
        if (!emailResponse.ok)
            throw new Error(`E2E email transport returned ${emailResponse.status}`);
        res.json({ storage: "ready", email: "ready" });
    }
    catch (error) {
        req.log.error({ error }, "E2E test services are unavailable");
        res.status(503).json({ error: "E2E test services are unavailable" });
    }
};
export function createE2EObjectFile(objectId) {
    const id = safeObjectId(objectId);
    const filePath = objectFilePath(id);
    const file = {
        name: `uploads/${id}`,
        async exists() {
            try {
                await stat(filePath);
                return [true];
            }
            catch {
                return [false];
            }
        },
        async getMetadata() {
            const fileStat = await stat(filePath);
            let metadata = {};
            try {
                metadata = JSON.parse(await readFile(metadataPath(id), "utf8"));
            }
            catch {
                // Metadata is optional until the upload is finalized.
            }
            return [
                {
                    size: String(fileStat.size),
                    contentType: "application/octet-stream",
                    ...metadata,
                },
            ];
        },
        async setMetadata(value) {
            await writeFile(metadataPath(id), JSON.stringify(value));
            return [value];
        },
        createReadStream() {
            return createReadStream(filePath);
        },
        async delete() {
            await Promise.all([
                rm(filePath, { force: true }),
                rm(metadataPath(id), { force: true }),
            ]);
            return [{}];
        },
    };
    return file;
}
export function e2eUploadURL(objectId) {
    safeObjectId(objectId);
    return `/api/__e2e/storage/${objectId}`;
}
export function e2eObjectId(rawPath) {
    const match = rawPath.match(/\/(?:objects\/uploads|api\/__e2e\/storage)\/([a-f0-9-]{36})(?:$|[?])/i);
    return match?.[1] ?? null;
}
export async function sendE2ETestEmail() {
    if (!isE2ETestServicesEnabled())
        throw new Error("E2E email transport is disabled");
    return new Response(JSON.stringify({ id: `e2e-${Date.now()}` }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
    });
}
//# sourceMappingURL=e2eTestServices.js.map
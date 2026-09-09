import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type BridgeConfig = {
  apiBase: string;
  bridgeId: string;
  sessionToken: string;
};

type ScanJob = {
  id: string;
  projectId: string;
  folders: string[];
};

type ImportJob = {
  id: string;
  projectId: string;
  localReferenceId: string;
  filename: string;
  relativePath: string;
  sourceFolder: string;
  size: number;
};

const CONFIG_PATH = path.join(os.homedir(), ".aime-local-bridge.json");
const MAX_SCAN_FILES = 5_000;

function parseArg(name: string): string | undefined {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function loadConfig(): Promise<BridgeConfig | null> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw) as BridgeConfig;
  } catch {
    return null;
  }
}

async function saveConfig(config: BridgeConfig): Promise<void> {
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

async function api<T>(base: string, route: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${route}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string })?.error || `HTTP ${response.status}`);
  return body as T;
}

function classify(name: string): string {
  const ext = path.extname(name).replace(/^\./, "").toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "webp", "gif", "heic"].includes(ext)) return "image";
  if (["mp4", "mov", "m4v", "avi"].includes(ext)) return "video";
  if (["mp3", "m4a", "wav", "aac", "flac"].includes(ext)) return "audio";
  if (["txt", "md"].includes(ext)) return "text";
  if (ext === "csv") return "csv";
  if (ext === "json") return "json";
  if (["zip", "rar", "7z"].includes(ext)) return "archive";
  return "other";
}

function contentTypeFromName(name: string): string {
  const ext = path.extname(name).replace(/^\./, "").toLowerCase();
  const mapping: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    mp4: "video/mp4",
  };
  return mapping[ext] ?? "application/octet-stream";
}

function buildLocalIdentifier(sourceFolder: string, relativePath: string, size: number, modifiedAt: string): string {
  const hash = createHash("sha256");
  hash.update(sourceFolder);
  hash.update("\n");
  hash.update(relativePath.replaceAll("\\", "/"));
  hash.update("\n");
  hash.update(String(size));
  hash.update("\n");
  hash.update(modifiedAt);
  return hash.digest("hex");
}

async function fingerprintFile(filePath: string): Promise<string> {
  const metadata = await stat(filePath);
  const hash = createHash("sha256");
  hash.update(`size:${metadata.size}\nmtime:${metadata.mtimeMs}\n`);
  const bytes = await readFile(filePath);
  hash.update(bytes.subarray(0, Math.min(bytes.byteLength, 1024 * 1024)));
  return hash.digest("hex");
}

async function walk(folder: string, root = folder, out: string[] = []): Promise<string[]> {
  if (out.length >= MAX_SCAN_FILES) return out;
  let entries: Array<{ isDirectory: () => boolean; isFile: () => boolean; name: string }> = [];
  try {
    entries = await readdir(folder, { withFileTypes: true, encoding: "utf8" });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (out.length >= MAX_SCAN_FILES) break;
    const absolute = path.join(folder, entry.name);
    if (entry.isDirectory()) await walk(absolute, root, out);
    else if (entry.isFile()) out.push(path.relative(root, absolute));
  }
  return out;
}

function detectDocumentType(name: string): string {
  const value = name.toLowerCase();
  if (/\bdevis\b|\bquote\b/.test(value)) return "devis";
  if (/\bcontrat\b|\bcontract\b/.test(value)) return "contrat";
  if (/\bfacture\b|\binvoice\b/.test(value)) return "facture";
  if (/\breservation\b|\bbooking\b/.test(value)) return "reservation";
  if (/\bguest[-_\s]?list\b|\binvit/.test(value)) return "liste_invites";
  if (/\bplaylist\b/.test(value)) return "playlist";
  return "autre";
}

function extractEntities(name: string) {
  const text = name.toLowerCase();
  return {
    events: ["mariage", "wedding", "voyage", "immobilier", "entreprise"].filter((token) => text.includes(token)),
    resources: ["traiteur", "hotel", "dj", "photo", "video", "budget"].filter((token) => text.includes(token)),
    places: ["paris", "lille", "lyon", "marseille", "bordeaux", "nantes"].filter((token) => text.includes(token)),
  };
}

async function runScanJob(config: BridgeConfig, job: ScanJob): Promise<void> {
  const results: Array<Record<string, unknown>> = [];
  for (const sourceFolder of job.folders) {
    const relativePaths = await walk(sourceFolder);
    for (const relativePath of relativePaths) {
      const absolutePath = path.join(sourceFolder, relativePath);
      try {
        const fileStat = await stat(absolutePath);
        const modifiedAt = fileStat.mtime.toISOString();
        const fingerprint = await fingerprintFile(absolutePath);
        const name = path.basename(relativePath);
        results.push({
          name,
          extension: path.extname(name).replace(/^\./, "").toLowerCase(),
          fileType: classify(name),
          documentType: detectDocumentType(name),
          size: fileStat.size,
          modifiedAt,
          relativePath: relativePath.replaceAll("\\", "/"),
          sourceFolder,
          localIdentifier: buildLocalIdentifier(sourceFolder, relativePath, fileStat.size, modifiedAt),
          fingerprint,
          entities: extractEntities(name),
          metadata: {},
        });
      } catch {
        // ignored
      }
    }
  }
  await api(config.apiBase, `/aime-local/bridge/scan-jobs/${job.id}/result`, {
    method: "POST",
    body: JSON.stringify({
      sessionToken: config.sessionToken,
      results,
    }),
  });
  console.log(`Scan terminé (${results.length} fichiers): ${job.id}`);
}

async function runImportJob(config: BridgeConfig, job: ImportJob): Promise<void> {
  const fullPath = path.join(job.sourceFolder, job.relativePath);
  const fileStat = await stat(fullPath);
  const contentType = contentTypeFromName(job.filename);
  const ticket = await api<{ uploadURL: string; objectPath: string; finalizeToken: string }>(
    config.apiBase,
    `/aime-local/bridge/import-jobs/${job.id}/request-upload-url`,
    {
      method: "POST",
      body: JSON.stringify({
        sessionToken: config.sessionToken,
        projectId: job.projectId,
        name: job.filename,
        contentType,
        size: fileStat.size,
      }),
    },
  );
  const uploadResponse = await fetch(ticket.uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: await readFile(fullPath),
  });
  if (!uploadResponse.ok) throw new Error(`Upload objet échoué (${uploadResponse.status})`);
  await api(config.apiBase, `/aime-local/bridge/import-jobs/${job.id}/finalize`, {
    method: "POST",
    body: JSON.stringify({
      sessionToken: config.sessionToken,
      projectId: job.projectId,
      localReferenceId: job.localReferenceId,
      name: job.filename,
      contentType,
      size: fileStat.size,
      objectPath: ticket.objectPath,
      finalizeToken: ticket.finalizeToken,
    }),
  });
  console.log(`Import terminé: ${job.filename}`);
}

async function pair(apiBase: string, token: string): Promise<BridgeConfig> {
  const bridgeId = parseArg("bridge-id") ?? `${os.hostname()}-${randomUUID().slice(0, 8)}`;
  const response = await api<{ sessionToken: string }>(apiBase, "/aime-local/bridge/pair", {
    method: "POST",
    body: JSON.stringify({
      token,
      bridgeId,
      bridgeVersion: "mvp-0.1.0",
    }),
  });
  const config: BridgeConfig = { apiBase, bridgeId, sessionToken: response.sessionToken };
  await saveConfig(config);
  return config;
}

async function loop(config: BridgeConfig): Promise<void> {
  while (true) {
    try {
      await api(config.apiBase, "/aime-local/bridge/heartbeat", {
        method: "POST",
        body: JSON.stringify({ sessionToken: config.sessionToken }),
      });
      const scanPayload = await api<{ job: ScanJob | null }>(
        config.apiBase,
        `/aime-local/bridge/scan-jobs/next?sessionToken=${encodeURIComponent(config.sessionToken)}`,
      );
      if (scanPayload.job) await runScanJob(config, scanPayload.job);
      const importPayload = await api<{ job: ImportJob | null }>(
        config.apiBase,
        `/aime-local/bridge/import-jobs/next?sessionToken=${encodeURIComponent(config.sessionToken)}`,
      );
      if (importPayload.job) await runImportJob(config, importPayload.job);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
    }
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
}

async function main(): Promise<void> {
  const apiBase = (parseArg("api-base") ?? "http://localhost:5000/api").replace(/\/$/, "");
  const pairingToken = parseArg("pairing-token");
  const loaded = await loadConfig();
  const config = pairingToken ? await pair(apiBase, pairingToken) : loaded;
  if (!config) {
    console.error("Session introuvable. Lancez avec --pairing-token <token>.");
    process.exit(1);
  }
  console.log(`Bridge connecté (${config.bridgeId}) vers ${config.apiBase}`);
  await loop(config);
}

void main();

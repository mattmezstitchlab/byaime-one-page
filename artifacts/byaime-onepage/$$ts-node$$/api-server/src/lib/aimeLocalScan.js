import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
const EXT_TO_TYPE = {
    pdf: "pdf",
    jpg: "image",
    jpeg: "image",
    png: "image",
    webp: "image",
    gif: "image",
    heic: "image",
    mp4: "video",
    mov: "video",
    m4v: "video",
    avi: "video",
    mp3: "audio",
    m4a: "audio",
    wav: "audio",
    aac: "audio",
    flac: "audio",
    txt: "text",
    md: "text",
    csv: "csv",
    json: "json",
    zip: "archive",
    rar: "archive",
    "7z": "archive",
    doc: "document",
    docx: "document",
    xls: "document",
    xlsx: "document",
    ppt: "document",
    pptx: "document",
};
const DOCUMENT_HINTS = [
    { type: "devis", patterns: [/\bdevis\b/i, /\bquote\b/i, /\bestim(ation|ate)\b/i] },
    { type: "contrat", patterns: [/\bcontrat\b/i, /\bcontract\b/i, /\bagreement\b/i] },
    { type: "facture", patterns: [/\bfacture\b/i, /\binvoice\b/i, /\brecu\b/i, /\breçu\b/i] },
    { type: "reservation", patterns: [/\breserv(ation|e)\b/i, /\bbooking\b/i, /\bbillet\b/i, /\bticket\b/i] },
    { type: "liste_invites", patterns: [/\binvit(es|és?)\b/i, /\bguest[-_\s]?list\b/i] },
    { type: "playlist", patterns: [/\bplaylist\b/i, /\bmusic\b/i, /\bset[-_\s]?list\b/i] },
    { type: "planning", patterns: [/\bplanning\b/i, /\bschedule\b/i, /\btimeline\b/i, /\bprogramme\b/i] },
];
const EVENT_HINTS = ["mariage", "wedding", "voyage", "travel", "immobilier", "real-estate", "entreprise", "business"];
const RESOURCE_HINTS = ["traiteur", "cater", "hotel", "dj", "photo", "video", "fleur", "transport", "budget", "provider"];
function emptyEntities() {
    return {
        people: [],
        places: [],
        dates: [],
        amounts: [],
        events: [],
        resources: [],
        organizations: [],
    };
}
function unique(values) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 12);
}
export function normalizeRelativePath(value) {
    const unix = value.replaceAll("\\", "/");
    const normalized = path.posix
        .normalize(unix)
        .replace(/^(\.\.\/)+/, "")
        .replace(/^\/+/, "");
    return normalized === "." ? "" : normalized;
}
export function classifyFileType(fileName) {
    const extension = path.extname(fileName).replace(/^\./, "").toLowerCase();
    return EXT_TO_TYPE[extension] ?? "other";
}
export function classifyDocumentType(fileName, snippet = "") {
    const haystack = `${fileName} ${snippet}`.toLowerCase();
    for (const hint of DOCUMENT_HINTS) {
        if (hint.patterns.some((pattern) => pattern.test(haystack)))
            return hint.type;
    }
    return "autre";
}
export function buildLocalIdentifier(input) {
    const hash = createHash("sha256");
    hash.update(input.sourceFolder);
    hash.update("\n");
    hash.update(normalizeRelativePath(input.relativePath));
    hash.update("\n");
    hash.update(String(input.size));
    hash.update("\n");
    hash.update(input.modifiedAt);
    return hash.digest("hex");
}
export async function fingerprintFile(filePath) {
    const metadata = await stat(filePath);
    const hash = createHash("sha256");
    hash.update(`size:${metadata.size}\nmtime:${metadata.mtimeMs}\n`);
    await new Promise((resolve, reject) => {
        const stream = createReadStream(filePath, { start: 0, end: Math.max(0, Math.min(metadata.size - 1, 1024 * 1024 - 1)) });
        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolve());
        stream.on("error", reject);
    });
    return hash.digest("hex");
}
export function extractLightEntities(fileName, snippet = "") {
    const source = `${fileName}\n${snippet}`;
    const lower = source.toLowerCase();
    const entities = emptyEntities();
    entities.dates = unique([
        ...source.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [],
        ...source.match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g) ?? [],
        ...source.match(/\b\d{1,2}\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+\d{4}\b/gi) ?? [],
    ]);
    entities.amounts = unique([
        ...source.match(/\b\d{1,3}(?:[ .,\u00A0]?\d{3})*(?:[.,]\d{2})?\s?(?:€|eur|euros?|usd|\$)/gi) ?? [],
        ...source.match(/(?:€|\$)\s?\d{1,3}(?:[ .,\u00A0]?\d{3})*(?:[.,]\d{2})?\b/gi) ?? [],
    ]);
    entities.people = unique(source.match(/\b[A-ZÉÈÊËÀÂÎÏÔÖÙÛÜÇ][a-zéèêëàâîïôöùûüç'-]+\s+[A-ZÉÈÊËÀÂÎÏÔÖÙÛÜÇ][a-zéèêëàâîïôöùûüç'-]+\b/g) ?? []);
    entities.places = unique(source.match(/\b(?:Paris|Lille|Lyon|Marseille|Bordeaux|Strasbourg|Nantes|Toulouse|Nice|Bruxelles|Londres|London)\b/gi) ?? []);
    entities.organizations = unique(source.match(/\b(?:SARL|SAS|EURL|SCI|Mairie|Hôtel|Hotel|Studio|Agence)\s+[A-Za-z0-9'’\-\s]+\b/g) ?? []);
    entities.events = unique(EVENT_HINTS.filter((token) => lower.includes(token)));
    entities.resources = unique(RESOURCE_HINTS.filter((token) => lower.includes(token)));
    return entities;
}
function projectTokens(projectData) {
    const universe = String(projectData.universe ?? "");
    const title = String(projectData.title ?? "");
    const city = typeof projectData.city === "object" ? String(projectData.city.value ?? "") : "";
    const venue = typeof projectData.venue === "object" ? String(projectData.venue.value ?? "") : "";
    const providers = Array.isArray(projectData.providers)
        ? projectData.providers.flatMap((provider) => {
            if (!provider || typeof provider !== "object")
                return [];
            const row = provider;
            return [String(row.name ?? ""), String(row.role ?? ""), String(row.category ?? "")];
        })
        : [];
    return unique([universe, title, city, venue, ...providers].map((value) => value.toLowerCase()));
}
export function suggestForProject(file, projectData) {
    const tokens = projectTokens(projectData);
    const haystack = `${file.name} ${file.entities.events.join(" ")} ${file.entities.resources.join(" ")} ${file.entities.places.join(" ")}`.toLowerCase();
    const matched = tokens.filter((token) => token.length >= 3 && haystack.includes(token));
    const weddingHint = haystack.includes("mariage") || haystack.includes("wedding");
    const financeHint = ["devis", "facture", "contrat"].includes(file.documentType);
    const score = Math.min(1, (matched.length * 0.18) + (weddingHint ? 0.28 : 0) + (financeHint ? 0.22 : 0));
    if (score < 0.35)
        return null;
    return {
        score,
        reason: matched.length
            ? `Correspondances détectées: ${matched.slice(0, 4).join(", ")}`
            : "Le type de document semble pertinent pour ce Monde.",
        actions: ["link_project", "add_timeline", "import", "ignore"],
    };
}
//# sourceMappingURL=aimeLocalScan.js.map
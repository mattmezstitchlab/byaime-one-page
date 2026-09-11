/*
 * Accès aux fichiers de l'ordinateur (Mac comme PC) depuis le navigateur.
 *
 * Deux voies, dans l'ordre de préférence :
 *  1. File System Access API (`showDirectoryPicker`) — Chromium, HTTPS ou localhost ;
 *  2. `<input type="file" webkitdirectory>` — Chrome, Edge, Firefox ; Safari ne le
 *     propose pas, on retombe alors sur une sélection de fichiers à la main.
 * Le pont « AIME LOCAL » (script lancé sur la machine) reste la voie avancée : il
 * sait analyser sans importer, mais exige Node, pnpm et une API auto-hébergée.
 */

export type LocalImportPolicy = {
  /** Extensions (`.pdf`) ou types MIME (`image/jpeg`) acceptés. */
  accept: string[];
  maxBytes: number;
  maxFiles: number;
  maxDepth: number;
};

export const LOCAL_IMPORT_POLICY: LocalImportPolicy = {
  accept: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".mp4", ".csv", ".txt", "application/pdf", "image/jpeg", "image/png", "image/webp", "video/mp4", "text/csv", "text/plain"],
  maxBytes: 25 * 1024 * 1024,
  maxFiles: 200,
  maxDepth: 4,
};

export type LocalCandidate = {
  name: string;
  /** Chemin relatif dans le dossier choisi, avec des `/`. */
  path: string;
  size: number;
  type: string;
};

export type LocalDecision<T extends LocalCandidate> = {
  accepted: T[];
  skipped: Array<{ item: T; reason: string }>;
};

const JUNK = /(^|\/)(\.ds_store|thumbs\.db|desktop\.ini)$|(^|\/)__macosx\/|(^|\/)\./i;

export function isAcceptedLocally(item: LocalCandidate, policy: LocalImportPolicy = LOCAL_IMPORT_POLICY) {
  const name = item.name.toLowerCase();
  const path = item.path.toLowerCase();
  const extension = name.includes(".") ? `.${name.split(".").pop()}` : "";
  const byExtension = policy.accept.includes(extension);
  const byType = Boolean(item.type) && policy.accept.includes(item.type.toLowerCase());
  return byExtension || byType;
}

/** Trie ce qui peut être importé, avec une raison lisible pour le reste. */
export function planLocalImports<T extends LocalCandidate>(items: T[], policy: LocalImportPolicy = LOCAL_IMPORT_POLICY): LocalDecision<T> {
  const accepted: T[] = [];
  const skipped: Array<{ item: T; reason: string }> = [];
  for (const item of items) {
    const path = item.path.toLowerCase();
    const depth = item.path.split("/").length - 1;
    if (JUNK.test(path)) {
      skipped.push({ item, reason: "fichier système ignoré" });
    } else if (!isAcceptedLocally(item, policy)) {
      skipped.push({ item, reason: "format non accepté par ce Monde" });
    } else if (item.size === 0) {
      skipped.push({ item, reason: "fichier vide" });
    } else if (item.size > policy.maxBytes) {
      skipped.push({ item, reason: `plus gros que ${Math.round(policy.maxBytes / 1024 / 1024)} Mo` });
    } else if (accepted.length >= policy.maxFiles) {
      skipped.push({ item, reason: `au-delà de ${policy.maxFiles} fichiers` });
    } else if (depth > policy.maxDepth) {
      skipped.push({ item, reason: "trop profond dans l'arborescence" });
    } else {
      accepted.push(item);
    }
  }
  return { accepted, skipped };
}

export type LocalImportSupport = {
  /** File System Access API : le dossier entier est lisible, case par case. */
  picker: boolean;
  /** `<input webkitdirectory>` : le dossier est lisible mais sans reprise sur erreur. */
  directoryInput: boolean;
  /** Les deux voies exigent HTTPS ou localhost. */
  secureContext: boolean;
};

export function localImportSupport(): LocalImportSupport {
  if (typeof window === "undefined") return { picker: false, directoryInput: false, secureContext: false };
  const withPicker = window as Window & { showDirectoryPicker?: unknown };
  let directoryInput = false;
  try {
    directoryInput = "webkitdirectory" in document.createElement("input");
  } catch {
    directoryInput = false;
  }
  return {
    picker: typeof withPicker.showDirectoryPicker === "function" && window.isSecureContext,
    directoryInput,
    secureContext: Boolean(window.isSecureContext),
  };
}

type FsHandle = {
  name: string;
  kind: "file" | "directory";
  values?: () => AsyncIterableIterator<FsHandle>;
  getFile?: () => Promise<File>;
};

/** Parcourt un handle de dossier, sans dépasser la profondeur ni le nombre de fichiers. */
export async function collectDirectoryHandles(
  root: FsHandle,
  policy: LocalImportPolicy = LOCAL_IMPORT_POLICY,
): Promise<Array<{ path: string; file: File }>> {
  const found: Array<{ path: string; file: File }> = [];
  const walk = async (handle: FsHandle, prefix: string, depth: number) => {
    if (found.length >= policy.maxFiles || depth > policy.maxDepth) return;
    if (!handle.values) return;
    for await (const child of handle.values()) {
      if (found.length >= policy.maxFiles) return;
      const path = prefix ? `${prefix}/${child.name}` : child.name;
      if (child.kind === "directory") await walk(child, path, depth + 1);
      else if (child.getFile) {
        try {
          found.push({ path, file: await child.getFile() });
        } catch {
          // fichier illisible (droits, volume éjecté) : on passe au suivant
        }
      }
    }
  };
  await walk(root, "", 1);
  return found;
}

/** Ouvre le sélecteur de dossier natif ; renvoie null si l'utilisateur annule. */
export async function pickLocalFolder(policy: LocalImportPolicy = LOCAL_IMPORT_POLICY): Promise<Array<{ path: string; file: File }> | null> {
  const withPicker = typeof window !== "undefined" ? (window as Window & { showDirectoryPicker?: (options?: { mode?: "read" }) => Promise<FsHandle> }) : undefined;
  if (!withPicker?.showDirectoryPicker || !window.isSecureContext) return null;
  try {
    const handle = await withPicker.showDirectoryPicker({ mode: "read" });
    return await collectDirectoryHandles(handle, policy);
  } catch (error) {
    // AbortError = fenêtre annulée : ce n'est pas une panne.
    if (error instanceof Error && error.name === "AbortError") return null;
    throw error;
  }
}

/** Chemin le plus court qui reste lisible pour un humain (« Devis/Dupont.pdf »). */
export function readableLocalPath(path: string, max = 34) {
  if (path.length <= max) return path;
  return `…${path.slice(-max)}`;
}

/** Les sélecteurs de dossiers ne renvoient pas toujours un type MIME : on le déduit du nom. */
export function guessMimeType(name: string) {
  const extension = name.toLowerCase().split(".").pop() ?? "";
  const mapping: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    mp4: "video/mp4",
    mov: "video/quicktime",
    csv: "text/csv",
    txt: "text/plain",
    md: "text/markdown",
  };
  return mapping[extension] ?? "application/octet-stream";
}

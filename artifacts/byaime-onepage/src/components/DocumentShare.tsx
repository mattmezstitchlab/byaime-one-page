import { useRef, useState } from "react";
import { Check, FileUp, LoaderCircle, X } from "lucide-react";
import { useProject } from "@/store/project-store";
import { useI18n } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { classifyDocument } from "@/lib/assistant";
import { getFolderLabel, type WeddingFolderId } from "@/lib/wedding-folders";
import type { Document } from "@/lib/types";
import { DossierImport } from "@/components/DossierImport";
import { isDossierCandidate, parseDispooDossierText, type DispooDossierV1 } from "@/lib/dispoo-dossier";
import { normalizeUniversalJson, type UniversalDrop } from "@/lib/universal-import";

const MAX_BYTES = 6 * 1024 * 1024;
const MAX_INLINE_BYTES = 1024 * 1024;
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "video/mp4"];
const DOSSIER_ACCEPT = ["application/json", ".json"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function kindFromName(name: string): Document["kind"] {
  if (/(facture|invoice|avoir)/i.test(name)) return "facture";
  if (/(contrat|contract|convention)/i.test(name)) return "contrat";
  if (/(devis|quote)/i.test(name)) return "devis";
  return "autre";
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(payload?.error || `Erreur ${response.status}`);
  return payload as T;
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(new Error("Lecture impossible")));
    reader.readAsText(file);
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(new Error("Lecture impossible")));
    reader.readAsDataURL(file);
  });
}

/**
 * Le deuxième verbe de l'assistant : partager un document. AIME devine le
 * dossier universel (serveur si le Monde est synchronisé, devinette locale
 * sinon), l'utilisateur confirme, puis le fichier rejoint le stockage privé du
 * Monde — ou reste dans le navigateur pour les Mondes locaux, en le disant.
 * Exception : un Dossier Jour J (JSON Dispoo) ne se classe pas — il prépare le
 * Monde via l'écran de propagation.
 */
export function DocumentShare() {
  const { project, addEntity, canEdit } = useProject();
  const { t, locale } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [folder, setFolder] = useState<WeddingFolderId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [dossier, setDossier] = useState<DispooDossierV1 | null>(null);
  const [dossierName, setDossierName] = useState("");
  const [dossierSource, setDossierSource] = useState<"dispoo" | "universal">("dispoo");
  const [dossierDropped, setDossierDropped] = useState<UniversalDrop[]>([]);
  const [dossierErrors, setDossierErrors] = useState<string[]>([]);

  const reset = () => {
    setFile(null);
    setFolder(null);
    setError("");
    setDossier(null);
    setDossierName("");
    setDossierSource("dispoo");
    setDossierDropped([]);
    setDossierErrors([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const pick = async (candidate: File | undefined) => {
    setError("");
    setDone("");
    setDossierErrors([]);
    if (!candidate) return;
    /* Un Dossier Jour J ne se classe pas : il prépare le Monde. */
    if (isDossierCandidate(candidate.name, candidate.type)) {
      if (candidate.size > MAX_BYTES) {
        setError(t("assistant.doc.tooBig"));
        return;
      }
      setBusy(true);
      try {
        const text = await readAsText(candidate);
        const strict = parseDispooDossierText(text);
        if (strict.ok) {
          setFile(null);
          setFolder(null);
          setDossier(strict.dossier);
          setDossierName(candidate.name);
          setDossierSource("dispoo");
          setDossierDropped([]);
          trackEvent("dossier_detected", {
            source: "dispoo",
            team: strict.dossier.team.length,
            rundown: strict.dossier.rundown.length,
          });
          return;
        }
        /* Pas un Dossier Dispoo : on cherche quand même des infos standard. */
        const details = strict.errors.filter(issue => issue !== "notDossier" && issue !== "notJson");
        if (details.length > 0) {
          setError(t("dossier.import.invalid"));
          setDossierErrors(details);
          return;
        }
        let raw: unknown = null;
        try {
          raw = JSON.parse(text);
        } catch {
          raw = null;
        }
        const universal = raw !== null ? normalizeUniversalJson(raw, candidate.name) : { ok: false as const };
        if (universal.ok) {
          setFile(null);
          setFolder(null);
          setDossier(universal.dossier);
          setDossierName(candidate.name);
          setDossierSource("universal");
          setDossierDropped(universal.dropped);
          trackEvent("dossier_detected", {
            source: "universal",
            team: universal.dossier.team.length,
            rundown: universal.dossier.rundown.length,
          });
        } else {
          setError(t("dossier.import.unrecognized"));
        }
      } catch {
        setError(t("dossier.import.invalid"));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!ACCEPTED.includes(candidate.type)) {
      setError(t("assistant.doc.typeError"));
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setError(t("assistant.doc.tooBig"));
      return;
    }
    setFile(candidate);
    setBusy(true);
    try {
      const result = await classifyDocument({ project, name: candidate.name, mimeType: candidate.type });
      setFolder(result.folder);
      trackEvent("document_classified", { folder: result.folder, mode: result.mode });
    } catch {
      setError(t("assistant.doc.error"));
      setFile(null);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!file || !folder || busy) return;
    setBusy(true);
    setError("");
    try {
      let url: string | undefined;
      let keptLocal = false;
      const synced = !!project && UUID.test(project.id) && canEdit;
      if (synced && project) {
        /* Monde synchronisé : le vrai stockage privé, comme le module Documents. */
        const contentType = file.type;
        const request = await postJson<{ uploadURL: string; objectPath: string; finalizeToken: string }>(
          "/storage/uploads/request-url",
          { projectId: project.id, name: file.name, size: file.size, contentType },
        );
        const put = await fetch(request.uploadURL, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: file,
        });
        if (!put.ok) throw new Error("Échec du transfert vers le stockage privé");
        await postJson("/storage/files", {
          projectId: project.id,
          name: file.name,
          size: file.size,
          contentType,
          objectPath: request.objectPath,
          finalizeToken: request.finalizeToken,
        });
      } else {
        /* Monde local ou lecture seule : le fichier reste dans le navigateur. */
        keptLocal = true;
        if (file.size <= MAX_INLINE_BYTES) url = await readAsDataUrl(file);
      }
      addEntity("documents", {
        title: file.name,
        kind: kindFromName(file.name),
        folder,
        at: Date.now(),
        ...(url ? { url } : {}),
      });
      trackEvent("document_shared", { folder, keptLocal });
      setDone(t("assistant.doc.added"));
      reset();
    } catch {
      setError(t("assistant.doc.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="document-share"
      className="rounded-[2rem] border border-border bg-card p-6 text-center md:p-8"
    >
      <span aria-hidden className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-foreground text-background">
        <FileUp className="h-5 w-5" />
      </span>
      <input
        ref={fileRef}
        type="file"
        accept={[...ACCEPTED, ...DOSSIER_ACCEPT].join(",")}
        data-testid="document-share-input"
        className="sr-only"
        aria-label={t("assistant.doc.choose")}
        onChange={event => void pick(event.target.files?.[0])}
      />
      {dossier ? (
        <div className="mt-5">
          <DossierImport
            dossier={dossier}
            fileName={dossierName}
            source={dossierSource}
            dropped={dossierDropped}
            onDone={message => {
              setDone(message);
              setDossier(null);
              setDossierName("");
              setDossierSource("dispoo");
              setDossierDropped([]);
              if (fileRef.current) fileRef.current.value = "";
            }}
            onCancel={reset}
          />
        </div>
      ) : !file ? (
        <>
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              data-testid="document-share-choose"
              disabled={busy || !canEdit}
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition hover:bg-foreground/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("assistant.doc.choose")}
            </button>
          </div>
          <p className="mt-3 text-xs font-light text-foreground/55">{t("assistant.doc.hint")}</p>
          {!canEdit && (
            <p className="mt-2 text-xs text-foreground/50">{t("dossier.locked")}</p>
          )}
        </>
      ) : (
        <div className="mx-auto mt-5 max-w-md">
          <p className="truncate text-sm font-medium text-foreground" title={file.name}>
            {file.name}
          </p>
          {busy && !folder ? (
            <p className="mt-3 flex items-center justify-center gap-2 text-sm font-light text-foreground/55" role="status">
              <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
              {t("assistant.chat.thinking")}
            </p>
          ) : (
            folder && (
              <>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/[0.04] px-4 py-1.5 text-xs text-foreground">
                  <Check aria-hidden className="h-3.5 w-3.5 text-emerald-500" />
                  {t("assistant.doc.classified", { folder: getFolderLabel(folder, locale) })}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    data-testid="document-share-cancel"
                    disabled={busy}
                    onClick={reset}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-xs text-foreground/75 transition hover:border-foreground/40 hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X aria-hidden className="h-3.5 w-3.5" />
                    {t("assistant.doc.cancel")}
                  </button>
                  <button
                    type="button"
                    data-testid="document-share-confirm"
                    disabled={busy}
                    onClick={() => void confirm()}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-foreground px-5 text-xs font-semibold text-background transition hover:bg-foreground/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {busy && <LoaderCircle aria-hidden className="h-3.5 w-3.5 animate-spin" />}
                    {busy ? t("assistant.doc.uploading") : t("assistant.doc.confirm")}
                  </button>
                </div>
              </>
            )
          )}
        </div>
      )}
      {done && (
        <p data-testid="document-share-done" role="status" className="mt-4 text-sm text-emerald-400">
          {done}
        </p>
      )}
      {error && (
        <p data-testid="document-share-error" role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {dossierErrors.length > 0 && (
        <ul className="mx-auto mt-2 max-w-md space-y-1 text-xs text-destructive/80">
          {dossierErrors.map(issue => <li key={issue}>{issue}</li>)}
        </ul>
      )}
    </div>
  );
}

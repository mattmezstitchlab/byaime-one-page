import { useRef, useState } from "react";
import { ArrowLeft, FileUp, LoaderCircle, ScanLine } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { DossierImport } from "@/components/DossierImport";
import { isDossierCandidate, parseDispooDossierText, type DispooDossierV1 } from "@/lib/dispoo-dossier";
import { normalizeUniversalJson, type UniversalDrop } from "@/lib/universal-import";

const MAX_BYTES = 6 * 1024 * 1024;

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsText(file);
  });
}

type Understood = {
  dossier: DispooDossierV1;
  name: string;
  source: "dispoo" | "universal";
  dropped: UniversalDrop[];
};

/*
 * La porte « Importer ma carte » du héros : un fichier (carte-aime.json, dossier
 * JSON) ou le code copié-collé — le même contenu, deux transports. La lecture
 * est celle de l'import universel existant (aucun nouveau lecteur) ; ce qui est
 * reconnu part ensuite sur l'écran « Voici ce que nous avons compris », qui
 * reste la seule étape de confirmation.
 */
export function CarteImport({
  signedIn,
  onConfirmed,
  onBack,
}: {
  signedIn: boolean;
  onConfirmed: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [understood, setUnderstood] = useState<Understood | null>(null);

  const analyse = async (text: string, name: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError("");
    if (trimmed.length > MAX_BYTES) {
      setError(t("carte.import.error"));
      return;
    }
    setBusy(true);
    try {
      /* Même lecture que l'espace privé : Dossier strict, puis import universel. */
      const strict = parseDispooDossierText(trimmed);
      if (strict.ok) {
        setUnderstood({ dossier: strict.dossier, name, source: "dispoo", dropped: [] });
        trackEvent("dossier_detected", { source: "dispoo", entry: "hero" });
        return;
      }
      const details = strict.errors.filter(issue => issue !== "notDossier" && issue !== "notJson");
      if (details.length > 0) {
        setError(t("carte.import.error"));
        return;
      }
      let raw: unknown = null;
      try {
        raw = JSON.parse(trimmed);
      } catch {
        raw = null;
      }
      const universal = raw !== null ? normalizeUniversalJson(raw, name) : { ok: false as const };
      if (universal.ok) {
        setUnderstood({ dossier: universal.dossier, name, source: "universal", dropped: universal.dropped });
        trackEvent("dossier_detected", {
          source: "universal",
          entry: "hero",
          team: universal.dossier.team.length,
          rundown: universal.dossier.rundown.length,
        });
      } else {
        setError(t("carte.import.error"));
      }
    } finally {
      setBusy(false);
    }
  };

  if (understood) {
    return (
      <div className="rounded-[2rem] border border-white/15 bg-white p-6 text-left text-[#171410] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] sm:p-8">
        <DossierImport
          dossier={understood.dossier}
          fileName={understood.name}
          source={understood.source}
          dropped={understood.dropped}
          title={t("carte.import.reviewTitle")}
          description={t("carte.import.reviewDesc")}
          onDone={onConfirmed}
          onCancel={() => setUnderstood(null)}
        />
      </div>
    );
  }

  return (
    <div
      data-testid="carte-import"
      className="overflow-hidden rounded-[2rem] border border-white/15 bg-[#171410] p-6 text-white sm:p-8"
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12.5px] text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {t("carte.import.back")}
      </button>
      <h3 className="mt-3 text-[18px] font-medium">{t("carte.import.title")}</h3>
      <p className="mt-2 text-[13.5px] font-light leading-relaxed text-white/65">{t("carte.import.desc")}</p>

      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json,.txt,text/plain"
        className="hidden"
        onChange={async event => {
          const candidate = event.target.files?.[0];
          if (!candidate) return;
          if (candidate.size > MAX_BYTES) {
            setError(t("carte.import.error"));
            return;
          }
          try {
            await analyse(await readAsText(candidate), candidate.name);
          } catch {
            setError(t("carte.import.error"));
          }
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <button
        type="button"
        data-testid="carte-import-file"
        onClick={() => inputRef.current?.click()}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-5 text-[13.5px] text-white/85 transition hover:border-white/45 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <FileUp className="h-4 w-4" aria-hidden />
        {t("carte.import.file")}
      </button>

      <label htmlFor="carte-import-paste" className="mt-6 block text-[12.5px] text-white/55">
        {t("carte.import.pasteLabel")}
      </label>
      <textarea
        id="carte-import-paste"
        data-testid="carte-import-paste"
        rows={5}
        value={pasted}
        onChange={event => {
          setPasted(event.target.value);
          if (error) setError("");
        }}
        placeholder={t("carte.import.pastePlaceholder")}
        className="mt-2 w-full resize-y rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 font-mono text-[12.5px] text-white outline-none transition placeholder:text-white/35 focus:border-white/40 focus:bg-white/[0.09]"
      />

      {error && (
        <p role="alert" data-testid="carte-import-error" className="mt-3 text-[13px] text-red-300">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          data-testid="carte-import-analyse"
          disabled={busy || !pasted.trim()}
          onClick={() => analyse(pasted, isDossierCandidate("carte.json", "application/json") ? "carte.json" : "carte")}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <ScanLine className="h-4 w-4" aria-hidden />}
          {t("carte.import.parse")}
        </button>
      </div>
      {signedIn ? null : (
        <p className="mt-4 text-[12px] leading-relaxed text-white/40">{t("carte.import.signedOut")}</p>
      )}
    </div>
  );
}

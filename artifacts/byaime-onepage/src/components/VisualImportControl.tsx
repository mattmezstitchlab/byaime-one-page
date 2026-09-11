import { useRef, useState } from "react";
import { Film, ImagePlus, Link2, Trash2, Upload, X } from "lucide-react";
import type { WorldVisual } from "@/lib/types";
import { DEFAULT_VISUAL_OVERLAY, visualOverlayStrength } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Import d'un visuel pour le hero du Monde ou pour un Moment :
 *  - image : fichier de l'ordinateur ou URL distante ;
 *  - vidéo : URL (mp4, etc.) ;
 *  - réglage du filtre noir (overlay 0–100) pour garder le texte lisible.
 * Les fichiers image sont lus comme données intégrées : le visuel suit la
 * sauvegarde du Monde sans dépendre d'un espace de stockage tiers.
 */

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function looksLikeVideoUrl(url: string) {
  // Les lecteurs tiers (YouTube, Vimeo) ne peuvent pas être lus en <video> :
  // on ne reconnaît que les fichiers vidéo directs.
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
}

export function VisualImportControl({
  value,
  onChange,
  disabled = false,
  label = "Visuel",
}: {
  value: WorldVisual | null | undefined;
  onChange: (visual: WorldVisual | null) => void;
  disabled?: boolean;
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlMode, setUrlMode] = useState<"image" | "video">("image");
  const [error, setError] = useState("");
  const overlay = visualOverlayStrength(value);

  const readFile = (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choisissez un fichier image (JPG, PNG, WEBP). Pour une vidéo, utilisez une URL.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`L'image dépasse ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} Mo. Utilisez une URL ou une image plus légère.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ kind: "image", url: String(reader.result), name: file.name, overlay: value?.overlay ?? DEFAULT_VISUAL_OVERLAY });
    };
    reader.onerror = () => setError("Lecture du fichier impossible.");
    reader.readAsDataURL(file);
  };

  const submitUrl = () => {
    setError("");
    const url = urlDraft.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("data:")) {
      setError("L'URL doit commencer par https://");
      return;
    }
    const kind: WorldVisual["kind"] = urlMode === "video" || looksLikeVideoUrl(url) ? "video" : "image";
    onChange({ kind, url, overlay: value?.overlay ?? DEFAULT_VISUAL_OVERLAY });
    setUrlDraft("");
  };

  const patchOverlay = (next: number) => onChange(value ? { ...value, overlay: next } : null);

  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[.22em] text-foreground/45">{label}</p>
        {value && !disabled && (
          <button
            type="button"
            onClick={() => { onChange(null); setError(""); if (fileRef.current) fileRef.current.value = ""; }}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[.14em] text-foreground/50 transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="h-3 w-3" /> Retirer
          </button>
        )}
      </div>

      {value ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-foreground/10">
          <div className="relative aspect-video w-full bg-black">
            {value.kind === "image" ? (
              <img src={value.url} alt={value.name ? `Visuel : ${value.name}` : "Aperçu du visuel"} className="h-full w-full object-cover" />
            ) : (
              <video src={value.url} className="h-full w-full object-cover" autoPlay muted loop playsInline />
            )}
            <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: overlay / 100 * 0.75 }} aria-hidden />
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] uppercase tracking-[.14em] text-white/85 backdrop-blur-sm">
              {value.kind === "video" ? <Film className="h-3 w-3" /> : <ImagePlus className="h-3 w-3" />}
              {value.kind === "video" ? "Vidéo" : "Image"}{value.name ? ` · ${value.name.length > 24 ? `${value.name.slice(0, 24)}…` : value.name}` : ""}
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs font-light leading-relaxed text-foreground/45">
          Aucun visuel personnalisé — l’illustration par défaut du Monde reste affichée.
        </p>
      )}

      {!disabled && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-3 py-1.5 text-[11px] text-foreground/75 transition hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Upload className="h-3.5 w-3.5" /> Importer une image
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={event => readFile(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => setUrlMode("image")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                urlMode === "image" ? "border-foreground bg-foreground text-background" : "border-foreground/15 text-foreground/75 hover:bg-foreground/5"
              )}
            >
              <Link2 className="h-3.5 w-3.5" /> URL image
            </button>
            <button
              type="button"
              onClick={() => setUrlMode("video")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                urlMode === "video" ? "border-foreground bg-foreground text-background" : "border-foreground/15 text-foreground/75 hover:bg-foreground/5"
              )}
            >
              <Film className="h-3.5 w-3.5" /> URL vidéo
            </button>
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={urlDraft}
              disabled={disabled}
              onChange={event => setUrlDraft(event.target.value)}
              onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); submitUrl(); } }}
              placeholder={urlMode === "video" ? "https://…/video.mp4, .webm…" : "https://…/photo.jpg"}
              className="min-w-0 flex-1 rounded-xl border border-foreground/10 bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:border-foreground/30 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={submitUrl}
              disabled={!urlDraft.trim()}
              className="shrink-0 rounded-full bg-foreground px-4 py-2 text-[11px] font-medium text-background transition hover:opacity-90 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Utiliser cette URL
            </button>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[.18em] text-foreground/45">
              <span>Filtre noir</span>
              <span className="tabular-nums">{overlay}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={overlay}
              disabled={!value}
              onChange={event => patchOverlay(Number(event.target.value))}
              className="w-full accent-foreground disabled:opacity-40"
              aria-label="Force du filtre noir sur le visuel"
            />
            <span className="mt-1 flex justify-between text-[9px] uppercase tracking-[.14em] text-foreground/30">
              <span>Photo visible</span><span>Lisibilité du texte</span>
            </span>
          </label>

          {error && (
            <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

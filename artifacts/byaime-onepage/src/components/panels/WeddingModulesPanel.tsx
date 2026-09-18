import { searchAppleMusic } from "@/lib/music-search";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useProject } from "@/store/project-store";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Check,
  Send,
  Upload,
  Download,
  ExternalLink,
  LoaderCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { MusicSearchResult, MusicTrack, Document } from "@/lib/types";
import { MESSAGE_TO_EVENT, consumeMessageDraft } from "@/lib/person-spotlight-bus";
import { linkMusicTrackToEvents, musicEventIdsForTrack } from "@/lib/timeline-graph";
import { momentDocumentIds, momentTrackIds } from "@/lib/moment-context";
import { useI18n, type I18nKey } from "@/lib/i18n";
import type { WeddingModule } from "@/lib/wedding-navigation";

export type { WeddingModule } from "@/lib/wedding-navigation";

const newId = () => crypto.randomUUID();

type SentMessage = {
  id: string;
  projectId: string;
  kind: string;
  recipients: string[];
  subject: string;
  status: string;
  providerError?: string | null;
  timelineEventId?: string | null;
  scheduledAt?: string | null;
  cancelledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
};

const MUSIC_SOURCE = "Apple Music / iTunes";
const MAX_DOC_BYTES = 8 * 1024 * 1024; // 8 Mo max en dataURL pour rester local-first

// Fallback API helper — garde compat si backend présent, mais ne bloque plus l'app
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || body?.providerError || `Erreur ${response.status}`);
  return body as T;
}


function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture impossible"));
    reader.readAsDataURL(file);
  });
}

function guessKind(name: string): Document["kind"] {
  const lower = name.toLowerCase();
  if (lower.includes("devis")) return "devis";
  if (lower.includes("contrat")) return "contrat";
  if (lower.includes("facture")) return "facture";
  return "autre";
}

function AddBar({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-4 py-2 text-xs font-medium text-[var(--agency-ink)] transition hover:border-[var(--agency-ink)] hover:bg-[var(--agency-ink)] hover:text-[var(--agency-paper)]"
    >
      <Plus className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-6 py-12 text-center text-sm text-[var(--agency-body)]">
      {children}
    </div>
  );
}


import type { OrgaSection } from "./MondePanel";

export function WeddingModulesPanel({
  module,
  momentId = null,
  orgaSection,
}: {
  module: WeddingModule;
  momentId?: string | null;
  /** Onglet initial de l'Organisation unifiée (Cérémonie / Logistique / Équipe). */
  orgaSection?: OrgaSection;
}) {
  const {
    project,
    currentRole,
    syncStatus,
    syncError,
    refreshParticipantLinks,
    updateProject,
    updateEntity,
    addEntity,
    removeEntity,
  } = useProject();
  const { t: tScope, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-US" : "fr-FR";
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [remoteError, setRemoteError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState("");
  const [freeOpen, setFreeOpen] = useState(false);
  const [freeRecipients, setFreeRecipients] = useState("");
  const [freeSubject, setFreeSubject] = useState("");
  const [freeBody, setFreeBody] = useState("");
  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState<MusicSearchResult[]>([]);
  const [musicSearchBusy, setMusicSearchBusy] = useState(false);
  const [musicSearchError, setMusicSearchError] = useState("");
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null);
  // P3: participantMedia/songRequests/selectedVideoId supprimés — fusionnés dans Galerie unifiée
  const [localDocError, setLocalDocError] = useState("");
  const [localDocProgress, setLocalDocProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<"all" | "image" | "video" | "doc">("all");
  const [galleryLightboxUrl, setGalleryLightboxUrl] = useState<string | null>(null);
  const [galleryLightboxType, setGalleryLightboxType] = useState<"image" | "video" | null>(null);
  const [orgaTab, setOrgaTab] = useState<OrgaSection>(orgaSection ?? "ceremony");
  /* Le panneau demandé change (ex. Cérémonie → Équipe dans la colonne du
     Panneau AIME) : l'onglet suit, sans remonter l'état dans chaque module. */
  useEffect(() => {
    if (orgaSection) setOrgaTab(orgaSection);
  }, [orgaSection]);
  /* Ancrage sur un Moment : la Galerie et la Musique peuvent se restreindre à
     ce que le Moment relie vraiment — mêmes relations que les repères de la
     scène. `null` = pas d'ancrage, tout le périmètre du panneau. */
  const [scopeToMoment, setScopeToMoment] = useState(true);
  const musicSearchAbortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canManage = currentRole === "owner" || currentRole === "planner";
  const canEdit = canManage || currentRole === "family";
  const projectId = project?.id;

  // Brouillon message depuis mini-carte personne
  useEffect(() => {
    if (module !== "messages") return;
    const applyDraft = () => {
      const draft = consumeMessageDraft();
      if (!draft) return;
      setFreeOpen(true);
      setFreeRecipients(draft.recipients);
      setFreeSubject(draft.subject);
      setFreeBody(draft.body);
    };
    applyDraft();
    window.addEventListener(MESSAGE_TO_EVENT, applyDraft);
    return () => window.removeEventListener(MESSAGE_TO_EVENT, applyDraft);
  }, [module]);

  useEffect(() => {
    if (module !== "seating" || !canManage || !projectId) return;
    void refreshParticipantLinks().catch(() => undefined);
  }, [canManage, module, projectId, refreshParticipantLinks]);

  // Les modules API restent compatibles si backend présent, mais ne bloquent plus
  useEffect(() => {
    if (!projectId || ![ "messages", "thanks" ].includes(module) || !canManage) return;
    setRemoteError("");
    void api<SentMessage[]>(`/projects/${projectId}/messages`)
      .then(setMessages)
      .catch(() => {
        // Mode hors-ligne: on garde messages locaux
        setMessages([]);
      });
  }, [canManage, module, projectId]);

  /*
   * 14/09 : deux effets de récupération traînaient ici après la fusion P3 —
   * ils appelaient `setParticipantMedia` et `setSongRequests`, supprimés avec
   * la Galerie unifiée. Ouvrir Contributions, Film, Souvenirs, Merci ou
   * Musique levait `ReferenceError` et faisait tomber tout le panneau.
   */

  if (!project) return null;

  const importLocalDocuments = async (files: File[]) => {
    if (!files.length) return;
    setLocalDocError("");
    const oversize = files.filter((f) => f.size > MAX_DOC_BYTES);
    if (oversize.length) {
      setLocalDocError(tScope("wm.docs.oversize", { n: oversize.length, max: Math.round(MAX_DOC_BYTES / 1024 / 1024) }));
    }
    const valid = files.filter((f) => f.size <= MAX_DOC_BYTES);
    if (!valid.length) return;
    setBusy(true);
    setLocalDocProgress({ done: 0, total: valid.length, current: valid[0]?.name || "" });
    for (let i = 0; i < valid.length; i++) {
      const file = valid[i]!;
      setLocalDocProgress({ done: i, total: valid.length, current: file.name });
      try {
        const dataUrl = await readFileAsDataURL(file);
        addEntity("documents", {
          title: file.name,
          kind: guessKind(file.name),
          at: Date.now(),
          url: dataUrl,
        } as unknown as Document);
      } catch (err) {
        setLocalDocError((prev) => (prev ? `${prev} ` : "") + tScope("wm.docs.readError", { name: file.name }));
      }
    }
    setLocalDocProgress(null);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // --- Messages local-first (simulation) ---
  const withLegalFooter = (body: string) => {
    const footer = [
      "",
      "—",
      "Vous recevez cet e-mail de la part des organisateurs de ce mariage, via AIME. Pour ne plus recevoir ces messages, répondez en indiquant « Désabonnement ».",
      "You are receiving this email from the wedding organizers via AIME. Reply with “STOP” to opt out.",
    ].join("\n");
    return /Désabonnement|opt out/i.test(body) ? body : `${body.trimEnd()}${footer}`;
  };

  const deliverMessageLocal = async (recipientList: string[], subject: string, body: string) => {
    if (!recipientList.length || !subject.trim() || !body.trim()) return;
    setBusy(true);
    setRemoteError("");
    // Tentative backend si dispo, sinon simulation locale
    try {
      if (projectId) {
        const delivery = await api<SentMessage>(`/projects/${projectId}/messages`, {
          method: "POST",
          body: JSON.stringify({
            kind: "practical_info",
            recipients: recipientList,
            subject: subject.trim(),
            body: withLegalFooter(body),
            confirmed: true,
          }),
        });
        setMessages((cur) => [delivery, ...cur]);
        if (delivery.status !== "sent") setRemoteError(delivery.providerError || tScope("wm.messages.notConfirmed"));
      } else {
        throw new Error("no project");
      }
    } catch {
      // Mode hors-ligne: on log en local dans messageLogs
      const id = newId();
      addEntity("messageLogs", {
        recipient: recipientList.join(", "),
        sentAt: Date.now(),
        status: "simule",
        note: `${subject} — ${body.slice(0, 120)}`,
      } as never);
      setMessages((cur) => [
        {
          id,
          projectId: project.id,
          kind: "practical_info",
          recipients: recipientList,
          subject,
          status: "simule",
          createdAt: new Date().toISOString(),
        },
        ...cur,
      ]);
      setRemoteError(tScope("wm.messages.offline"));
    } finally {
      setBusy(false);
    }
  };

  const sendTemplate = async (template: (typeof project.messageTemplates)[number]) => {
    const recipientList = recipients
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (!recipientList.length || !template.title.trim() || !template.body.trim()) return;
    await deliverMessageLocal(recipientList, template.title, template.body);
    setRecipients("");
    setSelectedTemplateId(null);
  };

  const sendFreeMessage = async () => {
    const recipientList = freeRecipients
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    await deliverMessageLocal(recipientList, freeSubject, freeBody);
    setFreeRecipients("");
    setFreeSubject("");
    setFreeBody("");
    setFreeOpen(false);
  };




  if (module === "seating") {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 text-sm">
          <p className="text-[11px] uppercase tracking-widest text-foreground/40">{tScope("wm.seating.eyebrow")}</p>
          <p className="mt-2">{tScope("wm.seating.text")}</p>
        </div>
      </div>
    );
  }

  if (module === "budget") {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 text-sm">
          <p className="text-[11px] uppercase tracking-widest text-foreground/40">{tScope("wm.budget.eyebrow")}</p>
          <p className="mt-2">{tScope("wm.budget.text")}</p>
        </div>
      </div>
    );
  }

  if (module === "documents") {
    const scopedDocIds = momentId && scopeToMoment ? new Set(momentDocumentIds(project, momentId)) : null;
    const inScope = (d: Document) => !scopedDocIds || scopedDocIds.has(d.id);
    const source = project.documents.filter(inScope);
    const images = source.filter((d) => d.url?.startsWith("data:image") || d.title.match(/\.(jpg|jpeg|png|webp|gif)$/i));
    const videos = source.filter((d) => d.url?.startsWith("data:video") || d.title.match(/\.(mp4|webm|mov)$/i));
    const docs = source.filter((d) => !images.includes(d) && !videos.includes(d));
    const momentDocCount = momentId ? momentDocumentIds(project, momentId).length : 0;
    const filtered = galleryFilter === "image" ? images : galleryFilter === "video" ? videos : galleryFilter === "doc" ? docs : project.documents;
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <PersistenceState status={syncStatus} error={syncError} />
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--agency-eyebrow)]">{tScope("wm.docs.eyebrow")}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--agency-body)]">
                {tScope("wm.docs.desc")}
              </p>
              <p className="mt-2 text-xs text-[var(--agency-eyebrow)]">{tScope("wm.docs.count", { files: project.documents.length, images: images.length, videos: videos.length, docs: docs.length, done: project.memoryChecklist.filter((m)=>m.done).length, total: project.memoryChecklist.length })}</p>
            </div>
            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs text-[var(--agency-ink)] transition hover:bg-[var(--agency-ink)] hover:text-[var(--agency-paper)] disabled:opacity-40"
                >
                  {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {tScope("wm.docs.add")}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.csv,.txt,image/jpeg,image/png,image/webp,video/mp4,application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const picked = Array.from(event.target.files ?? []);
                    if (picked.length) void importLocalDocuments(picked);
                  }}
                />
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["all","image","video","doc"] as const).map((f) => (
              <button key={f} onClick={()=>setGalleryFilter(f)} className={cn("rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest", galleryFilter===f ? "bg-[var(--agency-ink)] text-[var(--agency-paper)] border-[var(--agency-ink)]" : "border-[var(--agency-hairline)] text-foreground/50")}>{tScope(`wm.docs.filter.${f}` as I18nKey)}</button>
            ))}
          </div>
          {momentId && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--agency-hairline)] pt-4" data-testid="documents-moment-scope">
              <button
                type="button"
                onClick={() => setScopeToMoment(value => !value)}
                aria-pressed={scopeToMoment && momentDocCount > 0}
                className={cn(
                  "rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest transition",
                  scopeToMoment && momentDocCount > 0
                    ? "border-[var(--agency-ink)] bg-[var(--agency-ink)] text-[var(--agency-paper)]"
                    : "border-[var(--agency-hairline)] text-foreground/50 hover:text-foreground",
                )}
              >
                {scopeToMoment && momentDocCount > 0 ? tScope("moment.scope.label") : tScope("moment.scope.all")}
              </button>
              <span className="text-[11px] text-[var(--agency-body)]">
                {momentDocCount > 0
                  ? tScope("moment.scope.count", { count: momentDocCount })
                  : tScope("wm.docs.noMomentFiles")}
              </span>
            </div>
          )}
        </div>

        {localDocProgress && (
          <div role="status" aria-live="polite" className="rounded-xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-3 text-xs">
            <div className="flex justify-between">
              <span>{tScope("wm.docs.importing", { done: localDocProgress.done + 1, total: localDocProgress.total, current: localDocProgress.current })}</span>
              <span className="font-mono text-[var(--agency-eyebrow)]">{localDocProgress.done}/{localDocProgress.total}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--agency-ink)]/10"><div className="h-full rounded-full bg-[var(--agency-ink)] transition-[width]" style={{ width: `${Math.round((localDocProgress.done / localDocProgress.total) * 100)}%` }} /></div>
          </div>
        )}
        {localDocError && <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B42318]">{localDocError}</p>}
        {remoteError && <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B42318]">{remoteError}</p>}

        {/* Images grid */}
        {(galleryFilter==="all" || galleryFilter==="image") && images.length>0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.docs.imagesHeading")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((doc)=>(
                <div key={doc.id} className="group relative overflow-hidden rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)]">
                  {doc.url && <img src={doc.url} alt={doc.title} className="h-36 w-full object-cover cursor-pointer" onClick={()=>{ setGalleryLightboxUrl(doc.url!); setGalleryLightboxType("image"); }} />}
                  <div className="p-2 flex items-center justify-between gap-1">
                    <p className="truncate text-[11px]">{doc.title}</p>
                    {canManage && <button aria-label={tScope("wm.docs.deleteAria", { title: doc.title })} onClick={()=>removeEntity("documents", doc.id)} className="p-1 text-foreground/30 hover:text-[#B42318]"><Trash2 className="w-3 h-3"/></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos grid */}
        {(galleryFilter==="all" || galleryFilter==="video") && videos.length>0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.docs.videosHeading")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {videos.map((doc)=>(
                <div key={doc.id} className="rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="truncate text-xs">{doc.title}</p>
                    {canManage && <button aria-label={`Supprimer ${doc.title}`} onClick={()=>removeEntity("documents", doc.id)} className="p-1 text-foreground/30 hover:text-[#B42318]"><Trash2 className="w-3.5 h-3.5"/></button>}
                  </div>
                  {doc.url && <video src={doc.url} controls className="w-full rounded-xl max-h-56 bg-black" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Docs list */}
        {(galleryFilter==="all" || galleryFilter==="doc") && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.docs.docsHeading")}</p>
            {docs.length===0 && filtered.length===0 ? <Empty>{tScope("wm.docs.emptyAll")}</Empty> : docs.map((doc)=>{
              return (
                <div key={doc.id} className="flex items-center gap-3 rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--agency-hairline)]"><ExternalLink className="h-4 w-4"/></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm">{doc.title}</p><p className="mt-1 text-xs text-[var(--agency-eyebrow)]">{doc.kind} · {new Date(doc.at).toLocaleDateString(dateLocale)}</p></div>
                  {doc.url && <><a aria-label={tScope("wm.docs.previewAria", { title: doc.title })} target="_blank" rel="noreferrer" href={doc.url} className="p-2 text-[var(--agency-eyebrow)] hover:text-[var(--agency-ink)]"><ExternalLink className="h-4 w-4"/></a><a aria-label={tScope("wm.docs.downloadAria", { title: doc.title })} href={doc.url} download={doc.title} className="p-2 text-[var(--agency-eyebrow)] hover:text-[var(--agency-ink)]"><Download className="h-4 w-4"/></a></>}
                  {canManage && <button aria-label={`Supprimer ${doc.title}`} onClick={()=>removeEntity("documents", doc.id)} className="p-2 text-[var(--agency-eyebrow)] hover:text-[#B42318]"><Trash2 className="h-4 w-4"/></button>}
                </div>
              );
            })}
            {galleryFilter!=="doc" && filtered.length===0 && <Empty>{tScope("wm.docs.emptyFilter")}</Empty>}
          </div>
        )}

        {/* Memories checklist intégré */}
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
          <div className="flex items-center justify-between mb-3"><p className="text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.docs.checklistHeading")}</p><span className="text-[10px] text-foreground/30">{project.memoryChecklist.filter((m)=>m.done).length}/{project.memoryChecklist.length}</span></div>
          {project.memoryChecklist.map((item)=>(
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-foreground/5 last:border-0">
              <button onClick={()=>updateProject({ memoryChecklist: project.memoryChecklist.map((x)=> x.id===item.id ? {...x, done:!x.done}:x) })} className={cn("w-5 h-5 rounded border flex items-center justify-center", item.done ? "bg-[var(--agency-ink)] text-[var(--agency-paper)]" : "border-foreground/25")}>{item.done && <Check className="w-3 h-3"/>}</button>
              <input value={item.label} onChange={(e)=>updateProject({ memoryChecklist: project.memoryChecklist.map((x)=> x.id===item.id ? {...x, label:e.target.value}:x) })} className={cn("text-sm flex-1 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", item.done && "line-through text-foreground/40")} />
              {canManage && <button onClick={()=>updateProject({ memoryChecklist: project.memoryChecklist.filter((x)=>x.id!==item.id) })} className="text-foreground/30 hover:text-brand-accent"><Trash2 className="w-3.5 h-3.5"/></button>}
            </div>
          ))}
          {canManage && <div className="pt-3"><AddBar label={tScope("wm.docs.addMemory")} onAdd={()=>updateProject({ memoryChecklist: [...project.memoryChecklist, { id: newId(), label:tScope("wm.docs.newMemory"), done:false }] })} /></div>}
        </div>

        {/* Lightbox with ESC */}
        {galleryLightboxUrl && (
          <div className="fixed inset-0 z-[100] bg-black/80 grid place-items-center p-4" onClick={()=>setGalleryLightboxUrl(null)} onKeyDown={(e)=>{ if(e.key==="Escape") setGalleryLightboxUrl(null); }} tabIndex={-1}>
            <div className="relative max-w-3xl w-full">
              <button onClick={()=>setGalleryLightboxUrl(null)} className="absolute -top-8 right-0 text-white text-xs uppercase tracking-widest">{tScope("wm.docs.closeLightbox")}</button>
              {galleryLightboxType==="image" ? <img src={galleryLightboxUrl} className="w-full max-h-[85vh] object-contain rounded-xl" /> : <video src={galleryLightboxUrl} controls autoPlay className="w-full max-h-[85vh] rounded-xl bg-black" />}
            </div>
          </div>
        )}

        {/* Contributions offline note */}
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4 text-xs leading-relaxed text-[var(--agency-body)]">
          <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">{tScope("wm.docs.contribNote.heading")}</p>
          {tScope("wm.docs.contribNote.text")}
        </div>
      </div>
    );
  }

  if (module === "ceremony") {
    // Fusion P2: ceremony -> logistics (Organisation)
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 text-sm leading-relaxed">
          <p className="text-[11px] uppercase tracking-widest text-foreground/40">{tScope("wm.ceremony.eyebrow")}</p>
          <p className="mt-2">{tScope("wm.ceremony.text")}</p>
        </div>
      </div>
    );
  }

  if (module === "music") {
    const timelineMusicEvents = [...project.timeline].sort((a, b) => a.time - b.time);
    const selectedTrack = project.music.find((track) => track.id === selectedMusicId) || project.music[0];
    /* Ancrage Moment : les morceaux reliés à ce Moment passent en tête, et le
       bandeau rappelle ce que le Moment porte — mêmes relations que la scène. */
    const momentTrackIdList = momentId ? momentTrackIds(project, momentId) : [];
    const orderedTracks = momentTrackIdList.length > 0
      ? [...project.music].sort((a, b) => Number(momentTrackIdList.includes(b.id)) - Number(momentTrackIdList.includes(a.id)))
      : project.music;
    const musicScopeBanner = momentId ? (
      <div data-testid="music-moment-scope" className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
        <p className="text-[10px] uppercase tracking-widest text-foreground/40">{tScope("moment.scope.label")}</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--agency-body)]">
          {momentTrackIdList.length > 0
            ? orderedTracks
                .filter(track => momentTrackIdList.includes(track.id))
                .map(track => `${track.title}${track.artist ? ` · ${track.artist}` : ""}`)
                .join(" · ")
            : tScope("wm.music.scopeEmpty")}
        </p>
      </div>
    ) : null;
    if (!canEdit)
      return (
        <div className="mx-auto max-w-4xl space-y-5">
          {musicScopeBanner}
          <div>
            <h4 className="text-sm font-medium">{tScope("wm.music.readOnlyTitle")}</h4>
            <p className="mt-1 text-xs text-foreground/45">{tScope("wm.music.readOnly")}</p>
          </div>
          {project.music.length === 0 ? (
            <Empty>{tScope("wm.music.empty")}</Empty>
          ) : (
            orderedTracks.map((track) => (
              <div key={track.id} className="flex items-center gap-3 rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
                <TrackArtwork track={track} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{track.title}</p>
                  <p className="mt-1 truncate text-xs text-foreground/45">{track.artist || tScope("wm.music.artistUnknown")} · {track.moment}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-foreground/35">{track.status === "valide" ? tScope("wm.music.validated") : tScope("wm.music.toChoose")}</span>
              </div>
            ))
          )}
        </div>
      );
    const runMusicSearch = async () => {
      const term = musicQuery.trim();
      if (term.length < 2) {
        setMusicSearchError(tScope("wm.music.minChars"));
        setMusicResults([]);
        return;
      }
      setMusicSearchBusy(true);
      setMusicSearchError("");
      musicSearchAbortRef.current?.abort();
      const controller = new AbortController();
      musicSearchAbortRef.current = controller;
      try {
        setMusicResults(await searchAppleMusic(term, controller.signal));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMusicSearchError(error instanceof Error ? error.message : tScope("wm.music.searchFailed"));
      } finally {
        setMusicSearchBusy(false);
      }
    };
    const selectMusicResult = (result: MusicSearchResult) => {
      if (!selectedTrack) return;
      const currentEventIds = musicEventIdsForTrack(project, selectedTrack.id);
      const nextProject = linkMusicTrackToEvents(
        {
          ...project,
          music: project.music.map((track) =>
            track.id === selectedTrack.id
              ? {
                  ...track,
                  title: result.title,
                  artist: result.artist,
                  status: "valide" as const,
                  provenance: "integration" as const,
                  metadataStatus: "verified" as const,
                  external: {
                    provider: result.provider,
                    externalId: result.externalId,
                    verifiedAt: Date.now(),
                    artworkUrl: result.artworkUrl,
                    durationMs: result.durationMs,
                    previewUrl: result.previewUrl,
                    trackUrl: result.trackUrl,
                    collectionName: result.collectionName,
                  },
                }
              : track,
          ),
        },
        selectedTrack.id,
        currentEventIds,
      );
      updateProject(nextProject);
    };
    const toggleTrackEvent = (track: MusicTrack, eventId: string) => {
      const current = musicEventIdsForTrack(project, track.id);
      const next = current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId];
      updateProject(linkMusicTrackToEvents(project, track.id, next));
    };
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        {musicScopeBanner}
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <ShieldCheck className="h-4 w-4 text-brand-accent" />
            <span className="font-medium text-foreground/90">{tScope("wm.music.sourceTitle")}</span>
            <span className="text-foreground/40">· {MUSIC_SOURCE}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-foreground/55">{tScope("wm.music.sourceDesc")}</p>
        </div>
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[220px] flex-1">
              <span className="mb-2 block text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.music.searchLabel", { source: MUSIC_SOURCE })}</span>
              <input
                value={musicQuery}
                onChange={(event) => setMusicQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void runMusicSearch();
                }}
                placeholder={tScope("wm.music.searchPlaceholder")}
                className="w-full rounded-xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:border-foreground/30"
              />
            </label>
            <button
              type="button"
              disabled={musicSearchBusy}
              onClick={() => void runMusicSearch()}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--agency-ink)] px-4 py-2 text-xs font-medium text-[var(--agency-paper)] disabled:opacity-40"
            >
              {musicSearchBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              {tScope("wm.music.search")}
            </button>
          </div>
          {musicSearchError && (
            <p role="alert" className="mt-3 text-xs text-brand-accent">
              {musicSearchError}
            </p>
          )}
          {musicResults.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-[var(--agency-hairline)] pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.music.results")}</p>
                {selectedTrack && (
                  <label className="flex items-center gap-2 text-xs text-foreground/55">
                    {tScope("wm.music.linkTo")}
                    <select
                      value={selectedTrack.id}
                      onChange={(event) => setSelectedMusicId(event.target.value)}
                      className="rounded-lg bg-foreground/10 px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {project.music.map((track) => (
                        <option key={track.id} value={track.id}>
                          {track.moment}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {musicResults.map((result) => (
                <MusicSearchResultRow key={`${result.provider}:${result.externalId}`} result={result} disabled={!selectedTrack} onSelect={() => selectMusicResult(result)} />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">{tScope("wm.music.tracksTitle")}</h4>
            <p className="mt-1 text-xs text-foreground/40">{tScope("wm.music.tracksDesc")}</p>
          </div>
          <AddBar
            label={tScope("wm.music.manual")}
            onAdd={() =>
              addEntity("music", {
                moment: tScope("wm.music.newMoment"),
                title: tScope("wm.music.toChoose"),
                artist: "",
                status: "a_choisir",
                metadataStatus: "manual",
                provenance: "real",
                timelineEventIds: [],
              })
            }
          />
        </div>
        {project.music.length === 0 ? (
          <Empty>Aucun morceau n’est encore relié à un Moment.</Empty>
        ) : (
          orderedTracks.map((track) => (
            <MusicTrackRow
              key={track.id}
              track={track}
              timelineEvents={timelineMusicEvents}
              linkedEventIds={musicEventIdsForTrack(project, track.id)}
              onToggleEvent={(eventId) => toggleTrackEvent(track, eventId)}
              onUpdate={(updates) => updateEntity("music", track.id, updates)}
              onDelete={() => removeEntity("music", track.id)}
            />
          ))
        )}
      </div>
    );
  }

    if (module === "logistics") {
    const l = project.logistics;
    const c = project.ceremony;
    
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--agency-eyebrow)]">{tScope("wm.orga.eyebrow")}</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--agency-body)]">{tScope("wm.orga.desc")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["ceremony","logistics","team"] as const).map((s)=>(
              <button key={s} onClick={()=>setOrgaTab(s)} className={cn("rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest", orgaTab===s ? "bg-[var(--agency-ink)] text-[var(--agency-paper)] border-[var(--agency-ink)]" : "border-[var(--agency-hairline)] text-foreground/50")}>{tScope(`wm.orga.tab.${s}` as I18nKey)}</button>
            ))}
          </div>
        </div>

        {orgaTab==="ceremony" && (
          <div className="space-y-4">
            <EditableArea label={tScope("wm.orga.ceremonyNotes")} value={c.notes} onChange={(notes) => updateProject({ ceremony: { ...c, notes } })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <EditableArea label={tScope("wm.orga.menu")} value={c.menu} onChange={(menu) => updateProject({ ceremony: { ...c, menu } })} />
              <EditableArea label={tScope("wm.orga.drinks")} value={c.drinks} onChange={(drinks) => updateProject({ ceremony: { ...c, drinks } })} />
              <EditableArea label={tScope("wm.orga.cake")} value={c.cake} onChange={(cake) => updateProject({ ceremony: { ...c, cake } })} />
              <EditableArea label={tScope("wm.orga.firstDance")} value={c.firstDance} onChange={(firstDance) => updateProject({ ceremony: { ...c, firstDance } })} />
            </div>
            <div className="rounded-3xl border border-[var(--agency-hairline)] p-4">
              <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-3">{tScope("wm.orga.structure")}</p>
              {c.structure.map((item, i) => (
                <div key={`${item}-${i}`} className="flex gap-3 py-2 border-b border-foreground/5 last:border-0 text-sm">
                  <span className="text-foreground/30 font-mono">{String(i + 1).padStart(2, "0")}</span>
                  <input value={item} onChange={(e)=>{ const next=[...c.structure]; next[i]=e.target.value; updateProject({ ceremony:{...c, structure:next } }); }} className="flex-1 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-sm" />
                </div>
              ))}
              {canManage && <div className="pt-2"><AddBar label={tScope("wm.orga.addStep")} onAdd={()=>updateProject({ ceremony:{...c, structure:[...c.structure, tScope("wm.orga.newStep")] }})} /></div>}
            </div>
            <div className="rounded-3xl border border-[var(--agency-hairline)] p-4">
              <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-3">{tScope("wm.orga.readings")}</p>
              {c.readings.map((r) => (
                <div key={r.id} className="mb-3 rounded-xl border border-foreground/5 p-3">
                  <div className="flex gap-2">
                    <input value={r.title} onChange={(e)=>updateProject({ ceremony:{...c, readings:c.readings.map((x)=> x.id===r.id ? {...x, title:e.target.value}:x) } })} className="text-sm bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex-1" />
                    <input value={r.reader} onChange={(e)=>updateProject({ ceremony:{...c, readings:c.readings.map((x)=> x.id===r.id ? {...x, reader:e.target.value}:x) } })} className="text-xs bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground/50" />
                  </div>
                  <textarea value={r.text} onChange={(e)=>updateProject({ ceremony:{...c, readings:c.readings.map((x)=> x.id===r.id ? {...x, text:e.target.value}:x) } })} className="mt-2 w-full bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-xs text-foreground/70 min-h-[60px]" />
                </div>
              ))}
              {c.vows.map((v) => (
                <EditableArea key={v.id} label={tScope("wm.orga.vowsOf", { person: v.person })} value={v.text} onChange={(text) => updateProject({ ceremony: { ...c, vows: c.vows.map((x) => (x.id === v.id ? { ...x, text } : x)) } })} />
              ))}
            </div>
          </div>
        )}

        {orgaTab==="logistics" && (
          <div className="space-y-4">
            <EditableArea label={tScope("wm.orga.parking")} value={l.parking} onChange={(parking) => updateProject({ logistics: { ...l, parking } })} />
            <EditableArea label={tScope("wm.orga.accessibility")} value={l.accessibility} onChange={(accessibility) => updateProject({ logistics: { ...l, accessibility } })} />
            <EditableArea label={tScope("wm.orga.weather")} value={l.weatherFallback} onChange={(weatherFallback) => updateProject({ logistics: { ...l, weatherFallback } })} />
            <div className="rounded-3xl border border-[var(--agency-hairline)] p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.orga.packing")}</p>
                <AddBar label={tScope("wm.orga.add")} onAdd={() => updateProject({ logistics: { ...l, packing: [...l.packing, { id: newId(), label: tScope("wm.orga.newItem"), done: false }] } })} />
              </div>
              {l.packing.length === 0 ? <Empty>{tScope("wm.orga.emptyList")}</Empty> : l.packing.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-foreground/5 last:border-0">
                  <button onClick={() => updateProject({ logistics: { ...l, packing: l.packing.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)) } })} className={cn("w-5 h-5 rounded border flex items-center justify-center", item.done ? "bg-[var(--agency-ink)] text-[var(--agency-paper)]" : "border-foreground/25")}>{item.done && <Check className="w-3 h-3" />}</button>
                  <input value={item.label} onChange={(e) => updateProject({ logistics: { ...l, packing: l.packing.map((x) => (x.id === item.id ? { ...x, label: e.target.value } : x)) } })} className={cn("text-sm flex-1 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", item.done && "line-through text-foreground/40")} />
                  <button onClick={() => updateProject({ logistics: { ...l, packing: l.packing.filter((x) => x.id !== item.id) } })} className="text-foreground/30 hover:text-brand-accent"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="rounded-3xl border border-[var(--agency-hairline)] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.orga.emergency")}</p>
                <AddBar label={tScope("wm.orga.add")} onAdd={() => updateProject({ logistics: { ...l, emergencyContacts: [...l.emergencyContacts, { id: newId(), name: tScope("wm.orga.newContact"), phone: "", role: tScope("wm.orga.toSpecify") }] } })} />
              </div>
              {l.emergencyContacts.map((contact) => (
                <div key={contact.id} className="grid grid-cols-3 gap-2 border-b border-foreground/5 py-2 last:border-0">
                  <input value={contact.name} onChange={(e) => updateProject({ logistics: { ...l, emergencyContacts: l.emergencyContacts.map((x) => (x.id === contact.id ? { ...x, name: e.target.value } : x)) } })} className="bg-transparent text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <input value={contact.phone} onChange={(e) => updateProject({ logistics: { ...l, emergencyContacts: l.emergencyContacts.map((x) => (x.id === contact.id ? { ...x, phone: e.target.value } : x)) } })} placeholder={tScope("wm.orga.phonePlaceholder")} className="bg-transparent text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <input value={contact.role} onChange={(e) => updateProject({ logistics: { ...l, emergencyContacts: l.emergencyContacts.map((x) => (x.id === contact.id ? { ...x, role: e.target.value } : x)) } })} className="bg-transparent text-xs text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              ))}
            </div>
          </div>
        )}

        {orgaTab==="team" && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4 text-xs leading-relaxed text-[var(--agency-body)]">{tScope("wm.orga.teamNote")}</div>
            <div className="rounded-3xl border border-[var(--agency-hairline)] p-4">
              <div className="flex justify-between items-center mb-3"><p className="text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.orga.teamHeading")}</p><AddBar label={tScope("wm.orga.addRole")} onAdd={()=>updateProject({ team: [...project.team, { id:newId(), name:tScope("wm.orga.newRole"), role:tScope("wm.orga.newRole"), responsibilities:[], person:tScope("wm.orga.assigneePlaceholder"), tasks:[] }] })} /></div>
              {project.team.length===0 ? <Empty>{tScope("wm.orga.noRoles")}</Empty> : project.team.map((member)=>(
                <details key={member.id} className="group border-b border-foreground/5 py-3 last:border-0">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <div><p className="text-sm">{member.role} <span className="text-foreground/40">· {member.person}</span></p><p className="text-xs text-foreground/40">{tScope("wm.orga.taskCount", { n: (member.tasks ?? []).length })}</p></div>
                    <span className="text-[10px] uppercase tracking-widest text-foreground/30 group-open:rotate-180 transition">▼</span>
                  </summary>
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={member.role} onChange={(e)=>updateProject({ team: project.team.map((x)=> x.id===member.id ? {...x, role:e.target.value}:x) })} className="rounded-full border border-[var(--agency-hairline)] bg-foreground/5 px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder={tScope("wm.orga.rolePlaceholder")} />
                      <input value={member.person} onChange={(e)=>updateProject({ team: project.team.map((x)=> x.id===member.id ? {...x, person:e.target.value}:x) })} className="rounded-full border border-[var(--agency-hairline)] bg-foreground/5 px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder={tScope("wm.orga.personPlaceholder")} />
                    </div>
                    {(member.tasks ?? []).map((t,i)=>(
                      <div key={`${member.id}-${i}`} className="flex items-center gap-2">
                        <input value={t} onChange={(e)=>{ const next=[...(member.tasks ?? [])]; next[i]=e.target.value; updateProject({ team: project.team.map((x)=> x.id===member.id ? {...x, tasks:next}:x) }); }} className="flex-1 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        <button onClick={()=>updateProject({ team: project.team.map((x)=> x.id===member.id ? {...x, tasks:(x.tasks ?? []).filter((_,j)=>j!==i)}:x) })} className="text-foreground/30 hover:text-[#B42318]"><Trash2 className="w-3 h-3"/></button>
                      </div>
                    ))}
                    <div className="flex gap-2"><AddBar label={tScope("wm.orga.addTask")} onAdd={()=>updateProject({ team: project.team.map((x)=> x.id===member.id ? {...x, tasks:[...(x.tasks ?? []), tScope("wm.orga.newTask")]}:x) })} /><button onClick={()=>updateProject({ team: project.team.filter((x)=>x.id!==member.id) })} className="text-[10px] uppercase tracking-widest text-[#B42318]">{tScope("wm.orga.deleteRole")}</button></div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

if (module === "messages") {
    const templates = project.messageTemplates.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()));
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <PersistenceState status={syncStatus} error={syncError} />
        {remoteError && <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B42318]">{remoteError}</p>}
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4 text-xs leading-relaxed text-[var(--agency-body)]">
          {tScope("wm.messages.localNote")}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tScope("wm.messages.searchPlaceholder")}
            className="flex-1 rounded-full border border-[var(--agency-hairline)] bg-foreground/5 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:border-foreground/30"
          />
          {canManage && <AddBar label={tScope("wm.messages.free")} onAdd={() => setFreeOpen((v) => !v)} />}
          {canManage && <AddBar label={tScope("wm.messages.newTemplate")} onAdd={() => addEntity("messageTemplates", { title: tScope("wm.messages.newTemplate"), type: "pratique", body: "" })} />}
        </div>
        {canManage && freeOpen && (
          <div className="space-y-3 rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4" data-testid="messages-free-composer">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.messages.recipients")}</span>
              <input
                value={freeRecipients}
                onChange={(event) => setFreeRecipients(event.target.value)}
                placeholder={tScope("wm.messages.recipientsPlaceholder")}
                className="mt-1 w-full rounded-xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:border-foreground/30"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.messages.subject")}</span>
              <input value={freeSubject} onChange={(event) => setFreeSubject(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:border-foreground/30" />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.messages.message")}</span>
              <textarea
                value={freeBody}
                onChange={(event) => setFreeBody(event.target.value)}
                rows={4}
                placeholder={tScope("wm.messages.writePlaceholder")}
                className="mt-1 w-full resize-none rounded-xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:border-foreground/30"
              />
            </label>
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => setFreeOpen(false)} className="rounded-full border border-[var(--agency-hairline)] px-3 py-2 text-xs text-foreground/55">
                {tScope("wm.messages.cancel")}
              </button>
              <button
                disabled={busy || !freeRecipients.trim() || !freeSubject.trim() || !freeBody.trim()}
                onClick={() => void sendFreeMessage()}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--agency-ink)] px-3 py-2 text-xs font-medium text-[var(--agency-paper)] disabled:opacity-30"
              >
                {busy && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                <Send className="h-3.5 w-3.5" />
                {tScope("wm.messages.keepLocal")}
              </button>
            </div>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((template) => (
            <div key={template.id} className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
              <div className="flex justify-between gap-2">
                <input
                  disabled={!canManage}
                  value={template.title}
                  onChange={(event) => updateEntity("messageTemplates", template.id, { title: event.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-foreground/60"
                />
                {canManage && (
                  <button onClick={() => removeEntity("messageTemplates", template.id)} className="text-foreground/30 hover:text-brand-accent">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <textarea
                disabled={!canManage}
                value={template.body}
                onChange={(event) => updateEntity("messageTemplates", template.id, { body: event.target.value })}
                placeholder={tScope("wm.messages.writePlaceholder")}
                rows={3}
                className="mt-2 w-full resize-none bg-transparent text-xs leading-relaxed text-foreground/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {canManage && selectedTemplateId !== template.id && (
                <button
                  disabled={!template.title.trim() || !template.body.trim()}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className="mt-3 inline-flex items-center gap-2 text-xs text-foreground/70 hover:text-foreground disabled:opacity-30"
                >
                  <Send className="h-3.5 w-3.5" />
                  {tScope("wm.messages.prepare")}
                </button>
              )}
              {selectedTemplateId === template.id && (
                <div className="mt-4 space-y-3 border-t border-[var(--agency-hairline)] pt-4">
                  <label className="block text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.messages.recipients")}</label>
                  <input
                    autoFocus
                    value={recipients}
                    onChange={(event) => setRecipients(event.target.value)}
                    placeholder={tScope("wm.messages.recipientsPlaceholder")}
                    className="w-full rounded-xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:border-foreground/30"
                  />
                  <div className="flex gap-2">
                    <button disabled={busy} onClick={() => setSelectedTemplateId(null)} className="rounded-full border border-[var(--agency-hairline)] px-3 py-2 text-xs text-foreground/55">
                      {tScope("wm.messages.cancel")}
                    </button>
                    <button
                      disabled={busy || !recipients.trim()}
                      onClick={() => void sendTemplate(template)}
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--agency-ink)] px-3 py-2 text-xs font-medium text-[var(--agency-paper)] disabled:opacity-30"
                    >
                      {busy && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                      {tScope("wm.messages.keep")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div>
          <p className="mb-3 text-[10px] uppercase tracking-widest text-foreground/40">{tScope("wm.messages.logHeading")}</p>
          {messages.length === 0 && project.messageLogs.length === 0 ? (
            <Empty>{tScope("wm.messages.noMessages")}</Empty>
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id} className="border-b border-foreground/5 py-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate">{message.subject}</p>
                      <p className="mt-1 truncate text-xs text-foreground/35">{message.recipients.join(", ")}</p>
                    </div>
                    <span className="text-xs text-foreground/60">{new Date(message.createdAt).toLocaleString(dateLocale)} · {message.status}</span>
                  </div>
                </div>
              ))}
              {project.messageLogs.map((log) => (
                <div key={log.id} className="border-b border-foreground/5 py-3 text-sm">
                  <p className="truncate">{log.recipient}</p>
                  <p className="mt-1 text-xs text-foreground/40">{new Date(log.sentAt).toLocaleString(dateLocale)} · {log.status} · {log.note?.slice(0, 80)}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  if (module === "contributions") {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 text-sm">
          <p className="text-[11px] uppercase tracking-widest text-foreground/40">{tScope("wm.contributions.eyebrow")}</p>
          <p className="mt-2">{tScope("wm.movedTo")} <strong>{tScope("wm.docs.galleryRef")}</strong> {tScope("wm.contributions.detail")}.</p>
        </div>
      </div>
    );
  }

  if (module === "thanks") {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 text-sm">
          <p className="text-[11px] uppercase tracking-widest text-foreground/40">{tScope("wm.thanks.eyebrow")}</p>
          <p className="mt-2">{tScope("wm.movedTo")} <strong>{tScope("wm.docs.galleryRef")}</strong> {tScope("wm.contributions.detail")}.</p>
        </div>
      </div>
    );
  }

  if (module === "film") {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 text-sm">
          <p className="text-[11px] uppercase tracking-widest text-foreground/40">{tScope("wm.film.eyebrow")}</p>
          <p className="mt-2">{tScope("wm.movedTo")} <strong>{tScope("wm.docs.galleryRef")}</strong> {tScope("wm.contributions.detail")}.</p>
        </div>
      </div>
    );
  }

  if (module === "honeymoon") {
    const posts = project.timeline
      .filter((event) => event.phase === "apres" && event.visibility === "audience")
      .sort((a, b) => b.time - a.time);
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h4 className="text-sm font-medium">{tScope("wm.honeymoon.title")}</h4>
          <p className="mt-1 text-xs leading-relaxed text-foreground/45">{tScope("wm.honeymoon.desc")}</p>
        </div>
        {canManage && (
          <button
            onClick={() =>
              addEntity("timeline", {
                time: Date.now(),
                durationMinutes: 0,
                kind: "souvenir",
                title: tScope("wm.honeymoon.newTitle"),
                detail: tScope("wm.honeymoon.newDetail"),
                status: "a_valider",
                confidence: "confirme",
                phase: "apres",
                universe: project.universe,
                provenance: "real",
                visibility: "prive",
                relations: [],
                dependencyIds: [],
                resources: [],
              })
            }
            className="inline-flex items-center gap-2 rounded-full border border-[var(--agency-hairline)] px-3 py-2 text-xs text-foreground/70"
          >
            <Plus className="h-3.5 w-3.5" />
            {tScope("wm.honeymoon.preparePrivate")}
          </button>
        )}
        {posts.length === 0 ? (
          <Empty>{tScope("wm.honeymoon.empty")}</Empty>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <article key={post.id} className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
                <p className="text-[10px] uppercase tracking-widest text-foreground/35">
                  {new Date(post.time).toLocaleDateString(dateLocale)}
                  {post.location ? ` · ${post.location}` : ""}
                </p>
                <h5 className="mt-2 text-sm font-medium">{post.title}</h5>
                {post.detail && <p className="mt-2 text-xs leading-relaxed text-foreground/55">{post.detail}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (module === "team")
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 text-sm">
          <p className="text-[11px] uppercase tracking-widest text-foreground/40">{tScope("wm.team.eyebrow")}</p>
          <p className="mt-2">{tScope("wm.team.text")}</p>
        </div>
      </div>
    );
  if (module === "memories") {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 text-sm">
          <p className="text-[11px] uppercase tracking-widest text-foreground/40">{tScope("wm.memories.eyebrow")}</p>
          <p className="mt-2">{tScope("wm.memories.text")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Empty>Module inconnu : {module}</Empty>
    </div>
  );
}


function formatTrackDuration(durationMs?: number) {
  if (!durationMs || durationMs <= 0) return null;
  const totalSeconds = Math.round(durationMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function TrackArtwork({ track, size = "md" }: { track: Pick<MusicTrack, "external">; size?: "sm" | "md" }) {
  const { t } = useI18n();
  const artwork = track.external?.artworkUrl;
  const className = size === "sm" ? "h-12 w-12 rounded-lg" : "h-16 w-16 rounded-xl";
  return artwork ? (
    <img src={artwork} alt="" className={`${className} shrink-0 object-cover`} />
  ) : (
    <div
      className={`${className} flex shrink-0 items-center justify-center border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-1 text-center text-[9px] uppercase leading-tight tracking-wider text-foreground/35`}
    >
      {t("wm.music.coverMissing")}
    </div>
  );
}

function MusicSearchResultRow({ result, disabled, onSelect }: { result: MusicSearchResult; disabled: boolean; onSelect: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-3">
      {result.artworkUrl ? (
        <img src={result.artworkUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--agency-hairline)] text-[9px] uppercase leading-tight tracking-wider text-foreground/35">
          {t("wm.music.coverMissing")}
        </div>
      )}
      <div className="min-w-[160px] flex-1">
        <p className="truncate text-sm">{result.title}</p>
        <p className="mt-1 truncate text-xs text-foreground/50">
          {result.artist}
          {result.collectionName ? ` · ${result.collectionName}` : ""}
        </p>
        <p className="mt-1 text-[10px] text-foreground/55">
          {t("wm.music.verifiedMeta")} {formatTrackDuration(result.durationMs) || t("wm.music.durationUnknown")}
          {result.previewUrl ? ` · ${t("wm.music.previewAvailable")}` : ` · ${t("wm.music.previewUnavailable")}`}
        </p>
      </div>
      {result.previewUrl && <audio controls preload="none" src={result.previewUrl} className="h-8 max-w-[190px]" aria-label={t("wm.music.listenAria", { title: result.title })} />}
      {result.trackUrl && (
        <a href={result.trackUrl} target="_blank" rel="noreferrer" aria-label={t("wm.music.openAria", { title: result.title, source: MUSIC_SOURCE })} className="p-2 text-foreground/40 hover:text-foreground">
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className="rounded-full border border-[var(--agency-hairline)] px-3 py-2 text-xs text-foreground/70 transition hover:border-foreground/40 hover:text-foreground disabled:opacity-35"
      >
        {t("wm.music.linkBtn")}
      </button>
    </div>
  );
}

function MusicTrackRow({
  track,
  timelineEvents,
  linkedEventIds,
  onToggleEvent,
  onUpdate,
  onDelete,
}: {
  track: MusicTrack;
  timelineEvents: { id: string; title: string; time: number }[];
  linkedEventIds: string[];
  onToggleEvent: (eventId: string) => void;
  onUpdate: (updates: Partial<MusicTrack>) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const verified = Boolean(track.external);
  const duration = formatTrackDuration(track.external?.durationMs);
  return (
    <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
      <div className="flex items-start gap-3">
        <TrackArtwork track={track} />
        <button
          type="button"
          onClick={() => onUpdate({ status: track.status === "valide" ? "a_choisir" : "valide" })}
          aria-label={track.status === "valide" ? t("wm.music.markToChooseAria", { title: track.title }) : t("wm.music.validateAria", { title: track.title })}
          className={cn(
            "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
            track.status === "valide" ? "border-brand-accent text-brand-accent" : "border-[var(--agency-hairline)] text-foreground/30",
          )}
        >
          {track.status === "valide" && <Check className="h-3.5 w-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2 py-1 text-[10px]", verified ? "border-foreground/25 text-foreground/60" : "border-brand-accent/40 text-brand-accent")}>
              {verified ? t("wm.music.verified", { source: MUSIC_SOURCE }) : t("wm.music.manualUnverified")}
            </span>
            {track.provenance === "demo" && <span className="text-[10px] text-foreground/35">{t("wm.music.initialExample")}</span>}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <input value={track.moment} onChange={(event) => onUpdate({ moment: event.target.value })} placeholder={t("wm.music.momentPlaceholder")} className="bg-transparent text-xs text-foreground/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <input value={track.title} disabled={verified} onChange={(event) => onUpdate({ title: event.target.value })} className="bg-transparent text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-foreground/80" />
            <input
              value={track.artist}
              disabled={verified}
              onChange={(event) => onUpdate({ artist: event.target.value })}
              placeholder={t("wm.music.artistPlaceholder")}
              className="bg-transparent text-sm text-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-foreground/25 disabled:text-foreground/60"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-foreground/45">
            {duration && <span>{duration}</span>}
            {verified && track.external?.previewUrl ? (
              <audio controls preload="none" src={track.external.previewUrl} className="h-8 max-w-[220px]" aria-label={t("wm.music.listenAria", { title: track.title })} />
            ) : (
              <span className={cn(verified ? "text-foreground/55" : "text-foreground/35")}>
                {verified ? t("wm.music.playUnavailable") : t("wm.music.noPreviewManual")}
              </span>
            )}
            {verified && track.external?.trackUrl && (
              <a href={track.external.trackUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" />
                {t("wm.music.openInApple")}
              </a>
            )}
          </div>
        </div>
        <button type="button" onClick={onDelete} aria-label={t("wm.music.deleteAria", { title: track.title })} className="text-foreground/30 hover:text-brand-accent">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 border-t border-[var(--agency-hairline)] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-widest text-foreground/40">{t("wm.music.momentsHeading")}</p>
          <span className="text-[10px] text-foreground/35">
            {t("wm.music.linkedCount", { n: linkedEventIds.length })}
          </span>
        </div>
        {timelineEvents.length === 0 ? (
          <p className="mt-2 text-xs text-foreground/35">{t("wm.music.noEvents")}</p>
        ) : (
          <div className="mt-2 grid max-h-44 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
            {timelineEvents.map((event) => (
              <label key={event.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground/60 hover:bg-foreground/5">
                <input type="checkbox" checked={linkedEventIds.includes(event.id)} onChange={() => onToggleEvent(event.id)} className="accent-white" />
                <span className="truncate">{event.title}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function EditableArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <label className="block rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5">
      <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--agency-eyebrow)]">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-3 w-full resize-none bg-transparent text-[15px] leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-[var(--agency-eyebrow)] text-[var(--agency-ink)]"
        placeholder={t("wm.orga.toComplete")}
      />
    </label>
  );
}


function PersistenceState({ status, error }: { status: "local" | "loading" | "saving" | "saved" | "error" | "conflict"; error?: string }) {
  const { t } = useI18n();
  const state =
    status === "saving" || status === "loading"
      ? { label: t("wm.persist.saving"), tone: "border-[var(--agency-hairline)] bg-[var(--agency-paper)] text-[var(--agency-body)]" }
      : status === "saved"
        ? { label: t("wm.persist.saved"), tone: "border-[#A9E5C3] bg-[#ECFDF5] text-[#065F46]" }
        : status === "conflict"
          ? { label: t("wm.persist.conflict"), tone: "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]" }
          : status === "error"
            ? { label: error || t("wm.persist.error"), tone: "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]" }
            : { label: t("wm.persist.local"), tone: "border-[var(--agency-hairline)] bg-[var(--agency-paper)] text-[var(--agency-eyebrow)]" };
  return (
    <p role="status" aria-live="polite" className={cn("rounded-full border px-4 py-2 text-xs", state.tone)}>
      {state.label}
    </p>
  );
}

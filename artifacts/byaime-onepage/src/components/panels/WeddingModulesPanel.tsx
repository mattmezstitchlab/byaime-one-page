import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { openLaboratory } from "@/lib/laboratory";
import { useProject } from "@/store/project-store";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Check, AlertTriangle, Send, Upload, Download, ExternalLink, LoaderCircle, Search, ShieldCheck, Film, Image, Music2, FolderOpen, RefreshCcw, Link2, FlaskConical } from "lucide-react";
import type { MemoryItem, MusicSearchResult, MusicTrack, Payment } from "@/lib/types";
import { effectiveGuestRsvp } from "@/lib/participant-rsvp";
import { linkMusicTrackToEvents, musicEventIdsForTrack } from "@/lib/timeline-graph";
import type { WeddingModule } from "@/lib/wedding-navigation";

export type { WeddingModule } from "@/lib/wedding-navigation";

const euro = (cents: number) => `${(cents / 100).toLocaleString("fr-FR")} €`;
const newId = () => Math.random().toString(36).slice(2, 9);
type StoredFile = { id: string; name: string; contentType: string; size: number; guestId?: string | null; createdAt?: string };
type SentMessage = { id: string; projectId: string; kind: string; recipients: string[]; subject: string; status: string; providerError?: string | null; timelineEventId?: string | null; scheduledAt?: string | null; cancelledAt?: string | null; sentAt?: string | null; createdAt: string };
type ParticipantMedia = StoredFile & {
  guestId?: string | null;
  guestName?: string | null;
  caption?: string | null;
  moderationStatus: "pending" | "approved" | "rejected";
  visibility: "private" | "couple" | "guests";
  consent?: boolean;
};
type SongRequest = {
  id: string;
  projectId: string;
  guestId: string;
  guestName?: string | null;
  title: string;
  artist: string;
  message?: string | null;
  status: "new" | "seen" | "accepted" | "played" | "rejected";
  createdAt: string;
};
type LocalBridgeStatus = {
  connected: boolean;
  bridgeId?: string | null;
  bridgeVersion?: string | null;
  lastSeenAt?: string | null;
  expiresAt?: string | null;
};
type LocalScanSuggestion = {
  localIdentifier: string;
  score: number;
  reason: string;
  actions: Array<"link_project" | "add_timeline" | "import" | "ignore">;
};
type LocalScanFile = {
  name: string;
  extension: string;
  fileType: string;
  documentType?: string;
  size: number;
  modifiedAt: string;
  relativePath: string;
  sourceFolder: string;
  localIdentifier: string;
  fingerprint?: string;
};
type LocalScanJob = {
  id: string;
  projectId: string;
  status: "queued" | "done" | "failed";
  createdAt: string;
  completedAt?: string;
  folders: string[];
  results: LocalScanFile[];
  suggestions: LocalScanSuggestion[];
  error?: string;
};
type LocalReference = {
  id: string;
  localIdentifier: string;
  filename: string;
  relativePath: string;
  sourceFolder: string;
  fileType: string;
  state: "local" | "linked" | "imported" | "ignored";
  importedFileId?: string | null;
};
const MUSIC_SOURCE = "Apple Music / iTunes";

async function searchAppleMusic(term: string, signal: AbortSignal): Promise<MusicSearchResult[]> {
  const params = new URLSearchParams({ term, country: "fr", media: "music", entity: "song", limit: "12" });
  const response = await fetch(`https://itunes.apple.com/search?${params.toString()}`, { signal });
  if (!response.ok) throw new Error("Le catalogue musical n’est pas disponible pour le moment.");
  const body = await response.json() as { results?: Array<Record<string, unknown>> };
  return (body.results || [])
    .filter(result => typeof result.trackId === "number" && typeof result.trackName === "string" && typeof result.artistName === "string")
    .map(result => ({
      provider: "apple_music" as const,
      externalId: String(result.trackId),
      title: String(result.trackName),
      artist: String(result.artistName),
      collectionName: typeof result.collectionName === "string" ? result.collectionName : undefined,
      artworkUrl: typeof result.artworkUrl100 === "string" ? result.artworkUrl100.replace("100x100", "300x300") : undefined,
      durationMs: typeof result.trackTimeMillis === "number" ? result.trackTimeMillis : undefined,
      previewUrl: typeof result.previewUrl === "string" ? result.previewUrl : undefined,
      trackUrl: typeof result.trackViewUrl === "string" ? result.trackViewUrl : undefined,
    }));
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || body?.providerError || `Erreur ${response.status}`);
  return body as T;
}

const fileSize = (bytes: number) => bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1_000))} Ko` : `${(bytes / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;

function putFile(uploadURL: string, file: File, onProgress: (progress: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadURL);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.addEventListener("progress", event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error("Échec du transfert vers le stockage privé"));
    });
    request.addEventListener("error", () => reject(new Error("Le transfert a été interrompu par le réseau")));
    request.addEventListener("abort", () => reject(new Error("Le transfert a été annulé")));
    request.send(file);
  });
}

function AddBar({ label, onAdd }: { label: string; onAdd: () => void }) {
  return <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/75 hover:bg-white hover:text-black transition-colors"><Plus className="w-3.5 h-3.5" />{label}</button>;
}

function Empty({ children }: { children: string }) {
  return <div className="rounded-2xl border border-dashed border-foreground/10 px-5 py-10 text-center text-sm text-foreground/40">{children}</div>;
}

function LaboratoryShortcut({
  type,
  onClick,
}: {
  type?: "bug" | "remarque" | "suggestion" | "idee" | "question" | "positif" | "ux" | "contenu_donnees";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-[10px] uppercase tracking-[.14em] text-foreground/65 transition hover:bg-foreground/5"
    >
      <FlaskConical className="h-3.5 w-3.5" />
      {type === "bug" ? "Signaler" : "Laboratoire"}
    </button>
  );
}

export function WeddingModulesPanel({ module }: { module: WeddingModule }) {
  const { project, currentRole, syncStatus, syncError, participantLinks, refreshParticipantLinks, updateProject, updateEntity, addEntity, removeEntity } = useProject();
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [remoteError, setRemoteError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState("");
  const [rescheduleAt, setRescheduleAt] = useState<Record<string, string>>({});
  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState<MusicSearchResult[]>([]);
  const [musicSearchBusy, setMusicSearchBusy] = useState(false);
  const [musicSearchError, setMusicSearchError] = useState("");
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null);
  const [participantMedia, setParticipantMedia] = useState<ParticipantMedia[]>([]);
  const [songRequests, setSongRequests] = useState<SongRequest[]>([]);
  const [localBridge, setLocalBridge] = useState<LocalBridgeStatus>({ connected: false });
  const [pairingToken, setPairingToken] = useState<{ token: string; expiresAt: string } | null>(null);
  const [authorizedFoldersText, setAuthorizedFoldersText] = useState("");
  const [localScan, setLocalScan] = useState<LocalScanJob | null>(null);
  const [localReferences, setLocalReferences] = useState<LocalReference[]>([]);
  const [pendingImportJobs, setPendingImportJobs] = useState<Record<string, string>>({});
  const musicSearchAbortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canManage = currentRole === "owner" || currentRole === "planner";
  const canEdit = canManage || currentRole === "family";
  const projectId = project?.id;

  useEffect(() => {
    if (module !== "seating" || !canManage || !projectId) return;
    void refreshParticipantLinks().catch(() => undefined);
  }, [canManage, module, projectId, refreshParticipantLinks]);

  useEffect(() => {
    if (!projectId || !canManage || !["documents", "film"].includes(module)) return;
    setRemoteError("");
    void api<StoredFile[]>(`/projects/${projectId}/files`).then(setFiles).catch(error => setRemoteError(error.message));
  }, [canManage, module, projectId]);

  useEffect(() => {
    if (!projectId || !["messages", "thanks"].includes(module) || !canManage) return;
    setRemoteError("");
    void api<SentMessage[]>(`/projects/${projectId}/messages`).then(setMessages).catch(error => setRemoteError(error.message));
  }, [canManage, module, projectId]);

  useEffect(() => {
    if (!projectId || !canManage || !["contributions", "film"].includes(module)) return;
    setRemoteError("");
    void api<ParticipantMedia[]>(`/projects/${projectId}/participant-media`).then(setParticipantMedia).catch(error => setRemoteError(error.message));
  }, [canManage, module, projectId]);

  useEffect(() => {
    if (!projectId || !canManage || module !== "music") return;
    setRemoteError("");
    void api<SongRequest[]>(`/projects/${projectId}/song-requests`).then(setSongRequests).catch(error => setRemoteError(error.message));
  }, [canManage, module, projectId]);

  useEffect(() => {
    if (!projectId || module !== "documents") return;
    void api<LocalBridgeStatus>("/aime-local/bridge/status").then(setLocalBridge).catch(() => setLocalBridge({ connected: false }));
    void api<{ folders: string[] }>(`/projects/${projectId}/aime-local/folders`)
      .then((payload) => setAuthorizedFoldersText(payload.folders.join("\n")))
      .catch(() => undefined);
    void api<{ job: LocalScanJob | null }>(`/projects/${projectId}/aime-local/scans/latest`)
      .then((payload) => setLocalScan(payload.job))
      .catch(() => undefined);
    void api<LocalReference[]>(`/projects/${projectId}/aime-local/references`)
      .then(setLocalReferences)
      .catch(() => undefined);
  }, [module, projectId]);

  if (!project) return null;

  const addPayment = () => addEntity("payments", { label: "Nouveau paiement", amountCents: 0, at: Date.now(), state: "du", category: "À classer" });
  const uploadFile = async (file: File) => {
    setBusy(true);
    setUploadProgress(0);
    setRemoteError("");
    try {
      const request = await api<{ uploadURL: string; objectPath: string; finalizeToken: string }>("/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({ projectId: project.id, name: file.name, size: file.size, contentType: file.type }),
      });
      await putFile(request.uploadURL, file, setUploadProgress);
      await api("/storage/files", {
        method: "POST",
        body: JSON.stringify({ projectId: project.id, name: file.name, size: file.size, contentType: file.type, objectPath: request.objectPath, finalizeToken: request.finalizeToken }),
      });
      setFiles(await api<StoredFile[]>(`/projects/${project.id}/files`));
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Ajout impossible");
    } finally {
      setBusy(false);
      setUploadProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const deleteFile = async (file: StoredFile) => {
    if (!window.confirm(`Supprimer définitivement « ${file.name} » ?`)) return;
    setBusy(true);
    setRemoteError("");
    try {
      await api(`/storage/files/${file.id}`, { method: "DELETE" });
      setFiles(value => value.filter(item => item.id !== file.id));
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Suppression impossible");
    } finally {
      setBusy(false);
    }
  };
  const sendTemplate = async (template: typeof project.messageTemplates[number]) => {
    const recipientList = recipients.split(",").map(value => value.trim()).filter(Boolean);
    if (!recipientList.length || !template.title.trim() || !template.body.trim()) return;
    setBusy(true);
    setRemoteError("");
    try {
      const delivery = await api<SentMessage>(`/projects/${project.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ kind: "practical_info", recipients: recipientList, subject: template.title.trim(), body: template.body.trim(), confirmed: true }),
      });
      if (delivery.status !== "sent") throw new Error(delivery.providerError || "La livraison de l’e-mail n’a pas été confirmée");
      setRecipients("");
      setSelectedTemplateId(null);
      try {
        setMessages(await api<SentMessage[]>(`/projects/${project.id}/messages`));
      } catch {
        setRemoteError("Le message a été traité, mais le journal n’a pas pu être actualisé. Rouvrez ce module pour vérifier son statut.");
      }
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Envoi impossible");
      try {
        setMessages(await api<SentMessage[]>(`/projects/${project.id}/messages`));
      } catch {
        // The delivery error above remains the source of truth if history is unavailable too.
      }
    } finally {
      setBusy(false);
    }
  };
  const cancelScheduledMessage = async (messageId: string) => {
    setBusy(true);
    setRemoteError("");
    try {
      await api<SentMessage>(`/projects/${project.id}/messages/${messageId}`, { method: "POST" });
      setMessages(await api<SentMessage[]>(`/projects/${project.id}/messages`));
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Annulation impossible");
    } finally {
      setBusy(false);
    }
  };
  const rescheduleMessage = async (messageId: string) => {
    const value = rescheduleAt[messageId];
    if (!value) return;
    setBusy(true);
    setRemoteError("");
    try {
      await api<SentMessage>(`/projects/${project.id}/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ scheduledAt: new Date(value).toISOString() }),
      });
      setMessages(await api<SentMessage[]>(`/projects/${project.id}/messages`));
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Reprogrammation impossible");
    } finally {
      setBusy(false);
    }
  };
  const moderateMedia = async (mediaId: string, moderationStatus: ParticipantMedia["moderationStatus"]) => {
    setBusy(true);
    setRemoteError("");
    try {
      const updated = await api<ParticipantMedia>(`/projects/${project.id}/participant-media/${mediaId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: moderationStatus }),
      });
      setParticipantMedia(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Modération impossible");
    } finally {
      setBusy(false);
    }
  };
  const updateSongRequest = async (requestId: string, status: SongRequest["status"]) => {
    setBusy(true);
    setRemoteError("");
    try {
      const updated = await api<SongRequest>(`/projects/${project.id}/song-requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSongRequests(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Mise à jour impossible");
    } finally {
      setBusy(false);
    }
  };
  const sendThankYou = async (recipient: string, name: string) => {
    setBusy(true);
    setRemoteError("");
    try {
      const delivery = await api<SentMessage>(`/projects/${project.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          kind: "thank_you",
          recipients: [recipient],
          subject: `Merci d’avoir partagé ${project.title}`,
          body: `Bonjour ${name},\n\nMerci d’avoir été à nos côtés et d’avoir partagé ce Moment avec nous.\n\nAvec toute notre affection.`,
          confirmed: true,
        }),
      });
      setMessages(current => [delivery, ...current]);
      if (delivery.status !== "sent") setRemoteError(delivery.providerError || "L’envoi n’a pas été confirmé");
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Remerciement impossible à envoyer");
      try {
        setMessages(await api<SentMessage[]>(`/projects/${project.id}/messages`));
      } catch {
        // The delivery error remains visible if the journal cannot be refreshed.
      }
    } finally {
      setBusy(false);
    }
  };
  const refreshAimeLocal = async () => {
    if (!projectId) return;
    const [bridge, scan, refs] = await Promise.all([
      api<LocalBridgeStatus>("/aime-local/bridge/status").catch(() => ({ connected: false })),
      api<{ job: LocalScanJob | null }>(`/projects/${projectId}/aime-local/scans/latest`).catch(() => ({ job: null })),
      api<LocalReference[]>(`/projects/${projectId}/aime-local/references`).catch(() => []),
    ]);
    setLocalBridge(bridge);
    setLocalScan(scan.job);
    setLocalReferences(refs);
  };
  const createPairingToken = async () => {
    setBusy(true);
    setRemoteError("");
    try {
      const paired = await api<{ token: string; expiresAt: string }>("/aime-local/pairing-token", { method: "POST", body: JSON.stringify({}) });
      setPairingToken(paired);
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Connexion locale impossible");
    } finally {
      setBusy(false);
    }
  };
  const saveAuthorizedFolders = async () => {
    if (!projectId) return;
    setBusy(true);
    setRemoteError("");
    try {
      const folders = authorizedFoldersText.split("\n").map((value) => value.trim()).filter(Boolean);
      await api(`/projects/${projectId}/aime-local/folders`, { method: "PUT", body: JSON.stringify({ folders }) });
      await refreshAimeLocal();
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  };
  const launchLocalScan = async () => {
    if (!projectId) return;
    setBusy(true);
    setRemoteError("");
    try {
      await api(`/projects/${projectId}/aime-local/scan`, { method: "POST", body: JSON.stringify({}) });
      window.setTimeout(() => void refreshAimeLocal(), 3000);
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Scan impossible");
    } finally {
      setBusy(false);
    }
  };
  const linkLocalFile = async (file: LocalScanFile, suggestion?: LocalScanSuggestion) => {
    if (!projectId) return;
    setBusy(true);
    setRemoteError("");
    try {
      const linkedEntityKind = suggestion?.actions.includes("add_timeline") ? "timeline" : "project";
      await api(`/projects/${projectId}/aime-local/references`, {
        method: "POST",
        body: JSON.stringify({
          localIdentifier: file.localIdentifier,
          fingerprint: file.fingerprint,
          filename: file.name,
          relativePath: file.relativePath,
          sourceFolder: file.sourceFolder,
          extension: file.extension,
          fileType: file.fileType,
          size: file.size,
          modifiedAt: file.modifiedAt,
          metadata: {},
          linkedEntityKind,
        }),
      });
      await refreshAimeLocal();
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Liaison impossible");
    } finally {
      setBusy(false);
    }
  };
  const requestImport = async (reference: LocalReference) => {
    if (!projectId) return;
    setBusy(true);
    setRemoteError("");
    try {
      const result = await api<{ jobId: string }>(`/projects/${projectId}/aime-local/references/${reference.id}/import`, { method: "POST" });
      setPendingImportJobs((state) => ({ ...state, [reference.id]: result.jobId }));
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Import impossible");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!projectId || module !== "documents") return;
    const timer = window.setInterval(() => {
      void refreshAimeLocal();
      void Promise.all(Object.entries(pendingImportJobs).map(async ([referenceId, jobId]) => {
        const job = await api<{ status: string }>(`/projects/${projectId}/aime-local/import-jobs/${jobId}`).catch(() => null);
        if (job?.status === "done" || job?.status === "failed") {
          setPendingImportJobs((current) => {
            const next = { ...current };
            delete next[referenceId];
            return next;
          });
        }
      }));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [module, projectId, pendingImportJobs]);

  if (module === "seating") {
    const unassigned = project.guests.filter(g => effectiveGuestRsvp(g, participantLinks[g.id]) !== "decline" && !g.tableId);
    return <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between"><div><p className="text-sm text-foreground/50">{unassigned.length} invité{unassigned.length > 1 ? "s" : ""} sans table</p></div><AddBar label="Ajouter une table" onAdd={() => addEntity("tables", { name: `Table ${project.tables.length + 1}`, capacity: 8 })} /></div>
      {unassigned.length > 0 && <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4"><div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-300"><AlertTriangle className="w-3.5 h-3.5" /> À placer</div><div className="mt-3 grid gap-2 sm:grid-cols-2">{unassigned.map(g => <GuestSeat key={g.id} guest={g} tables={project.tables} onChange={tableId => updateEntity("guests", g.id, { tableId: tableId || undefined })} />)}</div></div>}
      <div className="grid gap-3 md:grid-cols-2">{project.tables.map(table => { const guests = project.guests.filter(g => g.tableId === table.id && effectiveGuestRsvp(g, participantLinks[g.id]) !== "decline"); return <div key={table.id} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><div className="flex items-center justify-between"><div><h4 className="text-sm font-medium">{table.name}</h4><p className={cn("text-xs mt-1", guests.length > table.capacity ? "text-rose-300" : "text-foreground/40")}>{guests.length} / {table.capacity} places</p></div><button onClick={() => { guests.forEach(g => updateEntity("guests", g.id, { tableId: undefined })); removeEntity("tables", table.id); }} className="text-foreground/30 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button></div><div className="mt-4 space-y-2">{guests.length === 0 ? <p className="text-xs text-foreground/30">Aucun invité assigné</p> : guests.map(g => <GuestSeat key={g.id} guest={g} tables={project.tables} onChange={tableId => updateEntity("guests", g.id, { tableId: tableId || undefined })} />)}</div></div> })}</div>
    </div>;
  }

  if (module === "budget") {
    const estimated = project.providers.reduce((sum, p) => sum + (p.amountCents || 0), 0);
    const committed = project.providers.filter(p => ["devis", "reserve"].includes(p.status)).reduce((sum, p) => sum + (p.amountCents || 0), 0);
    const paid = project.payments.filter(p => p.state === "paye").reduce((sum, p) => sum + p.amountCents, 0);
    const remaining = Math.max(0, (project.budget.value || estimated / 100) * 100 - paid);
    return <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[["Estimé", estimated], ["Engagé", committed], ["Payé", paid], ["Restant", remaining]].map(([label, value]) => <div key={label as string} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><p className="text-[10px] uppercase tracking-widest text-foreground/40">{label}</p><p className="mt-2 font-mono text-lg">{euro(value as number)}</p></div>)}</div>
      <div className="rounded-2xl border border-foreground/10 bg-foreground/[.025] p-4"><p className="text-[10px] uppercase tracking-widest text-foreground/40">Répartition par catégorie</p><div className="mt-4 space-y-3">{Array.from(new Set(project.providers.map(p => p.category))).map(category => { const amount = project.providers.filter(p => p.category === category).reduce((sum, p) => sum + (p.amountCents || 0), 0); const pct = estimated ? Math.min(100, Math.round(amount / estimated * 100)) : 0; return <div key={category}><div className="mb-1 flex justify-between text-xs"><span className="capitalize text-foreground/65">{category}</span><span className="font-mono text-foreground/45">{euro(amount)}</span></div><div className="h-1 rounded-full bg-foreground/10"><div className="h-1 rounded-full bg-foreground/60" style={{ width: `${pct}%` }} /></div></div> })}</div></div>
      <div className="flex items-center justify-between"><div><h4 className="text-sm font-medium">Échéancier</h4><p className="text-xs text-foreground/40 mt-1">Chaque modification est enregistrée dans ce Monde.</p></div><AddBar label="Ajouter un paiement" onAdd={addPayment} /></div>
      {project.payments.length === 0 ? <Empty>Aucun paiement à suivre.</Empty> : <div className="space-y-2">{project.payments.map(p => <PaymentRow key={p.id} payment={p} onToggle={() => updateEntity("payments", p.id, { state: p.state === "paye" ? "du" : "paye" })} onDelete={() => removeEntity("payments", p.id)} onEdit={updates => updateEntity("payments", p.id, updates)} />)}</div>}
    </div>;
  }

  if (module === "documents") return <div className="max-w-3xl mx-auto space-y-5">
    <PersistenceState status={syncStatus} error={syncError} />
    <div className="flex justify-end">
      <LaboratoryShortcut onClick={() => openLaboratory({ type: "suggestion", context: { projectId: project.id, role: currentRole, route: "world", path: "/user-portal", source: "documents-module", panel: "documents", narrative: "Retour volontaire envoyé depuis le module Documents / AIME LOCAL." } })} />
    </div>
    <div className="rounded-2xl border border-sky-300/20 bg-sky-300/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-sky-100/80">AIME LOCAL</p>
          <p className="mt-1 text-sm text-foreground/80">AIME peut analyser certains fichiers sur votre Mac sans les importer automatiquement.</p>
          <p className="mt-1 text-xs text-foreground/45">
            État bridge : {localBridge.connected ? `connecté (${localBridge.bridgeVersion || "bridge"})` : "non connecté"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => void createPairingToken()} className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/75 transition hover:bg-white hover:text-black disabled:opacity-40">
            {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            Connecter mon Mac
          </button>
          <button disabled={busy} onClick={() => void refreshAimeLocal()} className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/75 transition hover:bg-white hover:text-black disabled:opacity-40">
            <RefreshCcw className="h-3.5 w-3.5" /> Actualiser
          </button>
        </div>
      </div>
      {pairingToken && (
        <div className="mt-3 rounded-xl border border-foreground/10 bg-background/20 p-3 text-xs">
          <p className="text-foreground/75">Terminal (une seule fois):</p>
          <code className="mt-1 block overflow-auto rounded bg-black/60 p-2 text-[11px] text-emerald-200">
            pnpm --filter @workspace/scripts run aime-local-bridge -- --api-base {window.location.origin}/api --pairing-token {pairingToken.token}
          </code>
          <p className="mt-1 text-foreground/45">Code valide jusqu&apos;au {new Date(pairingToken.expiresAt).toLocaleTimeString("fr-FR")}.</p>
        </div>
      )}
      <div className="mt-3 space-y-2">
        <label className="block text-[10px] uppercase tracking-[.2em] text-foreground/45">Dossiers autorisés (un par ligne)</label>
        <textarea
          value={authorizedFoldersText}
          onChange={(event) => setAuthorizedFoldersText(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-foreground/10 bg-background/30 px-3 py-2 text-xs outline-none focus:border-foreground/30"
          placeholder={`/Users/${project.title.toLowerCase().replace(/\s+/g, "-")}/Documents`}
        />
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => void saveAuthorizedFolders()} className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/75 transition hover:bg-white hover:text-black disabled:opacity-40">
            <FolderOpen className="h-3.5 w-3.5" /> Enregistrer les dossiers
          </button>
          <button disabled={busy || !localBridge.connected} onClick={() => void launchLocalScan()} className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/75 transition hover:bg-white hover:text-black disabled:opacity-40">
            <Search className="h-3.5 w-3.5" /> Lancer un scan manuel
          </button>
        </div>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-foreground/70">Documents & médias privés</p><p className="mt-1 text-xs text-foreground/40">Stockés dans l’espace sécurisé de ce Monde.</p></div>{canManage && <><button disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/75 transition hover:bg-white hover:text-black disabled:opacity-40">{busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Ajouter un fichier</button><input ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp,video/mp4" className="hidden" onChange={event => event.target.files?.[0] && void uploadFile(event.target.files[0])} /></>}</div>
    {remoteError && <p className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-3 text-xs text-rose-200">{remoteError}</p>}
    {uploadProgress !== null && <div role="status" aria-live="polite" className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3"><div className="flex justify-between text-xs text-amber-100"><span>Transfert vers l’espace privé</span><span>{uploadProgress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-amber-200 transition-[width]" style={{ width: `${uploadProgress}%` }} /></div></div>}
    {localScan && (
      <div className="rounded-2xl border border-foreground/10 bg-foreground/[.03] p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-foreground/45">Résultats AIME LOCAL</p>
          <span className="text-xs text-foreground/45">{localScan.results.length} fichier(s)</span>
        </div>
        {localScan.suggestions.length === 0 ? <p className="mt-2 text-xs text-foreground/45">Aucune suggestion contextuelle pour le moment.</p> : <div className="mt-3 space-y-2">{localScan.suggestions.slice(0, 12).map((suggestion) => {
          const file = localScan.results.find((item) => item.localIdentifier === suggestion.localIdentifier);
          if (!file) return null;
          const linked = localReferences.find((reference) => reference.localIdentifier === suggestion.localIdentifier);
          return <div key={suggestion.localIdentifier} className="rounded-xl border border-foreground/10 bg-background/20 p-3">
            <p className="truncate text-sm">{file.name}</p>
            <p className="mt-1 text-xs text-foreground/50">{suggestion.reason}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button disabled={busy} onClick={() => void linkLocalFile(file, suggestion)} className="rounded-full border border-foreground/15 px-2.5 py-1 text-[11px] text-foreground/80 hover:bg-white hover:text-black disabled:opacity-40">Lier au projet</button>
              <button disabled={busy || !linked || !canManage} onClick={() => linked && void requestImport(linked)} className="inline-flex items-center gap-1 rounded-full border border-foreground/15 px-2.5 py-1 text-[11px] text-foreground/80 hover:bg-white hover:text-black disabled:opacity-40"><Upload className="h-3 w-3" />Importer dans AIME</button>
              <button disabled={busy || !linked} onClick={() => linked && void api(`/projects/${project.id}/aime-local/references/${linked.id}/state`, { method: "PATCH", body: JSON.stringify({ state: "ignored" }) }).then(() => refreshAimeLocal())} className="rounded-full border border-foreground/15 px-2.5 py-1 text-[11px] text-foreground/55 hover:bg-foreground/10 disabled:opacity-40">Ignorer</button>
            </div>
          </div>;
        })}</div>}
      </div>
    )}
    {files.length === 0 ? <Empty>Aucun document stocké.</Empty> : <div className="space-y-2">{files.map(file => <div key={file.id} className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><div className="min-w-0 flex-1"><p className="truncate text-sm">{file.name}</p><p className="mt-1 text-xs text-foreground/35">{fileSize(file.size)} · {file.contentType || "fichier"}</p></div><a aria-label={`Aperçu de ${file.name}`} target="_blank" rel="noreferrer" href={`/api/storage/files/${file.id}`} className="p-2 text-foreground/45 hover:text-foreground"><ExternalLink className="h-4 w-4" /></a><a aria-label={`Télécharger ${file.name}`} href={`/api/storage/files/${file.id}?download=1`} className="p-2 text-foreground/45 hover:text-foreground"><Download className="h-4 w-4" /></a>{canManage && <button disabled={busy} aria-label={`Supprimer ${file.name}`} onClick={() => void deleteFile(file)} className="p-2 text-foreground/30 hover:text-rose-300 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>}</div>)}</div>}
    {!canManage && <p className="text-xs text-foreground/35">Seuls les responsables du Monde peuvent consulter ou modifier ces documents privés.</p>}
  </div>;

  if (module === "ceremony") {
    const c = project.ceremony;
    return <div className="max-w-3xl mx-auto space-y-5"><EditableArea label="Intention et notes de cérémonie" value={c.notes} onChange={notes => updateProject({ ceremony: { ...c, notes } })} /><div className="grid gap-3 sm:grid-cols-2"><EditableArea label="Menu" value={c.menu} onChange={menu => updateProject({ ceremony: { ...c, menu } })} /><EditableArea label="Boissons" value={c.drinks} onChange={drinks => updateProject({ ceremony: { ...c, drinks } })} /><EditableArea label="Gâteau" value={c.cake} onChange={cake => updateProject({ ceremony: { ...c, cake } })} /><EditableArea label="Première danse" value={c.firstDance} onChange={firstDance => updateProject({ ceremony: { ...c, firstDance } })} /></div><div className="rounded-2xl border border-foreground/10 p-4"><p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-3">Structure</p>{c.structure.map((item, i) => <div key={`${item}-${i}`} className="flex gap-3 py-2 border-b border-foreground/5 last:border-0 text-sm"><span className="text-foreground/30 font-mono">{String(i + 1).padStart(2, "0")}</span>{item}</div>)}</div><div className="rounded-2xl border border-foreground/10 p-4"><p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-3">Lectures et vœux</p>{c.readings.map(r => <div key={r.id} className="mb-3"><p className="text-sm">{r.title} <span className="text-foreground/40">· {r.reader}</span></p><p className="text-xs text-foreground/45 mt-1">{r.text}</p></div>)}{c.vows.map(v => <EditableArea key={v.id} label={`Vœux de ${v.person}`} value={v.text} onChange={text => updateProject({ ceremony: { ...c, vows: c.vows.map(x => x.id === v.id ? { ...x, text } : x) } })} />)}</div></div>;
  }

  if (module === "music") {
    const timelineMusicEvents = [...project.timeline].sort((a, b) => a.time - b.time);
    const selectedTrack = project.music.find(track => track.id === selectedMusicId) || project.music[0];
    if (!canEdit) return <div className="mx-auto max-w-4xl space-y-5">
      <div><h4 className="text-sm font-medium">Musique reliée aux Moments</h4><p className="mt-1 text-xs text-foreground/45">Consultation seule : les responsables et la famille autorisée peuvent modifier cette sélection.</p></div>
      {project.music.length === 0 ? <Empty>Aucun morceau n’est encore relié à un Moment.</Empty> : project.music.map(track => <div key={track.id} className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><TrackArtwork track={track} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm">{track.title}</p><p className="mt-1 truncate text-xs text-foreground/45">{track.artist || "Artiste à préciser"} · {track.moment}</p></div><span className="text-[10px] uppercase tracking-wider text-foreground/35">{track.status === "valide" ? "Validé" : "À choisir"}</span></div>)}
    </div>;
    const runMusicSearch = async () => {
      const term = musicQuery.trim();
      if (term.length < 2) {
        setMusicSearchError("Saisissez au moins deux caractères.");
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
        setMusicSearchError(error instanceof Error ? error.message : "Recherche impossible.");
      } finally {
        setMusicSearchBusy(false);
      }
    };
    const selectMusicResult = (result: MusicSearchResult) => {
      if (!selectedTrack) return;
      const currentEventIds = musicEventIdsForTrack(project, selectedTrack.id);
      const nextProject = linkMusicTrackToEvents({
        ...project,
        music: project.music.map(track => track.id === selectedTrack.id ? {
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
        } : track),
      }, selectedTrack.id, currentEventIds);
      updateProject(nextProject);
    };
    const toggleTrackEvent = (track: MusicTrack, eventId: string) => {
      const current = musicEventIdsForTrack(project, track.id);
      const next = current.includes(eventId) ? current.filter(id => id !== eventId) : [...current, eventId];
      updateProject(linkMusicTrackToEvents(project, track.id, next));
    };
    return <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex justify-end">
        <LaboratoryShortcut onClick={() => openLaboratory({ type: "suggestion", context: { projectId: project.id, role: currentRole, route: "world", path: "/user-portal", source: "music-module", panel: "music", view: "music", narrative: "Retour volontaire envoyé depuis le module Musique." } })} />
      </div>
      {canManage && <section className="rounded-2xl border border-sky-300/20 bg-sky-300/5 p-4">
        <div className="flex items-start gap-3">
          <Music2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
          <div><h4 className="text-sm font-medium">Demandes reçues sans interrompre le DJ</h4><p className="mt-1 text-xs leading-relaxed text-foreground/50">Les demandes restent une file de souhaits. Elles ne lancent jamais un morceau et ne promettent pas sa diffusion.</p></div>
        </div>
        {songRequests.length === 0 ? <p className="mt-4 text-xs text-foreground/35">Aucune demande musicale reçue.</p> : <div className="mt-4 space-y-2">{songRequests.map(request => {
          const labels: Record<SongRequest["status"], string> = { new: "Nouvelle", seen: "Vue", accepted: "Acceptée", played: "Jouée", rejected: "Refusée" };
          return <div key={request.id} className="rounded-xl border border-foreground/10 bg-background/20 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm">{request.title}</p><p className="mt-1 text-xs text-foreground/45">{request.artist || "Artiste non précisé"} · {request.guestName || "Invité"}</p>{request.message && <p className="mt-2 text-xs text-foreground/55">« {request.message} »</p>}</div><span className="rounded-full border border-foreground/10 px-2 py-1 text-[10px] uppercase tracking-wider text-foreground/55">{labels[request.status]}</span></div>
            <div className="mt-3 flex flex-wrap gap-1.5">{(["seen", "accepted", "played", "rejected"] as const).map(status => <button key={status} disabled={busy || request.status === status} onClick={() => void updateSongRequest(request.id, status)} className="rounded-full border border-foreground/10 px-2.5 py-1.5 text-[10px] text-foreground/55 transition hover:border-foreground/30 hover:text-foreground disabled:opacity-30">{labels[status]}</button>)}</div>
          </div>;
        })}</div>}
      </section>}
      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          <span className="font-medium text-emerald-200">Source autorisée connectée</span>
          <span className="text-foreground/40">· {MUSIC_SOURCE}</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-foreground/55">Les métadonnées et les pochettes viennent du catalogue Apple. Un aperçu audio est affiché uniquement quand Apple fournit un extrait légal pour ce morceau.</p>
      </div>
      <div className="rounded-2xl border border-foreground/10 bg-foreground/[.025] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1"><span className="mb-2 block text-[10px] uppercase tracking-widest text-foreground/40">Rechercher dans {MUSIC_SOURCE}</span><input value={musicQuery} onChange={event => setMusicQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void runMusicSearch(); }} placeholder="Titre ou artiste" className="w-full rounded-xl border border-foreground/10 bg-background/20 px-3 py-2 text-sm outline-none focus:border-foreground/30" /></label>
          <button type="button" disabled={musicSearchBusy} onClick={() => void runMusicSearch()} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-black disabled:opacity-40">{musicSearchBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}Rechercher</button>
        </div>
        {musicSearchError && <p role="alert" className="mt-3 text-xs text-rose-200">{musicSearchError}</p>}
        {musicResults.length > 0 && <div className="mt-4 space-y-2 border-t border-foreground/10 pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] uppercase tracking-widest text-foreground/40">Résultats réels</p>{selectedTrack && <label className="flex items-center gap-2 text-xs text-foreground/55">Relier à<select value={selectedTrack.id} onChange={event => setSelectedMusicId(event.target.value)} className="rounded-lg bg-foreground/10 px-2 py-1 text-xs text-foreground outline-none">{project.music.map(track => <option key={track.id} value={track.id}>{track.moment}</option>)}</select></label>}</div>{musicResults.map(result => <MusicSearchResultRow key={`${result.provider}:${result.externalId}`} result={result} disabled={!selectedTrack} onSelect={() => selectMusicResult(result)} />)}</div>}
      </div>
      <div className="flex items-center justify-between"><div><h4 className="text-sm font-medium">Morceaux reliés aux Moments</h4><p className="mt-1 text-xs text-foreground/40">Chaque morceau peut être relié à un ou plusieurs événements de la Timeline.</p></div><AddBar label="Saisie manuelle" onAdd={() => addEntity("music", { moment: "Nouveau Moment", title: "À choisir", artist: "", status: "a_choisir", metadataStatus: "manual", provenance: "real", timelineEventIds: [] })} /></div>
      {project.music.length === 0 ? <Empty>Aucun morceau n’est encore relié à un Moment.</Empty> : project.music.map(track => <MusicTrackRow key={track.id} track={track} timelineEvents={timelineMusicEvents} linkedEventIds={musicEventIdsForTrack(project, track.id)} onToggleEvent={eventId => toggleTrackEvent(track, eventId)} onUpdate={updates => updateEntity("music", track.id, updates)} onDelete={() => removeEntity("music", track.id)} />)}
    </div>;
  }

  if (module === "logistics") {
    const l = project.logistics;
    return <div className="max-w-4xl mx-auto space-y-4"><EditableArea label="Parking" value={l.parking} onChange={parking => updateProject({ logistics: { ...l, parking } })} /><EditableArea label="Accessibilité" value={l.accessibility} onChange={accessibility => updateProject({ logistics: { ...l, accessibility } })} /><EditableArea label="Plan météo de repli" value={l.weatherFallback} onChange={weatherFallback => updateProject({ logistics: { ...l, weatherFallback } })} /><div className="rounded-2xl border border-foreground/10 p-4"><div className="flex justify-between items-center mb-3"><p className="text-[10px] uppercase tracking-widest text-foreground/40">À emporter</p><AddBar label="Ajouter" onAdd={() => updateProject({ logistics: { ...l, packing: [...l.packing, { id: newId(), label: "Nouvel élément", done: false }] } })} /></div>{l.packing.length === 0 ? <Empty>La liste est vide.</Empty> : l.packing.map(item => <div key={item.id} className="flex items-center gap-3 py-2 border-b border-foreground/5 last:border-0"><button onClick={() => updateProject({ logistics: { ...l, packing: l.packing.map(x => x.id === item.id ? { ...x, done: !x.done } : x) } })} className={cn("w-5 h-5 rounded border flex items-center justify-center", item.done ? "bg-white text-black" : "border-foreground/25")}>{item.done && <Check className="w-3 h-3" />}</button><input value={item.label} onChange={e => updateProject({ logistics: { ...l, packing: l.packing.map(x => x.id === item.id ? { ...x, label: e.target.value } : x) } })} className={cn("text-sm flex-1 bg-transparent outline-none", item.done && "line-through text-foreground/40")} /><button onClick={() => updateProject({ logistics: { ...l, packing: l.packing.filter(x => x.id !== item.id) } })} className="text-foreground/30 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button></div>)}</div><div className="rounded-2xl border border-foreground/10 p-4"><div className="flex items-center justify-between mb-3"><p className="text-[10px] uppercase tracking-widest text-foreground/40">Contacts d'urgence</p><AddBar label="Ajouter" onAdd={() => updateProject({ logistics: { ...l, emergencyContacts: [...l.emergencyContacts, { id: newId(), name: "Nouveau contact", phone: "", role: "À préciser" }] } })} /></div>{l.emergencyContacts.map(contact => <div key={contact.id} className="grid grid-cols-3 gap-2 border-b border-foreground/5 py-2 last:border-0"><input value={contact.name} onChange={e => updateProject({ logistics: { ...l, emergencyContacts: l.emergencyContacts.map(x => x.id === contact.id ? { ...x, name: e.target.value } : x) } })} className="bg-transparent text-sm outline-none" /><input value={contact.phone} onChange={e => updateProject({ logistics: { ...l, emergencyContacts: l.emergencyContacts.map(x => x.id === contact.id ? { ...x, phone: e.target.value } : x) } })} placeholder="Téléphone" className="bg-transparent text-xs outline-none" /><input value={contact.role} onChange={e => updateProject({ logistics: { ...l, emergencyContacts: l.emergencyContacts.map(x => x.id === contact.id ? { ...x, role: e.target.value } : x) } })} className="bg-transparent text-xs text-foreground/50 outline-none" /></div>)}</div><div className="grid gap-3 md:grid-cols-2">{l.accommodations.map(a => <div key={a.id} className="rounded-2xl border border-foreground/10 p-4"><p className="text-sm">{a.name}</p><p className="text-xs text-foreground/45 mt-1">{a.booked} réservées · {a.address}</p></div>)}{l.shuttles.map(s => <div key={s.id} className="rounded-2xl border border-foreground/10 p-4"><p className="text-sm">{s.route}</p><p className="text-xs text-foreground/45 mt-1">Départ {s.departure} · {s.capacity} places</p></div>)}</div></div>;
  }

  if (module === "messages") {
    const templates = project.messageTemplates.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));
    return <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex justify-end">
        <LaboratoryShortcut onClick={() => openLaboratory({ type: "remarque", context: { projectId: project.id, role: currentRole, route: "world", path: "/user-portal", source: "messages-module", panel: "messages", narrative: "Retour volontaire envoyé depuis le module Messages." } })} />
      </div>
      <PersistenceState status={syncStatus} error={syncError} />
      {remoteError && <p className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-3 text-xs text-rose-200">{remoteError}</p>}
      <div className="flex items-center gap-2"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un modèle…" className="flex-1 rounded-full border border-foreground/10 bg-foreground/5 px-4 py-2 text-sm outline-none focus:border-foreground/30" />{canManage && <AddBar label="Nouveau modèle" onAdd={() => addEntity("messageTemplates", { title: "Nouveau modèle", type: "pratique", body: "" })} />}</div>
      <div className="grid gap-3 md:grid-cols-2">{templates.map(template => <div key={template.id} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><div className="flex justify-between gap-2"><input disabled={!canManage} value={template.title} onChange={event => updateEntity("messageTemplates", template.id, { title: event.target.value })} className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:text-foreground/60" />{canManage && <button onClick={() => removeEntity("messageTemplates", template.id)} className="text-foreground/30 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>}</div><textarea disabled={!canManage} value={template.body} onChange={event => updateEntity("messageTemplates", template.id, { body: event.target.value })} placeholder="Écrire le message…" rows={3} className="mt-2 w-full resize-none bg-transparent text-xs leading-relaxed text-foreground/55 outline-none" />
        {canManage && selectedTemplateId !== template.id && <button disabled={!template.title.trim() || !template.body.trim()} onClick={() => setSelectedTemplateId(template.id)} className="mt-3 inline-flex items-center gap-2 text-xs text-foreground/70 hover:text-foreground disabled:opacity-30"><Send className="h-3.5 w-3.5" />Préparer l’envoi</button>}
        {selectedTemplateId === template.id && <div className="mt-4 space-y-3 border-t border-foreground/10 pt-4"><label className="block text-[10px] uppercase tracking-widest text-foreground/40">Destinataires</label><input autoFocus value={recipients} onChange={event => setRecipients(event.target.value)} placeholder="adresses séparées par des virgules" className="w-full rounded-xl border border-foreground/10 bg-background/20 px-3 py-2 text-xs outline-none focus:border-foreground/30" /><p className="text-xs text-foreground/40">L’objet sera « {template.title} ». L’envoi ne partira qu’après votre confirmation.</p><div className="flex gap-2"><button disabled={busy} onClick={() => setSelectedTemplateId(null)} className="rounded-full border border-foreground/10 px-3 py-2 text-xs text-foreground/55">Annuler</button><button disabled={busy || !recipients.trim()} onClick={() => void sendTemplate(template)} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-30">{busy && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}Confirmer et envoyer</button></div></div>}
      </div>)}</div>
       <div><p className="mb-3 text-[10px] uppercase tracking-widest text-foreground/40">Journal des envois et rappels</p>{!canManage ? <p className="text-xs text-foreground/35">Seuls les responsables du Monde peuvent envoyer des messages et consulter leur journal.</p> : messages.length === 0 ? <Empty>Aucun message envoyé ou programmé.</Empty> : messages.map(message => {
         const linkedEvent = message.timelineEventId ? project.timeline.find(event => event.id === message.timelineEventId) : undefined;
         const statusLabel = message.status === "sent" ? "envoyé" : message.status === "failed" ? "échec Resend" : message.status === "scheduled" ? "programmé" : message.status === "cancelled" ? "annulé" : "en cours";
         return <div key={message.id} className="border-b border-foreground/5 py-3 text-sm">
           <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="truncate">{message.subject}</p>{linkedEvent && <p className="mt-1 text-xs text-emerald-300/75">Lié à « {linkedEvent.title} »</p>}<p className="mt-1 truncate text-xs text-foreground/35">{message.recipients.join(", ")}</p>{message.providerError && <p className="mt-1 text-xs text-rose-300">Resend : {message.providerError}</p>}</div><span className={cn("text-xs", message.status === "sent" ? "text-emerald-300" : message.status === "failed" ? "text-rose-300" : message.status === "cancelled" ? "text-foreground/35" : "text-amber-200")}>{new Date(message.scheduledAt || message.sentAt || message.createdAt).toLocaleString("fr-FR")} · {statusLabel}</span></div>
           {message.status === "scheduled" && <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-amber-300/10 bg-amber-300/5 p-3"><label className="flex-1 text-[10px] uppercase tracking-widest text-foreground/40">Nouvelle date<input type="datetime-local" value={rescheduleAt[message.id] || (message.scheduledAt ? new Date(message.scheduledAt).toISOString().slice(0, 16) : "")} min={new Date().toISOString().slice(0, 16)} onChange={event => setRescheduleAt(current => ({ ...current, [message.id]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-foreground/10 bg-background/20 px-2 py-1.5 text-xs normal-case tracking-normal outline-none" /></label><button disabled={busy || !rescheduleAt[message.id]} onClick={() => void rescheduleMessage(message.id)} className="rounded-full border border-foreground/15 px-3 py-2 text-xs disabled:opacity-30">Replanifier</button><button disabled={busy} onClick={() => void cancelScheduledMessage(message.id)} className="rounded-full border border-rose-300/20 px-3 py-2 text-xs text-rose-200 disabled:opacity-30">Annuler le rappel</button></div>}
         </div>;
       })}</div>
    </div>;
  }

  if (module === "contributions") {
    return <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex justify-end">
        <LaboratoryShortcut type="bug" onClick={() => openLaboratory({ type: "bug", context: { projectId: project.id, role: currentRole, route: "world", path: "/user-portal", source: "contributions-module", panel: "contributions", narrative: "Retour volontaire envoyé depuis le module Contributions invitées." } })} />
      </div>
      <div><h4 className="text-sm font-medium">Photos et vidéos reçues</h4><p className="mt-1 text-xs leading-relaxed text-foreground/45">Chaque contribution reste privée jusqu’à votre décision. Le consentement et la provenance restent attachés au fichier.</p></div>
      {remoteError && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-3 text-xs text-rose-200">{remoteError}</p>}
      {participantMedia.length === 0 ? <Empty>Aucune contribution invitée reçue.</Empty> : <div className="grid gap-3 sm:grid-cols-2">{participantMedia.map(media => <article key={media.id} className="overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[.035]">
        <a href={`/api/storage/files/${media.id}`} target="_blank" rel="noreferrer" className="flex aspect-video items-center justify-center bg-foreground/5 text-foreground/30" aria-label={`Ouvrir ${media.name}`}>
          {media.contentType.startsWith("image/") ? <Image className="h-8 w-8" /> : <Film className="h-8 w-8" />}
        </a>
        <div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm">{media.caption || media.name}</p><p className="mt-1 text-xs text-foreground/40">{media.guestName || "Invité"} · {fileSize(media.size)}</p></div><span className={cn("rounded-full border px-2 py-1 text-[9px] uppercase tracking-wider", media.moderationStatus === "approved" ? "border-emerald-300/20 text-emerald-300" : media.moderationStatus === "rejected" ? "border-rose-300/20 text-rose-300" : "border-amber-300/20 text-amber-200")}>{media.moderationStatus === "approved" ? "Partagé" : media.moderationStatus === "rejected" ? "Refusé" : "À vérifier"}</span></div>
          <p className="mt-2 text-[10px] text-foreground/35">{media.visibility === "guests" ? "Partage avec les invités demandé" : "Couple uniquement"} · consentement {media.consent ? "confirmé" : "absent"}</p>
          {canManage && <div className="mt-3 flex gap-2"><button disabled={busy || media.moderationStatus === "approved" || !media.consent} onClick={() => void moderateMedia(media.id, "approved")} className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background disabled:opacity-30">Valider</button><button disabled={busy || media.moderationStatus === "rejected"} onClick={() => void moderateMedia(media.id, "rejected")} className="rounded-full border border-rose-300/20 px-3 py-1.5 text-xs text-rose-200 disabled:opacity-30">Refuser</button></div>}
        </div>
      </article>)}</div>}
    </div>;
  }

  if (module === "thanks") {
    const thankYouMessages = messages.filter(message => message.kind === "thank_you");
    return <div className="mx-auto max-w-4xl space-y-5">
      <div><h4 className="text-sm font-medium">Remercier chaque personne réellement</h4><p className="mt-1 text-xs leading-relaxed text-foreground/45">Le statut vient du journal d’envoi. Un clic seul ne transforme jamais un remerciement en message envoyé.</p></div>
      {remoteError && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-3 text-xs text-rose-200">{remoteError}</p>}
      <div className="space-y-2">{project.guests.map(guest => {
        const deliveries = guest.contact ? thankYouMessages.filter(message => message.recipients.includes(guest.contact!)) : [];
        const latest = [...deliveries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const label = !guest.contact ? "Sans adresse" : latest?.status === "sent" ? "Envoyé" : latest?.status === "failed" ? "Erreur" : latest ? "En cours" : "À préparer";
        return <div key={guest.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><div className="min-w-0 flex-1"><p className="text-sm">{guest.name}</p><p className="mt-1 truncate text-xs text-foreground/40">{guest.contact || "Ajoutez une adresse dans Personnes"} · {label}</p>{latest?.providerError && <p className="mt-1 text-xs text-rose-300">{latest.providerError}</p>}</div>{canManage && guest.contact && latest?.status !== "sent" && <button disabled={busy} onClick={() => void sendThankYou(guest.contact!, guest.name)} className="rounded-full bg-foreground px-3 py-2 text-xs font-medium text-background disabled:opacity-30">{latest?.status === "failed" ? "Réessayer" : "Confirmer et envoyer"}</button>}</div>;
      })}</div>
    </div>;
  }

  if (module === "film") {
    const videos = files.filter(file => file.contentType.startsWith("video/") && !file.guestId);
    const approvedGuestVideos = participantMedia.filter(file => file.contentType.startsWith("video/") && file.moderationStatus === "approved");
    return <div className="mx-auto max-w-4xl space-y-5">
      <div><h4 className="text-sm font-medium">Film du Jour J</h4><p className="mt-1 text-xs leading-relaxed text-foreground/45">AIME ne simule aucun montage. Seules les vidéos réellement déposées dans l’espace privé ou validées depuis les invités apparaissent ici.</p></div>
      {remoteError && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-3 text-xs text-rose-200">{remoteError}</p>}
      {[...videos, ...approvedGuestVideos].length === 0 ? <Empty>Aucun film réel n’a encore été livré ou validé.</Empty> : <div className="space-y-2">{[...videos, ...approvedGuestVideos].map(file => <a key={file.id} target="_blank" rel="noreferrer" href={`/api/storage/files/${file.id}`} className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4 text-foreground/70 transition hover:text-foreground"><Film className="h-5 w-5" /><span className="min-w-0 flex-1 truncate text-sm">{file.name}</span><span className="text-xs text-foreground/35">{fileSize(file.size)}</span><ExternalLink className="h-4 w-4" /></a>)}</div>}
      <p className="rounded-xl border border-foreground/10 p-3 text-xs text-foreground/40">Pour livrer le film final, ajoutez la vidéo depuis Documents. Le fichier reste privé tant que vous ne choisissez pas de le partager.</p>
    </div>;
  }

  if (module === "honeymoon") {
    const posts = project.timeline.filter(event => event.phase === "apres" && event.visibility === "audience").sort((a, b) => b.time - a.time);
    return <div className="mx-auto max-w-4xl space-y-5">
      <div><h4 className="text-sm font-medium">Actualités du voyage de noces</h4><p className="mt-1 text-xs leading-relaxed text-foreground/45">Rien n’est publié par défaut. Chaque actualité devient un Moment Après destiné à l’audience, sans suivi continu de votre position.</p></div>
      {canManage && <button onClick={() => addEntity("timeline", { time: Date.now(), durationMinutes: 0, kind: "souvenir", title: "Nouvelle du voyage", detail: "À compléter avant de partager.", status: "a_valider", confidence: "confirme", phase: "apres", universe: project.universe, provenance: "real", visibility: "prive", relations: [], dependencyIds: [], resources: [] })} className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/70"><Plus className="h-3.5 w-3.5" />Préparer une actualité privée</button>}
      {posts.length === 0 ? <Empty>Aucune actualité n’est partagée avec les invités.</Empty> : <div className="space-y-3">{posts.map(post => <article key={post.id} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><p className="text-[10px] uppercase tracking-widest text-foreground/35">{new Date(post.time).toLocaleDateString("fr-FR")}{post.location ? ` · ${post.location}` : ""}</p><h5 className="mt-2 text-sm font-medium">{post.title}</h5>{post.detail && <p className="mt-2 text-xs leading-relaxed text-foreground/55">{post.detail}</p>}</article>)}</div>}
      <p className="text-xs text-foreground/35">Pour publier une actualité préparée, ouvrez son Moment dans la Timeline et choisissez la visibilité Audience après validation.</p>
    </div>;
  }

  if (module === "team") return <CollectionPanel title="Répartition des responsabilités" addLabel="Ajouter un rôle" onAdd={() => addEntity("team", { name: "Nouvelle personne", role: "Responsable", contact: "", responsibilities: [] })}>{project.team.length === 0 ? <Empty>Aucun rôle assigné.</Empty> : project.team.map(role => <div key={role.id} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4 flex items-start gap-4"><div className="grid flex-1 gap-2 sm:grid-cols-3"><input value={role.name} onChange={e => updateEntity("team", role.id, { name: e.target.value })} className="bg-transparent text-sm outline-none" /><input value={role.role} onChange={e => updateEntity("team", role.id, { role: e.target.value })} className="bg-transparent text-xs text-foreground/55 outline-none" /><input value={role.contact || ""} onChange={e => updateEntity("team", role.id, { contact: e.target.value })} placeholder="Contact" className="bg-transparent text-xs text-foreground/55 outline-none" /><input value={role.responsibilities.join(", ")} onChange={e => updateEntity("team", role.id, { responsibilities: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })} placeholder="Responsabilités séparées par des virgules" className="sm:col-span-3 bg-transparent text-xs text-foreground/65 outline-none placeholder:text-foreground/25" /></div><button onClick={() => removeEntity("team", role.id)} className="text-foreground/30 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button></div>)}</CollectionPanel>;

  return <CollectionPanel title="Souvenirs et après" addLabel="Ajouter un élément" onAdd={() => addEntity("memories", { kind: "shot", title: "Nouvelle idée", status: "a_faire" })}>{project.memories.length === 0 ? <Empty>Les souvenirs à préparer apparaîtront ici.</Empty> : project.memories.map(item => <div key={item.id} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4 flex items-center gap-3"><button onClick={() => updateEntity("memories", item.id, { status: item.status === "termine" ? "a_faire" : "termine" })} className={cn("w-6 h-6 rounded-full border flex items-center justify-center", item.status === "termine" ? "bg-white text-black" : "border-foreground/20")}>{item.status === "termine" && <Check className="w-3 h-3" />}</button><div className="grid flex-1 gap-2 sm:grid-cols-2"><input value={item.title} onChange={e => updateEntity("memories", item.id, { title: e.target.value })} className="bg-transparent text-sm outline-none" /><input value={item.owner || ""} onChange={e => updateEntity("memories", item.id, { owner: e.target.value })} placeholder="Responsable" className="bg-transparent text-xs text-foreground/55 outline-none" /><select value={item.kind} onChange={e => updateEntity("memories", item.id, { kind: e.target.value as MemoryItem["kind"] })} className="rounded-lg bg-foreground/10 px-2 py-1 text-xs outline-none"><option value="shot">Shot list</option><option value="media">Média</option><option value="message">Message</option><option value="album">Album</option><option value="rappel">Rappel</option></select></div><button onClick={() => removeEntity("memories", item.id)} className="text-foreground/30 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button></div>)}</CollectionPanel>;
}

function GuestSeat({ guest, tables, onChange }: { guest: { name: string; tableId?: string; dietary?: string }; tables: { id: string; name: string }[]; onChange: (value: string) => void }) {
  return <div className="flex items-center gap-2 rounded-xl bg-background/20 px-3 py-2"><span className="text-sm flex-1 truncate">{guest.name}{guest.dietary && <span className="text-[10px] text-amber-300 ml-2">{guest.dietary}</span>}</span><select value={guest.tableId || ""} onChange={e => onChange(e.target.value)} className="max-w-[130px] rounded-lg bg-foreground/10 px-2 py-1.5 text-xs outline-none"><option value="">Sans table</option>{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>;
}

function formatTrackDuration(durationMs?: number) {
  if (!durationMs || durationMs <= 0) return null;
  const totalSeconds = Math.round(durationMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function TrackArtwork({ track, size = "md" }: { track: Pick<MusicTrack, "external">; size?: "sm" | "md" }) {
  const artwork = track.external?.artworkUrl;
  const className = size === "sm" ? "h-12 w-12 rounded-lg" : "h-16 w-16 rounded-xl";
  return artwork
    ? <img src={artwork} alt="" className={`${className} shrink-0 object-cover`} />
    : <div className={`${className} flex shrink-0 items-center justify-center border border-foreground/10 bg-foreground/[.06] px-1 text-center text-[9px] uppercase leading-tight tracking-wider text-foreground/35`}>Cover indisponible</div>;
}

function MusicSearchResultRow({ result, disabled, onSelect }: { result: MusicSearchResult; disabled: boolean; onSelect: () => void }) {
  return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[.025] p-3">
    {result.artworkUrl ? <img src={result.artworkUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-foreground/10 text-[9px] uppercase leading-tight tracking-wider text-foreground/35">Cover indisponible</div>}
    <div className="min-w-[160px] flex-1">
      <p className="truncate text-sm">{result.title}</p>
      <p className="mt-1 truncate text-xs text-foreground/50">{result.artist}{result.collectionName ? ` · ${result.collectionName}` : ""}</p>
      <p className="mt-1 text-[10px] text-emerald-300/80">Métadonnées vérifiées · {formatTrackDuration(result.durationMs) || "durée indisponible"}{result.previewUrl ? " · aperçu disponible" : " · aperçu indisponible"}</p>
    </div>
    {result.previewUrl && <audio controls preload="none" src={result.previewUrl} className="h-8 max-w-[190px]" aria-label={`Écouter un aperçu de ${result.title}`} />}
    {result.trackUrl && <a href={result.trackUrl} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${result.title} dans ${MUSIC_SOURCE}`} className="p-2 text-foreground/40 hover:text-foreground"><ExternalLink className="h-4 w-4" /></a>}
    <button type="button" disabled={disabled} onClick={onSelect} className="rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/70 transition hover:border-foreground/40 hover:text-foreground disabled:opacity-35">Relier</button>
  </div>;
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
  const verified = Boolean(track.external);
  const duration = formatTrackDuration(track.external?.durationMs);
  return <div className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4">
    <div className="flex items-start gap-3">
      <TrackArtwork track={track} />
      <button type="button" onClick={() => onUpdate({ status: track.status === "valide" ? "a_choisir" : "valide" })} aria-label={track.status === "valide" ? `Marquer ${track.title} à choisir` : `Valider ${track.title}`} className={cn("mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border", track.status === "valide" ? "border-emerald-400 text-emerald-300" : "border-foreground/20 text-foreground/30")}>{track.status === "valide" && <Check className="h-3.5 w-3.5" />}</button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full border px-2 py-1 text-[10px]", verified ? "border-emerald-300/20 text-emerald-200" : "border-amber-300/20 text-amber-200")}>{verified ? `Métadonnées vérifiées · ${MUSIC_SOURCE}` : "Saisie manuelle · non vérifiée"}</span>
          {track.provenance === "demo" && <span className="text-[10px] text-foreground/35">Exemple initial</span>}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input value={track.moment} onChange={event => onUpdate({ moment: event.target.value })} placeholder="Moment" className="bg-transparent text-xs text-foreground/55 outline-none" />
          <input value={track.title} disabled={verified} onChange={event => onUpdate({ title: event.target.value })} className="bg-transparent text-sm outline-none disabled:text-foreground/80" />
          <input value={track.artist} disabled={verified} onChange={event => onUpdate({ artist: event.target.value })} placeholder="Artiste" className="bg-transparent text-sm text-foreground/60 outline-none placeholder:text-foreground/25 disabled:text-foreground/60" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-foreground/45">
          {duration && <span>{duration}</span>}
          {verified && track.external?.previewUrl
            ? <audio controls preload="none" src={track.external.previewUrl} className="h-8 max-w-[220px]" aria-label={`Écouter un aperçu de ${track.title}`} />
            : <span className={cn(verified ? "text-amber-200/80" : "text-foreground/35")}>{verified ? "Lecture indisponible pour ce titre" : "Aucun aperçu : morceau saisi manuellement"}</span>}
          {verified && track.external?.trackUrl && <a href={track.external.trackUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" />Ouvrir dans Apple Music</a>}
        </div>
      </div>
      <button type="button" onClick={onDelete} aria-label={`Supprimer ${track.title}`} className="text-foreground/30 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
    </div>
    <div className="mt-4 border-t border-foreground/10 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-foreground/40">Moments de la Timeline</p>
        <span className="text-[10px] text-foreground/35">{linkedEventIds.length} lié{linkedEventIds.length > 1 ? "s" : ""}</span>
      </div>
      {timelineEvents.length === 0
        ? <p className="mt-2 text-xs text-foreground/35">Aucun événement disponible.</p>
        : <div className="mt-2 grid max-h-44 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">{timelineEvents.map(event => <label key={event.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground/60 hover:bg-foreground/5"><input type="checkbox" checked={linkedEventIds.includes(event.id)} onChange={() => onToggleEvent(event.id)} className="accent-white" /><span className="truncate">{event.title}</span></label>)}</div>}
    </div>
  </div>;
}

function PaymentRow({ payment, onToggle, onDelete, onEdit }: { payment: Payment; onToggle: () => void; onDelete: () => void; onEdit: (u: Partial<Payment>) => void }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><button onClick={onToggle} className={cn("w-6 h-6 rounded-full border flex items-center justify-center", payment.state === "paye" ? "bg-emerald-300 text-black border-emerald-300" : "border-foreground/20")}>{payment.state === "paye" && <Check className="w-3.5 h-3.5" />}</button><div className="flex-1"><input value={payment.label} onChange={e => onEdit({ label: e.target.value })} className="bg-transparent text-sm outline-none w-full" /><p className="text-xs text-foreground/40 mt-1">{new Date(payment.at).toLocaleDateString("fr-FR")} · {payment.state === "paye" ? "réglé" : "à régler"}</p></div><input type="number" value={payment.amountCents / 100} onChange={e => onEdit({ amountCents: Number(e.target.value) * 100 })} className="w-24 rounded-lg bg-foreground/5 px-2 py-1.5 text-right font-mono text-sm outline-none" /><button onClick={onDelete} className="text-foreground/30 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button></div>;
}

function EditableArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><span className="text-[10px] uppercase tracking-widest text-foreground/40">{label}</span><textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-foreground/20" placeholder="À compléter…" /></label>;
}

function CollectionPanel({ title, addLabel, onAdd, children }: { title: string; addLabel: string; onAdd: () => void; children: ReactNode }) {
  return <div className="max-w-3xl mx-auto space-y-5">{title === "Morceaux reliés aux Moments" && <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-800/80 dark:text-amber-100/70">Cet outil relie des morceaux aux Moments. La destination majeure « Musique » reste la projection sonore de la Timeline, pas une simple playlist.</div>}<div className="flex items-center justify-between"><div><h4 className="text-sm font-medium">{title}</h4><p className="text-xs text-foreground/40 mt-1">Un espace simple, pensé pour avancer.</p></div><AddBar label={addLabel} onAdd={onAdd} /></div><div className="space-y-3">{children}</div></div>;
}

function PersistenceState({ status, error }: { status: "local" | "loading" | "saving" | "saved" | "error" | "conflict"; error?: string }) {
  const state = status === "saving" || status === "loading"
    ? { label: "Enregistrement en cours…", tone: "text-amber-200 border-amber-300/20 bg-amber-300/5" }
    : status === "saved"
      ? { label: "Modifications enregistrées dans le Monde", tone: "text-emerald-300 border-emerald-300/20 bg-emerald-300/5" }
      : status === "conflict"
        ? { label: "Une autre version doit être vérifiée avant d’enregistrer", tone: "text-rose-300 border-rose-300/20 bg-rose-300/5" }
        : status === "error"
          ? { label: error || "Modifications non enregistrées en ligne", tone: "text-rose-300 border-rose-300/20 bg-rose-300/5" }
          : { label: "Conservé sur cet appareil", tone: "text-foreground/50 border-foreground/10 bg-foreground/[.03]" };
  return <p role="status" aria-live="polite" className={cn("rounded-xl border px-3 py-2 text-xs", state.tone)}>{state.label}</p>;
}
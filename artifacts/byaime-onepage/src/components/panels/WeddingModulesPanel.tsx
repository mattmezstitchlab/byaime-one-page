import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useProject } from "@/store/project-store";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Check, AlertTriangle, Send, Upload, Download, ExternalLink, LoaderCircle } from "lucide-react";
import type { MemoryItem, Payment } from "@/lib/types";

export type WeddingModule = "seating" | "budget" | "documents" | "ceremony" | "music" | "logistics" | "messages" | "team" | "memories";

const euro = (cents: number) => `${(cents / 100).toLocaleString("fr-FR")} €`;
const newId = () => Math.random().toString(36).slice(2, 9);
type StoredFile = { id: string; name: string; contentType: string; size: number; createdAt?: string };
type SentMessage = { id: string; kind: string; recipients: string[]; subject: string; status: string; providerError?: string | null; sentAt?: string | null; createdAt: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Erreur ${response.status}`);
  return body as T;
}

const fileSize = (bytes: number) => bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1_000))} Ko` : `${(bytes / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;

function AddBar({ label, onAdd }: { label: string; onAdd: () => void }) {
  return <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/75 hover:bg-white hover:text-black transition-colors"><Plus className="w-3.5 h-3.5" />{label}</button>;
}

function Empty({ children }: { children: string }) {
  return <div className="rounded-2xl border border-dashed border-foreground/10 px-5 py-10 text-center text-sm text-foreground/40">{children}</div>;
}

export function WeddingModulesPanel({ module }: { module: WeddingModule }) {
  const { project, currentRole, updateProject, updateEntity, addEntity, removeEntity } = useProject();
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [remoteError, setRemoteError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const canManage = currentRole === "owner" || currentRole === "planner";
  const projectId = project?.id;

  useEffect(() => {
    if (!projectId || module !== "documents") return;
    setRemoteError("");
    void api<StoredFile[]>(`/projects/${projectId}/files`).then(setFiles).catch(error => setRemoteError(error.message));
  }, [module, projectId]);

  useEffect(() => {
    if (!projectId || module !== "messages" || !canManage) return;
    setRemoteError("");
    void api<SentMessage[]>(`/projects/${projectId}/messages`).then(setMessages).catch(error => setRemoteError(error.message));
  }, [canManage, module, projectId]);

  if (!project) return null;

  const addPayment = () => addEntity("payments", { label: "Nouveau paiement", amountCents: 0, at: Date.now(), state: "du", category: "À classer" });
  const uploadFile = async (file: File) => {
    setBusy(true);
    setRemoteError("");
    try {
      const request = await api<{ uploadURL: string; objectPath: string; finalizeToken: string }>("/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({ projectId: project.id, name: file.name, size: file.size, contentType: file.type }),
      });
      const uploaded = await fetch(request.uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploaded.ok) throw new Error("Échec du transfert vers le stockage privé");
      await api("/storage/files", {
        method: "POST",
        body: JSON.stringify({ projectId: project.id, name: file.name, size: file.size, contentType: file.type, objectPath: request.objectPath, finalizeToken: request.finalizeToken }),
      });
      setFiles(await api<StoredFile[]>(`/projects/${project.id}/files`));
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Ajout impossible");
    } finally {
      setBusy(false);
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
      await api(`/projects/${project.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ kind: "practical_info", recipients: recipientList, subject: template.title.trim(), body: template.body.trim(), confirmed: true }),
      });
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

  if (module === "seating") {
    const unassigned = project.guests.filter(g => g.rsvp !== "decline" && !g.tableId);
    return <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between"><div><p className="text-sm text-foreground/50">{unassigned.length} invité{unassigned.length > 1 ? "s" : ""} sans table</p></div><AddBar label="Ajouter une table" onAdd={() => addEntity("tables", { name: `Table ${project.tables.length + 1}`, capacity: 8 })} /></div>
      {unassigned.length > 0 && <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4"><div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-300"><AlertTriangle className="w-3.5 h-3.5" /> À placer</div><div className="mt-3 grid gap-2 sm:grid-cols-2">{unassigned.map(g => <GuestSeat key={g.id} guest={g} tables={project.tables} onChange={tableId => updateEntity("guests", g.id, { tableId: tableId || undefined })} />)}</div></div>}
      <div className="grid gap-3 md:grid-cols-2">{project.tables.map(table => { const guests = project.guests.filter(g => g.tableId === table.id); return <div key={table.id} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><div className="flex items-center justify-between"><div><h4 className="text-sm font-medium">{table.name}</h4><p className={cn("text-xs mt-1", guests.length > table.capacity ? "text-rose-300" : "text-foreground/40")}>{guests.length} / {table.capacity} places</p></div><button onClick={() => { guests.forEach(g => updateEntity("guests", g.id, { tableId: undefined })); removeEntity("tables", table.id); }} className="text-foreground/30 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button></div><div className="mt-4 space-y-2">{guests.length === 0 ? <p className="text-xs text-foreground/30">Aucun invité assigné</p> : guests.map(g => <GuestSeat key={g.id} guest={g} tables={project.tables} onChange={tableId => updateEntity("guests", g.id, { tableId: tableId || undefined })} />)}</div></div> })}</div>
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
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-foreground/70">Documents & médias privés</p><p className="mt-1 text-xs text-foreground/40">Stockés dans l’espace sécurisé de ce Monde.</p></div>{canManage && <><button disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/75 transition hover:bg-white hover:text-black disabled:opacity-40">{busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Ajouter un fichier</button><input ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp,video/mp4" className="hidden" onChange={event => event.target.files?.[0] && void uploadFile(event.target.files[0])} /></>}</div>
    {remoteError && <p className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-3 text-xs text-rose-200">{remoteError}</p>}
    {files.length === 0 ? <Empty>Aucun document stocké.</Empty> : <div className="space-y-2">{files.map(file => <div key={file.id} className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><div className="min-w-0 flex-1"><p className="truncate text-sm">{file.name}</p><p className="mt-1 text-xs text-foreground/35">{fileSize(file.size)} · {file.contentType || "fichier"}</p></div><a aria-label={`Aperçu de ${file.name}`} target="_blank" rel="noreferrer" href={`/api/storage/files/${file.id}`} className="p-2 text-foreground/45 hover:text-foreground"><ExternalLink className="h-4 w-4" /></a><a aria-label={`Télécharger ${file.name}`} href={`/api/storage/files/${file.id}?download=1`} className="p-2 text-foreground/45 hover:text-foreground"><Download className="h-4 w-4" /></a>{canManage && <button disabled={busy} aria-label={`Supprimer ${file.name}`} onClick={() => void deleteFile(file)} className="p-2 text-foreground/30 hover:text-rose-300 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>}</div>)}</div>}
    {!canManage && <p className="text-xs text-foreground/35">Vous pouvez consulter les documents, mais seuls les responsables du Monde peuvent les modifier.</p>}
  </div>;

  if (module === "ceremony") {
    const c = project.ceremony;
    return <div className="max-w-3xl mx-auto space-y-5"><EditableArea label="Intention et notes de cérémonie" value={c.notes} onChange={notes => updateProject({ ceremony: { ...c, notes } })} /><div className="grid gap-3 sm:grid-cols-2"><EditableArea label="Menu" value={c.menu} onChange={menu => updateProject({ ceremony: { ...c, menu } })} /><EditableArea label="Boissons" value={c.drinks} onChange={drinks => updateProject({ ceremony: { ...c, drinks } })} /><EditableArea label="Gâteau" value={c.cake} onChange={cake => updateProject({ ceremony: { ...c, cake } })} /><EditableArea label="Première danse" value={c.firstDance} onChange={firstDance => updateProject({ ceremony: { ...c, firstDance } })} /></div><div className="rounded-2xl border border-foreground/10 p-4"><p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-3">Structure</p>{c.structure.map((item, i) => <div key={`${item}-${i}`} className="flex gap-3 py-2 border-b border-foreground/5 last:border-0 text-sm"><span className="text-foreground/30 font-mono">{String(i + 1).padStart(2, "0")}</span>{item}</div>)}</div><div className="rounded-2xl border border-foreground/10 p-4"><p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-3">Lectures et vœux</p>{c.readings.map(r => <div key={r.id} className="mb-3"><p className="text-sm">{r.title} <span className="text-foreground/40">· {r.reader}</span></p><p className="text-xs text-foreground/45 mt-1">{r.text}</p></div>)}{c.vows.map(v => <EditableArea key={v.id} label={`Vœux de ${v.person}`} value={v.text} onChange={text => updateProject({ ceremony: { ...c, vows: c.vows.map(x => x.id === v.id ? { ...x, text } : x) } })} />)}</div></div>;
  }

  if (module === "music") return <CollectionPanel title="Bande-son du mariage" addLabel="Ajouter un morceau" onAdd={() => addEntity("music", { moment: "Nouveau moment", title: "À choisir", artist: "", status: "a_choisir" })}>{project.music.length === 0 ? <Empty>Aucun morceau associé à un moment.</Empty> : project.music.map(track => <div key={track.id} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4 flex gap-4 items-center"><button onClick={() => updateEntity("music", track.id, { status: track.status === "valide" ? "a_choisir" : "valide" })} className={cn("w-7 h-7 rounded-full border flex items-center justify-center", track.status === "valide" ? "border-emerald-400 text-emerald-300" : "border-foreground/20 text-foreground/30")}>{track.status === "valide" && <Check className="w-3.5 h-3.5" />}</button><div className="grid flex-1 gap-2 sm:grid-cols-3"><input value={track.moment} onChange={e => updateEntity("music", track.id, { moment: e.target.value })} className="bg-transparent text-xs text-foreground/50 outline-none" /><input value={track.title} onChange={e => updateEntity("music", track.id, { title: e.target.value })} className="bg-transparent text-sm outline-none" /><input value={track.artist} onChange={e => updateEntity("music", track.id, { artist: e.target.value })} placeholder="Artiste" className="bg-transparent text-sm text-foreground/60 outline-none placeholder:text-foreground/25" /></div><button onClick={() => removeEntity("music", track.id)} className="text-foreground/30 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button></div>)}</CollectionPanel>;

  if (module === "logistics") {
    const l = project.logistics;
    return <div className="max-w-4xl mx-auto space-y-4"><EditableArea label="Parking" value={l.parking} onChange={parking => updateProject({ logistics: { ...l, parking } })} /><EditableArea label="Accessibilité" value={l.accessibility} onChange={accessibility => updateProject({ logistics: { ...l, accessibility } })} /><EditableArea label="Plan météo de repli" value={l.weatherFallback} onChange={weatherFallback => updateProject({ logistics: { ...l, weatherFallback } })} /><div className="rounded-2xl border border-foreground/10 p-4"><div className="flex justify-between items-center mb-3"><p className="text-[10px] uppercase tracking-widest text-foreground/40">À emporter</p><AddBar label="Ajouter" onAdd={() => updateProject({ logistics: { ...l, packing: [...l.packing, { id: newId(), label: "Nouvel élément", done: false }] } })} /></div>{l.packing.length === 0 ? <Empty>La liste est vide.</Empty> : l.packing.map(item => <div key={item.id} className="flex items-center gap-3 py-2 border-b border-foreground/5 last:border-0"><button onClick={() => updateProject({ logistics: { ...l, packing: l.packing.map(x => x.id === item.id ? { ...x, done: !x.done } : x) } })} className={cn("w-5 h-5 rounded border flex items-center justify-center", item.done ? "bg-white text-black" : "border-foreground/25")}>{item.done && <Check className="w-3 h-3" />}</button><input value={item.label} onChange={e => updateProject({ logistics: { ...l, packing: l.packing.map(x => x.id === item.id ? { ...x, label: e.target.value } : x) } })} className={cn("text-sm flex-1 bg-transparent outline-none", item.done && "line-through text-foreground/40")} /><button onClick={() => updateProject({ logistics: { ...l, packing: l.packing.filter(x => x.id !== item.id) } })} className="text-foreground/30 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button></div>)}</div><div className="rounded-2xl border border-foreground/10 p-4"><div className="flex items-center justify-between mb-3"><p className="text-[10px] uppercase tracking-widest text-foreground/40">Contacts d'urgence</p><AddBar label="Ajouter" onAdd={() => updateProject({ logistics: { ...l, emergencyContacts: [...l.emergencyContacts, { id: newId(), name: "Nouveau contact", phone: "", role: "À préciser" }] } })} /></div>{l.emergencyContacts.map(contact => <div key={contact.id} className="grid grid-cols-3 gap-2 border-b border-foreground/5 py-2 last:border-0"><input value={contact.name} onChange={e => updateProject({ logistics: { ...l, emergencyContacts: l.emergencyContacts.map(x => x.id === contact.id ? { ...x, name: e.target.value } : x) } })} className="bg-transparent text-sm outline-none" /><input value={contact.phone} onChange={e => updateProject({ logistics: { ...l, emergencyContacts: l.emergencyContacts.map(x => x.id === contact.id ? { ...x, phone: e.target.value } : x) } })} placeholder="Téléphone" className="bg-transparent text-xs outline-none" /><input value={contact.role} onChange={e => updateProject({ logistics: { ...l, emergencyContacts: l.emergencyContacts.map(x => x.id === contact.id ? { ...x, role: e.target.value } : x) } })} className="bg-transparent text-xs text-foreground/50 outline-none" /></div>)}</div><div className="grid gap-3 md:grid-cols-2">{l.accommodations.map(a => <div key={a.id} className="rounded-2xl border border-foreground/10 p-4"><p className="text-sm">{a.name}</p><p className="text-xs text-foreground/45 mt-1">{a.booked} réservées · {a.address}</p></div>)}{l.shuttles.map(s => <div key={s.id} className="rounded-2xl border border-foreground/10 p-4"><p className="text-sm">{s.route}</p><p className="text-xs text-foreground/45 mt-1">Départ {s.departure} · {s.capacity} places</p></div>)}</div></div>;
  }

  if (module === "messages") {
    const templates = project.messageTemplates.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));
    return <div className="max-w-4xl mx-auto space-y-5">
      {remoteError && <p className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-3 text-xs text-rose-200">{remoteError}</p>}
      <div className="flex items-center gap-2"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un modèle…" className="flex-1 rounded-full border border-foreground/10 bg-foreground/5 px-4 py-2 text-sm outline-none focus:border-foreground/30" />{canManage && <AddBar label="Nouveau modèle" onAdd={() => addEntity("messageTemplates", { title: "Nouveau modèle", type: "pratique", body: "" })} />}</div>
      <div className="grid gap-3 md:grid-cols-2">{templates.map(template => <div key={template.id} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><div className="flex justify-between gap-2"><input disabled={!canManage} value={template.title} onChange={event => updateEntity("messageTemplates", template.id, { title: event.target.value })} className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:text-foreground/60" />{canManage && <button onClick={() => removeEntity("messageTemplates", template.id)} className="text-foreground/30 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>}</div><textarea disabled={!canManage} value={template.body} onChange={event => updateEntity("messageTemplates", template.id, { body: event.target.value })} placeholder="Écrire le message…" rows={3} className="mt-2 w-full resize-none bg-transparent text-xs leading-relaxed text-foreground/55 outline-none" />
        {canManage && selectedTemplateId !== template.id && <button disabled={!template.title.trim() || !template.body.trim()} onClick={() => setSelectedTemplateId(template.id)} className="mt-3 inline-flex items-center gap-2 text-xs text-foreground/70 hover:text-foreground disabled:opacity-30"><Send className="h-3.5 w-3.5" />Préparer l’envoi</button>}
        {selectedTemplateId === template.id && <div className="mt-4 space-y-3 border-t border-foreground/10 pt-4"><label className="block text-[10px] uppercase tracking-widest text-foreground/40">Destinataires</label><input autoFocus value={recipients} onChange={event => setRecipients(event.target.value)} placeholder="adresses séparées par des virgules" className="w-full rounded-xl border border-foreground/10 bg-background/20 px-3 py-2 text-xs outline-none focus:border-foreground/30" /><p className="text-xs text-foreground/40">L’objet sera « {template.title} ». L’envoi ne partira qu’après votre confirmation.</p><div className="flex gap-2"><button disabled={busy} onClick={() => setSelectedTemplateId(null)} className="rounded-full border border-foreground/10 px-3 py-2 text-xs text-foreground/55">Annuler</button><button disabled={busy || !recipients.trim()} onClick={() => void sendTemplate(template)} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-30">{busy && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}Confirmer et envoyer</button></div></div>}
      </div>)}</div>
      <div><p className="mb-3 text-[10px] uppercase tracking-widest text-foreground/40">Journal des envois réels</p>{!canManage ? <p className="text-xs text-foreground/35">Seuls les responsables du Monde peuvent envoyer des messages et consulter leur journal.</p> : messages.length === 0 ? <Empty>Aucun message envoyé.</Empty> : messages.map(message => <div key={message.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/5 py-3 text-sm"><div className="min-w-0"><p className="truncate">{message.subject}</p><p className="mt-1 truncate text-xs text-foreground/35">{message.recipients.join(", ")}</p>{message.providerError && <p className="mt-1 text-xs text-rose-300">{message.providerError}</p>}</div><span className={cn("text-xs", message.status === "sent" ? "text-emerald-300" : message.status === "failed" ? "text-rose-300" : "text-amber-200")}>{new Date(message.sentAt || message.createdAt).toLocaleString("fr-FR")} · {message.status === "sent" ? "envoyé" : message.status === "failed" ? "échec" : "en cours"}</span></div>)}</div>
    </div>;
  }

  if (module === "team") return <CollectionPanel title="Répartition des responsabilités" addLabel="Ajouter un rôle" onAdd={() => addEntity("team", { name: "Nouvelle personne", role: "Responsable", contact: "", responsibilities: [] })}>{project.team.length === 0 ? <Empty>Aucun rôle assigné.</Empty> : project.team.map(role => <div key={role.id} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4 flex items-start gap-4"><div className="grid flex-1 gap-2 sm:grid-cols-3"><input value={role.name} onChange={e => updateEntity("team", role.id, { name: e.target.value })} className="bg-transparent text-sm outline-none" /><input value={role.role} onChange={e => updateEntity("team", role.id, { role: e.target.value })} className="bg-transparent text-xs text-foreground/55 outline-none" /><input value={role.contact || ""} onChange={e => updateEntity("team", role.id, { contact: e.target.value })} placeholder="Contact" className="bg-transparent text-xs text-foreground/55 outline-none" /><input value={role.responsibilities.join(", ")} onChange={e => updateEntity("team", role.id, { responsibilities: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })} placeholder="Responsabilités séparées par des virgules" className="sm:col-span-3 bg-transparent text-xs text-foreground/65 outline-none placeholder:text-foreground/25" /></div><button onClick={() => removeEntity("team", role.id)} className="text-foreground/30 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button></div>)}</CollectionPanel>;

  return <CollectionPanel title="Souvenirs et après" addLabel="Ajouter un élément" onAdd={() => addEntity("memories", { kind: "shot", title: "Nouvelle idée", status: "a_faire" })}>{project.memories.length === 0 ? <Empty>Les souvenirs à préparer apparaîtront ici.</Empty> : project.memories.map(item => <div key={item.id} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4 flex items-center gap-3"><button onClick={() => updateEntity("memories", item.id, { status: item.status === "termine" ? "a_faire" : "termine" })} className={cn("w-6 h-6 rounded-full border flex items-center justify-center", item.status === "termine" ? "bg-white text-black" : "border-foreground/20")}>{item.status === "termine" && <Check className="w-3 h-3" />}</button><div className="grid flex-1 gap-2 sm:grid-cols-2"><input value={item.title} onChange={e => updateEntity("memories", item.id, { title: e.target.value })} className="bg-transparent text-sm outline-none" /><input value={item.owner || ""} onChange={e => updateEntity("memories", item.id, { owner: e.target.value })} placeholder="Responsable" className="bg-transparent text-xs text-foreground/55 outline-none" /><select value={item.kind} onChange={e => updateEntity("memories", item.id, { kind: e.target.value as MemoryItem["kind"] })} className="rounded-lg bg-foreground/10 px-2 py-1 text-xs outline-none"><option value="shot">Shot list</option><option value="media">Média</option><option value="message">Message</option><option value="album">Album</option><option value="rappel">Rappel</option></select></div><button onClick={() => removeEntity("memories", item.id)} className="text-foreground/30 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button></div>)}</CollectionPanel>;
}

function GuestSeat({ guest, tables, onChange }: { guest: { name: string; tableId?: string; dietary?: string }; tables: { id: string; name: string }[]; onChange: (value: string) => void }) {
  return <div className="flex items-center gap-2 rounded-xl bg-background/20 px-3 py-2"><span className="text-sm flex-1 truncate">{guest.name}{guest.dietary && <span className="text-[10px] text-amber-300 ml-2">{guest.dietary}</span>}</span><select value={guest.tableId || ""} onChange={e => onChange(e.target.value)} className="max-w-[130px] rounded-lg bg-foreground/10 px-2 py-1.5 text-xs outline-none"><option value="">Sans table</option>{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>;
}

function PaymentRow({ payment, onToggle, onDelete, onEdit }: { payment: Payment; onToggle: () => void; onDelete: () => void; onEdit: (u: Partial<Payment>) => void }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><button onClick={onToggle} className={cn("w-6 h-6 rounded-full border flex items-center justify-center", payment.state === "paye" ? "bg-emerald-300 text-black border-emerald-300" : "border-foreground/20")}>{payment.state === "paye" && <Check className="w-3.5 h-3.5" />}</button><div className="flex-1"><input value={payment.label} onChange={e => onEdit({ label: e.target.value })} className="bg-transparent text-sm outline-none w-full" /><p className="text-xs text-foreground/40 mt-1">{new Date(payment.at).toLocaleDateString("fr-FR")} · {payment.state === "paye" ? "réglé" : "à régler"}</p></div><input type="number" value={payment.amountCents / 100} onChange={e => onEdit({ amountCents: Number(e.target.value) * 100 })} className="w-24 rounded-lg bg-foreground/5 px-2 py-1.5 text-right font-mono text-sm outline-none" /><button onClick={onDelete} className="text-foreground/30 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button></div>;
}

function EditableArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><span className="text-[10px] uppercase tracking-widest text-foreground/40">{label}</span><textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-foreground/20" placeholder="À compléter…" /></label>;
}

function CollectionPanel({ title, addLabel, onAdd, children }: { title: string; addLabel: string; onAdd: () => void; children: ReactNode }) {
  return <div className="max-w-3xl mx-auto space-y-5">{title === "Bande-son du mariage" && <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-100/70">Planification manuelle : les morceaux démo n’ont pas de métadonnées externes vérifiées. Recherche et extrait nécessitent un connecteur autorisé ; aucun audio fictif n’est proposé.</div>}<div className="flex items-center justify-between"><div><h4 className="text-sm font-medium">{title}</h4><p className="text-xs text-foreground/40 mt-1">Un espace simple, pensé pour avancer.</p></div><AddBar label={addLabel} onAdd={onAdd} /></div><div className="space-y-3">{children}</div></div>;
}
import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Clock3, Link2, MapPin, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { TimelineEntityKind, TimelineEvent } from "@/lib/types";
import { useProject } from "@/store/project-store";
import { analyzeEventImpact } from "@/lib/timeline-graph";

const kinds: TimelineEntityKind[] = ["guest", "table", "provider", "task", "payment", "document", "music", "team", "message", "logistics", "memory"];

export function UniversalTimeline({ events }: { events: TimelineEvent[] }) {
  const { project, addEntity, updateEntity, removeEntity, canEdit } = useProject();
  const [selected, setSelected] = useState<string>();
  if (!project) return null;
  const event = project.timeline.find(item => item.id === selected);
  const add = () => {
    if (!canEdit) return;
    addEntity("timeline", { time: project.pivot.value, durationMinutes: 60, kind: "evenement", title: "Nouveau jalon", status: "prepare", confidence: "confirme", phase: "pendant", universe: project.universe, provenance: "real", visibility: "equipe", relations: [], dependencyIds: [], resources: [], propagation: { state: "none" } });
  };
  return <div className="relative mx-auto w-full max-w-3xl py-10">
    <div className="absolute bottom-0 left-5 top-0 w-px bg-white/10 md:left-1/2" />
    {events.length === 0 && <div className="py-20 text-center text-sm text-white/40">Aucun événement dans cette vue.</div>}
    <div className="space-y-8">{events.map((item, index) => <motion.button layout key={item.id} onClick={() => setSelected(item.id)} className={`relative block w-full pl-12 text-left md:w-1/2 ${index % 2 ? "md:ml-auto md:pl-10" : "md:pr-10 md:text-right"}`}>
      <span className={`absolute top-5 h-3 w-3 rounded-full border-2 border-white/50 bg-black ${index % 2 ? "-left-1.5" : "left-[14px] md:-right-1.5 md:left-auto"}`} />
      <span className="block rounded-2xl border border-white/10 bg-white/[.045] p-5 transition hover:bg-white/[.08]">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 md:justify-inherit"><CalendarDays className="h-3.5 w-3.5" />{format(item.time, item.phase === "pendant" ? "d MMM · HH:mm" : "d MMM yyyy", { locale: fr })}</span>
        <strong className="mt-2 block text-base font-medium">{item.title}</strong>
        {item.detail && <span className="mt-1 block text-sm text-white/50">{item.detail}</span>}
        <span className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/45">
          {item.durationMinutes && <span><Clock3 className="mr-1 inline h-3 w-3" />{item.durationMinutes} min</span>}
          {item.location && <span><MapPin className="mr-1 inline h-3 w-3" />{item.location}</span>}
          <span><Link2 className="mr-1 inline h-3 w-3" />{item.relations?.length || 0} liens</span>
          <span>{item.provenance || "real"} · {item.visibility || "equipe"}</span>
        </span>
      </span>
    </motion.button>)}</div>
    {canEdit ? <button onClick={add} className="relative z-10 mx-auto mt-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black hover:bg-white hover:text-black" aria-label="Ajouter un jalon"><Plus className="h-4 w-4" /></button> : <p className="mt-8 text-center text-xs text-white/40">Lecture seule selon votre rôle.</p>}
    {event && <EventDrawer event={event} project={project} onClose={() => setSelected(undefined)} onEdit={updates => updateEntity("timeline", event.id, updates)} onDelete={() => { removeEntity("timeline", event.id); setSelected(undefined); }} canEdit={canEdit} />}
  </div>;
}

function EventDrawer({ event, project, onClose, onEdit, onDelete, canEdit }: { event: TimelineEvent; project: NonNullable<ReturnType<typeof useProject>["project"]>; onClose: () => void; onEdit: (updates: Partial<TimelineEvent>) => void; onDelete: () => void; canEdit: boolean }) {
  const impact = analyzeEventImpact(project, event.id, {});
  const input = "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none disabled:opacity-60";
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}><aside onClick={e => e.stopPropagation()} className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#0b0b0b] p-6 shadow-2xl">
    <div className="flex items-center justify-between"><p className="text-xs uppercase tracking-widest text-white/45">Détail du graphe</p><button onClick={onClose}><X className="h-5 w-5" /></button></div>
    <div className="mt-6 grid gap-3">
      <input disabled={!canEdit} className={input} value={event.title} onChange={e => onEdit({ title: e.target.value })} />
      <div className="grid grid-cols-2 gap-2"><input disabled={!canEdit} type="datetime-local" className={input} value={new Date(event.time - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => onEdit({ time: new Date(e.target.value).getTime() })} /><input disabled={!canEdit} type="number" min="0" className={input} value={event.durationMinutes || 0} onChange={e => onEdit({ durationMinutes: Number(e.target.value) })} /></div>
      <input disabled={!canEdit} className={input} placeholder="Lieu" value={event.location || ""} onChange={e => onEdit({ location: e.target.value })} />
      <div className="grid grid-cols-2 gap-2"><select disabled={!canEdit} className={input} value={event.status} onChange={e => onEdit({ status: e.target.value as TimelineEvent["status"] })}><option value="prepare">Prévu</option><option value="execute">Terminé</option><option value="a_valider">À valider</option><option value="bloque">Bloqué</option></select><select disabled={!canEdit} className={input} value={event.provenance || "real"} onChange={e => onEdit({ provenance: e.target.value as TimelineEvent["provenance"] })}><option value="real">Réel</option><option value="demo">Démo</option><option value="suggested">Suggéré</option><option value="integration">Intégration</option></select></div>
      <select disabled={!canEdit} className={input} value={event.visibility || "equipe"} onChange={e => onEdit({ visibility: e.target.value as TimelineEvent["visibility"] })}><option value="prive">Privé</option><option value="equipe">Équipe</option><option value="audience">Audience nommée (métadonnée seulement)</option></select>
      <label className="text-xs text-white/45">Dépendances (identifiants séparés par des virgules)<input disabled={!canEdit} className={`${input} mt-1 w-full`} value={(event.dependencyIds || []).join(", ")} onChange={e => onEdit({ dependencyIds: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })} /></label>
      <label className="text-xs text-white/45">Ressources<input disabled={!canEdit} className={`${input} mt-1 w-full`} value={(event.resources || []).join(", ")} onChange={e => onEdit({ resources: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })} /></label>
      <p className="mt-2 text-xs uppercase tracking-widest text-white/45">Liens natifs</p>
      {(event.relations || []).map((relation, index) => <div key={`${relation.kind}-${relation.id}-${index}`} className="flex gap-2"><select disabled={!canEdit} className={input} value={relation.kind} onChange={e => onEdit({ relations: event.relations?.map((item, i) => i === index ? { ...item, kind: e.target.value as TimelineEntityKind } : item) })}>{kinds.map(kind => <option key={kind}>{kind}</option>)}</select><input disabled={!canEdit} className={`${input} min-w-0 flex-1`} value={relation.id} onChange={e => onEdit({ relations: event.relations?.map((item, i) => i === index ? { ...item, id: e.target.value } : item) })} /><button disabled={!canEdit} onClick={() => onEdit({ relations: event.relations?.filter((_, i) => i !== index) })} className="text-white/40">×</button></div>)}
      {canEdit && <button onClick={() => onEdit({ relations: [...(event.relations || []), { kind: "guest", id: "" }] })} className="rounded-lg border border-dashed border-white/15 py-2 text-xs text-white/55">Ajouter un lien</button>}
      <div className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs text-white/55">{impact.relations.length} entité(s) résolue(s) · {impact.dependents.length} événement(s) dépendant(s). L’audience reste une métadonnée interne : aucun portail n’est annoncé.</div>
      {canEdit && <button onClick={onDelete} className="mt-4 rounded-lg border border-rose-400/20 py-2 text-xs text-rose-300">Supprimer l’événement</button>}
    </div>
  </aside></div>;
}
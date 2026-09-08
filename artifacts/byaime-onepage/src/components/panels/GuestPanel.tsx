import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { useProject } from "@/store/project-store";

export function GuestPanel() {
  const { project, updateEntity, addEntity, removeEntity, canEdit } = useProject();
  const [query, setQuery] = useState("");
  if (!project) return null;
  const guests = project.guests.filter(guest => `${guest.name} ${guest.dietary || ""}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="mx-auto max-w-4xl space-y-4">
    <div className="grid grid-cols-4 gap-2">{[project.guests.length, project.guests.filter(g => g.rsvp === "confirme").length, project.guests.filter(g => g.dietary).length, project.guests.filter(g => !g.tableId && g.rsvp !== "decline").length].map((count, index) => <div key={index} className="rounded-xl border border-foreground/10 p-3 text-center"><p className="text-xl">{count}</p><p className="text-[9px] uppercase text-foreground/40">{["Invités", "Confirmés", "Régimes", "Sans table"][index]}</p></div>)}</div>
    <div className="flex gap-2"><label className="flex flex-1 items-center gap-2 rounded-full border border-foreground/10 px-3"><Search className="h-3.5 w-3.5" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nom ou régime…" className="w-full bg-transparent py-2 text-sm outline-none" /></label>{canEdit && <button onClick={() => addEntity("guests", { name: "Nouvel invité", role: "invite", rsvp: "en_attente", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } })} className="rounded-full border border-foreground/15 px-3 text-xs"><Plus className="mr-1 inline h-3 w-3" />Ajouter</button>}</div>
    {guests.map(guest => {
      const journey = project.timeline.filter(event => event.relations?.some(relation => relation.kind === "guest" && relation.id === guest.id));
      const table = project.tables.find(item => item.id === guest.tableId);
      return <div key={guest.id} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4">
        <div className="flex gap-3"><input disabled={!canEdit} value={guest.name} onChange={e => updateEntity("guests", guest.id, { name: e.target.value })} className="flex-1 bg-transparent text-sm font-medium outline-none" />{canEdit && <button onClick={() => removeEntity("guests", guest.id)}><Trash2 className="h-4 w-4 text-foreground/25" /></button>}</div>
        <div className="mt-3 grid grid-cols-3 gap-2"><select disabled={!canEdit} value={guest.rsvp} onChange={e => updateEntity("guests", guest.id, { rsvp: e.target.value })} className="rounded-lg bg-foreground/10 p-2 text-xs"><option value="en_attente">En attente</option><option value="confirme">Confirmé</option><option value="decline">Absent</option></select><input disabled={!canEdit} value={guest.dietary || ""} onChange={e => updateEntity("guests", guest.id, { dietary: e.target.value })} placeholder="Régime" className="rounded-lg bg-foreground/10 p-2 text-xs outline-none" /><select disabled={!canEdit} value={guest.tableId || ""} onChange={e => updateEntity("guests", guest.id, { tableId: e.target.value || undefined })} className="rounded-lg bg-foreground/10 p-2 text-xs"><option value="">Sans table</option>{project.tables.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="mt-3 border-t border-foreground/5 pt-3"><p className="text-[9px] uppercase tracking-widest text-foreground/35">Programme de {guest.name} · Table : {table?.name || "non choisie"}{guest.dietary ? ` · ${guest.dietary}` : ""}</p><div className="mt-2 flex flex-wrap gap-2">{journey.length ? journey.map(event => <span key={event.id} className="rounded-full bg-foreground/5 px-2 py-1 text-[10px] text-foreground/55">{new Date(event.time).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {event.title}</span>) : <span className="text-xs text-foreground/30">Aucun moment prévu pour cette personne.</span>}</div></div>
      </div>;
    })}
  </div>;
}
import { useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useProject } from "@/store/project-store";
import type { TimelineEvent } from "@/lib/types";
import { analyzeEventImpact } from "@/lib/timeline-graph";
import { focusWorld } from "@/lib/world-focus";
import { DayOfGuestEntry } from "./DayOfGuestEntry";

export function DayOfPanel() {
  const { project, updateProject, updateEntity, addEntity, removeEntity, canEdit, currentRole } = useProject();
  const [pending, setPending] = useState<{ id: string; patch: Partial<TimelineEvent> }>();
  const [notice, setNotice] = useState("");
  if (!project) return null;
  const events = project.timeline.filter(event => event.phase === "pendant").sort((a, b) => a.time - b.time);
  const impact = pending ? analyzeEventImpact(project, pending.id, pending.patch) : undefined;
  const propose = (id: string, patch: Partial<TimelineEvent>) => setPending({ id, patch });
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
  const basePrefix = basePath === "/" ? "" : basePath;
  const logistics = project.logistics;
  const published = project.publicProfile?.published === true;
  const practicalReady = Boolean(
    project.venue.value?.trim() || logistics?.parking?.trim() || logistics?.accessibility?.trim() || logistics?.weatherFallback?.trim(),
  );
  return <div className="mx-auto max-w-4xl space-y-4 pb-10"><div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div><h4 className="text-2xl font-display font-semibold tracking-tight text-foreground">Le déroulé du Jour J</h4><p className="text-sm text-foreground/50">Les changements structurants sont prévisualisés avant application.</p></div>{canEdit && <button onClick={() => addEntity("timeline", { time: project.pivot.value, durationMinutes: 60, kind: "evenement", title: "Nouveau temps fort", status: "prepare", confidence: "confirme", phase: "pendant", universe: project.universe, provenance: "real", visibility: "equipe", relations: [], dependencyIds: [], resources: [] })} className="rounded-full border border-foreground/50 px-3 py-2 text-xs hover:bg-foreground/5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="mr-1 inline h-3 w-3" />Ajouter</button>}</div>
    <DayOfGuestEntry
      published={published}
      profileUrl={`${basePrefix}/profil/${project.id}`}
      canPublish={currentRole === "owner"}
      practicalReady={practicalReady}
      onPublish={() => { updateProject({ publicProfile: { ...project.publicProfile, published: true } }); setNotice("Mini-site publié — enregistrement en cours"); }}
      onHide={() => { updateProject({ publicProfile: { ...project.publicProfile, published: false } }); setNotice("Mini-site masqué — enregistrement en cours"); }}
      onCopy={() => { void navigator.clipboard.writeText(`${window.location.origin}${basePrefix}/profil/${project.id}`).then(() => setNotice("Lien du mini-site copié")); }}
      onEditPractical={() => focusWorld({ route: "/user-portal", panel: "logistics" })}
    />
    {notice && <p data-testid="dayof-guest-notice" role="status" className="text-xs text-foreground/55">{notice}</p>}
    {events.map(event => <div key={event.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex gap-2"><input disabled={!canEdit} type="time" value={new Date(event.time).toTimeString().slice(0, 5)} onChange={e => { const [hours, minutes] = e.target.value.split(":").map(Number); const date = new Date(event.time); date.setHours(hours, minutes, 0, 0); propose(event.id, { time: date.getTime() }); }} className="rounded-lg bg-foreground/5 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/30" /><input disabled={!canEdit} value={event.title} onChange={e => updateEntity("timeline", event.id, { title: e.target.value })} className="min-w-0 flex-1 bg-transparent text-sm outline-none focus:ring-1 focus:ring-foreground/30 rounded" />{canEdit && <button onClick={() => removeEntity("timeline", event.id)}><Trash2 className="h-4 w-4 text-foreground/40 transition hover:text-destructive" /></button>}</div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"><input disabled={!canEdit} value={event.location || ""} onChange={e => propose(event.id, { location: e.target.value })} placeholder="Lieu" className="rounded-lg bg-foreground/5 p-2 text-xs outline-none focus:ring-1 focus:ring-foreground/30" /><input disabled={!canEdit} type="number" min="0" value={event.durationMinutes || 0} onChange={e => propose(event.id, { durationMinutes: Number(e.target.value) })} className="rounded-lg bg-foreground/5 p-2 text-xs outline-none focus:ring-1 focus:ring-foreground/30" /><select disabled={!canEdit} value={event.status} onChange={e => updateEntity("timeline", event.id, { status: e.target.value })} className="rounded-lg bg-foreground/5 p-2 text-xs outline-none focus:ring-1 focus:ring-foreground/30"><option value="prepare">À préparer</option><option value="execute">Terminé</option><option value="bloque">Bloqué</option></select></div>
    </div>)}
    <section className="pt-6" aria-label="Les invités du Jour J">
      <h5 className="text-[11px] uppercase tracking-[0.3em] text-foreground/50">Les invités · une carte, une fiche</h5>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {project.guests.map(guest => (
          <button
            key={guest.id}
            onClick={() => focusWorld({ route: "/user-portal", entityKind: "guest", entityId: guest.id })}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-foreground/20 bg-foreground/5 font-display uppercase text-sm">{guest.name.charAt(0)}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm">{guest.name}</span>
              <span className="block text-[10px] uppercase tracking-[0.14em] text-foreground/50">
                {guest.rsvp === "confirme" ? "Confirmé" : guest.rsvp === "decline" ? "Décliné" : "En attente"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
    <section className="pt-6" aria-label="Les prestataires du Jour J">
      <h5 className="text-[11px] uppercase tracking-[0.3em] text-foreground/50">Les prestataires · une carte, une fiche</h5>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {project.providers.map(provider => (
          <button
            key={provider.id}
            onClick={() => focusWorld({ route: "/user-portal", entityKind: "provider", entityId: provider.id })}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-foreground/20 bg-foreground/5 font-display uppercase text-sm">{(provider.name || provider.role).charAt(0)}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm">{provider.name || provider.role}</span>
              <span className="block text-[10px] uppercase tracking-[0.14em] text-foreground/50">
                {provider.status === "reserve" ? "Réservé" : provider.status === "devis" ? "Devis reçu" : provider.status === "rencontre" ? "Rencontré" : provider.status === "contacte" ? "Contacté" : "En recherche"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
    {pending && impact && <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-xl rounded-2xl border border-brand-accent/50 bg-background p-4 shadow-2xl"><p className="flex items-center gap-2 text-sm font-medium text-brand-accent"><AlertTriangle className="h-4 w-4" />Prévisualisation requise</p><p className="mt-2 text-xs text-foreground/60">{impact.changed.join(", ")} · {impact.relations.length} entité(s) liée(s) · {impact.dependents.length} dépendance(s)</p>{impact.conflicts.map(conflict => <p key={conflict.message} className="mt-1 text-xs text-destructive">{conflict.message}</p>)}<p className="mt-2 text-[10px] text-foreground/40">Les entités liées et dépendances ne seront jamais déplacées silencieusement.</p><div className="mt-3 flex gap-2"><button onClick={() => { updateEntity("timeline", pending.id, { ...pending.patch, propagation: { state: "applied", lastAppliedAt: Date.now(), sourceEventId: pending.id } }); setPending(undefined); }} className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Appliquer à l’événement seul</button><button onClick={() => setPending(undefined)} className="rounded-full border border-foreground/50 px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Annuler</button></div></div>}
  </div>;
}
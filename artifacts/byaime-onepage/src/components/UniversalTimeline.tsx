import { Fragment, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link2, MapPin, Plus, X, Clock3, CalendarDays, Undo2, Waves } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { TimelineEntityKind, TimelineEvent } from "@/lib/types";
import { openLaboratory, type WorldFocusRequest } from "@/lib/laboratory";
import { useProject } from "@/store/project-store";
import { analyzeEventImpact, applyPropagationPlan, planEventPropagation, type PropagationPlan } from "@/lib/timeline-graph";
import { cn } from "@/lib/utils";
import { AIME_VISUALS, getAssetUrl } from "@/lib/assets";
import { ContextPanel } from "@/components/ContextPanel";

const kinds: TimelineEntityKind[] = ["guest", "table", "provider", "task", "payment", "document", "music", "team", "message", "logistics", "memory"];

const MONTH = 30 * 86400000;
const WEEK = 7 * 86400000;
const DAY = 86400000;
const HOUR = 3600000;

function getSubchapter(event: TimelineEvent, pivotTime: number): string {
  const diff = event.time - pivotTime;

  if (diff < -24 * MONTH) return "L'Idée & La Vision";
  if (diff < -18 * MONTH) return "18 à 24 mois avant";
  if (diff < -12 * MONTH) return "12 à 18 mois avant";
  if (diff < -9 * MONTH) return "9 à 12 mois avant";
  if (diff < -6 * MONTH) return "6 à 9 mois avant";
  if (diff < -3 * MONTH) return "3 à 6 mois avant";
  if (diff < -1 * WEEK) return "1 à 3 mois avant";
  if (diff < -1 * DAY) return "La dernière ligne droite";
  if (diff < 0 && event.phase === "avant") return "La veille";

  if (event.phase === "pendant") {
    if (diff < 9 * HOUR) return "Le réveil";
    if (diff < 12 * HOUR) return "Les préparatifs";
    if (diff < 14 * HOUR) return "Mise en place";
    if (diff < 15.5 * HOUR) return "L'arrivée des invités";
    if (diff < 17 * HOUR) return "La cérémonie";
    if (diff < 17.5 * HOUR) return "Après la cérémonie";
    if (diff < 20 * HOUR) return "Le cocktail";
    if (diff < 22.5 * HOUR) return "Le repas";
    if (diff < 23.5 * HOUR) return "L'ouverture du bal";
    if (diff < 26 * HOUR) return "La soirée";
    return "Fin de la nuit";
  }

  if (event.phase === "apres") {
    if (diff < 2 * DAY) return "Le lendemain";
    if (diff < 7 * DAY) return "Les jours suivants";
    if (diff < 30 * DAY) return "Les semaines suivantes";
    return "L'héritage vivant";
  }

  return "Jalon";
}

const images = AIME_VISUALS.timelineAmbientImages;

const AmbientBackground = ({ index }: { index: number }) => {
  const prefersReducedMotion = useReducedMotion();

  // Alternate every other scene with an image
  if (index % 2 === 0) {
    const imgIndex = (index / 2) % images.length;
    return (
      <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat overflow-hidden"
           style={{ backgroundImage: `url(${getAssetUrl(images[imgIndex])})` }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      </div>
    );
  }

  const styles = [
    "from-[#0a0a0a] to-[#000000]",
    "from-[#110e0c] to-[#000000]",
    "from-[#0a0c11] to-[#000000]",
    "from-[#0f110c] to-[#000000]",
  ];
  const bg = styles[index % styles.length];

  return (
    <div className={cn("absolute inset-0 z-0 bg-gradient-to-b overflow-hidden", bg)}>
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-screen pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
      <motion.div
        className="absolute inset-0 opacity-20"
        initial={{ opacity: 0.1 }}
        animate={prefersReducedMotion ? {} : {
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 60%)',
          backgroundSize: '150% 150%'
        }}
      />
    </div>
  );
};

function SubchapterTransition({ title }: { title: string }) {
  return (
    <div className="w-full py-24 flex items-center justify-center bg-background text-foreground relative z-10 border-t border-foreground/5">
       <h2 className="text-sm tracking-[0.4em] uppercase text-foreground/40">{title}</h2>
    </div>
  );
}

function EventScene({ event, index, onClick }: { event: TimelineEvent, index: number, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative w-full min-h-[60vh] flex items-center justify-center overflow-hidden border-t border-white/5 px-6 py-24 text-center text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 group"
    >
      <AmbientBackground index={index} />

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 flex flex-col items-center rounded-3xl p-8 md:p-12 bg-black/25 backdrop-blur-sm border border-white/10 hover:bg-black/40 transition-colors"
        >
          <div className="flex items-center gap-3 text-xs tracking-widest uppercase text-white/65 font-medium">
            <CalendarDays className="w-4 h-4" />
            <span>{format(event.time, event.phase === "pendant" ? "HH:mm" : "d MMMM yyyy", { locale: fr })}</span>
            {event.durationMinutes && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <Clock3 className="w-4 h-4" />
                <span>{event.durationMinutes} min</span>
              </>
            )}
          </div>

          <h3 className="text-4xl md:text-5xl lg:text-6xl font-display font-medium text-balance tracking-tight text-white group-hover:text-white/90 transition-colors">
            {event.title}
          </h3>

          {event.detail && (
            <p className="text-lg md:text-xl text-white/80 font-light max-w-2xl text-balance leading-relaxed">
              {event.detail}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 pt-8">
            {event.location && (
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-white/60">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
            {(event.relations?.length || 0) > 0 && (
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-white/60">
                <Link2 className="w-3 h-3" />
                {event.relations!.length} liens
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </button>
  );
}

export function UniversalTimeline({ events }: { events: TimelineEvent[] }) {
  const { project, addEntity, updateEntity, updateProject, removeEntity, canEdit, currentRole } = useProject();
  const [selected, setSelected] = useState<string>();
  const [undoTimeline, setUndoTimeline] = useState<TimelineEvent[]>();

  if (!project) return null;
  const event = project.timeline.find(item => item.id === selected);

  useEffect(() => {
    const listener = (raw: Event) => {
      const request = (raw as CustomEvent<WorldFocusRequest>).detail;
      if (request?.momentId) setSelected(request.momentId);
    };
    window.addEventListener("aime:focus-world", listener);
    return () => window.removeEventListener("aime:focus-world", listener);
  }, []);

  const add = () => {
    if (!canEdit) return;
    addEntity("timeline", { time: project.pivot.value, durationMinutes: 60, kind: "evenement", title: "Nouveau jalon", status: "prepare", confidence: "confirme", phase: "pendant", universe: project.universe, provenance: "real", visibility: "equipe", relations: [], dependencyIds: [], resources: [], propagation: { state: "none" } });
  };

  let currentSubchapter = "";
  const pivotTime = project.pivot.value;

  return (
    <div className="w-full flex flex-col bg-background">
      {events.length === 0 && (
        <div className="py-32 text-center text-sm text-foreground/40">
          Aucun événement dans cette vue.
        </div>
      )}

      {events.map((item, index) => {
        const subchapter = getSubchapter(item, pivotTime);
        const isNewSubchapter = subchapter !== currentSubchapter;
        currentSubchapter = subchapter;

        return (
          <Fragment key={item.id}>
            {isNewSubchapter && <SubchapterTransition title={subchapter} />}
            <EventScene event={item} index={index} onClick={() => setSelected(item.id)} />
          </Fragment>
        );
      })}

      {canEdit ? (
        <div className="w-full py-32 flex justify-center bg-background border-t border-foreground/5">
          <button
            onClick={add}
            className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-foreground/20 bg-card transition-colors hover:bg-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Ajouter un jalon"
          >
            <Plus className="h-6 w-6 text-foreground transition-colors group-hover:text-background" />
          </button>
        </div>
      ) : (
        <div className="w-full py-20 flex justify-center bg-background border-t border-foreground/5">
          <p className="text-xs text-foreground/40 tracking-widest uppercase">Lecture seule</p>
        </div>
      )}

      {event && (
        <EventDrawer
          event={event}
          project={project}
          currentRole={currentRole}
          onClose={() => setSelected(undefined)}
          onEdit={updates => updateEntity("timeline", event.id, updates)}
          onApplyRipple={(plan, dependentIds) => {
            setUndoTimeline(project.timeline);
            updateProject({ timeline: applyPropagationPlan(project, plan, true, dependentIds).timeline });
          }}
          onDelete={() => { removeEntity("timeline", event.id); setSelected(undefined); }}
          canEdit={canEdit}
        />
      )}
      {undoTimeline && (
        <div className="fixed bottom-24 left-4 z-[60] flex items-center gap-3 rounded-full border border-foreground/10 bg-background/90 py-2 pl-4 pr-2 text-xs text-foreground shadow-xl backdrop-blur sm:left-6">
          <span>Changement appliqué</span>
          <button onClick={() => { updateProject({ timeline: undoTimeline }); setUndoTimeline(undefined); }} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 font-medium text-black">
            <Undo2 className="h-3.5 w-3.5" /> Annuler
          </button>
        </div>
      )}
    </div>
  );
}

function EventDrawer({ event, project, currentRole, onClose, onEdit, onApplyRipple, onDelete, canEdit }: { event: TimelineEvent; project: NonNullable<ReturnType<typeof useProject>["project"]>; currentRole: ReturnType<typeof useProject>["currentRole"]; onClose: () => void; onEdit: (updates: Partial<TimelineEvent>) => void; onApplyRipple: (plan: PropagationPlan, dependentIds: string[]) => void; onDelete: () => void; canEdit: boolean }) {
  const impact = analyzeEventImpact(project, event.id, {});
  const [pendingTime, setPendingTime] = useState(event.time);
  const [selectedDependents, setSelectedDependents] = useState<string[]>([]);
  useEffect(() => {
    setPendingTime(event.time);
    setSelectedDependents([]);
  }, [event.id, event.time]);
  const ripplePlan = useMemo(() => pendingTime === event.time ? undefined : planEventPropagation(project, event.id, { time: pendingTime }), [event.id, event.time, pendingTime, project]);
  const input = "w-full rounded-none border-b border-foreground/20 bg-transparent py-2 text-sm text-foreground outline-none focus:border-border disabled:opacity-50 transition-colors placeholder:text-foreground/30";
  const select = "w-full appearance-none rounded-none border-b border-foreground/20 bg-background py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground disabled:opacity-50";

  return (
    <ContextPanel eyebrow="Votre contexte" title="Moment du calendrier" onClose={onClose}>
        <div className="space-y-8">
          <div>
            <input disabled={!canEdit} className={cn(input, "text-2xl font-display font-medium")} value={event.title} onChange={e => onEdit({ title: e.target.value })} placeholder="Titre de l'événement" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openLaboratory({ type: "remarque", context: { projectId: project.id, role: currentRole, route: "world", path: "/user-portal", source: "timeline-event-drawer", phase: event.phase, view: "chronological", momentId: event.id, momentTitle: event.title, narrative: "Moment ouvert depuis la Timeline universelle." } })} className="rounded-full border border-foreground/15 px-3 py-2 text-[10px] uppercase tracking-[.14em] text-foreground/65 hover:bg-foreground/5">
              Ouvrir le Laboratoire
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">Heure</label>
              <input disabled={!canEdit} type="datetime-local" className={input} value={new Date(pendingTime - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => setPendingTime(new Date(e.target.value).getTime())} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">Durée (min)</label>
              <input disabled={!canEdit} type="number" min="0" className={input} value={event.durationMinutes || 0} onChange={e => onEdit({ durationMinutes: Number(e.target.value) })} />
            </div>
          </div>

          {ripplePlan && (
            <section className="overflow-hidden rounded-2xl border border-violet-300/20 bg-[linear-gradient(145deg,rgba(124,58,237,.14),rgba(14,165,233,.06))]">
              <div className="flex items-start gap-3 border-b border-foreground/10 p-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-200/25 bg-background/30">
                  <Waves className="h-4 w-4 text-violet-200" />
                </span>
                <div>
                  <p className="text-sm font-medium">Onde de changement</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/50">AIME a regardé ce que ce nouvel horaire peut modifier.</p>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="rounded-xl bg-background/25 p-3 text-xs">
                  <p className="text-foreground/40">Ce moment</p>
                  <p className="mt-1 text-foreground/80">{format(event.time, "HH:mm", { locale: fr })} → {format(pendingTime, "HH:mm", { locale: fr })}</p>
                </div>
                {impact.relations.length > 0 && <p className="text-xs text-foreground/55">{impact.relations.length} personne{impact.relations.length > 1 ? "s ou élément sont liés" : " ou élément est lié"} à ce moment.</p>}
                {ripplePlan.dependentChanges.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-[.16em] text-foreground/35">Peut aussi être décalé</p>
                    <div className="space-y-2">
                      {ripplePlan.dependentChanges.map(change => {
                        const checked = selectedDependents.includes(change.eventId);
                        return <label key={change.eventId} className="flex cursor-pointer items-start gap-3 rounded-xl border border-foreground/10 bg-background/20 p-3">
                          <input type="checkbox" checked={checked} onChange={() => setSelectedDependents(value => checked ? value.filter(id => id !== change.eventId) : [...value, change.eventId])} className="mt-0.5 accent-white" />
                          <span className="min-w-0">
                            <span className="block text-xs text-foreground/80">{change.title}</span>
                            <span className="mt-1 block text-[10px] text-foreground/40">{format(change.currentTime, "HH:mm", { locale: fr })} → {format(change.nextTime, "HH:mm", { locale: fr })}</span>
                          </span>
                        </label>;
                      })}
                    </div>
                  </div>
                )}
                {ripplePlan.warnings.map(warning => <p key={warning} className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-3 text-xs text-amber-100/75">{warning}</p>)}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setPendingTime(event.time)} className="flex-1 rounded-full border border-foreground/15 px-3 py-2.5 text-xs text-foreground/60 hover:text-foreground">Garder l’ancien horaire</button>
                  <button onClick={() => onApplyRipple(ripplePlan, selectedDependents)} className="flex-1 rounded-full bg-white px-3 py-2.5 text-xs font-medium text-black">Appliquer {1 + selectedDependents.length} changement{selectedDependents.length ? "s" : ""}</button>
                </div>
              </div>
            </section>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">Lieu</label>
            <input disabled={!canEdit} className={input} placeholder="Où cela se passe-t-il ?" value={event.location || ""} onChange={e => onEdit({ location: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">Statut</label>
              <select disabled={!canEdit} className={select} value={event.status} onChange={e => onEdit({ status: e.target.value as TimelineEvent["status"] })}>
                <option value="prepare">Prévu</option>
                <option value="execute">Terminé</option>
                <option value="a_valider">À valider</option>
                <option value="bloque">Bloqué</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">Source</label>
              <select disabled={!canEdit} className={select} value={event.provenance || "real"} onChange={e => onEdit({ provenance: e.target.value as TimelineEvent["provenance"] })}>
                <option value="real">Réel</option>
                <option value="demo">Démo</option>
                <option value="suggested">Suggéré</option>
                <option value="integration">Intégration</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">Visibilité</label>
            <select disabled={!canEdit} className={select} value={event.visibility || "equipe"} onChange={e => onEdit({ visibility: e.target.value as TimelineEvent["visibility"] })}>
              <option value="prive">Privé</option>
              <option value="equipe">Équipe</option>
              <option value="audience">Audience (métadonnée)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">Dépendances (IDs)</label>
            <input disabled={!canEdit} className={input} placeholder="Ex: t1, t2" value={(event.dependencyIds || []).join(", ")} onChange={e => onEdit({ dependencyIds: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })} />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">Ressources</label>
            <input disabled={!canEdit} className={input} placeholder="Ex: Salle, Micro" value={(event.resources || []).join(", ")} onChange={e => onEdit({ resources: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })} />
          </div>

          <div className="pt-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-4">Liens Natifs</p>
            <div className="space-y-3">
              {(event.relations || []).map((relation, index) => (
                <div key={`${relation.kind}-${relation.id}-${index}`} className="flex gap-3 items-end">
                  <select disabled={!canEdit} className={cn(select, "w-1/3")} value={relation.kind} onChange={e => onEdit({ relations: event.relations?.map((item, i) => i === index ? { ...item, kind: e.target.value as TimelineEntityKind } : item) })}>
                    {kinds.map(kind => <option key={kind}>{kind}</option>)}
                  </select>
                  <input disabled={!canEdit} className={cn(input, "flex-1")} value={relation.id} onChange={e => onEdit({ relations: event.relations?.map((item, i) => i === index ? { ...item, id: e.target.value } : item) })} placeholder="ID" />
                  <button disabled={!canEdit} onClick={() => onEdit({ relations: event.relations?.filter((_, i) => i !== index) })} className="pb-2 text-foreground/30 hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {canEdit && (
              <button onClick={() => onEdit({ relations: [...(event.relations || []), { kind: "guest", id: "" }] })} className="mt-4 text-[11px] uppercase tracking-widest text-foreground/50 hover:text-foreground transition-colors">
                + Ajouter un lien
              </button>
            )}
          </div>

          <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4 text-[11px] leading-relaxed text-foreground/50">
            {impact.relations.length} entité(s) résolue(s) · {impact.dependents.length} événement(s) dépendant(s).
          </div>

          {canEdit && (
            <div className="pt-8 border-t border-foreground/10">
              <button onClick={onDelete} className="w-full rounded-full border border-red-500/30 py-3 text-xs uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-colors">
                Supprimer l'événement
              </button>
            </div>
          )}
        </div>
    </ContextPanel>
  );
}

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link2, MapPin, X, Undo2, Waves, ChevronRight, Waypoints, Pencil, Plus } from "lucide-react";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import type { TimelineEntityKind, TimelineEvent, WorldProject } from "@/lib/types";
import type { WorldFocusRequest } from "@/lib/world-focus";
import { useProject } from "@/store/project-store";
import { analyzeEventImpact, applyPropagationPlan, buildTimelineIndex, planEventPropagation, type PropagationPlan } from "@/lib/timeline-graph";
import { getInitialWorldPhase, PANEL_FOR_KIND, type WorldPhase } from "@/lib/wedding-navigation";
import { cn } from "@/lib/utils";
import { getSubchapter } from "@/lib/timeline-chapters";
import { WORLD_MEDIA_CHOICES, momentAmbientAsset, momentVisual, momentVisualZone, visualSourceUrl } from "@/lib/world-visuals";
import { momentVisualOverlayAlpha, type WorldVisual } from "@/lib/types";
import { ContextPanel } from "@/components/ContextPanel";
import { VisualImportControl } from "@/components/VisualImportControl";
import { DayRunTimeline } from "@/components/DayRunTimeline";
import { AvantOverview } from "@/components/AvantOverview";
import { ApresOverview } from "@/components/ApresOverview";
import { MomentActions, MomentFacts } from "@/components/MomentContext";
import { buildMomentContext, type MomentAction, type MomentContextModel, type MomentCapabilities } from "@/lib/moment-context";
import { useI18n, type I18nKey } from "@/lib/i18n";

const kinds: TimelineEntityKind[] = ["guest", "table", "provider", "task", "payment", "document", "music", "team", "message", "logistics", "memory"];

/*
 * Fond d'une scène de la Timeline.
 *
 * Chaque zone reçoit un visuel : celui que le couple a importé sur le Moment,
 * sinon celui que le manifeste propose pour cette zone (cérémonie, repas,
 * invités, préparatifs, musique…). `momentVisual` ne renvoie jamais `null` :
 * la Timeline ne s'ouvre plus sur une colonne de cartes blanches.
 *
 * Le visuel du manifeste est un chemin du dossier public : `visualSourceUrl`
 * le résout, et laisse untouched une dataURL ou une URL absolue importée.
 */
const AmbientBackground = ({ visual, poster }: { visual: WorldVisual; poster?: string }) => {
  const alpha = momentVisualOverlayAlpha(visual);
  const src = visualSourceUrl(visual);
  return (
    <>
      {visual.kind === "video" ? (
        /* Une vidéo RÉELLE du manifeste, là où elle existe : `poster` garde la
           photo de la zone pendant le chargement (pas de flash noir), `muted` +
           `playsInline` pour l'autoplay sur mobile, `preload="metadata"` pour ne
           pas tirer trois vidéos d'un coup sur une longue Timeline. */
        <video
          src={src}
          poster={poster ? visualSourceUrl({ kind: "image", url: poster, overlay: alpha }) : undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 z-0 h-full w-full object-cover"
        />
      ) : (
        <img src={src} alt="" className="absolute inset-0 z-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 z-[1] bg-black" style={{ opacity: alpha }} aria-hidden />
    </>
  );
};

/** Le libellé court d'une zone, pour l'œillère d'une scène (clés `tl.zone.*`). */
function zoneLabel(zone: ReturnType<typeof momentVisualZone>, t: (key: I18nKey, vars?: Record<string, string | number>) => string): string {
  return t(`tl.zone.${zone}` as I18nKey);
}

/*
 * Le marqueur de chapitre : la date du moment de la vie où l'on entre.
 *
 * C'était un bandeau de respiration (filet, titre centré, 56 px de blanc) :
 * superbe en cinéma, coûteux en scroll — trois chapitres consommaient un écran
 * avant d'avoir montré un seul Moment. Il devient ce que les réseaux font d'un
 * séparateur : une date, collante, une ligne, rien d'autre. Collante parce que
 * dans un fil long, savoir OÙ l'on est tombé est la seule chose qu'on cherche.
 */
function SubchapterTransition({ title }: { title: string }) {
  return (
    <div
      data-testid={`timeline-chapter-${title}`}
      className="sticky top-0 z-30 flex w-full items-center gap-3 border-y border-[var(--agency-hairline)] bg-white/85 px-6 py-2 backdrop-blur-md sm:px-10"
    >
      <h2 className="shrink-0 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--agency-eyebrow)]">
        {title}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-[var(--agency-hairline)]" />
    </div>
  );
}

/*
 * Une carte du fil, pas une scène de cinéma.
 *
 * Le Moment garde tout ce qu'il portait déjà — son visuel RÉEL (image ou vidéo
 * du manifeste, jamais un à-plat décoratif), sa zone, ses repères, ses actions —
 * mais posé dans la colonne du fil, à la densité d'un post : qui le porte et
 * quand en tête, le média, le titre, deux ou trois métadonnées, les actions.
 *
 * Ce choix est celui du scroll : l'ancienne scène pleine hauteur (60vh minimum,
 * texte blanc sur photo) ne montrait qu'un Moment à la fois et forçait à
 * défiler pour savoir ce qui restait. Ici on lit une dizaines de Moments par
 * écran, et le visuel devient une information — ce qu'il a toujours été — plus
 * un fond.
 */
function EventScene({
  event,
  project,
  context,
  onClick,
  onAction,
  canEdit,
}: {
  event: TimelineEvent;
  project: WorldProject;
  context: MomentContextModel;
  onClick: () => void;
  onAction: (action: MomentAction, event: TimelineEvent) => void;
  canEdit: boolean;
}) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? enUS : fr;
  const visual = momentVisual(event, project);
  const zone = momentVisualZone(event, project);
  const isCustomVisual = Boolean(event.visual?.url);
  /* L'en-tête « qui » et « quand » : le porteur du Moment, sinon le Monde ;
     l'heure du Jour J, la date partout ailleurs. */
  const carrier = event.responsible?.trim() || event.vendor?.trim() || project.title;
  const when = format(event.time, event.phase === "pendant" ? "HH:mm" : "d MMMM yyyy", { locale: dateLocale });
  const chip = "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[.14em] text-[var(--agency-eyebrow)]";

  return (
    <article
      data-testid={`timeline-scene-${event.id}`}
      data-moment-intent={context.intent}
      className="w-full border-b border-[var(--agency-hairline)] bg-white px-4 py-5 sm:px-8"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3.5">
        <header className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--agency-hairline)] bg-white text-[9px] font-medium uppercase tracking-[.06em] text-[var(--agency-eyebrow)]"
          >
            {format(event.time, event.phase === "pendant" ? "HH" : "d MMM", { locale: dateLocale })}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium leading-tight text-[var(--agency-ink)]">{carrier}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-tight text-[var(--agency-body)]">
              <span className="tabular-nums">{when}</span>
              {event.durationMinutes ? <span aria-hidden>·</span> : null}
              {event.durationMinutes ? <span>{event.durationMinutes} min</span> : null}
              {event.provenance && event.provenance !== "real" ? (
                <span className="rounded-full border border-[var(--agency-hairline)] px-1.5 py-px text-[9px] uppercase tracking-[.12em] text-[var(--agency-eyebrow)]">
                  {t("tl.proposedByAime")}
                </span>
              ) : null}
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              data-testid={`timeline-edit-${event.id}`}
              onClick={onClick}
              className={cn(
                "ml-auto inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-[var(--agency-hairline)] bg-white px-3 text-[10px] uppercase tracking-[.14em] text-[var(--agency-body)] transition",
                "hover:border-[var(--agency-ink)]/35 hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/35",
              )}
            >
              <Pencil aria-hidden className="h-3 w-3" />
              {t("tl.editMoment")}
            </button>
          )}
        </header>

        {/* Le Moment et son média : cliquer ici ouvre l'inspecteur de droite. */}
        <button
          type="button"
          onClick={onClick}
          aria-label={t("moment.open.aria", { title: event.title })}
          className="group/scene block w-full overflow-hidden rounded-[20px] border border-[var(--agency-hairline)] bg-black text-left transition hover:border-[var(--agency-ink)]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
        >
          <span className="relative block aspect-[16/9] w-full overflow-hidden">
            <AmbientBackground visual={visual} poster={momentAmbientAsset(event, project)} />
            {/* La zone qui a fourni le visuel : d'où vient le média, et qu'on
                peut le remplacer. */}
            <span data-testid="timeline-zone" className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[9px] uppercase tracking-[.16em] text-white/90 backdrop-blur-sm">
              <Waves className="h-3 w-3" aria-hidden />
              {isCustomVisual ? t("tl.customVisual") : zoneLabel(zone, t)}
            </span>
          </span>
          <span className="block bg-white px-4 pb-4 pt-3.5">
            <span className="block text-balance text-lg font-semibold leading-snug tracking-tight text-[var(--agency-ink)]">
              {event.title}
            </span>
            {event.detail ? (
              <span className="mt-1.5 block text-[13px] leading-relaxed text-[var(--agency-body)]">{event.detail}</span>
            ) : null}
            {(event.location || (event.relations?.length ?? 0) > 0) && (
              <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {event.location ? (
                  <span className={chip}>
                    <MapPin className="h-3 w-3" aria-hidden />
                    {event.location}
                  </span>
                ) : null}
                {(event.relations?.length ?? 0) > 0 ? (
                  <span className={chip}>
                    <Link2 className="h-3 w-3" aria-hidden />
                    {t("tl.links", { n: event.relations!.length })}
                  </span>
                ) : null}
              </span>
            )}
          </span>
        </button>

        {/* Repères et actions du Moment : la même source que l'inspecteur, en
            plus court. En `light`, parce que la carte est blanche. */}
        <div className="flex flex-col items-start gap-2.5">
          <MomentFacts facts={context.facts} variant="light" />
          <MomentActions
            actions={context.actions}
            primaryCount={context.primaryCount}
            variant="light"
            onAction={action => onAction(action, event)}
          />
        </div>
      </div>
    </article>
  );
}

export function UniversalTimeline({
  events,
  onMomentAction,
  capabilities,
  phase,
}: {
  events: TimelineEvent[];
  /** Une action de Moment ouvre la profondeur correspondante (panneau ancré, vue ou route). */
  onMomentAction: (action: MomentAction, event?: TimelineEvent) => void;
  capabilities: MomentCapabilities;
  /** Période ouverte : le Jour J garde sa régie même sans Moment ce jour-là. */
  phase?: WorldPhase;
}) {
  const { project, addEntity, updateEntity, updateProject, removeEntity, canEdit } = useProject();
  const { locale, t } = useI18n();
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
    // Le jalon naît dans la période courante (Avant / Jour J / Après) : sinon
    // il serait filtré de la vue immédiatement après sa création.
    const activePhase = phase ?? getInitialWorldPhase(project.pivot.value);
    const id = addEntity("timeline", { time: project.pivot.value, durationMinutes: 60, kind: "evenement", title: t("tl.newMilestone"), status: "prepare", confidence: "confirme", phase: activePhase, universe: project.universe, provenance: "real", visibility: "equipe", relations: [], dependencyIds: [], resources: [], propagation: { state: "none" } });
    setSelected(id);
  };
  const addRef = useRef(add);
  addRef.current = add;

  useEffect(() => {
    const onCreate = () => addRef.current();
    window.addEventListener("aime:new-moment", onCreate);
    return () => window.removeEventListener("aime:new-moment", onCreate);
  }, []);

  let currentSubchapter = "";
  const pivotTime = project.pivot.value;
  /*
   * Le fil unique : une tête de période n'est plus un écran, c'est un chapitre.
   * Quand le scroll mélange les périodes, on pose la tête d'Avant à son entrée
   * et celle d'Après à la sienne, une fois chacune. Le Jour J n'a pas de tête
   * ici : sa régie est un écran à part (PlayMode, appelé depuis la barre de
   * lecture), pas un habillage du déroulé.
   */
  const mixedPhases = new Set(events.map(item => item.phase)).size > 1;
  const headsPlaced = new Set<TimelineEvent["phase"]>();
  const phaseHead = (item: TimelineEvent) => {
    if (!mixedPhases || headsPlaced.has(item.phase)) return null;
    headsPlaced.add(item.phase);
    if (item.phase === "avant") return <AvantOverview />;
    if (item.phase === "apres") return <ApresOverview />;
    return null;
  };
  // Le Jour J ne se lit pas comme un film : dès que la vue ne montre que des
  // Moments « pendant », on bascule sur la timeline verticale de régie
  // (compte à rebours, horaires agrandis, retards). Le tiroir de détail reste
  // le même, ouvert depuis chaque Moment.
  const isDayRun = events.length > 0
    ? events.every(item => item.phase === "pendant")
    : phase === "pendant";
  // Même logique pour l'Après : la tête de vue montre les trois gestes
  // (galerie, mots doux, film) avec leurs comptes réels, puis le journal
  // cinématique continue en dessous.
  /* Et pour l'Avant : la tête de vue résume l'état des préparations (tâches,
     prestataires, argent) avant de laisser la liste des Moments continuer. */
  const isAvantRun = events.length > 0 && events.every(item => item.phase === "avant");
  /* L'Après a sa tête, comme l'Avant et le Jour J : souvenirs, images, vidéos,
     remerciements — avec leurs comptes réels, avant le journal cinématique. */
  const isApresRun = events.length > 0 && events.every(item => item.phase === "apres");

  return (
    <div className="w-full flex flex-col bg-background">
      {events.length > 0 && canEdit && (
        <div className="flex justify-end border-t border-foreground/5 bg-background px-6 py-4 sm:px-10">
          <button
            type="button"
            data-testid="timeline-add-moment"
            onClick={add}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--agency-ink)]/20 px-4 text-[11px] font-medium uppercase tracking-[.16em] text-[var(--agency-ink)] transition hover:border-[var(--agency-ink)]/50 hover:bg-[var(--agency-ink)]/[.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus aria-hidden className="h-4 w-4" />
            {t("tl.addMoment")}
          </button>
        </div>
      )}
      {events.length === 0 && (
        <div className="flex flex-col items-center gap-5 border-t border-foreground/5 bg-background px-6 py-32 text-center">
          <p className="text-sm text-foreground/40">{t("tl.empty")}</p>
          {canEdit && (
            <button
              type="button"
              data-testid="timeline-add-moment"
              onClick={add}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--agency-ink)] px-5 text-xs font-medium text-[var(--agency-paper)] transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus aria-hidden className="h-4 w-4" />
              {t("tl.addMoment")}
            </button>
          )}
        </div>
      )}

      {isDayRun && (
        <div className="pt-8">
          <DayRunTimeline events={events} onOpen={setSelected} onMomentAction={onMomentAction} capabilities={capabilities} />
        </div>
      )}

      {isAvantRun && <AvantOverview />}
      {isApresRun && <ApresOverview />}


      {!isDayRun && events.map(item => {
        const subchapter = getSubchapter(item, pivotTime);
        const isNewSubchapter = subchapter !== currentSubchapter;
        currentSubchapter = subchapter;

        return (
          <Fragment key={item.id}>
            {phaseHead(item)}
            {isNewSubchapter && <SubchapterTransition title={subchapter} />}
            <EventScene
              event={item}
              project={project}
              context={buildMomentContext(item, project, capabilities, locale)}
              onClick={() => setSelected(item.id)}
              onAction={onMomentAction}
              canEdit={canEdit}
            />
          </Fragment>
        );
      })}

      {!canEdit && (
        <div className="w-full py-20 flex justify-center bg-background border-t border-foreground/5">
          <p className="text-xs text-foreground/40 tracking-widest uppercase">{t("tl.readOnly")}</p>
        </div>
      )}

      {event && (
        <EventDrawer
          event={event}
          project={project}
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
          <span>{t("tl.changeApplied")}</span>
          <button onClick={() => { updateProject({ timeline: undoTimeline }); setUndoTimeline(undefined); }} className="flex items-center gap-1.5 rounded-full bg-[var(--agency-ink)] px-3 py-2 font-medium text-[var(--agency-paper)]">
            <Undo2 className="h-3.5 w-3.5" /> {t("tl.undo")}
          </button>
        </div>
      )}
    </div>
  );
}

function EventDrawer({ event, project, onClose, onEdit, onApplyRipple, onDelete, canEdit }: { event: TimelineEvent; project: NonNullable<ReturnType<typeof useProject>["project"]>; onClose: () => void; onEdit: (updates: Partial<TimelineEvent>) => void; onApplyRipple: (plan: PropagationPlan, dependentIds: string[]) => void; onDelete: () => void; canEdit: boolean }) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? enUS : fr;
  const impact = analyzeEventImpact(project, event.id, {});
  const related = (event.relations || [])
    .map(relation => ({ relation, entity: buildTimelineIndex(project).entities.get(`${relation.kind}:${relation.id}`) }))
    .filter(item => item.entity);
  const [pendingTime, setPendingTime] = useState(event.time);
  const [selectedDependents, setSelectedDependents] = useState<string[]>([]);
  useEffect(() => {
    setPendingTime(event.time);
    setSelectedDependents([]);
  }, [event.id, event.time]);
  const ripplePlan = useMemo(() => pendingTime === event.time ? undefined : planEventPropagation(project, event.id, { time: pendingTime }), [event.id, event.time, pendingTime, project]);
  const input = "w-full rounded-none border-b border-foreground/20 bg-transparent py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:border-border disabled:opacity-50 transition-colors placeholder:text-foreground/30";
  const select = "w-full appearance-none rounded-none border-b border-foreground/20 bg-background py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors focus:border-foreground disabled:opacity-50";

  return (
    <ContextPanel eyebrow={t("tl.drawer.eyebrow")} title={t("tl.drawer.title")} onClose={onClose}>
        <div className="space-y-8">
          <div>
            <input disabled={!canEdit} className={cn(input, "text-2xl font-display font-medium")} value={event.title} onChange={e => onEdit({ title: e.target.value })} placeholder={t("tl.drawer.titlePh")} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("aime:focus-world", { detail: { route: "/user-portal", graph: true } })); }} className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-[10px] uppercase tracking-[.14em] text-foreground/65 hover:bg-foreground/5">
              <Waypoints className="h-3.5 w-3.5" /> {t("tl.drawer.visibilityLink")}
            </button>
          </div>

          {related.length > 0 && (
            <section className="rounded-2xl border border-foreground/10 p-4">
              <p className="text-[10px] uppercase tracking-widest text-foreground/40">{t("tl.drawer.related")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {related.map(({ relation, entity }) => {
                  const panel = PANEL_FOR_KIND[relation.kind];
                  return (
                    <button
                      key={`${relation.kind}:${relation.id}`}
                      type="button"
                      disabled={!panel}
                      onClick={() => {
                        onClose();
                        if (panel) window.dispatchEvent(new CustomEvent("aime:focus-world", { detail: { route: "/user-portal", panel } }));
                      }}
                      className="group inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-1.5 text-xs text-foreground/70 transition hover:border-foreground/40 hover:text-foreground disabled:cursor-default disabled:opacity-40"
                    >
                      <span className="text-[9px] uppercase tracking-wider text-foreground/40">{t(`tl.kind.${relation.kind}` as I18nKey)}</span>
                      <span>{entity?.label ?? t("tl.drawer.notFound")}</span>
                      {panel && <ChevronRight className="h-3 w-3 text-foreground/30 transition group-hover:translate-x-0.5" />}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">{t("tl.drawer.time")}</label>
              <input disabled={!canEdit} type="datetime-local" className={input} value={new Date(pendingTime - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => setPendingTime(new Date(e.target.value).getTime())} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">{t("tl.drawer.duration")}</label>
              <input disabled={!canEdit} type="number" min="0" className={input} value={event.durationMinutes || 0} onChange={e => onEdit({ durationMinutes: Number(e.target.value) })} />
            </div>
          </div>

          {ripplePlan && (
            <section className="overflow-hidden rounded-2xl border border-brand-accent/25 bg-brand-accent/5">
              <div className="flex items-start gap-3 border-b border-foreground/10 p-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-accent/30 bg-background/30">
                  <Waves className="h-4 w-4 text-brand-accent" />
                </span>
                <div>
                  <p className="text-sm font-medium">{t("tl.drawer.rippleTitle")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/50">{t("tl.drawer.rippleText")}</p>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="rounded-xl bg-background/25 p-3 text-xs">
                  <p className="text-foreground/40">{t("tl.drawer.thisMoment")}</p>
                  <p className="mt-1 text-foreground/80">{format(event.time, "HH:mm", { locale: dateLocale })} → {format(pendingTime, "HH:mm", { locale: dateLocale })}</p>
                </div>
                {impact.relations.length > 0 && <p className="text-xs text-foreground/55">{impact.relations.length > 1 ? t("tl.drawer.linkedMany", { n: impact.relations.length }) : t("tl.drawer.linkedOne")}</p>}
                {ripplePlan.dependentChanges.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-[.16em] text-foreground/35">{t("tl.drawer.mayShift")}</p>
                    <div className="space-y-2">
                      {ripplePlan.dependentChanges.map(change => {
                        const checked = selectedDependents.includes(change.eventId);
                        return <label key={change.eventId} className="flex cursor-pointer items-start gap-3 rounded-xl border border-foreground/10 bg-background/20 p-3">
                          <input type="checkbox" checked={checked} onChange={() => setSelectedDependents(value => checked ? value.filter(id => id !== change.eventId) : [...value, change.eventId])} className="mt-0.5 accent-white" />
                          <span className="min-w-0">
                            <span className="block text-xs text-foreground/80">{change.title}</span>
                            <span className="mt-1 block text-[10px] text-foreground/40">{format(change.currentTime, "HH:mm", { locale: dateLocale })} → {format(change.nextTime, "HH:mm", { locale: dateLocale })}</span>
                          </span>
                        </label>;
                      })}
                    </div>
                  </div>
                )}
                {ripplePlan.warnings.map(warning => <p key={warning} className="rounded-xl border border-brand-accent/20 bg-brand-accent/5 p-3 text-xs text-foreground/80">{warning}</p>)}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setPendingTime(event.time)} className="flex-1 rounded-full border border-foreground/15 px-3 py-2.5 text-xs text-foreground/60 hover:text-foreground">{t("tl.drawer.keepOld")}</button>
                  <button onClick={() => onApplyRipple(ripplePlan, selectedDependents)} className="flex-1 rounded-full bg-[var(--agency-ink)] px-3 py-2.5 text-xs font-medium text-[var(--agency-paper)]">{selectedDependents.length ? t("tl.drawer.applyMany", { n: 1 + selectedDependents.length }) : t("tl.drawer.applyOne")}</button>
                </div>
              </div>
            </section>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">{t("tl.drawer.place")}</label>
            <input disabled={!canEdit} className={input} placeholder={t("tl.drawer.placePh")} value={event.location || ""} onChange={e => onEdit({ location: e.target.value })} />
          </div>

          <VisualImportControl
            label={t("tl.drawer.visual")}
            value={event.visual}
            disabled={!canEdit}
            onChange={visual => onEdit({ visual })}
            /* Comme le héro et le panneau : les vignettes du Monde sont là,
               au lieu d'un seul champ d'import (17/09). */
            choices={WORLD_MEDIA_CHOICES}
            choicesLabel={t("world.hero.visual.choices")}
          />

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">{t("tl.drawer.status")}</label>
              <select disabled={!canEdit} className={select} value={event.status} onChange={e => onEdit({ status: e.target.value as TimelineEvent["status"] })}>
                <option value="prepare">{t("tl.status.prepare")}</option>
                <option value="execute">{t("tl.status.execute")}</option>
                <option value="a_valider">{t("tl.status.a_valider")}</option>
                <option value="bloque">{t("tl.status.bloque")}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">{t("tl.drawer.source")}</label>
              <select disabled={!canEdit} className={select} value={event.provenance || "real"} onChange={e => onEdit({ provenance: e.target.value as TimelineEvent["provenance"] })}>
                <option value="real">{t("tl.source.real")}</option>
                <option value="demo">{t("tl.source.demo")}</option>
                <option value="suggested">{t("tl.source.suggested")}</option>
                <option value="integration">{t("tl.source.integration")}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">{t("tl.drawer.visibility")}</label>
            <select disabled={!canEdit} className={select} value={event.visibility || "equipe"} onChange={e => onEdit({ visibility: e.target.value as TimelineEvent["visibility"] })}>
              <option value="prive">{t("tl.visib.prive")}</option>
              <option value="equipe">{t("tl.visib.equipe")}</option>
              <option value="audience">{t("tl.visib.audience")}</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">{t("tl.drawer.deps")}</label>
            <input disabled={!canEdit} className={input} placeholder={t("tl.drawer.depsPh")} value={(event.dependencyIds || []).join(", ")} onChange={e => onEdit({ dependencyIds: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })} />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1 block">{t("tl.drawer.resources")}</label>
            <input disabled={!canEdit} className={input} placeholder={t("tl.drawer.resourcesPh")} value={(event.resources || []).join(", ")} onChange={e => onEdit({ resources: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })} />
          </div>

          <div className="pt-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-4">{t("tl.drawer.links")}</p>
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
                {t("tl.drawer.addLink")}
              </button>
            )}
          </div>

          <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4 text-[11px] leading-relaxed text-foreground/50">
            {t("tl.drawer.impact", { entities: impact.relations.length, dependents: impact.dependents.length })}
          </div>

          {canEdit && (
            <div className="pt-8 border-t border-foreground/10">
              <button onClick={onDelete} className="w-full rounded-full border border-destructive/40 py-3 text-xs uppercase tracking-widest text-destructive hover:bg-destructive/10 transition-colors">
                {t("tl.drawer.delete")}
              </button>
            </div>
          )}
        </div>
    </ContextPanel>
  );
}

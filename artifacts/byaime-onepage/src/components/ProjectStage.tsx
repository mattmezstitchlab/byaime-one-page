import { useState, useMemo, useEffect, useRef } from 'react';
import { useClerk } from '@clerk/react';
import { motion } from 'framer-motion';
import { useProject } from '@/store/project-store';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { useLocation } from 'wouter';
import { UniversalTimeline } from './UniversalTimeline';
import { PublicPageView } from './PublicPageView';
import { publicPageOf, withBlockVisibility } from '@/lib/public-page';
import { TimelinePlayback } from './TimelinePlayback';
import { requestAimePanelFollow, requestAimePanelShow } from '@/lib/aime-panel-events';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ImagePlus, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';
import { filterTimeline, type TimelineView } from '@/lib/timeline-graph';
import { isFolderLocked } from '@/lib/wedding-folders';
import { consumeWorldFocus, type WorldFocusRequest } from '@/lib/world-focus';
import { CenteredBlock } from './CenteredBlock';
import { EntityEditor } from './EntityEditor';
import { findEntityNode, type EntityNode } from '@/lib/entity-focus';
import { AIME_SCREENS, setAimeScreenContext, type AimeScreenId } from '@/lib/aime-guidance';
import { WorldOverview } from './WorldOverview';
import { PersonSpotlight } from './PersonSpotlight';
import { MESSAGE_TO_EVENT } from '@/lib/person-spotlight-bus';
import { VisibilityGraph } from './VisibilityGraph';
import { WorldSwitcher } from './WorldSwitcher';
import type { Guest, TimelineEvent } from '@/lib/types';
import type { MomentAction } from '@/lib/moment-context';
import {
  normalizePanelId,
  getWeddingCapabilities,
  getWeddingNavigation,
  getWeddingRailItems,
  isWeddingPanelAvailable,
  findPhaseForPanel,
  getInitialWorldPhase,
  getWorldPhases,
  getWorldPhaseShortLabel,
  type WorldPhase,
  type WeddingRole,
  type WeddingPanelId } from '@/lib/wedding-navigation';
import { setWorldNavState } from '@/lib/world-nav-state';
import { trackEvent } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { heroVisualOverlayCss } from '@/lib/types';
import { isCustomHeroVisual, resolveHeroVisual, setHeroVisualFor, visualSourceUrl, WORLD_VISUAL_CHOICES } from '@/lib/world-visuals';
import { VisualImportControl } from '@/components/VisualImportControl';
import type { UniversalCreateActionId } from '@/lib/universal/create-actions';

const CREATE_PANEL_TARGETS: Partial<Record<UniversalCreateActionId, WeddingPanelId>> = {
  person: "guests",
  task: "planning",
  "document-media": "documents" };

/*
 * Créer un Moment n'ouvre pas un panneau : c'est un jalon de la Timeline. On
 * revient à la vue chronologique et on demande l'ajout d'un jalon (la Timeline
 * écoute l'événement et ouvre le tiroir d'édition, dans la bonne phase).
 */
const MOMENT_CREATE_ACTION: UniversalCreateActionId = "moment";

/*
 * App institutionnelle : plus de photographies décoratives. Les personnes et
 * prestataires sont des monogrammes — une initiale sur ivoire, lisible partout.
 */
function Monogram({ label, name, large = false }: { label: string; name: string; large?: boolean }) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full border border-[var(--agency-ink)]/20 bg-[var(--agency-paper)] font-display uppercase text-[var(--agency-ink)]",
        large ? "h-20 w-20 text-2xl sm:h-24 sm:w-24" : "h-9 w-9 text-sm",
      )}
      title={name}
    >
      {label}
    </span>
  );
}


function GuestPortrait({ guest, large = false }: { guest: Guest; index?: number; large?: boolean }) {
  return <Monogram label={guest.name.charAt(0)} name={guest.name} large={large} />;
}

export function ProjectStage() {
  const { project, projects, selectProject, updateProject, updateEntity, canEdit, currentRole } = useProject();
  const { openUserProfile } = useClerk();
  const { t, locale } = useI18n();
  const [, setLocation] = useLocation();
  /* Les dates suivent la langue : `date-fns` pour les libellés, `Intl` pour les listes. */
  const dateLocale = locale === 'en' ? enUS : fr;
  const pivotDate = project?.pivot.value ?? Date.now();
  const [phase, setPhase] = useState<WorldPhase>(() => getInitialWorldPhase(pivotDate));
  const [view, setView] = useState<TimelineView>("chronological");
  const [tasksOpen, setTasksOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [worldMenuOpen, setWorldMenuOpen] = useState(false);
  const [heroEditorOpen, setHeroEditorOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<WeddingPanelId | null>(null);
  /*
   * Ce qui est réellement regardé. Jusqu'ici les 22 événements mesurés étaient
   * tous transactionnels (création, RSVP, fichier, partage) : aucun ne disait si
   * une vue ou un panneau était seulement ouvert. Ces deux événements répondent
   * à « est-ce qu'ils regardent la Timeline ? » sans rien deviner.
   */
  useEffect(() => {
    trackEvent('world_view_opened', { view, phase });
  }, [view, phase]);
  useEffect(() => {
    if (activePanel) trackEvent('world_panel_opened', { panel: activePanel, phase });
  }, [activePanel, phase]);
  const [countdownsOpen, setCountdownsOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [spotlight, setSpotlight] = useState<{ kind: "guest" | "provider"; id: string } | null>(null);
  /* La fiche d'une entité, ouverte depuis n'importe quel écran (mini-carte personne,
     relations du portail, recherche) via `entityKind` + `entityId`. */
  const [entityNode, setEntityNode] = useState<EntityNode | null>(null);
  const [previewRole, setPreviewRole] = useState<WeddingRole | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Le tick à la seconde n'est utile que pendant le Jour J (événement en cours,
    // horaires qui défilent). Hors Jour J, une minute suffit : sinon tout le Monde
    // se re-rend chaque seconde pour un décompte affiché en jours.
    const delay = phase === 'pendant' ? 1000 : 60000;
    const timer = window.setInterval(() => setNow(Date.now()), delay);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (!project) return;
    const pivot = new Date(project.pivot.value);
    setCalendarMonth(pivot);
    setSelectedDate(pivot);
  }, [project?.id, project?.pivot.value]);

  useEffect(() => {
    if (!project) return;
    setPhase(getInitialWorldPhase(project.pivot.value));
  }, [project?.id]);

  const navigation = useMemo(
    () => getWeddingNavigation(phase, getWeddingCapabilities(previewRole ?? currentRole), locale),
    [phase, currentRole, previewRole, locale],
  );
  const rail = useMemo(
    () => getWeddingRailItems(phase, getWeddingCapabilities(previewRole ?? currentRole), locale),
    [phase, currentRole, previewRole, locale],
  );
  /* Ce que le rôle peut voir, transmis à la dérivation des Moments : un rôle
     sans accès aux finances ne voit ni repère budget ni action Budget. */
  const momentCapabilities = useMemo(() => {
    const caps = getWeddingCapabilities(previewRole ?? currentRole);
    return { seeFinances: caps.seeFinances, manageDocuments: caps.managePrivateDocuments };
  }, [currentRole, previewRole]);

  /*
   * `activePanel` garde l'identifiant demandé, PAS sa forme normalisée : un
   * `guests` doit ouvrir Pilotage sur l'onglet Personnes, un `planning` sur
   * Tâches. La normalisation sert à décider si le panneau existe et à surligner
   * le bon onglet du menu de gauche (`MondePanel` la refait de son côté).
   */
  /*
   * Présenter un panneau = l'actif dans le Monde (état, phase, analytics) +
   * le montrer dans le Panneau AIME unique (monté dans PrivateLayout). C'est
   * le seul chemin d'ouverture : rangée, menu, Moments, deep-links, création.
   */
  const presentPanel = (panel: WeddingPanelId, momentId: string | null = null) => {
    setActivePanel(panel);
    requestAimePanelShow({ panel, momentId });
  };
  const closePresentedPanel = () => {
    setActivePanel(null);
    window.dispatchEvent(new Event("aime:close-world-panel"));
  };

  /*
   * Ouverture de panneau « sûre » : si le panneau demandé n'existe pas dans la
   * phase courante (ex. « Régie du Jour J » appelée depuis la phase Avant, ou
   * « Souvenirs » en Avant), on bascule d'abord vers la phase qui le porte, au
   * lieu de le voir se refermer aussitôt.
   */
  const openPanelSafely = (panel: WeddingPanelId, momentId: string | null = null) => {
    const normalized = normalizePanelId(panel);
    const role = previewRole ?? currentRole;
    const effectiveView: TimelineView = normalized === "music" ? "music" : view;
    if (normalized === "music") setView("music");
    if (isWeddingPanelAvailable(normalized, navigation, effectiveView, rail)) {
      presentPanel(panel, momentId);
      return;
    }
    const targetPhase = findPhaseForPanel(normalized, role, effectiveView);
    if (targetPhase) {
      setPhase(targetPhase);
      if (view === "public-info" && targetPhase === "avant") setView("chronological");
    }
    presentPanel(panel, momentId);
  };

  /*
   * Accueil d'un Monde neuf (17/09) : quatre dossiers, dans l'ordre où on en a
   * besoin, en langage clair — le style de la page « Le rétroplanning », pas
   * un second onboarding. La liste respecte le rôle : le budget ne s'offre
   * pas à qui ne doit pas le voir.
   */
  const gettingStartedRows = useMemo(() => {
    if (!project || !(project.timeline.length === 0 && project.guests.length === 0 && project.providers.length === 0)) return null;
    const role = previewRole ?? currentRole;
    const rows: Array<{ panel: WeddingPanelId; label: string; description: string }> = [
      { panel: "guests", label: t("world.start.guests"), description: t("world.start.guests.desc") },
    ];
    if (!isFolderLocked({ capability: "finances" }, role)) {
      rows.push({ panel: "budget", label: t("world.start.budget"), description: t("world.start.budget.desc") });
    }
    rows.push({ panel: "dayof", label: t("world.start.program"), description: t("world.start.program.desc") });
    rows.push({ panel: "providers", label: t("world.start.providers"), description: t("world.start.providers.desc") });
    return rows;
  }, [project, previewRole, currentRole, t]);

  /*
   * UNE ACTION DE MOMENT = LE CHEMIN LE PLUS COURT.
   *
   * Panneau ancré sur le Moment (profondeur), vue de la Timeline, ou route
   * publique (/bilan). Aucune donnée n'est recopiée : le panneau filtrera avec
   * les MÊMES relations que celles affichées en repère sur la scène.
   */
  const handleMomentAction = (action: MomentAction, event?: TimelineEvent) => {
    trackEvent('moment_action_opened', { action: action.id, phase });
    if (action.destination.kind === "route") {
      setLocation(action.destination.href);
      return;
    }
    if (action.destination.kind === "view") {
      closePresentedPanel();
      setView(action.destination.view);
      return;
    }
    openPanelSafely(action.destination.panel, action.scoped && event ? event.id : null);
  };
  /*
   * Le panneau présenté n'existe plus dans le mode courant : on le DIT au
   * Panneau AIME (qui garde sa fenêtre et se vide) quand c'est le mode qui a
   * changé ; sinon, fermeture classique. Fermer toute la fenêtre parce qu'on
   * a choisi un autre mode dans la colonne était la sortie de route du 17/09.
   */
  const lastPhaseRef = useRef(phase);
  useEffect(() => {
    if (!activePanel) {
      lastPhaseRef.current = phase;
      return;
    }
    if (isWeddingPanelAvailable(activePanel, navigation, view, rail)) {
      lastPhaseRef.current = phase;
      return;
    }
    const modeChanged = lastPhaseRef.current !== phase;
    lastPhaseRef.current = phase;
    if (modeChanged) {
      requestAimePanelFollow({ panel: activePanel, phase });
      setActivePanel(null);
      return;
    }
    closePresentedPanel();
  }, [activePanel, navigation, view, rail, phase]);

  const openPanelSafelyRef = useRef(openPanelSafely);
  openPanelSafelyRef.current = openPanelSafely;

  const openEntityFiche = (kind?: string, id?: string) => {
    const node = findEntityNode(project, kind, id);
    if (node) setEntityNode(node);
  };
  const openEntityFicheRef = useRef(openEntityFiche);
  openEntityFicheRef.current = openEntityFiche;

  /* Le panneau de l’orbe éclaire la catégorie du Monde active. */
  useEffect(() => {
    setWorldNavState({ active: true, phase, view, panel: activePanel, role: previewRole ?? currentRole });
    return () => setWorldNavState({ active: false });
  }, [phase, view, activePanel, previewRole, currentRole]);

  useEffect(() => {
    const openCreateTarget = (action: UniversalCreateActionId | undefined) => {
      if (!action) return;
      if (action === MOMENT_CREATE_ACTION) {
        // Un Moment se crée dans la Timeline, pas dans un panneau.
        closePresentedPanel();
        setView("chronological");
        window.dispatchEvent(new Event("aime:new-moment"));
        return;
      }
      const panel = CREATE_PANEL_TARGETS[action];
      if (panel) openPanelSafelyRef.current(panel);
    };
    const listener = (event: Event) => openCreateTarget((event as CustomEvent<UniversalCreateActionId>).detail);
    /* Fermeture demandée par l'extérieur (Panneau AIME, autres écrans) :
       reset d'état SANS rediffusion — pas de boucle d'événements. */
    const closeWorldPanel = () => {
      setActivePanel(null);
      };
    const openMessagePanel = () => openPanelSafelyRef.current("messages");
    const toggleGuestPreview = () => setPreviewRole(role => (role ? null : "viewer"));
    window.addEventListener("aime:open-create-target", listener);
    window.addEventListener("aime:close-world-panel", closeWorldPanel);
    window.addEventListener(MESSAGE_TO_EVENT, openMessagePanel);
    window.addEventListener("aime:toggle-guest-preview", toggleGuestPreview);
    const requestedAction = new URLSearchParams(window.location.search).get("create") as UniversalCreateActionId | null;
    if (requestedAction && (requestedAction === MOMENT_CREATE_ACTION || CREATE_PANEL_TARGETS[requestedAction])) {
      openCreateTarget(requestedAction);
      window.history.replaceState(null, "", window.location.pathname);
    }
    return () => {
      window.removeEventListener("aime:open-create-target", listener);
      window.removeEventListener("aime:close-world-panel", closeWorldPanel);
      window.removeEventListener(MESSAGE_TO_EVENT, openMessagePanel);
      window.removeEventListener("aime:toggle-guest-preview", toggleGuestPreview);
    };
  }, []);

  /*
   * L'écran courant est publié à l'agent de guidage : panneau ouvert en priorité,
   * sinon la vue de la Timeline, et toujours la phase. C'est ce qui permet au
   * panneau AI d'expliquer « là où vous êtes » sans que chaque écran ait à le
   * déclarer lui-même.
   */
  useEffect(() => {
    const candidate = activePanel ? `panel:${activePanel}` : `view:${view}`;
    const screen = (candidate in AIME_SCREENS ? candidate : 'portal') as AimeScreenId;
    setAimeScreenContext({ screen, phase, view, panel: activePanel });
  }, [activePanel, view, phase]);

  useEffect(() => {
    const applyFocus = (request?: WorldFocusRequest) => {
      if (!request) return;
      const explicitPhase = request.phase === "avant" || request.phase === "pendant" || request.phase === "apres";
      if (explicitPhase) setPhase(request.phase as WorldPhase);
      if (request.view) setView(request.view as TimelineView);
      if (request.panel) {
        if (explicitPhase) {
          presentPanel(request.panel as WeddingPanelId);
        } else {
          // Pas de phase demandée : ouvrir la phase qui porte réellement ce panneau.
          openPanelSafelyRef.current(request.panel as WeddingPanelId);
        }
      } else if (request.view) {
        /* Une destination de vue (Timeline, Musique) referme le panneau ouvert. */
        closePresentedPanel();
      }
      if (request.entityKind && request.entityId) openEntityFicheRef.current(request.entityKind, request.entityId);
      if (request.graph) {
        /* La fenêtre unique cède la place à la modale demandée. */
        closePresentedPanel();
        setGraphOpen(true);
      }
      if (request.overview) {
        closePresentedPanel();
        setOverviewOpen(true);
      }
      if (request.search) {
        /* La recherche unifiée vit dans le Panneau AIME (colonne) : on l'ouvre
           avec le curseur déjà dans la case, au lieu d'une modale séparée. */
        closePresentedPanel();
        window.dispatchEvent(new CustomEvent("aime:open-ai", { detail: { search: true } }));
      }
    };
    const pending = consumeWorldFocus();
    if (pending) {
      applyFocus(pending);
      window.dispatchEvent(new CustomEvent("aime:focus-world", { detail: pending }));
    }
    const listener = (event: Event) => applyFocus((event as CustomEvent<WorldFocusRequest>).detail);
    window.addEventListener("aime:focus-world", listener);
    return () => window.removeEventListener("aime:focus-world", listener);
  }, []);

  const visibleEvents = useMemo(() => {
    if (!project) return [];
    return filterTimeline(project, view).filter(e => {
      // Phase filtering
      if (phase === 'avant' && e.phase !== 'avant') return false;
      if (phase === 'pendant' && e.phase !== 'pendant') return false;
      if (phase === 'apres' && e.phase !== 'apres') return false;

      return true;
    });
  }, [project, phase, view]);

  const countdownTargets = useMemo(() => {
    if (!project) return [];
    const targets = [
      ...(project.pivot.value > now ? [{ id: 'pivot', time: project.pivot.value, title: t('world.title.dday'), kind: t('world.kind.pivot') }] : []),
      ...project.tasks
        .filter(task => task.status !== 'termine' && task.dueDate && task.dueDate > now)
        .map(task => ({ id: `task-${task.id}`, time: task.dueDate as number, title: task.title, kind: t('world.kind.deadline') })),
      ...project.timeline
        .filter(event => event.time > now)
        .map(event => ({ id: `moment-${event.id}`, time: event.time, title: event.title, kind: t('world.kind.moment') })),
    ];
    return targets.sort((a, b) => a.time - b.time);
  }, [now, project, t]);

  const completion = useMemo(() => {
    if (!project?.tasks.length) return 0;
    return Math.round((project.tasks.filter(task => task.status === 'termine').length / project.tasks.length) * 100);
  }, [project]);
  const subtitleIsRedundant = useMemo(() => {
    if (!project?.subtitle) return false;
    const normalize = (value: string) => value.toLocaleLowerCase(locale).replace(/[^a-zà-ÿ0-9]/g, '');
    const subtitle = normalize(project.subtitle);
    const title = normalize(project.title);
    const universe = normalize(project.universe);
    return subtitle === title || subtitle === universe || subtitle === `${universe}${new Date(pivotDate).getFullYear()}`;
  }, [locale, pivotDate, project]);

  if (!project) return null;

  const dayEvents = project.timeline.filter(event => event.phase === "pendant").sort((a, b) => a.time - b.time);
  const liveEvent = dayEvents.find(event => event.time <= now && (event.endTime ?? event.time + (event.durationMinutes || 60) * 60000) > now);
  const nextDayEvent = dayEvents.find(event => event.time > now);
  const featuredDayEvent = liveEvent || nextDayEvent;
  const memoryCount = project.memories.length + project.media.length;
  const isPublicInfo = view === "public-info";
  const phaseHeroCopy = {
    avant: {
      eyebrow: t("world.hero.avant.eyebrow"),
      title: project.title,
      description: t("world.hero.avant.desc") },
    pendant: {
      eyebrow: liveEvent ? t("world.hero.pendant.eyebrow.live") : t("world.hero.pendant.eyebrow"),
      title: project.title,
      description: featuredDayEvent
        ? `${liveEvent ? t("world.hero.now") : t("world.hero.upcoming")}${featuredDayEvent.location ? ` · ${featuredDayEvent.location}` : ""}${featuredDayEvent.responsible ? ` · ${featuredDayEvent.responsible}` : ""}`
        : t("world.hero.pendant.empty") },
    apres: {
      eyebrow: t("world.hero.apres.eyebrow"),
      title: project.title,
      description: memoryCount
        ? t("world.hero.apres.desc", { count: memoryCount })
        : t("world.hero.apres.empty") } }[phase];
  const heroCopy = isPublicInfo
    ? {
        eyebrow: t("world.hero.publicInfo.eyebrow"),
        title: project.title,
        description: project.subtitle && !subtitleIsRedundant
          ? project.subtitle
          : t("world.hero.publicInfo.desc") }
    : phaseHeroCopy;
  /*
   * Le hero a TOUJOURS un grand visuel. Un Monde sans `heroVisual` (créé avant
   * ce réglage, ou importé) retombait sur un fond blanc : le bouton « Visuel »
   * posé ici le remplace en un clic, sans passer par le panneau de l'orbe.
   */
  const heroVisual = resolveHeroVisual(project, phase);
  const heroSrc = visualSourceUrl(heroVisual);
  const heroIsCustom = isCustomHeroVisual(project, phase);
  const heroModeLabel = getWorldPhaseShortLabel(phase, locale);
  /* Les initiales de la semaine viennent de la locale : « L M M J V S D » en
     français, « M T W T F S S » en anglais, toujours à partir du lundi. */
  const weekdayInitials = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }) }).map(day => format(day, "EEEEE", { locale: dateLocale }).toLocaleUpperCase(locale));
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 }) });
  const selectedDayEvents = project.timeline.filter(event => isSameDay(event.time, selectedDate));
  const nextCountdown = countdownTargets[0] || { id: 'pivot', time: pivotDate, title: t('world.title.dday'), kind: t('world.kind.pivot') };
  const distanceToNext = Math.max(0, nextCountdown.time - now);
  const nextDays = Math.floor(distanceToNext / 86400000);
  const nextHours = Math.floor((distanceToNext % 86400000) / 3600000);
  const nextMinutes = Math.floor((distanceToNext % 3600000) / 60000);
  const nextSeconds = Math.floor((distanceToNext % 60000) / 1000);
  const formatRemaining = (time: number) => {
    const distance = Math.max(0, time - now);
    const days = Math.floor(distance / 86400000);
    const hours = Math.floor((distance % 86400000) / 3600000);
    const minutes = Math.floor((distance % 3600000) / 60000);
    return days > 0
      ? `${days} ${t("world.unit.d")} · ${hours} ${t("world.unit.h")}`
      : hours > 0
        ? `${hours} ${t("world.unit.h")} · ${minutes} ${t("world.unit.min")}`
        : `${minutes} ${t("world.unit.min")}`;
  };
  return (
    <div className="aime-world-surface relative min-h-screen bg-background text-foreground selection:bg-foreground/20 pb-32">
      {/*
       * Phase 2 (17/09) : le menu du haut, la rangée permanente et les icônes
       * ont disparu — la navigation de l'espace privé vit dans le Panneau AIME
       * (l'orbe). L'écran ne garde que le contenu : héro, périodes, timeline.
       * La notification d'aperçu invité reste, c'est un état, pas une porte.
       */}
      {previewRole && (
        <div className="sticky top-0 z-40 border-b border-border bg-brand-accent/10 px-3 py-2 text-center text-[10px] uppercase tracking-[.14em] text-foreground/70 sm:px-6">
          {t("world.preview.notice")}{" "}
          <button type="button" onClick={() => setPreviewRole(null)} className="underline underline-offset-2 transition hover:text-foreground">{t("world.preview.exit")}</button>
        </div>
      )}
      {/* Hero immersif — toujours un grand visuel, éditable sur place. */}
      <header data-testid="world-hero" className="relative isolate flex min-h-[75vh] w-full flex-col justify-start overflow-hidden bg-[var(--agency-ink)] px-6 pb-24 pt-24 sm:pt-32 md:px-12 md:pt-40">
        {heroVisual.kind === "video" ? (
          <video
            src={heroSrc}
            autoPlay
            muted
            loop
            playsInline
            data-testid="world-hero-media"
            className="absolute inset-0 z-0 h-full w-full object-cover"
          />
        ) : (
          <img src={heroSrc} alt="" data-testid="world-hero-media" className="absolute inset-0 z-0 h-full w-full object-cover" />
        )}
        <div
          className="absolute inset-0 z-10"
          aria-hidden
          style={{ background: heroVisualOverlayCss(heroVisual) }}
        />
        <div className="aime-visual-copy relative z-20 mx-auto w-full max-w-5xl space-y-6 text-white">
          <motion.button
            type="button"
            onClick={() => setWorldMenuOpen(true)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs tracking-wide text-white backdrop-blur-md transition hover:bg-white hover:text-black"
            aria-label={t("world.hero.chooseWorld")}
          >
            {heroCopy.eyebrow}
            <ChevronDown className="h-3 w-3" />
          </motion.button>

          {/*
           * Les trois périodes, toujours visibles.
           *
           * 14/09 : le seul sélecteur de période vivait au bas de la barre
           * latérale de `BottomDock`, et `BottomDock` ne se rend que si une
           * fenêtre est déjà ouverte. Un Monde ouvert sans fenêtre n'offrait
           * donc AUCUN moyen d'aller vers le Jour J — l'orchestration était
           * invisible. Le sélecteur monte dans le hero.
           */}
          {!isPublicInfo && (
            <div data-testid="world-mode">
              {/* Le mode est NOMMÉ et expliqué là où on le choisit : les trois
                  pastilles restent l'unique sélecteur, mais on sait ce qu'on
                  choisit (17/09). */}
              <p data-testid="world-mode-label" className="text-xs uppercase tracking-[.14em] text-white/80">
                {t(`world.mode.${phase}` as never)}
              </p>
              <p data-testid="world-mode-role" className="mt-1 text-xs text-white/55">
                {t(`world.mode.${phase}.role` as never)}
              </p>
              <motion.div
                role="group"
                aria-label={t("world.phase.group")}
                data-testid="world-phase-switch"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mt-2 flex w-fit items-center gap-1 rounded-full border border-white/25 bg-white/10 p-1 backdrop-blur-md"
              >
                {getWorldPhases(locale).map(entry => {
                  const active = entry.id === phase;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      data-testid={`world-phase-${entry.id}`}
                      onClick={() => setPhase(entry.id)}
                      aria-current={active ? "true" : undefined}
                      title={entry.label}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-xs tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                        active ? "bg-white text-black" : "text-white/80 hover:bg-white/15 hover:text-white",
                      )}
                    >
                      {getWorldPhaseShortLabel(entry.id, locale)}
                    </button>
                  );
                })}
              </motion.div>
            </div>
          )}

          {/* Le visuel du hero se change là où on le voit : import, URL, ou
              vignette du Monde. Plus de détour par le panneau de l'orbe. */}
          {canEdit && (
            <motion.button
              type="button"
              onClick={() => setHeroEditorOpen(true)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid="world-hero-edit-visual"
              className="-mt-3 flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs tracking-wide text-white/85 backdrop-blur-md transition hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ImagePlus className="h-3 w-3" />
              {heroIsCustom
                ? t("world.hero.visual.change.mode", { phase: heroModeLabel })
                : t("world.hero.visual.choose.mode", { phase: heroModeLabel })}
            </motion.button>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-display font-semibold tracking-tight text-white"
          >
            {heroCopy.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn("min-h-12 max-w-2xl text-[15px] font-light leading-relaxed text-white/80 md:text-base", !heroCopy.description && "invisible")}
          >
            {heroCopy.description || t("world.hero.fallback")}
          </motion.p>

          {(isPublicInfo || phase !== "apres") && <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex min-h-12 flex-wrap content-start gap-2 text-[13px]"
          >
            <button
              type="button"
              onClick={() => setCalendarOpen(true)}
              className="flex items-center gap-2 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-ink)]/5 px-4 py-1.5 backdrop-blur-sm transition hover:border-[var(--agency-ink)]/30 hover:bg-[var(--agency-ink)]/10"
              aria-label={t("world.hero.calendar")}
            >
              <CalendarDays className="h-3.5 w-3.5 text-[var(--agency-eyebrow)]" />
              {format(pivotDate, 'd MMMM yyyy', { locale: dateLocale })}
            </button>
            {project.city.value && (
              <span className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-ink)]/5 px-4 py-1.5 backdrop-blur-sm">
                {[project.city.value, project.venue.value].filter(Boolean).join(" · ")}
              </span>
            )}
            {!project.city.value && project.venue.value && (
              <span className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-ink)]/5 px-4 py-1.5 backdrop-blur-sm">
                {project.venue.value}
              </span>
            )}
            {project.guestsCount.value && (
              <span className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-ink)]/5 px-4 py-1.5 backdrop-blur-sm">
                {t("world.hero.guests", { count: project.guestsCount.value })}
              </span>
            )}
          </motion.div>}

          {!isPublicInfo && phase !== "apres" && <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-2 pt-4"
          >
            <button
              type="button"
              onClick={() => setView("person")}
              className="group flex items-center gap-2 py-1 pr-2 text-xs text-[var(--agency-body)] transition hover:text-[var(--agency-ink)]"
               aria-label={t("world.hero.people.aria", { count: project.guests.length + project.providers.length })}
            >
              <span className="flex -space-x-4 py-1">
                {project.guests.slice(0, 5).map((guest, index) => <GuestPortrait key={guest.id} guest={guest} index={index} />)}
                {project.guests.length === 0 && <span className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[var(--agency-ink)] bg-[var(--agency-ink)]/10 text-[10px]">0</span>}
              </span>
               <span>{t("world.hero.people", { count: project.guests.length + project.providers.length })}</span>
            </button>
            {!previewRole && <button
              type="button"
              onClick={() => setTasksOpen(true)}
              className="ml-auto grid h-14 w-14 shrink-0 place-items-center rounded-full p-[3px] transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ background: `conic-gradient(from -90deg, hsl(var(--brand-accent)) 0deg ${completion * 3.6}deg, rgba(255,255,255,.14) ${completion * 3.6}deg 360deg)` }}
              aria-label={t("world.hero.tasks.aria", { percent: completion })}
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-[var(--agency-paper)]/90 text-[11px] font-medium tabular-nums text-[var(--agency-ink)]">{completion}%</span>
            </button>}
          </motion.div>}

          {(isPublicInfo || phase === "avant") && <motion.button
            type="button"
            onClick={() => setCountdownsOpen(true)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 block w-full border-t border-[var(--agency-hairline)] pt-7 text-left transition hover:border-[var(--agency-ink)]/25"
            aria-label={t("world.countdown.aria")}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[.24em] text-[var(--agency-eyebrow)]">{t("world.countdown.next", { kind: nextCountdown.kind })}</p>
              <p className="text-[10px] uppercase tracking-[.18em] text-[var(--agency-eyebrow)]/70">{t("world.countdown.seeAll", { count: countdownTargets.length || 1 })}</p>
            </div>
            <p className="mt-3 text-sm text-[var(--agency-body)]">{nextCountdown.title}</p>
            {distanceToNext > 0 ? (
              <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2 font-display font-light tabular-nums text-[var(--agency-ink)]">
                {[
                  [nextDays, t("world.unit.days")],
                  [nextHours, t("world.unit.hours")],
                  [nextMinutes, t("world.unit.minutes")],
                  [nextSeconds, t("world.unit.seconds")],
                ].map(([value, label]) => (
                  <span key={label} className="inline-flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl md:text-5xl">{String(value).padStart(2, "0")}</span>
                    <span className="text-[9px] uppercase tracking-[.16em] text-[var(--agency-eyebrow)]">{label}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 font-display text-4xl font-light">{t("world.countdown.arrived")}</p>
            )}
          </motion.button>}
          {!isPublicInfo && phase === "pendant" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 border-t border-[var(--agency-hairline)] pt-7">
              <p className="text-[10px] uppercase tracking-[.24em] text-[var(--agency-eyebrow)]">{liveEvent ? t("world.hero.live.now") : t("world.hero.live.next")}</p>
              {featuredDayEvent ? (
                <div className="mt-4 flex flex-wrap items-center gap-5">
                  <span className="font-display text-4xl font-light tabular-nums sm:text-5xl">{format(featuredDayEvent.time, "HH:mm")}</span>
                  <div><p className="text-base text-[var(--agency-ink)]/85">{featuredDayEvent.title}</p><p className="mt-1 text-xs text-[var(--agency-body)]">{featuredDayEvent.location || t("world.hero.live.placeLater")}</p></div>
                </div>
              ) : <p className="mt-4 text-sm text-[var(--agency-body)]">{t("world.hero.live.empty")}</p>}
            </motion.div>
          )}
          {!isPublicInfo && phase === "apres" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 grid max-w-2xl grid-cols-3 gap-6 border-t border-[var(--agency-hairline)] pt-7">
              <div><p className="font-display text-3xl font-light">{project.memories.length}</p><p className="mt-1 text-[9px] uppercase tracking-[.16em] text-[var(--agency-eyebrow)]">{t("world.hero.after.memories")}</p></div>
              <div><p className="font-display text-3xl font-light">{project.media.length}</p><p className="mt-1 text-[9px] uppercase tracking-[.16em] text-[var(--agency-eyebrow)]">{t("world.hero.after.media")}</p></div>
              <div><p className="font-display text-3xl font-light">{project.messages.length}</p><p className="mt-1 text-[9px] uppercase tracking-[.16em] text-[var(--agency-eyebrow)]">{t("world.hero.after.messages")}</p></div>
            </motion.div>
          )}
          {project.missing.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-3 flex max-w-xl items-start gap-3 text-xs text-[var(--agency-eyebrow)]">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" />
              <span><span className="text-[var(--agency-ink)]/75">{t("world.hero.suggestion")}</span>{" "}{t("world.hero.suggestion.body", {
                subject: project.missing.length > 1
                  ? t("world.hero.suggestion.more", { subject: project.missing[0], count: project.missing.length - 1 })
                  : project.missing[0] })}</span>
            </motion.div>
          )}
        </div>
      </header>

      {/* Accueil d'un Monde neuf : quatre dossiers, dans l'ordre, langage clair. */}
      {!isPublicInfo && gettingStartedRows && (
        <section data-testid="world-getting-started" className="border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-6 py-10">
          <div className="mx-auto max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--agency-eyebrow)]">{t("world.start.eyebrow")}</p>
            <h2 className="mt-3 text-2xl font-medium tracking-tight text-[var(--agency-ink)]">{t("world.start.title")}</h2>
            <p className="mt-2 text-sm text-[var(--agency-body)]">{t("world.start.lead")}</p>
            <ul className="mt-6 space-y-3">
              {gettingStartedRows.map(row => (
                <li key={row.panel}>
                  <button
                    type="button"
                    data-testid={`world-start-${row.panel}`}
                    onClick={() => openPanelSafely(row.panel)}
                    className="flex w-full items-baseline gap-4 rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-5 py-4 text-left transition hover:border-[var(--agency-ink)]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
                  >
                    <span className="shrink-0 text-sm font-medium text-[var(--agency-ink)]">{row.label}</span>
                    <span className="ml-auto max-w-[55%] text-right text-xs leading-relaxed text-[var(--agency-body)]">{row.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <main className="w-full">
        {view === "music" && (
          <section className="border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-6 py-16">
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_auto] md:items-end">
              <div className="max-w-2xl">
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[.24em] text-foreground/45"><Waves className="h-4 w-4" /> {t("world.music.eyebrow")}</p>
                <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">{t("world.music.title")}</h2>
                <p className="mt-5 text-sm font-light leading-relaxed text-foreground/60">{t("world.music.desc")}</p>
              </div>
              <button type="button" onClick={() => setActivePanel("music")} className="w-fit rounded-full border border-foreground/15 px-5 py-3 text-[10px] uppercase tracking-[.16em] text-foreground/75 transition hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {t("world.music.cta")}
              </button>
            </div>
          </section>
        )}
        {view === "person" && (
          <section className="overflow-hidden border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-6 py-20">
            <div className="mx-auto max-w-5xl">
              <div className="max-w-2xl">
                <p className="text-[10px] uppercase tracking-[.24em] text-foreground/40">{t("world.people.eyebrow")}</p>
                <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">{t("world.people.title")}</h2>
                <p className="mt-5 max-w-xl text-sm font-light leading-relaxed text-foreground/60">{t("world.people.desc")}</p>
              </div>
              {project.guests.length ? (
                <div className="mt-14 flex flex-wrap items-end gap-x-2 gap-y-8 sm:gap-x-4">
                  {project.guests.map((guest, index) => (
                    <div
                      key={guest.id}
                      className={cn("group flex flex-col items-center", index % 3 === 1 && "sm:translate-y-8")}
                      aria-label={guest.name}
                    >
                      <button type="button" onClick={() => setSpotlight({ kind: "guest", id: guest.id })} aria-label={guest.name} className="rounded-full transition duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent group-hover:-translate-y-2 group-hover:scale-105"><GuestPortrait guest={guest} index={index} large /></button>
                      <span className="mt-3 max-w-24 truncate text-[10px] text-foreground/70 transition group-hover:text-foreground">{guest.name}</span>
                      <span className="mt-1 text-[8px] uppercase tracking-[.14em] text-foreground/40">{guest.role}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-12 rounded-3xl border border-dashed border-foreground/20 px-8 py-12 text-center text-sm text-foreground/50">{t("world.people.empty")}</p>
              )}
            </div>
          </section>
        )}
        {/* La page publique du Monde en composition déclarative (pont
            AIME-COMPOSER, docs/pont-architecture-aime.md) : chaque bloc lit
            sa source en direct — changer le Monde change la page. */}
        {isPublicInfo && (
          <PublicPageView
            project={project}
            onToggleVisibility={
              canEdit
                ? (blockId, visibility) =>
                    updateProject({ publicPage: withBlockVisibility(publicPageOf(project), blockId, visibility) })
                : undefined
            }
          />
        )}
        {/* La lecture de la Timeline reste à la place où on la regarde :
            au-dessus du déroulé, plus dans une barre de navigation. */}
        <div className="flex justify-end border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-6 py-2.5 sm:px-10">
          <TimelinePlayback events={visibleEvents} />
        </div>
        <UniversalTimeline
          events={visibleEvents}
          capabilities={momentCapabilities}
          onMomentAction={handleMomentAction}
          phase={phase}
        />
      </main>

      {spotlight && <PersonSpotlight person={spotlight} onClose={() => setSpotlight(null)} />}
      {tasksOpen && (
        <CenteredBlock
          eyebrow={t("world.tasks.eyebrow")}
          title={t("world.tasks.title", { percent: completion })}
          description={t("world.tasks.desc", { done: project.tasks.filter(task => task.status === "termine").length, total: project.tasks.length })}
          onClose={() => setTasksOpen(false)}
          size="lg"
          leading={
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full p-[3px]"
              style={{ background: `conic-gradient(from -90deg, hsl(var(--brand-accent)) 0deg ${completion * 3.6}deg, rgba(255,255,255,.14) ${completion * 3.6}deg 360deg)` }}
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-card text-[11px] tabular-nums text-foreground">{completion}%</span>
            </span>
          }
        >
          {project.tasks.length ? (
            <div className="divide-y divide-border">
              {[...project.tasks]
                .sort((a, b) => Number(a.status === "termine") - Number(b.status === "termine") || (a.dueDate ?? Number.MAX_SAFE_INTEGER) - (b.dueDate ?? Number.MAX_SAFE_INTEGER))
                .map(task => (
                  <div key={task.id} className="flex items-start gap-4 py-4">
                    <span className={cn("mt-1 h-3 w-3 shrink-0 rounded-full border", task.status === "termine" ? "border-foreground bg-foreground" : task.status === "en_cours" ? "border-brand-accent bg-brand-accent/35" : "border-foreground/25")} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", task.status === "termine" ? "text-foreground/35 line-through" : "text-foreground/85")}>{task.title}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[.14em] text-foreground/40">
                        {task.priority === "haute" ? t("world.tasks.priority.high") : task.priority === "basse" ? t("world.tasks.priority.low") : t("world.tasks.priority.normal")}
                        {task.dueDate ? ` · ${format(task.dueDate, "d MMMM yyyy", { locale: dateLocale })}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-foreground/40">{t("world.tasks.empty")}</p>
          )}
        </CenteredBlock>
      )}
      {worldMenuOpen && (
        <CenteredBlock eyebrow={t("world.switcher.eyebrow")} title={t("world.switcher.title")} description={t("world.switcher.desc")} onClose={() => setWorldMenuOpen(false)} size="lg" testId="world-switcher-panel">
          <WorldSwitcher
            projects={projects}
            activeProjectId={project.id}
            onSelect={(projectId) => {
              if (projectId !== project.id) void selectProject(projectId);
              setWorldMenuOpen(false);
            }}
          />
          <p className="mt-6 text-xs font-light leading-relaxed text-foreground/40">{t("world.switcher.hint")}</p>
        </CenteredBlock>
      )}
      {heroEditorOpen && (
        <CenteredBlock
          eyebrow={t("world.hero.visual.eyebrow")}
          title={`${t("world.hero.visual.title")} · ${heroModeLabel}`}
          description={t("world.hero.visual.desc")}
          onClose={() => setHeroEditorOpen(false)}
          size="lg"
          testId="world-hero-visual-panel"
        >
          <VisualImportControl
            label={t("world.hero.visual.field")}
            value={resolveHeroVisual(project, phase)}
            onChange={visual => {
              /* Le réglage vaut pour LE MODE courant : les deux autres modes
                 gardent le visuel du Monde (repli doux, 17/09). */
              const { heroVisuals } = setHeroVisualFor(project, phase);
              updateProject({ heroVisuals: { ...heroVisuals, [phase]: visual } });
            }}
            choices={WORLD_VISUAL_CHOICES}
            choicesLabel={t("world.hero.visual.choices")}
          />
          <p className="mt-4 text-xs font-light leading-relaxed text-[var(--agency-body)]">{t("world.hero.visual.hint")}</p>
        </CenteredBlock>
      )}
      {calendarOpen && (
        <CenteredBlock eyebrow={t("world.calendar.eyebrow")} title={format(calendarMonth, "MMMM yyyy", { locale: dateLocale })} description={t("world.calendar.desc")} onClose={() => setCalendarOpen(false)} size="lg" leading={
          <span className="mt-4 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-foreground/[.12] bg-foreground/[.04]"><CalendarDays className="h-5 w-5 text-foreground/65" /></span>
        }>
          <div className="flex items-center justify-between border-y border-foreground/[.08] py-3">
            <button type="button" onClick={() => setCalendarMonth(month => subMonths(month, 1))} className="rounded-full p-2 text-foreground/45 transition hover:bg-foreground/[.08] hover:text-foreground" aria-label={t("world.calendar.prev")}><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => setCalendarMonth(new Date(project.pivot.value))} className="text-[10px] uppercase tracking-[.18em] text-foreground/45 transition hover:text-foreground">{t("world.calendar.backToPivot")}</button>
            <button type="button" onClick={() => setCalendarMonth(month => addMonths(month, 1))} className="rounded-full p-2 text-foreground/45 transition hover:bg-foreground/[.08] hover:text-foreground" aria-label={t("world.calendar.next")}><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1">
            {weekdayInitials.map((day, index) => <span key={`${day}-${index}`} className="pb-2 text-center text-[9px] uppercase tracking-[.14em] text-foreground/25">{day}</span>)}
            {calendarDays.map(day => {
              const momentCount = project.timeline.filter(event => isSameDay(event.time, day)).length;
              const isPivot = isSameDay(day, project.pivot.value);
              const isSelected = isSameDay(day, selectedDate);
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative aspect-square rounded-2xl text-sm transition",
                    !isSameMonth(day, calendarMonth) && "text-foreground/16",
                    isSameMonth(day, calendarMonth) && "text-foreground/58 hover:bg-foreground/[.06] hover:text-foreground",
                    isSelected && "bg-[var(--agency-ink)] text-[var(--agency-paper)] hover:bg-[var(--agency-ink)] hover:text-[var(--agency-paper)]",
                    isPivot && !isSelected && "ring-1 ring-inset ring-foreground/45"
                  )}
                >
                  {format(day, "d")}
                  {momentCount > 0 && <span className={cn("absolute bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full", isSelected ? "bg-background/55" : "bg-foreground/55")} />}
                </button>
              );
            })}
          </div>
          <div className="mt-6 grid gap-4 border-t border-foreground/[.08] pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="font-display text-2xl font-light capitalize">{format(selectedDate, "EEEE d MMMM yyyy", { locale: dateLocale })}</p>
              <p className="mt-2 text-xs font-light text-foreground/38">{selectedDayEvents.length ? t("world.calendar.dayMoments", { count: selectedDayEvents.length, titles: selectedDayEvents.map(event => event.title).join(" · ") }) : t("world.calendar.dayEmpty")}</p>
            </div>
            <button
              type="button"
              disabled={!canEdit || isSameDay(selectedDate, project.pivot.value)}
              onClick={() => {
                const current = new Date(project.pivot.value);
                const next = new Date(selectedDate);
                next.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
                updateProject({ pivot: { ...project.pivot, value: next.getTime() } });
                setCalendarOpen(false);
              }}
              className="rounded-full bg-[var(--agency-ink)] px-5 py-2.5 text-xs font-medium text-[var(--agency-paper)] disabled:cursor-default disabled:opacity-25"
            >
              {isSameDay(selectedDate, project.pivot.value) ? t("world.calendar.currentDate") : t("world.calendar.setPivot")}
            </button>
          </div>
        </CenteredBlock>
      )}
      {countdownsOpen && (
        <CenteredBlock eyebrow={t("world.countdown.eyebrow")} title={t("world.countdown.title")} description={t("world.countdown.desc")} onClose={() => setCountdownsOpen(false)} size="lg">
          {countdownTargets.length ? (
            <div className="divide-y divide-border">
              {countdownTargets.map((target, index) => (
                <article key={target.id} className="grid gap-3 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className={cn("grid h-9 w-9 place-items-center rounded-full text-xs tabular-nums", index === 0 ? "bg-foreground text-background" : "bg-foreground/5 text-foreground/50")}>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-sm text-foreground/90">{target.title}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-[.16em] text-foreground/50">{target.kind} · {format(target.time, "d MMMM yyyy · HH:mm", { locale: dateLocale })}</p>
                  </div>
                  <p className="font-display text-xl font-light tabular-nums text-foreground/70">{formatRemaining(target.time)}</p>
                </article>
              ))}
            </div>
          ) : <p className="py-10 text-center text-sm text-foreground/40">{t("world.countdown.empty")}</p>}
        </CenteredBlock>
      )}
      {overviewOpen && <WorldOverview onClose={() => setOverviewOpen(false)} onOpenPanel={openPanelSafely} />}
      {graphOpen && (
        <CenteredBlock eyebrow={t("world.graph.eyebrow")} title={t("world.graph.title")} description={t("world.graph.desc")} onClose={() => setGraphOpen(false)} size="xl">
          <VisibilityGraph onOpenPanel={panel => { setGraphOpen(false); openPanelSafely(panel); }} />
        </CenteredBlock>
      )}
      {entityNode && (
        <EntityEditor
          node={entityNode}
          onClose={() => setEntityNode(null)}
          project={project}
          updateProject={updateProject}
          updateEntity={updateEntity}
          openUserProfile={openUserProfile}
          currentRole={currentRole}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}

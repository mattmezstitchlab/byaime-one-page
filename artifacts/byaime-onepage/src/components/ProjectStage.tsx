import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useProject } from '@/store/project-store';
import { AIME_VISUALS, getAssetUrl } from '@/lib/assets';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { Link } from 'wouter';
import { UniversalTimeline } from './UniversalTimeline';
import { TimelinePlayback } from './TimelinePlayback';
import { BottomDock } from './BottomDock';
import { PhaseTimeCapsule } from './PhaseTimeCapsule';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Grid2X2, Search, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';
import { filterTimeline, type TimelineView } from '@/lib/timeline-graph';
import { consumeWorldFocus, type WorldFocusRequest } from '@/lib/world-focus';
import { TimelineAudit } from './TimelineAudit';
import { CenteredBlock } from './CenteredBlock';
import { PanelChromeProvider, type PanelChrome, type PanelNavItem } from './PanelChrome';
import { AIME_SCREENS, setAimeScreenContext, type AimeScreenId } from '@/lib/aime-guidance';
import { WorldOverview } from './WorldOverview';
import { VisibilityGraph } from './VisibilityGraph';
import { WorldSearch } from './WorldSearch';
import { WorldSwitcher } from './WorldSwitcher';
import type { Guest, Provider } from '@/lib/types';
import {
  isWeddingDestinationActive,
  FACILE_VIEW_IDS,
  getWeddingCapabilities,
  getWeddingNavigation,
  getWeddingPanelLabel,
  getWeddingRailItems,
  isWeddingPanelAvailable,
  findPhaseForPanel,
  getPanelContextGroup,
  getInitialWorldPhase,
  type WorldPhase,
  type WeddingRole,
  type WeddingDestination,
  type WeddingNavigationItem,
  type WeddingPanelId,
} from '@/lib/wedding-navigation';
import { setWorldNavState } from '@/lib/world-nav-state';
import { useI18n } from '@/lib/i18n';
import { useMode } from '@/lib/mode';
import { heroVisualOverlayCss } from '@/lib/types';
import type { UniversalCreateActionId } from '@/lib/universal/create-actions';

const CREATE_PANEL_TARGETS: Partial<Record<UniversalCreateActionId, WeddingPanelId>> = {
  person: "guests",
  task: "planning",
  "document-media": "documents",
};
/*
 * Créer un Moment n'ouvre pas un panneau : c'est un jalon de la Timeline. On
 * revient à la vue chronologique et on demande l'ajout d'un jalon (la Timeline
 * écoute l'événement et ouvre le tiroir d'édition, dans la bonne phase).
 */
const MOMENT_CREATE_ACTION: UniversalCreateActionId = "moment";

const providerImages: Partial<Record<Provider['category'], string>> = {
  ...AIME_VISUALS.providersByCategory,
};

const guestPortraitImages = [...AIME_VISUALS.guestPortraitImages];

function ProviderPortrait({ provider, index = 0 }: { provider: Provider; index?: number }) {
  const image = providerImages[provider.category] || AIME_VISUALS.universes.service;
  return (
    <span
      className="relative block h-9 w-9 overflow-hidden rounded-full border-2 border-black bg-zinc-800"
      style={{ zIndex: 10 - index }}
      title={provider.name || provider.role}
    >
      <img src={getAssetUrl(image)} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

function GuestPortrait({ guest, index = 0, large = false }: { guest: Guest; index?: number; large?: boolean }) {
  const image = guestPortraitImages[index % guestPortraitImages.length];
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full border-[3px] border-black bg-zinc-900 shadow-xl",
        large ? "h-20 w-20 sm:h-24 sm:w-24" : "h-14 w-14"
      )}
      style={{ zIndex: 20 - index }}
      title={guest.name}
    >
      <img
        src={getAssetUrl(image)}
        alt={`Portrait de ${guest.name}`}
        className="h-full w-full scale-125 object-cover transition duration-500 hover:scale-[1.35]"
        style={{ objectPosition: `${30 + (index % 3) * 20}% center` }}
      />
    </span>
  );
}

export function ProjectStage() {
  const { project, projects, selectProject, updateProject, canEdit, currentRole } = useProject();
  const { t, locale } = useI18n();
  const { mode } = useMode();
  /* Les dates suivent la langue : `date-fns` pour les libellés, `Intl` pour les listes. */
  const dateLocale = locale === 'en' ? enUS : fr;
  const pivotDate = project?.pivot.value ?? Date.now();
  const [phase, setPhase] = useState<WorldPhase>(() => getInitialWorldPhase(pivotDate));
  const [view, setView] = useState<TimelineView>("chronological");
  const [tasksOpen, setTasksOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [worldMenuOpen, setWorldMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<WeddingPanelId | null>(null);
  const [countdownsOpen, setCountdownsOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
    () => getWeddingNavigation(phase, getWeddingCapabilities(previewRole ?? currentRole), locale, mode),
    [phase, currentRole, previewRole, locale, mode],
  );
  const rail = useMemo(
    () => getWeddingRailItems(phase, getWeddingCapabilities(previewRole ?? currentRole), locale, mode),
    [phase, currentRole, previewRole, locale, mode],
  );

  useEffect(() => {
    if (!activePanel) return;
    if (!isWeddingPanelAvailable(activePanel, navigation, view, rail)) setActivePanel(null);
  }, [activePanel, navigation, view, rail]);

  /* Bascule vers le Facile depuis une vue Pro (musique, carte…) : retour au fil chronologique. */
  useEffect(() => {
    if (mode === "facile" && !FACILE_VIEW_IDS.includes(view)) setView("chronological");
  }, [mode, view]);

  /*
   * Ouverture de panneau « sûre » : si le panneau demandé n'existe pas dans la
   * phase courante (ex. « Souvenirs » en Avant), on bascule d'abord vers la
   * phase qui le porte, au lieu de le voir se refermer aussitôt.
   */
  const openPanelSafely = (panel: WeddingPanelId) => {
    if (panel === "sections") {
      setActivePanel("sections");
      return;
    }
    const role = previewRole ?? currentRole;
    const effectiveView: TimelineView = panel === "music" ? "music" : view;
    if (panel === "music") setView("music");
    if (isWeddingPanelAvailable(panel, navigation, effectiveView, rail)) {
      setActivePanel(panel);
      return;
    }
    const targetPhase = findPhaseForPanel(panel, role, effectiveView, mode);
    if (targetPhase) {
      setPhase(targetPhase);
      if (view === "public-info" && targetPhase === "avant") setView("chronological");
    }
    setActivePanel(panel);
  };
  const openPanelSafelyRef = useRef(openPanelSafely);
  openPanelSafelyRef.current = openPanelSafely;

  /* La barre latérale globale éclaire la catégorie du Monde active. */
  useEffect(() => {
    setWorldNavState({ active: true, phase, view, panel: activePanel, role: previewRole ?? currentRole });
    return () => setWorldNavState({ active: false });
  }, [phase, view, activePanel, previewRole, currentRole]);

  useEffect(() => {
    const openCreateTarget = (action: UniversalCreateActionId | undefined) => {
      if (!action) return;
      if (action === MOMENT_CREATE_ACTION) {
        // Un Moment se crée dans la Timeline, pas dans un panneau.
        setActivePanel(null);
        setView("chronological");
        window.dispatchEvent(new Event("aime:new-moment"));
        return;
      }
      const panel = CREATE_PANEL_TARGETS[action];
      if (panel) openPanelSafelyRef.current(panel);
    };
    const listener = (event: Event) => openCreateTarget((event as CustomEvent<UniversalCreateActionId>).detail);
    const closeWorldPanel = () => setActivePanel(null);
    window.addEventListener("aime:open-create-target", listener);
    window.addEventListener("aime:close-world-panel", closeWorldPanel);
    const requestedAction = new URLSearchParams(window.location.search).get("create") as UniversalCreateActionId | null;
    if (requestedAction && (requestedAction === MOMENT_CREATE_ACTION || CREATE_PANEL_TARGETS[requestedAction])) {
      openCreateTarget(requestedAction);
      window.history.replaceState(null, "", window.location.pathname);
    }
    return () => {
      window.removeEventListener("aime:open-create-target", listener);
      window.removeEventListener("aime:close-world-panel", closeWorldPanel);
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
          setActivePanel(request.panel as WeddingPanelId);
        } else {
          // Pas de phase demandée : ouvrir la phase qui porte réellement ce panneau.
          openPanelSafelyRef.current(request.panel as WeddingPanelId);
        }
      } else if (request.view) {
        /* Une destination de vue (Timeline, Musique) referme le panneau ouvert. */
        setActivePanel(null);
      }
      if (request.graph) setGraphOpen(true);
      if (request.overview) setOverviewOpen(true);
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
      description: t("world.hero.avant.desc"),
    },
    pendant: {
      eyebrow: liveEvent ? t("world.hero.pendant.eyebrow.live") : t("world.hero.pendant.eyebrow"),
      title: project.title,
      description: featuredDayEvent
        ? `${liveEvent ? t("world.hero.now") : t("world.hero.upcoming")}${featuredDayEvent.location ? ` · ${featuredDayEvent.location}` : ""}${featuredDayEvent.responsible ? ` · ${featuredDayEvent.responsible}` : ""}`
        : t("world.hero.pendant.empty"),
    },
    apres: {
      eyebrow: t("world.hero.apres.eyebrow"),
      title: project.title,
      description: memoryCount
        ? t("world.hero.apres.desc", { count: memoryCount })
        : t("world.hero.apres.empty"),
    },
  }[phase];
  const heroCopy = isPublicInfo
    ? {
        eyebrow: t("world.hero.publicInfo.eyebrow"),
        title: project.title,
        description: project.subtitle && !subtitleIsRedundant
          ? project.subtitle
          : t("world.hero.publicInfo.desc"),
      }
    : phaseHeroCopy;
  /* Les initiales de la semaine viennent de la locale : « L M M J V S D » en
     français, « M T W T F S S » en anglais, toujours à partir du lundi. */
  const weekdayInitials = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  }).map(day => format(day, "EEEEE", { locale: dateLocale }).toLocaleUpperCase(locale));
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 }),
  });
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
  const openWeddingDestination = (destination: WeddingDestination) => {
    if (destination.kind === "panel") {
      setActivePanel(destination.panel);
      return;
    }
    if (destination.kind === "view") {
      setActivePanel(null);
      setView(destination.view);
    }
  };
  const sectionsAreActive = activePanel === "sections"
    || (activePanel !== null && !["documents", "budget", "music"].includes(activePanel))
    || view === "public-info";

  /*
   * Navigation en tête des panneaux : quand un panneau est ouvert, on ne montre
   * que les panneaux de SA catégorie (socle commun du rail, ou outils du mode),
   * pour une navigation cohérente entre voisins. Sans panneau, on montre tout.
   * Le sommaire « sections » porte déjà toute la navigation dans son corps.
   */
  const contextGroup = activePanel
    ? getPanelContextGroup(activePanel, rail, navigation, view, locale)
    : null;
  const navigationSource: WeddingNavigationItem[] = activePanel === "sections"
    ? []
    : contextGroup && activePanel
      ? contextGroup.items
      : [...rail, ...navigation.primary];
  const panelNavigation: PanelNavItem[] = navigationSource.map(item => {
    const destination = item.destination;
    if (destination.kind === "route") return { id: item.id, label: item.label, href: destination.href };
    if (destination.kind === "view") {
      return {
        id: item.id,
        label: item.label,
        active: isWeddingDestinationActive(destination, view, activePanel),
        onClick: () => { setActivePanel(null); setView(destination.view); },
      };
    }
    return {
      id: item.id,
      label: item.label,
      active: isWeddingDestinationActive(destination, view, activePanel),
      onClick: () => setActivePanel(destination.panel),
    };
  });
  if (activePanel && activePanel !== "sections") {
    panelNavigation.push({
      id: "sections",
      label: t("world.nav.allSections"),
      active: false,
      onClick: () => setActivePanel("sections"),
    });
  } else if (!activePanel) {
    panelNavigation.push({
      id: "sections",
      label: t("world.nav.sections"),
      active: sectionsAreActive,
      onClick: () => setActivePanel("sections"),
    });
  }
  const panelChrome: PanelChrome = {
    breadcrumb: [
      { label: "AIME", href: "/" },
      { label: t("private.nav.world"), href: "/user-portal" },
      ...(project?.title ? [{ label: project.title }] : []),
    ],
    navigation: panelNavigation,
  };

  return (
    <PanelChromeProvider chrome={panelChrome}>
    <div className="aime-world-surface relative min-h-screen bg-background text-foreground selection:bg-foreground/20 pb-32">
      <nav aria-label={t("world.nav.main")} className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="flex justify-center px-3 pt-2.5">
          <PhaseTimeCapsule
            phase={phase}
            onPhaseChange={nextPhase => {
              setPhase(nextPhase);
              if (view === "public-info") setView("chronological");
            }}
          />
        </div>
        <div className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto px-3 py-2.5 hide-scrollbar sm:px-6">
          {navigation.primary.map(item => item.destination.kind === "route" ? (
            <Link
              key={item.id}
              href={item.destination.href}
              title={item.description}
              className="shrink-0 whitespace-nowrap rounded-full border border-foreground/10 px-4 py-2 text-[9px] uppercase tracking-[.13em] text-foreground/65 transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ) : (
            <button
              key={item.id}
              type="button"
              onClick={() => openWeddingDestination(item.destination)}
              aria-current={isWeddingDestinationActive(item.destination, view, activePanel) ? "page" : undefined}
              aria-label={t("world.nav.item.aria", { label: item.label, description: item.description })}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[9px] uppercase tracking-[.13em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isWeddingDestinationActive(item.destination, view, activePanel)
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/10 text-foreground/65 hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px shrink-0 bg-border" />
          <button type="button" onClick={() => setActivePanel("sections")} aria-current={sectionsAreActive ? "page" : undefined} className={cn("flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-[9px] uppercase tracking-[.13em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", sectionsAreActive ? "border-foreground bg-foreground text-background" : "border-foreground/10 text-foreground/65 hover:border-foreground/30 hover:text-foreground")}>
            <Grid2X2 className="h-3.5 w-3.5" /> {t("world.nav.sections")}
          </button>
          {mode === "pro" && (<>
          <button type="button" onClick={() => setOverviewOpen(true)} className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-foreground/10 px-4 py-2 text-[9px] uppercase tracking-[.13em] text-foreground/65 transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t("world.nav.overview")}
          </button>
          <button type="button" onClick={() => setGraphOpen(true)} className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-foreground/10 px-4 py-2 text-[9px] uppercase tracking-[.13em] text-foreground/65 transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t("world.nav.graph")}
          </button>
          <button type="button" onClick={() => setSearchOpen(true)} className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-foreground/10 px-4 py-2 text-[9px] uppercase tracking-[.13em] text-foreground/65 transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Search className="h-3.5 w-3.5" /> {t("world.nav.search")}
          </button>
          <button type="button" onClick={() => setPreviewRole(role => role ? null : "viewer")} aria-pressed={previewRole === "viewer"} className={cn("flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-[9px] uppercase tracking-[.13em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", previewRole === "viewer" ? "border-foreground bg-foreground text-background" : "border-foreground/10 text-foreground/65 hover:border-foreground/30 hover:text-foreground")}>
            {previewRole === "viewer" ? t("world.nav.preview.active") : t("world.nav.preview")}
          </button>
          </>)}
          <TimelinePlayback events={visibleEvents} />
        </div>
        {previewRole && (
          <div className="border-t border-border bg-brand-accent/10 px-3 py-2 text-center text-[10px] uppercase tracking-[.14em] text-foreground/70 sm:px-6">
            {t("world.preview.notice")}{" "}
            <button type="button" onClick={() => setPreviewRole(null)} className="underline underline-offset-2 transition hover:text-foreground">{t("world.preview.exit")}</button>
          </div>
        )}
      </nav>
      {/* Cinematic Header */}
      <header className="relative isolate flex min-h-[75vh] w-full flex-col justify-start overflow-hidden px-6 pb-24 pt-32 sm:pt-40 md:px-12">
        {project.heroVisual?.kind === "video" ? (
          <video
            data-preserve-color
            key={project.heroVisual.url}
            className="absolute inset-0 z-0 h-full w-full object-cover"
            src={project.heroVisual.url}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div
            data-preserve-color
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${project.heroVisual?.url || getAssetUrl(AIME_VISUALS.world.heroImage)})` }}
          />
        )}
        {project.heroVisual ? (
          <div className="absolute inset-0 z-10" style={{ background: heroVisualOverlayCss(project.heroVisual) }} aria-hidden />
        ) : (
          <div className="aime-world-hero-overlay absolute inset-0 z-10" aria-hidden />
        )}
        <div className="aime-visual-copy relative z-20 mx-auto w-full max-w-5xl space-y-6">
          <motion.button
            type="button"
            onClick={() => setWorldMenuOpen(true)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] backdrop-blur-md transition hover:bg-white hover:text-black"
            aria-label={t("world.hero.chooseWorld")}
          >
            {heroCopy.eyebrow}
            <ChevronDown className="h-3 w-3" />
          </motion.button>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-display font-medium tracking-tight"
          >
            {heroCopy.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn("min-h-12 max-w-2xl text-[15px] font-light leading-relaxed text-white/70 md:text-base", !heroCopy.description && "invisible")}
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
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/10"
              aria-label={t("world.hero.calendar")}
            >
              <CalendarDays className="h-3.5 w-3.5 text-white/55" />
              {format(pivotDate, 'd MMMM yyyy', { locale: dateLocale })}
            </button>
            {project.city.value && (
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
                {[project.city.value, project.venue.value].filter(Boolean).join(" · ")}
              </span>
            )}
            {!project.city.value && project.venue.value && (
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
                {project.venue.value}
              </span>
            )}
            {project.guestsCount.value && (
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
                {t("world.hero.guests", { count: project.guestsCount.value })}
              </span>
            )}
          </motion.div>}

          {mode === "facile" && <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 w-full border-t border-white/10 pt-7"
          >
            <p className="text-[10px] uppercase tracking-[.24em] text-white/42">{t("world.hero.nextStep.eyebrow")} · {nextCountdown.kind}</p>
            <p className="mt-3 text-sm text-white/65">{nextCountdown.title}</p>
            <p className="mt-2 font-display text-2xl font-light tabular-nums">
              {distanceToNext > 0
                ? `${format(nextCountdown.time, "EEEE d MMMM", { locale: dateLocale })} · ${formatRemaining(nextCountdown.time)}`
                : t("world.countdown.arrived")}
            </p>
            <button
              type="button"
              onClick={() => openPanelSafely(phase === "pendant" ? "dayof" : phase === "apres" ? "memories" : "planning")}
              className="mt-5 rounded-full bg-white px-6 py-3 text-xs font-semibold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {phase === "pendant" ? t("world.hero.nextStep.dayof") : phase === "apres" ? t("world.hero.nextStep.memories") : t("world.hero.nextStep.tasks")}
            </button>
          </motion.div>}

          {mode === "pro" && !isPublicInfo && phase !== "apres" && <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-2 pt-4"
          >
            <button
              type="button"
              onClick={() => setView("person")}
              className="group flex items-center gap-2 py-1 pr-2 text-xs text-white/80 transition hover:text-white"
               aria-label={t("world.hero.people.aria", { count: project.guests.length + project.providers.length })}
            >
              <span className="flex -space-x-4 py-1">
                {project.guests.slice(0, 5).map((guest, index) => <GuestPortrait key={guest.id} guest={guest} index={index} />)}
                {project.guests.length === 0 && <span className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-black bg-white/10 text-[10px]">0</span>}
              </span>
               <span>{t("world.hero.people", { count: project.guests.length + project.providers.length })}</span>
            </button>
            {!previewRole && <button
              type="button"
              onClick={() => setTasksOpen(true)}
              className="ml-auto grid h-14 w-14 shrink-0 place-items-center rounded-full p-[3px] transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ background: `conic-gradient(from -90deg, #ff375f 0deg, #ff9f0a ${completion * 1.2}deg, #ffe620 ${completion * 2.1}deg, #30d158 ${completion * 2.8}deg, #64d2ff ${completion * 3.25}deg, #bf5af2 ${completion * 3.6}deg, rgba(255,255,255,.14) ${completion * 3.6}deg 360deg)` }}
              aria-label={t("world.hero.tasks.aria", { percent: completion })}
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-black/90 text-[11px] font-medium tabular-nums text-white">{completion}%</span>
            </button>}
          </motion.div>}

          {mode === "pro" && (isPublicInfo || phase === "avant") && <motion.button
            type="button"
            onClick={() => setCountdownsOpen(true)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 block w-full border-t border-white/10 pt-7 text-left transition hover:border-white/25"
            aria-label={t("world.countdown.aria")}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[.24em] text-white/42">{t("world.countdown.next", { kind: nextCountdown.kind })}</p>
              <p className="text-[10px] uppercase tracking-[.18em] text-white/28">{t("world.countdown.seeAll", { count: countdownTargets.length || 1 })}</p>
            </div>
            <p className="mt-3 text-sm text-white/65">{nextCountdown.title}</p>
            {distanceToNext > 0 ? (
              <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2 font-display font-light tabular-nums text-white">
                {[
                  [nextDays, t("world.unit.days")],
                  [nextHours, t("world.unit.hours")],
                  [nextMinutes, t("world.unit.minutes")],
                  [nextSeconds, t("world.unit.seconds")],
                ].map(([value, label]) => (
                  <span key={label} className="inline-flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl md:text-5xl">{String(value).padStart(2, "0")}</span>
                    <span className="text-[9px] uppercase tracking-[.16em] text-white/38">{label}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 font-display text-4xl font-light">{t("world.countdown.arrived")}</p>
            )}
          </motion.button>}
          {mode === "pro" && !isPublicInfo && phase === "pendant" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 border-t border-white/10 pt-7">
              <p className="text-[10px] uppercase tracking-[.24em] text-white/42">{liveEvent ? t("world.hero.live.now") : t("world.hero.live.next")}</p>
              {featuredDayEvent ? (
                <div className="mt-4 flex flex-wrap items-center gap-5">
                  <span className="font-display text-4xl font-light tabular-nums sm:text-5xl">{format(featuredDayEvent.time, "HH:mm")}</span>
                  <div><p className="text-base text-white/85">{featuredDayEvent.title}</p><p className="mt-1 text-xs text-white/40">{featuredDayEvent.location || t("world.hero.live.placeLater")}</p></div>
                </div>
              ) : <p className="mt-4 text-sm text-white/45">{t("world.hero.live.empty")}</p>}
            </motion.div>
          )}
          {mode === "pro" && !isPublicInfo && phase === "apres" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-7">
              <div><p className="font-display text-3xl font-light">{project.memories.length}</p><p className="mt-1 text-[9px] uppercase tracking-[.16em] text-white/35">{t("world.hero.after.memories")}</p></div>
              <div><p className="font-display text-3xl font-light">{project.media.length}</p><p className="mt-1 text-[9px] uppercase tracking-[.16em] text-white/35">{t("world.hero.after.media")}</p></div>
              <div><p className="font-display text-3xl font-light">{project.messages.length}</p><p className="mt-1 text-[9px] uppercase tracking-[.16em] text-white/35">{t("world.hero.after.messages")}</p></div>
            </motion.div>
          )}
          {project.missing.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-3 flex max-w-xl items-start gap-3 text-xs text-white/55">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
              <span><span className="text-white/75">{t("world.hero.suggestion")}</span>{" "}{t("world.hero.suggestion.body", {
                subject: project.missing.length > 1
                  ? t("world.hero.suggestion.more", { subject: project.missing[0], count: project.missing.length - 1 })
                  : project.missing[0],
              })}</span>
            </motion.div>
          )}
        </div>
      </header>



      {/* Main Content Area */}
      <main className="w-full">
        {view === "music" && (
          <section className="border-b border-border bg-card px-6 py-16">
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_auto] md:items-end">
              <div className="max-w-2xl">
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[.24em] text-foreground/45"><Waves className="h-4 w-4" /> {t("world.music.eyebrow")}</p>
                <h2 className="mt-4 font-display text-4xl font-light tracking-tight text-foreground sm:text-6xl">{t("world.music.title")}</h2>
                <p className="mt-5 text-sm font-light leading-relaxed text-foreground/60">{t("world.music.desc")}</p>
              </div>
              <button type="button" onClick={() => setActivePanel("music")} className="w-fit rounded-full border border-foreground/15 px-5 py-3 text-[10px] uppercase tracking-[.16em] text-foreground/75 transition hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {t("world.music.cta")}
              </button>
            </div>
          </section>
        )}
        {view === "person" && (
          <section className="overflow-hidden border-b border-border bg-card px-6 py-20">
            <div className="mx-auto max-w-5xl">
              <div className="max-w-2xl">
                <p className="text-[10px] uppercase tracking-[.24em] text-foreground/40">{t("world.people.eyebrow")}</p>
                <h2 className="mt-4 font-display text-4xl font-light tracking-tight text-foreground sm:text-6xl">{t("world.people.title")}</h2>
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
                      <span className="transition duration-300 group-hover:-translate-y-2 group-hover:scale-105"><GuestPortrait guest={guest} index={index} large /></span>
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
        {view !== "map" && <UniversalTimeline events={visibleEvents} />}
        {mode === "pro" && (
          <div className="max-w-5xl mx-auto px-6 pt-12 pb-32">
            <TimelineAudit />
          </div>
        )}
      </main>

      <BottomDock phase={phase} view={view} activePanel={activePanel} navigation={navigation} rail={rail} onPanelChange={setActivePanel} onViewChange={nextView => {
        setActivePanel(null);
        setView(nextView);
      }} onPhaseChange={nextPhase => {
        setPhase(nextPhase);
        if (view === "public-info") setView("chronological");
      }} />
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
              style={{ background: `conic-gradient(from -90deg, #ff375f 0deg, #ff9f0a ${completion * 1.2}deg, #ffe620 ${completion * 2.1}deg, #30d158 ${completion * 2.8}deg, #64d2ff ${completion * 3.25}deg, #bf5af2 ${completion * 3.6}deg, rgba(255,255,255,.14) ${completion * 3.6}deg 360deg)` }}
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
                    <span className={cn("mt-1 h-3 w-3 shrink-0 rounded-full border", task.status === "termine" ? "border-foreground bg-foreground" : task.status === "en_cours" ? "border-amber-500 bg-amber-500/35" : "border-foreground/25")} />
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
                    isSelected && "bg-white text-black hover:bg-white hover:text-black",
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
              className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black disabled:cursor-default disabled:opacity-25"
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
      {searchOpen && (
        <CenteredBlock eyebrow={t("world.search.eyebrow")} title={t("world.search.title")} description={t("world.search.desc")} onClose={() => setSearchOpen(false)} size="lg">
          <WorldSearch onClose={() => setSearchOpen(false)} onOpenPanel={panel => { setSearchOpen(false); openPanelSafely(panel); }} />
        </CenteredBlock>
      )}
    </div>
    </PanelChromeProvider>
  );
}

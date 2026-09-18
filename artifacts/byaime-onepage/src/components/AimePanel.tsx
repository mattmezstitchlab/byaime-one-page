import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DocumentShare } from "./DocumentShare";
import { MondePanel } from "./panels/MondePanel";
import { AssistantChat } from "./AssistantChat";
import { PortalContent, type PortalContentMode } from "./PortalContent";
import { AimeOrb } from "./AimeOrb";
import {
  getAimePanelItems,
  getAimePanelMenu,
  aimePanelItemIdForPanel,
  type AimePanelItem,
} from "@/lib/panel-navigation";
import {
  buildTimelineIndex,
  ENTITY_KIND_LABELS,
} from "@/lib/timeline-graph";
import {
  getWeddingPanelLabels,
  getWorldPhaseShortLabel,
  getWorldPhases,
  normalizePanelId,
  PANEL_FOR_KIND,
  type WeddingPanelId,
  type WorldPhase,
} from "@/lib/wedding-navigation";
import { focusWorldDestination, getWorldNavState, subscribeWorldNav, type WorldNavState } from "@/lib/world-nav-state";
import { focusWorld } from "@/lib/world-focus";
import {
  AIME_PANEL_FOLLOW_EVENT,
  AIME_SHOW_PANEL_EVENT,
  takePendingAimePanelShow,
  type AimePanelFollowRequest,
  type AimePanelShowRequest,
} from "@/lib/aime-panel-events";
import { useI18n } from "@/lib/i18n";
import { useProject } from "@/store/project-store";
import { EYEBROW, TITLE, LEAD, PILL_SMALL } from "@/lib/site-design";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { trackEvent } from "@/lib/analytics";

/*
 * Le Panneau AIME — la seule porte d'entrée de l'espace privé (17/09).
 *
 * L'orbe « + » (bouton unique, en bas au centre) ouvre CE panneau : une
 * colonne de gauche — Le Monde (le programme + les sept dossiers), les
 * outils, l'aide — et une zone de contenu qui réutilise les modules
 * existants du Monde. Il remplace à la fois l'ancienne CommandBar (panneau
 * d'orbe) et la fenêtre BottomDock : plus de menu, plus de rangée, plus de
 * second panneau — une seule colonne, une seule fenêtre.
 *
 * Le panneau est « bête » : tout l'état du Monde (phase, vue, panneau,
 * rôle) vit dans `world-nav-state` et les événements `aime:focus-world` /
 * `aime:show-panel`. Ouvrir un dossier depuis la colonne passe par le même
 * chemin que le reste du Monde (ouverture sûre, bascule de phase), il n'y a
 * pas de seconde logique de navigation.
 */

const CLOSE_PANEL_EVENT = "aime:close-world-panel";

export function AimePanel() {
  const { t, locale, setLocale } = useI18n();
  const { project, currentRole, canEdit, updateProject } = useProject();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [presented, setPresented] = useState<{ panel: WeddingPanelId; momentId: string | null } | null>(null);
  const [filter, setFilter] = useState("");
  const [worldNav, setWorldNav] = useState<WorldNavState>(() => getWorldNavState());
  /* Chaque demande d'invitation (dossier Invités, actions de l'assistant)
     incrémente : le contenu « Réglages du Monde » plonge dans l'invitation. */
  const [inviteSignal, setInviteSignal] = useState(0);
  /* Ce que la bascule de mode vient de faire : dit dans la zone de contenu,
     jamais en silence (17/09). */
  const [modeNotice, setModeNotice] = useState<{ phase: WorldPhase; label?: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeWorldNav(setWorldNav), []);

  const close = (reason: "user" | "external" = "user") => {
    setOpen(false);
    setPresented(null);
    setFilter("");
    if (reason === "user") window.dispatchEvent(new Event(CLOSE_PANEL_EVENT));
  };

  /* Ouverture : l'orbe (ou Cmd/Ctrl + K), la demande de panneau du Monde
     (`aime:show-panel`), et la fermeture programmatique (`aime:close-world-panel`). */
  useEffect(() => {
    const applyShow = (request: AimePanelShowRequest) => {
      if (!request?.panel) return;
      setOpen(true);
      setPresented({ panel: request.panel, momentId: request.momentId ?? null });
      setSelectedId(aimePanelItemIdForPanel(request.panel));
    };
    /* L'orbe, ou un deep-link (/assistant, /dossiers) qui pointe la section,
       ou une demande de recherche (actions de l'assistant) : le curseur va
       directement dans la case, en tête de colonne. */
    const openAI = (event: Event) => {
      const detail = (event as CustomEvent<{ item?: string; section?: string; search?: boolean }>).detail;
      setOpen(true);
      /* Le + est d'abord la porte vers l'agent. La colonne reste disponible
         pour les dossiers, mais l'ouverture ne demande plus un second clic. */
      setSelectedId(detail?.item ?? "ask");
      setPresented(null);
      if (detail?.search) requestAnimationFrame(() => searchInputRef.current?.focus());
    };
    const showPanel = (event: Event) => applyShow((event as CustomEvent<AimePanelShowRequest>).detail);
    /* Le mode a changé et le contenu n'existe plus ici : la fenêtre RESTE
       ouverte, le contenu se vide, et la raison est écrite. */
    const followMode = (event: Event) => {
      const detail = (event as CustomEvent<AimePanelFollowRequest>).detail;
      setPresented(null);
      setModeNotice({
        phase: detail?.phase ?? "avant",
        label: detail?.panel ? getWeddingPanelLabels(locale)[detail.panel] : undefined,
      });
    };
    const closePanel = () => close("external");
    /* Les actions de l'assistant pointent vers des contenus du panneau :
       le panneau s'ouvre sur la section demandée (ex. « Ouvrir les réglages
       du Monde », « Inviter en choisissant un rôle »). */
    const openSettings = () => {
      setOpen(true);
      setPresented(null);
      setSelectedId("world-settings");
    };
    const openInvite = () => {
      setOpen(true);
      setPresented(null);
      setSelectedId("world-settings");
      setInviteSignal(signal => signal + 1);
    };
    /* Le contenu « Créer » choisit un geste : le Monde l'exécute dans le
       cockpit — le panneau se referme pour laisser la place. */
    const createTarget = () => close("user");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(value => !value);
      }
    };
    window.addEventListener("aime:open-ai", openAI);
    window.addEventListener(AIME_SHOW_PANEL_EVENT, showPanel);
    window.addEventListener(AIME_PANEL_FOLLOW_EVENT, followMode);
    window.addEventListener(CLOSE_PANEL_EVENT, closePanel);
    window.addEventListener("aime:open-world-settings", openSettings);
    window.addEventListener("aime:open-collaboration-invite", openInvite);
    window.addEventListener("aime:open-create-target", createTarget);
    document.addEventListener("keydown", onKey);
    /* Premier chargement : une demande en file (le Monde a demandé un
       panneau avant ce montage) est reprise ici. */
    const pending = takePendingAimePanelShow();
    if (pending) applyShow(pending);
    return () => {
      window.removeEventListener("aime:open-ai", openAI);
      window.removeEventListener(AIME_SHOW_PANEL_EVENT, showPanel);
      window.removeEventListener(AIME_PANEL_FOLLOW_EVENT, followMode);
      window.removeEventListener(CLOSE_PANEL_EVENT, closePanel);
      window.removeEventListener("aime:open-world-settings", openSettings);
      window.removeEventListener("aime:open-collaboration-invite", openInvite);
      window.removeEventListener("aime:open-create-target", createTarget);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close("user");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Le rôle effectif : l'aperçu invité publie « viewer » dans world-nav-state. */
  const effectiveRole = (worldNav.active && worldNav.role) || currentRole;
  const currentPhase = worldNav.active ? worldNav.phase : "avant";
  const menu = useMemo(
    () => getAimePanelMenu({ role: effectiveRole, locale, project, canEdit, phase: currentPhase }),
    [effectiveRole, locale, project, canEdit, currentPhase],
  );
  const items = useMemo(() => getAimePanelItems(menu), [menu]);

  const normalize = (value: string) =>
    value.toLocaleLowerCase(locale).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const visibleItems = filter
    ? items.filter(item => normalize(item.label).includes(normalize(filter)))
    : items;
  const itemsBySection = (sectionId: string) => visibleItems.filter(item => item.section === sectionId);

  const selectedItem = selectedId ? items.find(item => item.id === selectedId) ?? null : null;

  /* Une entrée « contenu » : son action s'affiche DANS la zone de contenu
     (question, document, création, mon espace, réglages, ouverture). Les
     autres actions exécutent et referment. */
  const isContentAction = (item: AimePanelItem | null | undefined): boolean =>
    !!item && item.destination.kind === "action" &&
    (item.destination.action === "ask" ||
      item.destination.action === "share-doc" ||
      item.destination.action === "create" ||
      item.destination.action === "me" ||
      item.destination.action === "world-settings" ||
      item.destination.action === "hero-editor");

  /*
   * La recherche unifiée (17/09, phase 2) : la même case sert à TROIS gestes —
   * trouver (personnes, Moments), demander (AIME), aller (la colonne elle-même).
   * Mêmes relations que l'ancienne loupe : l'index de la Timeline.
   */
  const query = filter.trim().toLocaleLowerCase("fr");
  const timelineIndex = useMemo(() => (project ? buildTimelineIndex(project) : null), [project]);
  const searchEvents = useMemo(() => {
    if (!timelineIndex || !query) return [];
    return [...timelineIndex.events.values()]
      .filter(event => `${event.title} ${event.detail ?? ""}`.toLocaleLowerCase("fr").includes(query))
      .sort((a, b) => a.time - b.time)
      .slice(0, 15);
  }, [timelineIndex, query]);
  const searchEntities = useMemo(() => {
    if (!timelineIndex || !query) return [];
    return [...timelineIndex.entities.values()]
      .filter(entity => entity.label.toLocaleLowerCase("fr").includes(query))
      .slice(0, 40);
  }, [timelineIndex, query]);

  const selectItem = (item: AimePanelItem) => {
    setSelectedId(item.id);
    /* Une entrée d'un autre mode : on l'annonce, la bascule se fait en le
       disant — elle n'est plus un voyage silencieux. */
    if (item.phase && item.phase !== currentPhase) {
      setModeNotice({ phase: item.phase, label: item.label });
    } else {
      setModeNotice(null);
    }
    const destination = item.destination;
    if (destination.kind === "panel") {
      if (item.id.startsWith("folder:")) trackEvent("folder_open", { folder: item.id.slice("folder:".length), from: "orb" });
      /* MÊME chemin que le reste du Monde : ouverture sûre (phase incluse),
         puis le Monde rejoue `aime:show-panel` vers ce panneau. */
      focusWorldDestination(destination);
      return;
    }
    if (destination.kind === "view") {
      focusWorldDestination(destination);
      close("user");
      return;
    }
    if (destination.kind === "route") {
      setLocation(destination.href);
      close("user");
      return;
    }
    switch (destination.action) {
      case "share-doc":
      case "create":
      case "me":
      case "world-settings":
      case "hero-editor":
        /* Contenu du panneau : on reste ouvert, la zone de contenu change
           (et un dossier présenté avant cède la place). */
        setPresented(null);
        return;
      case "guest-preview":
        window.dispatchEvent(new Event("aime:toggle-guest-preview"));
        close("user");
        break;
      case "overview":
        focusWorld({ overview: true });
        close("user");
        break;
      case "visibility":
        focusWorld({ graph: true });
        close("user");
        break;
    }
  };

  const isItemActive = (item: AimePanelItem): boolean => {
    if (item.id === selectedId && (isContentAction(item) || presented !== null)) return true;
    if (!worldNav.active) return false;
    if (item.destination.kind === "panel") {
      return worldNav.panel !== null && normalizePanelId(item.destination.panel) === normalizePanelId(worldNav.panel);
    }
    if (item.destination.kind === "view") {
      if (item.destination.view === "chronological") return worldNav.panel === null && worldNav.view === "chronological";
      return worldNav.view === item.destination.view;
    }
    return false;
  };

  const dateLocale = locale === "en" ? enUS : fr;

  /* La zone de contenu porte, outre les panneaux du Monde (ci-dessus), les
     six « contenus » du menu : question, document, création, mon espace,
     réglages du Monde, ouverture. Chacun est un composable du panneau. */
  const renderPanelContent = (item: AimePanelItem) => {
    if (item.destination.kind !== "action") return null;
    const action = item.destination.action;
    switch (action) {
      case "ask":
        return (
          <div className="mx-auto max-w-4xl" data-testid="aime-panel-ask">
            <div data-testid="aime-panel-intro">
              <AssistantChat
                onApplyProject={project && canEdit ? (updates) => updateProject(updates) : undefined}
              />
            </div>
          </div>
        );
      case "share-doc":
        return (
          <div className="mx-auto max-w-4xl" data-testid="aime-panel-share-doc">
            <DocumentShare />
          </div>
        );
      case "create":
      case "me":
      case "world-settings":
      case "hero-editor":
        return (
          <div className="mx-auto max-w-4xl" data-testid={`aime-panel-${action}`}>
            <PortalContent
              key={action}
              mode={action as PortalContentMode}
              onMode={mode => setSelectedId(mode)}
              inviteSignal={action === "world-settings" ? inviteSignal : 0}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const moment = presented?.momentId ? project?.timeline.find(entry => entry.id === presented.momentId) : undefined;
  const completion = project?.tasks.length
    ? Math.round((project.tasks.filter(task => task.status === "termine").length / project.tasks.length) * 100)
    : 0;

  const contentTitle = presented
    ? (items.find(item => item.id === aimePanelItemIdForPanel(presented.panel))?.label ?? getWeddingPanelLabels(locale)[presented.panel])
    : selectedItem
      ? selectedItem.label
      : t("aime.panel.title");
  const contentEyebrow = presented || selectedItem
    ? menu.sections.find(section => section.items.some(item => item.id === (presented
        ? items.find(entry => entry.id === aimePanelItemIdForPanel(presented.panel))?.id
        : selectedItem!.id)))?.title
    : undefined;

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        data-testid="aime-panel-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center bg-[var(--agency-ink)]/40 px-3 py-5 backdrop-blur-[12px] sm:px-6 sm:py-8"
        onClick={() => close("user")}
      >
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-label={t("aime.panel.title")}
          data-testid="aime-panel"
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          onClick={event => event.stopPropagation()}
          className="flex h-[min(860px,calc(100dvh-2rem))] w-full max-w-6xl flex-col overflow-hidden rounded-[22px] border border-[var(--agency-hairline)] bg-[var(--agency-paper)] text-[var(--agency-ink)] shadow-[0_32px_80px_-16px_rgba(23,20,16,0.32),0_0_0_1px_rgba(23,20,16,0.04)_inset] sm:h-[min(860px,calc(100dvh-3rem))]"
        >
          {/* Barre de titre : on sait où on est, on sait comment sortir. */}
          <div className="flex h-[46px] shrink-0 items-center gap-2.5 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-5">
            <AimeOrb size={24} label="+" />
            <p className="min-w-0 truncate text-sm font-medium">{contentTitle}</p>
            {contentEyebrow && <span className="hidden shrink-0 text-xs text-[var(--agency-eyebrow)] sm:inline">{contentEyebrow}</span>}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
                data-testid="aime-panel-locale"
                className="rounded-full border border-[var(--agency-hairline)] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[var(--agency-body)] transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
                aria-label={locale === "fr" ? "Switch to English" : "Passer en français"}
              >
                {locale === "fr" ? "EN" : "FR"}
              </button>
              <button
                type="button"
                onClick={() => close("user")}
                aria-label={t("panel.close")}
                data-testid="aime-panel-close"
                className="grid h-8 w-8 place-items-center rounded-full border border-[var(--agency-hairline)] text-[var(--agency-eyebrow)] transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
            {/* Colonne de gauche — la seule navigation de l'espace privé. */}
            <aside className="flex shrink-0 flex-col gap-6 overflow-y-auto border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-4 py-6 md:w-[232px] md:border-b-0 md:border-r">
              {/* Recherche : filtre la colonne (la recherche unifiée arrive avec). */}
              <div>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={filter}
                  onChange={event => setFilter(event.target.value)}
                  placeholder={t("aime.panel.search")}
                  data-testid="aime-panel-search"
                  className="w-full rounded-[10px] border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition focus:border-[var(--agency-ink)]/40"
                />
                {filter && visibleItems.length === 0 && searchEvents.length === 0 && searchEntities.length === 0 && (
                  <p className="mt-2 px-2 text-[11px] text-[var(--agency-body)]">{t("aime.panel.search.empty")}</p>
                )}
              </div>

              {/* Résultats unifiés : demander, trouver, puis aller (ci-dessous). */}
              {query && (
                <div data-testid="aime-panel-search-results">
                  <button
                    type="button"
                    data-testid="aime-panel-search-ask"
                    onClick={() => setSelectedId("ask")}
                    className="flex w-full items-center gap-2.5 rounded-[10px] border border-[var(--agency-ink)]/25 bg-[var(--agency-ink)]/[0.04] px-3 py-2.5 text-left text-[13px] font-medium transition hover:bg-[var(--agency-ink)]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
                  >
                    <span className="min-w-0 flex-1 truncate">{t("aime.panel.askResult")} · « {filter.trim()} »</span>
                  </button>

                  {searchEvents.length > 0 && (
                    <div data-testid="aime-panel-search-moments">
                      <p className={cn(EYEBROW, "px-2")}>Moments</p>
                      <div className="mt-2 flex flex-col gap-1">
                        {searchEvents.map(event => (
                          <button
                            key={event.id}
                            type="button"
                            data-testid={`aime-panel-search-moment-${event.id}`}
                            onClick={() => {
                              const momentId = event.id;
                              close("user");
                              focusWorld({ route: "/user-portal", momentId });
                            }}
                            className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] text-[var(--agency-body)] transition hover:bg-[var(--agency-ink)]/[0.04] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
                          >
                            <span className="min-w-0 flex-1 truncate">{event.title}</span>
                            <span className="shrink-0 text-[10px] text-[var(--agency-eyebrow)]">{getWorldPhaseShortLabel(event.phase, locale)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchEntities.length > 0 && (
                    <div data-testid="aime-panel-search-elements">
                      <p className={cn(EYEBROW, "px-2")}>{t("aime.panel.elements")}</p>
                      <div className="mt-2 flex flex-col gap-1">
                        {searchEntities.map(entity => {
                          const panel = PANEL_FOR_KIND[entity.kind];
                          return (
                            <button
                              key={`${entity.kind}:${entity.id}`}
                              type="button"
                              data-testid={`aime-panel-search-entity-${entity.kind}-${entity.id}`}
                              disabled={!panel}
                              onClick={() => {
                                if (panel) focusWorldDestination({ kind: "panel", panel });
                              }}
                              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] text-[var(--agency-body)] transition hover:bg-[var(--agency-ink)]/[0.04] hover:text-[var(--agency-ink)] disabled:cursor-default disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
                            >
                              <span className="min-w-0 flex-1 truncate">{entity.label}</span>
                              <span className="shrink-0 text-[10px] text-[var(--agency-eyebrow)]">{ENTITY_KIND_LABELS[entity.kind]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Les périodes, en miroir du héro. */}
              {worldNav.active && (
                <div data-testid="aime-panel-phases">
                  <p className={cn(EYEBROW, "px-2")}>{t("world.phase.group")}</p>
                  {/* Ce que le mode courant SERT, en tête de colonne : la même
                      clarification que dans le héro (17/09). */}
                  <p
                    data-testid="aime-panel-mode-label"
                    className="mt-1.5 px-2 text-[12px] font-medium text-[var(--agency-ink)]"
                  >
                    {t(`world.mode.${currentPhase}` as never)}
                  </p>
                  <p
                    data-testid="aime-panel-mode-role"
                    className="mt-1 px-2 text-[11px] leading-relaxed text-[var(--agency-body)]"
                  >
                    {t(`world.mode.${currentPhase}.role` as never)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {getWorldPhases(locale).map(entry => (
                      <button
                        key={entry.id}
                        type="button"
                        data-testid={`aime-panel-phase-${entry.id}`}
                        onClick={() => focusWorld({ phase: entry.id })}
                        aria-pressed={worldNav.phase === entry.id}
                        className={cn(
                          PILL_SMALL,
                          "h-7 px-3 text-[10px]",
                          worldNav.phase === entry.id
                            ? "bg-[var(--agency-ink)] text-[var(--agency-paper)]"
                            : "border border-[var(--agency-hairline)] text-[var(--agency-body)] hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)]",
                        )}
                      >
                        {getWorldPhaseShortLabel(entry.id, locale)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {menu.sections.map(section => {
                const sectionItems = itemsBySection(section.id);
                if (filter && sectionItems.length === 0) return null;
                return (
                  <div key={section.id} data-section={section.id}>
                    <p className={cn(EYEBROW, "px-2")}>{section.title}</p>
                    {section.id === "modes" && (
                      <p
                        data-testid="aime-panel-modes-hint"
                        className="mt-1.5 px-2 text-[11px] leading-relaxed text-[var(--agency-body)]"
                      >
                        {t("aime.panel.otherModes.hint")}
                      </p>
                    )}
                    <div className="mt-2 flex flex-col gap-1">
                      {sectionItems.map(item => {
                        const active = isItemActive(item);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            data-testid={`aime-panel-item-${item.id}`}
                            data-section={section.id}
                            onClick={() => selectItem(item)}
                            aria-current={active ? "page" : undefined}
                            title={item.description}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30",
                              active
                                ? "bg-[var(--agency-ink)] text-[var(--agency-paper)]"
                                : "text-[var(--agency-body)] hover:bg-[var(--agency-ink)]/[0.04] hover:text-[var(--agency-ink)]",
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.phase && item.phase !== currentPhase && (
                              <span
                                data-testid={`aime-panel-mode-${item.id}`}
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] tracking-wide",
                                  active
                                    ? "bg-[var(--agency-paper)]/20 text-[var(--agency-paper)]"
                                    : "border border-[var(--agency-hairline)] text-[var(--agency-eyebrow)]",
                                )}
                              >
                                {getWorldPhaseShortLabel(item.phase, locale)}
                              </span>
                            )}
                            {typeof item.count === "number" && (
                              <span
                                data-testid={`aime-panel-count-${item.id}`}
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] tabular-nums",
                                  active ? "bg-[var(--agency-paper)]/20 text-[var(--agency-paper)]" : "bg-[var(--agency-ink)]/[0.06] text-[var(--agency-body)]",
                                )}
                              >
                                {item.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Statistiques rapides, comme sur la fenêtre de l'écran démo. */}
              {project && (
                <div className="mt-auto rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
                  <p className={EYEBROW}>{t("aime.panel.progress")}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span
                      className="grid h-12 w-12 place-items-center rounded-full p-[2px]"
                      style={{
                        background: `conic-gradient(from -90deg, var(--agency-ink) 0deg ${completion * 3.6}deg, var(--agency-hairline) ${completion * 3.6}deg 360deg)`,
                      }}
                    >
                      <span className="grid h-full w-full place-items-center rounded-full bg-[var(--agency-paper)] text-[11px] font-medium tabular-nums">{completion}%</span>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{project.title}</p>
                      <p className="text-[11px] text-[var(--agency-body)]">{t("world.hero.guests", { count: project.guests.length })}</p>
                    </div>
                  </div>
                </div>
              )}
            </aside>

            {/* Zone de contenu : les modules existants du Monde, inchangés. */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {modeNotice && (
                <p
                  data-testid="aime-panel-mode-notice"
                  className="shrink-0 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-7 py-3 text-[12.5px] leading-relaxed text-[var(--agency-body)] sm:px-10"
                >
                  {modeNotice.label
                    ? t("aime.panel.modeNotice", {
                        phase: getWorldPhaseShortLabel(modeNotice.phase, locale),
                        label: modeNotice.label,
                      })
                    : t("aime.panel.modeLeft", {
                        phase: getWorldPhaseShortLabel(modeNotice.phase, locale),
                        label: t("world.item.timeline"),
                      })}
                </p>
              )}
              {presented ? (
                <>
                  <div className="shrink-0 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-7 py-7 sm:px-10 sm:py-8">
                    <p className={EYEBROW}>{contentEyebrow ?? t("aime.panel.monde")}</p>
                    <h2 className={cn(TITLE, "mt-3 text-3xl sm:text-4xl")}>{contentTitle}</h2>
                    {(() => {
                      const described = items.find(entry => entry.id === aimePanelItemIdForPanel(presented.panel));
                      return described?.description ? (
                        <p className={cn(LEAD, "mt-3 max-w-2xl text-[15px] leading-relaxed")}>{described.description}</p>
                      ) : null;
                    })()}
                    {moment && (
                      <div className="mt-4 flex flex-wrap items-center gap-2" data-testid="monde-panel-moment">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--agency-ink)]/25 bg-[var(--agency-ink)]/[0.05] px-3 py-1.5 text-[11px] text-[var(--agency-ink)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--agency-ink)]" />
                          {t("moment.from")} · {moment.title}
                        </span>
                        <button
                          type="button"
                          data-testid="monde-panel-back-moment"
                          onClick={() => {
                            const momentId = presented.momentId;
                            close("user");
                            if (momentId) focusWorld({ momentId });
                          }}
                          className="rounded-full border border-[var(--agency-hairline)] px-3 py-1.5 text-[11px] text-[var(--agency-body)] transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
                        >
                          {t("moment.back")}
                        </button>
                      </div>
                    )}
                    {project && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-1.5 text-[var(--agency-body)]">
                          {format(project.pivot.value, "d MMMM yyyy", { locale: dateLocale })}
                        </span>
                        {project.city.value && (
                          <span className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-1.5 text-[var(--agency-body)]">
                            {project.city.value}
                            {project.venue.value ? ` · ${project.venue.value}` : ""}
                          </span>
                        )}
                        <span className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-1.5 text-[var(--agency-body)]">
                          {t("world.hero.guests", { count: project.guests.length })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto bg-[#fcfbfa] px-7 py-8 sm:px-10 sm:py-10">
                    <div className="mx-auto max-w-4xl" data-testid="monde-panel" data-panel={presented.panel}>
                      <MondePanel panel={presented.panel} momentId={presented.momentId} />
                    </div>
                  </div>
                </>
              ) : isContentAction(selectedItem) ? (
                <>
                  <div className="shrink-0 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-7 py-7 sm:px-10 sm:py-8">
                    <p className={EYEBROW}>{menu.sections.find(section => section.id === selectedItem!.section)?.title}</p>
                    <h2 className={cn(TITLE, "mt-3 text-3xl sm:text-4xl")}>{selectedItem!.label}</h2>
                    {selectedItem!.description && (
                      <p className={cn(LEAD, "mt-3 max-w-2xl text-[15px] leading-relaxed")}>{selectedItem!.description}</p>
                    )}
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto bg-[#fcfbfa] px-7 py-8 sm:px-10 sm:py-10">
                    {renderPanelContent(selectedItem!)}
                  </div>
                </>
              ) : (
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[#fcfbfa] px-7 py-10 sm:px-10" data-testid="aime-panel-intro">
                  <div className="max-w-md text-center">
                    <AimeOrb size={56} label="+" className="mx-auto" />
                    <p className={cn(EYEBROW, "mt-5")}>{t("aime.panel.eyebrow")}</p>
                    <h2 className={cn(TITLE, "mt-2 text-3xl")}>{t("aime.panel.title")}</h2>
                    <p className={cn(LEAD, "mt-3 text-[15px] leading-relaxed")}>
                      {project ? t("aime.panel.intro") : t("aime.panel.intro.empty")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

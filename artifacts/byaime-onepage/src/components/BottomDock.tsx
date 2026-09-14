import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { MondePanel } from "./panels/MondePanel";
import type { TimelineView } from "@/lib/timeline-graph";
import {
  getPanelContextGroup,
  getWeddingPanelLabel,
  normalizePanelId,
  type WorldPhase,
  type WeddingNavigation,
  type WeddingPanelId,
  type WeddingRailItem } from "@/lib/wedding-navigation";
import { useI18n } from "@/lib/i18n";
import { useProject } from "@/store/project-store";
import { EYEBROW, TITLE, LEAD, PILL_SMALL } from "@/lib/site-design";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

/*
 * Fenêtre produit unifiée — le dessin de l'écran démo (design/index.html)
 * appliqué à tous les panneaux. Chaque panneau s'ouvre dans la même fenêtre :
 * - barre à pastilles (rouge/jaune/vert) comme sur l'écran démo,
 * - sidebar fixe à gauche (232px) avec le socle commun + les outils de phase,
 * - zone principale avec en-tête (eyebrow, titre, description) et contenu,
 * - même palette : var(--agency-paper), hairline, ink, body.
 *
 * Le portail Couple / Wedding reste en amont (PortalOnboarding) : ce qui change,
 * c'est que tous les panneaux parlent désormais le même langage visuel que la
 * démo, ce qui tient la route.
 */
export function BottomDock({
  phase,
  view,
  activePanel,
  navigation,
  rail = [],
  onPanelChange,
  onPhaseChange,
  onViewChange }: {
  phase: WorldPhase;
  view: TimelineView;
  activePanel: WeddingPanelId | null;
  navigation: WeddingNavigation;
  rail?: WeddingRailItem[];
  onPhaseChange: (phase: WorldPhase) => void;
  onPanelChange: (panel: WeddingPanelId | null) => void;
  /** Retourner à une vue (Timeline, Musique) ferme la fenêtre. */
  onViewChange?: (view: TimelineView) => void;
}) {
  const { t, locale } = useI18n();
  const { project } = useProject();
  const contextGroup = activePanel ? getPanelContextGroup(activePanel, rail, navigation, view, locale) : null;

  const dateLocale = locale === "en" ? enUS : fr;

  useEffect(() => {
    if (!activePanel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onPanelChange(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activePanel, onPanelChange]);

  if (!activePanel) return null;


  const railPanels = rail.filter(i => i.destination.kind === "panel");
  const railViews = rail.filter(i => i.destination.kind === "view");
  const phasePanels = [...navigation.primary, ...navigation.secondary].filter(i => i.destination.kind === "panel");

  const title = getWeddingPanelLabel(activePanel, locale);
  const eyebrow = contextGroup?.label ?? t("world.group.navigation");
  const description = contextGroup?.items.find(i => i.destination.kind === "panel" && i.destination.panel === activePanel)?.description;

  const completion = project?.tasks.length ? Math.round((project.tasks.filter(t => t.status === "termine").length / project.tasks.length) * 100) : 0;

  const content = (
    <motion.div
      data-testid="monde-panel"
      data-panel={activePanel}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[var(--agency-ink)]/40 px-3 py-5 backdrop-blur-[12px] sm:px-6 sm:py-8"
      onClick={() => onPanelChange(null)}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        className="flex h-[min(860px,calc(100dvh-2rem))] w-full max-w-6xl flex-col overflow-hidden rounded-[22px] border border-[var(--agency-hairline)] bg-[var(--agency-paper)] text-[var(--agency-ink)] shadow-[0_32px_80px_-16px_rgba(23,20,16,0.32),0_0_0_1px_rgba(23,20,16,0.04)_inset] sm:h-[min(860px,calc(100dvh-3rem))]"
      >
        {/* Barre fenêtre démo */}
        <div className="flex h-[46px] shrink-0 items-center gap-2.5 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-5">
          <span className="flex items-center gap-1.5">
            <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
          </span>
          <span className="ml-3 text-[12px] font-medium tracking-[.02em] text-[var(--agency-eyebrow)]">AIME — Le Monde</span>
          <span className="ml-auto hidden items-center gap-2 text-[11px] text-[var(--agency-eyebrow)] sm:flex">
            <span className="h-1 w-1 rounded-full bg-[var(--agency-hairline)]" />
            {eyebrow}
          </span>
          <button
            onClick={() => onPanelChange(null)}
            aria-label={t("panel.close")}
            className="ml-3 grid h-8 w-8 place-items-center rounded-full border border-[var(--agency-hairline)] text-[var(--agency-eyebrow)] transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          {/* Sidebar — 232px comme sur design/index.html */}
          <aside className="flex shrink-0 flex-col gap-6 overflow-y-auto border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-4 py-6 md:w-[232px] md:border-b-0 md:border-r">
            {railViews.length > 0 && onViewChange && (
              <div>
                <p className={cn(EYEBROW, "px-2")}>Vues</p>
                <div className="mt-3 flex flex-col gap-1">
                  {railViews.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`world-menu-view-${item.id}`}
                      onClick={() => {
                        if (item.destination.kind === "view") onViewChange(item.destination.view);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--agency-body)] transition hover:bg-[var(--agency-ink)]/[0.04] hover:text-[var(--agency-ink)]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--agency-hairline)]" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className={cn(EYEBROW, "px-2")}>Le Monde</p>
              <div className="mt-3 flex flex-col gap-1">
                {railPanels.map(item => {
                  /* Comparaison normalisée : `guests` surligne l'onglet Pilotage du menu. */
                      const isActive = item.destination.kind === "panel" && normalizePanelId(item.destination.panel) === normalizePanelId(activePanel);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.destination.kind === "panel") onPanelChange(item.destination.panel);
                      }}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium transition",
                        isActive ? "bg-[var(--agency-ink)]/[0.06] text-[var(--agency-ink)]" : "text-[var(--agency-body)] hover:bg-[var(--agency-ink)]/[0.04] hover:text-[var(--agency-ink)]",
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-[var(--agency-ink)]" : "bg-[var(--agency-hairline)]")} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {phasePanels.length > 0 && (
              <div>
                <p className={cn(EYEBROW, "px-2")}>{phase === "avant" ? "Avant" : phase === "pendant" ? "Jour J" : "Après"}</p>
                <div className="mt-3 flex flex-col gap-1">
                  {phasePanels.map(item => {
                    /* Comparaison normalisée : `guests` surligne l'onglet Pilotage du menu. */
                      const isActive = item.destination.kind === "panel" && normalizePanelId(item.destination.panel) === normalizePanelId(activePanel);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (item.destination.kind === "panel") onPanelChange(item.destination.panel);
                        }}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium transition",
                          isActive ? "bg-[var(--agency-ink)] text-[var(--agency-paper)]" : "text-[var(--agency-body)] hover:bg-[var(--agency-ink)]/[0.04] hover:text-[var(--agency-ink)]",
                        )}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats rapides — comme sur design/index.html */}
            {project && (
              <div className="mt-auto rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
                <p className={EYEBROW}>Avancement</p>
                <div className="mt-3 flex items-center gap-3">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-full p-[2px]"
                    style={{
                      background: `conic-gradient(from -90deg, var(--agency-ink) 0deg ${completion * 3.6}deg, var(--agency-hairline) ${completion * 3.6}deg 360deg)` }}
                  >
                    <span className="grid h-full w-full place-items-center rounded-full bg-[var(--agency-paper)] text-[11px] font-medium tabular-nums">{completion}%</span>
                  </span>
                  <div>
                    <p className="text-[13px] font-medium">{project.title}</p>
                    <p className="text-[11px] text-[var(--agency-body)]">
                      {project.guests.length} invités · {project.providers.length} prestataires
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  {(["avant", "pendant", "apres"] as WorldPhase[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onPhaseChange(p)}
                      aria-pressed={phase === p}
                      className={cn(
                        PILL_SMALL,
                        "h-7 px-3 text-[10px]",
                        phase === p ? "bg-[var(--agency-ink)] text-[var(--agency-paper)]" : "border border-[var(--agency-hairline)] text-[var(--agency-body)] hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)]",
                      )}
                    >
                      {p === "avant" ? "Avant" : p === "pendant" ? "Jour J" : "Après"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Main */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-7 py-7 sm:px-10 sm:py-8">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <p className={EYEBROW}>{eyebrow}</p>
                  <h2 className={cn(TITLE, "mt-3 text-3xl sm:text-4xl")}>{title}</h2>
                  {description && <p className={cn(LEAD, "mt-3 max-w-2xl text-[15px] leading-relaxed")}>{description}</p>}
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
                        {project.guests.length} invités
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#fcfbfa] px-7 py-8 sm:px-10 sm:py-10">
              <div className="mx-auto max-w-4xl">
                {/* Une seule fenêtre, un seul contenu : le menu de gauche en
                    est la liste d'onglets. */}
                <MondePanel panel={activePanel} />
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );

  return createPortal(<AnimatePresence>{content}</AnimatePresence>, document.body);
}

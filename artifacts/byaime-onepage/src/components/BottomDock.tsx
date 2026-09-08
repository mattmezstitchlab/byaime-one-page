import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, FileText, Grid2X2, Link2, MapPin, PackageOpen, Play, Plus, Users } from "lucide-react";
import { Link } from "wouter";
import { useProject } from "@/store/project-store";
import { PlanningPanel } from "./panels/PlanningPanel";
import { GuestPanel } from "./panels/GuestPanel";
import { ProviderPanel } from "./panels/ProviderPanel";
import { DayOfPanel } from "./panels/DayOfPanel";
import { WeddingModulesPanel } from "./panels/WeddingModulesPanel";
import { CenteredBlock } from "./CenteredBlock";
import { UNIVERSAL_CREATE_ACTIONS, type UniversalCreateActionId } from "@/lib/universal/create-actions";
import type { TimelineView } from "@/lib/timeline-graph";
import {
  getWeddingNavigationLabel,
  isWeddingDestinationActive,
  WEDDING_MODULE_IDS,
  WEDDING_PANEL_LABELS,
  WEDDING_SECONDARY_NAVIGATION,
  type WeddingDestination,
  type WeddingModule,
  type WeddingPanelId,
} from "@/lib/wedding-navigation";

type WorldPhase = "tout" | "avant" | "pendant" | "apres";

export function BottomDock({
  phase,
  view,
  activePanel,
  onPhaseChange,
  onViewChange,
  onPanelChange,
  onPlay,
}: {
  phase: WorldPhase;
  view: TimelineView;
  activePanel: WeddingPanelId | null;
  onPhaseChange: (phase: WorldPhase) => void;
  onViewChange: (view: TimelineView) => void;
  onPanelChange: (panel: WeddingPanelId | null) => void;
  onPlay: () => void;
}) {
  const { project } = useProject();
  const [quickOpen, setQuickOpen] = useState(false);
  if (!project) return null;
  const icons = {
    person: Users,
    place: MapPin,
    moment: CalendarDays,
    task: ClipboardList,
    "document-media": FileText,
    resource: PackageOpen,
    relation: Link2,
  } satisfies Record<UniversalCreateActionId, typeof Users>;
  const panelTargets: Partial<Record<UniversalCreateActionId, WeddingPanelId>> = {
    person: "guests",
    moment: "dayof",
    task: "planning",
    "document-media": "documents",
  };
  const isSecondary = activePanel !== null && activePanel !== "sections";
  const isModule = activePanel !== null && WEDDING_MODULE_IDS.some(module => module === activePanel);
  const openPanel = (id: WeddingPanelId) => {
    onPanelChange(id);
    setQuickOpen(false);
  };
  const openCreateAction = (id: UniversalCreateActionId) => {
    const target = panelTargets[id];
    if (target) openPanel(target);
  };
  const openDestination = (destination: WeddingDestination) => {
    if (destination.kind === "panel") openPanel(destination.panel);
    if (destination.kind === "view") {
      onPanelChange(null);
      onViewChange(destination.view);
    }
  };
  const previousPhase: WorldPhase | null = phase === "tout" ? "avant" : phase === "avant" ? null : phase === "pendant" ? "avant" : "pendant";
  const nextPhase: WorldPhase | null = phase === "tout" ? "apres" : phase === "avant" ? "pendant" : phase === "pendant" ? "apres" : null;
  const phaseLabel: Record<WorldPhase, string> = { tout: "Tout", avant: "Avant", pendant: "Le Jour J", apres: "Après" };
  const playLabel = view === "music" ? "Lire la Timeline musicale" : phase === "pendant" || view === "day-of" ? "Lancer la régie" : "Lire la Timeline";

  const currentLabel = getWeddingNavigationLabel(view, activePanel);

  return <><AnimatePresence>{activePanel && <CenteredBlock eyebrow={isSecondary ? "Toutes les sections" : "Navigation du Monde"} title={WEDDING_PANEL_LABELS[activePanel]} size="xl" onClose={() => onPanelChange(null)} leading={isSecondary ? <button onClick={() => onPanelChange("sections")} aria-label="Retour à toutes les sections" className="mt-5 rounded-full p-2 text-foreground/45 transition hover:bg-foreground/5 hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button> : undefined}>
    <div className="mx-auto max-w-5xl">
      {activePanel === "planning" && <PlanningPanel />}
      {activePanel === "guests" && <GuestPanel />}
      {activePanel === "providers" && <ProviderPanel />}
      {activePanel === "dayof" && <DayOfPanel />}
      {activePanel === "sections" && <div className="mx-auto max-w-3xl">{WEDDING_SECONDARY_NAVIGATION.map(item => item.destination.kind === "route" ? (
        <Link key={item.id} href={item.destination.href} onClick={() => onPanelChange(null)} className="group flex w-full items-center gap-4 border-b border-border py-5 text-left text-foreground/75 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Grid2X2 className="h-4 w-4 shrink-0 text-foreground/40" /><span className="min-w-0 flex-1"><span className="block text-xs uppercase tracking-[.18em]">{item.label}</span><span className="mt-1.5 block text-xs font-light text-foreground/45">{item.description}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-foreground/25 transition group-hover:translate-x-1" />
        </Link>
      ) : (
        <button key={item.id} onClick={() => openDestination(item.destination)} aria-current={isWeddingDestinationActive(item.destination, view, activePanel) ? "page" : undefined} className="group flex w-full items-center gap-4 border-b border-border py-5 text-left text-foreground/75 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Grid2X2 className="h-4 w-4 shrink-0 text-foreground/40" /><span className="min-w-0 flex-1"><span className="block text-xs uppercase tracking-[.18em]">{item.label}</span><span className="mt-1.5 block text-xs font-light text-foreground/45">{item.description}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-foreground/25 transition group-hover:translate-x-1" />
        </button>
      ))}</div>}
      {isModule && <WeddingModulesPanel module={activePanel as WeddingModule} />}
    </div>
  </CenteredBlock>}</AnimatePresence>
  <AnimatePresence>{quickOpen && <CenteredBlock eyebrow="Créer et commander" title="Que voulez-vous faire ?" onClose={() => setQuickOpen(false)}>
      <button onClick={() => { setQuickOpen(false); onPlay(); }} className="group flex w-full items-center gap-5 border-b border-border py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-foreground/15 bg-foreground/[.04]"><Play className="ml-0.5 h-4 w-4 stroke-[1.5] text-foreground/75" /></span>
        <span className="min-w-0 flex-1"><span className="block text-[11px] uppercase tracking-[.2em] text-foreground/85">{playLabel}</span><span className="mt-1.5 block text-sm font-light text-foreground/55">Faire défiler les Moments visibles comme un récit.</span></span>
        <ChevronRight className="h-4 w-4 text-foreground/20 transition group-hover:translate-x-1 group-hover:text-foreground/60" />
      </button>
      <div>{UNIVERSAL_CREATE_ACTIONS.map(item => {
        const Icon = icons[item.id];
        return <button key={item.id} disabled={!item.availableInCurrentProject} onClick={() => openCreateAction(item.id)} className="group flex w-full items-center gap-5 border-b border-border py-5 text-left disabled:cursor-default disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Icon className="h-5 w-5 shrink-0 stroke-[1.35] text-foreground/55 transition group-hover:text-foreground" />
          <span className="min-w-0 flex-1"><span className="block text-[11px] uppercase tracking-[.2em] text-foreground/80">{item.label}</span><span className="mt-1.5 block text-sm font-light text-foreground/55">{item.description}</span>{!item.availableInCurrentProject && <span className="mt-2 block text-[9px] uppercase tracking-[.16em] text-foreground/45">Fondation universelle en construction</span>}</span>
          {item.availableInCurrentProject && <ChevronRight className="h-4 w-4 text-foreground/20 transition group-hover:translate-x-1 group-hover:text-foreground/60" />}
        </button>;
      })}</div>
  </CenteredBlock>}</AnimatePresence>
  <nav aria-label="Navigation du Monde et centre AI plus ME" className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 text-foreground">
      <button type="button" onClick={() => onPanelChange("sections")} className="flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-card-border bg-card/95 px-4 py-2 text-[9px] uppercase tracking-[.16em] text-foreground/65 shadow-lg backdrop-blur-xl transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Section active : ${currentLabel}. Ouvrir toutes les sections`}>
        <span className="max-w-[14rem] truncate">{currentLabel}</span><ChevronRight className="h-3 w-3 rotate-[-90deg]" />
      </button>
      <div className="flex h-[72px] w-[min(350px,calc(100vw-1rem))] shrink-0 items-center justify-between overflow-hidden rounded-full border border-card-border bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl sm:h-[76px] sm:w-[410px] sm:p-2">
        <button disabled={!previousPhase} onClick={() => previousPhase && onPhaseChange(previousPhase)} className="grid h-11 w-9 shrink-0 place-items-center rounded-full text-foreground/45 transition hover:bg-foreground/[.06] hover:text-foreground disabled:opacity-15 sm:w-10" aria-label={previousPhase ? `Aller vers ${phaseLabel[previousPhase]}` : "Aucune période précédente"}><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={() => window.dispatchEvent(new Event("aime:open-ai"))} className="h-14 min-w-0 flex-1 rounded-full text-xs font-semibold tracking-[.14em] text-foreground/75 hover:bg-foreground/[.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm sm:tracking-[.16em]" aria-label="Demander à AIME">AI</button>
        <button data-preserve-color onClick={() => setQuickOpen(true)} className="h-[58px] w-[58px] shrink-0 rounded-full bg-[conic-gradient(from_180deg,#ff5b79,#ffb44a,#f6f06a,#50e3a4,#4cc9ff,#8b7cff,#e26cff,#ff5b79)] p-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-[62px] sm:w-[62px]" aria-label="Ajouter"><span className="flex h-full w-full items-center justify-center rounded-full bg-background text-foreground"><Plus className="h-7 w-7 stroke-[1.35] sm:h-8 sm:w-8" /></span></button>
        <button onClick={() => window.dispatchEvent(new Event("aime:open-me"))} className="h-14 min-w-0 flex-1 rounded-full text-xs font-semibold tracking-[.14em] text-foreground/75 hover:bg-foreground/[.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm sm:tracking-[.16em]" aria-label="Ouvrir mon espace">ME</button>
        <button disabled={!nextPhase} onClick={() => nextPhase && onPhaseChange(nextPhase)} className="grid h-11 w-9 shrink-0 place-items-center rounded-full text-foreground/45 transition hover:bg-foreground/[.06] hover:text-foreground disabled:opacity-15 sm:w-10" aria-label={nextPhase ? `Aller vers ${phaseLabel[nextPhase]}` : "Aucune période suivante"}><ChevronRight className="h-5 w-5" /></button>
      </div>
  </nav></>;
}
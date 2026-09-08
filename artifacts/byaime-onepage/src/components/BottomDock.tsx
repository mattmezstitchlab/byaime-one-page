import { AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Grid2X2 } from "lucide-react";
import { Link } from "wouter";
import { useProject } from "@/store/project-store";
import { PlanningPanel } from "./panels/PlanningPanel";
import { GuestPanel } from "./panels/GuestPanel";
import { ProviderPanel } from "./panels/ProviderPanel";
import { DayOfPanel } from "./panels/DayOfPanel";
import { WeddingModulesPanel } from "./panels/WeddingModulesPanel";
import { CenteredBlock } from "./CenteredBlock";
import type { TimelineView } from "@/lib/timeline-graph";
import {
  getWeddingNavigationLabel,
  isWeddingDestinationActive,
  WEDDING_MODULE_IDS,
  WEDDING_PANEL_LABELS,
  WEDDING_SECONDARY_NAVIGATION,
  type WorldPhase,
  type WeddingDestination,
  type WeddingModule,
  type WeddingPanelId,
} from "@/lib/wedding-navigation";

export function BottomDock({
  phase,
  view,
  activePanel,
  onPhaseChange,
  onViewChange,
  onPanelChange,
}: {
  phase: WorldPhase;
  view: TimelineView;
  activePanel: WeddingPanelId | null;
  onPhaseChange: (phase: WorldPhase) => void;
  onViewChange: (view: TimelineView) => void;
  onPanelChange: (panel: WeddingPanelId | null) => void;
}) {
  const { project } = useProject();
  if (!project) return null;
  const isSecondary = activePanel !== null && activePanel !== "sections";
  const isModule = activePanel !== null && WEDDING_MODULE_IDS.some(module => module === activePanel);
  const openPanel = (id: WeddingPanelId) => {
    onPanelChange(id);
  };
  const openDestination = (destination: WeddingDestination) => {
    if (destination.kind === "panel") openPanel(destination.panel);
    if (destination.kind === "view") {
      onPanelChange(null);
      onViewChange(destination.view);
    }
  };
  const previousPhase: WorldPhase | null = phase === "avant" ? null : phase === "pendant" ? "avant" : "pendant";
  const nextPhase: WorldPhase | null = phase === "avant" ? "pendant" : phase === "pendant" ? "apres" : null;
  const phaseLabel: Record<WorldPhase, string> = { avant: "Avant", pendant: "Le Jour J", apres: "Après" };
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
  <nav aria-label="Navigation du Monde" className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 text-foreground">
      <button type="button" onClick={() => onPanelChange("sections")} className="flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-card-border bg-card/95 px-4 py-2 text-[9px] uppercase tracking-[.16em] text-foreground/65 shadow-lg backdrop-blur-xl transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Section active : ${currentLabel}. Ouvrir toutes les sections`}>
        <span className="max-w-[14rem] truncate">{currentLabel}</span><ChevronRight className="h-3 w-3 rotate-[-90deg]" />
      </button>
      <div role="group" aria-label="Contrôles temporels du Monde" className="flex h-[72px] w-[min(350px,calc(100vw-1rem))] shrink-0 items-center overflow-hidden rounded-full border border-card-border bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl sm:h-[76px] sm:w-[410px] sm:p-2">
        <button type="button" disabled={!previousPhase} onClick={() => previousPhase && onPhaseChange(previousPhase)} className="grid h-11 w-9 shrink-0 place-items-center rounded-full text-foreground/45 transition hover:bg-foreground/[.06] hover:text-foreground disabled:opacity-15 sm:w-10" aria-label={previousPhase ? `Aller vers ${phaseLabel[previousPhase]}` : "Aucune période précédente"}><ChevronLeft className="h-5 w-5" /></button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1" role="tablist" aria-label="Période du Monde">
          {(Object.keys(phaseLabel) as WorldPhase[]).map(phaseId => (
            <button key={phaseId} type="button" role="tab" aria-selected={phase === phaseId} onClick={() => onPhaseChange(phaseId)} className="min-w-0 rounded-full px-2.5 py-3 text-[9px] uppercase tracking-[.12em] text-foreground/55 transition hover:bg-foreground/[.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4 sm:text-[10px] sm:tracking-[.14em] aria-selected:bg-foreground aria-selected:text-background">
              {phaseLabel[phaseId]}
            </button>
          ))}
        </div>
        <button type="button" disabled={!nextPhase} onClick={() => nextPhase && onPhaseChange(nextPhase)} className="grid h-11 w-9 shrink-0 place-items-center rounded-full text-foreground/45 transition hover:bg-foreground/[.06] hover:text-foreground disabled:opacity-15 sm:w-10" aria-label={nextPhase ? `Aller vers ${phaseLabel[nextPhase]}` : "Aucune période suivante"}><ChevronRight className="h-5 w-5" /></button>
      </div>
  </nav></>;
}
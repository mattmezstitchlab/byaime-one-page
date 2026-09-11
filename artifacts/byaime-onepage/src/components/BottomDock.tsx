import { AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Grid2X2 } from "lucide-react";
import { Link } from "wouter";
import { PlanningPanel } from "./panels/PlanningPanel";
import { GuestPanel } from "./panels/GuestPanel";
import { ProviderPanel } from "./panels/ProviderPanel";
import { DayOfPanel } from "./panels/DayOfPanel";
import { WeddingModulesPanel } from "./panels/WeddingModulesPanel";
import { CenteredBlock } from "./CenteredBlock";
import type { TimelineView } from "@/lib/timeline-graph";
import {
  isWeddingDestinationActive,
  WEDDING_MODULE_IDS,
  WEDDING_PANEL_LABELS,
  type WorldPhase,
  type WeddingDestination,
  type WeddingModule,
  type WeddingNavigation,
  type WeddingPanelId,
  type WeddingRailItem,
} from "@/lib/wedding-navigation";

/*
 * Les panneaux plein écran du Monde. Les contrôles de navigation ont quitté le
 * bas de l'écran : la capsule temporelle est en haut (PhaseTimeCapsule) et les
 * catégories communes sont dans la barre latérale gauche.
 */
export function BottomDock({
  phase: _phase,
  view,
  activePanel,
  navigation,
  rail = [],
  onPanelChange,
  onViewChange: _onViewChange,
  onPhaseChange: _onPhaseChange,
}: {
  phase: WorldPhase;
  view: TimelineView;
  activePanel: WeddingPanelId | null;
  navigation: WeddingNavigation;
  rail?: WeddingRailItem[];
  onPhaseChange: (phase: WorldPhase) => void;
  onViewChange: (view: TimelineView) => void;
  onPanelChange: (panel: WeddingPanelId | null) => void;
}) {
  const isSecondary = activePanel !== null && activePanel !== "sections";
  const isModule = activePanel !== null && WEDDING_MODULE_IDS.some(module => module === activePanel);
  const openDestination = (destination: WeddingDestination) => {
    if (destination.kind === "panel") onPanelChange(destination.panel);
    if (destination.kind === "view") {
      onPanelChange(null);
      _onViewChange(destination.view);
    }
  };

  /* « Toutes les sections » réunit la barre latérale commune et les outils du mode. */
  const sections = [...rail, ...navigation.primary, ...navigation.secondary].filter((entry, index, all) =>
    index === all.findIndex(other => other.id === entry.id && other.label === entry.label),
  );

  return <AnimatePresence>{activePanel && <CenteredBlock eyebrow={isSecondary ? "Toutes les sections" : "Navigation du Monde"} title={WEDDING_PANEL_LABELS[activePanel]} size="xl" onClose={() => onPanelChange(null)} leading={isSecondary ? <button onClick={() => onPanelChange("sections")} aria-label="Retour à toutes les sections" className="mt-5 rounded-full p-2 text-foreground/45 transition hover:bg-foreground/5 hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button> : undefined}>
    <div className="mx-auto max-w-5xl">
      {activePanel === "planning" && <PlanningPanel />}
      {activePanel === "guests" && <GuestPanel />}
      {activePanel === "providers" && <ProviderPanel />}
      {activePanel === "dayof" && <DayOfPanel />}
      {activePanel === "sections" && <div className="mx-auto max-w-3xl">{sections.map(item => item.destination.kind === "route" ? (
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
  </CenteredBlock>}</AnimatePresence>;
}

import { AnimatePresence } from "framer-motion";
import { PlanningPanel } from "./panels/PlanningPanel";
import { GuestPanel } from "./panels/GuestPanel";
import { ProviderPanel } from "./panels/ProviderPanel";
import { DayOfPanel } from "./panels/DayOfPanel";
import { WeddingModulesPanel } from "./panels/WeddingModulesPanel";
import { CenteredBlock } from "./CenteredBlock";
import type { TimelineView } from "@/lib/timeline-graph";
import {
  getPanelContextGroup,
  getWeddingPanelLabel,
  WEDDING_MODULE_IDS,
  type WorldPhase,
  type WeddingModule,
  type WeddingNavigation,
  type WeddingPanelId,
  type WeddingRailItem,
} from "@/lib/wedding-navigation";
import { useI18n } from "@/lib/i18n";

/*
 * Les panneaux plein écran du Monde. Chaque entrée de la rangée du Monde ouvre
 * directement son panneau — il n'y a plus de sommaire intermédiaire. La
 * capsule temporelle est en haut (PhaseTimeCapsule) et les catégories communes
 * dans le panneau de l'orbe. Les panneaux ne répètent plus la navigation en
 * tête : elle existe déjà dans le dock et le rail, la répéter ne faisait
 * qu'ajouter une rangée de boutons en doublon.
 */
export function BottomDock({
  view,
  activePanel,
  navigation,
  rail = [],
  onPanelChange,
}: {
  phase: WorldPhase;
  view: TimelineView;
  activePanel: WeddingPanelId | null;
  navigation: WeddingNavigation;
  rail?: WeddingRailItem[];
  onPhaseChange: (phase: WorldPhase) => void;
  onPanelChange: (panel: WeddingPanelId | null) => void;
}) {
  const { t, locale } = useI18n();
  const isModule = activePanel !== null && WEDDING_MODULE_IDS.some(module => module === activePanel);
  const contextGroup = activePanel
    ? getPanelContextGroup(activePanel, rail, navigation, view, locale)
    : null;

  return <AnimatePresence>{activePanel && <CenteredBlock
    eyebrow={contextGroup?.label ?? t("world.group.navigation")}
    title={getWeddingPanelLabel(activePanel, locale)}
    size="xl"
    onClose={() => onPanelChange(null)}
  >
    <div className="mx-auto max-w-5xl">
      {activePanel === "planning" && <PlanningPanel />}
      {activePanel === "guests" && <GuestPanel />}
      {activePanel === "providers" && <ProviderPanel />}
      {activePanel === "dayof" && <DayOfPanel />}
      {isModule && <WeddingModulesPanel module={activePanel as WeddingModule} />}
    </div>
  </CenteredBlock>}</AnimatePresence>;
}

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, FileText, Grid2X2, Link2, MapPin, PackageOpen, Play, Plus, Users } from "lucide-react";
import { useProject } from "@/store/project-store";
import { PlanningPanel } from "./panels/PlanningPanel";
import { GuestPanel } from "./panels/GuestPanel";
import { ProviderPanel } from "./panels/ProviderPanel";
import { DayOfPanel } from "./panels/DayOfPanel";
import { WeddingModule, WeddingModulesPanel } from "./panels/WeddingModulesPanel";
import { CenteredBlock } from "./CenteredBlock";
import { UNIVERSAL_CREATE_ACTIONS, type UniversalCreateActionId } from "@/lib/universal/create-actions";
import type { TimelineView } from "@/lib/timeline-graph";

const secondary: { id: WeddingModule; label: string }[] = [
  { id: "seating", label: "Plan de table" },
  { id: "budget", label: "Budget" },
  { id: "documents", label: "Documents" },
  { id: "ceremony", label: "Cérémonie & réception" },
  { id: "music", label: "Musique" },
  { id: "logistics", label: "Logistique" },
  { id: "messages", label: "Messages" },
  { id: "team", label: "Équipe" },
  { id: "memories", label: "Souvenirs & après" },
];

const labels: Record<string, string> = {
  planning: "À faire", guests: "Invités", providers: "Professionnels", dayof: "Le Jour J", plus: "Toutes les sections",
  ...Object.fromEntries(secondary.map(item => [item.id, item.label])),
};

type WorldPhase = "tout" | "avant" | "pendant" | "apres";

export function BottomDock({
  phase,
  view,
  onPhaseChange,
  onPlay,
}: {
  phase: WorldPhase;
  view: TimelineView;
  onPhaseChange: (phase: WorldPhase) => void;
  onPlay: () => void;
}) {
  const { project } = useProject();
  const [activePanel, setActivePanel] = useState<string | null>(null);
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
  const panelTargets: Partial<Record<UniversalCreateActionId, string>> = {
    person: "guests",
    moment: "dayof",
    task: "planning",
    "document-media": "documents",
  };
  const isSecondary = secondary.some(item => item.id === activePanel);
  const openPanel = (id: string) => {
    setActivePanel(id);
    setQuickOpen(false);
  };
  const openCreateAction = (id: UniversalCreateActionId) => {
    const target = panelTargets[id];
    if (target) openPanel(target);
  };
  const previousPhase: WorldPhase | null = phase === "tout" ? "avant" : phase === "avant" ? null : phase === "pendant" ? "avant" : "pendant";
  const nextPhase: WorldPhase | null = phase === "tout" ? "apres" : phase === "avant" ? "pendant" : phase === "pendant" ? "apres" : null;
  const phaseLabel: Record<WorldPhase, string> = { tout: "Tout", avant: "Avant", pendant: "Le Jour J", apres: "Après" };
  const playLabel = view === "music" ? "Lire la Timeline musicale" : phase === "pendant" || view === "day-of" ? "Lancer la régie" : "Lire la Timeline";

  return <><AnimatePresence>{activePanel && <CenteredBlock eyebrow={isSecondary ? "Toutes les sections" : "Créer et organiser"} title={labels[activePanel]} size="xl" onClose={() => setActivePanel(null)} leading={isSecondary ? <button onClick={() => setActivePanel("plus")} aria-label="Retour aux sections" className="mt-5 rounded-full p-2 text-white/40 transition hover:text-white"><ChevronLeft className="h-4 w-4" /></button> : undefined}>
    <div className="mx-auto max-w-5xl">
      {activePanel === "planning" && <PlanningPanel />}
      {activePanel === "guests" && <GuestPanel />}
      {activePanel === "providers" && <ProviderPanel />}
      {activePanel === "dayof" && <DayOfPanel />}
      {activePanel === "plus" && <div className="mx-auto max-w-3xl">{secondary.map(item => <button key={item.id} onClick={() => setActivePanel(item.id)} className="flex w-full items-center gap-4 border-b border-white/10 py-5 text-left text-white/75 transition hover:text-white"><Grid2X2 className="h-4 w-4 text-white/40" /><span className="flex-1 text-xs uppercase tracking-[.18em]">{item.label}</span><ChevronRight className="h-4 w-4 text-white/25" /></button>)}</div>}
      {isSecondary && <WeddingModulesPanel module={activePanel as WeddingModule} />}
    </div>
  </CenteredBlock>}</AnimatePresence>
  <AnimatePresence>{quickOpen && <CenteredBlock eyebrow="Créer et commander" title="Que voulez-vous faire ?" onClose={() => setQuickOpen(false)}>
      <button onClick={() => { setQuickOpen(false); onPlay(); }} className="group flex w-full items-center gap-5 border-b border-white/10 py-5 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[.04]"><Play className="ml-0.5 h-4 w-4 stroke-[1.5] text-white/75" /></span>
        <span className="min-w-0 flex-1"><span className="block text-[11px] uppercase tracking-[.2em] text-white/85">{playLabel}</span><span className="mt-1.5 block text-sm font-light text-white/38">Faire défiler les Moments visibles comme un récit.</span></span>
        <ChevronRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-1 group-hover:text-white/60" />
      </button>
      <div>{UNIVERSAL_CREATE_ACTIONS.map(item => {
        const Icon = icons[item.id];
        return <button key={item.id} disabled={!item.availableInCurrentProject} onClick={() => openCreateAction(item.id)} className="group flex w-full items-center gap-5 border-b border-white/10 py-5 text-left disabled:cursor-default disabled:opacity-45">
          <Icon className="h-5 w-5 shrink-0 stroke-[1.35] text-white/45 transition group-hover:text-white" />
          <span className="min-w-0 flex-1"><span className="block text-[11px] uppercase tracking-[.2em] text-white/80">{item.label}</span><span className="mt-1.5 block text-sm font-light text-white/38">{item.description}</span>{!item.availableInCurrentProject && <span className="mt-2 block text-[9px] uppercase tracking-[.16em] text-white/30">Fondation universelle en construction</span>}</span>
          {item.availableInCurrentProject && <ChevronRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-1 group-hover:text-white/60" />}
        </button>;
      })}</div>
  </CenteredBlock>}</AnimatePresence>
  <nav aria-label="Centre AI plus ME" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 text-white">
      <div className="flex h-[76px] w-[350px] shrink-0 items-center justify-between rounded-full border border-white/8 bg-black/88 p-2 shadow-2xl backdrop-blur-xl sm:w-[410px]">
        <button disabled={!previousPhase} onClick={() => previousPhase && onPhaseChange(previousPhase)} className="grid h-11 w-10 shrink-0 place-items-center rounded-full text-white/45 transition hover:bg-white/[.06] hover:text-white disabled:opacity-15" aria-label={previousPhase ? `Aller vers ${phaseLabel[previousPhase]}` : "Aucune période précédente"}><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={() => window.dispatchEvent(new Event("aime:open-ai"))} className="h-14 flex-1 rounded-full text-sm font-semibold tracking-[.16em] text-white/70 hover:bg-white/[.06] hover:text-white" aria-label="Demander à AIME">AI</button>
        <button onClick={() => setQuickOpen(true)} className="h-[62px] w-[62px] shrink-0 rounded-full bg-[conic-gradient(from_180deg,#ff5b79,#ffb44a,#f6f06a,#50e3a4,#4cc9ff,#8b7cff,#e26cff,#ff5b79)] p-[2px]" aria-label="Ajouter"><span className="flex h-full w-full items-center justify-center rounded-full bg-black"><Plus className="h-8 w-8 stroke-[1.35]" /></span></button>
        <button onClick={() => window.dispatchEvent(new Event("aime:open-me"))} className="h-14 flex-1 rounded-full text-sm font-semibold tracking-[.16em] text-white/70 hover:bg-white/[.06] hover:text-white" aria-label="Ouvrir mon espace">ME</button>
        <button disabled={!nextPhase} onClick={() => nextPhase && onPhaseChange(nextPhase)} className="grid h-11 w-10 shrink-0 place-items-center rounded-full text-white/45 transition hover:bg-white/[.06] hover:text-white disabled:opacity-15" aria-label={nextPhase ? `Aller vers ${phaseLabel[nextPhase]}` : "Aucune période suivante"}><ChevronRight className="h-5 w-5" /></button>
      </div>
  </nav></>;
}
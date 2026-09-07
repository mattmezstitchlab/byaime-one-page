import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Grid2X2, Map, Plus, Users, X } from "lucide-react";
import { useProject } from "@/store/project-store";
import { PlanningPanel } from "./panels/PlanningPanel";
import { GuestPanel } from "./panels/GuestPanel";
import { ProviderPanel } from "./panels/ProviderPanel";
import { DayOfPanel } from "./panels/DayOfPanel";
import { WeddingModule, WeddingModulesPanel } from "./panels/WeddingModulesPanel";
import { CenteredBlock } from "./CenteredBlock";

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

export function BottomDock() {
  const { project } = useProject();
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  if (!project) return null;
  const hubItems = [
    { id: "planning", icon: ClipboardList, label: "À faire", detail: "Créer et suivre les prochaines étapes" },
    { id: "guests", icon: Users, label: "Invités", detail: "Ajouter les personnes et leurs besoins" },
    { id: "providers", icon: BriefcaseBusiness, label: "Professionnels", detail: "Chercher, ajouter et organiser les métiers" },
    { id: "dayof", icon: CalendarDays, label: "Jour J", detail: "Préparer les moments de cette journée" },
    { id: "plus", icon: Grid2X2, label: "Toutes les sections", detail: "Documents, budget, musique et souvenirs" },
  ];
  const isSecondary = secondary.some(item => item.id === activePanel);
  const openPanel = (id: string) => {
    setActivePanel(id);
    setQuickOpen(false);
  };

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
  <AnimatePresence>{quickOpen && <CenteredBlock eyebrow="Créer et organiser" title="Par où voulez-vous commencer ?" onClose={() => setQuickOpen(false)}>
      <div>{hubItems.map(item => <button key={item.id} onClick={() => openPanel(item.id)} className="group flex w-full items-center gap-5 border-b border-white/10 py-5 text-left">
        <item.icon className="h-5 w-5 shrink-0 stroke-[1.35] text-white/45 transition group-hover:text-white" />
        <span className="min-w-0 flex-1"><span className="block text-[11px] uppercase tracking-[.2em] text-white/80">{item.label}</span><span className="mt-1.5 block text-sm font-light text-white/38">{item.detail}</span></span>
        <ChevronRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-1 group-hover:text-white/60" />
      </button>)}</div>
  </CenteredBlock>}</AnimatePresence>
  <nav aria-label="Centre AI plus ME" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 text-white">
      <div className="flex h-[76px] w-[280px] shrink-0 items-center justify-between rounded-full bg-black/88 p-2 shadow-2xl backdrop-blur-xl sm:w-[320px]">
        <button onClick={() => window.dispatchEvent(new Event("aime:open-ai"))} className="h-14 flex-1 rounded-full text-sm font-semibold tracking-[.16em] text-white/70 hover:bg-white/[.06] hover:text-white" aria-label="Demander à AIME">AI</button>
        <button onClick={() => setQuickOpen(true)} className="h-[62px] w-[62px] shrink-0 rounded-full bg-[conic-gradient(from_180deg,#ff5b79,#ffb44a,#f6f06a,#50e3a4,#4cc9ff,#8b7cff,#e26cff,#ff5b79)] p-[2px]" aria-label="Ajouter"><span className="flex h-full w-full items-center justify-center rounded-full bg-black"><Plus className="h-8 w-8 stroke-[1.35]" /></span></button>
        <button onClick={() => window.dispatchEvent(new Event("aime:open-me"))} className="h-14 flex-1 rounded-full text-sm font-semibold tracking-[.16em] text-white/70 hover:bg-white/[.06] hover:text-white" aria-label="Ouvrir mon espace">ME</button>
      </div>
  </nav></>;
}
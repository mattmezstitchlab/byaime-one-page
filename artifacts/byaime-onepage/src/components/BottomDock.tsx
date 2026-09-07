import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck2, ChevronLeft, Grid2X2, Map, Store, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/store/project-store";
import { PlanningPanel } from "./panels/PlanningPanel";
import { GuestPanel } from "./panels/GuestPanel";
import { ProviderPanel } from "./panels/ProviderPanel";
import { DayOfPanel } from "./panels/DayOfPanel";
import { WeddingModule, WeddingModulesPanel } from "./panels/WeddingModulesPanel";

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
  planning: "Planning", guests: "Invités", providers: "Prestataires", dayof: "Le Jour J", plus: "Toutes les sections",
  ...Object.fromEntries(secondary.map(item => [item.id, item.label])),
};

export function BottomDock() {
  const { project } = useProject();
  const [activePanel, setActivePanel] = useState<string | null>(null);
  if (!project) return null;
  const primary = [
    { id: "planning", icon: CalendarCheck2 },
    { id: "guests", icon: UserRound },
    { id: "providers", icon: Store },
    { id: "dayof", icon: Map },
    { id: "plus", icon: Grid2X2 },
  ];
  const isSecondary = secondary.some(item => item.id === activePanel);
  const toggle = (id: string) => setActivePanel(activePanel === id ? null : id);

  return <><AnimatePresence>{activePanel && <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-16 md:bottom-20 left-0 right-0 z-40 h-[72vh] max-h-[680px] rounded-t-3xl border-t border-white/10 bg-[#0a0a0a] text-white shadow-2xl">
    <div className="h-full overflow-y-auto p-5 pb-16 sm:p-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between mb-7"><div className="flex items-center gap-3">{isSecondary && <button onClick={() => setActivePanel("plus")} className="rounded-full p-2 text-white/45 hover:bg-white/10 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>}<h3 className="font-display text-2xl font-light">{labels[activePanel]}</h3></div><button onClick={() => setActivePanel(null)} className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="w-4 h-4" /></button></div>
      {activePanel === "planning" && <PlanningPanel />}
      {activePanel === "guests" && <GuestPanel />}
      {activePanel === "providers" && <ProviderPanel />}
      {activePanel === "dayof" && <DayOfPanel />}
      {activePanel === "plus" && <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3">{secondary.map(item => <button key={item.id} onClick={() => setActivePanel(item.id)} className="min-h-20 rounded-2xl border border-white/10 bg-white/[.035] px-4 text-left text-sm text-white/75 transition hover:border-white/25 hover:bg-white/10">{item.label}<span className="mt-2 block text-[10px] uppercase tracking-widest text-white/30">Ouvrir</span></button>)}</div>}
      {isSecondary && <WeddingModulesPanel module={activePanel as WeddingModule} />}
    </div>
  </motion.div>}</AnimatePresence>
  <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#050505]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"><div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-center gap-2 px-3 sm:gap-8 md:h-20">{primary.map(item => <button key={item.id} onClick={() => toggle(item.id)} aria-label={labels[item.id]} className={cn("relative flex min-w-14 flex-col items-center justify-center rounded-full p-3 text-white/40 transition hover:bg-white/5 hover:text-white/80", activePanel === item.id ? "bg-white/10 text-white" : "")}><item.icon className="h-5 w-5 stroke-[1.5] md:h-6 md:w-6" /><span className="mt-1 max-w-16 truncate text-[9px] sm:text-[10px]">{labels[item.id]}</span>{activePanel === item.id && <motion.div layoutId="dock-indicator" className="absolute -top-px h-0.5 w-8 rounded-full bg-white" />}</button>)}</div></div></>;
}
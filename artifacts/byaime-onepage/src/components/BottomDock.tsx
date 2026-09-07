import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Grid2X2, Map, Plus, Users, X } from "lucide-react";
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

  return <><AnimatePresence>{activePanel && <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-20 left-0 right-0 z-40 h-[68vh] max-h-[680px] rounded-t-3xl border-t border-white/10 bg-[#0a0a0a] text-white shadow-2xl">
    <div className="h-full overflow-y-auto p-5 pb-16 sm:p-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between mb-7"><div className="flex items-center gap-3">{isSecondary && <button onClick={() => setActivePanel("plus")} className="rounded-full p-2 text-white/45 hover:bg-white/10 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>}<h3 className="font-display text-2xl font-light">{labels[activePanel]}</h3></div><button onClick={() => setActivePanel(null)} className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="w-4 h-4" /></button></div>
      {activePanel === "planning" && <PlanningPanel />}
      {activePanel === "guests" && <GuestPanel />}
      {activePanel === "providers" && <ProviderPanel />}
      {activePanel === "dayof" && <DayOfPanel />}
      {activePanel === "plus" && <div className="mx-auto max-w-3xl">{secondary.map(item => <button key={item.id} onClick={() => setActivePanel(item.id)} className="flex w-full items-center gap-4 border-b border-white/10 py-5 text-left text-white/75 transition hover:text-white"><Grid2X2 className="h-4 w-4 text-white/40" /><span className="flex-1 text-xs uppercase tracking-[.18em]">{item.label}</span><ChevronRight className="h-4 w-4 text-white/25" /></button>)}</div>}
      {isSecondary && <WeddingModulesPanel module={activePanel as WeddingModule} />}
    </div>
  </motion.div>}</AnimatePresence>
  <AnimatePresence>{quickOpen && <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .96 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={() => setQuickOpen(false)}>
    <div className="w-full max-w-lg rounded-[2rem] bg-[#0a0a0a]/95 px-7 py-8 text-white shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.24em] text-white/35">Créer et organiser</p><h3 className="mt-3 font-display text-3xl font-light">Par où voulez-vous commencer ?</h3></div><button onClick={() => setQuickOpen(false)} aria-label="Fermer" className="rounded-full p-2 text-white/40 hover:text-white"><X className="h-4 w-4" /></button></div>
      <div className="mt-8">{hubItems.map(item => <button key={item.id} onClick={() => openPanel(item.id)} className="group flex w-full items-center gap-5 border-b border-white/10 py-5 text-left">
        <item.icon className="h-5 w-5 shrink-0 stroke-[1.35] text-white/45 transition group-hover:text-white" />
        <span className="min-w-0 flex-1"><span className="block text-[11px] uppercase tracking-[.2em] text-white/80">{item.label}</span><span className="mt-1.5 block text-sm font-light text-white/38">{item.detail}</span></span>
        <ChevronRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-1 group-hover:text-white/60" />
      </button>)}</div>
    </div>
  </motion.div>}</AnimatePresence>
  <nav aria-label="Centre AI plus ME" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 text-white">
      <div className="flex shrink-0 items-center rounded-full bg-black/85 p-1 shadow-2xl backdrop-blur-xl">
        <button onClick={() => window.dispatchEvent(new Event("aime:open-ai"))} className="h-10 rounded-full px-3 text-[10px] font-semibold tracking-[.14em] text-white/65 hover:bg-white/10 hover:text-white" aria-label="Demander à AIME">AI</button>
        <button onClick={() => setQuickOpen(true)} className="h-12 w-12 rounded-full bg-[conic-gradient(from_180deg,#ff5b79,#ffb44a,#f6f06a,#50e3a4,#4cc9ff,#8b7cff,#e26cff,#ff5b79)] p-[2px]" aria-label="Ajouter"><span className="flex h-full w-full items-center justify-center rounded-full bg-black"><Plus className="h-6 w-6 stroke-[1.5]" /></span></button>
        <button onClick={() => window.dispatchEvent(new Event("aime:open-me"))} className="h-10 rounded-full px-3 text-[10px] font-semibold tracking-[.14em] text-white/65 hover:bg-white/10 hover:text-white" aria-label="Ouvrir mon espace">ME</button>
      </div>
  </nav></>;
}
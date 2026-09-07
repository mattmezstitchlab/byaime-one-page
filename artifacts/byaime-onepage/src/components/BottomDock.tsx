import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck2, ChevronLeft, Grid2X2, Map, Plus, Store, UserRound, X } from "lucide-react";
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
  planning: "À faire", guests: "Invités", providers: "Professionnels", dayof: "Le Jour J", plus: "Toutes les sections",
  ...Object.fromEntries(secondary.map(item => [item.id, item.label])),
};

export function BottomDock() {
  const { project, addEntity, canEdit } = useProject();
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
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
  const quickAdd = (kind: "task" | "guest" | "provider" | "moment") => {
    if (!canEdit) return;
    if (kind === "task") addEntity("tasks", { title: "Nouvelle tâche", status: "a_faire", priority: "normale" });
    if (kind === "guest") addEntity("guests", { name: "Nouvelle personne", role: "invite", rsvp: "en_attente", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } });
    if (kind === "provider") addEntity("providers", { role: "Nouveau professionnel", category: "autre", status: "recherche" });
    if (kind === "moment") addEntity("timeline", { time: Date.now(), kind: "evenement", title: "Nouveau moment", status: "en_attente", confidence: "a_confirmer", phase: "avant", universe: project.universe });
    setQuickOpen(false);
  };

  return <><AnimatePresence>{activePanel && <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-24 left-0 right-0 z-40 h-[68vh] max-h-[680px] rounded-t-3xl border-t border-white/10 bg-[#0a0a0a] text-white shadow-2xl">
    <div className="h-full overflow-y-auto p-5 pb-16 sm:p-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between mb-7"><div className="flex items-center gap-3">{isSecondary && <button onClick={() => setActivePanel("plus")} className="rounded-full p-2 text-white/45 hover:bg-white/10 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>}<h3 className="font-display text-2xl font-light">{labels[activePanel]}</h3></div><button onClick={() => setActivePanel(null)} className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="w-4 h-4" /></button></div>
      {activePanel === "planning" && <PlanningPanel />}
      {activePanel === "guests" && <GuestPanel />}
      {activePanel === "providers" && <ProviderPanel />}
      {activePanel === "dayof" && <DayOfPanel />}
      {activePanel === "plus" && <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3">{secondary.map(item => <button key={item.id} onClick={() => setActivePanel(item.id)} className="min-h-20 rounded-2xl border border-white/10 bg-white/[.035] px-4 text-left text-sm text-white/75 transition hover:border-white/25 hover:bg-white/10">{item.label}<span className="mt-2 block text-[10px] uppercase tracking-widest text-white/30">Voir cette section</span></button>)}</div>}
      {isSecondary && <WeddingModulesPanel module={activePanel as WeddingModule} />}
    </div>
  </motion.div>}</AnimatePresence>
  <AnimatePresence>{quickOpen && <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .96 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={() => setQuickOpen(false)}>
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0a0a] p-6 text-white shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-white/35">Ajouter</p><h3 className="mt-1 text-xl font-medium">Que souhaitez-vous créer ?</h3></div><button onClick={() => setQuickOpen(false)} aria-label="Fermer" className="rounded-full p-2 text-white/45 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div>
      <p className="mt-2 text-sm text-white/45">Vous pourrez compléter les informations juste après.</p>
      <div className="mt-6 grid grid-cols-2 gap-2">{([
        ["task", "Une tâche", "Quelque chose à faire"],
        ["guest", "Une personne", "Invité ou proche"],
        ["provider", "Un professionnel", "Un service ou un métier"],
        ["moment", "Un moment", "Une date dans le calendrier"],
      ] as const).map(([kind, title, detail]) => <button key={kind} disabled={!canEdit} onClick={() => quickAdd(kind)} className="min-h-28 rounded-2xl border border-white/10 bg-white/[.035] p-4 text-left transition hover:border-white/25 hover:bg-white/10 disabled:opacity-35"><span className="block text-sm font-medium">{title}</span><span className="mt-2 block text-xs leading-relaxed text-white/40">{detail}</span></button>)}</div>
    </div>
  </motion.div>}</AnimatePresence>
  <nav aria-label="Navigation principale AIME" className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1rem)] max-w-4xl -translate-x-1/2 rounded-2xl border border-white/10 bg-[#050505]/92 p-1.5 text-white shadow-2xl backdrop-blur-xl">
    <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
      {primary.slice(0, 3).map(item => <DockButton key={item.id} label={labels[item.id]} active={activePanel === item.id} onClick={() => toggle(item.id)} icon={item.icon} />)}
      <div className="mx-auto flex shrink-0 items-center rounded-full border border-white/10 bg-black p-1">
        <button onClick={() => window.dispatchEvent(new Event("aime:open-ai"))} className="h-10 rounded-full px-3 text-[10px] font-semibold tracking-[.14em] text-white/65 hover:bg-white/10 hover:text-white" aria-label="Demander à AIME">AI</button>
        <button onClick={() => setQuickOpen(true)} className="h-12 w-12 rounded-full bg-[conic-gradient(from_180deg,#ff5b79,#ffb44a,#f6f06a,#50e3a4,#4cc9ff,#8b7cff,#e26cff,#ff5b79)] p-[2px]" aria-label="Ajouter"><span className="flex h-full w-full items-center justify-center rounded-full bg-black"><Plus className="h-6 w-6 stroke-[1.5]" /></span></button>
        <button onClick={() => window.dispatchEvent(new Event("aime:open-me"))} className="h-10 rounded-full px-3 text-[10px] font-semibold tracking-[.14em] text-white/65 hover:bg-white/10 hover:text-white" aria-label="Ouvrir mon espace">ME</button>
      </div>
      {primary.slice(3).map(item => <DockButton key={item.id} label={labels[item.id]} active={activePanel === item.id} onClick={() => toggle(item.id)} icon={item.icon} />)}
    </div>
  </nav></>;
}

function DockButton({ label, active, onClick, icon: Icon }: { label: string; active: boolean; onClick: () => void; icon: typeof CalendarCheck2 }) {
  return <button onClick={onClick} aria-label={label} className={cn("relative flex min-w-14 shrink-0 flex-col items-center justify-center rounded-xl px-2 py-2 text-white/40 transition hover:bg-white/5 hover:text-white/80 sm:min-w-16", active && "bg-white/10 text-white")}><Icon className="h-4 w-4 stroke-[1.5] sm:h-5 sm:w-5" /><span className="mt-1 max-w-16 truncate text-[9px]">{label}</span>{active && <motion.div layoutId="dock-indicator" className="absolute -top-1.5 h-0.5 w-7 rounded-full bg-white" />}</button>;
}
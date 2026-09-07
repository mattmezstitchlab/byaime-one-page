import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useProject } from "@/store/project-store";
import { executeCommand, parseFrenchCommand, proposeCommand, type CommandProposal } from "@/lib/command-agent";

export function CommandBar({ setPhase, setLayers }: { setPhase: (phase: "tout"|"avant"|"pendant"|"apres") => void; setLayers: (layers: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [input, setInput] = useState("");
  const [proposal, setProposal] = useState<CommandProposal>();
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const { project, updateProject, addEntity, canEdit } = useProject();
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "k" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); setOpen(value => !value); } };
    document.addEventListener("keydown", listener); return () => document.removeEventListener("keydown", listener);
  }, []);
  if (!project) return null;
  const inspect = () => {
    setError(""); setResult(""); setProposal(undefined);
    const command = parseFrenchCommand(input);
    if (!command) { setError("AIME n’a pas compris cette demande. Rien n’a été modifié."); return; }
    try { setProposal(proposeCommand(project, command)); } catch (reason) { setError(reason instanceof Error ? reason.message : "AIME ne peut pas vérifier cette demande pour le moment."); }
  };
  const execute = () => {
    if (!proposal || (proposal.mutation && !canEdit)) return;
    try { const output = executeCommand(project, proposal, true); updateProject(output.project); setResult(output.message); setProposal(undefined); } catch (reason) { setError(reason instanceof Error ? reason.message : "Cette action n’a pas pu être réalisée."); }
  };
  const quickAdd = (kind: "task" | "guest" | "provider" | "moment") => {
    if (!canEdit) return;
    if (kind === "task") addEntity("tasks", { title: "Nouvelle tâche", status: "a_faire", priority: "normale" });
    if (kind === "guest") addEntity("guests", { name: "Nouvelle personne", role: "invite", rsvp: "en_attente", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } });
    if (kind === "provider") addEntity("providers", { role: "Nouveau professionnel", category: "autre", status: "recherche" });
    if (kind === "moment") addEntity("timeline", { time: Date.now(), kind: "evenement", title: "Nouveau moment", status: "en_attente", confidence: "a_confirmer", phase: "avant", universe: project.universe });
    setQuickOpen(false);
  };
  return <>
    <div className="fixed bottom-24 right-4 z-[60] flex items-center gap-1.5 rounded-full border border-white/10 bg-black/85 p-1.5 text-white shadow-xl backdrop-blur-xl sm:right-6">
      <button onClick={() => { setQuickOpen(false); setOpen(true); }} aria-label="Demander à AIME" title="Demander à AIME" className="flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-[11px] font-semibold tracking-[.12em] text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        AI
      </button>
      <div className="relative">
        {quickOpen && <div className="absolute bottom-[calc(100%+12px)] right-1/2 w-52 translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] p-2 shadow-2xl">
          <p className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[.18em] text-white/35">Ajouter rapidement</p>
          {([
            ["task", "Une tâche"],
            ["guest", "Une personne"],
            ["provider", "Un professionnel"],
            ["moment", "Un moment"],
          ] as const).map(([kind, label]) => <button key={kind} disabled={!canEdit} onClick={() => quickAdd(kind)} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-35">{label}</button>)}
        </div>}
        <button onClick={() => setQuickOpen(value => !value)} aria-expanded={quickOpen} aria-label="Ajouter rapidement" title="Ajouter rapidement" className="h-14 w-14 rounded-full bg-[conic-gradient(from_180deg,#ff5b79,#ffb44a,#f6f06a,#50e3a4,#4cc9ff,#8b7cff,#e26cff,#ff5b79)] p-[2px] transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <span className="flex h-full w-full items-center justify-center rounded-full bg-black">
            <Plus className="h-7 w-7 stroke-[1.5]" />
          </span>
        </button>
      </div>
      <button onClick={() => { setQuickOpen(false); window.dispatchEvent(new Event("aime:open-me")); }} aria-label="Ouvrir mon espace" title="Ouvrir mon espace" className="flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-[11px] font-semibold tracking-[.12em] text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        ME
      </button>
    </div>
    {open && <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 px-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div onClick={event => event.stopPropagation()} className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#101010] p-5 shadow-2xl">
        <div className="flex items-center justify-between"><div><h3 className="font-medium">Que souhaitez-vous faire ?</h3><p className="mt-1 text-xs text-white/45">AIME vérifie votre demande et vous demande votre accord avant tout changement.</p></div><button onClick={() => setOpen(false)} aria-label="Fermer"><X className="h-4 w-4" /></button></div>
        <form onSubmit={event => { event.preventDefault(); inspect(); }} className="mt-5 flex gap-2"><input autoFocus value={input} onChange={event => setInput(event.target.value)} placeholder="Décaler la cérémonie de 15 minutes…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none" /><button className="rounded-xl bg-white px-4 text-sm text-black">Vérifier</button></form>
        <div className="mt-3 flex flex-wrap gap-2">{["Voir les tâches restantes", "Repérer les horaires qui se chevauchent", "Vérifier les besoins alimentaires", "Préparer le programme des professionnels", "Ajouter 2 invités"].map(example => <button key={example} onClick={() => setInput(example)} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/45">{example}</button>)}</div>
        {error && <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-300">{error}</p>}
        {result && <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-300">{result}</p>}
        {proposal && <div className="mt-4 rounded-xl border border-white/10 bg-white/[.035] p-4"><p className="font-medium">{proposal.title}</p><ul className="mt-3 space-y-1 text-xs text-white/55">{proposal.impact.length ? proposal.impact.map((line, index) => <li key={index}>• {line}</li>) : <li>Aucun élément concerné.</li>}</ul>
          {proposal.mutation ? <div className="mt-4"><p className="mb-2 text-xs text-amber-300">Rien ne changera sans votre accord.</p><button disabled={!canEdit} onClick={execute} className="rounded-full bg-white px-4 py-2 text-xs text-black disabled:opacity-40">{canEdit ? "Oui, faire ce changement" : "Vous pouvez consulter, mais pas modifier"}</button></div> : <p className="mt-4 text-xs text-white/35">Aucune information n’a été modifiée.</p>}
        </div>}
        <div className="mt-4 flex gap-2 border-t border-white/5 pt-3"><button onClick={() => { setPhase("pendant"); setLayers([]); setOpen(false); }} className="text-xs text-white/50">Voir le Jour J</button><button onClick={() => { setPhase("tout"); setLayers([]); setOpen(false); }} className="text-xs text-white/50">Voir toute la timeline</button></div>
      </div>
    </div>}
  </>;
}
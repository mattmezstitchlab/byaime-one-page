import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useProject } from "@/store/project-store";
import { executeCommand, parseFrenchCommand, proposeCommand, type CommandProposal } from "@/lib/command-agent";

export function CommandBar({ setPhase, setLayers }: { setPhase: (phase: "tout"|"avant"|"pendant"|"apres") => void; setLayers: (layers: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [proposal, setProposal] = useState<CommandProposal>();
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const { project, updateProject, canEdit } = useProject();
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "k" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); setOpen(value => !value); } };
    document.addEventListener("keydown", listener); return () => document.removeEventListener("keydown", listener);
  }, []);
  if (!project) return null;
  const inspect = () => {
    setError(""); setResult(""); setProposal(undefined);
    const command = parseFrenchCommand(input);
    if (!command) { setError("Commande non prise en charge. Rien n’a été exécuté."); return; }
    try { setProposal(proposeCommand(project, command)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Analyse impossible"); }
  };
  const execute = () => {
    if (!proposal || (proposal.mutation && !canEdit)) return;
    try { const output = executeCommand(project, proposal, true); updateProject(output.project); setResult(output.message); setProposal(undefined); } catch (reason) { setError(reason instanceof Error ? reason.message : "Exécution impossible"); }
  };
  return <>
    <button onClick={() => setOpen(true)} className="fixed bottom-24 right-6 z-40 flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-medium text-black shadow-2xl"><Sparkles className="h-4 w-4" />Demander à AIME</button>
    {open && <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div onClick={event => event.stopPropagation()} className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#101010] p-5 shadow-2xl">
        <div className="flex items-center justify-between"><div><h3 className="font-medium">Agent d’actions borné</h3><p className="mt-1 text-xs text-white/40">Analyse déterministe locale · aucune IA externe</p></div><button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button></div>
        <form onSubmit={event => { event.preventDefault(); inspect(); }} className="mt-5 flex gap-2"><input autoFocus value={input} onChange={event => setInput(event.target.value)} placeholder="Décale cérémonie de 15 minutes…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none" /><button className="rounded-xl bg-white px-4 text-sm text-black">Analyser</button></form>
        <div className="mt-3 flex flex-wrap gap-2">{["Liste les tâches restantes", "Trouve les conflits timeline", "Analyse les besoins alimentaires", "Prépare le planning prestataire", "Ajoute 2 invités"].map(example => <button key={example} onClick={() => setInput(example)} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/45">{example}</button>)}</div>
        {error && <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-300">{error}</p>}
        {result && <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-300">{result}</p>}
        {proposal && <div className="mt-4 rounded-xl border border-white/10 bg-white/[.035] p-4"><p className="font-medium">{proposal.title}</p><ul className="mt-3 space-y-1 text-xs text-white/55">{proposal.impact.length ? proposal.impact.map((line, index) => <li key={index}>• {line}</li>) : <li>Aucun élément concerné.</li>}</ul>
          {proposal.mutation ? <div className="mt-4"><p className="mb-2 text-xs text-amber-300">Cette mutation exige votre confirmation explicite.</p><button disabled={!canEdit} onClick={execute} className="rounded-full bg-white px-4 py-2 text-xs text-black disabled:opacity-40">{canEdit ? "Confirmer et exécuter" : "Rôle en lecture seule"}</button></div> : <p className="mt-4 text-xs text-white/35">Analyse uniquement : aucune donnée modifiée.</p>}
        </div>}
        <div className="mt-4 flex gap-2 border-t border-white/5 pt-3"><button onClick={() => { setPhase("pendant"); setLayers([]); setOpen(false); }} className="text-xs text-white/50">Voir le Jour J</button><button onClick={() => { setPhase("tout"); setLayers([]); setOpen(false); }} className="text-xs text-white/50">Voir toute la timeline</button></div>
      </div>
    </div>}
  </>;
}
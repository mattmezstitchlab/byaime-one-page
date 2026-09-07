import { useState } from "react";
import { useProject } from "@/store/project-store";
import { CheckCircle2, Circle, Clock, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

export function PlanningPanel() {
  const { project, updateEntity, addEntity, removeEntity } = useProject();
  const [query, setQuery] = useState("");
  if (!project) return null;
  const phases = ["12m+", "6-12m", "3-6m", "1-3m", "jour-j", "apres"] as const;
  const labels: Record<string, string> = { "12m+": "12 mois et +", "6-12m": "De 6 à 12 mois", "3-6m": "De 3 à 6 mois", "1-3m": "De 1 à 3 mois", "jour-j": "Le Jour J", apres: "Après l'événement" };
  const filtered = project.tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));
  const addTask = () => addEntity("tasks", { title: "Nouvelle étape", phase: "1-3m", status: "a_faire", priority: "normale", owner: "À attribuer", dueDate: Date.now() + 30 * 86400000 });
  return <div className="mx-auto max-w-2xl space-y-6 pb-10">
    <div className="flex gap-2"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une étape…" className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-white/30" /><button onClick={addTask} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 text-xs hover:bg-white hover:text-black"><Plus className="w-3.5 h-3.5" />Ajouter</button></div>
    {phases.map(phase => { const tasks = filtered.filter(t => t.phase === phase); if (!tasks.length) return null; return <section key={phase}><h4 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-white/50">{labels[phase]}<span className="h-px flex-1 bg-white/10" /></h4><div className="space-y-2">{tasks.map(task => <TaskRow key={task.id} task={task} onToggle={() => updateEntity("tasks", task.id, { status: task.status === "termine" ? "a_faire" : "termine" })} onEdit={updates => updateEntity("tasks", task.id, updates)} onDelete={() => removeEntity("tasks", task.id)} />)}</div></section> })}
    {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">Aucune étape ne correspond à cette recherche.</div>}
  </div>;
}

function TaskRow({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: () => void; onEdit: (u: Partial<Task>) => void; onDelete: () => void }) {
  return <div className={cn("rounded-xl border p-3 transition-colors", task.status === "termine" ? "border-white/5 bg-white/[.025] opacity-60" : "border-white/10 bg-white/[.045]")}><div className="flex items-center gap-3"><button onClick={onToggle} className="shrink-0 text-white/40 hover:text-white">{task.status === "termine" ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : task.status === "en_cours" ? <Clock className="h-5 w-5 text-amber-300" /> : <Circle className="h-5 w-5" />}</button><input value={task.title} onChange={e => onEdit({ title: e.target.value })} className={cn("min-w-0 flex-1 bg-transparent text-sm outline-none", task.status === "termine" && "line-through")} /><button onClick={onDelete} className="text-white/25 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button></div><div className="mt-2 flex flex-wrap gap-2 pl-8"><select value={task.priority} onChange={e => onEdit({ priority: e.target.value as Task["priority"] })} className="rounded-md bg-white/10 px-2 py-1 text-[10px] outline-none"><option value="haute">Priorité haute</option><option value="normale">Priorité normale</option><option value="basse">Priorité basse</option></select><input value={task.owner || ""} onChange={e => onEdit({ owner: e.target.value })} placeholder="Responsable" className="w-28 rounded-md bg-white/10 px-2 py-1 text-[10px] outline-none" />{task.dueDate && <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] text-white/50">Échéance {new Date(task.dueDate).toLocaleDateString("fr-FR")}</span>}</div></div>;
}
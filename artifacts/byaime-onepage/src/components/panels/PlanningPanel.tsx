import { useState } from "react";
import { useProject } from "@/store/project-store";
import { CheckCircle2, Circle, Clock, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { CARD, EYEBROW, PILL_SMALL, FIELD } from "@/lib/site-design";

export function PlanningPanel() {
  const { project, updateEntity, addEntity, removeEntity } = useProject();
  const [query, setQuery] = useState("");
  if (!project) return null;
  const phases = ["12m+", "6-12m", "3-6m", "1-3m", "jour-j", "apres"] as const;
  const labels: Record<string, string> = {
    "12m+": "12 mois et +",
    "6-12m": "De 6 à 12 mois",
    "3-6m": "De 3 à 6 mois",
    "1-3m": "De 1 à 3 mois",
    "jour-j": "Le Jour J",
    apres: "Après l'événement",
  };
  const filtered = project.tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));
  const addTask = () =>
    addEntity("tasks", {
      title: "Nouvelle étape",
      phase: "1-3m",
      status: "a_faire",
      priority: "normale",
      owner: "À attribuer",
      dueDate: Date.now() + 30 * 86400000,
    });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className={cn(CARD, "p-5 sm:p-6")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={EYEBROW}>Organisation</p>
            <h3 className="aime-apple-title mt-2 text-2xl text-[var(--agency-ink)]">Les étapes</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--agency-body)]">
              Chaque tâche porte sa phase, son statut et son responsable — comme les Moments du Monde.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher une étape…"
              className={cn(FIELD, "h-9 min-w-[200px] rounded-full px-4 py-2 text-sm")}
            />
            <button onClick={addTask} className={cn(PILL_SMALL, "bg-[var(--agency-ink)] text-[var(--agency-paper)] hover:opacity-85")}>
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </button>
          </div>
        </div>
      </div>

      {phases.map(phase => {
        const tasks = filtered.filter(t => t.phase === phase);
        if (!tasks.length) return null;
        return (
          <section key={phase}>
            <h4 className="mb-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-[var(--agency-eyebrow)]">
              {labels[phase]}
              <span className="h-px flex-1 bg-[var(--agency-hairline)]" />
              <span className="rounded-full border border-[var(--agency-hairline)] px-2.5 py-1 text-[10px]">{tasks.length}</span>
            </h4>
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => updateEntity("tasks", task.id, { status: task.status === "termine" ? "a_faire" : "termine" })}
                  onEdit={updates => updateEntity("tasks", task.id, updates)}
                  onDelete={() => removeEntity("tasks", task.id)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <div className={cn(CARD, "p-12 text-center")}>
          <p className="text-sm text-[var(--agency-body)]">Aucune étape ne correspond à cette recherche.</p>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: () => void; onEdit: (u: Partial<Task>) => void; onDelete: () => void }) {
  return (
    <div className={cn(CARD, "p-4 transition-colors", task.status === "termine" ? "opacity-60" : "hover:border-[var(--agency-ink)]/20")}>
      <div className="flex items-center gap-3">
        <button onClick={onToggle} className="shrink-0 text-[var(--agency-eyebrow)] hover:text-[var(--agency-ink)]">
          {task.status === "termine" ? (
            <CheckCircle2 className="h-5 w-5 text-[var(--agency-ink)]" />
          ) : task.status === "en_cours" ? (
            <Clock className="h-5 w-5 text-[var(--agency-ink)]" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
        <input
          value={task.title}
          onChange={e => onEdit({ title: e.target.value })}
          className={cn("min-w-0 flex-1 bg-transparent text-[15px] outline-none text-[var(--agency-ink)]", task.status === "termine" && "line-through")}
        />
        <button onClick={onDelete} className="text-[var(--agency-eyebrow)] transition hover:text-[#B42318]">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 pl-8">
        <select
          value={task.priority}
          onChange={e => onEdit({ priority: e.target.value as Task["priority"] })}
          className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-1.5 text-[11px] outline-none focus:border-[var(--agency-ink)]/40"
        >
          <option value="haute">Très important</option>
          <option value="normale">Normal</option>
          <option value="basse">Peu important</option>
        </select>
        <input
          value={task.owner || ""}
          onChange={e => onEdit({ owner: e.target.value })}
          placeholder="Qui s'en charge ?"
          className="w-36 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-1.5 text-[11px] outline-none placeholder:text-[var(--agency-eyebrow)] focus:border-[var(--agency-ink)]/40"
        />
        {task.dueDate && (
          <span className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-1.5 text-[11px] text-[var(--agency-body)]">
            À faire avant le {new Date(task.dueDate).toLocaleDateString("fr-FR")}
          </span>
        )}
      </div>
    </div>
  );
}

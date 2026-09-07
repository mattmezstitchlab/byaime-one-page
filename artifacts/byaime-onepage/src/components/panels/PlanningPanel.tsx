import { useProject } from '@/store/project-store';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function PlanningPanel() {
  const { project, updateEntity } = useProject();
  if (!project) return null;

  const phases = ["12m+", "6-12m", "3-6m", "1-3m", "jour-j", "apres"] as const;
  const phaseLabels = {
    "12m+": "12 mois et +",
    "6-12m": "De 6 à 12 mois",
    "3-6m": "De 3 à 6 mois",
    "1-3m": "De 1 à 3 mois",
    "jour-j": "Le Jour J",
    "apres": "Après l'événement"
  };

  const tasksByPhase = phases.reduce((acc, phase) => {
    acc[phase] = project.tasks.filter(t => t.phase === phase);
    return acc;
  }, {} as Record<string, Task[]>);

  const toggleTask = (task: Task) => {
    const nextStatus = task.status === 'termine' ? 'a_faire' : 'termine';
    updateEntity('tasks', task.id, { status: nextStatus });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10">
      {phases.map(phase => {
        const tasks = tasksByPhase[phase];
        if (tasks.length === 0) return null;
        
        return (
          <div key={phase} className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
              <span>{phaseLabels[phase]}</span>
              <div className="h-px flex-1 bg-white/10" />
            </h4>
            
            <div className="space-y-2">
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                    task.status === 'termine' 
                      ? "bg-white/5 border-white/5 opacity-60" 
                      : "bg-white/10 border-white/10 hover:border-white/20"
                  )}
                  onClick={() => toggleTask(task)}
                >
                  <button className="shrink-0 text-white/40 hover:text-white transition-colors">
                    {task.status === 'termine' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : task.status === 'en_cours' ? (
                      <Clock className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium text-sm truncate transition-all",
                      task.status === 'termine' && "line-through"
                    )}>
                      {task.title}
                    </div>
                  </div>
                  
                  {task.priority === 'haute' && task.status !== 'termine' && (
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useProject } from '@/store/project-store';
import { getAssetUrl } from '@/lib/assets';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CommandBar } from './CommandBar';
import { UniversalTimeline } from './UniversalTimeline';
import { PlayMode } from './PlayMode';
import { BottomDock } from './BottomDock';
import { Images } from 'lucide-react';
import { cn } from '@/lib/utils';
import { filterTimeline, type TimelineView } from '@/lib/timeline-graph';
import { TimelineAudit } from './TimelineAudit';

export function ProjectStage() {
  const { project } = useProject();
  const [phase, setPhase] = useState<"tout" | "avant" | "pendant" | "apres">("tout");
  const [playMode, setPlayMode] = useState(false);
  const [layers, setLayers] = useState<string[]>([]);
  const [view, setView] = useState<TimelineView>("chronological");

  const pivotDate = project?.pivot.value ?? Date.now();
  const daysToPivot = Math.max(0, Math.ceil((pivotDate - Date.now()) / 86400000));

  const visibleEvents = useMemo(() => {
    if (!project) return [];
    return filterTimeline(project, view).filter(e => {
      // Phase filtering
      if (phase === 'avant' && e.phase !== 'avant') return false;
      if (phase === 'pendant' && e.phase !== 'pendant') return false;
      if (phase === 'apres' && e.phase !== 'apres') return false;

      // Layer filtering
      if (layers.length > 0 && !layers.includes(e.kind)) return false;

      return true;
    });
  }, [project, phase, layers, view]);

  const stats = useMemo(() => {
    if (!project) return { booked: 0, open: 0, engaged: 0 };
    const booked = project.providers.filter(p => p.status === 'reserve').length;
    const open = project.providers.filter(p => p.status === 'recherche').length;
    const engaged = project.payments.reduce((acc, p) => acc + p.amountCents, 0) / 100;

    return { booked, open, engaged };
  }, [project]);

  const nextTask = useMemo(() => {
    if (!project) return undefined;
    return project.tasks
      .filter(task => task.status !== 'termine')
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === 'haute' ? -1 : b.priority === 'haute' ? 1 : 0;
        return (a.dueDate ?? Number.MAX_SAFE_INTEGER) - (b.dueDate ?? Number.MAX_SAFE_INTEGER);
      })[0];
  }, [project]);

  if (!project) return null;

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-white/20 pb-32">
      {/* Cinematic Header */}
      <header className="relative isolate min-h-[75vh] w-full overflow-hidden flex flex-col justify-end pb-32 pt-28 px-6 md:px-12">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${getAssetUrl('images/visual-hotel-C8zQiMK2.jpg')})` }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-black/60 to-[#050505]" />
        <img src={getAssetUrl('logo.svg')} alt="AIME" className="absolute left-6 top-5 z-20 h-10 w-auto rounded-xl md:left-12" />

        <div className="relative z-20 w-full max-w-5xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-fit rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] backdrop-blur-md"
          >
            {project.universe}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-display font-medium tracking-tight"
          >
            {project.title}
          </motion.h1>

          {project.subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-2xl text-[15px] md:text-base leading-relaxed text-white/70 font-light"
            >
              {project.subtitle}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-2 text-[13px]"
          >
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
              {format(pivotDate, 'd MMMM yyyy', { locale: fr })}
            </span>
            {project.city.value && (
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
                {project.city.value}
              </span>
            )}
            {project.guestsCount.value && (
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
                {project.guestsCount.value} invités
              </span>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-2 pt-4"
          >
            <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs text-white/80">
              {stats.booked} professionnels confirmés
            </span>
            {stats.open > 0 && (
              <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs text-white/80">
                {stats.open} professionnels à trouver
              </span>
            )}
            {stats.engaged > 0 && (
              <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs text-white/80">
                {stats.engaged.toLocaleString('fr-FR')} € déjà prévus
              </span>
            )}
            <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs text-white/80">
              {daysToPivot > 0 ? `J-${daysToPivot}` : 'Date passée'}
            </span>

            {project.tasks.length > 0 && (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 px-3 py-1 text-xs font-medium ml-auto">
                {Math.round((project.tasks.filter(t => t.status === 'termine').length / project.tasks.length) * 100)}% complété
              </span>
            )}
          </motion.div>

          {nextTask && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 pt-6 border-t border-white/10"
            >
              <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Prochaine étape</div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 w-fit pr-8">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white/80" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{nextTask.title}</div>
                  <div className="text-xs text-white/40 mt-0.5">{nextTask.priority === 'haute' ? 'Très important' : nextTask.priority === 'basse' ? 'Peu important' : 'Importance normale'}{nextTask.dueDate ? ` · à faire avant le ${format(nextTask.dueDate, 'd MMMM', { locale: fr })}` : ''}</div>
                </div>
              </div>
            </motion.div>
          )}
          {project.missing.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-3 flex max-w-xl items-start gap-3 text-xs text-white/55">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
              <span><span className="text-white/75">Suggestion AIME :</span> préciser {project.missing[0]}{project.missing.length > 1 ? ` et ${project.missing.length - 1} autre${project.missing.length > 2 ? 's' : ''}` : ''} pour que la suite se passe bien.</span>
            </motion.div>
          )}
        </div>
      </header>

      {/* Control Bar (sticky) */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4 overflow-x-auto hide-scrollbar">
          <div className="flex bg-white/10 p-1 rounded-full shrink-0">
            {[
              { id: 'tout', label: 'Tout' },
              { id: 'avant', label: 'Avant' },
              { id: 'pendant', label: 'Le Jour J' },
              { id: 'apres', label: 'Après' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPhase(p.id as any)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                  phase === p.id ? "bg-white text-black" : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setPlayMode(true)}
              className="px-4 py-2 rounded-full border border-white/20 text-xs font-medium hover:bg-white hover:text-black transition-colors flex items-center gap-2"
            >
              <Images className="w-3 h-3" />
              Play
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-6 pb-3 hide-scrollbar">
          {([
            ["chronological", "Dans l’ordre"], ["day-of", "Jour J"], ["person", "Personnes"], ["provider", "Professionnels"],
            ["music", "Musique"], ["logistics", "Organisation"], ["collaborative", "En équipe"], ["memories", "Souvenirs"],
          ] as Array<[TimelineView, string]>).map(([id, label]) => <button key={id} onClick={() => setView(id)} className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px]", view === id ? "border-white bg-white text-black" : "border-white/10 text-white/55 hover:text-white")}>{label}</button>)}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="w-full">
        <UniversalTimeline events={visibleEvents} />
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-32">
          <TimelineAudit />
        </div>
      </main>

      <CommandBar setPhase={setPhase} setLayers={setLayers} />
      <BottomDock />

      {playMode && <PlayMode events={visibleEvents} onClose={() => setPlayMode(false)} />}
    </div>
  );
}

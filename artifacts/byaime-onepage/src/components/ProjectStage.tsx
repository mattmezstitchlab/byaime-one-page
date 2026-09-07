import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '@/store/project-store';
import { getAssetUrl } from '@/lib/assets';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CommandBar } from './CommandBar';
import { UniversalTimeline } from './UniversalTimeline';
import { PlayMode } from './PlayMode';
import { BottomDock } from './BottomDock';
import { Pencil, Link2, CalendarDays, Clock3, Images, Users, WalletCards, Music2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineEvent } from '@/lib/types';

export function ProjectStage() {
  const { project, updateProject } = useProject();
  const [phase, setPhase] = useState<"tout" | "avant" | "pendant" | "apres">("tout");
  const [playMode, setPlayMode] = useState(false);
  const [layers, setLayers] = useState<string[]>([]);
  
  if (!project) return null;

  const pivotDate = project.pivot.value;
  const daysToPivot = Math.max(0, Math.ceil((pivotDate - Date.now()) / 86400000));
  
  const visibleEvents = useMemo(() => {
    return project.timeline.filter(e => {
      // Phase filtering
      if (phase === 'avant' && e.time >= pivotDate) return false;
      if (phase === 'pendant' && (e.time < pivotDate || e.time >= pivotDate + 86400000)) return false;
      if (phase === 'apres' && e.time < pivotDate + 86400000) return false;
      
      // Layer filtering
      if (layers.length > 0 && !layers.includes(e.kind)) return false;
      
      return true;
    });
  }, [project.timeline, phase, layers, pivotDate]);

  const stats = useMemo(() => {
    const booked = project.providers.filter(p => p.status === 'choisi' || p.status === 'reserve').length;
    const open = project.providers.filter(p => p.status === 'a_rechercher' || p.status === 'suggestion').length;
    const engaged = project.payments.reduce((acc, p) => acc + p.amountCents, 0) / 100;
    
    return { booked, open, engaged };
  }, [project.providers, project.payments]);

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-white/20 pb-32">
      {/* Cinematic Header */}
      <header className="relative isolate min-h-[75vh] w-full overflow-hidden flex flex-col justify-end pb-32 pt-28 px-6 md:px-12">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${getAssetUrl('images/visual-hotel-C8zQiMK2.jpg')})` }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-black/60 to-[#050505]" />

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
            {project.guests.value && (
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
                {project.guests.value} invités
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
              {stats.booked} places pourvues
            </span>
            {stats.open > 0 && (
              <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs text-white/80">
                {stats.open} places à pourvoir
              </span>
            )}
            {stats.engaged > 0 && (
              <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs text-white/80">
                {stats.engaged.toLocaleString('fr-FR')} € engagés
              </span>
            )}
            <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs text-white/80">
              {daysToPivot > 0 ? `J-${daysToPivot}` : 'Date passée'}
            </span>
          </motion.div>
        </div>
      </header>

      {/* Control Bar (sticky) */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4 overflow-x-auto hide-scrollbar">
          {/* Phase Filter */}
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
      </div>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <UniversalTimeline events={visibleEvents} />
      </main>

      <CommandBar setPhase={setPhase} setLayers={setLayers} />
      <BottomDock />
      
      {playMode && <PlayMode events={visibleEvents} onClose={() => setPlayMode(false)} />}
    </div>
  );
}

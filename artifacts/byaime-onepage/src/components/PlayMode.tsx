import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TimelineEvent } from '@/lib/types';
import { X, Play, Pause, FastForward, Rewind, Check, Undo2, MapPin } from 'lucide-react';
import { useProject } from '@/store/project-store';
import { annotateDayRun, applyDayDelay, dayEventEnd, formatClock, formatCountdown, type DayMomentState } from '@/lib/day-run';
import { VendorVignette } from '@/components/DayRunTimeline';
import { PersonSpotlight } from '@/components/PersonSpotlight';
import { cn } from '@/lib/utils';

/*
 * « Lire la Timeline » : un diaporama contemplatif pour l'Avant et l'Après,
 * une régie d'orchestre pour le Jour J. La régie suit le direct (Moment en
 * cours, compte à rebours, avancement), permet de terminer un Moment et de
 * déclarer un retard qui décale toute la suite — les mêmes gestes honnêtes
 * que la timeline verticale, en plein écran.
 */
export function PlayMode({ events, onClose }: { events: TimelineEvent[], onClose: () => void }) {
  const isDayRun = events.length > 0 && events.every(event => event.phase === "pendant");

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  if (events.length === 0) return null;
  return isDayRun
    ? <DayConductor events={events} onClose={onClose} />
    : <Slideshow events={events} onClose={onClose} />;
}

function Slideshow({ events, onClose }: { events: TimelineEvent[], onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  // Filter out non-visual events if necessary, but we'll show everything in play mode
  const playableEvents = useMemo(
    () => [...events].sort((a, b) => a.time - b.time),
    [events],
  );

  useEffect(() => {
    let timer: number;
    if (playing && currentIndex < playableEvents.length - 1) {
      timer = window.setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 4000); // 4 seconds per slide
    } else if (currentIndex >= playableEvents.length - 1) {
      setPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [playing, currentIndex, playableEvents.length]);

  if (playableEvents.length === 0) return null;

  const currentEvent = playableEvents[currentIndex];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#FFFFFF] text-[#171410] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Lecture de la Timeline"
    >
      {/* Visual background related to event if we had images, fallback to a dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-black opacity-80" />
      
      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between p-6">
        <div className="text-[#171410]/60 text-xs tracking-[0.2em] uppercase font-medium">
          The Art of Connection
        </div>
        <button 
          onClick={onClose}
          aria-label="Fermer la lecture de la Timeline"
          className="p-2 rounded-full bg-[#171410]/10 hover:bg-[#171410]/20 text-[#171410] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bars */}
      <div className="relative z-10 flex gap-1 px-6 w-full max-w-4xl mx-auto mb-10">
        {playableEvents.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-[#171410]/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#171410]"
              initial={{ width: "0%" }}
              animate={{ width: idx < currentIndex ? "100%" : idx === currentIndex && playing ? "100%" : "0%" }}
              transition={{ duration: idx === currentIndex ? 4 : 0, ease: "linear" }}
            />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEvent.id}
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            <div className="text-[#171410]/50 text-sm tracking-widest uppercase mb-6 font-mono">
              {new Date(currentEvent.time).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </div>
            
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display text-[#171410] font-medium text-balance leading-tight mb-8">
              {currentEvent.title}
            </h2>
            
            {currentEvent.detail && (
              <p className="text-lg md:text-xl text-[#171410]/70 font-light leading-relaxed">
                {currentEvent.detail}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="relative z-10 flex items-center justify-center gap-6 p-8 pb-12">
        <button 
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          aria-label="Moment précédent"
          className="p-3 text-[#171410]/50 hover:text-[#171410] transition-colors"
        >
          <Rewind className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Mettre la lecture en pause" : "Reprendre la lecture"}
          className="w-16 h-16 rounded-full bg-[#171410] text-[#FFFFFF] flex items-center justify-center hover:scale-105 transition-transform"
        >
          {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </button>
        <button 
          onClick={() => setCurrentIndex(Math.min(playableEvents.length - 1, currentIndex + 1))}
          aria-label="Moment suivant"
          className="p-3 text-[#171410]/50 hover:text-[#171410] transition-colors"
        >
          <FastForward className="w-6 h-6" />
        </button>
      </div>
    </motion.div>
  );
}

const CONDUCTOR_STATE: Record<DayMomentState, { label: string; dot: string }> = {
  done: { label: "Terminé", dot: "bg-foreground/40" },
  live: { label: "En cours", dot: "bg-brand-accent animate-pulse" },
  late: { label: "À terminer", dot: "bg-brand-accent" },
  next: { label: "Suivant", dot: "bg-foreground/70" },
  upcoming: { label: "Prévu", dot: "bg-foreground/25" },
};

function DayConductor({ events, onClose }: { events: TimelineEvent[]; onClose: () => void }) {
  const { project, updateEntity, updateProject, canEdit } = useProject();
  const [now, setNow] = useState(() => Date.now());
  const [follow, setFollow] = useState(true);
  const [undo, setUndo] = useState<TimelineEvent[]>();
  const [spotlight, setSpotlight] = useState<string | null>(null);
  const snapshot = useMemo(() => annotateDayRun(events, now), [events, now]);
  const ordered = snapshot.ordered;
  const [currentId, setCurrentId] = useState<string>(() =>
    (snapshot.live ?? snapshot.next ?? snapshot.firstLate ?? ordered[0])?.id ?? "");
  const liveId = snapshot.live?.id;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (follow && liveId) setCurrentId(liveId);
  }, [follow, liveId]);

  if (ordered.length === 0 || !project) return null;
  const current = ordered.find(event => event.id === currentId) ?? ordered[0]!;
  const currentIndex = ordered.findIndex(event => event.id === current.id);
  const currentState = snapshot.states.get(current.id) ?? "upcoming";
  const providers = new Map(project.providers.map(item => [item.id, item]));
  const vendors = (current.relations ?? []).filter(relation => relation.kind === "provider")
    .map(relation => providers.get(relation.id))
    .filter((provider): provider is NonNullable<typeof provider> => !!provider);

  const goTo = (index: number) => {
    const target = ordered[Math.min(ordered.length - 1, Math.max(0, index))];
    if (target) {
      setFollow(false);
      setCurrentId(target.id);
    }
  };

  const applyDelay = (minutes: number) => {
    if (!canEdit) return;
    const { project: next, affectedIds } = applyDayDelay(project, current.id, minutes);
    if (affectedIds.length === 0) return;
    setUndo(project.timeline);
    updateProject({ timeline: next.timeline });
  };

  const finish = () => {
    if (canEdit) updateEntity("timeline", current.id, { status: "execute" });
  };

  const end = dayEventEnd(current);
  const countdownLabel =
    currentState === "live" ? `Se termine dans ${formatCountdown(end - now)}`
    : currentState === "late" ? `Dépassé — fin prévue à ${formatClock(end)}`
    : currentState === "done" ? "Moment terminé"
    : `Commence dans ${formatCountdown(current.time - now)}`;
  const progress = currentState === "live" && end > current.time
    ? Math.min(1, Math.max(0, (now - current.time) / (end - current.time)))
    : currentState === "done" ? 1 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="day-conductor"
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-[#FFFFFF] text-[#171410]"
      role="dialog"
      aria-modal="true"
      aria-label="Le Jour J"
    >
      <div className="flex items-center justify-between gap-4 p-5 sm:px-8">
        <p className="text-xs uppercase tracking-[.22em] text-[#171410]/55">
          Régie · Jour J · <span className="tabular-nums text-[#171410]/85">{formatClock(now)}:{String(new Date(now).getSeconds()).padStart(2, "0")}</span>
        </p>
        <button onClick={onClose} aria-label="Fermer la régie" className="rounded-full bg-[#171410]/10 p-2 text-[#171410] transition-colors hover:bg-[#171410]/20">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-5 pb-8 sm:px-8 lg:grid-cols-[1fr_300px]">
        {/* Moment orchestré */}
        <div className="flex flex-col justify-center rounded-3xl border border-[#171410]/10 bg-white/[.04] p-6 text-center sm:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <p className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[.2em] text-[#171410]/60">
                <span aria-hidden className={cn("h-2 w-2 rounded-full", CONDUCTOR_STATE[currentState].dot)} />
                {CONDUCTOR_STATE[currentState].label} · Moment {currentIndex + 1}/{ordered.length}
              </p>
              <p className="mt-4 font-display text-7xl font-semibold tabular-nums tracking-tight sm:text-8xl">{formatClock(current.time)}</p>
              <h2 className="mx-auto mt-4 max-w-2xl text-balance font-display text-3xl font-medium leading-tight sm:text-4xl">{current.title}</h2>
              {current.detail && <p className="mx-auto mt-3 max-w-xl text-sm font-light leading-relaxed text-[#171410]/60">{current.detail}</p>}
              <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#171410]/55">
                {(current.durationMinutes ?? 0) > 0 && <span>{current.durationMinutes} min</span>}
                {current.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{current.location}</span>}
                {(current.delayMinutes ?? 0) > 0 && <span className="text-brand-accent">Retard +{current.delayMinutes} min déclaré</span>}
              </p>
              {vendors.length > 0 && (
                <p className="mt-4 flex items-center justify-center">
                  {vendors.map((vendor, index) => <VendorVignette key={vendor.id} provider={vendor} index={index} onSelect={() => setSpotlight(vendor.id)} />)}
                </p>
              )}
              <p className="mt-5 font-display text-3xl font-semibold tabular-nums sm:text-4xl" aria-live="off">{countdownLabel}</p>
              <div className="mx-auto mt-4 h-1.5 max-w-md overflow-hidden rounded-full bg-[#171410]/10" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement du Moment">
                <div className="h-full rounded-full bg-brand-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Transport + régie */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} aria-label="Moment précédent" className="p-3 text-[#171410]/50 transition-colors hover:text-[#171410] disabled:opacity-25">
              <Rewind className="h-6 w-6" />
            </button>
            {canEdit && (currentState === "live" || currentState === "late") && (
              <button onClick={finish} className="inline-flex items-center gap-2 rounded-full bg-[#171410] px-5 py-3 text-sm font-medium text-[#FFFFFF] transition-transform hover:scale-105">
                <Check className="h-4 w-4" /> Terminer
              </button>
            )}
            <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex >= ordered.length - 1} aria-label="Moment suivant" className="p-3 text-[#171410]/50 transition-colors hover:text-[#171410] disabled:opacity-25">
              <FastForward className="h-6 w-6" />
            </button>
          </div>
          {canEdit && currentState !== "done" && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {[5, 15, 30].map(minutes => (
                <button
                  key={minutes}
                  onClick={() => applyDelay(minutes)}
                  title={`Ajouter un retard de ${minutes} min : ce Moment et toute la suite du déroulé glissent ensemble.`}
                  className="rounded-full border border-brand-accent/40 px-3 py-1.5 text-xs text-brand-accent transition hover:border-brand-accent/70"
                >
                  Retard +{minutes} min
                </button>
              ))}
              {undo && (
                <button onClick={() => { updateProject({ timeline: undo }); setUndo(undefined); }} className="inline-flex items-center gap-1.5 rounded-full border border-[#171410]/15 px-3 py-1.5 text-xs text-[#171410]/60 transition hover:text-[#171410]">
                  <Undo2 className="h-3.5 w-3.5" /> Annuler
                </button>
              )}
            </div>
          )}
          <p className="mt-5">
            <button
              type="button"
              role="switch"
              aria-checked={follow}
              onClick={() => setFollow(value => !value)}
              className={cn("rounded-full border px-3 py-1.5 text-xs transition", follow ? "border-[#171410]/50 text-[#171410]" : "border-[#171410]/15 text-[#171410]/45")}
            >
              Suivre le direct
            </button>
          </p>
        </div>

        {/* Déroulé : la suite des Moments */}
        <aside aria-label="Déroulé du Jour J" className="rounded-3xl border border-[#171410]/10 bg-white/[.03] p-4">
          <p className="px-2 pb-2 text-[10px] uppercase tracking-[.2em] text-[#171410]/45">{snapshot.doneCount}/{ordered.length} terminés</p>
          <ol className="max-h-[50vh] space-y-1 overflow-y-auto lg:max-h-none">
            {ordered.map((event, index) => {
              const state = snapshot.states.get(event.id) ?? "upcoming";
              const active = event.id === current.id;
              return (
                <li key={event.id}>
                  <button
                    onClick={() => goTo(index)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                      active ? "bg-[#171410]/10" : "hover:bg-[#171410]/5",
                      state === "done" && "opacity-55",
                    )}
                  >
                    <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", CONDUCTOR_STATE[state].dot)} />
                    <span className="w-12 shrink-0 font-display text-sm tabular-nums">{formatClock(event.time)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{event.title}</span>
                    {state === "done" && <Check className="h-3.5 w-3.5 shrink-0 text-foreground/60" />}
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
      <p className="px-6 pb-6 text-center text-[11px] text-[#171410]/35">Un retard décale toujours toute la suite du déroulé · Échap pour fermer</p>
      {spotlight && <PersonSpotlight person={{ kind: "provider", id: spotlight }} momentId={current.id} teamContacts={vendors.map(item => item.contact).filter((contact): contact is string => !!contact)} onClose={() => setSpotlight(null)} />}
    </motion.div>
  );
}

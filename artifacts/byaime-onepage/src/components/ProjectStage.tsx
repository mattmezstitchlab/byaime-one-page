import { useState, useMemo, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useProject } from '@/store/project-store';
import { getAssetUrl } from '@/lib/assets';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'wouter';
import { CommandBar } from './CommandBar';
import { UniversalTimeline } from './UniversalTimeline';
import { PlayMode } from './PlayMode';
import { BottomDock } from './BottomDock';
import { BookOpen, Bug, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Gift, Moon, Settings, Sun, UserCheck, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { filterTimeline, type TimelineView } from '@/lib/timeline-graph';
import { TimelineAudit } from './TimelineAudit';
import { CenteredBlock } from './CenteredBlock';
import type { Guest, Provider } from '@/lib/types';

const providerImages: Partial<Record<Provider['category'], string>> = {
  lieu: 'images/visual-venue-kJsZKZPp.jpg',
  traiteur: 'images/visual-food-BYGwGQGu.jpg',
  photo: 'images/visual-photo-C-yKtlRN.jpg',
  video: 'images/source/visual-video.jpg',
  fleuriste: 'images/source/visual-flower.jpg',
  musique: 'images/visual-music-BWv1eToA.jpg',
  tenue: 'images/source/visual-mode.jpg',
  beaute: 'images/visual-beaute-DJ6SEguK.jpg',
  transport: 'images/source/visual-transport.jpg',
};

const guestPortraitImages = [
  'images/visual-people-Dc5ifsnr.jpg',
  'images/source/home-ensemble.jpg',
  'images/source/home-reseau.jpg',
  'images/visual-event-D_L9Q-iW.jpg',
  'images/visual-scene-CMVk_6wW.jpg',
  'images/visual-photo-C-yKtlRN.jpg',
];

function ProviderPortrait({ provider, index = 0 }: { provider: Provider; index?: number }) {
  const image = providerImages[provider.category] || 'images/visual-service-DXmeWatY.jpg';
  return (
    <span
      className="relative block h-9 w-9 overflow-hidden rounded-full border-2 border-black bg-zinc-800"
      style={{ zIndex: 10 - index }}
      title={provider.name || provider.role}
    >
      <img src={getAssetUrl(image)} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

function GuestPortrait({ guest, index = 0, large = false }: { guest: Guest; index?: number; large?: boolean }) {
  const image = guestPortraitImages[index % guestPortraitImages.length];
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full border-[3px] border-black bg-zinc-900 shadow-xl",
        large ? "h-20 w-20 sm:h-24 sm:w-24" : "h-14 w-14"
      )}
      style={{ zIndex: 20 - index }}
      title={guest.name}
    >
      <img
        src={getAssetUrl(image)}
        alt={`Portrait de ${guest.name}`}
        className="h-full w-full scale-125 object-cover transition duration-500 hover:scale-[1.35]"
        style={{ objectPosition: `${30 + (index % 3) * 20}% center` }}
      />
    </span>
  );
}

export function ProjectStage() {
  const { project, projects, selectProject, updateProject, canEdit } = useProject();
  const [phase, setPhase] = useState<"tout" | "avant" | "pendant" | "apres">("tout");
  const [playMode, setPlayMode] = useState(false);
  const [layers, setLayers] = useState<string[]>([]);
  const [view, setView] = useState<TimelineView>("chronological");
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [appearance, setAppearance] = useState<"dark" | "light">(() => localStorage.getItem("aime-appearance") === "light" ? "light" : "dark");
  const [tasksOpen, setTasksOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [worldMenuOpen, setWorldMenuOpen] = useState(false);
  const [aimeMenuOpen, setAimeMenuOpen] = useState(false);
  const [countdownsOpen, setCountdownsOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [now, setNow] = useState(() => Date.now());
  const reduceMotion = useReducedMotion();

  const pivotDate = project?.pivot.value ?? Date.now();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.aimeTheme = appearance;
    localStorage.setItem("aime-appearance", appearance);
  }, [appearance]);

  useEffect(() => {
    if (!project) return;
    const pivot = new Date(project.pivot.value);
    setCalendarMonth(pivot);
    setSelectedDate(pivot);
  }, [project?.id, project?.pivot.value]);

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

  const countdownTargets = useMemo(() => {
    if (!project) return [];
    const targets = [
      ...(project.pivot.value > now ? [{ id: 'pivot', time: project.pivot.value, title: 'Le Jour J', kind: 'Date pivot' }] : []),
      ...project.tasks
        .filter(task => task.status !== 'termine' && task.dueDate && task.dueDate > now)
        .map(task => ({ id: `task-${task.id}`, time: task.dueDate as number, title: task.title, kind: 'Échéance' })),
      ...project.timeline
        .filter(event => event.time > now)
        .map(event => ({ id: `moment-${event.id}`, time: event.time, title: event.title, kind: 'Moment' })),
    ];
    return targets.sort((a, b) => a.time - b.time);
  }, [now, project]);

  const stats = useMemo(() => {
    if (!project) return { booked: 0, open: 0, engaged: 0 };
    const booked = project.providers.filter(p => p.status === 'reserve').length;
    const open = project.providers.filter(p => p.status === 'recherche').length;
    const engaged = project.payments.reduce((acc, p) => acc + p.amountCents, 0) / 100;

    return { booked, open, engaged };
  }, [project]);

  const completion = useMemo(() => {
    if (!project?.tasks.length) return 0;
    return Math.round((project.tasks.filter(task => task.status === 'termine').length / project.tasks.length) * 100);
  }, [project]);
  const subtitleIsRedundant = useMemo(() => {
    if (!project?.subtitle) return false;
    const normalize = (value: string) => value.toLocaleLowerCase('fr').replace(/[^a-zà-ÿ0-9]/g, '');
    const subtitle = normalize(project.subtitle);
    const title = normalize(project.title);
    const universe = normalize(project.universe);
    return subtitle === title || subtitle === universe || subtitle === `${universe}${new Date(pivotDate).getFullYear()}`;
  }, [pivotDate, project]);

  if (!project) return null;

  const dayEvents = project.timeline.filter(event => event.phase === "pendant").sort((a, b) => a.time - b.time);
  const liveEvent = dayEvents.find(event => event.time <= now && (event.endTime ?? event.time + (event.durationMinutes || 60) * 60000) > now);
  const nextDayEvent = dayEvents.find(event => event.time > now);
  const featuredDayEvent = liveEvent || nextDayEvent;
  const memoryCount = project.memories.length + project.media.length;
  const isPublicInfo = view === "public-info";
  const phaseHeroCopy = {
    tout: {
      eyebrow: project.universe,
      title: project.title,
      description: project.subtitle && !subtitleIsRedundant ? project.subtitle : undefined,
    },
    avant: {
      eyebrow: "Avant · Préparation",
      title: project.title,
      description: "Les décisions, les étapes, les personnes et tout ce qu’il reste à préparer avant le grand jour.",
    },
    pendant: {
      eyebrow: liveEvent ? "Le Jour J · En direct" : "Le Jour J · Programme",
      title: project.title,
      description: featuredDayEvent
        ? `${liveEvent ? "Maintenant" : "À venir"}${featuredDayEvent.location ? ` · ${featuredDayEvent.location}` : ""}${featuredDayEvent.responsible ? ` · ${featuredDayEvent.responsible}` : ""}`
        : "Le programme en direct apparaîtra ici dès que les Moments du Jour J seront reliés.",
    },
    apres: {
      eyebrow: "Après · Mémoire",
      title: project.title,
      description: memoryCount
        ? `${memoryCount} souvenir${memoryCount > 1 ? "s" : ""}, les messages et les images de celles et ceux qui ont partagé ce Moment.`
        : "Les souvenirs, remerciements et médias des invités trouveront ici leur place.",
    },
  }[phase];
  const heroCopy = isPublicInfo
    ? {
        eyebrow: "Informations pratiques",
        title: project.title,
        description: project.subtitle && !subtitleIsRedundant
          ? project.subtitle
          : "Les informations que ce Monde a choisi de rendre visibles aux personnes concernées.",
      }
    : phaseHeroCopy;
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 }),
  });
  const selectedDayEvents = project.timeline.filter(event => isSameDay(event.time, selectedDate));
  const nextCountdown = countdownTargets[0] || { id: 'pivot', time: pivotDate, title: 'Le Jour J', kind: 'Date pivot' };
  const distanceToNext = Math.max(0, nextCountdown.time - now);
  const nextDays = Math.floor(distanceToNext / 86400000);
  const nextHours = Math.floor((distanceToNext % 86400000) / 3600000);
  const nextMinutes = Math.floor((distanceToNext % 3600000) / 60000);
  const nextSeconds = Math.floor((distanceToNext % 60000) / 1000);
  const formatRemaining = (time: number) => {
    const distance = Math.max(0, time - now);
    const days = Math.floor(distance / 86400000);
    const hours = Math.floor((distance % 86400000) / 3600000);
    const minutes = Math.floor((distance % 3600000) / 60000);
    return days > 0 ? `${days} j · ${hours} h` : hours > 0 ? `${hours} h · ${minutes} min` : `${minutes} min`;
  };

  return (
    <div className="aime-page-shell relative min-h-screen bg-black text-white selection:bg-white/20 pb-32">
      {/* The temporal capsule changes the whole World, not only the Timeline. */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-black/88 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-5xl items-center justify-center px-6 py-3">
          <div className="absolute left-4 flex items-center gap-3 sm:left-6">
            <button type="button" onClick={() => setAimeMenuOpen(true)} className="text-xs font-medium tracking-[.32em] text-white/80 transition hover:text-white" aria-label="Ouvrir le menu AIME">AIME</button>
            <button
              type="button"
              onClick={() => setAppearance(value => value === "dark" ? "light" : "dark")}
              className="flex items-center gap-1.5 rounded-full border border-white/12 px-2.5 py-1.5 text-[8px] uppercase tracking-[.12em] text-white/50 transition hover:border-white/30 hover:text-white"
              aria-label={`Activer le mode ${appearance === "dark" ? "clair" : "sombre"}`}
            >
              {appearance === "dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              <span className="hidden sm:inline">{appearance === "dark" ? "Clair" : "Sombre"}</span>
            </button>
          </div>
          <div className="flex max-w-full overflow-x-auto rounded-full bg-white/10 p-1 hide-scrollbar">
            {[
              { id: 'tout', label: 'Tout' },
              { id: 'avant', label: 'Avant' },
              { id: 'pendant', label: 'Le Jour J' },
              { id: 'apres', label: 'Après' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setPhase(item.id as typeof phase);
                   if (view === "public-info") setView("chronological");
                }}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-medium uppercase tracking-[.14em] transition-colors",
                  phase === item.id ? "bg-white text-black" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cinematic Header */}
      <header className="relative isolate flex min-h-[75vh] w-full flex-col justify-start overflow-hidden px-6 pb-24 pt-32 sm:pt-40 md:px-12">
        <div
          data-preserve-color
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${getAssetUrl('images/visual-hotel-C8zQiMK2.jpg')})` }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-black/60 to-[#050505]" />
        <div className="relative z-20 mx-auto w-full max-w-5xl space-y-6">
          <motion.button
            type="button"
            onClick={() => setWorldMenuOpen(true)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] backdrop-blur-md transition hover:bg-white hover:text-black"
            aria-label="Choisir un Monde"
          >
            {heroCopy.eyebrow}
            <ChevronDown className="h-3 w-3" />
          </motion.button>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-display font-medium tracking-tight"
          >
            {heroCopy.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn("min-h-12 max-w-2xl text-[15px] font-light leading-relaxed text-white/70 md:text-base", !heroCopy.description && "invisible")}
          >
            {heroCopy.description || "Le Monde reste à la même place."}
          </motion.p>

          {(isPublicInfo || phase !== "apres") && <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex min-h-12 flex-wrap content-start gap-2 text-[13px]"
          >
            <button
              type="button"
              onClick={() => setCalendarOpen(true)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/10"
              aria-label="Ouvrir le calendrier du Monde"
            >
              <CalendarDays className="h-3.5 w-3.5 text-white/55" />
              {format(pivotDate, 'd MMMM yyyy', { locale: fr })}
            </button>
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
          </motion.div>}

          {!isPublicInfo && phase !== "apres" && <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-2 pt-4"
          >
            <Link
              href="/network"
              className="group flex items-center gap-2 py-1 pr-2 text-xs text-white/80 transition hover:text-white"
               aria-label={`Ouvrir le Registre, ${project.guests.length + project.providers.length} personnes et professionnels`}
            >
              <span className="flex -space-x-4 py-1">
                {project.guests.slice(0, 5).map((guest, index) => <GuestPortrait key={guest.id} guest={guest} index={index} />)}
                {project.guests.length === 0 && <span className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-black bg-white/10 text-[10px]">0</span>}
              </span>
               <span>{project.guests.length + project.providers.length} dans le Registre</span>
            </Link>
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
            <button
              type="button"
              onClick={() => setTasksOpen(true)}
              className="ml-auto grid h-14 w-14 shrink-0 place-items-center rounded-full p-[3px] transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ background: `conic-gradient(from -90deg, #ff375f 0deg, #ff9f0a ${completion * 1.2}deg, #ffe620 ${completion * 2.1}deg, #30d158 ${completion * 2.8}deg, #64d2ff ${completion * 3.25}deg, #bf5af2 ${completion * 3.6}deg, rgba(255,255,255,.14) ${completion * 3.6}deg 360deg)` }}
              aria-label={`Ouvrir les étapes, ${completion}% complété`}
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-black/90 text-[11px] font-medium tabular-nums text-white">{completion}%</span>
            </button>
          </motion.div>}

          {(isPublicInfo || phase === "tout" || phase === "avant") && <motion.button
            type="button"
            onClick={() => setCountdownsOpen(true)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 block w-full border-t border-white/10 pt-7 text-left transition hover:border-white/25"
            aria-label="Voir tous les comptes à rebours"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[.24em] text-white/42">Prochain compte à rebours · {nextCountdown.kind}</p>
              <p className="text-[10px] uppercase tracking-[.18em] text-white/28">Voir les {countdownTargets.length || 1} à venir</p>
            </div>
            <p className="mt-3 text-sm text-white/65">{nextCountdown.title}</p>
            {distanceToNext > 0 ? (
              <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2 font-display font-light tabular-nums text-white">
                {[
                  [nextDays, "jours"],
                  [nextHours, "heures"],
                  [nextMinutes, "minutes"],
                  [nextSeconds, "secondes"],
                ].map(([value, label]) => (
                  <span key={label} className="inline-flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl md:text-5xl">{String(value).padStart(2, "0")}</span>
                    <span className="text-[9px] uppercase tracking-[.16em] text-white/38">{label}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 font-display text-4xl font-light">Le Moment est arrivé</p>
            )}
          </motion.button>}
          {!isPublicInfo && phase === "pendant" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 border-t border-white/10 pt-7">
              <p className="text-[10px] uppercase tracking-[.24em] text-white/42">{liveEvent ? "En ce moment" : "Prochain Moment"}</p>
              {featuredDayEvent ? (
                <div className="mt-4 flex flex-wrap items-center gap-5">
                  <span className="font-display text-4xl font-light tabular-nums sm:text-5xl">{format(featuredDayEvent.time, "HH:mm")}</span>
                  <div><p className="text-base text-white/85">{featuredDayEvent.title}</p><p className="mt-1 text-xs text-white/40">{featuredDayEvent.location || "Lieu à préciser"}</p></div>
                </div>
              ) : <p className="mt-4 text-sm text-white/45">Ajoutez les Moments du Jour J pour activer le direct.</p>}
            </motion.div>
          )}
          {!isPublicInfo && phase === "apres" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-7">
              <div><p className="font-display text-3xl font-light">{project.memories.length}</p><p className="mt-1 text-[9px] uppercase tracking-[.16em] text-white/35">Souvenirs</p></div>
              <div><p className="font-display text-3xl font-light">{project.media.length}</p><p className="mt-1 text-[9px] uppercase tracking-[.16em] text-white/35">Médias</p></div>
              <div><p className="font-display text-3xl font-light">{project.messages.length}</p><p className="mt-1 text-[9px] uppercase tracking-[.16em] text-white/35">Messages</p></div>
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

      <nav aria-label="Vues du Monde" className="border-y border-white/8 bg-[#050505]">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-6 py-4 hide-scrollbar">
          {([
            ["chronological", "Dans l’ordre"], ["public-info", "Infos pratiques"], ["map", "Grille"], ["day-of", "Jour J"], ["person", "Invités"], ["provider", "Professionnels"],
            ["music", "Musique"], ["logistics", "Organisation"], ["collaborative", "En équipe"], ["memories", "Souvenirs"],
          ] as Array<[TimelineView, string]>).map(([id, label]) => id === "map" ? (
            <Link
              key={id}
              href="/network"
              className="shrink-0 whitespace-nowrap rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-[.13em] text-white/55 transition-colors hover:border-white/25 hover:text-white"
            >
              {label}
            </Link>
          ) : (
              <button
                key={id}
                onClick={() => {
                  setView(id);
                  if (id === "public-info") setPhase("tout");
                }}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[.13em] transition-colors",
                  view === id ? "border-white bg-white text-black" : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"
                )}
              >
                {label}
              </button>
            ))}
          <button type="button" onClick={() => setRsvpOpen(true)} className="shrink-0 whitespace-nowrap rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-[.13em] text-white/55 transition-colors hover:border-white/25 hover:text-white">
            Je participe
          </button>
          <button type="button" onClick={() => setFundOpen(true)} className="shrink-0 whitespace-nowrap rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-[.13em] text-white/55 transition-colors hover:border-white/25 hover:text-white">
            Cagnotte
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="w-full">
        {view === "person" && (
          <section className="overflow-hidden border-b border-white/8 bg-[#080808] px-6 py-20">
            <div className="mx-auto max-w-5xl">
              <div className="max-w-2xl">
                <p className="text-[10px] uppercase tracking-[.24em] text-white/32">Les personnes de ce Monde</p>
                <h2 className="mt-4 font-display text-4xl font-light tracking-tight text-white sm:text-6xl">Celles et ceux qui en font partie.</h2>
                <p className="mt-5 max-w-xl text-sm font-light leading-relaxed text-white/42">Invités pour un mariage, artistes pour un spectacle, membres pour une association ou collaborateurs pour une entreprise : le Kit adapte les rôles, pas les personnes.</p>
              </div>
              {project.guests.length ? (
                <div className="mt-14 flex flex-wrap items-end gap-x-2 gap-y-8 sm:gap-x-4">
                  {project.guests.map((guest, index) => (
                    <Link
                      key={guest.id}
                      href="/network"
                      className={cn("group flex flex-col items-center", index % 3 === 1 && "sm:translate-y-8")}
                      aria-label={`Ouvrir ${guest.name} dans le Registre`}
                    >
                      <span className="transition duration-300 group-hover:-translate-y-2 group-hover:scale-105"><GuestPortrait guest={guest} index={index} large /></span>
                      <span className="mt-3 max-w-24 truncate text-[10px] text-white/58 transition group-hover:text-white">{guest.name}</span>
                      <span className="mt-1 text-[8px] uppercase tracking-[.14em] text-white/24">{guest.role}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <Link href="/network" className="mt-12 block rounded-3xl border border-dashed border-white/15 px-8 py-12 text-center text-sm text-white/38 hover:border-white/30 transition-colors">Le Registre accueillera ici les personnes reliées à ce Monde.</Link>
              )}
            </div>
          </section>
        )}
        {view !== "map" && <UniversalTimeline events={visibleEvents} />}
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-32">
          <TimelineAudit />
        </div>
      </main>

      <CommandBar setPhase={setPhase} setLayers={setLayers} />
      <BottomDock phase={phase} view={view} onPhaseChange={nextPhase => {
        setPhase(nextPhase);
        if (view === "public-info") setView("chronological");
      }} onPlay={() => setPlayMode(true)} />

      {playMode && <PlayMode events={visibleEvents} onClose={() => setPlayMode(false)} />}
      {rsvpOpen && (
        <CenteredBlock eyebrow="Présence" title="Est-ce que vous participez ?" description="La réponse appartient à la personne et peut s’appliquer au Monde entier ou à certains Moments." onClose={() => setRsvpOpen(false)}>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Je participe", "Peut-être", "Je ne participe pas"].map((label, index) => (
              <button key={label} type="button" className="rounded-2xl border border-white/12 bg-white/[.035] px-4 py-6 text-sm text-white/75 transition hover:border-white/35 hover:bg-white/[.07]">
                <UserCheck className={cn("mx-auto mb-3 h-5 w-5", index === 1 ? "text-amber-200" : "text-white/45")} />{label}
              </button>
            ))}
          </div>
          <p className="mt-5 text-xs font-light leading-relaxed text-white/35">Une invitation personnelle reliera ensuite cette réponse au bon Profil et aux Moments auxquels il est invité.</p>
        </CenteredBlock>
      )}
      {fundOpen && (
        <CenteredBlock eyebrow="Soutenir ce Monde" title="Cagnotte" description="Un même espace pour contribuer à un projet, faire un don à une association ou rémunérer une personne depuis son Profil." onClose={() => setFundOpen(false)} leading={<span className="mt-4 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[.06]"><Gift className="h-5 w-5 text-white/65" /></span>}>
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center">
            <p className="text-sm text-white/65">Aucune cagnotte n’est ouverte pour le moment.</p>
            <p className="mt-2 text-xs font-light leading-relaxed text-white/35">Les montants, bénéficiaires, frais et conditions devront être affichés clairement avant d’activer un paiement réel.</p>
          </div>
        </CenteredBlock>
      )}
      {tasksOpen && (
        <CenteredBlock
          eyebrow="Progression du Monde"
          title={`${completion}% accompli`}
          description={`${project.tasks.filter(task => task.status === "termine").length} étape${project.tasks.filter(task => task.status === "termine").length > 1 ? "s" : ""} terminée${project.tasks.filter(task => task.status === "termine").length > 1 ? "s" : ""} sur ${project.tasks.length}.`}
          onClose={() => setTasksOpen(false)}
          size="lg"
          leading={
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full p-[3px]"
              style={{ background: `conic-gradient(from -90deg, #ff375f 0deg, #ff9f0a ${completion * 1.2}deg, #ffe620 ${completion * 2.1}deg, #30d158 ${completion * 2.8}deg, #64d2ff ${completion * 3.25}deg, #bf5af2 ${completion * 3.6}deg, rgba(255,255,255,.14) ${completion * 3.6}deg 360deg)` }}
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-[#0a0a0a] text-[11px] tabular-nums">{completion}%</span>
            </span>
          }
        >
          {project.tasks.length ? (
            <div className="divide-y divide-white/8">
              {[...project.tasks]
                .sort((a, b) => Number(a.status === "termine") - Number(b.status === "termine") || (a.dueDate ?? Number.MAX_SAFE_INTEGER) - (b.dueDate ?? Number.MAX_SAFE_INTEGER))
                .map(task => (
                  <div key={task.id} className="flex items-start gap-4 py-4">
                    <span className={cn("mt-1 h-3 w-3 shrink-0 rounded-full border", task.status === "termine" ? "border-white bg-white" : task.status === "en_cours" ? "border-amber-300 bg-amber-300/35" : "border-white/25")} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", task.status === "termine" ? "text-white/35 line-through" : "text-white/85")}>{task.title}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[.14em] text-white/30">
                        {task.priority === "haute" ? "Très important" : task.priority === "basse" ? "Peu important" : "Importance normale"}
                        {task.dueDate ? ` · ${format(task.dueDate, "d MMMM yyyy", { locale: fr })}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-white/35">Aucune étape n’a encore été créée.</p>
          )}
        </CenteredBlock>
      )}
      {worldMenuOpen && (
        <CenteredBlock eyebrow="Monde" title="Choisir un Monde" description="Chaque Monde organise une réalité différente tout en partageant votre Profil et vos relations." onClose={() => setWorldMenuOpen(false)} size="lg">
          <div className="divide-y divide-white/8">
            {projects.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id !== project.id) void selectProject(item.id);
                  setWorldMenuOpen(false);
                }}
                className="group flex w-full items-center gap-4 py-5 text-left"
              >
                <span className={cn("h-2.5 w-2.5 rounded-full border", item.id === project.id ? "border-white bg-white" : "border-white/25")} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-xl font-light text-white/85">{item.title}</span>
                  <span className="mt-1 block text-[9px] uppercase tracking-[.18em] text-white/32">{item.id === project.id ? `${project.universe} · Monde actif` : item.role}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-1 group-hover:text-white/55" />
              </button>
            ))}
          </div>
          <p className="mt-6 text-xs font-light leading-relaxed text-white/35">Le + universel accueillera ensuite la création de nouveaux Mondes et le choix de leur Kit.</p>
        </CenteredBlock>
      )}
      {calendarOpen && (
        <CenteredBlock eyebrow="Calendrier du Monde" title={format(calendarMonth, "MMMM yyyy", { locale: fr })} description="Le temps du Monde, ses Moments et sa date pivot réunis dans une seule vue." onClose={() => setCalendarOpen(false)} size="lg" leading={
          <span className="mt-4 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[.04]"><CalendarDays className="h-5 w-5 text-white/65" /></span>
        }>
          <div className="flex items-center justify-between border-y border-white/8 py-3">
            <button type="button" onClick={() => setCalendarMonth(month => subMonths(month, 1))} className="rounded-full p-2 text-white/45 transition hover:bg-white/8 hover:text-white" aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => setCalendarMonth(new Date(project.pivot.value))} className="text-[10px] uppercase tracking-[.18em] text-white/45 transition hover:text-white">Revenir au Moment pivot</button>
            <button type="button" onClick={() => setCalendarMonth(month => addMonths(month, 1))} className="rounded-full p-2 text-white/45 transition hover:bg-white/8 hover:text-white" aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1">
            {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <span key={`${day}-${index}`} className="pb-2 text-center text-[9px] uppercase tracking-[.14em] text-white/25">{day}</span>)}
            {calendarDays.map(day => {
              const momentCount = project.timeline.filter(event => isSameDay(event.time, day)).length;
              const isPivot = isSameDay(day, project.pivot.value);
              const isSelected = isSameDay(day, selectedDate);
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative aspect-square rounded-2xl text-sm transition",
                    !isSameMonth(day, calendarMonth) && "text-white/16",
                    isSameMonth(day, calendarMonth) && "text-white/58 hover:bg-white/[.06] hover:text-white",
                    isSelected && "bg-white text-black hover:bg-white hover:text-black",
                    isPivot && !isSelected && "ring-1 ring-inset ring-white/45"
                  )}
                >
                  {format(day, "d")}
                  {momentCount > 0 && <span className={cn("absolute bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full", isSelected ? "bg-black/55" : "bg-white/55")} />}
                </button>
              );
            })}
          </div>
          <div className="mt-6 grid gap-4 border-t border-white/8 pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="font-display text-2xl font-light capitalize">{format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}</p>
              <p className="mt-2 text-xs font-light text-white/38">{selectedDayEvents.length ? `${selectedDayEvents.length} Moment${selectedDayEvents.length > 1 ? "s" : ""} ce jour-là : ${selectedDayEvents.map(event => event.title).join(" · ")}` : "Aucun Moment n’est encore placé ce jour-là."}</p>
            </div>
            <button
              type="button"
              disabled={!canEdit || isSameDay(selectedDate, project.pivot.value)}
              onClick={() => {
                const current = new Date(project.pivot.value);
                const next = new Date(selectedDate);
                next.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
                updateProject({ pivot: { ...project.pivot, value: next.getTime() } });
                setCalendarOpen(false);
              }}
              className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black disabled:cursor-default disabled:opacity-25"
            >
              {isSameDay(selectedDate, project.pivot.value) ? "Date actuelle" : "Choisir comme date pivot"}
            </button>
          </div>
        </CenteredBlock>
      )}
      {countdownsOpen && (
        <CenteredBlock eyebrow="Temps du Monde" title="Tous les comptes à rebours" description="Les prochains rendez-vous, échéances, Moments et la date pivot, réunis sans les confondre avec la progression du Monde." onClose={() => setCountdownsOpen(false)} size="lg">
          {countdownTargets.length ? (
            <div className="divide-y divide-white/8">
              {countdownTargets.map((target, index) => (
                <article key={target.id} className="grid gap-3 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className={cn("grid h-9 w-9 place-items-center rounded-full text-xs tabular-nums", index === 0 ? "bg-white text-black" : "bg-white/[.05] text-white/40")}>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-sm text-white/82">{target.title}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-[.16em] text-white/30">{target.kind} · {format(target.time, "d MMMM yyyy · HH:mm", { locale: fr })}</p>
                  </div>
                  <p className="font-display text-xl font-light tabular-nums text-white/60">{formatRemaining(target.time)}</p>
                </article>
              ))}
            </div>
          ) : <p className="py-10 text-center text-sm text-white/35">Aucun rendez-vous, Moment ou délai à venir.</p>}
        </CenteredBlock>
      )}
      {aimeMenuOpen && (
        <CenteredBlock eyebrow="AIME" title="Le point d’entrée" description="Comprendre le concept, apprendre à utiliser AIME, obtenir de l’aide ou retrouver les réglages globaux." onClose={() => setAimeMenuOpen(false)}>
          <div className="divide-y divide-white/8">
            <Link href="/profile" onClick={() => setAimeMenuOpen(false)} className="group flex items-center gap-4 py-5">
              <UserRound className="h-4 w-4 text-white/35" />
              <span className="flex-1"><span className="block text-[11px] uppercase tracking-[.18em] text-white/80">Profil</span><span className="mt-1 block text-xs font-light text-white/35">Voir la projection de votre identité, de vos Moments et de vos liens.</span></span>
              <ChevronRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-1" />
            </Link>
            <Link href="/concept" onClick={() => setAimeMenuOpen(false)} className="group flex items-center gap-4 py-5">
              <span className="flex-1"><span className="block text-[11px] uppercase tracking-[.18em] text-white/80">Découvrir AIME</span><span className="mt-1 block text-xs font-light text-white/35">Profil, Monde, Kit et AI · + · ME.</span></span><ChevronRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-1" />
            </Link>
            <Link href="/concept#guides" onClick={() => setAimeMenuOpen(false)} className="group flex items-center gap-4 py-5">
              <BookOpen className="h-4 w-4 text-white/35" /><span className="flex-1 text-[11px] uppercase tracking-[.18em] text-white/70">Guides</span><ChevronRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-1" />
            </Link>
            <button type="button" onClick={() => { setAimeMenuOpen(false); window.dispatchEvent(new Event("aime:open-ai")); }} className="group flex w-full items-center gap-4 py-5 text-left">
              <Bug className="h-4 w-4 text-white/35" /><span className="flex-1"><span className="block text-[11px] uppercase tracking-[.18em] text-white/70">Remonter un problème</span><span className="mt-1 block text-xs font-light text-white/35">Décrire le problème à AIME sans quitter le Monde.</span></span><ChevronRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={() => { setAimeMenuOpen(false); window.dispatchEvent(new Event("aime:open-me")); }} className="group flex w-full items-center gap-4 py-5 text-left">
              <Settings className="h-4 w-4 text-white/35" /><span className="flex-1"><span className="block text-[11px] uppercase tracking-[.18em] text-white/70">Paramètres</span><span className="mt-1 block text-xs font-light text-white/35">Identité, confidentialité et préférences.</span></span><ChevronRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-1" />
            </button>
          </div>
          <div className="mt-6 border-t border-white/8 pt-5">
            <p className="text-[10px] uppercase tracking-[.16em] text-white/28">À structurer dans Paramètres</p>
            <p className="mt-2 text-xs font-light leading-relaxed text-white/38">Accessibilité conforme aux exigences européennes et choix de langue global. La traduction devra couvrir toute l’interface et les contenus générés, pas seulement changer une étiquette.</p>
          </div>
        </CenteredBlock>
      )}
    </div>
  );
}

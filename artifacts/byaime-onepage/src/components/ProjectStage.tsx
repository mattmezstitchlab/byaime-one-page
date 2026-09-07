import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useProject } from '@/store/project-store';
import { getAssetUrl } from '@/lib/assets';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CommandBar } from './CommandBar';
import { UniversalTimeline } from './UniversalTimeline';
import { PlayMode } from './PlayMode';
import { BottomDock } from './BottomDock';
import { Images, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { filterTimeline, type TimelineView } from '@/lib/timeline-graph';
import { TimelineAudit } from './TimelineAudit';
import { CenteredBlock } from './CenteredBlock';
import type { Provider } from '@/lib/types';

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

export function ProjectStage() {
  const { project } = useProject();
  const [phase, setPhase] = useState<"tout" | "avant" | "pendant" | "apres">("tout");
  const [playMode, setPlayMode] = useState(false);
  const [layers, setLayers] = useState<string[]>([]);
  const [view, setView] = useState<TimelineView>("chronological");
  const [providersOpen, setProvidersOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const pivotDate = project?.pivot.value ?? Date.now();
  const distanceToPivot = Math.max(0, pivotDate - now);
  const daysToPivot = Math.floor(distanceToPivot / 86400000);
  const hoursToPivot = Math.floor((distanceToPivot % 86400000) / 3600000);
  const minutesToPivot = Math.floor((distanceToPivot % 3600000) / 60000);
  const secondsToPivot = Math.floor((distanceToPivot % 60000) / 1000);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
  const isMiniSite = view === "mini-site";
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
      title: featuredDayEvent?.title || "Le mariage en direct",
      description: featuredDayEvent
        ? `${liveEvent ? "Maintenant" : "À venir"}${featuredDayEvent.location ? ` · ${featuredDayEvent.location}` : ""}${featuredDayEvent.responsible ? ` · ${featuredDayEvent.responsible}` : ""}`
        : "Le programme en direct apparaîtra ici dès que les Moments du Jour J seront reliés.",
    },
    apres: {
      eyebrow: "Après · Mémoire",
      title: "Notre histoire continue",
      description: memoryCount
        ? `${memoryCount} souvenir${memoryCount > 1 ? "s" : ""}, les messages et les images de celles et ceux qui ont partagé ce Moment.`
        : "Les souvenirs, remerciements et médias des invités trouveront ici leur place.",
    },
  }[phase];
  const heroCopy = isMiniSite
    ? {
        eyebrow: "Mini-site · Aperçu invités",
        title: project.title,
        description: project.subtitle && !subtitleIsRedundant
          ? project.subtitle
          : "Toutes les informations choisies pour accueillir les invités dans ce Monde.",
      }
    : phaseHeroCopy;

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-white/20 pb-32">
      {/* The temporal capsule changes the whole World, not only the Timeline. */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-black/88 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-5xl items-center justify-center px-6 py-3">
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
                  if (view === "mini-site") setView("chronological");
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
          <div className="absolute right-6 hidden items-center sm:flex">
            <button onClick={() => setPlayMode(true)} className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-medium transition-colors hover:bg-white hover:text-black">
              <Images className="h-3 w-3" /> Play
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-2 px-6 pb-3">
          {([
            ["chronological", "Dans l’ordre"], ["mini-site", "Mini-site"], ["day-of", "Jour J"], ["person", "Personnes"], ["provider", "Professionnels"],
            ["music", "Musique"], ["logistics", "Organisation"], ["collaborative", "En équipe"], ["memories", "Souvenirs"],
          ] as Array<[TimelineView, string]>).map(([id, label]) => <button key={id} onClick={() => { setView(id); if (id === "mini-site") setPhase("tout"); }} className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[.13em]", view === id ? "border-white bg-white text-black" : "border-white/10 text-white/55 hover:text-white")}>{label}</button>)}
        </div>
      </div>

      {/* Cinematic Header */}
      <header key={phase} className="relative isolate flex min-h-[75vh] w-full flex-col justify-end overflow-hidden px-6 pb-24 pt-28 md:px-12">
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
            {heroCopy.eyebrow}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-display font-medium tracking-tight"
          >
            {heroCopy.title}
          </motion.h1>

          {heroCopy.description && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-2xl text-[15px] md:text-base leading-relaxed text-white/70 font-light"
            >
              {heroCopy.description}
            </motion.p>
          )}

          {(isMiniSite || phase !== "apres") && <motion.div
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
          </motion.div>}

          {!isMiniSite && phase !== "apres" && <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-2 pt-4"
          >
            <button
              type="button"
              onClick={() => setProvidersOpen(true)}
              className="group flex items-center gap-2 py-1 pr-2 text-xs text-white/80 transition hover:text-white"
              aria-label={`Ouvrir le trombinoscope des prestataires, ${stats.booked} confirmés`}
            >
              <span className="flex -space-x-2">
                {project.providers.slice(0, 4).map((provider, index) => <ProviderPortrait key={provider.id} provider={provider} index={index} />)}
                {project.providers.length === 0 && <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white/10 text-[10px]">0</span>}
              </span>
              <span>{project.providers.length ? `${stats.booked}/${project.providers.length}` : 'Prestataires'}</span>
            </button>
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

          {(isMiniSite || phase === "tout" || phase === "avant") && <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 border-t border-white/10 pt-7"
          >
            <p className="text-[10px] uppercase tracking-[.24em] text-white/42">Jusqu’au moment</p>
            {distanceToPivot > 0 ? (
              <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2 font-display font-light tabular-nums text-white">
                {[
                  [daysToPivot, "jours"],
                  [hoursToPivot, "heures"],
                  [minutesToPivot, "minutes"],
                  [secondsToPivot, "secondes"],
                ].map(([value, label]) => (
                  <span key={label} className="inline-flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl md:text-5xl">{String(value).padStart(2, "0")}</span>
                    <span className="text-[9px] uppercase tracking-[.16em] text-white/38">{label}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 font-display text-4xl font-light">Le jour est arrivé</p>
            )}
          </motion.div>}
          {!isMiniSite && phase === "pendant" && (
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
          {!isMiniSite && phase === "apres" && (
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
      {providersOpen && (
        <CenteredBlock
          eyebrow="Réseau · Prestataires"
          title="Le trombinoscope"
          description="Toutes les personnes qui font avancer ce Monde, à portée immédiate."
          onClose={() => setProvidersOpen(false)}
          size="lg"
        >
          {project.providers.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {project.providers.map(provider => {
                const directHref = provider.contact
                  ? provider.contact.includes('@') ? `mailto:${provider.contact}` : `tel:${provider.contact.replace(/\s/g, '')}`
                  : null;
                return (
                  <article key={provider.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-4">
                    <ProviderPortrait provider={provider} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{provider.name || 'À identifier'}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[.16em] text-white/40">{provider.role}</p>
                    </div>
                    {directHref && (
                      <a href={directHref} className="rounded-full border border-white/15 p-2 text-white/55 transition hover:bg-white hover:text-black" aria-label={`Contacter ${provider.name || provider.role}`}>
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center">
              <p className="text-sm text-white/60">Aucun prestataire pour le moment.</p>
              <p className="mt-2 text-xs text-white/30">Ajoutez-les depuis ME pour retrouver ici leur visage et un accès direct.</p>
            </div>
          )}
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
    </div>
  );
}

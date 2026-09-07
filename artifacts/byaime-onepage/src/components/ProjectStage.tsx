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
  const [now, setNow] = useState(() => Date.now());

  const pivotDate = project?.pivot.value ?? Date.now();
  const distanceToPivot = Math.max(0, pivotDate - now);
  const daysToPivot = Math.floor(distanceToPivot / 86400000);
  const hoursToPivot = Math.floor((distanceToPivot % 86400000) / 3600000);
  const minutesToPivot = Math.floor((distanceToPivot % 3600000) / 60000);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
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

          {project.subtitle && !subtitleIsRedundant && (
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
            <button
              type="button"
              onClick={() => setProvidersOpen(true)}
              className="group flex items-center gap-2 rounded-full border border-white/20 bg-black/60 py-1 pl-1 pr-3 text-xs text-white/80 transition hover:border-white/45 hover:bg-white/10"
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
            <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs tabular-nums text-white/80">
              {distanceToPivot > 0 ? `${daysToPivot} J · ${String(hoursToPivot).padStart(2, '0')} H · ${String(minutesToPivot).padStart(2, '0')} MIN` : 'LE JOUR EST ARRIVÉ'}
            </span>

            <span
              className="ml-auto grid h-14 w-14 shrink-0 place-items-center rounded-full p-[3px]"
              style={{ background: `conic-gradient(from -90deg, #ff375f 0deg, #ff9f0a ${completion * 1.2}deg, #ffe620 ${completion * 2.1}deg, #30d158 ${completion * 2.8}deg, #64d2ff ${completion * 3.25}deg, #bf5af2 ${completion * 3.6}deg, rgba(255,255,255,.14) ${completion * 3.6}deg 360deg)` }}
              aria-label={`${completion}% complété`}
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-black/90 text-[11px] font-medium tabular-nums text-white">{completion}%</span>
            </span>
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
        <div className="relative mx-auto flex max-w-5xl items-center justify-center px-6 py-3">
          <div className="flex max-w-full overflow-x-auto bg-white/10 p-1 rounded-full hide-scrollbar">
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
                  "px-4 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-[.14em] transition-colors whitespace-nowrap",
                  phase === p.id ? "bg-white text-black" : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="absolute right-6 hidden items-center gap-2 sm:flex">
            <button
              onClick={() => setPlayMode(true)}
              className="px-4 py-2 rounded-full border border-white/20 text-xs font-medium hover:bg-white hover:text-black transition-colors flex items-center gap-2"
            >
              <Images className="w-3 h-3" />
              Play
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-2 px-6 pb-3">
          {([
            ["chronological", "Dans l’ordre"], ["day-of", "Jour J"], ["person", "Personnes"], ["provider", "Professionnels"],
            ["music", "Musique"], ["logistics", "Organisation"], ["collaborative", "En équipe"], ["memories", "Souvenirs"],
          ] as Array<[TimelineView, string]>).map(([id, label]) => <button key={id} onClick={() => setView(id)} className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[.13em]", view === id ? "border-white bg-white text-black" : "border-white/10 text-white/55 hover:text-white")}>{label}</button>)}
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
    </div>
  );
}

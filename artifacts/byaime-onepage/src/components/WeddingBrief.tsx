import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Compass, MapPin, Pause, Play, ReceiptText, RotateCcw, Sparkles } from "lucide-react";
import { useGetWeddingBrief, useGetWeddingBriefNearby, type WeddingBriefSegment, type WeddingBriefSource } from "@workspace/api-client-react";
import type { TimelineEvent, WorldProject } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContextPanel } from "@/components/ContextPanel";

const kindMeta = {
  transition: { label: "Introduction", icon: Sparkles },
  fact: { label: "Fait confirmé", icon: CheckCircle2 },
  calculation: { label: "Calcul sourcé", icon: ReceiptText },
  alert: { label: "À regarder", icon: AlertTriangle },
  suggestion: { label: "Conseil", icon: Compass },
} as const;

export function WeddingBrief({
  project,
  onOpenMoment,
}: {
  project: WorldProject;
  onOpenMoment: (event: TimelineEvent) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedSource, setSelectedSource] = useState<WeddingBriefSegment>();
  const [locationConsent, setLocationConsent] = useState(false);
  const briefQuery = useGetWeddingBrief(project.id);
  const nearbyRequest = useGetWeddingBriefNearby();

  if (briefQuery.isLoading) {
    return (
      <section aria-labelledby="wedding-brief-loading" className="rounded-[2rem] border border-foreground/10 bg-card p-8 md:p-10">
        <p className="text-[9px] uppercase tracking-[.3em] text-foreground/35">Animatrice AIME · Avant</p>
        <h2 id="wedding-brief-loading" className="mt-3 text-2xl font-light">Préparation du point de situation…</h2>
        <div className="mt-8 h-2 w-2/3 animate-pulse rounded-full bg-foreground/10" />
        <div className="mt-3 h-2 w-1/2 animate-pulse rounded-full bg-foreground/10" />
      </section>
    );
  }

  if (briefQuery.isError || !briefQuery.data?.segments.length) {
    return (
      <section aria-labelledby="wedding-brief-error" className="rounded-[2rem] border border-foreground/10 bg-card p-8 md:p-10">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h2 id="wedding-brief-error" className="mt-4 text-2xl font-light">Le point de situation n’est pas disponible</h2>
        <p className="mt-3 text-sm font-light text-foreground/50">Vos Moments restent accessibles dans le Fil. Vous pouvez réessayer sans perdre vos informations.</p>
        <button type="button" onClick={() => briefQuery.refetch()} className="mt-6 inline-flex items-center gap-2 rounded-full border border-foreground/15 px-4 py-2 text-[10px] uppercase tracking-widest">
          <RotateCcw className="h-3.5 w-3.5" /> Réessayer
        </button>
      </section>
    );
  }

  const brief = briefQuery.data;
  const safeIndex = Math.min(index, brief.segments.length - 1);
  const segment = brief.segments[safeIndex];
  const meta = kindMeta[segment.kind];
  const Icon = meta.icon;
  const sourceCount = 1 + segment.supportingSources.length;
  const todayMatch = brief.segments.findIndex(item => item.at !== undefined && item.at >= brief.generatedAt);
  const todayIndex = todayMatch < 0 ? 0 : todayMatch;
  const nearby = locationConsent ? nearbyRequest.data : undefined;
  const showNearby = brief.role === "owner";

  const openSource = () => {
    if (segment.source.collection === "timeline") {
      const event = project.timeline.find(item => item.id === segment.source.id);
      if (event) {
        onOpenMoment(event);
        setPlaying(false);
        return;
      }
    }
    setSelectedSource(segment);
    setPlaying(false);
  };

  const move = (direction: -1 | 1) => {
    setPlaying(false);
    setIndex(value => (value + direction + brief.segments.length) % brief.segments.length);
  };

  return (
    <section aria-labelledby="wedding-brief-title" className="overflow-hidden rounded-[2rem] border border-foreground/10 bg-card">
      <div className={cn("grid min-h-[360px]", showNearby && "lg:grid-cols-[1.2fr_.8fr]")}>
        <div className="relative overflow-hidden p-7 md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(168,85,247,.16),transparent_42%),radial-gradient(circle_at_85%_80%,rgba(14,165,233,.10),transparent_45%)]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[.3em] text-foreground/40">Animatrice AIME · Avant</p>
                <h2 id="wedding-brief-title" className="mt-2 text-2xl font-light md:text-3xl">Point de situation</h2>
              </div>
              <span className="rounded-full border border-foreground/10 px-3 py-1.5 text-[9px] uppercase tracking-widest text-foreground/45">
                {safeIndex + 1} / {brief.segments.length}
              </span>
            </div>

            <div aria-live="polite" aria-atomic="true">
              <AnimatePresence mode="wait">
                <motion.div
                  key={segment.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
                  transition={{ duration: reducedMotion ? 0 : .35 }}
                  className="my-auto py-10"
                >
                  <div className="mb-5 flex items-center gap-2 text-[10px] uppercase tracking-[.18em] text-foreground/45">
                    <Icon className="h-4 w-4" /> {meta.label}
                  </div>
                  <h3 className="max-w-2xl text-2xl font-light leading-tight md:text-4xl">{segment.title}</h3>
                  <p className="mt-5 max-w-2xl text-sm font-light leading-7 text-foreground/60 md:text-base">{segment.narration}</p>
                  <button type="button" onClick={openSource} className="mt-7 rounded-full border border-foreground/15 px-4 py-2 text-[10px] uppercase tracking-widest text-foreground/65 transition hover:bg-foreground/5 hover:text-foreground">
                    Ouvrir {sourceCount > 1 ? `${sourceCount} sources` : `la source · ${segment.source.label}`}
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => move(-1)} aria-label="Séquence précédente" className="grid h-11 w-11 place-items-center rounded-full border border-foreground/10 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"><ArrowLeft className="h-4 w-4" /></button>
              <button
                type="button"
                aria-label={reducedMotion ? "Séquence suivante" : playing ? "Mettre la lecture automatique en pause" : "Démarrer la lecture automatique"}
                onClick={() => reducedMotion ? move(1) : setPlaying(value => !value)}
                className="flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-[10px] font-semibold uppercase tracking-widest text-background"
              >
                {reducedMotion ? <ArrowRight className="h-3.5 w-3.5" /> : playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {reducedMotion ? "Suivant" : playing ? "Pause" : "Lecture auto"}
              </button>
              <button type="button" onClick={() => move(1)} aria-label="Séquence suivante" className="grid h-11 w-11 place-items-center rounded-full border border-foreground/10 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"><ArrowRight className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setPlaying(false); setIndex(0); }} className="hidden text-[9px] uppercase tracking-widest text-foreground/40 hover:text-foreground sm:block">Début</button>
              <button type="button" onClick={() => { setPlaying(false); setIndex(todayIndex); }} className="hidden text-[9px] uppercase tracking-widest text-foreground/40 hover:text-foreground sm:block">Aujourd’hui</button>
              <label className="ml-auto hidden items-center gap-2 text-[9px] uppercase tracking-widest text-foreground/40 sm:flex">
                Moment
                <select value={safeIndex} onChange={event => { setPlaying(false); setIndex(Number(event.target.value)); }} className="rounded-full border border-foreground/10 bg-background px-3 py-2 text-[10px] normal-case tracking-normal text-foreground outline-none">
                  {brief.segments.map((item, itemIndex) => <option key={item.id} value={itemIndex}>{item.title}</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>

        {showNearby && (
          <aside className="border-t border-foreground/10 bg-foreground/[.025] p-7 lg:border-l lg:border-t-0 md:p-10">
            <div className="flex h-full flex-col">
              <MapPin className="h-5 w-5 text-foreground/40" />
              <h3 className="mt-5 text-xl font-light">Autour de votre Monde</h3>
              <p className="mt-3 text-xs font-light leading-6 text-foreground/45">
                {locationConsent && nearby?.location.label
                  ? `Catégories utiles autour de ${nearby.location.label}.`
                  : "AIME peut utiliser le lieu confirmé du Monde, sans suivre votre position."}
              </p>
              {brief.location.available ? (
                <button
                  type="button"
                  onClick={() => {
                    if (locationConsent) {
                      setLocationConsent(false);
                      nearbyRequest.reset();
                    } else {
                      setLocationConsent(true);
                      nearbyRequest.mutate({ id: project.id, data: { consent: true } });
                    }
                  }}
                  aria-pressed={locationConsent}
                  className={cn("mt-6 rounded-xl border px-4 py-3 text-left text-xs transition", locationConsent ? "border-violet-300/30 bg-violet-300/10 text-foreground" : "border-foreground/10 text-foreground/55 hover:bg-foreground/5")}
                >
                  {locationConsent ? "Lieu autorisé pour cette recherche" : "Utiliser le lieu confirmé de ce Monde"}
                </button>
              ) : (
                <p className="mt-6 rounded-xl border border-dashed border-foreground/10 p-4 text-xs leading-6 text-foreground/40">Confirmez d’abord une ville ou un lieu dans le Monde.</p>
              )}
              <div className="mt-6 space-y-2">
                {nearbyRequest.isPending && <p className="text-xs text-foreground/40">Recherche des catégories utiles…</p>}
                {nearbyRequest.isError && <p className="text-xs text-amber-600">La recherche locale est indisponible. Aucun résultat n’a été inventé.</p>}
                {nearby?.nearbyCategories.map(item => (
                  <div key={item.id} className="rounded-xl border border-dashed border-foreground/10 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-foreground/75">{item.label}</p>
                      <span className="text-[8px] uppercase tracking-widest text-amber-500">Non vérifié</span>
                    </div>
                    <p className="mt-1.5 text-[10px] leading-5 text-foreground/38">{item.reason}</p>
                  </div>
                ))}
              </div>
              <p className="mt-auto pt-6 text-[9px] leading-5 text-foreground/30">
                Ces catégories ne sont ni des partenaires, ni des réservations. Une source locale vérifiée sera nécessaire pour afficher des commerces et des distances.
              </p>
            </div>
          </aside>
        )}
      </div>

      {playing && !reducedMotion && (
        <motion.div key={segment.id} className="h-1 bg-gradient-to-r from-violet-400 to-sky-300" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 6, ease: "linear" }} onAnimationComplete={() => setIndex(value => (value + 1) % brief.segments.length)} />
      )}

      {selectedSource && (
        <ContextPanel eyebrow="Source autorisée" title={selectedSource.source.label} onClose={() => setSelectedSource(undefined)}>
          <div className="space-y-5">
            <p className="text-sm font-light leading-7 text-foreground/65">{selectedSource.narration}</p>
            {[selectedSource.source, ...selectedSource.supportingSources].map(source => <SourceCard key={`${source.collection}-${source.id}`} source={source} />)}
          </div>
        </ContextPanel>
      )}
    </section>
  );
}

function SourceCard({ source }: { source: WeddingBriefSource }) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/[.025] p-4 text-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-foreground/35">{source.collection}</p>
          <p className="mt-1 text-foreground/75">{source.label}</p>
        </div>
        {source.amountCents !== undefined && (
          <span className="text-right text-foreground/65">
            {(source.amountCents / 100).toLocaleString("fr-FR")} €
            <br />
            <span className="text-[9px] text-foreground/35">{source.paymentState === "paye" ? "Payé" : "À régler"}{source.recordedAt ? ` · ${new Date(source.recordedAt).toLocaleDateString("fr-FR")}` : ""}</span>
          </span>
        )}
      </div>
      <p className="mt-3 break-all text-[9px] text-foreground/25">{source.id}</p>
    </div>
  );
}
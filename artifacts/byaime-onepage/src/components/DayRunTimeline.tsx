import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Clock3, Film, MapPin, Undo2 } from "lucide-react";
import { useProject } from "@/store/project-store";
import type { Provider, ProviderCategory, TimelineEvent } from "@/lib/types";
import {
  annotateDayRun,
  applyDayDelay,
  dayEventEnd,
  formatClock,
  formatCountdown,
  formatRelativeDayDelay,
  type DayMomentState,
} from "@/lib/day-run";
import { AIME_VISUALS, getAssetUrl } from "@/lib/assets";
import { AimeOrb } from "@/components/AimeOrb";
import { PersonSpotlight } from "@/components/PersonSpotlight";
import { cn } from "@/lib/utils";

const vendorImages: Partial<Record<ProviderCategory, string>> = { ...AIME_VISUALS.providersByCategory };

const STATE_COPY: Record<DayMomentState, { label: string; pill: string; dot: string }> = {
  done: { label: "Terminé", pill: "border-foreground/15 bg-foreground/5 text-foreground/55", dot: "bg-foreground/35" },
  live: { label: "En cours", pill: "border-brand-accent/40 bg-brand-accent/10 text-brand-accent", dot: "bg-brand-accent animate-pulse" },
  late: { label: "À terminer", pill: "border-brand-accent/40 bg-brand-accent/10 text-brand-accent", dot: "bg-brand-accent" },
  next: { label: "Suivant", pill: "border-foreground/15 bg-foreground/5 text-foreground/80", dot: "bg-foreground/70" },
  upcoming: { label: "Prévu", pill: "border-foreground/15 bg-foreground/5 text-foreground/50", dot: "bg-foreground/25" },
};

/*
 * La timeline verticale du Jour J : le déroulé en régie, pas en cinéma. Les
 * horaires sont grands et tabulaires, chaque Moment montre les vignettes
 * rondes de ses prestataires, et la bande de tête porte le compte à rebours
 * du direct — armé en permanence, avec les boutons de retard qui décalent
 * toute la suite du déroulé. « Terminer » et les détails ouvrent le tiroir
 * existant : rien n'est réinventé, tout reste traçable.
 */
export function DayRunTimeline({ events, onOpen }: { events: TimelineEvent[]; onOpen: (id: string) => void }) {
  const { project, updateEntity, updateProject, canEdit } = useProject();
  const [now, setNow] = useState(() => Date.now());
  const [followLive, setFollowLive] = useState(true);
  const [undo, setUndo] = useState<{ timeline: TimelineEvent[]; label: string }>();
  const [spotlight, setSpotlight] = useState<{ providerId: string; eventId: string } | null>(null);
  const refs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const snapshot = useMemo(() => annotateDayRun(events, now), [events, now]);
  const liveId = snapshot.live?.id;

  useEffect(() => {
    if (!followLive || !liveId) return;
    refs.current.get(liveId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [followLive, liveId]);

  if (!project) return null;

  const providers = new Map<string, Provider>(project.providers.map(item => [item.id, item]));
  const vendorsFor = (event: TimelineEvent): Provider[] =>
    (event.relations ?? []).filter(relation => relation.kind === "provider")
      .map(relation => providers.get(relation.id))
      .filter((provider): provider is Provider => !!provider);

  const applyDelay = (eventId: string, minutes: number) => {
    if (!canEdit) return;
    const { project: next, affectedIds } = applyDayDelay(project, eventId, minutes);
    if (affectedIds.length === 0) return;
    setUndo({ timeline: project.timeline, label: `Retard +${minutes} min (${affectedIds.length} Moment${affectedIds.length > 1 ? "s" : ""} décalé${affectedIds.length > 1 ? "s" : ""})` });
    updateProject({ timeline: next.timeline });
  };
  const cancelDelay = () => {
    if (!undo) return;
    updateProject({ timeline: undo.timeline });
    setUndo(undefined);
  };
  const finish = (eventId: string) => {
    if (canEdit) updateEntity("timeline", eventId, { status: "execute" });
  };

  if (snapshot.total === 0) return null;
  const allDone = snapshot.doneCount === snapshot.total;
  const totalDelay = snapshot.ordered.reduce((sum, event) => sum + Math.max(0, event.delayMinutes ?? 0), 0);

  const delayTarget = snapshot.live ?? snapshot.next ?? snapshot.firstLate;
  const delayButtons = delayTarget && canEdit && (
    <div className="flex flex-wrap items-center gap-2">
      {[5, 15, 30].map(minutes => (
        <button
          key={minutes}
          type="button"
          onClick={() => applyDelay(delayTarget.id, minutes)}
          title={`Ajouter un retard de ${minutes} min : ce Moment et toute la suite du déroulé glissent ensemble.`}
          className="rounded-full border border-brand-accent/40 px-3 py-1.5 text-xs text-brand-accent transition hover:border-brand-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50"
        >
          Retard +{minutes} min
        </button>
      ))}
      {undo && (
        <button
          type="button"
          onClick={cancelDelay}
          title={undo.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-3 py-1.5 text-xs text-foreground/60 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
        >
          <Undo2 className="h-3.5 w-3.5" /> Annuler le retard
        </button>
      )}
    </div>
  );

  return (
    <div data-testid="day-run" className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6">
      {/* ——— Bandeau du direct : le compte à rebours armé ——— */}
      <section data-testid="day-countdown" aria-live="off" className="rounded-3xl border border-foreground/10 bg-card p-5 shadow-xl sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <AimeOrb size={40} />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[.22em] text-foreground/45">Régie du Jour J</p>
              {allDone ? (
                <>
                  <h3 className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold"><Check className="h-5 w-5 text-brand-accent" /> Journée terminée</h3>
                  <p className="mt-1 text-xs text-foreground/50">{snapshot.total} Moments passés en revue{totalDelay > 0 ? ` · retard total déclaré : +${totalDelay} min` : " · aucun retard déclaré"}.</p>
                </>
              ) : snapshot.live ? (
                <>
                  <h3 className="mt-1 font-display text-2xl font-semibold leading-tight"><span className="mr-2 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-rose-400 align-middle" aria-hidden />{snapshot.live.title}</h3>
                  <p className="mt-1 text-xs text-foreground/50">
                    En cours · {formatRelativeDayDelay(snapshot.live.time - now)} · se termine {formatRelativeDayDelay(dayEventEnd(snapshot.live) - now)}
                    {snapshot.live.location ? ` · ${snapshot.live.location}` : ""}
                  </p>
                </>
              ) : snapshot.next ? (
                <>
                  <p className="mt-1 text-xs text-foreground/50">{snapshot.doneCount === 0 && snapshot.ordered[0]?.id === snapshot.next.id ? "Le Jour J commence dans" : "Prochain Moment"}</p>
                  <h3 className="mt-1 font-display text-2xl font-semibold leading-tight">{snapshot.next.title}</h3>
                  <p className="mt-1 text-xs text-foreground/50">{formatClock(snapshot.next.time)}{snapshot.next.location ? ` · ${snapshot.next.location}` : ""}</p>
                </>
              ) : snapshot.firstLate ? (
                <>
                  <h3 className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold"><AlertTriangle className="h-5 w-5 text-brand-accent" /> {snapshot.firstLate.title}</h3>
                  <p className="mt-1 text-xs text-foreground/50">Dépassé ({formatRelativeDayDelay(dayEventEnd(snapshot.firstLate) - now)}) : terminez-le ou déclarez un retard.</p>
                </>
              ) : null}
            </div>
          </div>
          {!allDone && (snapshot.live || snapshot.next) && (
            <p className="font-display text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl" aria-label="Compte à rebours">
              {snapshot.live ? formatCountdown(dayEventEnd(snapshot.live) - now) : formatCountdown((snapshot.next?.time ?? now) - now)}
            </p>
          )}
        </div>
        {!allDone && snapshot.live && <LiveProgress event={snapshot.live} now={now} />}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-4">
          {delayButtons}
          <div className="flex items-center gap-2">
            {canEdit && (snapshot.live ?? snapshot.firstLate) && (
              <button
                type="button"
                onClick={() => finish((snapshot.live ?? snapshot.firstLate!)!.id)}
                className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
              >
                Terminer ce Moment
              </button>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={followLive}
              onClick={() => setFollowLive(value => !value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
                followLive ? "border-foreground/40 text-foreground" : "border-foreground/15 text-foreground/45",
              )}
            >
              Suivre le direct
            </button>
          </div>
        </div>
      </section>

      {/* ——— Le déroulé vertical ——— */}
      <ol className="mt-8 space-y-3">
        {snapshot.ordered.map(event => {
          const state = snapshot.states.get(event.id) ?? "upcoming";
          const copy = STATE_COPY[state];
          const vendors = vendorsFor(event);
          return (
            <li key={event.id}>
              <div
                ref={node => { if (node) refs.current.set(event.id, node); else refs.current.delete(event.id); }}
                data-testid="day-moment"
                data-state={state}
                className={cn(
                  "relative flex gap-4 rounded-3xl border bg-card p-5 transition sm:gap-5 sm:p-6",
                  state === "live" ? "border-rose-300/40 shadow-[0_0_40px_rgba(251,113,133,.12)]" : "border-foreground/10",
                  state === "done" && "opacity-70",
                )}
              >
                <div className="w-[4.5rem] shrink-0 sm:w-24">
                  <p className="font-display text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">{formatClock(event.time)}</p>
                  {(event.durationMinutes ?? 0) > 0 && <p className="mt-1 flex items-center gap-1 text-[11px] text-foreground/45"><Clock3 className="h-3 w-3" />{event.durationMinutes} min</p>}
                </div>
                <span aria-hidden className={cn("mt-2 h-2.5 w-2.5 shrink-0 rounded-full", copy.dot)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[.14em]", copy.pill)}>{copy.label}</span>
                    {(event.delayMinutes ?? 0) > 0 && <span className="rounded-full border border-brand-accent/40 bg-brand-accent/10 px-2 py-0.5 text-[9px] uppercase tracking-[.14em] text-brand-accent">Retard +{event.delayMinutes} min</span>}
                  </div>
                  <h4 className="mt-2 text-lg font-medium leading-snug">{event.title}</h4>
                  {event.detail && <p className="mt-1 line-clamp-2 text-sm font-light text-foreground/55">{event.detail}</p>}
                  {event.location && <p className="mt-1.5 flex items-center gap-1.5 text-xs text-foreground/50"><MapPin className="h-3.5 w-3.5" />{event.location}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {vendors.length > 0 && (
                      <span className="flex items-center">
                        {vendors.map((vendor, index) => <VendorVignette key={vendor.id} provider={vendor} index={index} onSelect={() => setSpotlight({ providerId: vendor.id, eventId: event.id })} />)}
                      </span>
                    )}
                    {vendors.length === 0 && event.vendor && (
                      <span className="rounded-full border border-foreground/10 px-2.5 py-1 text-[11px] text-foreground/55">{event.vendor}</span>
                    )}
                    {event.visual?.url && event.visual.kind === "image" && (
                      <img src={event.visual.url} alt="" className="h-10 w-10 rounded-xl border border-foreground/10 object-cover" />
                    )}
                    {event.visual?.url && event.visual.kind === "video" && (
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 text-foreground/40"><Film className="h-4 w-4" /></span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canEdit && (state === "live" || state === "late") && (
                      <button type="button" onClick={() => finish(event.id)} className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50">
                        Terminer
                      </button>
                    )}
                    {canEdit && state !== "done" && (
                      <button
                        type="button"
                        onClick={() => applyDelay(event.id, 15)}
                        title="Ajouter un retard de 15 min : ce Moment et toute la suite du déroulé glissent ensemble."
                        className="rounded-full border border-brand-accent/40 px-3 py-1.5 text-xs text-brand-accent transition hover:border-brand-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50"
                      >
                        +15 min
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpen(event.id)}
                      className="rounded-full border border-foreground/15 px-3 py-1.5 text-xs text-foreground/60 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
                    >
                      Détails
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {spotlight && (() => {
        const target = snapshot.ordered.find(item => item.id === spotlight.eventId);
        const team = target ? vendorsFor(target).map(item => item.contact).filter((contact): contact is string => !!contact) : [];
        return <PersonSpotlight person={{ kind: "provider", id: spotlight.providerId }} momentId={spotlight.eventId} teamContacts={team} onClose={() => setSpotlight(null)} />;
      })()}
      <p className="mt-6 text-center text-[11px] text-foreground/35">{snapshot.doneCount}/{snapshot.total} Moments terminés · un retard décale toujours toute la suite, et s’annule d’un clic.</p>
    </div>
  );
}

function LiveProgress({ event, now }: { event: TimelineEvent; now: number }) {
  const end = dayEventEnd(event);
  const ratio = end > event.time ? Math.min(1, Math.max(0, (now - event.time) / (end - event.time))) : 1;
  return (
    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement du Moment en cours">
      <div className="h-full rounded-full bg-brand-accent transition-[width]" style={{ width: `${Math.round(ratio * 100)}%` }} />
    </div>
  );
}

export function VendorVignette({ provider, index, onSelect }: { provider: Provider; index: number; onSelect?: () => void }) {
  const image = vendorImages[provider.category] ?? AIME_VISUALS.universes.service;
  const label = `${provider.name || provider.role} · ${provider.category}`;
  const inner = <img src={getAssetUrl(image)} alt="" className="h-full w-full object-cover" />;
  if (!onSelect) {
    return (
      <span
        title={label}
        style={{ zIndex: 20 - index, marginLeft: index === 0 ? 0 : -10 }}
        className="relative block h-9 w-9 overflow-hidden rounded-full border-2 border-card bg-zinc-800"
      >
        {inner}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      title={label}
      aria-label={label}
      style={{ zIndex: 20 - index, marginLeft: index === 0 ? 0 : -10 }}
      className="relative block h-9 w-9 overflow-hidden rounded-full border-2 border-card bg-zinc-800 transition hover:scale-110 hover:border-brand-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
    >
      {inner}
    </button>
  );
}

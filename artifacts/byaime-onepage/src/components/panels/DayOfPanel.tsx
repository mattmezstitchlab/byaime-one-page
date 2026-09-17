import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, PlayCircle, Plus, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { useProject } from "@/store/project-store";
import type { TimelineEvent } from "@/lib/types";
import { analyzeEventImpact } from "@/lib/timeline-graph";
import { focusWorld } from "@/lib/world-focus";
import { useI18n } from "@/lib/i18n";
import {
  annotateDayRun,
  applyDayDelay,
  formatClock,
  formatCountdown,
  formatRelativeDayDelay,
} from "@/lib/day-run";
import { DayOfGuestEntry } from "./DayOfGuestEntry";
import { CARD, EYEBROW, PILL_SMALL, TITLE, LEAD } from "@/lib/site-design";
import { cn } from "@/lib/utils";

export function DayOfPanel() {
  const { project, updateProject, updateEntity, addEntity, removeEntity, canEdit, currentRole } = useProject();
  const { t, locale } = useI18n();
  const [pending, setPending] = useState<{ id: string; patch: Partial<TimelineEvent> }>();
  const [notice, setNotice] = useState("");
  /* Horloge de la régie : le compte à rebours doit bouger tout seul. */
  const [now, setNow] = useState(() => Date.now());
  /* Décalage de retard appliqué, gardé pour pouvoir l'annuler. */
  const [lastDelay, setLastDelay] = useState<{ snapshot: TimelineEvent[]; minutes: number }>();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  /*
   * L'orchestration du Jour J. Le moteur (`lib/day-run.ts`) existait déjà —
   * Moment en cours, suivant, en retard, compte à rebours, propagation d'un
   * retard — mais aucun panneau ne l'affichait : la Régie ne montrait qu'une
   * liste de champs. Le voici rendu, et recalculé chaque seconde.
   */
  const dayEvents = useMemo(
    () => (project?.timeline ?? []).filter(event => event.phase === "pendant"),
    [project?.timeline],
  );
  const snapshot = useMemo(() => annotateDayRun(dayEvents, now), [dayEvents, now]);

  if (!project) return null;
  const events = project.timeline.filter(event => event.phase === "pendant").sort((a, b) => a.time - b.time);
  const impact = pending ? analyzeEventImpact(project, pending.id, pending.patch) : undefined;
  const propose = (id: string, patch: Partial<TimelineEvent>) => setPending({ id, patch });
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
  const basePrefix = basePath === "/" ? "" : basePath;
  const logistics = project.logistics;
  const published = project.publicProfile?.published === true;
  const practicalReady = Boolean(
    project.venue.value?.trim() || logistics?.parking?.trim() || logistics?.accessibility?.trim() || logistics?.weatherFallback?.trim(),
  );

  /* Décale un Moment et toute la suite : le comportement de régie. */
  const pushDelay = (eventId: string, minutes: number) => {
    const before = project.timeline;
    const { project: next, affectedIds } = applyDayDelay(project, eventId, minutes);
    if (!affectedIds.length) return;
    setLastDelay({ snapshot: before, minutes });
    updateProject(next);
    setNotice(t("world.dayrun.delayDone", { count: affectedIds.length }));
  };

  const undoDelay = () => {
    if (!lastDelay) return;
    updateProject({ timeline: lastDelay.snapshot });
    setLastDelay(undefined);
    setNotice("");
  };

  const reference = snapshot.live ?? snapshot.firstLate ?? snapshot.next;
  const countdownLabel = snapshot.live
    ? t("world.dayrun.live")
    : snapshot.next
      ? `${t("world.dayrun.startsIn")} ${formatCountdown(snapshot.next.time - now)}`
      : t("world.dayrun.noLive");

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className={cn(CARD, "p-6")}>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className={EYEBROW}>Jour J</p>
            <h3 className={cn(TITLE, "mt-2 text-2xl")}>Le déroulé du Jour J</h3>
            <p className={cn(LEAD, "mt-2 text-sm")}>Les changements structurants sont prévisualisés avant application.</p>
          </div>
          {canEdit && (
            <button
              onClick={() =>
                addEntity("timeline", {
                  time: project.pivot.value,
                  durationMinutes: 60,
                  kind: "evenement",
                  title: "Nouveau temps fort",
                  status: "prepare",
                  confidence: "confirme",
                  phase: "pendant",
                  universe: project.universe,
                  provenance: "real",
                  visibility: "equipe",
                  relations: [],
                  dependencyIds: [],
                  resources: [],
                })
              }
              className={cn(PILL_SMALL, "bg-[var(--agency-ink)] text-[var(--agency-paper)] hover:opacity-85")}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </button>
          )}
        </div>
      </div>

      {/* ————— La régie : ce qui se passe maintenant ————— */}
      <section
        data-testid="dayof-run"
        aria-label={t("world.dayrun.eyebrow")}
        className={cn(CARD, "p-6")}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={EYEBROW}>{t("world.dayrun.eyebrow")}</p>
            <p data-testid="dayof-countdown" className="mt-2 font-display text-3xl tabular-nums text-[var(--agency-ink)]">
              {countdownLabel}
            </p>
          </div>
          <p className="rounded-full border border-[var(--agency-hairline)] px-4 py-1.5 text-xs tabular-nums text-[var(--agency-body)]">
            {t("world.dayrun.done")} · {snapshot.doneCount}/{snapshot.total}
          </p>
        </div>

        {reference ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { key: "live", event: snapshot.live, Icon: PlayCircle },
              { key: "next", event: snapshot.next, Icon: Clock3 },
              { key: "late", event: snapshot.firstLate, Icon: TriangleAlert },
            ].map(({ key, event, Icon }) => (
              <div
                key={key}
                data-testid={`dayof-slot-${key}`}
                className={cn(
                  "rounded-2xl border p-4",
                  key === "late" && event
                    ? "border-[#B42318]/30 bg-[#B42318]/[0.04]"
                    : "border-[var(--agency-hairline)] bg-[var(--agency-paper)]",
                )}
              >
                <p className={cn(EYEBROW, "flex items-center gap-1.5")}>
                  <Icon className="h-3 w-3" />
                  {t(`world.dayrun.${key}` as never)}
                </p>
                {event ? (
                  <>
                    <p className="mt-2 truncate text-sm font-medium text-[var(--agency-ink)]">{event.title}</p>
                    <p className="mt-1 text-xs tabular-nums text-[var(--agency-body)]">
                      {formatClock(event.time)}
                      {event.delayMinutes ? ` · ${formatRelativeDayDelay(-event.delayMinutes * 60_000, locale)}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-[var(--agency-eyebrow)]">—</p>
                )}
                {canEdit && event && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[15, 30, 60].map(minutes => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => pushDelay(event.id, minutes)}
                        title={t("world.dayrun.delayHint")}
                        className="rounded-full border border-[var(--agency-hairline)] px-2.5 py-1 text-[11px] tabular-nums text-[var(--agency-body)] transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
                      >
                        +{minutes} min
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--agency-hairline)] p-6 text-center">
            <p className="text-sm font-medium text-[var(--agency-ink)]">{t("world.dayrun.empty.title")}</p>
            <p className={cn(LEAD, "mx-auto mt-2 max-w-md text-xs")}>{t("world.dayrun.empty.desc")}</p>
            {canEdit && (
              <button
                type="button"
                data-testid="dayof-create-first"
                onClick={() =>
                  addEntity("timeline", {
                    time: project.pivot.value,
                    durationMinutes: 60,
                    kind: "evenement",
                    title: "Nouveau temps fort",
                    status: "prepare",
                    confidence: "confirme",
                    phase: "pendant",
                    universe: project.universe,
                    provenance: "real",
                    visibility: "equipe",
                    relations: [],
                    dependencyIds: [],
                    resources: [],
                  })
                }
                className={cn(PILL_SMALL, "mt-4 bg-[var(--agency-ink)] text-[var(--agency-paper)] hover:opacity-85")}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("world.dayrun.empty.cta")}
              </button>
            )}
          </div>
        )}

        {lastDelay && (
          <button
            type="button"
            data-testid="dayof-undo-delay"
            onClick={undoDelay}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--agency-hairline)] px-3 py-1.5 text-xs text-[var(--agency-body)] transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
          >
            <RotateCcw className="h-3 w-3" />
            {t("world.dayrun.undo")}
          </button>
        )}
      </section>

      <DayOfGuestEntry
        published={published}
        profileUrl={`${basePrefix}/profil/${project.id}`}
        canPublish={currentRole === "owner"}
        practicalReady={practicalReady}
        onPublish={() => {
          updateProject({ publicProfile: { ...project.publicProfile, published: true } });
          setNotice("Mini-site publié — enregistrement en cours");
        }}
        onHide={() => {
          updateProject({ publicProfile: { ...project.publicProfile, published: false } });
          setNotice("Mini-site masqué — enregistrement en cours");
        }}
        onCopy={() => {
          void navigator.clipboard.writeText(`${window.location.origin}${basePrefix}/profil/${project.id}`).then(() => setNotice("Lien du mini-site copié"));
        }}
        onEditPractical={() => focusWorld({ route: "/user-portal", panel: "logistics" })}
      />

      {notice && <p data-testid="dayof-guest-notice" role="status" className={cn(CARD, "px-4 py-3 text-xs text-[var(--agency-body)]")}>{notice}</p>}

      <div className="space-y-3">
        {events.map(event => (
          <div key={event.id} className={cn(CARD, "p-5")}>
            <div className="flex gap-3">
              <input
                disabled={!canEdit}
                type="time"
                value={new Date(event.time).toTimeString().slice(0, 5)}
                onChange={e => {
                  const [hours, minutes] = e.target.value.split(":").map(Number);
                  const date = new Date(event.time);
                  date.setHours(hours, minutes, 0, 0);
                  propose(event.id, { time: date.getTime() });
                }}
                className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-sm outline-none focus:border-[var(--agency-ink)]/40"
              />
              <input
                disabled={!canEdit}
                value={event.title}
                onChange={e => updateEntity("timeline", event.id, { title: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none text-[var(--agency-ink)]"
              />
              {canEdit && (
                <button onClick={() => removeEntity("timeline", event.id)} className="text-[var(--agency-eyebrow)] hover:text-[#B42318]">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                disabled={!canEdit}
                value={event.location || ""}
                onChange={e => propose(event.id, { location: e.target.value })}
                placeholder="Lieu"
                className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs outline-none placeholder:text-[var(--agency-eyebrow)]"
              />
              <input
                disabled={!canEdit}
                type="number"
                min="0"
                value={event.durationMinutes || 0}
                onChange={e => propose(event.id, { durationMinutes: Number(e.target.value) })}
                className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs outline-none"
              />
              <select
                disabled={!canEdit}
                value={event.status}
                onChange={e => updateEntity("timeline", event.id, { status: e.target.value })}
                className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs outline-none"
              >
                <option value="prepare">À préparer</option>
                <option value="execute">Terminé</option>
                <option value="bloque">Bloqué</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <section className={cn(CARD, "p-6")} aria-label="Les invités du Jour J">
        <p className={EYEBROW}>Les invités · une carte, une fiche</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {project.guests.map(guest => (
            <button
              key={guest.id}
              onClick={() => focusWorld({ route: "/user-portal", entityKind: "guest", entityId: guest.id })}
              className="flex items-center gap-3 rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-3 text-left transition hover:border-[var(--agency-ink)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] font-display text-sm uppercase text-[var(--agency-ink)]">
                {guest.name.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[var(--agency-ink)]">{guest.name}</span>
                <span className="block text-[10px] uppercase tracking-[0.14em] text-[var(--agency-eyebrow)]">
                  {guest.rsvp === "confirme" ? "Confirmé" : guest.rsvp === "decline" ? "Décliné" : "En attente"}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className={cn(CARD, "p-6")} aria-label="Les prestataires du Jour J">
        <p className={EYEBROW}>Les prestataires · une carte, une fiche</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {project.providers.map(provider => (
            <button
              key={provider.id}
              onClick={() => focusWorld({ route: "/user-portal", entityKind: "provider", entityId: provider.id })}
              className="flex items-center gap-3 rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-3 text-left transition hover:border-[var(--agency-ink)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] font-display text-sm uppercase text-[var(--agency-ink)]">
                {(provider.name || provider.role).charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[var(--agency-ink)]">{provider.name || provider.role}</span>
                <span className="block text-[10px] uppercase tracking-[0.14em] text-[var(--agency-eyebrow)]">
                  {provider.status === "reserve"
                    ? "Réservé"
                    : provider.status === "devis"
                      ? "Devis reçu"
                      : provider.status === "rencontre"
                        ? "Rencontré"
                        : provider.status === "contacte"
                          ? "Contacté"
                          : "En recherche"}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {pending && impact && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-xl rounded-[22px] border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 shadow-[0_24px_60px_-20px_rgba(23,20,16,0.3)]">
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--agency-ink)]">
            <AlertTriangle className="h-4 w-4" />
            Prévisualisation requise
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--agency-body)]">
            {impact.changed.join(", ")} · {impact.relations.length} entité(s) liée(s) · {impact.dependents.length} dépendance(s)
          </p>
          {impact.conflicts.map(conflict => (
            <p key={conflict.message} className="mt-1 text-xs text-[#B42318]">
              {conflict.message}
            </p>
          ))}
          <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--agency-eyebrow)]">
            Les entités liées et dépendances ne seront jamais déplacées silencieusement.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                updateEntity("timeline", pending.id, {
                  ...pending.patch,
                  propagation: { state: "applied", lastAppliedAt: Date.now(), sourceEventId: pending.id },
                });
                setPending(undefined);
              }}
              className="rounded-full bg-[var(--agency-ink)] px-4 py-2 text-xs font-medium text-[var(--agency-paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
            >
              Appliquer à l’événement seul
            </button>
            <button
              onClick={() => setPending(undefined)}
              className="rounded-full border border-[var(--agency-hairline)] px-4 py-2 text-xs text-[var(--agency-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

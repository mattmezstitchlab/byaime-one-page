import type { TimelineEvent, WorldProject } from "./types";

/*
 * Le moteur du Jour J : tout ce qui se calcule sans React — fin d'un Moment,
 * Moment en cours et suivant, compte à rebours, et décalage d'un retard sur
 * la suite du déroulé. Les composants (timeline verticale, régie plein écran)
 * ne font que le rendre.
 */

/** Durée d'affichage quand le Moment n'en déclare pas : un créneau de 30 min. */
export const DEFAULT_DAY_SLOT_MINUTES = 30;

export function dayEventEnd(event: TimelineEvent): number {
  if (event.endTime) return event.endTime;
  const minutes = event.durationMinutes ?? DEFAULT_DAY_SLOT_MINUTES;
  return event.time + Math.max(0, minutes) * 60_000;
}

export function sortDayEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => a.time - b.time);
}

export type DayMomentState = "done" | "live" | "late" | "next" | "upcoming";

export type DayRunSnapshot = {
  ordered: TimelineEvent[];
  states: Map<string, DayMomentState>;
  live?: TimelineEvent;
  next?: TimelineEvent;
  firstLate?: TimelineEvent;
  doneCount: number;
  total: number;
};

/*
 * Photographie du déroulé à l'instant `now`. Le Moment en cours est le
 * dernier Moment non terminé dont l'heure est passée et la fin pas encore
 * atteinte ; le suivant est le premier Moment non terminé à venir. Un Moment
 * non terminé dont la fin est dépassée est « late » : il attend d'être
 * terminé ou décalé, il ne disparaît jamais silencieusement.
 */
export function annotateDayRun(events: TimelineEvent[], now: number): DayRunSnapshot {
  const ordered = sortDayEvents(events);
  const states = new Map<string, DayMomentState>();
  let live: TimelineEvent | undefined;
  let next: TimelineEvent | undefined;
  let firstLate: TimelineEvent | undefined;
  let doneCount = 0;
  for (const event of ordered) {
    if (event.status === "execute") {
      states.set(event.id, "done");
      doneCount += 1;
      continue;
    }
    const end = dayEventEnd(event);
    if (event.time <= now && now < end) {
      states.set(event.id, "live");
      live = event;
      continue;
    }
    if (end <= now) {
      states.set(event.id, "late");
      firstLate ??= event;
      continue;
    }
    states.set(event.id, next ? "upcoming" : "next");
    next ??= event;
  }
  return { ordered, states, live, next, firstLate, doneCount, total: ordered.length };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Compte à rebours lisible : HH:MM:SS au-delà d'une heure, MM:SS en dessous. */
export function formatCountdown(delayMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(delayMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatClock(time: number): string {
  const date = new Date(time);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** « il y a 12 min », « dans 3 min », « dans 2 h 05 » : le recul humain. */
export function formatRelativeDayDelay(delayMs: number): string {
  const future = delayMs >= 0;
  const totalMinutes = Math.round(Math.abs(delayMs) / 60_000);
  if (totalMinutes < 1) return "maintenant";
  const body = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)} h ${pad2(totalMinutes % 60)}`
    : `${totalMinutes} min`;
  return future ? `dans ${body}` : `il y a ${body}`;
}

export type DayDelayResult = { project: WorldProject; affectedIds: string[] };

/*
 * Déclare un retard de `minutes` sur un Moment : le Moment et toute la suite
 * du déroulé (même phase, heure postérieure ou égale) glissent ensemble —
 * c'est le comportement de régie attendu, annoncé sur le bouton. Le Moment
 * source cumule le retard déclaré (`delayMinutes`) ; chaque Moment déplacé
 * porte la propagation « applied » traçable dans le tiroir. Pur : l'appelant
 * applique le projet retourné et garde l'ancien pour « Annuler ».
 */
export function applyDayDelay(project: WorldProject, eventId: string, minutes: number): DayDelayResult {
  const source = project.timeline.find(event => event.id === eventId);
  if (!source || !Number.isFinite(minutes) || minutes === 0) return { project, affectedIds: [] };
  const delta = Math.round(minutes * 60_000);
  const now = Date.now();
  const affectedIds: string[] = [];
  const timeline = project.timeline.map(event => {
    if (event.phase !== source.phase || event.time < source.time) return event;
    affectedIds.push(event.id);
    const shifted: TimelineEvent = {
      ...event,
      time: event.time + delta,
      ...(event.endTime ? { endTime: event.endTime + delta } : {}),
      propagation: { state: "applied", lastAppliedAt: now, sourceEventId: source.id },
    };
    if (event.id === source.id) shifted.delayMinutes = (event.delayMinutes ?? 0) + minutes;
    return shifted;
  });
  return { project: { ...project, timeline }, affectedIds };
}

import type { WorldProject } from "./types";

/**
 * La frise « Tout voir ».
 *
 * Une seule abscisse — le temps — et un couloir par nature de chose : Moments,
 * réponses des invités, tâches, documents, argent. Le but est de résumer tout
 * le Monde sans ouvrir six panneaux.
 *
 * La règle qui tient l'ensemble : **rien n'est placé sans date réelle.** Un
 * contrat sans date, un prestataire, un souvenir, un morceau de musique n'ont
 * pas d'abscisse honnête — ils partent dans la gouttière « non daté » avec leur
 * compte, au lieu d'être inventés à une date plausible. Une frise qui ment est
 * pire qu'une liste.
 *
 * Les agrégats (budget, comptes, J-x) ne sont pas des événements : ils vivent
 * dans un bandeau fixe, jamais comme des repères sur l'axe.
 */

export type FriseLane = "moments" | "invites" | "taches" | "documents" | "argent";

export const FRISE_LANES: { id: FriseLane; label: string }[] = [
  { id: "moments", label: "Moments" },
  { id: "invites", label: "Invités" },
  { id: "taches", label: "Tâches" },
  { id: "documents", label: "Documents" },
  { id: "argent", label: "Argent" },
];

export type FriseItem = {
  id: string;
  lane: FriseLane;
  time: number;
  label: string;
  /** Collection du Monde, pour ouvrir la fiche au clic. */
  collection?: string;
  sourceRef?: unknown;
  /** Phase d'un Moment : l'Avant, le Jour J et l'Après ne se colorent pas pareil. */
  phase?: string;
  /** Un paiement dû n'a pas le même poids visuel qu'un paiement réglé. */
  state?: string;
};

export type FriseUndated = {
  id: string;
  label: string;
  count: number;
  /** Panneau du Monde qui porte réellement ces éléments. */
  panel: string;
};

export type FriseStats = {
  daysLeft?: number;
  openTasks: number;
  engagedCents: number;
  paidCents: number;
  confirmedGuests: number;
  waitingGuests: number;
};

export type Frise = {
  items: FriseItem[];
  undated: FriseUndated[];
  stats: FriseStats;
};

const DAY = 86_400_000;

/** Une réponse RSVP datée, déjà résolue par le portail (aucune date inventée).
 * `guestId` est explicite : l'identifiant d'arrivée est composite, on ne le devine pas. */
export type FriseArrival = { id: string; guestId: string; guestName: string; time: number; status: string };

export function buildFrise(
  project: WorldProject,
  arrivals: FriseArrival[] = [],
  now: number = Date.now(),
): Frise {
  const items: FriseItem[] = [];

  for (const event of project.timeline) {
    if (!Number.isFinite(event.time)) continue;
    items.push({
      id: `moment-${event.id}`,
      lane: "moments",
      time: event.time,
      label: event.title,
      collection: "timeline",
      sourceRef: event,
      phase: event.phase,
    });
  }

  for (const arrival of arrivals) {
    if (!Number.isFinite(arrival.time)) continue;
    items.push({
      id: `rsvp-${arrival.id}`,
      lane: "invites",
      time: arrival.time,
      label: arrival.guestName,
      state: arrival.status,
    });
  }

  for (const task of project.tasks) {
    if (task.dueDate === undefined || !Number.isFinite(task.dueDate)) continue;
    items.push({
      id: `task-${task.id}`,
      lane: "taches",
      time: task.dueDate,
      label: task.title,
      collection: "tasks",
      sourceRef: task,
      state: task.status,
    });
  }

  for (const document of project.documents) {
    if (!Number.isFinite(document.at)) continue;
    items.push({
      id: `document-${document.id}`,
      lane: "documents",
      time: document.at,
      label: document.title,
      collection: "documents",
      sourceRef: document,
    });
  }

  for (const payment of project.payments) {
    /* Un paiement réglé se place à sa date de règlement ; un paiement dû à son
       échéance, sinon à sa date de saisie. Jamais à zéro. */
    const time = payment.state === "du" ? (payment.dueDate ?? payment.at) : payment.at;
    if (!Number.isFinite(time)) continue;
    items.push({
      id: `payment-${payment.id}`,
      lane: "argent",
      time,
      label: payment.label,
      collection: "payments",
      sourceRef: payment,
      state: payment.state,
    });
  }

  const answeredGuestIds = new Set(arrivals.map(arrival => arrival.guestId));
  const undated: FriseUndated[] = [
    { id: "providers", label: "Prestataires", count: project.providers.length, panel: "providers" },
    {
      id: "guests",
      label: "Invités sans réponse",
      count: project.guests.filter(guest => !answeredGuestIds.has(guest.id) && guest.rsvp !== "confirme").length,
      panel: "guests",
    },
    { id: "memories", label: "Souvenirs", count: project.memories.length, panel: "memories" },
    { id: "music", label: "Morceaux", count: project.music.length, panel: "music" },
    { id: "team", label: "Équipe", count: project.team.length, panel: "team" },
    {
      id: "tasks-undated",
      label: "Tâches sans échéance",
      count: project.tasks.filter(task => task.dueDate === undefined).length,
      panel: "planning",
    },
  ].filter(entry => entry.count > 0);

  const pivot = project.pivot.value;
  const stats: FriseStats = {
    ...(Number.isFinite(pivot) ? { daysLeft: Math.ceil((pivot - now) / DAY) } : {}),
    openTasks: project.tasks.filter(task => task.status !== "termine").length,
    engagedCents: project.providers.reduce((sum, provider) => sum + (provider.amountCents ?? 0), 0),
    paidCents: project.payments
      .filter(payment => payment.state === "paye")
      .reduce((sum, payment) => sum + payment.amountCents, 0),
    confirmedGuests: project.guests.filter(guest => guest.rsvp === "confirme").length,
    waitingGuests: project.guests.filter(guest => guest.rsvp === "en_attente").length,
  };

  return { items: items.sort((a, b) => a.time - b.time), undated, stats };
}

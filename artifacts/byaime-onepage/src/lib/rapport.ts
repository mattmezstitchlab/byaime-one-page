import type { WorldProject } from "./types";

/*
 * Le rapport présenté automatiquement.
 *
 * Promesse de la vitrine : « tout ce qui a été construit se présente
 * automatiquement ». Cette dérivation tient la promesse sans rien ressaisir :
 * elle lit le Monde tel qu'il est et en tire cinq sections — le déroulé du
 * Jour J, l'argent, les invités, les tâches, les documents.
 *
 * Règles héritées de la frise, vérifiées par test :
 *  - aucune date inventée : seules les dates réelles du modèle sont triées ;
 *  - une section vide disparaît : le rapport ne montre que ce qui existe ;
 *  - les agrégats restent des agrégats : des totaux, jamais des événements.
 */

export type RapportMoment = { id: string; time: number; title: string; location?: string };

export type RapportProvider = {
  id: string;
  name: string;
  role: string;
  status: string;
  amountCents?: number;
};

export type RapportBudget = {
  engagedCents: number;
  paidCents: number;
  dueCents: number;
  remainingCents: number;
  rows: RapportProvider[];
};

export type RapportInvites = {
  total: number;
  confirmed: number;
  waiting: number;
  declined: number;
};

export type RapportTaches = {
  total: number;
  done: number;
  open: number;
  late: number;
};

export type RapportDocument = { id: string; title: string; kind: string; at: number };

export type Rapport = {
  moments: RapportMoment[];
  budget: RapportBudget | null;
  invites: RapportInvites | null;
  tasks: RapportTaches | null;
  documents: RapportDocument[];
};

export function buildRapport(project: WorldProject, now: number = Date.now()): Rapport {
  /* ————— Le Jour J : les moments, triés par leur heure réelle ————— */
  const moments = project.timeline
    .filter(event => Number.isFinite(event.time))
    .map(event => ({ id: event.id, time: event.time, title: event.title, location: event.location }))
    .sort((a, b) => a.time - b.time);

  /* ————— L'argent : totaux et prestataires, du plus engagé au moins engagé ————— */
  const engagedCents = project.providers.reduce((sum, p) => sum + (p.amountCents ?? 0), 0);
  const paidCents = project.payments
    .filter(p => p.state === "paye")
    .reduce((sum, p) => sum + p.amountCents, 0);
  const dueCents = project.payments
    .filter(p => p.state === "du")
    .reduce((sum, p) => sum + p.amountCents, 0);

  const budget =
    project.providers.length > 0 || project.payments.length > 0
      ? {
          engagedCents,
          paidCents,
          dueCents,
          remainingCents: engagedCents - paidCents,
          rows: project.providers
            .map(p => ({
              id: p.id,
              name: p.name ?? p.role,
              role: p.role,
              status: p.status,
              amountCents: p.amountCents,
            }))
            .sort((a, b) => (b.amountCents ?? 0) - (a.amountCents ?? 0)),
        }
      : null;

  /* ————— Les invités : les statuts tels que posés, rien d'inféré ————— */
  const invites =
    project.guests.length > 0
      ? {
          total: project.guests.length,
          confirmed: project.guests.filter(g => g.rsvp === "confirme").length,
          waiting: project.guests.filter(g => g.rsvp === "en_attente").length,
          declined: project.guests.filter(g => g.rsvp === "decline").length,
        }
      : null;

  /* ————— Les tâches : closes, ouvertes, en retard sur leur échéance réelle ————— */
  const tasks =
    project.tasks.length > 0
      ? {
          total: project.tasks.length,
          done: project.tasks.filter(t => t.status === "termine").length,
          open: project.tasks.filter(t => t.status !== "termine").length,
          late: project.tasks.filter(
            t => t.status !== "termine" && t.dueDate !== undefined && t.dueDate < now,
          ).length,
        }
      : null;

  /* ————— Les documents : triés par leur date réelle ————— */
  const documents = project.documents
    .filter(d => Number.isFinite(d.at))
    .map(d => ({ id: d.id, title: d.title, kind: d.kind, at: d.at }))
    .sort((a, b) => a.at - b.at);

  return { moments, budget, invites, tasks, documents };
}

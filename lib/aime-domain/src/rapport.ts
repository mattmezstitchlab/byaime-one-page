/*
 * Le rapport présenté automatiquement — logique de domaine partagée.
 *
 * Vit ici (et non dans l'app) parce que deux consommateurs le servent :
 * l'espace privé (le planner le consulte) et l'API publique (le couple le
 * reçoit via une URL partagée). La source est structurelle : l'app y branche
 * son WorldProject, le serveur y branche la donnée stockée, sans que le
 * domaine ne connaisse ni l'un ni l'autre.
 *
 * Règles héritées de la frise, vérifiées par test :
 *  - aucune date inventée : seules les dates réelles du modèle sont triées ;
 *  - une section vide disparaît : le rapport ne montre que ce qui existe ;
 *  - les agrégats restent des agrégats : des totaux, jamais des événements.
 */

export type RapportSource = {
  timeline: { id: string; time: number; title: string; location?: string }[];
  tasks: { status: string; dueDate?: number }[];
  guests: { rsvp: string }[];
  documents: { id: string; title: string; kind: string; at: number }[];
  payments: { amountCents: number; state: string }[];
  providers: { id: string; name?: string; role: string; status: string; amountCents?: number }[];
};

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

export function buildRapport(source: RapportSource, now: number = Date.now()): Rapport {
  /* ————— Le Jour J : les moments, triés par leur heure réelle ————— */
  const moments = source.timeline
    .filter(event => Number.isFinite(event.time))
    .map(event => ({ id: event.id, time: event.time, title: event.title, location: event.location }))
    .sort((a, b) => a.time - b.time);

  /* ————— L'argent : totaux et prestataires, du plus engagé au moins engagé ————— */
  const engagedCents = source.providers.reduce((sum, p) => sum + (p.amountCents ?? 0), 0);
  const paidCents = source.payments
    .filter(p => p.state === "paye")
    .reduce((sum, p) => sum + p.amountCents, 0);
  const dueCents = source.payments
    .filter(p => p.state === "du")
    .reduce((sum, p) => sum + p.amountCents, 0);

  const budget =
    source.providers.length > 0 || source.payments.length > 0
      ? {
          engagedCents,
          paidCents,
          dueCents,
          remainingCents: engagedCents - paidCents,
          rows: source.providers
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
    source.guests.length > 0
      ? {
          total: source.guests.length,
          confirmed: source.guests.filter(g => g.rsvp === "confirme").length,
          waiting: source.guests.filter(g => g.rsvp === "en_attente").length,
          declined: source.guests.filter(g => g.rsvp === "decline").length,
        }
      : null;

  /* ————— Les tâches : closes, ouvertes, en retard sur leur échéance réelle ————— */
  const tasks =
    source.tasks.length > 0
      ? {
          total: source.tasks.length,
          done: source.tasks.filter(t => t.status === "termine").length,
          open: source.tasks.filter(t => t.status !== "termine").length,
          late: source.tasks.filter(
            t => t.status !== "termine" && t.dueDate !== undefined && t.dueDate < now,
          ).length,
        }
      : null;

  /* ————— Les documents : triés par leur date réelle ————— */
  const documents = source.documents
    .filter(d => Number.isFinite(d.at))
    .map(d => ({ id: d.id, title: d.title, kind: d.kind, at: d.at }))
    .sort((a, b) => a.at - b.at);

  return { moments, budget, invites, tasks, documents };
}

import { exportableDocuments } from "./document-tense";
import { TRAJECTORY_DISCLAIMER } from "./trajectory";
import type { Payment, Provider, TimelineEvent, WorldProject } from "./types";

/*
 * INTERMITTENTS : MÊME MOMENT, DEUX MONDES, UN CALENDRIER LÉGAL.
 *
 * Quand un musicien joue à un mariage, la prestation est UN Moment. La mariée
 * y voit un prestataire et un paiement ; le musicien y voit un emploi et des
 * heures. Personne ne copie rien : ce module lit le Monde et DÉRIVE.
 *
 * Ce qui est spécifique à l'emploi et ne doit pas fuir dans le modèle
 * Document générique :
 *  - des ÉCHÉANCES LÉGALES déduites du `time` de la prestation (déclaration
 *    préalable avant, déclaration unique + cotisations après). Ce sont des
 *    Moments `provenance: "suggested"`, `status: "a_valider"` : proposés,
 *    jamais imposés — le Monde ne les tient pour engagements qu'une fois
 *    adoptés (voir world-alerts.ts : une suggestion non adoptée n'est jamais
 *    « en retard ») ;
 *  - un COMPTEUR d'heures (12 h par cachet, 507 h sur 12 mois glissants) qui
 *    est une projection du PASSÉ : seuls les faits comptent — une facture
 *    rapprochée d'un paiement réglé, la même porte que l'export comptable.
 *
 * Les règles sont datées et sourcées ; elles se vérifient, elles ne se
 * garantissent pas (TRAJECTORY_DISCLAIMER). Aucune horloge implicite.
 */

export const INTERMITTENT_DISCLAIMER = TRAJECTORY_DISCLAIMER;

/** Date à laquelle les règles ci-dessous ont été relues. À revérifier au-delà d'un an. */
export const INTERMITTENT_RULES_DATE = "2026-09-18";
export const INTERMITTENT_RULES_SOURCE = "GUSO / France Travail — règles relues le 2026-09-18";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Heures créditées par cachet d'artiste. */
export const HOURS_PER_CACHET = 12;
/** Seuil d'ouverture des droits, en heures, sur la période de référence. */
export const HOURS_THRESHOLD = 507;
/** Période de référence glissante, en mois. */
export const REFERENCE_MONTHS = 12;
/** Déclaration préalable : possible jusqu'à un mois avant, au plus tard avant le début. */
export const PRIOR_DECLARATION_WINDOW_MS = 30 * DAY;
/** Déclaration unique et cotisations : au plus tard quinze jours après la fin du contrat. */
export const POST_DECLARATION_DELAY_MS = 15 * DAY;

export type EmploymentMode = NonNullable<Provider["employment"]>;

export type LegalDeadlineKind = "declaration_prealable" | "declaration_unique";

export type LegalDeadline = {
  kind: LegalDeadlineKind;
  providerId: string;
  /** La prestation dont cette échéance découle. */
  eventId: string;
  /** Date butoir légale. */
  dueAt: number;
  /** Moment suggéré pour s'en occuper (la veille pour l'avant, sous huit jours pour l'après). */
  suggestedAt: number;
  /** Ouverture de la fenêtre pendant laquelle la démarche est possible. */
  opensAt: number;
};

const eventEnd = (event: Pick<TimelineEvent, "time" | "endTime" | "durationMinutes">): number => {
  if (typeof event.endTime === "number" && event.endTime >= event.time) return event.endTime;
  if (typeof event.durationMinutes === "number" && event.durationMinutes > 0) return event.time + event.durationMinutes * 60_000;
  return event.time;
};

/** Les prestataires du Monde employés en cachet (déclarés au GUSO ou par une structure). */
export function employedProviders(project: Pick<WorldProject, "providers">): Provider[] {
  return project.providers.filter(provider => provider.employment === "guso" || provider.employment === "structure");
}

/** Les Moments réels (non suggérés) auxquels un prestataire est relié : ses prestations. */
export function prestationsFor(providerId: string, timeline: ReadonlyArray<TimelineEvent>): TimelineEvent[] {
  return timeline
    .filter(event => event.provenance !== "suggested")
    .filter(event => event.relations?.some(relation => relation.kind === "provider" && relation.id === providerId))
    .sort((a, b) => a.time - b.time);
}

/** Les deux échéances légales d'une prestation. */
export function deadlinesForPrestation(providerId: string, event: TimelineEvent): LegalDeadline[] {
  const end = eventEnd(event);
  return [
    {
      kind: "declaration_prealable",
      providerId,
      eventId: event.id,
      opensAt: event.time - PRIOR_DECLARATION_WINDOW_MS,
      dueAt: event.time,
      suggestedAt: event.time - DAY,
    },
    {
      kind: "declaration_unique",
      providerId,
      eventId: event.id,
      opensAt: end,
      dueAt: end + POST_DECLARATION_DELAY_MS,
      suggestedAt: end + 7 * DAY,
    },
  ];
}

/** Toutes les échéances légales du Monde, triées par date butoir. */
export function legalDeadlines(project: Pick<WorldProject, "providers" | "timeline">): LegalDeadline[] {
  return employedProviders(project)
    .flatMap(provider => prestationsFor(provider.id, project.timeline).flatMap(event => deadlinesForPrestation(provider.id, event)))
    .sort((a, b) => a.dueAt - b.dueAt);
}

/** Identifiant stable d'un Moment d'échéance : le même pour la même prestation, donc jamais dupliqué. */
export function deadlineMomentId(deadline: Pick<LegalDeadline, "kind" | "eventId" | "providerId">): string {
  return `legal-${deadline.kind}-${deadline.providerId}-${deadline.eventId}`;
}

/** Une échéance est déjà adoptée si un Moment portant son identifiant existe dans la Timeline. */
export function isDeadlineAdopted(deadline: LegalDeadline, timeline: ReadonlyArray<TimelineEvent>): boolean {
  const id = deadlineMomentId(deadline);
  return timeline.some(event => event.id === id);
}

const DEADLINE_TITLES: Record<LegalDeadlineKind, (provider: Provider) => string> = {
  declaration_prealable: provider => `Déclaration préalable · ${provider.name || provider.role}`,
  declaration_unique: provider => `Déclaration unique et cotisations · ${provider.name || provider.role}`,
};

const DEADLINE_DETAILS: Record<LegalDeadlineKind, string> = {
  declaration_prealable: "À faire avant le début de la prestation (possible dès un mois avant). Vaut déclaration préalable à l'embauche.",
  declaration_unique: "Déclaration unique cosignée et cotisations à régler dans les quinze jours suivant la fin du contrat.",
};

/**
 * Le Moment que propose AIME pour une échéance. Suggéré, à valider, privé :
 * le Monde ne le tient pour un engagement qu'une fois adopté. Relié à la
 * prestation (dépendance) et au prestataire (relation) — jamais une copie.
 */
export function deadlineToMoment(
  deadline: LegalDeadline,
  provider: Provider,
  prestation: TimelineEvent,
): TimelineEvent {
  return {
    id: deadlineMomentId(deadline),
    time: deadline.suggestedAt,
    endTime: deadline.dueAt,
    kind: "tache",
    title: DEADLINE_TITLES[deadline.kind](provider),
    detail: `${DEADLINE_DETAILS[deadline.kind]} ${INTERMITTENT_RULES_SOURCE}.`,
    status: "a_valider",
    confidence: "suggere",
    phase: deadline.kind === "declaration_prealable" ? "avant" : "apres",
    universe: prestation.universe,
    ownerId: prestation.ownerId,
    relations: [{ kind: "provider", id: provider.id, role: "employe" }],
    dependencyIds: [prestation.id],
    resources: [],
    provenance: "suggested",
    visibility: "prive",
    audience: [],
    propagation: { state: "none" },
  };
}

/** Les Moments d'échéance qu'il reste à proposer (ceux qui ne sont pas déjà dans la Timeline). */
export function pendingDeadlineMoments(project: Pick<WorldProject, "providers" | "timeline">): TimelineEvent[] {
  const providers = new Map(project.providers.map(provider => [provider.id, provider]));
  const events = new Map(project.timeline.map(event => [event.id, event]));
  return legalDeadlines(project)
    .filter(deadline => !isDeadlineAdopted(deadline, project.timeline))
    .flatMap(deadline => {
      const provider = providers.get(deadline.providerId);
      const prestation = events.get(deadline.eventId);
      return provider && prestation ? [deadlineToMoment(deadline, provider, prestation)] : [];
    });
}

/* ── Le compteur : une projection du passé ─────────────────────────── */

export type Cachet = {
  /** Le jour du cachet — la date du paiement réglé qui l'atteste. */
  at: number;
  amountCents: number;
  providerId?: string;
  documentId: string;
};

/**
 * Les cachets attestés d'un Monde : une facture rapprochée d'un paiement
 * réglé, pour un prestataire employé en cachet. Même porte que l'export
 * comptable : ce qui n'est pas un fait ne compte pas.
 */
export function attestedCachets(project: Pick<WorldProject, "providers" | "documents" | "payments">): Cachet[] {
  const employed = new Set(employedProviders(project).map(provider => provider.id));
  return exportableDocuments(project)
    .filter(document => document.providerId && employed.has(document.providerId))
    .map(document => {
      const settled = project.payments
        .filter((payment: Payment) => payment.state === "paye" && (payment.documentId === document.id || (!payment.documentId && payment.providerId === document.providerId)))
        .sort((a, b) => a.at - b.at);
      const last = settled[settled.length - 1];
      return {
        at: last?.at ?? document.at,
        amountCents: settled.reduce((sum, payment) => sum + payment.amountCents, 0),
        providerId: document.providerId,
        documentId: document.id,
      };
    })
    .sort((a, b) => a.at - b.at);
}

/** Début de la période de référence glissante qui se termine à `end`. */
export function referenceWindowStart(end: number, months: number = REFERENCE_MONTHS): number {
  const date = new Date(end);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.getTime();
}

export type HoursProjection = {
  cachets: number;
  hours: number;
  threshold: number;
  remainingHours: number;
  /** Nombre de cachets encore nécessaires pour atteindre le seuil. */
  remainingCachets: number;
  windowStart: number;
  windowEnd: number;
  rulesDate: string;
  disclaimer: string;
};

/**
 * Les heures acquises sur la période de référence qui se termine à `now`.
 * Chaque cachet vaut HOURS_PER_CACHET ; seuls les cachets attestés comptent.
 * C'est une projection, pas un droit : le disclaimer fait partie du résultat.
 */
export function hoursProjection(cachets: ReadonlyArray<Cachet>, now: number): HoursProjection {
  const windowStart = referenceWindowStart(now);
  const inWindow = cachets.filter(cachet => cachet.at > windowStart && cachet.at <= now);
  const hours = inWindow.length * HOURS_PER_CACHET;
  const remainingHours = Math.max(0, HOURS_THRESHOLD - hours);
  return {
    cachets: inWindow.length,
    hours,
    threshold: HOURS_THRESHOLD,
    remainingHours,
    remainingCachets: Math.ceil(remainingHours / HOURS_PER_CACHET),
    windowStart,
    windowEnd: now,
    rulesDate: INTERMITTENT_RULES_DATE,
    disclaimer: INTERMITTENT_DISCLAIMER,
  };
}

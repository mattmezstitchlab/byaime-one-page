import { addDays, addMonths, format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

import { CONFIDENCE_SHORT } from "./confidence";
import {
  annotateDayRun,
  applyDayDelay,
  formatClock,
  formatCountdown,
  type DayMomentState,
  type DayRunSnapshot,
} from "./day-run";
import { formatBudget, formatCents } from "./money";
import { createInitialProject, parseIntention } from "./parser";
import { groupByChapter } from "./timeline-chapters";
import {
  ENTITY_KIND_LABELS,
  applyPropagationPlan,
  buildTimelineIndex,
  filterTimeline,
  indexTimelineConflicts,
  planEventPropagation,
  roleCanSeeEntityKind,
  roleCanSeeEvent,
  type PropagationPlan,
  type RoleVisibility,
} from "./timeline-graph";
import { fact, type TimelineEntityKind, type TimelineEvent, type WorldProject } from "./types";

/*
 * La Bande : un seul écran, trois résolutions.
 *
 * Le constat du plan (§3, discussion du 14/09) : le graphe suffit comme **modèle**
 * et comme **moteur** — conflits, propagation, visibilité par rôle, régie du
 * Jour J — mais pas comme **interface**. Un mariage ne s'organise pas en
 * regardant des nœuds et des arcs, il s'organise dans le temps. La Bande projette
 * donc le graphe sur sa colonne vertébrale temporelle, à la résolution que la
 * date exige :
 *
 *   - `mois`        → la forme du mariage, chapitre par chapitre (J-730…J-30) ;
 *   - `engagements` → ce qui doit être vrai avant samedi (J-30…J-1) ;
 *   - `minutes`     → la régie du Jour J, avec le retard qui cascade.
 *
 * Ce fichier ne contient **aucune interface** : que des dérivations pures du
 * `WorldProject`, testables sans React, sans store et sans session. La page
 * (`pages/Bande.tsx`) ne fait que les rendre — la même séparation que
 * `day-run.ts` / `DayRunTimeline.tsx` et `public-shell.ts` / `App.tsx`.
 *
 * Rien n'est réinventé ici : les chapitres viennent de `timeline-chapters.ts`,
 * les conflits et la propagation de `timeline-graph.ts`, le Jour J de
 * `day-run.ts`, la phrase du `parser.ts` déjà utilisé par l'onboarding.
 */

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/* ————————————————————————————————————————————————
   1. Les trois résolutions
———————————————————————————————————————————————— */

export type BandeResolution = "mois" | "engagements" | "minutes";

export const RESOLUTIONS: ReadonlyArray<{
  id: BandeResolution;
  label: string;
  scale: string;
  hint: string;
}> = [
  {
    id: "mois",
    label: "Les mois",
    scale: "l'échelle de la forme",
    hint: "Tout le mariage d'un regard : les chapitres, les trous, ce qui s'empile. Glisser un Moment montre ce que ça décale avant de l'appliquer.",
  },
  {
    id: "engagements",
    label: "Les engagements",
    scale: "l'échelle des promesses",
    hint: "Ce qui doit être vrai avant samedi : acomptes, prestataires à verrouiller, réponses en attente. Dérivé du graphe, rien à ressaisir.",
  },
  {
    id: "minutes",
    label: "Les minutes",
    scale: "l'échelle du Jour J",
    hint: "Le déroulé minute par minute : ce qui est en cours, ce qui vient, ce qui est en retard — et le retard qui se reporte sur la suite.",
  },
];

export const RESOLUTION_LABELS: Record<BandeResolution, string> = {
  mois: "Les mois",
  engagements: "Les engagements",
  minutes: "Les minutes",
};

/** Fenêtre pendant laquelle la Bande passe en régie du Jour J : de la veille au surlendemain. */
export const DAY_OF_WINDOW_DAYS = { before: 1, after: 2 } as const;
/** Fenêtre pendant laquelle la Bande liste les engagements : le dernier mois. */
export const ENGAGEMENT_WINDOW_DAYS = 30;

/** Jours calendaires entre maintenant et le pivot (« J-365 », pas 364,2). */
export function daysUntil(pivotTime: number, now: number): number {
  return Math.round((startOfDay(pivotTime).getTime() - startOfDay(now).getTime()) / DAY);
}

/**
 * La résolution que la date impose. C'est le cœur de l'idée : l'écran ne change
 * pas parce que l'utilisateur clique ailleurs, il change parce que le mariage
 * approche. Le choix reste forçable — personne ne doit être empêché de regarder
 * le Jour J six mois avant.
 */
export function resolutionFor(pivotTime: number, now: number): BandeResolution {
  const days = daysUntil(pivotTime, now);
  if (days >= -DAY_OF_WINDOW_DAYS.after && days <= DAY_OF_WINDOW_DAYS.before) return "minutes";
  if (days > DAY_OF_WINDOW_DAYS.before && days <= ENGAGEMENT_WINDOW_DAYS) return "engagements";
  return "mois";
}

/* ————————————————————————————————————————————————
   2. La régie : quatre nombres, pas un tableau de bord
———————————————————————————————————————————————— */

export type RegieFigure = {
  id: "jours" | "argent" | "a-payer" | "invites" | "prestataires";
  label: string;
  value: string;
  detail: string;
  /** Une alerte n'est pas décorative : elle dit qu'une action est attendue. */
  alert?: boolean;
};

/** Têtes réellement attendues : un foyer peut porter plusieurs adultes et enfants. */
export function expectedGuests(project: WorldProject): number {
  if (project.guestsCount.value) return project.guestsCount.value;
  return project.guests.reduce((total, guest) => total + (guest.adults ?? 1) + (guest.children ?? 0), 0);
}

function headcount(guest: WorldProject["guests"][number]): number {
  return (guest.adults ?? 1) + (guest.children ?? 0);
}

/**
 * Les nombres qui tiennent sur une ligne, en haut de l'écran.
 *
 * Deux règles assumées :
 *  - l'argent engagé vient des prestataires (`amountCents`), l'argent déjà versé
 *    des paiements — les deux ne s'additionnent pas, un acompte payé est déjà
 *    dans le devis du prestataire ;
 *  - aucune figure n'est affichée si elle n'appelle pas une lecture : `alert`
 *    n'est posé que lorsqu'il y a réellement quelque chose à faire.
 */
export function buildRegie(project: WorldProject, now: number): RegieFigure[] {
  const pivot = project.pivot.value;
  const days = daysUntil(pivot, now);
  const currency = project.currency ?? "EUR";

  const engagedCents = project.providers.reduce((total, provider) => total + (provider.amountCents ?? 0), 0);
  const paidCents = project.payments
    .filter(payment => payment.state === "paye")
    .reduce((total, payment) => total + payment.amountCents, 0);
  const dueBeforePivot = project.payments.filter(payment => payment.state === "du" && payment.at <= pivot);
  const overdue = dueBeforePivot.filter(payment => payment.at < now);
  const budget = project.budget.value;

  const confirmed = project.guests
    .filter(guest => guest.rsvp === "confirme")
    .reduce((total, guest) => total + headcount(guest), 0);
  const pending = project.guests.filter(guest => guest.rsvp === "en_attente");
  const expected = expectedGuests(project);

  const locked = project.providers.filter(provider => provider.status === "reserve");

  return [
    {
      id: "jours",
      label: days === 0 ? "Jour J" : days < 0 ? "Depuis le Jour J" : "Jours restants",
      value: days === 0 ? "aujourd'hui" : days < 0 ? `${-days} j` : String(days),
      detail: format(pivot, "EEEE d MMMM yyyy", { locale: fr }),
    },
    {
      id: "argent",
      label: "Argent engagé",
      value: formatCents(engagedCents, currency),
      detail: budget ? `pour ${formatBudget(budget, currency)} annoncés · ${formatCents(paidCents, currency)} déjà versés` : `${formatCents(paidCents, currency)} déjà versés · budget non précisé`,
      alert: Boolean(budget) && engagedCents / 100 > (budget as number),
    },
    {
      id: "a-payer",
      label: "À payer avant le Jour J",
      value: formatCents(dueBeforePivot.reduce((total, payment) => total + payment.amountCents, 0), currency),
      detail: overdue.length === 1 ? "1 échéance dépassée" : overdue.length > 1 ? `${overdue.length} échéances dépassées` : "aucune échéance dépassée",
      alert: overdue.length > 0,
    },
    {
      id: "invites",
      label: "Invités confirmés",
      value: `${confirmed} / ${expected}`,
      detail: pending.length === 0 ? "toutes les réponses sont là" : `${pending.length} réponse${pending.length > 1 ? "s" : ""} en attente`,
      alert: pending.length > 0 && days <= 45 && days >= 0,
    },
    {
      id: "prestataires",
      label: "Prestataires verrouillés",
      value: `${locked.length} / ${project.providers.length}`,
      detail: project.providers.filter(provider => provider.status === "recherche").length > 0
        ? `${project.providers.filter(provider => provider.status === "recherche").length} encore en recherche`
        : "aucune recherche en cours",
      alert: project.providers.length > 0 && locked.length === 0,
    },
  ];
}

/* ————————————————————————————————————————————————
   3. La Bande elle-même
———————————————————————————————————————————————— */

export type BandeRelation = {
  kind: TimelineEntityKind;
  id: string;
  /** « Prestataire », « Invité »… : la famille, lisible sans ouvrir le nœud. */
  family: string;
  label: string;
  /** Faux quand le rôle consulté n'a pas droit à cette famille (argent, documents). */
  visible: boolean;
};

export type BandeMoment = {
  event: TimelineEvent;
  relations: BandeRelation[];
  /** Messages de conflit portés par ce Moment (jamais un indicateur à zéro). */
  conflicts: string[];
  visible: boolean;
  /** Pourquoi ce Moment est masqué pour le rôle consulté. */
  maskedReason?: string;
  /** Résolution `minutes` seulement : l'état de régie calculé par `day-run`. */
  state?: DayMomentState;
  clock?: string;
  countdown?: string;
  confidence?: string;
};

export type BandeChapter = {
  chapter: string;
  moments: BandeMoment[];
  visibleCount: number;
  totalCount: number;
};

const MASKED_BY_ROLE: Record<RoleVisibility, string> = {
  owner: "Réservé au propriétaire",
  planner: "Réservé au propriétaire",
  family: "Moment privé : non partagé avec les proches",
  viewer: "Non publié aux invités",
};

function toMoment(
  event: TimelineEvent,
  role: RoleVisibility,
  conflicts: Map<string, string[]>,
  labels: Map<string, { kind: TimelineEntityKind; label: string }>,
): BandeMoment {
  const relations: BandeRelation[] = (event.relations ?? []).map(relation => {
    const label = labels.get(`${relation.kind}:${relation.id}`)?.label;
    return {
      kind: relation.kind,
      id: relation.id,
      family: ENTITY_KIND_LABELS[relation.kind],
      label: label ?? relation.role ?? relation.id,
      visible: roleCanSeeEntityKind(role, relation.kind),
    };
  });
  const visible = roleCanSeeEvent(role, event);
  return {
    event,
    relations,
    conflicts: conflicts.get(event.id) ?? [],
    visible,
    maskedReason: visible ? undefined : MASKED_BY_ROLE[role],
    confidence: event.confidence === "confirme" ? undefined : CONFIDENCE_SHORT[event.confidence],
  };
}

/** Résolution `mois` : le mariage chapitre par chapitre, du plus ancien au plus proche. */
export function buildChapters(project: WorldProject, role: RoleVisibility): BandeChapter[] {
  const conflicts = indexTimelineConflicts(project.timeline);
  const labels = new Map([...buildTimelineIndex(project).entities].map(([key, record]) => [key, { kind: record.kind, label: record.label }]));
  return groupByChapter(project.timeline, project.pivot.value).map(group => {
    const moments = group.events.map(event => toMoment(event, role, conflicts, labels));
    return {
      chapter: group.chapter,
      moments,
      visibleCount: moments.filter(moment => moment.visible).length,
      totalCount: moments.length,
    };
  });
}

export type DayBande = {
  snapshot: DayRunSnapshot;
  moments: BandeMoment[];
};

/** Résolution `minutes` : la régie du Jour J, states et compte à rebours compris. */
export function buildDayBande(project: WorldProject, role: RoleVisibility, now: number): DayBande {
  const events = filterTimeline(project, "day-of");
  const snapshot = annotateDayRun(events, now);
  const conflicts = indexTimelineConflicts(events);
  const labels = new Map([...buildTimelineIndex(project).entities].map(([key, record]) => [key, { kind: record.kind, label: record.label }]));
  const moments = snapshot.ordered.map(event => {
    const moment = toMoment(event, role, conflicts, labels);
    return {
      ...moment,
      state: snapshot.states.get(event.id),
      clock: formatClock(event.time),
      countdown: snapshot.next?.id === event.id ? formatCountdown(event.time - now) : undefined,
    };
  });
  return { snapshot, moments };
}

/* ————————————————————————————————————————————————
   4. Les engagements : ce qui doit être vrai avant samedi
———————————————————————————————————————————————— */

export type EngagementKind = "paiement" | "prestataire" | "rsvp" | "tache" | "manque";
export type EngagementUrgency = "retard" | "semaine" | "suite";

export const ENGAGEMENT_KIND_LABELS: Record<EngagementKind, string> = {
  paiement: "Argent",
  prestataire: "Prestataire",
  rsvp: "Réponse",
  tache: "Tâche",
  manque: "Information",
};

export type Engagement = {
  id: string;
  kind: EngagementKind;
  label: string;
  detail?: string;
  /** Absent quand rien ne permet de dater l'engagement : il reste « à suivre ». */
  dueAt?: number;
  urgency: EngagementUrgency;
};

function urgencyOf(dueAt: number | undefined, now: number): EngagementUrgency {
  if (dueAt === undefined) return "suite";
  if (dueAt < now) return "retard";
  if (dueAt <= now + WEEK) return "semaine";
  return "suite";
}

/**
 * Les engagements ne sont pas saisis : ils sont **dérivés** du graphe. C'est la
 * différence avec une liste de tâches — un acompte apparaît parce qu'un
 * paiement « dû » existe avant le pivot, une relance parce qu'une réponse manque,
 * un prestataire parce que son statut n'est pas « réservé ».
 */
export function listEngagements(project: WorldProject, now: number): Engagement[] {
  const pivot = project.pivot.value;
  const engagements: Engagement[] = [];

  for (const payment of project.payments.filter(item => item.state === "du" && item.at <= pivot)) {
    engagements.push({
      id: `payment:${payment.id}`,
      kind: "paiement",
      label: payment.label,
      detail: `${formatCents(payment.amountCents, project.currency)} · échéance ${format(payment.at, "d MMMM", { locale: fr })}`,
      dueAt: payment.at,
      urgency: urgencyOf(payment.at, now),
    });
  }

  for (const provider of project.providers.filter(item => item.status !== "reserve")) {
    engagements.push({
      id: `provider:${provider.id}`,
      kind: "prestataire",
      label: provider.name ?? provider.role,
      detail: [
        provider.status === "recherche" ? "encore en recherche" : `statut : ${provider.status}`,
        provider.amountCents ? `devis ${formatCents(provider.amountCents, project.currency)}` : "aucun devis chiffré",
        provider.nextAction,
      ].filter(Boolean).join(" · "),
      urgency: provider.status === "recherche" && now >= pivot - 90 * DAY ? "semaine" : "suite",
    });
  }

  for (const guest of project.guests.filter(item => item.rsvp === "en_attente")) {
    engagements.push({
      id: `guest:${guest.id}`,
      kind: "rsvp",
      label: guest.name,
      detail: guest.invitationSent ? "invité, sans réponse — relance à envoyer" : "pas encore invité",
      urgency: guest.invitationSent && now >= pivot - 21 * DAY ? "retard" : "suite",
    });
  }

  for (const task of project.tasks.filter(item => item.status !== "termine")) {
    engagements.push({
      id: `task:${task.id}`,
      kind: "tache",
      label: task.title,
      detail: [task.owner ? `portée par ${task.owner}` : undefined, task.dueDate ? `pour le ${format(task.dueDate, "d MMMM", { locale: fr })}` : undefined]
        .filter(Boolean)
        .join(" · ") || undefined,
      dueAt: task.dueDate,
      urgency: urgencyOf(task.dueDate, now),
    });
  }

  for (const [index, missing] of project.missing.entries()) {
    engagements.push({ id: `missing:${index}`, kind: "manque", label: missing, urgency: "suite" });
  }

  const rank: Record<EngagementUrgency, number> = { retard: 0, semaine: 1, suite: 2 };
  return engagements.sort((a, b) => rank[a.urgency] - rank[b.urgency] || (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity));
}

/**
 * Règle un engagement : la mutation porte sur le `WorldProject`, jamais sur une
 * copie locale de la ligne. C'est ce qui rend l'écran honnête — cocher « payé »
 * change le nombre en haut de l'écran, parce que c'est la même donnée.
 */
export function settleEngagement(project: WorldProject, engagement: Engagement): WorldProject {
  const id = engagement.id.slice(engagement.id.indexOf(":") + 1);
  switch (engagement.kind) {
    case "paiement":
      return { ...project, payments: project.payments.map(item => (item.id === id ? { ...item, state: "paye" as const } : item)) };
    case "prestataire":
      return { ...project, providers: project.providers.map(item => (item.id === id ? { ...item, status: "reserve" as const } : item)) };
    case "rsvp":
      return { ...project, guests: project.guests.map(item => (item.id === id ? { ...item, rsvp: "confirme" as const } : item)) };
    case "tache":
      return { ...project, tasks: project.tasks.map(item => (item.id === id ? { ...item, status: "termine" as const } : item)) };
    case "manque":
      return { ...project, missing: project.missing.filter((_, index) => `missing:${index}` !== engagement.id) };
    default:
      return project;
  }
}

/* ————————————————————————————————————————————————
   5. Les gestes : décaler, et voir ce que ça décale
———————————————————————————————————————————————— */

export const SHIFT_OPTIONS: ReadonlyArray<{ minutes: number; label: string }> = [
  { minutes: -60, label: "1 h plus tôt" },
  { minutes: -30, label: "30 min plus tôt" },
  { minutes: 30, label: "30 min plus tard" },
  { minutes: 60, label: "1 h plus tard" },
];

/** Décalages proposés en régie : plus courts, parce que la journée est déjà écrite. */
export const DAY_SHIFT_OPTIONS: ReadonlyArray<{ minutes: number; label: string }> = [
  { minutes: 10, label: "+10 min" },
  { minutes: 20, label: "+20 min" },
  { minutes: 45, label: "+45 min" },
];

/**
 * Montre la conséquence avant de l'appliquer : `planEventPropagation` renvoie
 * les Moments dépendants, leurs heures actuelles et suivantes, et les conflits
 * que le déplacement créerait. Rien n'est écrit tant que la confirmation n'est
 * pas donnée — c'est la règle du moteur, pas une précaution d'affichage.
 */
export function previewShift(project: WorldProject, eventId: string, minutes: number): PropagationPlan | null {
  const event = project.timeline.find(item => item.id === eventId);
  if (!event || minutes === 0) return null;
  return planEventPropagation(project, eventId, { time: event.time + minutes * 60_000 });
}

export function commitShift(project: WorldProject, plan: PropagationPlan, dependentIds: string[] = []): WorldProject {
  return applyPropagationPlan(project, plan, true, dependentIds);
}

/** Retard de régie : le Moment et toute la suite glissent ensemble (`day-run`). */
export function declareDayDelay(project: WorldProject, eventId: string, minutes: number) {
  return applyDayDelay(project, eventId, minutes);
}

/**
 * Termine un Moment. Ce n'est pas cosmétique : `annotateDayRun` ne considère
 * terminé que ce qui porte le statut `execute`, donc sans ce geste tout ce qui
 * est passé reste « en retard » jusqu'au bout de la journée.
 */
export function markMomentDone(project: WorldProject, eventId: string): WorldProject {
  return {
    ...project,
    timeline: project.timeline.map(event => (event.id === eventId ? { ...event, status: "execute" as const } : event)),
  };
}

/* ————————————————————————————————————————————————
   6. La phrase : le seul point d'entrée
———————————————————————————————————————————————— */

/** La phrase de démonstration : elle porte une date, un nombre d'invités et un budget. */
export const DEMO_PHRASE =
  "Mariage le samedi 12 septembre 2026 au château de la Tour, 120 invités, budget 30 000 €";

/**
 * Le Monde de démonstration, et la phrase qui le décrit exactement.
 *
 * Deux raisons de ne pas appeler `projectFromPhrase(DEMO_PHRASE)` directement :
 *  - le parseur garde le quantième du jour courant, donc la date lue dépend du
 *    jour où l'on ouvre la page ; ici le Jour J est posé à ~10 mois, minuit,
 *    comme le germe le construit (`seed-data.ts` place les Moments en
 *    `pivot + heures`) — l'écran s'ouvre ainsi sur la forme du mariage ;
 *  - la phrase affichée doit dire la même date que les données. Une phrase qui
 *    annoncerait un autre jour que celui du Monde serait un mensonge affiché.
 */
export function demoWorld(now: number = Date.now()): { project: WorldProject; phrase: string } {
  const pivot = startOfDay(addMonths(now, 10)).getTime();
  const phrase = format(pivot, "eeee d MMMM yyyy", { locale: fr });
  const text = `Mariage le ${phrase}, 120 invités, budget 30 000 €`;
  const project = createInitialProject(
    { ...parseIntention(text), universe: "Mariage", pivot: fact(pivot, "confirme") },
    text,
    { persona: "couple" },
  );
  return { project, phrase: text };
}

export const PHRASE_EXAMPLES: readonly string[] = [
  DEMO_PHRASE,
  "Petit mariage en juin 2027, 40 personnes, 12 000 €",
  "Mariage en mars 2026 à Lisbonne, 90 convives, budget 45 k€",
];

/*
 * Les instants « voyager dans le temps » de la Bande publique.
 *
 * Les deux repères du Jour J suivaient l'ancien système d'heures fixes
 * (pivot + 16,5 h et + 22 h, libellé « 16 h 30 » écrit en dur) : avec un
 * pivot posé à 12 h par le parseur, le visiteur était envoyé le lendemain
 * à 4 h 30 sous un libellé « 16 h 30 ». Ils suivent désormais l'ancre
 * cérémonie de la Timeline générée (le Moment « dj3 », déjà référence
 * croisée par la musique du germe), en gardant leur intention d'origine :
 * 30 min après le début (la cérémonie est lancée) et l'entrée en soirée
 * (+ 6 h). Sans Moment de cérémonie, repli sur le comportement historique ;
 * sur la démo (pivot à minuit, ancre 16 h), valeurs et libellés restent
 * bit-identiques à ceux d'avant.
 */
export type BandeInstant = { id: string; label: string; at: number };

export function bandeInstants(project: WorldProject, now: number): BandeInstant[] {
  const HOUR = 3_600_000;
  const dayStart = startOfDay(project.pivot.value).getTime();
  const ceremony = project.timeline.find(event => event.id === "dj3")?.time ?? dayStart + 16 * HOUR;
  const clock = (time: number) => {
    const moment = new Date(time);
    const minutes = moment.getMinutes();
    return minutes ? `${moment.getHours()} h ${String(minutes).padStart(2, "0")}` : `${moment.getHours()} h`;
  };
  return [
    { id: "maintenant", label: "Aujourd'hui", at: now },
    { id: "dernier-mois", label: "Le dernier mois", at: startOfDay(addDays(project.pivot.value, -21)).getTime() + 9 * HOUR },
    { id: "veille", label: "La veille", at: dayStart - 6 * HOUR },
    { id: "ceremonie", label: `Le Jour J, ${clock(ceremony + 0.5 * HOUR)}`, at: ceremony + 0.5 * HOUR },
    { id: "soiree", label: `Le Jour J, ${clock(ceremony + 6 * HOUR)}`, at: ceremony + 6 * HOUR },
  ];
}


/**
 * Construit un Monde entier depuis une phrase, avec le parseur déjà utilisé par
 * l'onboarding : même code, donc mêmes limites et mêmes confiances affichées.
 */
export function projectFromPhrase(phrase: string): WorldProject {
  return createInitialProject(parseIntention(phrase), phrase, { persona: "couple" });
}

export type UnderstoodFact = {
  id: string;
  label: string;
  value: string;
  confidence: string;
  /** Vrai quand AIME a deviné : la valeur doit se voir comme une proposition. */
  needsAction: boolean;
};

/** Ce que la phrase a fait comprendre — et ce qu'elle n'a pas dit. */
export function understoodFacts(project: WorldProject): UnderstoodFact[] {
  const entries = [
    {
      id: "pivot",
      label: "Le jour",
      fact: project.pivot as { value: unknown; confidence: string },
      render: (value: unknown) => format(Number(value), "EEEE d MMMM yyyy", { locale: fr }),
    },
    {
      id: "city",
      label: "La ville",
      fact: project.city as { value: unknown; confidence: string },
      render: (value: unknown) => String(value),
    },
    {
      id: "venue",
      label: "Le lieu",
      fact: project.venue as { value: unknown; confidence: string },
      render: (value: unknown) => String(value),
    },
    {
      id: "guestsCount",
      label: "Les invités",
      fact: project.guestsCount as { value: unknown; confidence: string },
      render: (value: unknown) => `${String(value)} personnes`,
    },
    {
      id: "budget",
      label: "Le budget",
      fact: project.budget as { value: unknown; confidence: string },
      render: (value: unknown) => formatBudget(Number(value), project.currency),
    },
  ];
  return entries.map(entry => ({
    id: entry.id,
    label: entry.label,
    value: entry.fact.value === null || entry.fact.value === undefined ? "—" : entry.render(entry.fact.value),
    confidence: CONFIDENCE_SHORT[entry.fact.confidence as keyof typeof CONFIDENCE_SHORT] ?? entry.fact.confidence,
    needsAction: entry.fact.confidence === "a_confirmer" || entry.fact.confidence === "manquant",
  }));
}

/* ————————————————————————————————————————————————
   7. L'état complet de l'écran
———————————————————————————————————————————————— */

export type BandeState = {
  /** La résolution choisie : forcée par l'utilisateur, ou celle de la date. */
  resolution: BandeResolution;
  /** Ce que la date impose — affiché pour que le choix automatique se comprenne. */
  automatic: BandeResolution;
  days: number;
  regie: RegieFigure[];
  chapters: BandeChapter[];
  day: DayBande;
  engagements: Engagement[];
  conflicts: string[];
  visibleCount: number;
  totalCount: number;
};

export function buildBandeState(
  project: WorldProject,
  role: RoleVisibility,
  now: number,
  forced?: BandeResolution | null,
): BandeState {
  const automatic = resolutionFor(project.pivot.value, now);
  const chapters = buildChapters(project, role);
  const day = buildDayBande(project, role, now);
  const engagements = listEngagements(project, now);
  const conflicts = [...new Set([...indexTimelineConflicts(project.timeline).values()].flat())];
  const moments = chapters.flatMap(chapter => chapter.moments);
  return {
    resolution: forced ?? automatic,
    automatic,
    days: daysUntil(project.pivot.value, now),
    regie: buildRegie(project, now),
    chapters,
    day,
    engagements,
    conflicts,
    visibleCount: moments.filter(moment => moment.visible).length,
    totalCount: moments.length,
  };
}

import type { Document, Payment, TimelineEvent, WorldProject } from "./types";

/*
 * UNE TIMELINE, DEUX AXES.
 *
 * Le Monde n'a pas trois timelines (passé / présent / futur) : il en a une,
 * lue depuis « maintenant ». Deux axes temporels coexistent et ne doivent pas
 * être confondus :
 *
 *  - la PHASE (`TimelineEvent.phase` : avant / pendant / après) est une
 *    propriété du Moment, mesurée par rapport au pivot (le jour J). Elle est
 *    stockée.
 *  - le TEMPS (`Tense` : passé / présent / futur) est une propriété du regard,
 *    mesurée par rapport à maintenant. Il n'est JAMAIS stocké : il se calcule à
 *    l'affichage, sinon il devient faux chaque nuit à minuit.
 *
 * Un document n'a pas de temps non plus. Il a un STADE : proposition
 * (devis) → engagement (contrat) → échéance (facture due) → fait (facture
 * payée). Le stade se dérive du `kind` et des paiements liés ; le temps du
 * document se lit sur le Moment auquel il est relié.
 *
 * Seul le passé sort du Monde. Un export comptable (Pennylane) ou une preuve
 * d'emploi (France Travail / GUSO) ne reçoit que des FAITS : une facture
 * rapprochée d'un paiement effectué. Un devis ne part jamais. Un contrat non
 * plus. La fonction `exportableDocuments` est la seule porte de sortie.
 *
 * Règles non négociables :
 *  - fonctions pures, sans horloge implicite : `now` est toujours un paramètre ;
 *  - aucune donnée dupliquée : tout est dérivé de `WorldProject` ;
 *  - aucun texte figé : le libellé est l'affaire des vues et de l'i18n.
 */

export const TENSES = ["passe", "present", "futur"] as const;
export type Tense = (typeof TENSES)[number];

export const DOCUMENT_STAGES = ["proposition", "engagement", "echeance", "fait", "libre"] as const;
export type DocumentStage = (typeof DOCUMENT_STAGES)[number];

/**
 * Fenêtre du présent, en millisecondes. Un Moment qui commence à moins de
 * cette distance de maintenant est « présent » même s'il n'a pas de durée : le
 * présent n'est pas un instant, c'est la journée que l'on vit.
 */
export const PRESENT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Fin effective d'un Moment : `endTime`, sinon `time + durationMinutes`, sinon `time`. */
export function momentEnd(event: Pick<TimelineEvent, "time" | "endTime" | "durationMinutes">): number {
  if (typeof event.endTime === "number" && event.endTime >= event.time) return event.endTime;
  if (typeof event.durationMinutes === "number" && event.durationMinutes > 0) {
    return event.time + event.durationMinutes * 60_000;
  }
  return event.time;
}

/**
 * Le temps d'un Moment, vu depuis `now`.
 *  - futur : commence après la fenêtre du présent ;
 *  - passé : terminé avant la fenêtre du présent ;
 *  - présent : tout le reste — en cours, ou à moins d'une journée.
 */
export function tenseOf(
  event: Pick<TimelineEvent, "time" | "endTime" | "durationMinutes">,
  now: number,
  windowMs: number = PRESENT_WINDOW_MS,
): Tense {
  if (event.time - now > windowMs) return "futur";
  if (now - momentEnd(event) > windowMs) return "passe";
  return "present";
}

/** Les Moments d'un projet regroupés par temps, chaque groupe trié par `time`. */
export function groupMomentsByTense(
  timeline: ReadonlyArray<TimelineEvent>,
  now: number,
  windowMs: number = PRESENT_WINDOW_MS,
): Record<Tense, TimelineEvent[]> {
  const groups: Record<Tense, TimelineEvent[]> = { passe: [], present: [], futur: [] };
  for (const event of [...timeline].sort((a, b) => a.time - b.time)) {
    groups[tenseOf(event, now, windowMs)].push(event);
  }
  return groups;
}

/**
 * Les paiements qui rapprochent un document : même prestataire. Un document
 * sans prestataire ne peut être rapproché de rien — il reste une échéance
 * jusqu'à ce qu'un humain le relie.
 */
export function paymentsForDocument(document: Document, payments: ReadonlyArray<Payment>): Payment[] {
  if (!document.providerId) return [];
  return payments.filter(payment => payment.providerId === document.providerId);
}

/**
 * Le stade d'un document, dérivé et jamais saisi.
 *  - devis → proposition : rien n'engage, rien ne se compte ;
 *  - contrat → engagement : une obligation vivante ;
 *  - facture → échéance tant qu'aucun paiement effectué ne la couvre,
 *    fait dès qu'elle est rapprochée d'un paiement `paye` ;
 *  - autre → libre : hors cycle financier.
 */
export function documentStage(document: Document, payments: ReadonlyArray<Payment>): DocumentStage {
  switch (document.kind) {
    case "devis":
      return "proposition";
    case "contrat":
      return "engagement";
    case "facture":
      return paymentsForDocument(document, payments).some(payment => payment.state === "paye") ? "fait" : "echeance";
    default:
      return "libre";
  }
}

/** Les Moments auxquels un document est relié (relation `document`). */
export function momentsForDocument(document: Pick<Document, "id">, timeline: ReadonlyArray<TimelineEvent>): TimelineEvent[] {
  return timeline.filter(event => event.relations?.some(relation => relation.kind === "document" && relation.id === document.id));
}

/**
 * Le temps d'un document se lit sur ses Moments : le plus tardif fait foi,
 * car un document relié à une échéance future reste vivant même si son dépôt
 * est ancien. Sans Moment relié, la date de dépôt (`at`) sert de repère.
 */
export function documentTense(
  document: Document,
  timeline: ReadonlyArray<TimelineEvent>,
  now: number,
  windowMs: number = PRESENT_WINDOW_MS,
): Tense {
  const moments = momentsForDocument(document, timeline);
  if (moments.length === 0) return tenseOf({ time: document.at }, now, windowMs);
  const latest = moments.reduce((best, event) => (momentEnd(event) > momentEnd(best) ? event : best));
  return tenseOf(latest, now, windowMs);
}

export type DocumentReading = {
  document: Document;
  stage: DocumentStage;
  tense: Tense;
  /** Un fait est exportable ; tout autre stade reste dans le Monde. */
  exportable: boolean;
};

/** Lecture complète d'un document : stade, temps, exportabilité. */
export function readDocument(
  document: Document,
  project: Pick<WorldProject, "timeline" | "payments">,
  now: number,
  windowMs: number = PRESENT_WINDOW_MS,
): DocumentReading {
  const stage = documentStage(document, project.payments);
  return {
    document,
    stage,
    tense: documentTense(document, project.timeline, now, windowMs),
    exportable: stage === "fait",
  };
}

/** Toutes les lectures d'un projet, dans l'ordre de dépôt. */
export function readDocuments(
  project: Pick<WorldProject, "documents" | "timeline" | "payments">,
  now: number,
  windowMs: number = PRESENT_WINDOW_MS,
): DocumentReading[] {
  return [...project.documents]
    .sort((a, b) => a.at - b.at)
    .map(document => readDocument(document, project, now, windowMs));
}

/**
 * La seule porte de sortie vers une comptabilité ou une preuve d'emploi :
 * les factures rapprochées d'un paiement effectué. Ni devis, ni contrat, ni
 * facture due — le futur et le présent restent dans le Monde.
 */
export function exportableDocuments(project: Pick<WorldProject, "documents" | "payments">): Document[] {
  return project.documents.filter(document => documentStage(document, project.payments) === "fait");
}

/**
 * Les documents d'une liste regroupés par stade, dans l'ordre du cycle.
 * C'est ce que la Galerie affiche : un filtre par stade, jamais une case
 * à cocher « payé » sur le document lui-même.
 */
export function groupDocumentsByStage(
  documents: ReadonlyArray<Document>,
  payments: ReadonlyArray<Payment>,
): Record<DocumentStage, Document[]> {
  const groups: Record<DocumentStage, Document[]> = { proposition: [], engagement: [], echeance: [], fait: [], libre: [] };
  for (const document of documents) groups[documentStage(document, payments)].push(document);
  return groups;
}

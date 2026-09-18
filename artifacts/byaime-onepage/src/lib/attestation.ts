import { buildFactView, factViewFingerprint, type FactView } from "@workspace/aime-domain";
import { documentStage, exportableDocuments, momentsForDocument, paymentsForDocument, type DocumentStage } from "./document-tense";
import type { Attestation, Document, Payment, Provider, TimelineEvent, WorldProject } from "./types";

/*
 * LE MOMENT EN PARTIE DOUBLE.
 *
 * Un Moment entre deux parties n'est un fait que lorsque les deux l'ont
 * écrit. La mariée écrit « payé » ; tant que le musicien n'a pas écrit
 * « reçu », ce n'est qu'une DÉCLARATION. Quand les deux écritures concordent,
 * c'est un fait ATTESTÉ. Quand elles divergent, c'est une CONTESTATION — et la
 * divergence est elle-même une information, conservée telle quelle.
 *
 * Règles non négociables :
 *  - une attestation est une ÉCRITURE de la contrepartie, jamais une
 *    modification du Moment. Le Moment reste au propriétaire ; l'attestation
 *    reste à celui qui l'a donnée. Personne n'écrit pour l'autre ;
 *  - elle porte l'EMPREINTE du fait tel qu'il a été montré : si le fait change
 *    ensuite (montant, date), l'attestation ne le couvre plus — il faut la
 *    redemander. On ne peut pas attester d'avance un fait qui bouge ;
 *  - une attestation porte sur le fait (date, montant, présence), JAMAIS sur
 *    la qualité. Ce n'est pas un avis, c'est une signature ;
 *  - l'étage ATTESTÉ est au-dessus de FAIT, jamais un verrou en dessous : sans
 *    réponse, rien ne régresse — le fait reste déclaré, exportable en interne.
 *    Seule la porte des PREUVES (dossier d'emploi, tiers) exige l'attestation.
 */

export type { Attestation };
export type AttestationStatus = Attestation["status"];

/** Un stade au-dessus de « fait » : le fait contresigné par la contrepartie. */
export type AttestedStage = DocumentStage | "atteste";

export { factViewFingerprint, type FactView };

/** Les documents d'un prestataire reliés à ce Moment (ou, à défaut, tous ses documents financiers). */
export function documentsForFact(
  event: TimelineEvent,
  providerId: string,
  documents: ReadonlyArray<Document>,
): Document[] {
  const ofProvider = documents.filter(document => document.providerId === providerId && document.kind !== "autre");
  const linked = ofProvider.filter(document => momentsForDocument(document, [event]).length > 0);
  return linked.length > 0 ? linked : ofProvider;
}

/**
 * La vue du fait montrée à la contrepartie. Calculée par le module partagé
 * client / serveur (`@workspace/aime-domain`) : le serveur empreinte la même
 * vue au moment de la réponse, le Monde la recompare ensuite.
 */
export function factView(
  event: TimelineEvent,
  providerId: string,
  project: Pick<WorldProject, "documents" | "payments">,
): FactView {
  return buildFactView({ timeline: [event], documents: project.documents, payments: project.payments }, event.id, providerId) ?? {
    eventId: event.id, providerId, title: event.title, time: event.time, amountCents: 0, documentIds: [], paymentIds: [],
  };
}

/** Les attestations d'un Moment pour une contrepartie, de la plus ancienne à la plus récente. */
export function attestationsFor(
  eventId: string,
  providerId: string,
  attestations: ReadonlyArray<Attestation> = [],
): Attestation[] {
  return attestations
    .filter(item => item.eventId === eventId && item.providerId === providerId)
    .sort((a, b) => a.respondedAt - b.respondedAt);
}

/**
 * Une attestation est valide si elle dit « exact » ET si son empreinte est
 * encore celle du fait : un fait qui a bougé depuis n'est plus couvert.
 */
export function isAttested(
  event: TimelineEvent,
  providerId: string,
  project: Pick<WorldProject, "documents" | "payments" | "attestations">,
): boolean {
  const hash = factViewFingerprint(factView(event, providerId, project));
  return attestationsFor(event.id, providerId, project.attestations).some(item => item.status === "atteste" && item.hash === hash);
}

/** Une contestation en cours : la dernière écriture dit « ce n'est pas ça » sur le fait actuel. */
export function isContested(
  event: TimelineEvent,
  providerId: string,
  project: Pick<WorldProject, "documents" | "payments" | "attestations">,
): boolean {
  const hash = factViewFingerprint(factView(event, providerId, project));
  const history = attestationsFor(event.id, providerId, project.attestations);
  const last = history[history.length - 1];
  return Boolean(last && last.status === "conteste" && last.hash === hash);
}

export type FactState = "declare" | "atteste" | "conteste" | "perime";

/**
 * L'état d'un fait vis-à-vis d'une contrepartie :
 *  - declare : aucune écriture de l'autre côté (ou aucune sur ce fait) ;
 *  - atteste : l'autre a signé ce fait tel qu'il est ;
 *  - conteste : l'autre a dit non à ce fait tel qu'il est ;
 *  - perime : l'autre avait signé, mais le fait a changé depuis.
 */
export function factState(
  event: TimelineEvent,
  providerId: string,
  project: Pick<WorldProject, "documents" | "payments" | "attestations">,
): FactState {
  if (isAttested(event, providerId, project)) return "atteste";
  if (isContested(event, providerId, project)) return "conteste";
  const history = attestationsFor(event.id, providerId, project.attestations);
  return history.some(item => item.status === "atteste") ? "perime" : "declare";
}

/** Les prestataires reliés à un Moment : ses contreparties possibles. */
export function counterpartsOf(event: TimelineEvent, providers: ReadonlyArray<Provider>): Provider[] {
  const ids = new Set((event.relations ?? []).filter(relation => relation.kind === "provider").map(relation => relation.id));
  return providers.filter(provider => ids.has(provider.id));
}

/**
 * Le stade d'un document, l'étage « attesté » compris : un fait dont TOUS les
 * Moments reliés à son prestataire sont attestés. Un document sans Moment ne
 * peut pas être attesté — il n'y a rien que l'autre puisse signer.
 */
export function attestedDocumentStage(
  document: Document,
  project: Pick<WorldProject, "timeline" | "documents" | "payments" | "attestations">,
): AttestedStage {
  const stage = documentStage(document, project.payments);
  if (stage !== "fait" || !document.providerId) return stage;
  const moments = momentsForDocument(document, project.timeline);
  if (moments.length === 0) return stage;
  return moments.every(event => isAttested(event, document.providerId!, project)) ? "atteste" : stage;
}

/**
 * La porte des PREUVES : plus étroite que celle des exports. Un fait ne sort
 * comme preuve (dossier d'emploi, tiers) que contresigné par la contrepartie.
 */
export function attestedDocuments(
  project: Pick<WorldProject, "timeline" | "documents" | "payments" | "attestations">,
): Document[] {
  return exportableDocuments(project).filter(document => attestedDocumentStage(document, project) === "atteste");
}

/** Un paiement réglé est attesté si sa facture l'est. Utile au compteur d'heures. */
export function isSettledPaymentAttested(
  payment: Payment,
  project: Pick<WorldProject, "timeline" | "documents" | "payments" | "attestations">,
): boolean {
  if (payment.state !== "paye") return false;
  return attestedDocuments(project).some(document => paymentsForDocument(document, project.payments).some(item => item.id === payment.id));
}

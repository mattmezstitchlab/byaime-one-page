import type { TimelineEvent, WorldProject } from "./types";

/*
 * Alertes de cohérence du Monde — adapté du moteur `analyzeTimeline` de
 * l'ancienne référence « The Art of Connection », porté sur le modèle actuel
 * (`TimelineEvent`, `Provider`, relations typées).
 *
 * Pourquoi un module pur : la valeur n'est pas dans un écran de plus (il y en
 * a déjà assez), elle est dans la capacité d'AIME à dire ce qui dérape quand
 * on lui demande « je fais quoi maintenant ». Le module lit le `WorldProject`
 * et ne renvoie que des faits ; c'est `aime-guidance.ts` qui les transforme en
 * recommandations et en sauts réels dans l'app. Aucune dépendance, aucun
 * accès réseau, aucune écriture : même entrée → même sortie.
 *
 * Deux règles héritées de l'architecture indiscutable :
 * - on ne duplique pas `findTimelineConflicts` (simultanéités, déjà porté par
 *   `timeline-graph.ts` et affiché sur le fil) : ici on traite ce qui n'existe
 *   nulle part — retards Avant, confirmations en attente, incohérences
 *   jauge/montant, relances prestataires, prochaine action ;
 * - une suggestion jamais adoptée (`provenance: "suggested"`) n'est pas un
 *   retard : le couple ne l'a jamais décidée. Seuls les engagements réels
 *   (créés via l'app ou issus d'une intégration) peuvent être en retard.
 */

export type WorldAlertKind =
  | "retard"
  | "a_confirmer"
  | "incoherence_jauge"
  | "relance"
  | "impact"
  | "prochaine_action";

export type WorldAlertSeverity = "info" | "attention" | "critique";

export type WorldAlert = {
  id: string;
  kind: WorldAlertKind;
  severity: WorldAlertSeverity;
  /** Phrase courte, factuelle : prête à être dite telle quelle par AIME. */
  title: string;
  /** Ce que ça change et quoi faire — une phrase, pas un rapport. */
  detail: string;
  /** Les Moments de la Timeline concernés, s'il y en a. */
  eventIds: string[];
  /** Le prestataire concerné, pour les alertes `relance` et `impact`. */
  providerId?: string;
  /** Horodatage de référence (échéance passée ou à venir). */
  time?: number;
};

/**
 * Seuil de vraisemblance d'un montant face à la jauge d'invités : 10 € par
 * invité, en centimes. On ne juge pas le budget — un devis de traiteur à
 * 3 €/invité est simplement une erreur de saisie ou un montant manquant, et
 * ça, ça mérite d'être dit avant la signature.
 */
export const WORLD_ALERT_MIN_CENTS_PER_GUEST = 1000;

/** Une relance se prépare pour les deux prestataires les plus évidents, pas pour tout le monde. */
const RELANCE_LIMIT = 2;

/** Une suggestion d'AIME jamais adoptée par le couple n'engage personne. */
const isUnadoptedSuggestion = (event: TimelineEvent): boolean =>
  event.provenance === "suggested";

/**
 * Les alertes de cohérence d'un Monde, dans un ordre stable (temps croissant
 * par famille, familles toujours dans le même ordre) pour rester testable et
 * prévisible d'un rendu à l'autre.
 */
export function worldAlerts(
  project: WorldProject,
  options: { now?: number } = {},
): WorldAlert[] {
  const now = options.now ?? Date.now();
  const alerts: WorldAlert[] = [];
  const timeline = [...project.timeline].sort((a, b) => a.time - b.time);

  /* ————— 1. Retards : des engagements « Avant » dont la date est passée ————— */
  for (const event of timeline) {
    if (event.phase !== "avant" || event.time >= now) continue;
    if (event.status === "execute") continue;
    if (isUnadoptedSuggestion(event)) continue;
    const dependents = project.timeline.filter(item => item.dependencyIds?.includes(event.id));
    alerts.push({
      id: `retard-${event.id}`,
      kind: "retard",
      severity: "critique",
      title: `« ${event.title} » est en retard`,
      detail: dependents.length > 0
        ? `Cette action peut décaler ${dependents.length} élément(s) qui en dépendent.`
        : "Cette action peut décaler ce qui en dépend.",
      eventIds: [event.id],
      time: event.time,
    });
  }

  /* ————— 2. À confirmer : ce qui attend une décision du couple ————— */
  for (const event of timeline) {
    if (event.status !== "a_valider" && event.status !== "en_attente") continue;
    alerts.push({
      id: `confirmation-${event.id}`,
      kind: "a_confirmer",
      severity: "attention",
      title: `À confirmer : ${event.title}`,
      detail: "La confirmation de cet élément débloque la suite du projet.",
      eventIds: [event.id],
      time: event.time,
    });
  }

  /* ————— 3. Incohérence jauge d'invités ↔ devis/facture ————— */
  const guestsCount = project.guests.length;
  if (guestsCount > 0) {
    for (const event of timeline) {
      if (event.kind !== "devis" && event.kind !== "facture") continue;
      if (typeof event.amountCents !== "number") continue;
      if (event.amountCents >= guestsCount * WORLD_ALERT_MIN_CENTS_PER_GUEST) continue;
      alerts.push({
        id: `incoherence-${event.id}`,
        kind: "incoherence_jauge",
        severity: "attention",
        title: `« ${event.title} » à vérifier face à la jauge d'invités`,
        detail: `${(event.amountCents / 100).toLocaleString("fr-FR")} € annoncé pour ${guestsCount} invités : le montant semble incomplet ou la jauge a changé. À relire avant de signer.`,
        eventIds: [event.id],
      });
    }
  }

  /* ————— 4. Impact : un prestataire porte plusieurs Moments —————
     Exposé pour les outils (aperçu de propagation, audit) ; le guidage ne le
     transforme pas en recommandation : le tiroir Moment prévient déjà lors
     de l'édition, un rappel permanent serait du bruit. */
  const eventIdsByProvider = new Map<string, string[]>();
  for (const event of timeline) {
    for (const relation of event.relations ?? []) {
      if (relation.kind !== "provider") continue;
      eventIdsByProvider.set(relation.id, [...(eventIdsByProvider.get(relation.id) ?? []), event.id]);
    }
  }
  for (const [providerId, eventIds] of eventIdsByProvider) {
    if (eventIds.length < 2) continue;
    alerts.push({
      id: `impact-${providerId}`,
      kind: "impact",
      severity: "info",
      title: "Plusieurs Moments dépendent du même prestataire",
      detail: "Une modification de ce prestataire peut se propager à toute la chaîne concernée.",
      eventIds,
      providerId,
    });
  }

  /* ————— 5. Relances : premiers contacts sans nouvelle ————— */
  const toFollowUp = project.providers
    .filter(provider => provider.status === "contacte" && provider.name)
    .slice(0, RELANCE_LIMIT);
  for (const provider of toFollowUp) {
    alerts.push({
      id: `relance-${provider.id}`,
      kind: "relance",
      severity: "info",
      title: `Préparer une relance pour ${provider.name}`,
      detail: `Bonjour ${provider.name}, pouvez-vous nous confirmer votre disponibilité et les prochaines étapes pour « ${project.title} » ?`,
      eventIds: [],
      providerId: provider.id,
    });
  }

  /* ————— 6. Prochaine action : le premier engagement non terminé à venir ————— */
  const next = timeline.find(event => event.time >= now && event.status !== "execute");
  if (next) {
    alerts.push({
      id: "prochaine-action",
      kind: "prochaine_action",
      severity: "info",
      title: `Prochaine action : ${next.title}`,
      detail: "C'est l'élément non terminé le plus proche dans le temps.",
      eventIds: [next.id],
      time: next.time,
    });
  }

  return alerts;
}

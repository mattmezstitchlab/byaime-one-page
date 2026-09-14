import type { Confidence } from "./types";

/*
 * Les cinq états de confiance d'une information, en toutes lettres.
 *
 * C'est la seule convention du produit que l'utilisateur doit apprendre : AIME
 * peut déduire (« un samedi de juin, donc plutôt fin d'après-midi ») sans jamais
 * l'écrire comme une vérité. Les libellés vivaient dans `FilTrack.tsx` ; la
 * Bande (`/monde`, page publique sans session) en a besoin aussi, donc ils
 * vivent ici — une seule table, deux écrans.
 */
export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  confirme: "Confirmé",
  deduit: "Déduit par AIME",
  suggere: "Suggéré par AIME",
  a_confirmer: "À confirmer",
  manquant: "Information manquante",
};

/** Libellé court, pour une pastille : sans la mention « par AIME ». */
export const CONFIDENCE_SHORT: Record<Confidence, string> = {
  confirme: "Confirmé",
  deduit: "Déduit",
  suggere: "Suggéré",
  a_confirmer: "À confirmer",
  manquant: "Manquant",
};

/**
 * Libellé tolérant : la valeur vient parfois d'un type plus large que
 * `Confidence` (événements publics), et une étiquette manquante ne doit pas
 * casser un rendu — on réaffiche la valeur brute.
 */
export function confidenceLabel(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return CONFIDENCE_LABELS[value as Confidence] ?? value;
}

/**
 * Ce qui appelle une action de votre part. `deduit` et `suggere` restent
 * informatifs : AIME a proposé, rien n'est bloqué tant que vous n'avez pas dit
 * non.
 */
export const CONFIDENCE_NEEDS_ACTION: readonly Confidence[] = ["a_confirmer", "manquant"];

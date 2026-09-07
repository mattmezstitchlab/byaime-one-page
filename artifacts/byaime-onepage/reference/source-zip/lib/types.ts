/**
 * Le modèle du projet : la source unique.
 * Toutes les vues (ligne de temps, Avant/Pendant/Après, documents, finance,
 * prestataires, médias, musique, Play) lisent ce modèle. Aucune vue ne
 * possède sa propre copie d'une information fondamentale.
 */

/** Engagements financiers optionnels, alimentés uniquement par une preuve ou une validation. */
import type { PaymentCommitment } from "./finance";

/** Degré de confiance attaché à chaque information. */
export type Confidence = "confirme" | "deduit" | "suggere" | "a_confirmer" | "manquant";

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  confirme: "Confirmé",
  deduit: "Déduit",
  suggere: "Suggestion AIME",
  a_confirmer: "À confirmer",
  manquant: "Manquant",
};

/** Une valeur et ce qu'on en sait. */
export type Fact<T> = {
  value: T;
  confidence: Confidence;
  /** D'où vient l'information : « récit », « devis », « agent »… */
  source?: string;
};

export function fact<T>(value: T, confidence: Confidence = "confirme", source?: string): Fact<T> {
  return source === undefined ? { value, confidence } : { value, confidence, source };
}

export type ProviderStatus = "choisi" | "reserve" | "contacte" | "suggestion" | "a_rechercher";

export const PROVIDER_STATUS_LABEL: Record<ProviderStatus, string> = {
  choisi: "Choisi",
  reserve: "Réservé",
  contacte: "Contacté",
  suggestion: "Suggestion AIME",
  a_rechercher: "À rechercher",
};

export type WorldPerson = {
  id: string;
  name: string;
  role?: string;
  photo?: string;
  confidence: Confidence;
};

export type WorldProvider = {
  id: string;
  /** Place à pourvoir : « Photographe », « Traiteur »… */
  role: string;
  name?: string;
  city?: string;
  photo?: string;
  note?: string;
  status: ProviderStatus;
  amountCents?: number;
  depositCents?: number;
  /** Date de signature du devis (ms). */
  signedAt?: number;
  confidence: Confidence;
};

/** Un moment du jour pivot, exprimé en heures depuis minuit (peut dépasser 24). */
export type WorldMoment = {
  id: string;
  offsetH: number;
  label: string;
  detail?: string;
  providerId?: string;
  location?: string;
  photo?: string;
  confidence: Confidence;
};

export type WorldTask = {
  id: string;
  label: string;
  detail?: string;
  at: number;
  providerId?: string;
  done?: boolean;
  confidence: Confidence;
};

export type WorldDocumentKind = "devis" | "contrat" | "facture" | "document";

export type WorldDocument = {
  id: string;
  title: string;
  at: number;
  kind: WorldDocumentKind;
  providerId?: string;
  amountCents?: number;
  photo?: string;
  detail?: string;
  confidence: Confidence;
};

export type WorldPayment = {
  id: string;
  label: string;
  at: number;
  amountCents: number;
  providerId?: string;
  state: "paye" | "du";
  confidence: Confidence;
};

export type WorldMedia = {
  id: string;
  kind: "photo" | "video";
  at: number;
  title: string;
  detail?: string;
  url?: string;
  thumb?: string;
  personIds?: string[];
  confidence: Confidence;
};

export type WorldTrack = {
  id: string;
  offsetH: number;
  title: string;
  artist: string;
  moment: string;
  dedicace?: string;
  confidence: Confidence;
};

export type WorldMessage = {
  id: string;
  from: string;
  text: string;
  at: number;
  mine?: boolean;
  providerId?: string;
  thread?: string;
  photo?: string;
};

export type WorldReview = {
  providerId?: string;
  vendor: string;
  stars: number;
  text: string;
};

export type WorldIntention = {
  id: string;
  text: string;
  at: number;
};

/** Le projet, quel que soit son domaine. Le mariage n'en est qu'une déclinaison. */
export type WorldProject = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  universe: string;
  /** Cycle de vie : une démo n'est jamais présentée comme un projet utilisateur actif. */
  lifecycle?: "demo" | "brouillon" | "actif";
  /** Jour pivot du projet, à minuit (ms). */
  pivot: Fact<number>;
  city: Fact<string | null>;
  venue: Fact<string | null>;
  guests: Fact<number | null>;
  people: WorldPerson[];
  providers: WorldProvider[];
  moments: WorldMoment[];
  tasks: WorldTask[];
  documents: WorldDocument[];
  payments: WorldPayment[];
  media: WorldMedia[];
  tracks: WorldTrack[];
  messages: WorldMessage[];
  reviews: WorldReview[];
  intentions: WorldIntention[];
  /**
   * Faits métier extensibles (Vague 3) : clés stables en snake_case issues du
   * registre de questions (mapsTo « detail:<clé> »), pensées pour nourrir les
   * représentations temporelles (AVANT / PENDANT / APRÈS). Champ optionnel :
   * les projets historiques sans details restent valides et générables.
   */
  details?: Record<string, Fact<string | number | boolean>>;
  /** Corrections utilisateur appliquées aux repères dérivés, sans écraser leur source. */
  timelineEdits?: Record<string, { title?: string; detail?: string; time?: number }>;
  /** Couche financière canonique ; absente tant qu'aucun document ou engagement n'est confirmé. */
  commitments?: PaymentCommitment[];
  /** Ce qu'AIME sait ne pas savoir. */
  missing: string[];
  /** Vue de démonstration : les actions opérationnelles sont verrouillées. */
  demo?: boolean;
};

export const DAY = 86_400_000;
export const HOUR = 3_600_000;

export function atHour(dayStart: number, hour: number) {
  return dayStart + Math.round(hour * HOUR);
}

export function euros(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function formatLongDate(ms: number) {
  return new Date(ms).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatHour(ms: number) {
  return new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export type Confidence = "confirme" | "deduit" | "suggere" | "a_confirmer" | "manquant";

export type Fact<T> = {
  value: T;
  confidence: Confidence;
};

export function fact<T>(value: T, confidence: Confidence = "confirme"): Fact<T> {
  return { value, confidence };
}

export type TimelineStatus = "prepare" | "execute" | "en_attente" | "a_valider" | "bloque" | "echoue";

export type TimelineEvent = {
  id: string;
  time: number;
  kind: "jalon" | "tache" | "intention" | "souvenir" | "document" | "devis" | "facture" | "paiement" | "evenement" | "message";
  title: string;
  detail?: string;
  amountCents?: number;
  location?: string;
  status: TimelineStatus;
  confidence: Confidence;
  phase: "avant" | "pendant" | "apres";
  universe: string;
};

export type ProviderStatus = "choisi" | "reserve" | "contacte" | "suggestion" | "a_rechercher";

export type Provider = {
  id: string;
  role: string;
  name?: string;
  city?: string;
  status: ProviderStatus;
  amountCents?: number;
  depositCents?: number;
  confidence: Confidence;
};

export type ParticipantStatus = "confirme" | "invite" | "decline";

export type Participant = {
  id: string;
  name: string;
  role?: string;
  status: ParticipantStatus;
  confidence: Confidence;
};

export type Document = {
  id: string;
  title: string;
  kind: "devis" | "contrat" | "facture" | "document";
  amountCents?: number;
  at: number;
};

export type Payment = {
  id: string;
  label: string;
  amountCents: number;
  at: number;
  state: "paye" | "du";
  providerId?: string;
};

export type Media = {
  id: string;
  kind: "photo" | "video";
  url: string;
  title: string;
  at: number;
};

export type Message = {
  id: string;
  from: string;
  text: string;
  at: number;
  mine: boolean;
};

export type WorldProject = {
  id: string;
  title: string;
  subtitle?: string;
  universe: string;
  pivot: Fact<number>;
  city: Fact<string | null>;
  venue: Fact<string | null>;
  guests: Fact<number | null>;
  budget: Fact<number | null>;
  
  timeline: TimelineEvent[];
  providers: Provider[];
  participants: Participant[];
  documents: Document[];
  payments: Payment[];
  media: Media[];
  messages: Message[];
  
  missing: string[];
};

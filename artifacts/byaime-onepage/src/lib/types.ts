export type Confidence = "confirme" | "deduit" | "suggere" | "a_confirmer" | "manquant";

export type Fact<T> = {
  value: T;
  confidence: Confidence;
};

export function fact<T>(value: T, confidence: Confidence = "confirme"): Fact<T> {
  return { value, confidence };
}

export type TaskStatus = "a_faire" | "en_cours" | "termine";
export type TaskPhase = "12m+" | "6-12m" | "3-6m" | "1-3m" | "jour-j" | "apres";
export type TaskPriority = "basse" | "normale" | "haute";

export type Task = {
  id: string;
  title: string;
  phase: TaskPhase;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: number;
  owner?: string;
  dependencies?: string[];
};

export type GuestRSVP = "en_attente" | "confirme" | "decline";
export type GuestRole = "marie" | "temoin" | "famille" | "invite" | "enfant";

export type Guest = {
  id: string;
  name: string;
  householdId?: string;
  role: GuestRole;
  rsvp: GuestRSVP;
  dietary?: string;
  tableId?: string;
  attendance: { ceremony: boolean; cocktail: boolean; dinner: boolean; brunch: boolean; };
  contact?: string;
  notes?: string;
};

export type Table = {
  id: string;
  name: string;
  capacity: number;
};

export type ProviderCategory = "lieu" | "traiteur" | "photo" | "video" | "fleuriste" | "musique" | "officiant" | "tenue" | "beaute" | "papeterie" | "transport" | "hebergement" | "autre";

export type Provider = {
  id: string;
  category: ProviderCategory;
  role: string;
  name?: string;
  contact?: string;
  status: "recherche" | "contacte" | "rencontre" | "devis" | "reserve";
  amountCents?: number;
  depositCents?: number;
  paidCents?: number;
  nextAction?: string;
};

export type Payment = {
  id: string;
  label: string;
  amountCents: number;
  at: number;
  state: "paye" | "du";
  providerId?: string;
};

export type Document = {
  id: string;
  title: string;
  kind: "devis" | "contrat" | "facture" | "autre";
  providerId?: string;
  at: number;
  url?: string;
};

export type CommunicationStatus = "brouillon" | "envoye";
export type Communication = {
  id: string;
  subject: string;
  type: "invitation" | "rappel" | "remerciement" | "info";
  status: CommunicationStatus;
  sentAt?: number;
  audience: string;
};

export type Logistics = {
  accommodations: { id: string; name: string; capacity: number; booked: number; address: string; }[];
  shuttles: { id: string; route: string; departure: string; capacity: number; }[];
};

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
  ownerId?: string;
};

export type WorldProject = {
  id: string;
  title: string;
  subtitle?: string;
  universe: string;
  pivot: Fact<number>;
  city: Fact<string | null>;
  venue: Fact<string | null>;
  guestsCount: Fact<number | null>;
  budget: Fact<number | null>;
  
  timeline: TimelineEvent[];
  tasks: Task[];
  guests: Guest[];
  tables: Table[];
  providers: Provider[];
  payments: Payment[];
  documents: Document[];
  communications: Communication[];
  logistics: Logistics;
  
  missing: string[];
};
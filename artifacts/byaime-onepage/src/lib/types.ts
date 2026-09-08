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
  adults?: number;
  children?: number;
  plusOne?: boolean;
  invitationSent?: boolean;
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
  category?: string;
  dueDate?: number;
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
  body?: string;
};

export type Logistics = {
  accommodations: { id: string; name: string; capacity: number; booked: number; address: string; }[];
  shuttles: { id: string; route: string; departure: string; capacity: number; }[];
  parking: string;
  accessibility: string;
  weatherFallback: string;
  emergencyContacts: { id: string; name: string; phone: string; role: string }[];
  packing: { id: string; label: string; done: boolean }[];
};

export type CeremonyContent = {
  structure: string[];
  notes: string;
  readings: { id: string; title: string; reader: string; text: string }[];
  vows: { id: string; person: string; text: string }[];
  traditions: string[];
  menu: string;
  drinks: string;
  cake: string;
  firstDance: string;
};

export type MusicProvider = "apple_music";
export type MusicMetadataStatus = "verified" | "manual";
export type MusicTrackExternal = {
  provider: MusicProvider;
  externalId: string;
  verifiedAt: number;
  artworkUrl?: string;
  durationMs?: number;
  previewUrl?: string;
  trackUrl?: string;
  collectionName?: string;
};

export type MusicTrack = {
  id: string;
  moment: string;
  title: string;
  artist: string;
  status: "a_choisir" | "valide";
  notes?: string;
  timelineEventIds?: string[];
  provenance?: TimelineProvenance;
  metadataStatus?: MusicMetadataStatus;
  external?: MusicTrackExternal;
};

export type MusicSearchResult = {
  provider: MusicProvider;
  externalId: string;
  title: string;
  artist: string;
  collectionName?: string;
  artworkUrl?: string;
  durationMs?: number;
  previewUrl?: string;
  trackUrl?: string;
};

export type TeamRole = {
  id: string;
  name: string;
  role: string;
  contact?: string;
  responsibilities: string[];
};

export type MemoryItem = {
  id: string;
  kind: "shot" | "media" | "message" | "album" | "rappel";
  title: string;
  owner?: string;
  status: "a_faire" | "en_cours" | "termine";
  notes?: string;
};

export type MessageTemplate = {
  id: string;
  title: string;
  type: "invitation" | "rappel" | "pratique" | "remerciement" | "prestataire";
  body: string;
};

export type MessageLog = {
  id: string;
  templateId?: string;
  recipient: string;
  sentAt: number;
  status: "simule" | "brouillon";
  note?: string;
};

export type TimelineStatus = "prepare" | "execute" | "en_attente" | "a_valider" | "bloque" | "echoue";
export type TimelinePhase = "avant" | "pendant" | "apres";
export type TimelineProvenance = "real" | "demo" | "suggested" | "integration";
export type TimelineVisibility = "prive" | "equipe" | "audience";
export type TimelineEntityKind = "guest" | "table" | "provider" | "task" | "payment" | "document" | "music" | "team" | "message" | "logistics" | "memory";
export type TimelineRelation = { kind: TimelineEntityKind; id: string; role?: string };
export type PropagationState = {
  state: "none" | "proposed" | "applied";
  lastAppliedAt?: number;
  sourceEventId?: string;
};

export type TimelineEvent = {
  id: string;
  time: number;
  endTime?: number;
  durationMinutes?: number;
  kind: "jalon" | "tache" | "intention" | "souvenir" | "document" | "devis" | "facture" | "paiement" | "evenement" | "message";
  title: string;
  detail?: string;
  amountCents?: number;
  location?: string;
  responsible?: string;
  vendor?: string;
  notes?: string;
  delayMinutes?: number;
  status: TimelineStatus;
  confidence: Confidence;
  phase: TimelinePhase;
  universe: string;
  ownerId?: string;
  relations?: TimelineRelation[];
  dependencyIds?: string[];
  resources?: string[];
  provenance?: TimelineProvenance;
  visibility?: TimelineVisibility;
  audience?: string[];
  propagation?: PropagationState;
};

export type WorldProject = {
  schemaVersion: 2;
  storyVersion?: 1;
  id: string;
  title: string;
  subtitle?: string;
  publicProfile?: {
    published: boolean;
  };
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
  ceremony: CeremonyContent;
  music: MusicTrack[];
  team: TeamRole[];
  memories: MemoryItem[];
  messageTemplates: MessageTemplate[];
  messageLogs: MessageLog[];
  media: MemoryItem[];
  messages: MessageLog[];
  
  missing: string[];
};
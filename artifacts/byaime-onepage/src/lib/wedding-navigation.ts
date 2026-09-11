import type { TimelineView } from "./timeline-graph";
import type { TimelineEntityKind } from "./types";

export const WORLD_PHASES = [
  { id: "avant", label: "Avant" },
  { id: "pendant", label: "Le Jour J" },
  { id: "apres", label: "Après" },
] as const;
export type WorldPhase = (typeof WORLD_PHASES)[number]["id"];
export type WeddingRole = "owner" | "planner" | "family" | "viewer";

export type WeddingCapabilities = {
  manage: boolean;
  editOperational: boolean;
  seeFinances: boolean;
  managePrivateDocuments: boolean;
};

export function getWeddingCapabilities(role: string): WeddingCapabilities {
  switch (role as WeddingRole) {
    case "owner":
    case "planner":
      return { manage: true, editOperational: true, seeFinances: true, managePrivateDocuments: true };
    case "family":
      return { manage: false, editOperational: true, seeFinances: false, managePrivateDocuments: false };
    default:
      return { manage: false, editOperational: false, seeFinances: false, managePrivateDocuments: false };
  }
}

export function getInitialWorldPhase(pivotTime: number, currentTime = Date.now()): WorldPhase {
  const pivot = new Date(pivotTime);
  const current = new Date(currentTime);
  if (pivot.getFullYear() === current.getFullYear() && pivot.getMonth() === current.getMonth() && pivot.getDate() === current.getDate()) return "pendant";
  return pivotTime > currentTime ? "avant" : "apres";
}

export const WEDDING_MODULE_IDS = [
  "seating", "budget", "documents", "ceremony", "music", "logistics", "messages", "team", "memories",
  "contributions", "thanks", "film", "honeymoon",
] as const;
export type WeddingModule = (typeof WEDDING_MODULE_IDS)[number];
export type WeddingPanelId = WeddingModule | "planning" | "guests" | "providers" | "dayof" | "sections";
export type WeddingDestination = { kind: "view"; view: TimelineView } | { kind: "panel"; panel: WeddingPanelId } | { kind: "route"; href: string };
export type WeddingNavigationItem = { id: string; label: string; description: string; destination: WeddingDestination };
export type WeddingNavigation = { primary: WeddingNavigationItem[]; secondary: WeddingNavigationItem[] };

const item = (id: string, label: string, description: string, destination: WeddingDestination): WeddingNavigationItem => ({ id, label, description, destination });
const timeline = (label: string, description: string) => item("timeline", label, description, { kind: "view", view: "chronological" });
const people = item("people", "Personnes", "Invités, réponses RSVP et besoins des personnes concernées.", { kind: "panel", panel: "guests" });
const providers = item("providers", "Prestataires", "Les professionnels engagés ou encore recherchés.", { kind: "panel", panel: "providers" });
const tasks = item("tasks", "Tâches", "Ce qu’il reste à préparer et à valider.", { kind: "panel", panel: "planning" });
const documents = item("documents", "Documents", "Les fichiers privés reliés à ce Monde.", { kind: "panel", panel: "documents" });
const finances = item("finances", "Finances", "Budget, engagements, paiements et échéances.", { kind: "panel", panel: "budget" });
const music = (label = "Musique") => item("music", label, "La projection sonore des Moments du mariage.", { kind: "view", view: "music" });
const dayof = item("day-of", "Régie du Jour J", "Le programme opérationnel du mariage en direct.", { kind: "panel", panel: "dayof" });
const practical = item("public-info", "Infos pratiques", "Les informations utiles aux personnes concernées.", { kind: "view", view: "public-info" });
const seating = item("seating", "Plan de table", "Les tables, capacités et placements.", { kind: "panel", panel: "seating" });
const contributions = item("contributions", "Contributions", "Les contributions liées à cette célébration.", { kind: "panel", panel: "contributions" });
const thanks = item("thanks", "Remerciements", "Les mots de remerciement après le mariage.", { kind: "panel", panel: "thanks" });
const photos = item("memories", "Photos & vidéos", "Les images et vidéos à préserver.", { kind: "panel", panel: "memories" });
const film = item("film", "Film du Jour J", "Le film et les séquences du mariage.", { kind: "panel", panel: "film" });
const honeymoon = item("honeymoon", "Voyage de noces", "Les informations du voyage de noces.", { kind: "panel", panel: "honeymoon" });
const extras = [
  item("ceremony", "Cérémonie & réception", "Le déroulé, les lectures et le menu.", { kind: "panel", panel: "ceremony" }),
  item("logistics", "Logistique", "Accès, transports et hébergements.", { kind: "panel", panel: "logistics" }),
  item("messages", "Messages", "Les informations envoyées aux personnes concernées.", { kind: "panel", panel: "messages" }),
  item("team", "Équipe", "Les responsabilités et la coordination.", { kind: "panel", panel: "team" }),
];

/** Pure phase- and capability-aware private World navigation manifest. */
export function getWeddingNavigation(phase: WorldPhase, capabilities: WeddingCapabilities): WeddingNavigation {
  const full = capabilities.manage;
  const operational = capabilities.editOperational;
  let primary: WeddingNavigationItem[];
  let secondary: WeddingNavigationItem[];
  if (phase === "avant") {
    primary = [timeline("Timeline", "Tous les Moments du mariage dans leur ordre vivant."), people, providers, tasks, documents, finances, music()];
    secondary = [...extras, seating];
  } else if (phase === "pendant") {
    primary = [timeline("Timeline en direct", "Les Moments du Jour J, au fil de la journée."), dayof, practical, seating, contributions, music("Musique en direct")];
    secondary = [people, providers, tasks, ...extras, documents, finances];
  } else {
    primary = [timeline("Timeline / Replay", "Le replay vivant des Moments du mariage."), people, thanks, photos, film, honeymoon];
    secondary = [music(), practical, contributions, providers, tasks, ...extras, documents, finances];
  }
  const allowed = (entry: WeddingNavigationItem) => {
    if (entry.id === "finances") return capabilities.seeFinances;
    if (entry.id === "documents" || entry.id === "film") return capabilities.managePrivateDocuments;
    if (full || operational) return true;
    return ["timeline", "people", "public-info", "music", "contributions", "thanks", "memories", "film", "honeymoon"].includes(entry.id);
  };
  primary = primary.filter(allowed);
  secondary = secondary.filter(allowed).filter(entry => !primary.some(primaryEntry => primaryEntry.id === entry.id || primaryEntry.label === entry.label));
  return { primary, secondary };
}

export const WEDDING_PANEL_LABELS: Record<WeddingPanelId, string> = {
  planning: "Tâches", guests: "Liste des invités", providers: "Prestataires", dayof: "Régie du Jour J", sections: "Toutes les sections",
  seating: "Plan de table", budget: "Finances", documents: "Documents", ceremony: "Cérémonie & réception", music: "Morceaux reliés",
  logistics: "Logistique", messages: "Messages", team: "Équipe", memories: "Photos & vidéos", contributions: "Contributions",
  thanks: "Remerciements", film: "Film du Jour J", honeymoon: "Voyage de noces",
};

export function isWeddingDestinationActive(destination: WeddingDestination, view: TimelineView, panel: WeddingPanelId | null) {
  if (destination.kind === "view") return destination.view === "music" ? destination.view === view && (panel === null || panel === "music") : panel === null && destination.view === view;
  return destination.kind === "panel" ? destination.panel === panel : false;
}

export function isWeddingPanelAvailable(
  panel: WeddingPanelId,
  navigation: WeddingNavigation,
  view: TimelineView,
) {
  if (panel === "sections") return true;
  const available = [...navigation.primary, ...navigation.secondary].some(
    item => item.destination.kind === "panel" && item.destination.panel === panel,
  );
  if (available) return true;
  return panel === "music" && view === "music";
}

export function getWeddingNavigationLabel(view: TimelineView, panel: WeddingPanelId | null, navigation?: WeddingNavigation) {
  if (panel) return WEDDING_PANEL_LABELS[panel];
  return navigation?.primary.concat(navigation.secondary).find(entry => entry.destination.kind === "view" && entry.destination.view === view)?.label ?? "Timeline";
}

/** Associe chaque type d'entité de la Timeline au panneau du Monde qui l'édite. */
export const PANEL_FOR_KIND: Partial<Record<TimelineEntityKind, WeddingPanelId>> = {
  guest: "guests",
  table: "seating",
  provider: "providers",
  task: "planning",
  payment: "budget",
  document: "documents",
  music: "music",
  team: "team",
  message: "messages",
  logistics: "logistics",
  memory: "memories",
};
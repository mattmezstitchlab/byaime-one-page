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
const ceremony = item("ceremony", "Cérémonie & réception", "Le déroulé, les lectures et le menu.", { kind: "panel", panel: "ceremony" });
const logistics = item("logistics", "Logistique", "Accès, transports et hébergements.", { kind: "panel", panel: "logistics" });
const messages = item("messages", "Messages", "Les informations envoyées aux personnes concernées.", { kind: "panel", panel: "messages" });
const team = item("team", "Équipe", "Les responsabilités et la coordination.", { kind: "panel", panel: "team" });

/**
 * Catégories communes aux trois périodes (Avant / Jour J / Après). Elles vivent
 * dans la barre latérale verticale gauche, comme la navigation globale, pour ne
 * plus encombrer la navigation horizontale de chaque mode.
 */
export const WEDDING_RAIL_ICONS = ["timeline", "people", "providers", "tasks", "finances", "documents", "team", "music"] as const;
export type WeddingRailIcon = (typeof WEDDING_RAIL_ICONS)[number];
export type WeddingRailItem = WeddingNavigationItem & { icon: WeddingRailIcon };

export function isWeddingEntryAllowed(entry: WeddingNavigationItem, capabilities: WeddingCapabilities): boolean {
  if (entry.id === "finances") return capabilities.seeFinances;
  if (entry.id === "documents" || entry.id === "film") return capabilities.managePrivateDocuments;
  if (capabilities.manage || capabilities.editOperational) return true;
  return ["timeline", "people", "public-info", "music", "contributions", "thanks", "memories", "film", "honeymoon"].includes(entry.id);
}

/** Barre latérale du Monde : les catégories communes, identiques d'un mode à l'autre. */
export function getWeddingRailItems(phase: WorldPhase, capabilities: WeddingCapabilities): WeddingRailItem[] {
  const timelineByPhase = {
    avant: timeline("Timeline", "Tous les Moments du mariage dans leur ordre vivant."),
    pendant: timeline("Timeline en direct", "Les Moments du Jour J, au fil de la journée."),
    apres: timeline("Timeline · Replay", "Le replay vivant des Moments du mariage."),
  }[phase];
  const entries: WeddingRailItem[] = [
    { ...timelineByPhase, icon: "timeline" },
    { ...people, icon: "people" },
    { ...providers, icon: "providers" },
    { ...tasks, icon: "tasks" },
    { ...finances, icon: "finances" },
    { ...documents, icon: "documents" },
    { ...team, icon: "team" },
    { ...music(phase === "pendant" ? "Musique en direct" : "Musique"), icon: "music" },
  ];
  return entries.filter(entry => isWeddingEntryAllowed(entry, capabilities));
}

/**
 * Navigation horizontale : ne reste que ce qui est propre au MODE courant.
 * Le socle commun (Personnes, Prestataires, Tâches, Finances, Documents,
 * Équipe, Musique) est dans la barre latérale ; cette rangée décrit la période.
 */
export function getWeddingNavigation(phase: WorldPhase, capabilities: WeddingCapabilities): WeddingNavigation {
  let primary: WeddingNavigationItem[];
  let secondary: WeddingNavigationItem[];
  if (phase === "avant") {
    primary = [ceremony, logistics, seating, messages];
    secondary = [];
  } else if (phase === "pendant") {
    primary = [dayof, practical, seating, contributions];
    secondary = [ceremony, logistics, messages];
  } else {
    primary = [thanks, photos, film, honeymoon, contributions, practical];
    secondary = [ceremony, logistics, messages];
  }
  primary = primary.filter(entry => isWeddingEntryAllowed(entry, capabilities));
  secondary = secondary.filter(entry => isWeddingEntryAllowed(entry, capabilities));
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

/**
 * Navigation contextuelle DANS un panneau : à quelle catégorie de navigation
 * il appartient, et donc quels panneaux voisins proposer en raccourcis.
 *  - « Socle commun » : les catégories présentes toute l'année dans le rail
 *    gauche (Personnes, Prestataires, Tâches, Finances, Documents, Équipe,
 *    Musique) ;
 *  - « Outils du mode » : les outils propres à la phase courante, de la
 *    rangée horizontale.
 * Le panneau « sections » est le sommaire complet et n'a pas de groupe.
 */
export type PanelContextGroup = { id: "rail" | "phase" | "sections"; label: string; items: WeddingNavigationItem[] };

export function getPanelContextGroup(
  panel: WeddingPanelId,
  rail: WeddingNavigationItem[],
  navigation: WeddingNavigation,
  view: TimelineView,
): PanelContextGroup {
  if (panel === "sections") return { id: "sections", label: "Navigation du Monde", items: [] };
  const phaseItems = [...navigation.primary, ...navigation.secondary];
  const belongsToRail =
    rail.some(item => item.destination.kind === "panel" && item.destination.panel === panel) ||
    (panel === "music" && view === "music");
  if (belongsToRail) return { id: "rail", label: "Socle commun", items: rail };
  return { id: "phase", label: "Outils du mode", items: phaseItems };
}

/**
 * Trouve la phase (Avant / Jour J / Après) dans laquelle un panneau donné est
 * accessible pour un rôle. Sert à ouvrir le bon mode quand on arrive sur un
 * panneau depuis une statistique, une recherche ou un graphe (ex. « Souvenirs »
 * cliqué en mode Avant doit basculer en Après, pas se refermer en silence).
 */
export function findPhaseForPanel(
  panel: WeddingPanelId,
  role: string,
  view: TimelineView,
): WorldPhase | null {
  if (panel === "sections") return null;
  const capabilities = getWeddingCapabilities(role);
  for (const phase of ["avant", "pendant", "apres"] as const) {
    const rail = getWeddingRailItems(phase, capabilities);
    const navigation = getWeddingNavigation(phase, capabilities);
    if (isWeddingPanelAvailable(panel, navigation, view, rail)) return phase;
  }
  return null;
}

export function isWeddingPanelAvailable(
  panel: WeddingPanelId,
  navigation: WeddingNavigation,
  view: TimelineView,
  rail: WeddingNavigationItem[] = [],
) {
  if (panel === "sections") return true;
  const available = [...rail, ...navigation.primary, ...navigation.secondary].some(
    item => item.destination.kind === "panel" && item.destination.panel === panel,
  );
  if (available) return true;
  return panel === "music" && view === "music";
}

export function getWeddingNavigationLabel(
  view: TimelineView,
  panel: WeddingPanelId | null,
  navigation?: WeddingNavigation,
  rail: WeddingNavigationItem[] = [],
) {
  if (panel) return WEDDING_PANEL_LABELS[panel];
  return rail.concat(navigation?.primary ?? [], navigation?.secondary ?? [])
    .find(entry => entry.destination.kind === "view" && entry.destination.view === view)?.label ?? "Timeline";
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
import type { TimelineView } from "./timeline-graph";

export const WORLD_PHASES = [
  { id: "avant", label: "Avant" },
  { id: "pendant", label: "Le Jour J" },
  { id: "apres", label: "Après" },
] as const;

export type WorldPhase = (typeof WORLD_PHASES)[number]["id"];

export function getInitialWorldPhase(
  pivotTime: number,
  currentTime = Date.now(),
): WorldPhase {
  const pivot = new Date(pivotTime);
  const current = new Date(currentTime);
  const isPivotDay =
    pivot.getFullYear() === current.getFullYear() &&
    pivot.getMonth() === current.getMonth() &&
    pivot.getDate() === current.getDate();

  if (isPivotDay) return "pendant";
  return pivotTime > currentTime ? "avant" : "apres";
}

export const WEDDING_MODULE_IDS = [
  "seating",
  "budget",
  "documents",
  "ceremony",
  "music",
  "logistics",
  "messages",
  "team",
  "memories",
] as const;

export type WeddingModule = (typeof WEDDING_MODULE_IDS)[number];

export type WeddingPanelId =
  | WeddingModule
  | "planning"
  | "guests"
  | "providers"
  | "dayof"
  | "sections";

export type WeddingDestination =
  | { kind: "view"; view: TimelineView }
  | { kind: "panel"; panel: WeddingPanelId }
  | { kind: "route"; href: string };

export type WeddingNavigationItem = {
  id: string;
  label: string;
  description: string;
  destination: WeddingDestination;
};

/**
 * Stable navigation hierarchy for the Wedding World.
 * Phases (Before, Wedding Day, After) filter the Timeline; they are not modules.
 */
export const WEDDING_PRIMARY_NAVIGATION: WeddingNavigationItem[] = [
  {
    id: "timeline",
    label: "Timeline",
    description: "Tous les Moments du mariage dans leur ordre vivant.",
    destination: { kind: "view", view: "chronological" },
  },
  {
    id: "music",
    label: "Musique",
    description: "La projection sonore des Moments, avant, pendant et après.",
    destination: { kind: "view", view: "music" },
  },
  {
    id: "people",
    label: "Personnes",
    description: "Invités, réponses RSVP et besoins des personnes concernées.",
    destination: { kind: "panel", panel: "guests" },
  },
  {
    id: "documents",
    label: "Documents",
    description: "Les fichiers privés reliés à ce Monde.",
    destination: { kind: "panel", panel: "documents" },
  },
  {
    id: "finances",
    label: "Finances",
    description: "Budget, engagements, paiements et échéances.",
    destination: { kind: "panel", panel: "budget" },
  },
];

export const WEDDING_SECONDARY_NAVIGATION: WeddingNavigationItem[] = [
  {
    id: "tasks",
    label: "Tâches",
    description: "Ce qu’il reste à préparer et à valider.",
    destination: { kind: "panel", panel: "planning" },
  },
  {
    id: "providers",
    label: "Prestataires",
    description: "Les professionnels engagés ou encore recherchés.",
    destination: { kind: "panel", panel: "providers" },
  },
  {
    id: "day-of",
    label: "Régie du Jour J",
    description: "Le programme opérationnel du mariage en direct.",
    destination: { kind: "panel", panel: "dayof" },
  },
  {
    id: "seating",
    label: "Plan de table",
    description: "Les tables, capacités et placements.",
    destination: { kind: "panel", panel: "seating" },
  },
  {
    id: "ceremony",
    label: "Cérémonie & réception",
    description: "Le déroulé, les lectures, le menu et les intentions.",
    destination: { kind: "panel", panel: "ceremony" },
  },
  {
    id: "logistics",
    label: "Logistique",
    description: "Accès, transports, hébergements et solutions de repli.",
    destination: { kind: "panel", panel: "logistics" },
  },
  {
    id: "messages",
    label: "Messages",
    description: "Les informations envoyées aux personnes concernées.",
    destination: { kind: "panel", panel: "messages" },
  },
  {
    id: "team",
    label: "Équipe",
    description: "Les responsabilités et la coordination du mariage.",
    destination: { kind: "panel", panel: "team" },
  },
  {
    id: "memories",
    label: "Souvenirs",
    description: "Les images, messages et éléments à préserver après.",
    destination: { kind: "panel", panel: "memories" },
  },
  {
    id: "public-info",
    label: "Infos pratiques",
    description: "Ce que le Monde rend visible aux personnes concernées.",
    destination: { kind: "view", view: "public-info" },
  },
];

export const WEDDING_PANEL_LABELS: Record<WeddingPanelId, string> = {
  planning: "Tâches",
  guests: "Liste des invités",
  providers: "Prestataires",
  dayof: "Régie du Jour J",
  sections: "Toutes les sections",
  seating: "Plan de table",
  budget: "Finances",
  documents: "Documents",
  ceremony: "Cérémonie & réception",
  music: "Morceaux reliés",
  logistics: "Logistique",
  messages: "Messages",
  team: "Équipe",
  memories: "Souvenirs",
};

export function isWeddingDestinationActive(
  destination: WeddingDestination,
  view: TimelineView,
  panel: WeddingPanelId | null,
) {
  if (destination.kind === "view") {
    if (destination.view === "music") return destination.view === view && (panel === null || panel === "music");
    return panel === null && destination.view === view;
  }
  if (destination.kind === "panel") return destination.panel === panel;
  return false;
}

export function getWeddingNavigationLabel(view: TimelineView, panel: WeddingPanelId | null) {
  if (panel) return WEDDING_PANEL_LABELS[panel];
  const activeView = [...WEDDING_PRIMARY_NAVIGATION, ...WEDDING_SECONDARY_NAVIGATION]
    .find(item => item.destination.kind === "view" && item.destination.view === view);
  return activeView?.label ?? "Timeline";
}
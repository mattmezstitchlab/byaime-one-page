import { translate, type Locale } from "./i18n-dictionary";
import type { TimelineView } from "./timeline-graph";
import type { TimelineEntityKind } from "./types";

/*
 * Les libellés du Monde sont traduits ici, à la source : la navigation est un
 * modèle de données, pas du texte figé. Chaque fabrique prend une locale, qui
 * vaut FR par défaut — les appels historiques et les registres restent valides,
 * et une clé manquante retombe en français plutôt que de disparaître.
 */
export const WORLD_PHASE_IDS = ["avant", "pendant", "apres"] as const;
export type WorldPhase = (typeof WORLD_PHASE_IDS)[number];

export function getWorldPhases(locale: Locale = "fr"): { id: WorldPhase; label: string }[] {
  return WORLD_PHASE_IDS.map(id => ({ id, label: translate(locale, `world.phase.${id}`) }));
}

/**
 * Le libellé court d'une période, pour les pastilles où « Le Jour J » est trop
 * long. Une valeur inconnue retombe sur « Moment ».
 */
export function getWorldPhaseShortLabel(phase: string | undefined, locale: Locale = "fr"): string {
  return (WORLD_PHASE_IDS as ReadonlyArray<string>).includes(phase ?? "")
    ? translate(locale, `world.phase.short.${phase}` as never)
    : translate(locale, "world.phase.short.moment");
}

/** Les trois périodes en français : conservé pour les appels non traduits. */
export const WORLD_PHASES = getWorldPhases("fr") as ReadonlyArray<{ id: WorldPhase; label: string }>;
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

const item = (
  locale: Locale,
  id: string,
  key: string,
  destination: WeddingDestination,
  labelKey = `world.item.${key}`,
): WeddingNavigationItem => ({
  id,
  label: translate(locale, labelKey as never),
  description: translate(locale, `world.item.${key}.desc` as never),
  destination,
});

const timeline = (locale: Locale, variant: "" | ".live" | ".replay") =>
  item(locale, "timeline", `timeline${variant}`, { kind: "view", view: "chronological" }, `world.item.timeline${variant}`);
const people = (locale: Locale) => item(locale, "people", "people", { kind: "panel", panel: "guests" });
const providers = (locale: Locale) => item(locale, "providers", "providers", { kind: "panel", panel: "providers" });
const tasks = (locale: Locale) => item(locale, "tasks", "tasks", { kind: "panel", panel: "planning" });
const documents = (locale: Locale) => item(locale, "documents", "documents", { kind: "panel", panel: "documents" });
const finances = (locale: Locale) => item(locale, "finances", "finances", { kind: "panel", panel: "budget" });
const music = (locale: Locale, live = false) =>
  item(locale, "music", "music", { kind: "view", view: "music" }, live ? "world.item.music.live" : "world.item.music");
const dayof = (locale: Locale) => item(locale, "day-of", "dayof", { kind: "panel", panel: "dayof" });
const practical = (locale: Locale) => item(locale, "public-info", "publicInfo", { kind: "view", view: "public-info" });
const seating = (locale: Locale) => item(locale, "seating", "seating", { kind: "panel", panel: "seating" });
const contributions = (locale: Locale) => item(locale, "contributions", "contributions", { kind: "panel", panel: "contributions" });
const thanks = (locale: Locale) => item(locale, "thanks", "thanks", { kind: "panel", panel: "thanks" });
const photos = (locale: Locale) => item(locale, "memories", "memories", { kind: "panel", panel: "memories" });
const film = (locale: Locale) => item(locale, "film", "film", { kind: "panel", panel: "film" });
const honeymoon = (locale: Locale) => item(locale, "honeymoon", "honeymoon", { kind: "panel", panel: "honeymoon" });
const ceremony = (locale: Locale) => item(locale, "ceremony", "ceremony", { kind: "panel", panel: "ceremony" });
const logistics = (locale: Locale) => item(locale, "logistics", "logistics", { kind: "panel", panel: "logistics" });
const messages = (locale: Locale) => item(locale, "messages", "messages", { kind: "panel", panel: "messages" });
const team = (locale: Locale) => item(locale, "team", "team", { kind: "panel", panel: "team" });

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
export function getWeddingRailItems(
  phase: WorldPhase,
  capabilities: WeddingCapabilities,
  locale: Locale = "fr",
): WeddingRailItem[] {
  const timelineByPhase = {
    avant: timeline(locale, ""),
    pendant: timeline(locale, ".live"),
    apres: timeline(locale, ".replay"),
  }[phase];
  const entries: WeddingRailItem[] = [
    { ...timelineByPhase, icon: "timeline" },
    { ...people(locale), icon: "people" },
    { ...providers(locale), icon: "providers" },
    { ...tasks(locale), icon: "tasks" },
    { ...finances(locale), icon: "finances" },
    { ...documents(locale), icon: "documents" },
    { ...team(locale), icon: "team" },
    { ...music(locale, phase === "pendant"), icon: "music" },
  ];
  return entries.filter(entry => isWeddingEntryAllowed(entry, capabilities));
}

/**
 * Navigation horizontale : ne reste que ce qui est propre au MODE courant.
 * Le socle commun (Personnes, Prestataires, Tâches, Finances, Documents,
 * Équipe, Musique) est dans la barre latérale ; cette rangée décrit la période.
 */
export function getWeddingNavigation(
  phase: WorldPhase,
  capabilities: WeddingCapabilities,
  locale: Locale = "fr",
): WeddingNavigation {
  let primary: WeddingNavigationItem[];
  let secondary: WeddingNavigationItem[];
  if (phase === "avant") {
    primary = [ceremony(locale), logistics(locale), seating(locale), messages(locale)];
    secondary = [];
  } else if (phase === "pendant") {
    primary = [dayof(locale), practical(locale), seating(locale), contributions(locale)];
    secondary = [ceremony(locale), logistics(locale), messages(locale)];
  } else {
    primary = [thanks(locale), photos(locale), film(locale), honeymoon(locale), contributions(locale), practical(locale)];
    secondary = [ceremony(locale), logistics(locale), messages(locale)];
  }
  primary = primary.filter(entry => isWeddingEntryAllowed(entry, capabilities));
  secondary = secondary.filter(entry => isWeddingEntryAllowed(entry, capabilities));
  return { primary, secondary };
}

export const WEDDING_PANEL_IDS = [
  "planning", "guests", "providers", "dayof", "sections", "seating", "budget", "documents", "ceremony",
  "music", "logistics", "messages", "team", "memories", "contributions", "thanks", "film", "honeymoon",
] as const;

export function getWeddingPanelLabels(locale: Locale = "fr"): Record<WeddingPanelId, string> {
  return Object.fromEntries(
    WEDDING_PANEL_IDS.map(panel => [panel, translate(locale, `world.panel.${panel}` as never)]),
  ) as Record<WeddingPanelId, string>;
}

export function getWeddingPanelLabel(panel: WeddingPanelId, locale: Locale = "fr"): string {
  return translate(locale, `world.panel.${panel}` as never);
}

/** Les libellés en français : conservé pour les appels et registres non traduits. */
export const WEDDING_PANEL_LABELS: Record<WeddingPanelId, string> = getWeddingPanelLabels("fr");

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
  locale: Locale = "fr",
): PanelContextGroup {
  if (panel === "sections") return { id: "sections", label: translate(locale, "world.group.navigation"), items: [] };
  const phaseItems = [...navigation.primary, ...navigation.secondary];
  const belongsToRail =
    rail.some(item => item.destination.kind === "panel" && item.destination.panel === panel) ||
    (panel === "music" && view === "music");
  if (belongsToRail) return { id: "rail", label: translate(locale, "world.group.rail"), items: rail };
  return { id: "phase", label: translate(locale, "world.group.phase"), items: phaseItems };
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
  for (const phase of WORLD_PHASE_IDS) {
    /* Question de structure, pas d'affichage : la locale n'entre pas en compte. */
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
  locale: Locale = "fr",
) {
  if (panel) return getWeddingPanelLabel(panel, locale);
  return rail.concat(navigation?.primary ?? [], navigation?.secondary ?? [])
    .find(entry => entry.destination.kind === "view" && entry.destination.view === view)?.label
    ?? translate(locale, "world.item.timeline");
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
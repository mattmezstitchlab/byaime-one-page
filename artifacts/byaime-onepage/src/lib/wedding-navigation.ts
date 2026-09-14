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
export type WeddingPanelId = WeddingModule | "planning" | "guests" | "providers" | "dayof" | "pilotage";
export type WeddingDestination = { kind: "view"; view: TimelineView } | { kind: "panel"; panel: WeddingPanelId } | { kind: "route"; href: string };
export type WeddingNavigationItem = { id: string; label: string; description: string; destination: WeddingDestination };
export type WeddingNavigation = { primary: WeddingNavigationItem[]; secondary: WeddingNavigationItem[] };

/**
 * Normalisation des panneaux.
 *
 * P3 (14/09) : Personnes, Prestataires et Tâches ne sont plus trois fenêtres —
 * c'est un seul panneau, « Pilotage », avec trois onglets. Les identifiants
 * historiques restent acceptés partout (deep-links `/panel=guests`, favoris,
 * statistiques cliquées) : ils atterrissent sur le bon onglet de Pilotage.
 */
export function normalizePanelId(panel: WeddingPanelId): WeddingPanelId {
  if (panel === "seating" || panel === "guests") return "pilotage";
  if (panel === "budget" || panel === "providers") return "pilotage";
  if (panel === "planning") return "pilotage";
  if (panel === "memories" || panel === "film" || panel === "contributions" || panel === "thanks") return "documents";
  if (panel === "ceremony" || panel === "team") return "logistics";
  return panel;
}

/** L'onglet de Pilotage visé par un identifiant historique. */
export type PilotageTabId = "guests" | "providers" | "planning";

export function pilotageTabFor(panel: WeddingPanelId): PilotageTabId | undefined {
  if (panel === "seating" || panel === "guests") return "guests";
  if (panel === "budget" || panel === "providers") return "providers";
  if (panel === "planning") return "planning";
  return undefined;
}


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
const pilotage = (locale: Locale) => item(locale, "pilotage", "pilotage", { kind: "panel", panel: "pilotage" });
const documents = (locale: Locale) => item(locale, "documents", "documents", { kind: "panel", panel: "documents" });
const music = (locale: Locale, live = false) =>
  item(locale, "music", "music", { kind: "view", view: "music" }, live ? "world.item.music.live" : "world.item.music");
const dayof = (locale: Locale) => item(locale, "day-of", "dayof", { kind: "panel", panel: "dayof" });
const practical = (locale: Locale) => item(locale, "public-info", "publicInfo", { kind: "view", view: "public-info" });
const logistics = (locale: Locale) => item(locale, "logistics", "logistics", { kind: "panel", panel: "logistics" });
const messages = (locale: Locale) => item(locale, "messages", "messages", { kind: "panel", panel: "messages" });

/**
 * Catégories communes aux trois périodes (Avant / Jour J / Après). Elles vivent
 * dans la barre latérale verticale gauche, comme la navigation globale, pour ne
 * plus encombrer la navigation horizontale de chaque phase.
 */
/* Vocabulaire d'icônes du rail. Le rail de P3 n'en utilise que cinq
   * (timeline, people, documents, logistics, music) ; « providers » et « tasks »
   * restent déclarés parce que `Record<WeddingRailIcon, …>` (CommandBar) doit
   * pouvoir typer les sept. */
export const WEDDING_RAIL_ICONS = ["timeline", "people", "providers", "tasks", "documents", "logistics", "music"] as const;
export type WeddingRailIcon = (typeof WEDDING_RAIL_ICONS)[number];
export type WeddingRailItem = WeddingNavigationItem & { icon: WeddingRailIcon };

export function isWeddingEntryAllowed(
  entry: WeddingNavigationItem,
  capabilities: WeddingCapabilities,
): boolean {
  if (entry.id === "finances") return capabilities.seeFinances;
  if (entry.id === "documents" || entry.id === "film") return capabilities.managePrivateDocuments;
  if (capabilities.manage || capabilities.editOperational) return true;
  return ["timeline", "people", "pilotage", "public-info", "music", "contributions"].includes(entry.id);
}

/** Barre latérale du Monde : les catégories communes, identiques d'une phase à l'autre. */
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
    { ...pilotage(locale), icon: "people" },
    { ...documents(locale), icon: "documents" },
    { ...logistics(locale), icon: "logistics" },
    { ...music(locale, phase === "pendant"), icon: "music" },
  ];
  return entries.filter(entry => isWeddingEntryAllowed(entry, capabilities));
}

/**
 * Navigation horizontale : ne reste que ce qui est propre à la phase courante.
 * Le socle commun (Pilotage, Documents, Logistique, Musique) est dans la
 * fenêtre unique ; cette rangée décrit la période.
 */
export function getWeddingNavigation(
  phase: WorldPhase,
  capabilities: WeddingCapabilities,
  locale: Locale = "fr",
): WeddingNavigation {
  let primary: WeddingNavigationItem[];
  let secondary: WeddingNavigationItem[];
  if (phase === "avant") {
    // P2: logistics est dans le rail (Organisation unifiée), plus besoin en horizontal -> uniquement Messages
    primary = [messages(locale)];
    secondary = [];
  } else if (phase === "pendant") {
    primary = [dayof(locale), practical(locale), messages(locale)];
    secondary = [];
  } else {
    primary = [];
    secondary = [];
  }
  primary = primary.filter(entry => isWeddingEntryAllowed(entry, capabilities));
  secondary = secondary.filter(entry => isWeddingEntryAllowed(entry, capabilities));
  return { primary, secondary };
}

export const WEDDING_PANEL_IDS = [
  "pilotage", "planning", "guests", "providers", "dayof", "seating", "budget", "documents", "ceremony",
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
 *  - « Socle commun » : les catégories présentes toute l'année dans le panneau
 *    de l'orbe (Personnes, Prestataires, Tâches, Finances, Documents, Équipe,
 *    Musique) ;
 *  - « Outils du mode » : les outils propres à la phase courante, de la
 *    rangée horizontale — qui liste désormais toutes les entrées, sans
 *    sommaire intermédiaire.
 */
export type PanelContextGroup = { id: "rail" | "phase"; label: string; items: WeddingNavigationItem[] };

export function getPanelContextGroup(
  panel: WeddingPanelId,
  rail: WeddingNavigationItem[],
  navigation: WeddingNavigation,
  view: TimelineView,
  locale: Locale = "fr",
): PanelContextGroup {
  const normalized = normalizePanelId(panel);
  const phaseItems = [...navigation.primary, ...navigation.secondary];
  const belongsToRail =
    rail.some(item => item.destination.kind === "panel" && item.destination.panel === normalized) ||
    (normalized === "music" && view === "music");
  if (belongsToRail) return { id: "rail", label: translate(locale, "world.group.rail"), items: rail };
  return { id: "phase", label: translate(locale, "world.group.phase"), items: phaseItems };
}

/**
 * Trouve la phase (Avant / Jour J / Après) dans laquelle un panneau donné est
 * accessible pour un rôle. Sert à ouvrir la bonne phase quand on arrive sur un
 * panneau depuis une statistique, une recherche ou un graphe (ex. « Souvenirs »
 * cliqué en phase Avant doit basculer en Après, pas se refermer en silence).
 */
export function findPhaseForPanel(
  panel: WeddingPanelId,
  role: string,
  view: TimelineView,
): WorldPhase | null {
  const normalized = normalizePanelId(panel);
  const capabilities = getWeddingCapabilities(role);
  for (const phase of WORLD_PHASE_IDS) {
    const rail = getWeddingRailItems(phase, capabilities, "fr");
    const navigation = getWeddingNavigation(phase, capabilities, "fr");
    if (isWeddingPanelAvailable(normalized as WeddingPanelId, navigation, view, rail)) return phase;
  }
  return null;
}

export function isWeddingPanelAvailable(
  panel: WeddingPanelId,
  navigation: WeddingNavigation,
  view: TimelineView,
  rail: WeddingNavigationItem[] = [],
) {
  const normalized = normalizePanelId(panel);
  const available = [...rail, ...navigation.primary, ...navigation.secondary].some(
    item => item.destination.kind === "panel" && item.destination.panel === normalized,
  );
  if (available) return true;
  if (["pilotage", "documents", "logistics"].includes(normalized)) return true;
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
  guest: "pilotage",
  table: "pilotage",
  provider: "pilotage",
  task: "pilotage",
  payment: "pilotage",
  document: "documents",
  music: "music",
  team: "logistics",
  message: "messages",
  logistics: "logistics",
  memory: "documents",
};
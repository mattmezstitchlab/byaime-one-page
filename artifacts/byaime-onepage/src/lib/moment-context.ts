import { translate, type Locale } from "./i18n-dictionary";
import { formatCents } from "./money";
import type { TimelineView } from "./timeline-graph";
import type { Document, Guest, MusicTrack, Provider, TimelineEvent, WorldProject } from "./types";
import {
  normalizePanelId,
  type WeddingDestination,
  type WeddingPanelId,
} from "./wedding-navigation";
import { momentVisualZone, type MomentVisualZone } from "./world-visuals";

/*
 * UN MOMENT = UN CONTEXTE = SES ACTIONS.
 *
 * La Timeline est l'interface principale du Monde : chaque Moment porte lui-même
 * ses repères (ce qui est déjà connu) et ses actions (ce qu'on peut faire là,
 * maintenant). Les panneaux ne sont plus des destinations : ce sont des
 * profondeurs d'interaction, ouvertes DEPUIS un Moment.
 *
 * Règles non négociables :
 *  - aucune donnée dupliquée : tout repère est DÉRIVÉ du WorldProject (mêmes
 *    collections que les panneaux détaillés — prestataires, documents, musique,
 *    invités, paiements) ;
 *  - aucune navigation nouvelle : chaque action réutilise `WeddingDestination`
 *    (panneau / vue / route) — le panneau ouvert est exactement celui que le
 *    rail ouvrait déjà, simplement ancré sur le Moment ;
 *  - zéro charge cognitive : 4 actions primaires maximum, le reste replié sous
 *    « Plus », et 4 repères maximum.
 *
 * Remappage des anciens panneaux (inventaire réel du code) :
 *
 *   Ancien panneau            Nouvelle place (Moment)
 *   ────────────────────────  ─────────────────────────────────────────────
 *   Lieu / Prestataires       Moments « lieu », « photographe », « musique »…
 *                             (action Rechercher / Professionnels)
 *   Budget / Finances         Moments à impact financier (action Budget)
 *   Personnes / Plan table    Moments « invités », « table », « cérémonie »
 *   Documents / Galerie       Moments « photographe », « lieu », « souvenirs »
 *   Musique / Playlist        Moments « musique », « cérémonie », « soirée »
 *   Messages                  Moments « invités », « photographe », « merci »
 *   Logistique / Organisation Moments « table », « cérémonie », « transport »
 *   Tâches / Planning         Moments « finaliser », génériques
 *   Régie du Jour J           Moments de la phase Jour J uniquement
 *   Infos pratiques           Moments Jour J (vue public-info)
 *   Souvenirs / Film / Merci  Moments de la phase Après
 */

/** Ce que le Moment demande de faire : dérivé, jamais saisi à la main. */
export type MomentIntentId =
  | "lieu"
  | "photographe"
  | "videaste"
  | "musique"
  | "invites"
  | "table"
  | "ceremonie"
  | "tenue"
  | "fleurs"
  | "transport"
  | "soiree"
  | "prep"
  | "jour-j"
  | "souvenirs"
  | "remerciements"
  | "finaliser"
  | "generique";

/** Vocabulaire d'icônes des repères et actions d'un Moment. */
export type MomentIconId =
  | "place"
  | "search"
  | "people"
  | "doc"
  | "message"
  | "money"
  | "images"
  | "music"
  | "list"
  | "guests"
  | "seating"
  | "diet"
  | "planning"
  | "run"
  | "clock"
  | "clip"
  | "video"
  | "thanks"
  | "share"
  | "info"
  | "check";

export type MomentFact = {
  id: string;
  icon: MomentIconId;
  label: string;
  value?: string;
};

export type MomentAction = {
  id: string;
  icon: MomentIconId;
  label: string;
  /** Destination EXISTANTE : panneau, vue ou route. Rien de nouveau. */
  destination: WeddingDestination;
  /** Le panneau détaillé s'ouvre ancré sur ce Moment (filtre / surbrillance). */
  scoped: boolean;
};

export type MomentContextModel = {
  intent: MomentIntentId;
  zone: MomentVisualZone;
  facts: MomentFact[];
  /** Actions primaires d'abord (4 max), puis le repli « Plus ». */
  actions: MomentAction[];
  primaryCount: number;
};

export type MomentCapabilities = {
  seeFinances: boolean;
  manageDocuments: boolean;
};

export const FULL_MOMENT_CAPABILITIES: MomentCapabilities = {
  seeFinances: true,
  manageDocuments: true,
};

const panel = (id: WeddingPanelId): WeddingDestination => ({ kind: "panel", panel: id });
const view = (id: TimelineView): WeddingDestination => ({ kind: "view", view: id });

type ActionSeed = Omit<MomentAction, "label"> & { labelKey: Parameters<typeof translate>[1] };

const ACTION_SEEDS = {
  providers: { id: "providers", icon: "search", destination: panel("providers"), scoped: true, labelKey: "moment.action.providers" },
  pros: { id: "pros", icon: "people", destination: panel("providers"), scoped: true, labelKey: "moment.action.pros" },
  portfolio: { id: "portfolio", icon: "images", destination: panel("documents"), scoped: true, labelKey: "moment.action.portfolio" },
  contact: { id: "contact", icon: "message", destination: panel("messages"), scoped: true, labelKey: "moment.action.contact" },
  documents: { id: "documents", icon: "doc", destination: panel("documents"), scoped: true, labelKey: "moment.action.documents" },
  budget: { id: "budget", icon: "money", destination: panel("providers"), scoped: true, labelKey: "moment.action.budget" },
  music: { id: "music", icon: "music", destination: view("music"), scoped: false, labelKey: "moment.action.music" },
  playlist: { id: "playlist", icon: "list", destination: panel("music"), scoped: true, labelKey: "moment.action.playlist" },
  guests: { id: "guests", icon: "guests", destination: panel("guests"), scoped: true, labelKey: "moment.action.guests" },
  seating: { id: "seating", icon: "seating", destination: panel("seating"), scoped: true, labelKey: "moment.action.seating" },
  dietary: { id: "dietary", icon: "diet", destination: panel("guests"), scoped: true, labelKey: "moment.action.dietary" },
  planning: { id: "planning", icon: "planning", destination: panel("planning"), scoped: true, labelKey: "moment.action.planning" },
  dayof: { id: "dayof", icon: "run", destination: panel("dayof"), scoped: false, labelKey: "moment.action.dayof" },
  regie: { id: "regie", icon: "clock", destination: panel("dayof"), scoped: false, labelKey: "moment.action.regie" },
  orga: { id: "orga", icon: "clip", destination: panel("logistics"), scoped: false, labelKey: "moment.action.orga" },
  gallery: { id: "gallery", icon: "images", destination: panel("documents"), scoped: true, labelKey: "moment.action.gallery" },
  film: { id: "film", icon: "video", destination: panel("documents"), scoped: true, labelKey: "moment.action.film" },
  thanks: { id: "thanks", icon: "thanks", destination: panel("messages"), scoped: true, labelKey: "moment.action.thanks" },
  messages: { id: "messages", icon: "message", destination: panel("messages"), scoped: true, labelKey: "moment.action.messages" },
  publicInfo: { id: "public-info", icon: "info", destination: view("public-info"), scoped: false, labelKey: "moment.action.publicInfo" },
  share: {
    id: "share",
    icon: "share",
    /* Le bilan partagé est une route réelle, déjà publique : /bilan/:id. */
    destination: { kind: "route", href: "" },
    scoped: false,
    labelKey: "moment.action.share",
  },
} satisfies Record<string, ActionSeed>;

type ActionId = keyof typeof ACTION_SEEDS;

/** Sélection éditoriale : 4 primaires, le reste replié. Jamais 15 boutons. */
export const INTENT_ACTIONS: Record<MomentIntentId, ActionId[]> = {
  lieu: ["providers", "pros", "documents", "budget", "contact"],
  photographe: ["providers", "pros", "portfolio", "contact", "documents", "budget"],
  videaste: ["providers", "pros", "film", "contact", "documents"],
  musique: ["music", "playlist", "pros", "budget", "contact"],
  invites: ["guests", "seating", "dietary", "messages", "documents"],
  table: ["pros", "orga", "guests", "dietary", "budget"],
  ceremonie: ["dayof", "guests", "music", "documents", "orga"],
  tenue: ["pros", "documents", "planning"],
  fleurs: ["pros", "documents", "budget"],
  transport: ["pros", "orga", "guests"],
  soiree: ["music", "dayof", "guests", "gallery"],
  prep: ["planning", "orga", "documents"],
  "jour-j": ["regie", "music", "guests", "publicInfo", "gallery"],
  souvenirs: ["gallery", "film", "thanks", "share"],
  remerciements: ["thanks", "gallery", "share", "messages"],
  finaliser: ["documents", "budget", "planning", "guests", "playlist", "dayof"],
  generique: ["planning", "providers", "documents", "messages"],
};

export const MOMENT_PRIMARY_COUNT = 4;
export const MOMENT_MAX_FACTS = 4;

const PROVIDER_INTENT: Partial<Record<Provider["category"], MomentIntentId>> = {
  lieu: "lieu",
  photo: "photographe",
  video: "videaste",
  musique: "musique",
  traiteur: "table",
};

const ZONE_INTENT: Record<MomentVisualZone, MomentIntentId> = {
  venue: "lieu",
  portrait: "photographe",
  film: "videaste",
  music: "musique",
  guests: "invites",
  table: "table",
  ceremony: "ceremonie",
  attire: "tenue",
  flowers: "fleurs",
  transport: "transport",
  reception: "soiree",
  prep: "prep",
};

const DAY = 86400000;

/* ————————————————————————————————————————————————
   Entités reliées — la source unique partagée par la
   Timeline (repères) et les panneaux (filtres).
———————————————————————————————————————————————— */

export type MomentLinks = {
  providers: Provider[];
  documents: Document[];
  tracks: MusicTrack[];
  guests: Guest[];
};

/** Tout ce que le Monde connaît déjà et qui touche ce Moment. */
export function momentLinks(project: WorldProject, eventId: string): MomentLinks {
  /* `?? []` : un Monde enregistré avant qu'une collection existe (ou une
     fixture de test partielle) ne doit jamais casser la Timeline. */
  const timeline = project.timeline ?? [];
  const event = timeline.find(item => item.id === eventId);
  const relations = event?.relations ?? [];
  const providerIds = relations.filter(relation => relation.kind === "provider").map(relation => relation.id);
  const providers = (project.providers ?? []).filter(provider => providerIds.includes(provider.id));
  const documentIds = relations.filter(relation => relation.kind === "document").map(relation => relation.id);
  const documents = (project.documents ?? []).filter(
    document => documentIds.includes(document.id) || providers.some(provider => provider.id === document.providerId),
  );
  const trackIds = relations.filter(relation => relation.kind === "music").map(relation => relation.id);
  const tracks = (project.music ?? []).filter(
    track => trackIds.includes(track.id) || (track.timelineEventIds ?? []).includes(eventId),
  );
  const guestIds = relations.filter(relation => relation.kind === "guest").map(relation => relation.id);
  const guests = (project.guests ?? []).filter(guest => guestIds.includes(guest.id));
  return { providers, documents, tracks, guests };
}

export function momentDocumentIds(project: WorldProject, eventId: string): string[] {
  return momentLinks(project, eventId).documents.map(document => document.id);
}

export function momentTrackIds(project: WorldProject, eventId: string): string[] {
  return momentLinks(project, eventId).tracks.map(track => track.id);
}

export function momentProviderIds(project: WorldProject, eventId: string): string[] {
  return momentLinks(project, eventId).providers.map(provider => provider.id);
}

export function momentGuestIds(project: WorldProject, eventId: string): string[] {
  return momentLinks(project, eventId).guests.map(guest => guest.id);
}

/* ————————————————————————————————————————————————
   Intention du Moment
———————————————————————————————————————————————— */

const THANKS_PATTERN = /merci|remerciement|gratitude|thank/i;
const CLOSING_PATTERN = /dernier point|briefing|solde|r[eè]glement|final|paiement/i;
const CEREMONY_PATTERN = /c[eé]r[eé]monie|engagement|v[oœ]ux|[eé]glise|mairie|officiant|la[iï]que|serment/i;

/*
 * Lecture du titre d'abord : le Jour J et l'Avant ne se devinent pas sur la
 * même chose. Un titre qui nomme le sujet (« Save the Date », « Alliances »,
 * « Plan de table ») décide de l'intention ; à défaut on retombe sur le
 * prestataire relié, puis sur la zone visuelle déjà calculée pour le fond.
 */
const TITLE_INTENT: ReadonlyArray<readonly [RegExp, MomentIntentId]> = [
  [/budget|[eé]bauche/i, "finaliser"],
  [/save the date|faire-part|faire part|invitation|rsvp|liste d.invit[eé]s/i, "invites"],
  [/plan de table|placement|table/i, "table"],
  [/alliance|bague|tenue|robe|costume|essayage|cort[eè]ge/i, "tenue"],
  [/lune de miel|voyage de noces|planner|organisation|briefing/i, "prep"],
  [/beaut[eé]|coiffure|maquillage|manucure|soin/i, "prep"],
  [/fleur|bouquet|floral/i, "fleurs"],
  [/musique|dj|groupe|playlist|orchestre|bal/i, "musique"],
  [/film|vid[eé]o|cin[eé]ma/i, "videaste"],
  [/photo|reportage|galerie|album|souvenir/i, "photographe"],
  [/navette|transport|trajet|h[eé]bergement|h[oô]tel|voiture/i, "transport"],
  [/menu|d[eé]gustation|traiteur|banquet|repas|cocktail|g[aâ]teau|brunch|d[iî]ner/i, "table"],
  [/lieu|domaine|ch[aâ]teau|salle|visite|d[eé]cor|installation/i, "lieu"],
];

export function momentIntent(event: TimelineEvent, project: WorldProject): MomentIntentId {
  const links = momentLinks(project, event.id);
  const providerIntent = links.providers
    .map(provider => PROVIDER_INTENT[provider.category])
    .find((intent): intent is MomentIntentId => Boolean(intent));

  const text = [event.title, event.detail].filter(Boolean).join(" ");

  /* Le tout premier Moment porte l'intention : rien à chercher, tout à écrire. */
  if (event.kind === "intention") return "generique";

  /* ——— Après : on ne cherche plus de prestataire, on referme le Monde ——— */
  if (event.phase === "apres") {
    if (THANKS_PATTERN.test(text) || event.kind === "message") return "remerciements";
    if (CLOSING_PATTERN.test(text)) return "finaliser";
    return "souvenirs";
  }

  /* ——— Jour J : la régie d'abord, le poste relié n'est qu'un repère ——— */
  if (event.phase === "pendant") {
    if (CEREMONY_PATTERN.test(text)) return "ceremonie";
    const zone = momentVisualZone(event, project);
    if (zone === "table") return "table";
    if (zone === "music") return "musique";
    if (zone === "reception") return "soiree";
    return "jour-j";
  }

  /* ——— Avant : le poste relié décide (c'est lui qu'on cherche) ——— */
  if (providerIntent) return providerIntent;

  const titleIntent = TITLE_INTENT.find(([pattern]) => pattern.test(event.title))?.[1];
  if (titleIntent) return titleIntent;

  const daysToPivot = (project.pivot.value - event.time) / DAY;
  const closingWindow = daysToPivot >= 0 && daysToPivot <= 45;
  if (closingWindow && CLOSING_PATTERN.test(text)) return "finaliser";

  const zone = momentVisualZone(event, project);
  if (closingWindow && zone === "reception") return "finaliser";
  return ZONE_INTENT[zone] ?? "generique";
}

/* ————————————————————————————————————————————————
   Repères & actions
———————————————————————————————————————————————— */

const PROVIDER_STATUS_LABEL: Record<Provider["status"], string> = {
  recherche: "à trouver",
  contacte: "contacté",
  rencontre: "rencontré",
  devis: "devis reçu",
  reserve: "réservé",
};

function buildFacts(
  event: TimelineEvent,
  project: WorldProject,
  intent: MomentIntentId,
  capabilities: MomentCapabilities,
  locale: Locale,
): MomentFact[] {
  const links = momentLinks(project, event.id);
  const facts: MomentFact[] = [];
  const label = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  const place = event.location || [project.venue?.value, project.city?.value].filter(Boolean).join(" · ");
  if (place && intent !== "generique") {
    facts.push({ id: "place", icon: "place", label: label("moment.fact.place"), value: place });
  }

  const provider = links.providers[0];
  if (provider) {
    facts.push({
      id: "provider",
      icon: "people",
      label: provider.role,
      value: `${provider.name || "À nommer"} · ${PROVIDER_STATUS_LABEL[provider.status]}`,
    });
  }

  if (capabilities.manageDocuments && links.documents.length > 0) {
    const [first, ...rest] = links.documents;
    facts.push({
      id: "documents",
      icon: "doc",
      label: label("moment.fact.documents"),
      value: rest.length > 0 ? `${first.title} +${rest.length}` : first.title,
    });
  }

  if (links.tracks.length > 0) {
    const track = links.tracks[0];
    facts.push({
      id: "music",
      icon: "music",
      label: label("moment.fact.music"),
      value: track.status === "valide" && track.title !== "À choisir"
        ? `${track.title}${track.artist ? ` · ${track.artist}` : ""}`
        : translate(locale, "moment.fact.music.todo"),
    });
  }

  if (links.guests.length > 0) {
    const [first, ...rest] = links.guests;
    facts.push({
      id: "people",
      icon: "guests",
      label: label("moment.fact.people"),
      value: rest.length > 0 ? `${first.name} +${rest.length}` : first.name,
    });
  }

  const financial: MomentIntentId[] = ["lieu", "photographe", "videaste", "musique", "table", "fleurs", "transport", "finaliser"];
  if (capabilities.seeFinances && financial.includes(intent)) {
    const committed = links.providers.reduce((sum, item) => sum + (item.amountCents ?? 0), 0);
    if (committed > 0) {
      facts.push({ id: "budget", icon: "money", label: label("moment.fact.budget"), value: formatCents(committed, project.currency) });
    } else if (intent === "finaliser" && project.budget?.value) {
      facts.push({ id: "budget", icon: "money", label: label("moment.fact.budget"), value: formatCents(project.budget.value, project.currency) });
    }
  }

  if (intent === "finaliser" || intent === "generique") {
    const open = (project.tasks ?? []).filter(task => task.status !== "termine");
    if (open.length > 0) {
      facts.push({
        id: "tasks",
        icon: "planning",
        label: label("moment.fact.tasks"),
        value: translate(locale, "moment.fact.tasks.count", { count: open.length }),
      });
    }
  }

  if (event.status === "execute") {
    facts.push({ id: "state", icon: "check", label: label("moment.fact.state"), value: translate(locale, "moment.fact.state.done") });
  }

  return facts.slice(0, MOMENT_MAX_FACTS);
}

function buildActions(
  intent: MomentIntentId,
  capabilities: MomentCapabilities,
  locale: Locale,
  project: WorldProject,
): MomentAction[] {
  return INTENT_ACTIONS[intent]
    .map(id => ACTION_SEEDS[id])
    .filter(seed => {
      if (!capabilities.seeFinances && seed.id === "budget") return false;
      if (!capabilities.manageDocuments && ["documents", "portfolio", "gallery", "film"].includes(seed.id)) return false;
      return true;
    })
    .map(seed => ({
      id: seed.id,
      icon: seed.icon,
      label: translate(locale, seed.labelKey),
      scoped: seed.scoped,
      destination: seed.id === "share"
        ? { kind: "route", href: `/bilan/${project.id}` }
        : seed.destination,
    }));
}

/** Le contexte complet d'un Moment : intention, repères, actions. */
export function buildMomentContext(
  event: TimelineEvent,
  project: WorldProject,
  capabilities: MomentCapabilities = FULL_MOMENT_CAPABILITIES,
  locale: Locale = "fr",
): MomentContextModel {
  const intent = momentIntent(event, project);
  const actions = buildActions(intent, capabilities, locale, project);
  return {
    intent,
    zone: momentVisualZone(event, project),
    facts: buildFacts(event, project, intent, capabilities, locale),
    actions,
    primaryCount: Math.min(MOMENT_PRIMARY_COUNT, actions.length),
  };
}

/** Le panneau réellement visé par une action, normalisé (ancrage possible). */
export function momentActionPanel(action: MomentAction): WeddingPanelId | null {
  if (action.destination.kind !== "panel") return null;
  return normalizePanelId(action.destination.panel);
}

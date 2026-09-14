import { AIME_VISUALS, getAssetUrl } from "./assets";
import { getSubchapter } from "./timeline-chapters";
import { DEFAULT_VISUAL_OVERLAY, type TimelineEvent, type WorldProject, type WorldVisual } from "./types";

/*
 * Les visuels du Monde Mariage : le hero et les fonds de la Timeline verticale.
 *
 * Constat du 14/09 : `UniversalTimeline` importait `AIME_VISUALS.timelineAmbientImages`
 * sans jamais l'utiliser. Résultat : chaque scène de la Timeline restait sur un
 * fond blanc sauf si le couple avait importé une photo Moment par Moment —
 * l'importateur existait, le fond par défaut n'existait pas. Le Monde s'ouvrait
 * donc sur une colonne de cartes vides.
 *
 * Chaque zone de la Timeline reçoit maintenant le visuel du manifeste qui lui
 * correspond logiquement : la cérémonie, le repas, les invités, les préparatifs,
 * la musique… Le couple garde la main : un visuel importé sur un Moment
 * (`event.visual`) l'emporte toujours sur le visuel déduit.
 *
 * Dérivation pure et testée (`world-visuals.test.ts`) : aucune URL construite
 * ici, seulement le chemin stable du manifeste — c'est le composant qui résout
 * l'URL via `getAssetUrl`, comme partout ailleurs.
 */

/** Les visuels du manifeste, indexés par zone logique. */
export type MomentVisualZone =
  | "ceremony"
  | "table"
  | "guests"
  | "prep"
  | "attire"
  | "music"
  | "flowers"
  | "portrait"
  | "film"
  | "transport"
  | "reception"
  | "venue";

const ZONE_ASSETS: Record<MomentVisualZone, string> = {
  ceremony: AIME_VISUALS.universes.venue,
  table: AIME_VISUALS.universes.food,
  guests: AIME_VISUALS.universes.people,
  prep: AIME_VISUALS.universes.beaute,
  attire: AIME_VISUALS.attire,
  music: AIME_VISUALS.universes.music,
  flowers: AIME_VISUALS.universes.service,
  portrait: AIME_VISUALS.universes.photo,
  film: AIME_VISUALS.universes.institution,
  transport: AIME_VISUALS.transport,
  reception: AIME_VISUALS.universes.hotel,
  venue: AIME_VISUALS.universes.patrimoine,
};

/** Catégorie d'un prestataire → zone visuelle du Moment qui lui est relié. */
const PROVIDER_CATEGORY_ZONE: Record<string, MomentVisualZone> = {
  lieu: "venue",
  traiteur: "table",
  photo: "portrait",
  video: "film",
  fleuriste: "flowers",
  musique: "music",
  tenue: "attire",
  beaute: "prep",
  transport: "transport",
};

/**
 * Mot-clés d'une zone, du plus spécifique au plus général. Le premier qui
 * correspond gagne : « ouverture du bal » doit tomber sur la musique avant que
 * « bal » ne tombe ailleurs, et « dégustation du menu » sur la table.
 */
const ZONE_KEYWORDS: ReadonlyArray<readonly [MomentVisualZone, RegExp]> = [
  ["music", /\b(musique|dj|orchestre|playlist|bal|danse|ouverture du bal|concert|groupe)\b/i],
  ["flowers", /\b(fleur|fleuriste|floral|bouquet|composition florale)\b/i],
  ["attire", /\b(tenue|robe|costume|essayage|alliance|bague|smoking|cortège|cortege)\b/i],
  ["prep", /\b(beaut|coiffure|maquillage|manucure|soin|préparatif|preparatif|temps pour soi|réveil|reveil|petit déjeuner|petit dejeuner)\b/i],
  ["film", /\b(film|vidéo|video|cinéma|cinema|réception de la vidéo)\b/i],
  ["portrait", /\b(photo|photographe|portrait|reportage|studio|galerie|album|souvenir)\b/i],
  ["transport", /\b(navette|transport|voiture|départ|depart|trajet|hébergement|hebergement|hôtel|hotel)\b/i],
  ["table", /\b(table|banquet|repas|menu|dégustation|degustation|cocktail|gâteau|gateau|traiteur|dîner|diner|buffet|brunch|encas|saveur)\b/i],
  ["ceremony", /\b(cérémonie|ceremonie|engagement|v[oœ]ux|vows|église|eglise|mairie|officiant|laïque|laique|lecture|signature|serment)\b/i],
  ["guests", /\b(invité|invite|accueil|haie d'honneur|haie dhonneur|rsvp|famille|témoin|temoin|faire-part|faire part|invitation|annonce)\b/i],
  ["reception", /\b(réception|reception|soirée|soiree|fête|fete|nuit|célébration|celebration)\b/i],
  ["venue", /\b(lieu|domaine|château|chateau|visite|salle|patrimoine|espace|installation|décor|decor)\b/i],
];

/** Le chapitre de la Timeline, lui aussi porteur de sens visuel. */
const CHAPTER_ZONE: ReadonlyArray<readonly [RegExp, MomentVisualZone]> = [
  [/préparatifs/i, "prep"],
  [/réveil/i, "prep"],
  [/mise en place/i, "venue"],
  [/arrivée des invités/i, "guests"],
  [/cérémonie/i, "ceremony"],
  [/cocktail/i, "table"],
  [/repas/i, "table"],
  [/ouverture du bal/i, "music"],
  [/soirée|nuit/i, "reception"],
  [/veille|dernière ligne droite/i, "attire"],
  [/lendemain|jours suivants|semaines suivantes/i, "film"],
  [/héritage vivant/i, "portrait"],
  [/idée|vision|vision/i, "portrait"],
];

/** Zone par défaut d'une période, quand rien d'autre ne parle. */
const PHASE_ZONE: Record<TimelineEvent["phase"], MomentVisualZone> = {
  avant: "portrait",
  pendant: "reception",
  apres: "film",
};

/**
 * La zone logique d'un Moment : ses liens d'abord (un Moment relié à un morceau
 * est un Moment de musique, quoi qu'il s'appelle), puis son texte, puis son
 * chapitre, puis sa période.
 */
export function momentVisualZone(event: TimelineEvent, project?: WorldProject | null): MomentVisualZone {
  const linked = (event.relations ?? [])[0]?.kind;
  if (linked === "music") return "music";
  if (linked === "table") return "table";
  if (linked === "guest") return "guests";
  if (linked === "memory") return "portrait";
  if (linked === "provider" && project) {
    const providerId = event.relations?.[0]?.id ?? "";
    const provider = project.providers.find(item => item.id === providerId);
    const zone = provider ? PROVIDER_CATEGORY_ZONE[provider.category] : undefined;
    if (zone) return zone;
  }

  const text = [event.title, event.detail, event.location, event.resources?.join(" ")].filter(Boolean).join(" ");
  for (const [zone, pattern] of ZONE_KEYWORDS) if (pattern.test(text)) return zone;

  const chapter = getSubchapter(event, project?.pivot.value ?? event.time);
  for (const [pattern, zone] of CHAPTER_ZONE) if (pattern.test(chapter)) return zone;

  return PHASE_ZONE[event.phase] ?? "portrait";
}

/** Le chemin du manifeste qui sert de fond à un Moment. */
export function momentAmbientAsset(event: TimelineEvent, project?: WorldProject | null): string {
  return ZONE_ASSETS[momentVisualZone(event, project)];
}

/**
 * Le visuel de fond d'un Moment : celui que le couple a importé s'il existe,
 * sinon celui que le manifeste propose pour cette zone. Il y a donc toujours un
 * fond — jamais de scène blanche par défaut.
 */
export function momentVisual(event: TimelineEvent, project?: WorldProject | null): WorldVisual {
  if (event.visual?.url) return event.visual;
  return { kind: "image", url: momentAmbientAsset(event, project), overlay: DEFAULT_VISUAL_OVERLAY };
}

/** Le visuel d'un séparateur de chapitre : la cérémonie pour « La cérémonie ». */
export function chapterAmbientAsset(chapter: string, phase: TimelineEvent["phase"] = "avant"): string {
  for (const [pattern, zone] of CHAPTER_ZONE) if (pattern.test(chapter)) return ZONE_ASSETS[zone];
  return ZONE_ASSETS[PHASE_ZONE[phase]];
}

/** Les visuels proposés à l'édition du hero et des Moments, avec leur zone. */
export const WORLD_VISUAL_CHOICES: ReadonlyArray<{ zone: MomentVisualZone; asset: string }> = (
  Object.keys(ZONE_ASSETS) as MomentVisualZone[]
).map(zone => ({ zone, asset: ZONE_ASSETS[zone] }));

/*
 * ——— Le hero du Monde ———
 *
 * Même promesse que pour la Timeline : le Monde s'ouvre toujours sur un grand
 * visuel immersif. Un Monde créé avant ce réglage n'a pas de `heroVisual` ; on
 * lui rend celui du manifeste au lieu d'un fond blanc, et le bouton « Visuel »
 * du hero le remplace en un clic (import, URL, ou vignette du manifeste).
 */

export const DEFAULT_HERO_VISUAL: WorldVisual = {
  kind: "image",
  url: AIME_VISUALS.world.heroImage,
  overlay: DEFAULT_VISUAL_OVERLAY,
};

/** Le visuel du hero : celui du couple s'il en a posé un, sinon celui d'AIME. */
export function resolveHeroVisual(project: Pick<WorldProject, "heroVisual"> | null | undefined): WorldVisual {
  return project?.heroVisual?.url ? project.heroVisual : DEFAULT_HERO_VISUAL;
}

/**
 * Le couple a-t-il posé SON visuel ? Le visuel par défaut du Monde est écrit
 * dans le projet à la création : sans cette distinction, le bouton du hero
 * annoncerait « Changer le visuel » alors que personne n'a encore rien choisi.
 */
export function isCustomHeroVisual(project: Pick<WorldProject, "heroVisual"> | null | undefined): boolean {
  const url = project?.heroVisual?.url;
  return Boolean(url) && url !== DEFAULT_HERO_VISUAL.url;
}

/**
 * L'URL réellement affichable d'un visuel. Les visuels importés sont déjà des
 * dataURL ou des URL absolues ; ceux du manifeste sont des chemins du dossier
 * public, à résoudre avec le `BASE_URL` du déploiement.
 */
export function visualSourceUrl(visual: WorldVisual): string {
  return visual.url.startsWith("data:") || /^(https?:)?\/\//i.test(visual.url)
    ? visual.url
    : getAssetUrl(visual.url);
}


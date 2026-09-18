/*
 * Les visuels sont servis sous un nom stable (`wedding-ceremony.jpg`) pour
 * qu'un photographe puisse remplacer le fichier sans toucher au code. Contrepartie :
 * l'URL ne change jamais, et un navigateur qui a déjà mis l'image en cache
 * continue d'afficher l'ancienne après remplacement. Le jeton de version casse
 * ce cache — à incrémenter à chaque remplacement de visuel.
 */
const ASSETS_VERSION = "2026-09-14";

export function getAssetUrl(path: string) {
  /* Les assets éditoriaux fournis sur jsDelivr restent des URLs absolues :
     ne pas les transformer en `${BASE_URL}/https://…`. */
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const separator = cleanPath.includes('?') ? '&' : '?';
  return `${base}${cleanPath}${separator}v=${ASSETS_VERSION}`;
}

/*
 * Visuels du Monde Mariage. Photographies documentales à la lumière naturelle,
 * palette charbon / ivoire / champagne, rendu argentique 35 mm, produites pour
 * AIME et servies en lecture seule depuis `public/images/wedding`.
 *
 * Les noms sont stables et volontairement descriptifs : remplacer un fichier par
 * la vraie photo d'un photographe suffit, le manifeste et les composants restent
 * inchangés.
 */
const wedding = {
  heroImmersif: 'images/wedding/landing-hero-astronauts.jpg',
  guestsImmersif: 'images/wedding/landing-guests-astronauts.jpg',
  ceremony: 'images/wedding/wedding-ceremony.jpg',
  reception: 'images/wedding/wedding-reception.jpg',
  table: 'images/wedding/wedding-table.jpg',
  portrait: 'images/wedding/wedding-portrait.jpg',
  guests: 'images/wedding/wedding-guests.jpg',
  prep: 'images/wedding/wedding-prep.jpg',
  music: 'images/wedding/wedding-music.jpg',
  flowers: 'images/wedding/wedding-flowers.jpg',
  video: 'images/wedding/wedding-video.jpg',
  transport: 'images/wedding/wedding-transport.jpg',
  attire: 'images/wedding/wedding-attire.jpg',
  patrimoine: 'images/wedding/wedding-patrimoine.jpg',
} as const;

/*
 * Vidéos réelles du Monde Mariage, servies depuis `public/videos`.
 *
 * Audit du 14/09 : trois fichiers vidéo distincts (aucun doublon) accompagnaient
 * le projet sans être servis — ils vivaient hors du dossier public, donc
 * invisibles pour le site. Chacun est maintenant nommé d'après ce qu'il montre
 * réellement, et rattaché à la zone de la Timeline dont il est le contexte :
 *
 *   wedding-portrait-photographer.mp4  le photographe au travail (zone portrait)
 *   wedding-ceremony-vows.mp4          l'échange des vœux (zone cérémonie)
 *   wedding-attire-muse.mp4            les tenues, l'essayage (zone tenues)
 *
 * Une vidéo n'existe pas pour chaque zone : là où il n'y en a pas, la photo du
 * manifeste reste le fond — jamais d'écran noir, jamais de vidéo inventée.
 */
const weddingVideos = {
  portrait: 'videos/wedding-portrait-photographer.mp4',
  ceremony: 'videos/wedding-ceremony-vows.mp4',
  attire: 'videos/wedding-attire-muse.mp4',
} as const;

export const AIME_VIDEOS = weddingVideos;

/** Toutes les vidéos du manifeste, pour les contrôles de cohérence. */
export const AIME_VIDEO_PATHS: string[] = Object.values(weddingVideos);

/*
 * Visuels de l'agence « La cerise sur le gâteau — Wedding Architect ».
 * Photographies éditoriales ivoire / pierre / charbon servies en lecture seule
 * depuis `public/images`, et grands visuels immersifs du Monde Mariage pour les
 * sections pleine largeur. Comme pour le Monde Mariage : noms stables,
 * remplacement par de vraies photos sans toucher au code.
 *
 * La Bande (`/monde`) les consommait ; retirée le 16/09/2026, elle laisse ces
 * chemins disponibles pour toute section éditoriale de l'accueil ou d'un
 * livrable — `assets.test.ts` continue de vérifier que les fichiers existent.
 */
export const AGENCY_VISUALS = {
  hero: 'images/agency/agency-hero.jpg',
  stationery: 'images/agency/agency-stationery.jpg',
  ceremony: 'images/agency/agency-ceremony.jpg',
  /* Grands visuels immersifs : un par grande section de la page unique. */
  reception: 'images/wedding/wedding-reception.jpg',
  guests: 'images/wedding/wedding-guests.jpg',
  table: 'images/wedding/wedding-table.jpg',
  portrait: 'images/wedding/wedding-portrait.jpg',
  prep: 'images/wedding/wedding-prep.jpg',
} as const;

export const AIME_VISUALS = {
  hero: {
    backgroundImage: wedding.heroImmersif,
    guestsImage: wedding.guestsImmersif,
    backgroundVideo: null as string | null,
  },
  concept: {
    leftImage: wedding.portrait,
    rightImage: wedding.reception,
  },
  world: {
    heroImage: wedding.reception,
  },
  universes: {
    service: wedding.flowers,
    venue: wedding.ceremony,
    food: wedding.table,
    photo: wedding.portrait,
    beaute: wedding.prep,
    patrimoine: wedding.patrimoine,
    hotel: wedding.reception,
    people: wedding.guests,
    institution: wedding.video,
    music: wedding.music,
    event: wedding.guests,
    scene: wedding.table,
  } as const,
  timelineAmbientImages: [
    wedding.ceremony,
    wedding.table,
    wedding.guests,
    wedding.portrait,
    wedding.music,
    wedding.prep,
    wedding.flowers,
    wedding.video,
    wedding.transport,
    wedding.reception,
    wedding.patrimoine,
    wedding.attire,
  ] as const,
  /*
   * Les deux visuels que le mapping par zone de la Timeline (`moment-visuals.ts`)
   * atteint directement, sans passer par une catégorie de prestataire : les
   * tenues et le transport.
   */
  attire: wedding.attire,
  transport: wedding.transport,
  providersByCategory: {
    lieu: wedding.ceremony,
    traiteur: wedding.table,
    photo: wedding.portrait,
    video: wedding.video,
    fleuriste: wedding.flowers,
    musique: wedding.music,
    tenue: wedding.attire,
    beaute: wedding.prep,
    transport: wedding.transport,
  } as const,
  guestPortraitImages: [
    wedding.guests,
    wedding.portrait,
    wedding.prep,
    wedding.flowers,
    wedding.video,
    wedding.table,
  ] as const,
} as const;

/** Toutes les images du manifeste, pour les contrôles de cohérence. */
export const AIME_VISUAL_PATHS: string[] = Array.from(
  new Set(
    (() => {
      const paths: string[] = [];
      const walk = (value: unknown) => {
        if (typeof value === 'string') paths.push(value);
        else if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === 'object') Object.values(value).forEach(walk);
      };
      walk(AIME_VISUALS);
      return paths.filter(path => path.startsWith('images/'));
    })(),
  ),
);

export function getOptionalAssetUrl(path: string | null | undefined) {
  return path ? getAssetUrl(path) : null;
}

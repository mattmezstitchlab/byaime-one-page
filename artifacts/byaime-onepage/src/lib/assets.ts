export function getAssetUrl(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
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

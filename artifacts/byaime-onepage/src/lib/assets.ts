export function getAssetUrl(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export const AIME_VISUALS = {
  hero: {
    backgroundImage: 'images/visual-event-D_L9Q-iW.jpg',
    backgroundVideo: null as string | null,
  },
  concept: {
    leftImage: 'images/visual-photo-C-yKtlRN.jpg',
    rightImage: 'images/visual-institution-CuVWMxit.jpg',
  },
  world: {
    heroImage: 'images/visual-hotel-C8zQiMK2.jpg',
  },
  universes: {
    service: 'images/visual-service-DXmeWatY.jpg',
    venue: 'images/visual-venue-kJsZKZPp.jpg',
    food: 'images/visual-food-BYGwGQGu.jpg',
    photo: 'images/visual-photo-C-yKtlRN.jpg',
    beaute: 'images/visual-beaute-DJ6SEguK.jpg',
    patrimoine: 'images/visual-patrimoine-DHVLBfVK.jpg',
    hotel: 'images/visual-hotel-C8zQiMK2.jpg',
    people: 'images/visual-people-Dc5ifsnr.jpg',
    institution: 'images/visual-institution-CuVWMxit.jpg',
    music: 'images/visual-music-BWv1eToA.jpg',
    event: 'images/visual-event-D_L9Q-iW.jpg',
    scene: 'images/visual-scene-CMVk_6wW.jpg',
  } as const,
  timelineAmbientImages: [
    'images/visual-hotel-C8zQiMK2.jpg',
    'images/visual-venue-kJsZKZPp.jpg',
    'images/visual-people-Dc5ifsnr.jpg',
    'images/visual-food-BYGwGQGu.jpg',
    'images/visual-music-BWv1eToA.jpg',
    'images/visual-beaute-DJ6SEguK.jpg',
    'images/visual-scene-CMVk_6wW.jpg',
    'images/visual-photo-C-yKtlRN.jpg',
    'images/visual-institution-CuVWMxit.jpg',
    'images/visual-patrimoine-DHVLBfVK.jpg',
    'images/visual-event-D_L9Q-iW.jpg',
    'images/visual-service-DXmeWatY.jpg',
  ] as const,
  providersByCategory: {
    lieu: 'images/visual-venue-kJsZKZPp.jpg',
    traiteur: 'images/visual-food-BYGwGQGu.jpg',
    photo: 'images/visual-photo-C-yKtlRN.jpg',
    video: 'images/source/visual-video.jpg',
    fleuriste: 'images/source/visual-flower.jpg',
    musique: 'images/visual-music-BWv1eToA.jpg',
    tenue: 'images/source/visual-mode.jpg',
    beaute: 'images/visual-beaute-DJ6SEguK.jpg',
    transport: 'images/source/visual-transport.jpg',
  } as const,
  guestPortraitImages: [
    'images/visual-people-Dc5ifsnr.jpg',
    'images/source/home-ensemble.jpg',
    'images/source/home-reseau.jpg',
    'images/visual-event-D_L9Q-iW.jpg',
    'images/visual-scene-CMVk_6wW.jpg',
    'images/visual-photo-C-yKtlRN.jpg',
  ] as const,
} as const;

export function getOptionalAssetUrl(path: string | null | undefined) {
  return path ? getAssetUrl(path) : null;
}

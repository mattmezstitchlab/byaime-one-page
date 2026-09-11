import { translate, type Locale } from "./i18n-dictionary";

/*
 * Les deux destinations globales de l'espace privé. Comme la navigation du
 * Monde, elles sont un modèle de données traduit à la source : la locale est
 * facultative et vaut FR, pour que les appels non traduits restent valides.
 */
export const PRIVATE_DESTINATION_IDS = ["profile", "world"] as const;

export type PrivateDestinationId = (typeof PRIVATE_DESTINATION_IDS)[number];

export type PrivateDestination = {
  id: PrivateDestinationId;
  label: string;
  description: string;
  href: string;
};

const HREFS: Record<PrivateDestinationId, string> = {
  profile: "/profile",
  world: "/user-portal",
};

export function getPrivateNavigation(locale: Locale = "fr"): PrivateDestination[] {
  return PRIVATE_DESTINATION_IDS.map(id => ({
    id,
    label: translate(locale, `private.nav.${id}` as never),
    description: translate(locale, `private.nav.${id}.desc` as never),
    href: HREFS[id],
  }));
}

/** La navigation en français : conservée pour les appels non traduits. */
export const PRIVATE_PRIMARY_NAVIGATION: ReadonlyArray<PrivateDestination> = getPrivateNavigation("fr");

export function getDesktopRailReservedWidth(isPinned: boolean): 80 | 276 {
  return isPinned ? 276 : 80;
}

export function getPrivateDestinationId(pathname: string): PrivateDestinationId {
  if (pathname.startsWith("/user-portal")) return "world";
  return "profile";
}

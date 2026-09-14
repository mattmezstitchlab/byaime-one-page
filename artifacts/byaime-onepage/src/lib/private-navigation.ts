import { translate, type Locale } from "./i18n-dictionary";

/*
 * La destination globale de l'espace privé. Comme la navigation du Monde, c'est
 * un modèle de données traduit à la source : la locale est facultative et vaut
 * FR, pour que les appels non traduits restent valides.
 *
 * 14/09 : la page Profil (le mini-site vu par les invités, monté en aperçu
 * privé) est retirée de l'espace privé — elle doublonnait le Monde sans rien
 * apporter de plus. Le livrable public `/profil/:projectId` reste en ligne :
 * c'est ce que les invités ouvrent, et il ne dépend d'aucune session.
 */
export const PRIVATE_DESTINATION_IDS = ["world"] as const;

export type PrivateDestinationId = (typeof PRIVATE_DESTINATION_IDS)[number];

export type PrivateDestination = {
  id: PrivateDestinationId;
  label: string;
  description: string;
  href: string;
};

const HREFS: Record<PrivateDestinationId, string> = {
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

export function getPrivateDestinationId(_pathname: string): PrivateDestinationId {
  return "world";
}

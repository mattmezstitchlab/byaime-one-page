/**
 * Passerelle BYAIME ↔ DISPOO.
 *
 * Dispoo (https://dispoo.app) réserve des professionnels ; AIME organise le
 * mariage autour d'eux. Les deux sites se renvoient du trafic avec des liens
 * UTM stables, pour que chaque clic sortant reste mesurable des deux côtés :
 * - source `byaime` quand on part d'ici vers dispoo ;
 * - medium = l'emplacement du lien (panneau prestataires, assistant…) ;
 * - campaign `mariage`, le seul pont entre les deux produits.
 * Dans l'autre sens, dispoo pointe vers byaime.fr avec `utm_source=dispoo`.
 */

export const DISPOO_ORIGIN = "https://dispoo.app";

export type DispooPlacement =
  | "providers"
  | "assistant"
  | "folders"
  | "footer"
  | "composer"
  | "vitrine"
  | "bande";

export function dispooUrl(
  path: string,
  options: { placement: DispooPlacement; query?: Record<string, string> } = { placement: "footer" },
): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, DISPOO_ORIGIN);
  const params = options.query ?? {};
  for (const [key, value] of Object.entries(params)) {
    if (value.trim()) url.searchParams.set(key, value);
  }
  url.searchParams.set("utm_source", "byaime");
  url.searchParams.set("utm_medium", options.placement);
  url.searchParams.set("utm_campaign", "mariage");
  return url.toString();
}

/** Recherche d'un professionnel : le métier et la ville viennent du Monde. */
export function dispooSearchUrl(
  placement: DispooPlacement,
  options: { query?: string; city?: string } = {},
): string {
  return dispooUrl("/recherche", {
    placement,
    query: {
      ...(options.query?.trim() ? { q: options.query.trim() } : {}),
      ville: options.city?.trim() ?? "",
    },
  });
}

/** Composition d'une journée multi-prestataires autour d'une date. */
export function dispooComposerUrl(placement: DispooPlacement): string {
  return dispooUrl("/composer", { placement });
}

/** Espace professionnel, pour les wedding planners qui nous accompagnent. */
export function dispooProUrl(placement: DispooPlacement): string {
  return dispooUrl("/professionnels", { placement });
}

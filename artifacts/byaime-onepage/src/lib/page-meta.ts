import { useEffect } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export type RouteMeta = {
  /** Titre complet affiché par l'onglet et les moteurs de recherche. */
  title: string;
  /** Une ou deux phrases qui résument la page. */
  description?: string;
  /**
   * Directive pour les moteurs. Absente = la page est indexable.
   *
   * Elle est **réécrite à chaque changement de route** : l'application est
   * mono-page, donc un `noindex` posé sur `/bilan/:id` (le livrable privé d'un
   * couple) resterait actif sur la vitrine si on se contentait de l'ajouter
   * quand il est demandé.
   */
  robots?: string;
};

export const INDEXABLE = "index, follow";

function upsertMeta(name: string, content: string): void {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;
}

/**
 * Une page = un titre, une description et une directive d'indexation.
 *
 * L'application est une single-page : sans cette mise à jour, chaque route
 * hériterait du titre de `index.html` et les moteurs de recherche aligneraient
 * l'accueil, la vitrine de l'agence et les mentions légales sous le même
 * libellé — avec la même URL canonique.
 */
export function applyRouteMeta({ title, description, robots }: RouteMeta): void {
  if (typeof document === "undefined") return;
  document.title = title;

  if (description) upsertMeta("description", description);
  upsertMeta("robots", robots ?? INDEXABLE);

  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical && typeof window !== "undefined") {
    const path = window.location.pathname.replace(new RegExp(`^${basePath}`), "") || "/";
    canonical.href = `${window.location.origin}${basePath}${path}`;
  }
}

export function useRouteMeta(meta: RouteMeta): void {
  const { title, description, robots } = meta;
  useEffect(() => {
    applyRouteMeta({ title, description, robots });
  }, [title, description, robots]);
}

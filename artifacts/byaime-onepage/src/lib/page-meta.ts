import { useEffect } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export type RouteMeta = {
  /** Titre complet affiché par l'onglet et les moteurs de recherche. */
  title: string;
  /** Une ou deux phrases qui résument la page. */
  description?: string;
};

/**
 * Une page = un titre et une description.
 *
 * L'application est une single-page : sans cette mise à jour, chaque route
 * hériterait du titre de `index.html` et les moteurs de recherche aligneraient
 * l'accueil, les guides et les mentions légales sous le même libellé.
 */
export function applyRouteMeta({ title, description }: RouteMeta): void {
  if (typeof document === "undefined") return;
  document.title = title;

  if (description) {
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "description";
      document.head.appendChild(tag);
    }
    tag.content = description;
  }

  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical && typeof window !== "undefined") {
    const path = window.location.pathname.replace(new RegExp(`^${basePath}`), "") || "/";
    canonical.href = `${window.location.origin}${basePath}${path}`;
  }
}

export function useRouteMeta(meta: RouteMeta): void {
  const { title, description } = meta;
  useEffect(() => {
    applyRouteMeta({ title, description });
  }, [title, description]);
}

import type { VisibilityNode } from "./timeline-graph";

/*
 * Une couleur par catégorie du Monde.
 *
 * Les pastilles se lisent d'abord par famille (personnes, argent, documents,
 * musique…) avant même de lire les étiquettes. Les Moments gardent le rouge de
 * la marque — c'est la colonne vertébrale du graphe. Les teintes vivent dans
 * `index.css` (`--cat-*`), jamais en hexadécimaux recopiés : c'est la recopie
 * qui avait produit des gris sous AA (plan §3.8).
 *
 * Ce fichier est une lib et non un composant pour une raison précise : la Bande
 * (`/monde`) est une page publique qui ne monte aucun `ClerkProvider`. Si la
 * table des couleurs restait dans `VisibilityGraph.tsx`, l'import traînerait
 * `useProject` donc Clerk dans une page qui promet de fonctionner sans session.
 */
export const KIND_COLORS: Record<VisibilityNode["kind"], string> = {
  event: "hsl(var(--cat-event))",
  guest: "hsl(var(--cat-guest))",
  team: "hsl(var(--cat-team))",
  provider: "hsl(var(--cat-provider))",
  task: "hsl(var(--cat-task))",
  table: "hsl(var(--cat-table))",
  logistics: "hsl(var(--cat-logistics))",
  payment: "hsl(var(--cat-payment))",
  document: "hsl(var(--cat-document))",
  music: "hsl(var(--cat-music))",
  memory: "hsl(var(--cat-memory))",
  message: "hsl(var(--cat-message))",
};

/** Les catégories dans l'ordre de la légende : Moments d'abord, puis les entités. */
export const LEGEND_ORDER = Object.keys(KIND_COLORS) as VisibilityNode["kind"][];

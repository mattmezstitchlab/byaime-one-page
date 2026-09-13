import type { WorldProject } from "./types";

/**
 * Ouvrir la fiche d'une entité depuis n'importe quel écran.
 *
 * `WorldFocusRequest` portait déjà `entityKind` et `entityId`, et trois appels
 * du portail les envoyaient — mais personne ne les lisait : la demande tombait
 * par terre et, faute de mieux, la mini-carte personne ouvrait le panneau
 * « Liste des invités » entier. Ce module est la partie manquante : il retrouve
 * l'entité dans le Monde et la met en forme pour l'`EntityEditor`.
 */

export type EntityNode = {
  type: "item";
  collection: string;
  sourceRef: unknown;
  label: string;
};

type Collection = { id: string } & Record<string, unknown>;

const COLLECTION_BY_KIND: Record<string, keyof WorldProject> = {
  guest: "guests",
  provider: "providers",
  task: "tasks",
  payment: "payments",
  document: "documents",
  memory: "memories",
  table: "tables",
  music: "music",
  team: "team",
};

/** Le libellé d'une fiche, pris sur le premier champ réellement rempli. */
function labelOf(item: Collection): string {
  const candidates = [item.name, item.title, item.label, item.role];
  const found = candidates.find(value => typeof value === "string" && value.trim());
  return typeof found === "string" && found.trim() ? found.trim() : "Élément";
}

export function findEntityNode(
  project: WorldProject | null | undefined,
  kind: string | undefined,
  id: string | undefined,
): EntityNode | undefined {
  if (!project || !kind || !id) return undefined;
  const collection = COLLECTION_BY_KIND[kind];
  if (!collection) return undefined;
  const items = project[collection];
  if (!Array.isArray(items)) return undefined;
  const item = (items as Collection[]).find(candidate => candidate.id === id);
  if (!item) return undefined;
  return { type: "item", collection, sourceRef: item, label: labelOf(item) };
}

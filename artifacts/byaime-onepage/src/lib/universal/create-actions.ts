export type UniversalCreateActionId =
  | "person"
  | "place"
  | "moment"
  | "task"
  | "document-media"
  | "resource"
  | "relation";

/**
 * Créations proposées en mode Facile. Les actions avancées (lieux, ressources,
 * relations) restent réservées au Pro, même si elles deviennent disponibles.
 */
export const FACILE_CREATE_ACTION_IDS: readonly UniversalCreateActionId[] = [
  "person",
  "moment",
  "task",
  "document-media",
];

export type UniversalCreateAction = {
  id: UniversalCreateActionId;
  label: string;
  description: string;
  creates: "card" | "place" | "moment" | "document-media" | "resource" | "relation";
  capability: string;
  availableInCurrentProject: boolean;
};

export const UNIVERSAL_CREATE_ACTIONS: UniversalCreateAction[] = [
  {
    id: "person",
    label: "Personne ou organisation",
    description: "Ajouter quelqu’un, un groupe ou une structure",
    creates: "card",
    capability: "card.create",
    availableInCurrentProject: true,
  },
  {
    id: "place",
    label: "Lieu",
    description: "Ajouter une adresse, un espace ou un endroit virtuel",
    creates: "place",
    capability: "place.create",
    availableInCurrentProject: false,
  },
  {
    id: "moment",
    label: "Moment",
    description: "Ajouter une date, une étape ou un événement",
    creates: "moment",
    capability: "moment.create",
    availableInCurrentProject: true,
  },
  {
    id: "task",
    label: "Tâche",
    description: "Ajouter quelque chose à faire ou à suivre",
    creates: "moment",
    capability: "moment.create",
    availableInCurrentProject: true,
  },
  {
    id: "document-media",
    label: "Document ou média",
    description: "Ajouter un fichier, une image, un son ou une vidéo",
    creates: "document-media",
    capability: "document.upload",
    availableInCurrentProject: true,
  },
  {
    id: "resource",
    label: "Ressource ou besoin",
    description: "Proposer ou rechercher du matériel, un service ou une aide",
    creates: "resource",
    capability: "resource.request",
    availableInCurrentProject: false,
  },
  {
    id: "relation",
    label: "Relier des éléments",
    description: "Créer un lien clair entre deux éléments",
    creates: "relation",
    capability: "relation.create",
    availableInCurrentProject: false,
  },
];
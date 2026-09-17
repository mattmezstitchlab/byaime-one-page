import { translate, type Locale } from "../i18n-dictionary";

export type UniversalCreateActionId =
  | "person"
  | "place"
  | "moment"
  | "task"
  | "document-media"
  | "resource"
  | "relation";

export type UniversalCreateAction = {
  id: UniversalCreateActionId;
  label: string;
  description: string;
  creates: "card" | "place" | "moment" | "document-media" | "resource" | "relation";
  capability: string;
  availableInCurrentProject: boolean;
};

type CreateActionBase = Omit<UniversalCreateAction, "label" | "description">;

const CREATE_ACTIONS_BASE: CreateActionBase[] = [
  { id: "person", creates: "card", capability: "card.create", availableInCurrentProject: true },
  { id: "place", creates: "place", capability: "place.create", availableInCurrentProject: false },
  { id: "moment", creates: "moment", capability: "moment.create", availableInCurrentProject: true },
  { id: "task", creates: "moment", capability: "moment.create", availableInCurrentProject: true },
  { id: "document-media", creates: "document-media", capability: "document.upload", availableInCurrentProject: true },
  { id: "resource", creates: "resource", capability: "resource.request", availableInCurrentProject: false },
  { id: "relation", creates: "relation", capability: "relation.create", availableInCurrentProject: false },
];

/**
 * Les gestes de création, traduits dans la langue courante (FR/EN). Les
 * libellés vivent dans le dictionnaire (`create.action.*`) ; cette liste ne
 * porte que la structure (ce que le geste crée, la capacité requise, la
 * disponibilité dans le projet courant).
 */
export function getUniversalCreateActions(locale: Locale): UniversalCreateAction[] {
  return CREATE_ACTIONS_BASE.map((base) => ({
    ...base,
    label: translate(locale, `create.action.${base.id}.label`),
    description: translate(locale, `create.action.${base.id}.desc`),
  }));
}

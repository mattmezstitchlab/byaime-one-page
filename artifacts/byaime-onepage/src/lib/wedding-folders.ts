import { translate, type Locale } from "./i18n-dictionary";
import type { WorldProject } from "./types";
import { getWeddingCapabilities, type WeddingPanelId } from "./wedding-navigation";
import { focusWorld } from "./world-focus";

/*
 * Les sept dossiers universels du mariage, miroir du BURO de dispoo : les
 * mêmes dossiers pour chaque mariage — couple, wedding planner, famille ou
 * invité — chacun ouvert sur le bon panneau du Monde, chacun filtré par le
 * rôle effectif. L'assistant AIME « explore vos dossiers » parce que ces
 * dossiers sont standardisés : c'est ce modèle qui rend la promesse vraie.
 */

export const WEDDING_FOLDER_IDS = [
  "guests",
  "budget",
  "contracts",
  "providers",
  "program",
  "memories",
  "messages",
] as const;

export type WeddingFolderId = (typeof WEDDING_FOLDER_IDS)[number];

export type WeddingFolderDestination = { kind: "panel"; panel: WeddingPanelId };

export type WeddingFolderCapability = "any" | "finances" | "privateDocuments";

export type WeddingFolder = {
  id: WeddingFolderId;
  label: string;
  description: string;
  destination: WeddingFolderDestination;
  capability: WeddingFolderCapability;
};

const DEFINITIONS: ReadonlyArray<{
  id: WeddingFolderId;
  panel: WeddingPanelId;
  capability: WeddingFolderCapability;
}> = [
  { id: "guests", panel: "guests", capability: "any" },
  { id: "budget", panel: "budget", capability: "finances" },
  { id: "contracts", panel: "documents", capability: "privateDocuments" },
  { id: "providers", panel: "providers", capability: "any" },
  { id: "program", panel: "dayof", capability: "any" },
  { id: "memories", panel: "memories", capability: "any" },
  { id: "messages", panel: "messages", capability: "any" },
];

export function getWeddingFolders(locale: Locale = "fr"): WeddingFolder[] {
  return DEFINITIONS.map(definition => ({
    id: definition.id,
    label: translate(locale, `dossier.${definition.id}.label`),
    description: translate(locale, `dossier.${definition.id}.desc`),
    destination: { kind: "panel", panel: definition.panel },
    capability: definition.capability,
  }));
}

/** Le budget et les contrats restent réservés aux rôles autorisés. */
export function isFolderLocked(folder: Pick<WeddingFolder, "capability">, role: string): boolean {
  const capabilities = getWeddingCapabilities(role);
  if (folder.capability === "finances") return !capabilities.seeFinances;
  if (folder.capability === "privateDocuments") return !capabilities.managePrivateDocuments;
  return false;
}

export function getFolderLabel(id: WeddingFolderId, locale: Locale = "fr"): string {
  return translate(locale, `dossier.${id}.label`);
}

/** Compte honnête des éléments du dossier, sans Monde = zéro. */
export function getFolderCount(id: WeddingFolderId, project: WorldProject | null): number {
  if (!project) return 0;
  switch (id) {
    case "guests":
      return project.guests.length;
    case "budget":
      return project.payments.length;
    case "contracts":
      return project.documents.length;
    case "providers":
      return project.providers.length;
    case "program":
      return project.timeline.filter(event => event.phase === "pendant").length;
    case "memories":
      return project.memories.length + project.media.length;
    case "messages":
      return project.communications.length + project.messageLogs.length + project.messages.length;
  }
}

/**
 * Ouvre le panneau du dossier dans le Monde, depuis n'importe quelle route
 * privée : la demande de focus est mise en file (rejouée par ProjectStage à
 * son montage) puis on pousse la route du Monde, comme PortalControls.
 */
export function openWeddingFolder(folder: Pick<WeddingFolder, "destination">): void {
  if (typeof window === "undefined") return;
  focusWorld({ route: "/user-portal", panel: folder.destination.panel });
  if (!window.location.pathname.endsWith("/user-portal")) {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.history.pushState({}, "", `${basePath}/user-portal`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

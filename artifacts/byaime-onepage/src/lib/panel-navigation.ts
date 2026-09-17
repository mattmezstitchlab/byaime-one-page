import { translate, type Locale } from "./i18n-dictionary";
import type { TimelineView } from "./timeline-graph";
import type { WorldProject } from "./types";
import {
  getWeddingCapabilities,
  isWeddingEntryAllowed,
  type WeddingPanelId,
} from "./wedding-navigation";
import { getFolderCount, getWeddingFolders, isFolderLocked } from "./wedding-folders";

/*
 * Le menu du Panneau AIME — LA source unique (17/09).
 *
 * L'orbe « + » est la seule porte d'entrée de l'espace privé : un seul
 * panneau, une colonne de gauche (Monde, outils, aide) et une zone de
 * contenu. Tout ce qui naviguait dans le Monde — les sept dossiers, les
 * outils, la création, les réglages, l'aide — se liste ici, une seule fois,
 * filtré par le rôle effectif. Plus de bouton menu, plus de rangée, plus de
 * CommandBar : c'est cette fonction qui les remplace.
 *
 * - MONDE : le programme + les sept dossiers nommés, avec leur compteur.
 * - OUTILS : ce qui n'est pas un dossier (tâches, organisation, vue
 *   d'ensemble, musique, infos pratiques, aperçus).
 * - AIDE : poser une question, partager un document, créer, mon espace,
 *   réglages du Monde.
 */

export type AimePanelSectionId = "monde" | "outils" | "aide";

export type AimePanelActionId =
  | "ask"
  | "share-doc"
  | "create"
  | "me"
  | "world-settings"
  | "guest-preview"
  | "overview"
  | "visibility";

export type AimePanelDestination =
  | { kind: "panel"; panel: WeddingPanelId }
  | { kind: "view"; view: TimelineView }
  | { kind: "route"; href: string }
  | { kind: "action"; action: AimePanelActionId };

export interface AimePanelItem {
  id: string;
  section: AimePanelSectionId;
  label: string;
  description?: string;
  destination: AimePanelDestination;
  /** Compteur honnête du dossier (invités, paiements, …). */
  count?: number;
  /** Le rôle courant n'a pas accès : l'entrée n'est pas listée. */
  locked?: boolean;
}

export interface AimePanelSection {
  id: AimePanelSectionId;
  title: string;
  items: AimePanelItem[];
}

export interface AimePanelMenu {
  sections: AimePanelSection[];
}

export interface AimePanelMenuContext {
  role: string;
  locale?: Locale;
  project: WorldProject | null;
}

const label = (locale: Locale, key: string) => translate(locale, key as never);

/*
 * Le rôle filtre comme partout dans le Monde : ce qu'un rôle ne doit pas
 * voir n'apparaît nulle part (pas de budget pour la famille, pas de tâches
 * pour l'invité).
 */
const allowed = (id: string, role: string): boolean =>
  isWeddingEntryAllowed({ id, label: "", description: "", destination: { kind: "view", view: "chronological" } }, getWeddingCapabilities(role));

export function getAimePanelMenu({ role, locale = "fr", project }: AimePanelMenuContext): AimePanelMenu {
  /* ——— MONDE : le programme + les sept dossiers, les mêmes pour tout le mariage. ——— */
  const monde: AimePanelItem[] = [
    {
      id: "program",
      section: "monde",
      label: label(locale, "world.item.timeline"),
      description: label(locale, "world.item.timeline.desc"),
      destination: { kind: "view", view: "chronological" },
    },
  ];
  for (const folder of getWeddingFolders(locale)) {
    if (isFolderLocked(folder, role)) continue;
    monde.push({
      id: `folder:${folder.id}`,
      section: "monde",
      label: folder.label,
      description: folder.description,
      destination: folder.destination,
      count: getFolderCount(folder.id, project),
    });
  }

  /* ——— OUTILS : ce qui n'est pas un dossier, mais reste indispensable. ——— */
  const outils: AimePanelItem[] = [];
  if (allowed("planning", role)) {
    outils.push({
      id: "tasks",
      section: "outils",
      label: label(locale, "world.item.tasks"),
      description: label(locale, "world.item.tasks.desc"),
      destination: { kind: "panel", panel: "planning" },
    });
  }
  if (allowed("logistics", role)) {
    for (const tool of [
      { id: "ceremony", key: "world.item.ceremony", panel: "ceremony" },
      { id: "logistics", key: "world.item.logistics", panel: "logistics" },
      { id: "team", key: "world.item.team", panel: "team" },
    ] as const) {
      outils.push({
        id: tool.id,
        section: "outils",
        label: label(locale, tool.key),
        description: label(locale, `${tool.key}.desc`),
        destination: { kind: "panel", panel: tool.panel },
      });
    }
  }
  outils.push(
    {
      id: "overview",
      section: "outils",
      label: label(locale, "world.nav.overview"),
      description: label(locale, "world.item.timeline.desc"),
      destination: { kind: "action", action: "overview" },
    },
    {
      id: "music",
      section: "outils",
      label: label(locale, "world.item.music"),
      description: label(locale, "world.item.music.desc"),
      destination: { kind: "view", view: "music" },
    },
    {
      id: "public-info",
      section: "outils",
      label: label(locale, "world.item.publicInfo"),
      description: label(locale, "world.item.publicInfo.desc"),
      destination: { kind: "view", view: "public-info" },
    },
    {
      id: "visibility",
      section: "outils",
      label: label(locale, "world.nav.graph"),
      destination: { kind: "action", action: "visibility" },
    },
    {
      id: "guest-preview",
      section: "outils",
      label: label(locale, "world.nav.preview"),
      destination: { kind: "action", action: "guest-preview" },
    },
  );
  if (project) {
    outils.push({
      id: "mini-site",
      section: "outils",
      label: label(locale, "world.nav.miniSite"),
      destination: { kind: "route", href: `/profil/${project.id}?apercu=1` },
    });
  }

  /* ——— AIDE : les gestes simples, en langage clair. ——— */
  const aide: AimePanelItem[] = [
    {
      id: "ask",
      section: "aide",
      label: label(locale, "aime.panel.ask"),
      description: label(locale, "aime.panel.ask.desc"),
      destination: { kind: "action", action: "ask" },
    },
    {
      id: "share-doc",
      section: "aide",
      label: label(locale, "aime.panel.shareDoc"),
      description: label(locale, "aime.panel.shareDoc.desc"),
      destination: { kind: "action", action: "share-doc" },
    },
    {
      id: "create",
      section: "aide",
      label: label(locale, "aime.panel.create"),
      description: label(locale, "aime.panel.create.desc"),
      destination: { kind: "action", action: "create" },
    },
    {
      id: "me",
      section: "aide",
      label: label(locale, "aime.panel.me"),
      description: label(locale, "aime.panel.me.desc"),
      destination: { kind: "action", action: "me" },
    },
    {
      id: "world-settings",
      section: "aide",
      label: label(locale, "aime.panel.settings"),
      description: label(locale, "aime.panel.settings.desc"),
      destination: { kind: "action", action: "world-settings" },
    },
  ];

  return {
    sections: [
      { id: "monde", title: label(locale, "aime.panel.monde"), items: monde },
      { id: "outils", title: label(locale, "aime.panel.outils"), items: outils },
      { id: "aide", title: label(locale, "aime.panel.aide"), items: aide },
    ],
  };
}

/** Toutes les entrées, à plat (pour la recherche de la colonne). */
export function getAimePanelItems(menu: AimePanelMenu): AimePanelItem[] {
  return menu.sections.flatMap(section => section.items);
}

/**
 * L'entrée du panneau pour un panneau du Monde donné — l'inverse de la
 * colonne : « ce panneau s'ouvre sur cette ligne ». Normalise les identifiants
 * historiques (`guests` → le dossier Invités, `planning` → Tâches).
 */
export function aimePanelItemIdForPanel(panel: WeddingPanelId): string | null {
  const folder = getWeddingFolders("fr").find(f => f.destination.panel === panel);
  if (folder) return `folder:${folder.id}`;
  if (panel === "planning") return "tasks";
  if (panel === "ceremony" || panel === "logistics" || panel === "team") return panel;
  if (panel === "music") return "music";
  return null;
}

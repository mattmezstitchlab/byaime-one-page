import { describe, expect, it } from "vitest";
import { createInitialProject, parseIntention } from "./parser";
import { normalizeProject } from "./project-migration";
import {
  aimePanelItemIdForPanel,
  getAimePanelItems,
  getAimePanelMenu,
  type AimePanelMenu,
} from "./panel-navigation";
import type { WorldProject } from "./types";

const project = normalizeProject(
  createInitialProject(
    parseIntention("Notre mariage le 5 août 2027, près de Lille, 90 invités."),
    "Notre mariage le 5 août 2027, près de Lille, 90 invités.",
  ),
) as WorldProject;

/*
 * Le menu du Panneau AIME : LA source unique de la navigation privée.
 * Les mêmes sept dossiers pour tous, filtrés par le rôle — ce qu'un rôle ne
 * doit pas voir n'apparaît nulle part.
 */
const itemById = (menu: AimePanelMenu, id: string) =>
  getAimePanelItems(menu).find(item => item.id === id)!;

describe("getAimePanelMenu", () => {
  it("owner : Le Monde = le programme + le socle, les entrées d'un autre mode rangées à part", () => {
    const menu = getAimePanelMenu({ role: "owner", locale: "fr", project });
    const monde = menu.sections.find(section => section.id === "monde")!;
    expect(monde.items[0].id).toBe("program");
    expect(monde.items[0].label).toBe("Le programme");
    expect(monde.items.map(item => item.id)).toEqual([
      "program",
      "folder:guests",
      "folder:budget",
      "folder:contracts",
      "folder:providers",
      "folder:messages",
    ]);
    const guests = monde.items.find(item => item.id === "folder:guests");
    expect(guests?.label).toBe("Invités & RSVP");
    expect(guests?.count, "le compteur honnête du dossier").toBeGreaterThan(0);

    /* Les trois entrées qui n'existent que dans un mode restent atteignables :
       rangées sous « Autres modes », avec leur période. */
    const modes = menu.sections.find(section => section.id === "modes")!;
    expect(modes.title).toBe("Autres modes");
    expect(modes.items.map(item => [item.id, item.phase, item.section])).toEqual([
      ["folder:program", "pendant", "modes"],
      ["public-info", "pendant", "modes"],
      ["folder:memories", "apres", "modes"],
    ]);
  });

  it("owner : le socle des outils, cinq entrées d'aide", () => {
    const menu = getAimePanelMenu({ role: "owner", locale: "fr", project });
    const outils = menu.sections.find(section => section.id === "outils")!;
    const aide = menu.sections.find(section => section.id === "aide")!;
    expect(outils.items.map(item => item.id)).toEqual([
      "tasks",
      "ceremony",
      "logistics",
      "team",
      "overview",
      "music",
      "visibility",
      "guest-preview",
      "mini-site",
    ]);
    expect(aide.items.map(item => item.id)).toEqual(["ask", "share-doc", "create", "me", "world-settings"]);
  });

  it("le programme suit le mode, et chaque chose rentre chez elle", () => {
    const avant = getAimePanelMenu({ role: "owner", locale: "fr", project, phase: "avant" });
    const pendant = getAimePanelMenu({ role: "owner", locale: "fr", project, phase: "pendant" });
    const apres = getAimePanelMenu({ role: "owner", locale: "fr", project, phase: "apres" });

    expect(itemById(avant, "program").label).toBe("Le programme");
    expect(itemById(pendant, "program").label).toBe("Le Jour J, en direct");
    expect(itemById(apres, "program").label).toBe("Le Jour J, en revue");

    /* Le dossier du Jour J est dans Le Monde le Jour J, et annoncé ailleurs. */
    expect(itemById(pendant, "folder:program").section).toBe("monde");
    expect(itemById(avant, "folder:program").section).toBe("modes");
    expect(itemById(avant, "folder:program").phase).toBe("pendant");
    /* Les souvenirs appartiennent au mode Après. */
    expect(itemById(apres, "folder:memories").section).toBe("monde");
    expect(itemById(apres, "folder:memories").phase).toBe("apres");
    expect(itemById(avant, "folder:memories").section).toBe("modes");
    /* Les infos pratiques sont celles du Jour J. */
    expect(itemById(pendant, "public-info").section).toBe("outils");
    expect(itemById(apres, "public-info").section).toBe("modes");
    /* La musique ne change pas de mode : elle change de nom. */
    expect(itemById(pendant, "music").label).toBe("Musique en direct");
    expect(itemById(avant, "music").label).toBe("Musique");
  });

  it("canEdit : « Modifier l'ouverture » apparaît dans l'aide, sinon pas", () => {
    const withEdit = getAimePanelMenu({ role: "owner", locale: "fr", project, canEdit: true });
    const aide = withEdit.sections.find(section => section.id === "aide")!;
    expect(aide.items.map(item => item.id)).toContain("hero-editor");
    const hero = aide.items.find(item => item.id === "hero-editor");
    expect(hero?.destination).toEqual({ kind: "action", action: "hero-editor" });

    const readOnly = getAimePanelMenu({ role: "owner", locale: "fr", project, canEdit: false });
    const aideRO = readOnly.sections.find(section => section.id === "aide")!;
    expect(aideRO.items.map(item => item.id)).not.toContain("hero-editor");
  });

  it("viewer : ni budget, ni contrats, ni tâches, ni organisation", () => {
    const menu = getAimePanelMenu({ role: "viewer", locale: "fr", project });
    const ids = getAimePanelItems(menu).map(item => item.id);
    expect(ids).not.toContain("folder:budget");
    expect(ids).not.toContain("folder:contracts");
    expect(ids).not.toContain("tasks");
    expect(ids).not.toContain("ceremony");
    expect(ids).not.toContain("logistics");
    expect(ids).not.toContain("team");
    /* Le socle lisible reste : musique, infos pratiques, aperçus. */
    expect(ids).toContain("music");
    expect(ids).toContain("public-info");
    expect(ids).toContain("mini-site");
    expect(ids).toContain("folder:guests");
  });

  it("family : pas de budget/contrats, mais les tâches sont là", () => {
    const menu = getAimePanelMenu({ role: "family", locale: "fr", project });
    const ids = getAimePanelItems(menu).map(item => item.id);
    expect(ids).not.toContain("folder:budget");
    expect(ids).not.toContain("folder:contracts");
    expect(ids).toContain("tasks");
  });

  it("EN : même structure, libellés traduits", () => {
    const menu = getAimePanelMenu({ role: "owner", locale: "en", project });
    const monde = menu.sections.find(section => section.id === "monde")!;
    expect(monde.items[1].label).toBe("Guests & RSVP");
    expect(menu.sections.map(section => section.title)).toEqual(["The World", "Tools", "Help", "Other modes"]);
    expect(getAimePanelMenu({ role: "owner", locale: "en", project, phase: "pendant" }).sections
      .find(section => section.id === "monde")!.items[0].label).toBe("The big day, live");
  });

  it("les identifiants historiques du Monde pointent vers la bonne ligne", () => {
    expect(aimePanelItemIdForPanel("guests")).toBe("folder:guests");
    expect(aimePanelItemIdForPanel("documents")).toBe("folder:contracts");
    expect(aimePanelItemIdForPanel("dayof")).toBe("folder:program");
    expect(aimePanelItemIdForPanel("planning")).toBe("tasks");
    expect(aimePanelItemIdForPanel("team")).toBe("team");
    expect(aimePanelItemIdForPanel("music")).toBe("music");
    /* « Pilotage » n'est pas une ligne : ce sont les dossiers. */
    expect(aimePanelItemIdForPanel("pilotage")).toBeNull();
  });
});

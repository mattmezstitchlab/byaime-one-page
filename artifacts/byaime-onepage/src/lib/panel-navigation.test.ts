import { describe, expect, it } from "vitest";
import { createInitialProject, parseIntention } from "./parser";
import { normalizeProject } from "./project-migration";
import { aimePanelItemIdForPanel, getAimePanelItems, getAimePanelMenu } from "./panel-navigation";
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
describe("getAimePanelMenu", () => {
  it("owner : Monde = le programme + les sept dossiers, avec compteurs", () => {
    const menu = getAimePanelMenu({ role: "owner", locale: "fr", project });
    const monde = menu.sections.find(section => section.id === "monde")!;
    expect(monde.items[0].id).toBe("program");
    expect(monde.items[0].label).toBe("Le programme");
    expect(monde.items).toHaveLength(8);
    const guests = monde.items.find(item => item.id === "folder:guests");
    expect(guests?.label).toBe("Invités & RSVP");
    expect(guests?.count, "le compteur honnête du dossier").toBeGreaterThan(0);
  });

  it("owner : dix outils, cinq entrées d'aide", () => {
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
      "public-info",
      "visibility",
      "guest-preview",
      "mini-site",
    ]);
    expect(aide.items.map(item => item.id)).toEqual(["ask", "share-doc", "create", "me", "world-settings"]);
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
    expect(menu.sections.map(section => section.title)).toEqual(["The World", "Tools", "Help"]);
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

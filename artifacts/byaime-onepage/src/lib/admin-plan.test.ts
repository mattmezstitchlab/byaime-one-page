import { describe, expect, it } from "vitest";
import { buildAdminPlan, buildWorldMenu } from "./admin-plan";
import { INTENT_ACTIONS, MOMENT_PRIMARY_COUNT } from "./moment-context";

/*
 * Le menu n'organise plus le produit : la Timeline l'organise. Il devient une
 * liste plate, courte, sans doublon — les panneaux restants sont des
 * profondeurs, atteignables aussi depuis un Moment. Et il respecte toujours les
 * capacités du rôle : ce qu'un rôle ne doit pas voir n'apparaît nulle part.
 */

describe("buildAdminPlan (le sommaire aplati)", () => {
  it("ne découpe plus le produit en sections : une seule liste", () => {
    expect(buildAdminPlan("owner").sections.map(section => section.id)).toEqual(["monde"]);
  });

  it("garde les surfaces globales, sans doublon", () => {
    const ids = buildAdminPlan("owner").sections[0].items.map(item => item.id);

    expect(ids).toContain("timeline");
    expect(ids).toContain("pilotage");
    expect(ids).toContain("documents");
    expect(ids).toContain("logistics");
    expect(ids).toContain("messages");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque entrée porte un libellé et une description : rien sans explication", () => {
    for (const section of buildAdminPlan("owner").sections) {
      for (const item of section.items) {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.description.length).toBeGreaterThan(0);
      }
    }
  });

  it("cache l'argent à un rôle qui ne doit pas le voir", () => {
    const ids = buildAdminPlan("viewer").sections.flatMap(section => section.items.map(item => item.id));

    expect(ids).not.toContain("finances");
    /* Et le raccourci financier ne réapparaît pas dans les actions de Moment. */
    for (const actions of Object.values(INTENT_ACTIONS)) {
      for (const id of actions.slice(0, MOMENT_PRIMARY_COUNT)) {
        expect(typeof id).toBe("string");
      }
    }
  });
});

describe("buildWorldMenu (la liste plate du menu)", () => {
  it("suit la période ouverte et ne répète aucune entrée", () => {
    const avant = buildWorldMenu("owner", "avant", "fr").map(item => item.id);
    const jourJ = buildWorldMenu("owner", "pendant", "fr").map(item => item.id);
    const apres = buildWorldMenu("owner", "apres", "fr").map(item => item.id);

    expect(new Set(avant).size).toBe(avant.length);
    expect(new Set(jourJ).size).toBe(jourJ.length);
    expect(new Set(apres).size).toBe(apres.length);

    /* La Timeline reste le point d'entrée de chaque période. */
    for (const list of [avant, jourJ, apres]) expect(list).toContain("timeline");

    /* La Régie n'est plus une entrée à chercher : elle vit dans le Jour J. */
    expect(jourJ).not.toContain("dayof");
    expect(avant).not.toContain("dayof");
  });

  it("reste court : on ne remplace pas le produit par un sommaire géant", () => {
    expect(buildWorldMenu("owner", "avant", "fr").length).toBeLessThanOrEqual(9);
  });
});

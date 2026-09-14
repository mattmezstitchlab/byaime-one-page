import { describe, expect, it } from "vitest";
import { buildAdminPlan } from "./admin-plan";

/*
 * Le rétroplanning est l'ordre du mariage, pas l'ordre du code : concevoir,
 * Jour J, après. Et il respecte les capacités du rôle : ce qu'un rôle ne doit
 * pas voir n'apparaît pas dans le sommaire.
 */

describe("buildAdminPlan (le back-office dans l'ordre)", () => {
  it("déroule les trois temps du mariage, dans l'ordre", () => {
    const plan = buildAdminPlan("owner");

    expect(plan.sections.map(section => section.id)).toEqual(["concevoir", "jour-j"]);
  });

  it("met le socle et la préparation dans « concevoir »", () => {
    const plan = buildAdminPlan("owner");
    const concevoir = plan.sections[0].items.map(item => item.id);

    expect(concevoir).toContain("timeline");
    expect(concevoir).toContain("pilotage");
    expect(concevoir).toContain("documents");
    expect(concevoir).toContain("logistics");
    expect(concevoir).toContain("messages");
  });

  it("chaque entrée porte un libellé et une description : rien sans explication", () => {
    const plan = buildAdminPlan("owner");

    for (const section of plan.sections) {
      for (const item of section.items) {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.description.length).toBeGreaterThan(0);
      }
    }
  });

  it("cache l'argent à un rôle qui ne doit pas le voir", () => {
    const plan = buildAdminPlan("viewer");

    const ids = plan.sections.flatMap(section => section.items.map(item => item.id));
    expect(ids).not.toContain("finances");
  });
});

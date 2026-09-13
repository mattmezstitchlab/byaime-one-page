import { describe, expect, it } from "vitest";
import { findEntityNode } from "./entity-focus";
import type { WorldProject } from "./types";

const project = {
  id: "p1",
  guests: [{ id: "g1", name: "Camille Dupont" }],
  providers: [{ id: "pr1", role: "Traiteur", status: "devis" }],
  tasks: [{ id: "t1", title: "Relancer le traiteur" }],
  payments: [{ id: "pay1", label: "Acompte salle" }],
  tables: [{ id: "tb1", name: "Table d'honneur" }],
  music: [{ id: "m1", title: "Premier regard" }],
  team: [{ id: "tm1", name: "Léa", role: "Témoin" }],
  documents: [],
  memories: [],
} as unknown as WorldProject;

describe("findEntityNode", () => {
  it("retrouve la personne et la met en forme pour l'éditeur", () => {
    expect(findEntityNode(project, "guest", "g1")).toEqual({
      type: "item",
      collection: "guests",
      sourceRef: { id: "g1", name: "Camille Dupont" },
      label: "Camille Dupont",
    });
  });

  it("retombe sur le métier quand le prestataire n'a pas encore de nom", () => {
    expect(findEntityNode(project, "provider", "pr1")?.label).toBe("Traiteur");
    expect(findEntityNode(project, "provider", "pr1")?.collection).toBe("providers");
  });

  it("couvre les collections éditables, pas seulement les personnes", () => {
    expect(findEntityNode(project, "task", "t1")?.collection).toBe("tasks");
    expect(findEntityNode(project, "payment", "pay1")?.label).toBe("Acompte salle");
    expect(findEntityNode(project, "table", "tb1")?.label).toBe("Table d'honneur");
    expect(findEntityNode(project, "music", "m1")?.label).toBe("Premier regard");
    expect(findEntityNode(project, "team", "tm1")?.label).toBe("Léa");
  });

  it("ne renvoie rien plutôt qu'une fiche vide ou un panneau par défaut", () => {
    expect(findEntityNode(project, "guest", "inconnu")).toBeUndefined();
    expect(findEntityNode(project, "logistics", "x")).toBeUndefined();
    expect(findEntityNode(project, "guest", undefined)).toBeUndefined();
    expect(findEntityNode(project, undefined, "g1")).toBeUndefined();
    expect(findEntityNode(null, "guest", "g1")).toBeUndefined();
    // Une collection déclarée mais vide ne doit pas produire de fiche.
    expect(findEntityNode(project, "document", "d1")).toBeUndefined();
  });
});

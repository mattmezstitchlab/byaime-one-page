import { describe, expect, it } from "vitest";
import {
  projectCatalogFromRows,
  weddingDisplayLabel,
  roleForActiveProject,
  shouldCreateProject,
} from "./project-catalog";

describe("project catalog synchronization", () => {
  it("keeps a newly accessible existing World as viewer instead of recreating it", () => {
    const catalog = projectCatalogFromRows([
      {
        id: "world-a",
        title: "Monde A",
        role: "owner",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "world-b",
        title: "Monde B",
        role: "viewer",
        updatedAt: "2026-01-02T00:00:00Z",
      },
    ]);

    expect(roleForActiveProject("world-b", catalog)).toBe("viewer");
    expect(
      shouldCreateProject("world-b", catalog, "2026-01-02T00:00:00Z"),
    ).toBe(false);
  });

  it("never treats an unknown existing World as owner", () => {
    expect(roleForActiveProject("unknown", [])).toBe("viewer");
  });
});

describe("wedding identification from existing authorized information", () => {
  it("distinguishes identical titles by date and location without mutating the source", () => {
    const a = {
      pivot: { value: Date.parse("2027-06-12T12:00:00Z") },
      venue: { value: "Domaine des Pins" },
      city: { value: "Paris" },
    };
    const original = structuredClone(a);
    expect(weddingDisplayLabel("Notre Mariage", a)).toBe(
      "Notre Mariage · 12 juin 2027 · Domaine des Pins · Paris",
    );
    expect(
      weddingDisplayLabel("Notre Mariage", { ...a, city: { value: "Lyon" } }),
    ).not.toBe(weddingDisplayLabel("Notre Mariage", a));
    expect(a).toEqual(original);
  });
  it("uses only explicitly linked couple identities; never guesses from guests or other roles", () => {
    const cardParticipants = [
      {
        card: { firstName: "Léa", lastName: "Martin" },
        participation: { roles: ["Mariée"] },
      },
      {
        card: { firstName: "Jean", lastName: "Dupont" },
        participation: { roles: ["Photographe"] },
      },
    ];
    expect(weddingDisplayLabel("Notre Mariage", { cardParticipants })).toBe(
      "Mariage de Léa Martin",
    );
    expect(weddingDisplayLabel("Léa & Hugo", {})).toBe("Léa & Hugo");
  });
  it("does not invent missing names, date or place and ignores missing facts", () => {
    expect(weddingDisplayLabel("Notre Mariage", null)).toBe("Notre Mariage");
    expect(
      weddingDisplayLabel("Notre Mariage", {
        pivot: { value: 1, confidence: "manquant" },
        city: { value: null },
        venue: { value: " " },
      }),
    ).toBe("Notre Mariage");
    expect(
      weddingDisplayLabel("Notre Mariage", {
        pivot: { value: NaN },
        city: { value: "Paris" },
        venue: { value: " Paris " },
      }),
    ).toBe("Notre Mariage · Paris");
  });
});

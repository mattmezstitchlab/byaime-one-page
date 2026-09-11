import { describe, expect, it } from "vitest";
import {
  findPhaseForPanel,
  getInitialWorldPhase,
  getPanelContextGroup,
  getWeddingCapabilities,
  getWeddingNavigation,
  getWeddingRailItems,
  isWeddingDestinationActive,
  isWeddingPanelAvailable,
  WORLD_PHASES,
  type WeddingRole,
} from "./wedding-navigation";

describe("wedding navigation", () => {
  const phases = ["avant", "pendant", "apres"] as const;
  const roles: WeddingRole[] = ["owner", "planner", "family", "viewer"];

  it.each(phases)("keeps Timeline first in the left rail for %s", phase => {
    expect(getWeddingRailItems(phase, getWeddingCapabilities("owner"))[0].id).toBe("timeline");
  });

  it.each(phases.flatMap(phase => roles.map(role => [phase, role] as const)))(
    "keeps %s rail + mode navigation unique for %s",
    (phase, role) => {
      const capabilities = getWeddingCapabilities(role);
      const rail = getWeddingRailItems(phase, capabilities);
      const navigation = getWeddingNavigation(phase, capabilities);
      const entries = [...rail, ...navigation.primary, ...navigation.secondary];
      expect(new Set(entries.map(entry => entry.id)).size).toBe(entries.length);
      expect(new Set(entries.map(entry => entry.label)).size).toBe(entries.length);
      expect(rail[0].id).toBe("timeline");
    },
  );

  it("gives owners and planners the common categories in the rail and the Avant mode tools horizontally", () => {
    for (const role of ["owner", "planner"] as const) {
      const capabilities = getWeddingCapabilities(role);
      expect(getWeddingRailItems("avant", capabilities).map(item => item.label)).toEqual([
        "Timeline", "Personnes", "Prestataires", "Tâches", "Finances", "Documents", "Équipe", "Musique",
      ]);
      expect(getWeddingNavigation("avant", capabilities).primary.map(item => item.label)).toEqual([
        "Cérémonie & réception", "Logistique", "Plan de table", "Messages",
      ]);
    }
  });

  it("only puts period-specific tools in the horizontal navigation of each mode", () => {
    const owner = getWeddingCapabilities("owner");
    expect(getWeddingNavigation("pendant", owner).primary.map(item => item.id)).toEqual([
      "day-of", "public-info", "seating", "contributions",
    ]);
    expect(getWeddingNavigation("apres", owner).primary.map(item => item.id)).toEqual([
      "thanks", "memories", "film", "honeymoon", "contributions", "public-info",
    ]);
  });

  it("keeps finances, private documents, and the delivered film out of family and viewer navigation", () => {
    for (const role of ["family", "viewer"] as const) {
      for (const phase of phases) {
        const capabilities = getWeddingCapabilities(role);
        const entries = getWeddingRailItems(phase, capabilities)
          .concat(getWeddingNavigation(phase, capabilities).primary)
          .concat(getWeddingNavigation(phase, capabilities).secondary);
        expect(entries.map(item => item.id)).not.toContain("finances");
        expect(entries.map(item => item.id)).not.toContain("documents");
        expect(entries.map(item => item.id)).not.toContain("film");
      }
    }
  });

  it("keeps common category panels reachable in every mode through the rail", () => {
    const owner = getWeddingCapabilities("owner");
    const rail = getWeddingRailItems("pendant", owner);
    const navigation = getWeddingNavigation("pendant", owner);
    // Finances et Tâches n'apparaissent pas dans la rangée du Jour J mais restent ouvrables via la barre latérale.
    expect(navigation.primary.some(item => item.id === "finances")).toBe(false);
    expect(isWeddingPanelAvailable("budget", navigation, "chronological", rail)).toBe(true);
    expect(isWeddingPanelAvailable("planning", navigation, "chronological", rail)).toBe(true);
  });

  it("keeps the music destination active while its linked-track tool is open", () => {
    const music = getWeddingRailItems("avant", getWeddingCapabilities("owner")).find(item => item.id === "music");
    expect(isWeddingDestinationActive(music!.destination, "music", null)).toBe(true);
    expect(isWeddingDestinationActive(music!.destination, "music", "music")).toBe(true);
    expect(isWeddingDestinationActive(music!.destination, "music", "documents")).toBe(false);
  });

  it("keeps the music panel available only inside music view", () => {
    const rail = getWeddingRailItems("avant", getWeddingCapabilities("owner"));
    const navigation = getWeddingNavigation("avant", getWeddingCapabilities("owner"));
    expect(isWeddingPanelAvailable("music", navigation, "music", rail)).toBe(true);
    expect(isWeddingPanelAvailable("music", navigation, "chronological", rail)).toBe(false);
  });

  it("range un panneau du rail dans la catégorie « Socle commun » avec les catégories voisines", () => {
    const rail = getWeddingRailItems("avant", getWeddingCapabilities("owner"));
    const navigation = getWeddingNavigation("avant", getWeddingCapabilities("owner"));

    const budget = getPanelContextGroup("budget", rail, navigation, "chronological");
    expect(budget.id).toBe("rail");
    expect(budget.label).toBe("Socle commun");
    // Les voisins incluent les autres catégories communes, pas les outils du mode.
    expect(budget.items.map(item => item.id)).toContain("documents");
    expect(budget.items.map(item => item.id)).not.toContain("seating");

    const guests = getPanelContextGroup("guests", rail, navigation, "chronological");
    expect(guests.id).toBe("rail");
    expect(guests.items.map(item => item.id)).toContain("people");
  });

  it("range un outil du mode dans « Outils du mode » avec les outils voisins de la phase", () => {
    const rail = getWeddingRailItems("pendant", getWeddingCapabilities("owner"));
    const navigation = getWeddingNavigation("pendant", getWeddingCapabilities("owner"));

    const dayof = getPanelContextGroup("dayof", rail, navigation, "chronological");
    expect(dayof.id).toBe("phase");
    expect(dayof.label).toBe("Outils du mode");
    expect(dayof.items.map(item => item.id)).toContain("seating");
    expect(dayof.items.map(item => item.id)).not.toContain("finances");

    const sections = getPanelContextGroup("sections", rail, navigation, "chronological");
    expect(sections.id).toBe("sections");
    expect(sections.items).toEqual([]);
  });

  it("keeps the World capsule strictly temporal", () => {
    expect(WORLD_PHASES.map(phase => phase.label)).toEqual(["Avant", "Le Jour J", "Après"]);
  });

  it("chooses the initial period from the World date", () => {
    const midday = new Date(2026, 8, 8, 12).getTime();
    expect(getInitialWorldPhase(new Date(2026, 8, 9, 12).getTime(), midday)).toBe("avant");
    expect(getInitialWorldPhase(new Date(2026, 8, 8, 23).getTime(), midday)).toBe("pendant");
    expect(getInitialWorldPhase(new Date(2026, 8, 7, 12).getTime(), midday)).toBe("apres");
  });

  describe("facile mode", () => {
    it.each(phases)("keeps only the essentials in the rail for %s", phase => {
      const rail = getWeddingRailItems(phase, getWeddingCapabilities("owner"), "fr", "facile");
      expect(rail.map(item => item.id)).toEqual(["timeline", "people", "providers", "tasks", "finances"]);
    });

    it("intersects the mode with the role (minimum of both)", () => {
      const family = getWeddingRailItems("avant", getWeddingCapabilities("family"), "fr", "facile");
      expect(family.map(item => item.id)).toEqual(["timeline", "people", "providers", "tasks"]);
      const viewer = getWeddingRailItems("avant", getWeddingCapabilities("viewer"), "fr", "facile");
      expect(viewer.map(item => item.id)).toEqual(["timeline", "people"]);
    });

    it("keeps only the wedding day and the memories in the phase tools", () => {
      const owner = getWeddingCapabilities("owner");
      expect(getWeddingNavigation("avant", owner, "fr", "facile").primary).toEqual([]);
      expect(getWeddingNavigation("pendant", owner, "fr", "facile").primary.map(item => item.id)).toEqual(["day-of"]);
      expect(getWeddingNavigation("apres", owner, "fr", "facile").primary.map(item => item.id)).toEqual(["memories"]);
      expect(getWeddingNavigation("pendant", owner, "fr", "facile").secondary).toEqual([]);
    });

    it.each(phases.flatMap(phase => roles.map(role => [phase, role] as const)))(
      "keeps %s facile navigation unique for %s",
      (phase, role) => {
        const capabilities = getWeddingCapabilities(role);
        const rail = getWeddingRailItems(phase, capabilities, "fr", "facile");
        const navigation = getWeddingNavigation(phase, capabilities, "fr", "facile");
        const entries = [...rail, ...navigation.primary, ...navigation.secondary];
        expect(new Set(entries.map(entry => entry.id)).size).toBe(entries.length);
        expect(rail[0].id).toBe("timeline");
      },
    );

    it("keeps essential panels reachable and pro panels closed in Facile", () => {
      const owner = getWeddingCapabilities("owner");
      const rail = getWeddingRailItems("avant", owner, "fr", "facile");
      const navigation = getWeddingNavigation("avant", owner, "fr", "facile");
      expect(isWeddingPanelAvailable("budget", navigation, "chronological", rail)).toBe(true);
      expect(isWeddingPanelAvailable("planning", navigation, "chronological", rail)).toBe(true);
      expect(isWeddingPanelAvailable("seating", navigation, "chronological", rail)).toBe(false);
      expect(isWeddingPanelAvailable("music", navigation, "chronological", rail)).toBe(false);
    });

    it("finds phases within the facile surface only", () => {
      expect(findPhaseForPanel("dayof", "owner", "chronological", "facile")).toBe("pendant");
      expect(findPhaseForPanel("seating", "owner", "chronological", "facile")).toBe(null);
      expect(findPhaseForPanel("seating", "owner", "chronological")).toBe("avant");
    });
  });
});

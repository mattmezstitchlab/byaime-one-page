import { describe, expect, it } from "vitest";
import {
  getInitialWorldPhase,
  getWeddingCapabilities,
  getWeddingNavigation,
  isWeddingDestinationActive,
  WORLD_PHASES,
  type WeddingRole,
} from "./wedding-navigation";

describe("wedding navigation", () => {
  const phases = ["avant", "pendant", "apres"] as const;
  const roles: WeddingRole[] = ["owner", "planner", "family", "viewer"];

  it.each(phases)("keeps Timeline first for %s", phase => {
    expect(getWeddingNavigation(phase, getWeddingCapabilities("owner")).primary[0].id).toBe("timeline");
  });

  it.each(phases.flatMap(phase => roles.map(role => [phase, role] as const)))(
    "keeps %s navigation for %s unique",
    (phase, role) => {
      const navigation = getWeddingNavigation(phase, getWeddingCapabilities(role));
      const entries = [...navigation.primary, ...navigation.secondary];
      expect(new Set(entries.map(entry => entry.id)).size).toBe(entries.length);
      expect(new Set(entries.map(entry => entry.label)).size).toBe(entries.length);
      expect(navigation.primary[0].id).toBe("timeline");
    },
  );

  it("gives owners and planners all Avant destinations", () => {
    for (const role of ["owner", "planner"] as const) {
      expect(getWeddingNavigation("avant", getWeddingCapabilities(role)).primary.map(item => item.label)).toEqual([
        "Timeline", "Personnes", "Prestataires", "Tâches", "Documents", "Finances", "Musique",
      ]);
    }
  });

  it("keeps finances, private documents, and the delivered film out of family and viewer navigation", () => {
    for (const role of ["family", "viewer"] as const) {
      for (const phase of phases) {
        const entries = getWeddingNavigation(phase, getWeddingCapabilities(role)).primary
          .concat(getWeddingNavigation(phase, getWeddingCapabilities(role)).secondary);
        expect(entries.map(item => item.id)).not.toContain("finances");
        expect(entries.map(item => item.id)).not.toContain("documents");
        expect(entries.map(item => item.id)).not.toContain("film");
      }
    }
  });

  it("keeps the music destination active while its linked-track tool is open", () => {
    const music = getWeddingNavigation("avant", getWeddingCapabilities("owner")).primary.find(item => item.id === "music");
    expect(isWeddingDestinationActive(music!.destination, "music", null)).toBe(true);
    expect(isWeddingDestinationActive(music!.destination, "music", "music")).toBe(true);
    expect(isWeddingDestinationActive(music!.destination, "music", "documents")).toBe(false);
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
});
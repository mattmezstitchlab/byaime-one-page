import { describe, expect, it } from "vitest";
import {
  getInitialWorldPhase,
  isWeddingDestinationActive,
  WEDDING_PRIMARY_NAVIGATION,
  WEDDING_SECONDARY_NAVIGATION,
  WORLD_PHASES,
} from "./wedding-navigation";

describe("wedding navigation", () => {
  it("keeps the five major destinations unique and stable", () => {
    expect(WEDDING_PRIMARY_NAVIGATION.map(item => item.label)).toEqual([
      "Timeline",
      "Musique",
      "Personnes",
      "Documents",
      "Finances",
    ]);
    expect(new Set(WEDDING_PRIMARY_NAVIGATION.map(item => item.id)).size).toBe(5);
  });

  it("does not duplicate major destinations in secondary sections", () => {
    const primaryLabels = new Set(WEDDING_PRIMARY_NAVIGATION.map(item => item.label));
    expect(WEDDING_SECONDARY_NAVIGATION.every(item => !primaryLabels.has(item.label))).toBe(true);
  });

  it("keeps the music destination active while its linked-track tool is open", () => {
    const music = WEDDING_PRIMARY_NAVIGATION.find(item => item.id === "music");
    expect(music).toBeDefined();
    expect(isWeddingDestinationActive(music!.destination, "music", null)).toBe(true);
    expect(isWeddingDestinationActive(music!.destination, "music", "music")).toBe(true);
    expect(isWeddingDestinationActive(music!.destination, "music", "documents")).toBe(false);
  });

  it("keeps the World capsule strictly temporal", () => {
    expect(WORLD_PHASES.map(phase => phase.label)).toEqual([
      "Avant",
      "Le Jour J",
      "Après",
    ]);
  });

  it("chooses the initial period from the World date", () => {
    const midday = new Date(2026, 8, 8, 12).getTime();
    expect(getInitialWorldPhase(new Date(2026, 8, 9, 12).getTime(), midday)).toBe("avant");
    expect(getInitialWorldPhase(new Date(2026, 8, 8, 23).getTime(), midday)).toBe("pendant");
    expect(getInitialWorldPhase(new Date(2026, 8, 7, 12).getTime(), midday)).toBe("apres");
  });
});
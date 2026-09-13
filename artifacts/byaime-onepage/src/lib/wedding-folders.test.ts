import { describe, expect, it } from "vitest";
import {
  getFolderCount,
  getFolderLabel,
  getWeddingFolders,
  isFolderLocked,
  WEDDING_FOLDER_IDS,
} from "./wedding-folders";
import type { WorldProject } from "./types";

const project = {
  guests: [{}, {}],
  payments: [{}],
  documents: [{}, {}, {}],
  providers: [{}],
  timeline: [{ phase: "avant" }, { phase: "pendant" }, { phase: "pendant" }],
  memories: [{}],
  media: [{}, {}],
  communications: [{}],
  messageLogs: [],
  messages: [{}],
} as unknown as WorldProject;

describe("wedding folders (universal dossiers)", () => {
  it("declares exactly seven folders, each with a label and a World panel", () => {
    const folders = getWeddingFolders("fr");
    expect(folders.map(folder => folder.id)).toEqual([...WEDDING_FOLDER_IDS]);
    for (const folder of folders) {
      expect(folder.label).toBe(getFolderLabel(folder.id, "fr"));
      expect(folder.label.length).toBeGreaterThan(0);
      expect(folder.description.length).toBeGreaterThan(0);
      expect(folder.destination.kind).toBe("panel");
    }
    expect(new Set(folders.map(folder => folder.destination.panel)).size).toBe(7);
  });

  it("keeps money and contracts away from unauthorized roles", () => {
    const folders = getWeddingFolders("fr");
    const budget = folders.find(folder => folder.id === "budget")!;
    const contracts = folders.find(folder => folder.id === "contracts")!;
    const guests = folders.find(folder => folder.id === "guests")!;
    for (const role of ["owner", "planner"]) {
      expect(isFolderLocked(budget, role)).toBe(false);
      expect(isFolderLocked(contracts, role)).toBe(false);
    }
    for (const role of ["family", "viewer"]) {
      expect(isFolderLocked(budget, role)).toBe(true);
      expect(isFolderLocked(contracts, role)).toBe(true);
      expect(isFolderLocked(guests, role)).toBe(false);
    }
  });

  it("counts honests elements from the World, zero without one", () => {
    expect(getFolderCount("guests", project)).toBe(2);
    expect(getFolderCount("budget", project)).toBe(1);
    expect(getFolderCount("contracts", project)).toBe(3);
    expect(getFolderCount("providers", project)).toBe(1);
    expect(getFolderCount("program", project)).toBe(2);
    expect(getFolderCount("memories", project)).toBe(3);
    expect(getFolderCount("messages", project)).toBe(2);
    for (const id of WEDDING_FOLDER_IDS) {
      expect(getFolderCount(id, null)).toBe(0);
    }
  });
});

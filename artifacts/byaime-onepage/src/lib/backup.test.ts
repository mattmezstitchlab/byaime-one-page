import { describe, expect, it } from "vitest";
import { backupProject, restoreProject } from "./backup";

describe("project backup serialization", () => {
  it("round-trips without changing nested data", () => {
    const project = { id: "p1", title: "Léa & Sam", guests: [{ id: "g1", name: "Zoé" }] } as never;
    expect(restoreProject(backupProject(project))).toEqual(project);
  });
  it("rejects unrelated JSON", () => {
    expect(() => restoreProject('{"hello":"world"}')).toThrow("Sauvegarde AIME invalide");
  });
});
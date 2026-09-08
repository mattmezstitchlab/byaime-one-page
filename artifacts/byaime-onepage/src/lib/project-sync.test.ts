import { describe, expect, it } from "vitest";
import { isCurrentRevision } from "./project-sync";

describe("project sync revisions", () => {
  it("publie le résultat de la dernière révision confirmée", () => {
    expect(isCurrentRevision(4, 4)).toBe(true);
  });

  it("ignore la réussite ou l’échec d’une sauvegarde devenue obsolète", () => {
    expect(isCurrentRevision(5, 4)).toBe(false);
  });
});
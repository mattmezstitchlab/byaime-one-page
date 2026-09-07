import { describe, expect, it } from "vitest";
import { createInitialProject, parseIntention } from "./parser";
import { executeCommand, parseFrenchCommand, proposeCommand } from "./command-agent";

const project = () => createInitialProject(parseIntention("Mariage le 14 août 2027"), "Mariage le 14 août 2027");
describe("bounded command agent", () => {
  it.each([
    ["décale cérémonie de 15 minutes", "shift-event"],
    ["liste les tâches restantes", "remaining-tasks"],
    ["prépare le planning prestataire", "provider-schedule"],
    ["analyse les besoins alimentaires", "dietary-analysis"],
    ["trouve les conflits timeline", "timeline-conflicts"],
    ["ajoute 3 invités", "add-guests"],
  ])("parses %s", (input, kind) => expect(parseFrenchCommand(input)?.kind).toBe(kind));
  it("requires confirmation and executes a mutation", () => {
    const value = project();
    const command = parseFrenchCommand("ajoute 2 invités")!;
    const proposal = proposeCommand(value, command);
    expect(() => executeCommand(value, proposal)).toThrow("Confirmation");
    expect(executeCommand(value, proposal, true).project.guests).toHaveLength(value.guests.length + 2);
  });
  it("does not claim unsupported requests", () => expect(parseFrenchCommand("commande un orchestre")).toBeUndefined());
});
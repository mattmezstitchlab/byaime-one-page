import { describe, expect, it } from "vitest";
import { answerLocally, askAssistant, assistantSuggestions, classifyDocument, guessFolderLocally } from "./assistant";

describe("assistant client (JUMO du mariage)", () => {
  it("answers locally without a project, with sources and suggestions", async () => {
    const reply = await askAssistant({ project: null, message: "Où en est le budget ?", locale: "fr" });
    expect(reply.mode).toBe("local");
    expect(reply.answer.length).toBeGreaterThan(0);
    expect(reply.suggestions).toHaveLength(4);
    expect(assistantSuggestions("fr")).toHaveLength(4);
    expect(assistantSuggestions("en")[0]).toContain("budget");
  });

  it("keeps the local answer readable: title, paragraphs, steps", () => {
    const reply = answerLocally("Que faire maintenant ?", { project: null, locale: "fr" });
    expect(reply.answer).toContain("Ce qui débloque le plus");
    expect(reply.answer).toContain("• ");
    expect(reply.mode).toBe("local");
  });

  it("guesses the folder of a file name", () => {
    expect(guessFolderLocally("Devis traiteur.pdf")).toBe("budget");
    expect(guessFolderLocally("Contrat salle signé.pdf")).toBe("contracts");
    expect(guessFolderLocally("Facture acompte.pdf")).toBe("budget");
    expect(guessFolderLocally("Déroulé Jour J.xlsx")).toBe("program");
    expect(guessFolderLocally("Plan de table v3.pdf")).toBe("guests");
    expect(guessFolderLocally("photo-groupe.jpg")).toBe("memories");
    expect(guessFolderLocally("Discours témoin.txt")).toBe("messages");
    expect(guessFolderLocally("note-sans-indice.txt")).toBe("contracts");
  });

  it("classifies locally without a project", async () => {
    const result = await classifyDocument({ project: null, name: "devis-fleuriste.pdf" });
    expect(result).toEqual({ folder: "budget", mode: "local" });
  });
});

import { describe, expect, it } from "vitest";
import {
  cleanLaboratoryContext,
  describeLaboratoryContext,
  describeLaboratoryJourney,
  laboratoryStatusLabels,
  laboratoryTypeLabels,
} from "./laboratory";

describe("laboratory helpers", () => {
  it("keeps the feedback vocabulary readable", () => {
    expect(laboratoryTypeLabels.question).toBe("❓ Je ne comprends pas");
    expect(laboratoryStatusLabels.a_verifier).toBe("À revérifier");
  });

  it("drops empty context fields", () => {
    expect(cleanLaboratoryContext({
      route: "world",
      panel: "",
      momentId: undefined,
      entityLabel: "Cérémonie",
    })).toEqual({
      route: "world",
      entityLabel: "Cérémonie",
    });
  });

  it("summarizes lightweight context without replaying navigation", () => {
    expect(describeLaboratoryContext({
      route: "world",
      phase: "pendant",
      view: "chronological",
      momentTitle: "Cérémonie",
      narrative: "Moment ouvert depuis la Timeline.",
    })).toEqual([
      "Monde",
      "Pendant",
      "Timeline",
      "Moment Cérémonie",
      "Moment ouvert depuis la Timeline.",
    ]);
  });

  it("builds a human-readable journey for visible context", () => {
    expect(describeLaboratoryJourney({
      route: "world",
      phase: "avant",
      view: "chronological",
      momentTitle: "Cocktail",
    })).toBe("Monde → Avant → Timeline → Moment Cocktail");
  });
});

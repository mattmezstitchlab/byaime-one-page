import { describe, expect, it } from "vitest";
import {
  createLaboratoryFeedbackInput,
  formatLaboratoryId,
  laboratoryContextSchema,
  listLaboratoryFeedbackQuery,
} from "./laboratory";

describe("laboratory helpers", () => {
  it("formats stable readable laboratory ids", () => {
    expect(formatLaboratoryId(1)).toBe("LAB-000001");
    expect(formatLaboratoryId(427)).toBe("LAB-000427");
  });

  it("accepts only the lightweight contextual fields", () => {
    expect(createLaboratoryFeedbackInput.parse({
      type: "bug",
      message: "Le moment affiché ne correspond pas à ce que je viens d’ouvrir.",
      context: {
        projectId: "550e8400-e29b-41d4-a716-446655440000",
        route: "world",
        view: "chronological",
        phase: "pendant",
        panel: "music",
        momentId: "dj3",
        momentTitle: "Cérémonie",
        entityKind: "music",
        entityId: "m2",
        narrative: "Moment du calendrier ouvert depuis la Timeline.",
      },
    }).context.momentId).toBe("dj3");
    expect(() => laboratoryContextSchema.parse({ debugDump: "nope" })).toThrow();
  });

  it("parses optional filters without forcing ticketing fields", () => {
    expect(listLaboratoryFeedbackQuery.parse({ status: "nouveau" }).status).toBe("nouveau");
    expect(listLaboratoryFeedbackQuery.parse({ type: "positif" }).type).toBe("positif");
  });
});

import { describe, expect, it } from "vitest";

import { resolveDefaultMode, resolveEffectiveMode } from "./mode";

describe("aime mode", () => {
  it("defaults couples and unknown personas to Facile, pros to Pro", () => {
    expect(resolveDefaultMode("couple")).toBe("facile");
    expect(resolveDefaultMode(undefined)).toBe("facile");
    expect(resolveDefaultMode("pro")).toBe("pro");
  });

  it("keeps the stored preference for owners and planners", () => {
    for (const role of ["owner", "planner"] as const) {
      expect(resolveEffectiveMode("facile", role)).toBe("facile");
      expect(resolveEffectiveMode("pro", role)).toBe("pro");
    }
  });

  it("locks accompanying roles to Facile whatever the preference", () => {
    for (const role of ["family", "viewer"] as const) {
      expect(resolveEffectiveMode("facile", role)).toBe("facile");
      expect(resolveEffectiveMode("pro", role)).toBe("facile");
    }
  });
});

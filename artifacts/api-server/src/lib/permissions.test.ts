import { describe, expect, it } from "vitest";
import { authenticatedUserId, can } from "./permissions";

describe("project authorization", () => {
  it("keeps deletion owner-only and viewers read-only", () => {
    expect(can("owner", "delete")).toBe(true);
    expect(can("planner", "delete")).toBe(false);
    expect(can("viewer", "edit")).toBe(false);
    expect(can("family", "edit")).toBe(true);
  });
  it("rejects missing auth and supports Clerk claims", () => {
    expect(authenticatedUserId({})).toBeUndefined();
    expect(authenticatedUserId({ userId: "direct" })).toBe("direct");
    expect(authenticatedUserId({ userId: "direct", sessionClaims: { userId: "claim" } })).toBe("claim");
  });
});
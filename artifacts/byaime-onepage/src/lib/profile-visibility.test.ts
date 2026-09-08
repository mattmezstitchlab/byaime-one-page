import { describe, expect, it } from "vitest";
import { createInitialProject, parseIntention } from "./parser";
import { canRoleSeeTimelineEvent } from "./profile-visibility";

const event = createInitialProject(parseIntention("Mariage"), "Mariage").timeline[0];

describe("profile timeline visibility", () => {
  it("applies real membership roles and keeps finances owner-only", () => {
    expect(canRoleSeeTimelineEvent({ ...event, visibility: "prive" }, "owner")).toBe(true);
    expect(canRoleSeeTimelineEvent({ ...event, visibility: "equipe" }, "planner")).toBe(true);
    expect(canRoleSeeTimelineEvent({ ...event, visibility: "equipe" }, "family")).toBe(true);
    expect(canRoleSeeTimelineEvent({ ...event, visibility: "equipe" }, "viewer")).toBe(false);
    expect(canRoleSeeTimelineEvent({ ...event, visibility: "audience", kind: "paiement" }, "viewer")).toBe(false);
    expect(canRoleSeeTimelineEvent({ ...event, visibility: "audience" }, "viewer")).toBe(true);
  });
});
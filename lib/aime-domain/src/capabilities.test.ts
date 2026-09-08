import { describe, expect, it } from "vitest";
import {
  canReadDataLevel,
  evaluateCapability,
  mapLegacyProjectRole,
} from "./capabilities";

describe("universal capability registry", () => {
  it("maps existing wedding roles restrictively", () => {
    expect(mapLegacyProjectRole("owner")).toBe("owner");
    expect(mapLegacyProjectRole("planner")).toBe("editor");
    expect(mapLegacyProjectRole("family")).toBe("contributor");
    expect(mapLegacyProjectRole("viewer")).toBe("viewer");
  });

  it("keeps public discovery readable without granting actions", () => {
    expect(
      evaluateCapability("card.view", {
        authenticated: false,
        subjectPublic: true,
      }).allowed,
    ).toBe(true);
    expect(
      evaluateCapability("card.contact", {
        authenticated: false,
        subjectPublic: true,
      }),
    ).toMatchObject({ allowed: false, requiresAuthentication: true });
  });

  it("separates business labels from technical permissions", () => {
    const context = {
      authenticated: true,
      worldRole: "viewer" as const,
    };
    expect(evaluateCapability("world.edit", context).allowed).toBe(false);
    expect(evaluateCapability("moment.create", context).allowed).toBe(false);
  });

  it("lets contributors edit only their own moments", () => {
    const base = {
      authenticated: true,
      worldRole: "contributor" as const,
    };
    expect(
      evaluateCapability("moment.edit", {
        ...base,
        ownsContribution: true,
      }).allowed,
    ).toBe(true);
    expect(
      evaluateCapability("moment.edit", {
        ...base,
        ownsContribution: false,
      }).allowed,
    ).toBe(false);
  });

  it("requires explicit permission for financial and exact location data", () => {
    const editor = {
      authenticated: true,
      worldRole: "editor" as const,
    };
    expect(canReadDataLevel("financial", editor).allowed).toBe(false);
    expect(canReadDataLevel("exact_location", editor).allowed).toBe(false);

    expect(
      canReadDataLevel("financial", {
        ...editor,
        permissions: new Set(["payments.read" as const]),
      }).allowed,
    ).toBe(true);
    expect(
      canReadDataLevel("exact_location", {
        ...editor,
        permissions: new Set(["locations.exact.read" as const]),
      }).allowed,
    ).toBe(true);
  });

  it("does not let a blocked relation execute social actions", () => {
    expect(
      evaluateCapability("card.contact", {
        authenticated: true,
        socialRelation: "blocked",
        contactAllowed: true,
      }).allowed,
    ).toBe(false);
    expect(
      evaluateCapability("card.follow", {
        authenticated: true,
        socialRelation: "blocked",
      }).allowed,
    ).toBe(false);
  });

  it("marks destructive and public actions for confirmation", () => {
    expect(
      evaluateCapability("world.delete", {
        authenticated: true,
        worldRole: "owner",
      }),
    ).toMatchObject({ allowed: true, requiresConfirmation: true });
    expect(
      evaluateCapability("media.publish", {
        authenticated: true,
        subjectOwned: true,
      }),
    ).toMatchObject({ allowed: true, requiresConfirmation: true });
  });

  it("keeps sound contribution, decision, and session control separate", () => {
    const contributor = {
      authenticated: true,
      soundRole: "contributor" as const,
    };
    expect(evaluateCapability("sound.contribute", contributor).allowed).toBe(true);
    expect(evaluateCapability("sound.decide", contributor).allowed).toBe(false);
    expect(
      evaluateCapability("sound.control_session", {
        authenticated: true,
        soundRole: "operator",
      }).allowed,
    ).toBe(true);
    expect(
      evaluateCapability("sound.publish", {
        authenticated: true,
        soundRole: "operator",
      }).allowed,
    ).toBe(false);
  });

  it("requires confirmation for sound decisions and publication", () => {
    expect(
      evaluateCapability("sound.decide", {
        authenticated: true,
        soundRole: "reviewer",
      }),
    ).toMatchObject({ allowed: true, requiresConfirmation: true });
    expect(
      evaluateCapability("sound.publish", {
        authenticated: true,
        soundRole: "moderator",
      }),
    ).toMatchObject({ allowed: true, requiresConfirmation: true });
  });
});
import { describe, expect, it } from "vitest";
import {
  COLLABORATION_ROLE_POLICY,
  INVITATION_ROLE_OPTIONS,
} from "./collaboration-roles";

describe("collaboration role descriptions", () => {
  it("states the effective edit and management boundaries", () => {
    expect(COLLABORATION_ROLE_POLICY.planner).toMatchObject({
      canEdit: true,
      canManageAccess: true,
      canPublish: false,
      canDelete: false,
    });
    expect(COLLABORATION_ROLE_POLICY.family).toMatchObject({
      canEdit: true,
      canManageAccess: false,
      canPublish: false,
      canDelete: false,
    });
    expect(COLLABORATION_ROLE_POLICY.viewer).toMatchObject({
      canEdit: false,
      canManageAccess: false,
      canPublish: false,
      canDelete: false,
      projection: "audience",
    });
  });

  it("does not present editable roles as read-only or viewers as RSVP-only", () => {
    const labels = Object.fromEntries(
      INVITATION_ROLE_OPTIONS.map((option) => [option.value, option.label]),
    );
    expect(labels.family).toContain("peut modifier le contenu partagé");
    expect(labels.planner).toContain("gérer les accès et les documents");
    expect(labels.planner).toContain("finances, publication et suppression");
    expect(labels.viewer).toContain("projection destinée à l’audience");
    expect(labels.family).not.toContain("lecture seule");
    expect(labels.viewer).not.toContain("sa propre participation");
  });
});
import { describe, expect, it } from "vitest";
import { emptyParticipation } from "@workspace/aime-domain";
import {
  canAccessClaimedRsvp,
  claimConsentSchema,
  claimEligibility,
  claimRecipientSchema,
  claimedParticipantWorld,
  participationWithRsvp,
  rsvpClaimConflicts,
  rsvpFieldsChanged,
  withoutRsvpCopies,
} from "./rsvpClaim";
const eligible = {
  userId: "jean",
  hasCard: true,
  revoked: false,
  claimedAt: null,
  claimedCardUserId: null,
  claimEmail: " Jean@Example.org ",
  verifiedEmails: ["jean@example.org"],
  sameRecipientCount: 1,
  guestExists: true,
  anotherInvitationClaimed: false,
};
const response = {
  status: "confirmed",
  plusOne: true,
  dietary: "végétarien",
  notes: "RSVP historique",
  attendance: { ceremony: true, cocktail: false, dinner: true, brunch: false },
};
describe("Invitation anonyme → validation explicite → carte", () => {
  it("requires explicit, strict consent and organizer confirmation", () => {
    expect(claimConsentSchema.safeParse({ confirmed: true }).success).toBe(
      true,
    );
    for (const value of [
      {},
      { confirmed: false },
      { confirmed: true, userId: "someone-else" },
    ])
      expect(claimConsentSchema.safeParse(value).success).toBe(false);
    expect(
      claimRecipientSchema.parse({
        email: " Jean@Example.org ",
        confirmed: true,
      }).email,
    ).toBe("jean@example.org");
    expect(
      claimRecipientSchema.safeParse({ email: "Jean Dupont", confirmed: true })
        .success,
    ).toBe(false);
  });
  it("accepts a unique recipient verified on the authenticated account, never a name", () => {
    expect(claimEligibility(eligible)).toBeNull();
  });
  it.each([
    { verifiedEmails: [] },
    { verifiedEmails: ["other@example.org"] },
    { claimEmail: null },
    { sameRecipientCount: 2 },
    { hasCard: false },
    { revoked: true },
    { guestExists: false },
    { anotherInvitationClaimed: true },
  ])("refuses missing or ambiguous proof: %j", (patch) => {
    expect(claimEligibility({ ...eligible, ...patch })).not.toBeNull();
  });
  it("replays only for the same account and keeps deletion tombstones closed", () => {
    expect(
      claimEligibility({
        ...eligible,
        claimedAt: new Date(),
        claimedCardUserId: "jean",
      }),
    ).toBeNull();
    expect(
      claimEligibility({
        ...eligible,
        claimedAt: new Date(),
        claimedCardUserId: "other",
      }),
    ).not.toBeNull();
    expect(
      claimEligibility({
        ...eligible,
        claimedAt: new Date(),
        claimedCardUserId: null,
      }),
    ).not.toBeNull();
    expect(canAccessClaimedRsvp({})).toBe(true);
    for (const user of [undefined, "other"])
      expect(
        canAccessClaimedRsvp(
          { claimedAt: new Date(), claimedCardUserId: "jean" },
          user,
        ),
      ).toBe(false);
    expect(
      canAccessClaimedRsvp(
        { claimedAt: new Date(), claimedCardUserId: "jean" },
        "jean",
      ),
    ).toBe(true);
    expect(
      canAccessClaimedRsvp(
        { claimedAt: new Date(), claimedCardUserId: null },
        "jean",
      ),
    ).toBe(false);
  });
  it("keeps RSVP canonical, with independent roles, needs, social moments and no copied answers", () => {
    const stored = {
      ...emptyParticipation(),
      roles: ["Invité", "Ami"],
      moments: ["Soirée"],
      needs: "besoin contextualisé",
    };
    const joined = participationWithRsvp(stored, response);
    expect(joined).toMatchObject({
      rsvp: "present",
      companions: 1,
      dietary: response.dietary,
      roles: stored.roles,
      needs: stored.needs,
    });
    expect(joined.moments).toEqual(["Soirée", "Cérémonie", "Dîner"]);
    expect(rsvpClaimConflicts(stored, response)).toEqual([]);
    const persisted = withoutRsvpCopies(joined);
    for (const key of ["rsvp", "companions", "dietary", "notes"])
      expect(persisted).not.toHaveProperty(key);
    expect(persisted.moments).toEqual(["Soirée"]);
    expect(participationWithRsvp(persisted, response)).toEqual(joined);
    expect(
      rsvpFieldsChanged(
        { ...joined, moments: [...joined.moments, "Préparatifs"] },
        persisted,
        response,
      ),
    ).toEqual([]);
    expect(
      rsvpFieldsChanged(
        { ...joined, rsvp: "absent", dietary: "" },
        persisted,
        response,
      ),
    ).toEqual(["rsvp", "dietary"]);
    expect(
      rsvpClaimConflicts(
        { ...stored, rsvp: "absent", dietary: "contradictoire" },
        response,
      ),
    ).toEqual(["rsvp", "dietary"]);
    expect(participationWithRsvp({}, null).rsvp).toBe("en_attente");
  });
  it("does not turn RSVP claiming into collaboration access or expose another guest’s health data", () => {
    const limited = claimedParticipantWorld(
      {
        pivot: { value: 100, secret: "private" },
        guests: [
          { id: "me", name: "Jean" },
          { id: "other", dietary: "secret santé" },
        ],
        payments: [{ amount: 9000 }],
        team: [{ email: "secret@example.org" }],
        timeline: [
          {
            id: "public",
            title: "Cérémonie",
            time: 100,
            phase: "pendant",
            visibility: "audience",
          },
          {
            id: "private",
            title: "Secret équipe",
            time: 200,
            phase: "pendant",
            visibility: "prive",
          },
        ],
      },
      "me",
    );
    const json = JSON.stringify(limited);
    expect(json).toContain("Cérémonie");
    expect(json).not.toContain("secret");
    expect(json).not.toContain("Secret équipe");
    expect(json).not.toContain("9000");
    expect(limited.guests).toEqual([]);
  });
});

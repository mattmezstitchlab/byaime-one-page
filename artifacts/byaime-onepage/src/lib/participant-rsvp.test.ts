import { describe, expect, it } from "vitest";
import type { Guest, ParticipantLink } from "@/lib/types";
import {
  effectiveGuestDietary,
  effectiveGuestRsvp,
} from "@/lib/participant-rsvp";

const guest: Guest = {
  id: "guest-1",
  name: "Camille",
  role: "invite",
  rsvp: "en_attente",
  dietary: "Sans gluten",
  attendance: {
    ceremony: true,
    cocktail: true,
    dinner: true,
    brunch: false,
  },
};

describe("participant RSVP projection", () => {
  it("uses the participant response ahead of the local guest draft", () => {
    const link: ParticipantLink = {
      guestId: guest.id,
      token: "token",
      revoked: true,
      response: { status: "declined", dietary: "Végane" },
    };

    expect(effectiveGuestRsvp(guest, link)).toBe("decline");
    expect(effectiveGuestDietary(guest, link)).toBe("Végane");
  });

  it("keeps local planning values until the participant responds", () => {
    expect(effectiveGuestRsvp(guest)).toBe("en_attente");
    expect(effectiveGuestDietary(guest)).toBe("Sans gluten");
  });
});
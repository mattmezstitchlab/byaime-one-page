import type { Guest, ParticipantLink } from "@/lib/types";

export function effectiveGuestRsvp(
  guest: Guest,
  link?: ParticipantLink,
): Guest["rsvp"] {
  if (link?.response?.status === "confirmed") return "confirme";
  if (link?.response?.status === "declined") return "decline";
  return guest.rsvp;
}

export function effectiveGuestDietary(
  guest: Guest,
  link?: ParticipantLink,
): string {
  return link?.response?.dietary ?? guest.dietary ?? "";
}
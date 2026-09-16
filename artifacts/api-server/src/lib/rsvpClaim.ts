import { buildParticipantProjection } from "./participantProjection";
import { emptyParticipation, type Participation } from "@workspace/aime-domain";
import { z } from "zod";

const email = z.string().trim().toLowerCase().email();
export const claimConsentSchema = z
  .object({ confirmed: z.literal(true) })
  .strict();
export const claimRecipientSchema = z
  .object({ email, confirmed: z.literal(true) })
  .strict();
export const RSVP_SHARED_FIELDS = [
  "rsvp",
  "companions",
  "moments",
  "dietary",
  "notes",
] as const;
const names = {
  ceremony: "Cérémonie",
  cocktail: "Cocktail",
  dinner: "Dîner",
  brunch: "Brunch",
};
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
export function normalizedClaimEmail(value: unknown): string | null {
  const result = email.safeParse(value);
  return result.success ? result.data : null;
}
export function canAccessClaimedRsvp(
  link: { claimedAt?: unknown; claimedCardUserId?: string | null },
  userId?: string,
) {
  return (
    (!link.claimedAt && !link.claimedCardUserId) ||
    Boolean(userId && link.claimedCardUserId === userId)
  );
}
/** Names, nickname and card profession deliberately do not enter this decision. */
export function claimEligibility(input: {
  userId: string;
  hasCard: boolean;
  revoked: boolean;
  claimedAt: unknown;
  claimedCardUserId: string | null;
  claimEmail: string | null;
  verifiedEmails: string[];
  sameRecipientCount: number;
  guestExists: boolean;
  anotherInvitationClaimed: boolean;
}): string | null {
  if (input.revoked || !input.guestExists)
    return "Invitation invalide ou révoquée.";
  if (!input.hasCard)
    return "Créez votre Carte Universelle avant de rattacher cette invitation.";
  if (input.claimedAt || input.claimedCardUserId)
    return input.claimedCardUserId === input.userId
      ? null
      : "Cette invitation ne peut pas être rattachée à ce compte.";
  if (input.anotherInvitationClaimed)
    return "Votre carte est déjà liée à une invitation de ce mariage.";
  const intended = normalizedClaimEmail(input.claimEmail);
  if (
    !intended ||
    input.sameRecipientCount !== 1 ||
    !input.verifiedEmails.some((e) => normalizedClaimEmail(e) === intended)
  ) {
    return "Rattachement refusé. Faites confirmer par l’organisateur une adresse personnelle unique et vérifiez cette adresse dans votre compte.";
  }
  return null;
}
/** Source is the existing RSVP response, never a copy in the card or membership. */
export function participationWithRsvp(
  stored: unknown,
  response: unknown,
): Participation {
  const base = { ...emptyParticipation(), ...record(stored) } as Participation;
  const r = record(response),
    attendance = record(r.attendance);
  const extraMoments = (Array.isArray(base.moments) ? base.moments : []).filter(
    (m) => !Object.values(names).includes(m),
  );
  return {
    ...base,
    rsvp:
      r.status === "confirmed"
        ? "present"
        : r.status === "declined"
          ? "absent"
          : "en_attente",
    companions: r.plusOne === true ? 1 : 0,
    moments: [
      ...extraMoments,
      ...Object.entries(names)
        .filter(([key]) => attendance[key] === true)
        .map(([, value]) => value),
    ],
    dietary: typeof r.dietary === "string" ? r.dietary : "",
    notes: typeof r.notes === "string" ? r.notes : "",
  };
}
export function withoutRsvpCopies(
  participation: Participation,
): Record<string, unknown> {
  const {
    rsvp: _rsvp,
    companions: _companions,
    moments,
    dietary: _dietary,
    notes: _notes,
    ...context
  } = participation;
  return {
    ...context,
    moments: moments.filter((m) => !Object.values(names).includes(m)),
  };
}
const ownedAnswer = (key: string, value: unknown) =>
  key === "moments" && Array.isArray(value)
    ? value.filter((m) => Object.values(names).includes(m))
    : value;
const same = (a: unknown, b: unknown) =>
  JSON.stringify(Array.isArray(a) ? [...a].sort() : a) ===
  JSON.stringify(Array.isArray(b) ? [...b].sort() : b);
export function rsvpClaimConflicts(
  stored: unknown,
  response: unknown,
): string[] {
  const base = record(stored),
    target = participationWithRsvp(stored, response),
    defaults = emptyParticipation();
  return RSVP_SHARED_FIELDS.filter(
    (key) =>
      base[key] !== undefined &&
      !same(ownedAnswer(key, base[key]), ownedAnswer(key, defaults[key])) &&
      !same(ownedAnswer(key, base[key]), ownedAnswer(key, target[key])),
  );
}
export function rsvpFieldsChanged(
  submitted: Participation,
  stored: unknown,
  response: unknown,
) {
  const source = participationWithRsvp(stored, response);
  return RSVP_SHARED_FIELDS.filter(
    (key) =>
      !same(ownedAnswer(key, submitted[key]), ownedAnswer(key, source[key])),
  );
}

/** Reuse the existing invitation projection. A claimed RSVP is NOT a collaboration invitation. */
export function claimedParticipantWorld(data: unknown, guestId: string) {
  const source = record(data),
    projection = buildParticipantProjection(data, guestId);
  const nullFact = { value: null, confidence: "manquant" };
  const events = [...projection.program, ...projection.afterContent];
  return {
    schemaVersion: 2,
    universe: "Mariage",
    pivot: {
      value:
        typeof record(source.pivot).value === "number"
          ? record(source.pivot).value
          : null,
      confidence: "confirme",
    },
    city: {
      value: projection.practicalInfo.city ?? null,
      confidence: "confirme",
    },
    venue: {
      value: projection.practicalInfo.venue ?? null,
      confidence: "confirme",
    },
    budget: nullFact,
    guestsCount: nullFact,
    timeline: [
      ...new Map(
        events.map((e) => [
          e.id,
          {
            ...e,
            kind: "evenement",
            status: "prepare",
            confidence: "confirme",
            phase: e.phase ?? "pendant",
            universe: "Mariage",
            visibility: "audience",
          },
        ]),
      ).values(),
    ],
    tasks: [],
    guests: [],
    tables: [],
    providers: [],
    payments: [],
    documents: [],
    communications: [],
    team: [],
    music: [],
    memories: [],
    media: [],
    messages: [],
    messageLogs: [],
    messageTemplates: [],
    memoryChecklist: [],
    missing: [],
    logistics: {
      parking: projection.practicalInfo.parking ?? "",
      accessibility: projection.practicalInfo.accessibility ?? "",
      weatherFallback: projection.practicalInfo.weatherFallback ?? "",
      accommodations: [],
      shuttles: [],
      emergencyContacts: [],
      packing: [],
    },
  };
}

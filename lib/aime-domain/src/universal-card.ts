import type { ProfessionalAssignment, ProfessionalProfile } from "./professional-profile";
/** Personal source of truth. Context and access permissions intentionally separate. */
export const ROLE_GROUPS = {
  Couple: ["Marié", "Mariée"],
  Famille: [
    "Mère du marié",
    "Père du marié",
    "Mère de la mariée",
    "Père de la mariée",
    "Frère",
    "Sœur",
    "Famille",
    "Autre membre de la famille",
  ],
  Entourage: ["Témoin", "Invité", "Ami", "Autre"],
  Professionnels: [
    "Wedding planner",
    "Photographe",
    "Vidéaste",
    "DJ",
    "Saxophoniste",
    "Traiteur",
    "Fleuriste",
    "Coiffeur",
    "Maquilleur",
    "Lieu",
    "Autre prestataire",
  ],
} as const;
export const PRESENCE_MOMENTS = [
  "Cérémonie",
  "Cocktail",
  "Dîner",
  "Soirée",
  "Brunch",
  "Lendemain",
] as const;
export type CardMusic = {
  provider: "apple_music" | "spotify" | "manual";
  externalId: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  previewUrl?: string;
  trackUrl?: string;
};
export type UniversalCard = {
  firstName: string;
  lastName: string;
  nickname: string;
  city: string;
  profession: string;
  photoUrl: string;
  interests: string[];
  music?: CardMusic;
};
export type Participation = {
  assignments?: ProfessionalAssignment[];
  roles: string[];
  rsvp: "en_attente" | "present" | "absent" | "peut_etre";
  companions: number;
  moments: string[];
  arrival: string;
  departure: string;
  allergens: string;
  dietary: string;
  needs: string;
  notes: string;
  /** ISO dates include an explicit UTC offset; no ambiguous local server timezone. */
  slots: { label: string; start: string; end: string }[];
};
export const emptyParticipation = (): Participation => ({
  roles: [],
  rsvp: "en_attente",
  companions: 0,
  moments: [],
  arrival: "",
  departure: "",
  allergens: "",
  dietary: "",
  needs: "",
  notes: "",
  slots: [],
});
export const emptyCard = (): UniversalCard => ({
  firstName: "",
  lastName: "",
  nickname: "",
  city: "",
  profession: "",
  photoUrl: "",
  interests: [],
});
export type CardParticipant = {
  userId: string;
  card: UniversalCard;
  participation: Participation;
  profiles?: ProfessionalProfile[];
};
const derivedPrefix = "card-presence:";
export function stripCardProjection(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const { cardParticipants: _, ...rest } = data;
  return {
    ...rest,
    timeline: Array.isArray(data.timeline)
      ? data.timeline.filter((e) => !String(e?.id).startsWith(derivedPrefix))
      : data.timeline,
  };
}
/** Read model only: never store personal identity in a wedding timeline. */
export function projectCardTimeline(
  participants: CardParticipant[],
  universe = "Mariage",
) {
  return participants.flatMap(({ userId, card, participation: p }) => {
    if (p.rsvp === "absent") return [];
    const slots = [
      ...(p.arrival && p.departure
        ? [{ label: "Présence", start: p.arrival, end: p.departure }]
        : []),
      ...p.slots,
    ];
    return slots.flatMap((slot, index) => {
      const time = Date.parse(slot.start),
        endTime = Date.parse(slot.end);
      if (
        !Number.isFinite(time) ||
        !Number.isFinite(endTime) ||
        endTime <= time
      )
        return [];
      return [
        {
          id: `${derivedPrefix}${userId}:${index}`,
          time,
          endTime,
          durationMinutes: (endTime - time) / 60000,
          kind: "evenement" as const,
          title: `${card.firstName} ${card.lastName} · ${slot.label}`,
          detail: [
            card.profession,
            p.roles.join(", "),
            p.moments.join(", "),
            p.rsvp === "peut_etre" ? "Peut-être" : "",
          ]
            .filter(Boolean)
            .join(" · "),
          responsible: `${card.firstName} ${card.lastName}`,
          ownerId: userId,
          status: "prepare" as const,
          confidence: "confirme" as const,
          phase: "pendant" as const,
          universe,
          provenance: "integration" as const,
          visibility: "equipe" as const,
          relations: [],
          ...(card.photoUrl
            ? { visual: { kind: "image", url: card.photoUrl } }
            : {}),
        },
      ];
    });
  });
}

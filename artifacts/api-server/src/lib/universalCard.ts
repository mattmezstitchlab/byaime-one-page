import { z } from "zod";
import {
  ROLE_GROUPS,
  parameterErrors,
  resolveProfessionalAssignment,
  type ProfessionalProfile,
  type ProfessionalAssignment,
  PRESENCE_MOMENTS,
  type CardParticipant,
  projectCardTimeline,
  stripCardProjection,
} from "@workspace/aime-domain";
const text = z.string().trim().max(2000);
const webUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), "HTTPS requis");
const photo = z.union([
  z.literal(""),
  webUrl,
  z
    .string()
    .max(700000)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/),
]);
export const cardSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    nickname: text,
    city: text,
    profession: text,
    photoUrl: photo,
    interests: z.array(z.string().trim().min(1).max(100)).max(30),
    music: z
      .object({
        provider: z.enum(["apple_music", "spotify", "manual"]),
        externalId: text,
        title: text,
        artist: text,
        artworkUrl: webUrl.optional(),
        previewUrl: webUrl.optional(),
        trackUrl: webUrl.optional(),
      })
      .optional(),
  })
  .strict();
const date = z.union([z.literal(""), z.string().datetime({ offset: true })]);
const roles = Object.values(ROLE_GROUPS).flat() as readonly string[];
const instant = z.string().datetime({ offset: true });
const range = z
  .object({ start: instant, end: instant })
  .strict()
  .refine(
    (v) => Date.parse(v.end) > Date.parse(v.start),
    "Fin après début requise",
  );
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const parameters = z
  .record(
    z.string().max(100),
    z.union([z.number().int().min(0).max(2880), z.string().max(2000)]),
  )
  .refine((v) => Object.keys(v).length <= 30);
export const functioningSchema = z
  .object({
    parameters,
    availability: z
      .object({
        timezone: z
          .string()
          .max(100)
          .refine((zone) => {
            try {
              new Intl.DateTimeFormat("en", { timeZone: zone });
              return true;
            } catch {
              return false;
            }
          }, "Fuseau IANA invalide"),
        weekly: z
          .array(
            z
              .object({
                weekday: z.number().int().min(0).max(6),
                start: time,
                end: time,
                overnight: z.boolean(),
              })
              .strict()
              .refine(
                (w) => w.overnight || w.end > w.start,
                "Créneau hebdomadaire inversé",
              ),
          )
          .max(30),
        windows: z.array(range).max(100),
        unavailable: z.array(range).max(100),
      })
      .strict(),
    coveredMoments: z.array(z.enum(PRESENCE_MOMENTS)).max(6),
    legacyNotes: z
      .record(z.string().max(100), z.string().max(2000))
      .refine((v) => Object.keys(v).length <= 30),
  })
  .strict();
export const profileInputSchema = z
  .object({
    profession: z.string().trim().min(1).max(100),
    data: functioningSchema,
    updatedAt: z.string().datetime().nullable(),
  })
  .strict()
  .superRefine((v, ctx) => {
    parameterErrors(v.profession, v.data.parameters).forEach((message) =>
      ctx.addIssue({ code: "custom", message, path: ["data", "parameters"] }),
    );
  });
export const assignmentSchema = z
  .object({
    id: z.string().uuid(),
    profileId: z.string().uuid(),
    anchor: z.union([
      z
        .object({
          eventId: z
            .string()
            .min(1)
            .max(200)
            .refine((id) => !id.startsWith("card-presence:")),
        })
        .strict(),
      z.object({ start: instant }).strict(),
      z.object({ presence: z.literal("arrival") }).strict(),
    ]),
    overrides: parameters,
  })
  .strict();
/** Full assignment validation is ownership-aware and independent of display projections. */
export function assignmentErrors(
  userId: string,
  roles: string[],
  assignments: ProfessionalAssignment[],
  profiles: ProfessionalProfile[],
  events: { id: string; time: number }[],
  presence: { arrival?: string; departure?: string; rsvp?: string } = {},
) {
  return assignments.flatMap((assignment) => {
    const profile = profiles.find(
      (p) => p.id === assignment.profileId && p.cardUserId === userId,
    );
    if (!profile) return ["Profil métier introuvable pour ce compte"];
    if (!roles.includes(profile.profession))
      return ["Le profil doit correspondre à un rôle de ce mariage"];
    if (presence.rsvp === "absent")
      return parameterErrors(profile.profession, assignment.overrides);
    const resolved = resolveProfessionalAssignment(
      profile,
      assignment,
      events,
      presence,
    );
    return [
      ...resolved.errors,
      ...(resolved.availability === "unavailable"
        ? [
            "Intervention hors disponibilités professionnelles (installation comprise)",
          ]
        : []),
    ];
  });
}

export const participationSchema = z
  .object({
    assignments: z
      .array(assignmentSchema)
      .max(30)
      .refine(
        (v) => new Set(v.map((a) => a.id)).size === v.length,
        "Identifiants d’intervention dupliqués",
      )
      .optional(),
    roles: z
      .array(z.string().refine((v) => roles.includes(v)))
      .max(30)
      .transform((v) => [...new Set(v)]),
    rsvp: z.enum(["en_attente", "present", "absent", "peut_etre"]),
    companions: z.number().int().min(0).max(50),
    moments: z
      .array(
        z
          .string()
          .refine((v) => (PRESENCE_MOMENTS as readonly string[]).includes(v)),
      )
      .max(6),
    arrival: date,
    departure: date,
    allergens: text,
    dietary: text,
    needs: text,
    notes: text,
    slots: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).max(100),
            start: z.string().datetime({ offset: true }),
            end: z.string().datetime({ offset: true }),
          })
          .refine(
            (v) => Date.parse(v.end) > Date.parse(v.start),
            "La fin doit suivre le début",
          ),
      )
      .max(30),
  })
  .refine(
    (v) =>
      (!v.arrival && !v.departure) ||
      (Boolean(v.arrival && v.departure) &&
        Date.parse(v.departure) > Date.parse(v.arrival)),
    "Renseignez un début et une fin cohérents",
  );

export function projectWithCards(
  value: unknown,
  participants: CardParticipant[],
) {
  const data = stripCardProjection((value ?? {}) as Record<string, unknown>);
  const events = Array.isArray(data.timeline) ? data.timeline : [];
  const normalized = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const timedParticipants = participants.map((person) => ({
    ...person,
    participation: {
      ...person.participation,
      slots: [
        ...person.participation.slots,
        ...person.participation.moments.flatMap((moment) => {
          if (
            person.participation.slots.some(
              (slot) => normalized(slot.label) === normalized(moment),
            )
          )
            return [];
          // Only existing, explicitly timed wedding moments; never invent a schedule.
          return events
            .filter(
              (event) =>
                event.phase === "pendant" &&
                normalized(String(event.title)).includes(normalized(moment)),
            )
            .flatMap((event) => {
              const end =
                event.endTime ??
                (event.durationMinutes
                  ? event.time + event.durationMinutes * 60000
                  : undefined);
              return Number.isFinite(event.time) &&
                Number.isFinite(end) &&
                end > event.time
                ? [
                    {
                      label: `Présence · ${moment}`,
                      start: new Date(event.time).toISOString(),
                      end: new Date(end).toISOString(),
                    },
                  ]
                : [];
            });
        }),
      ],
    },
  }));
  const professionalEvents = participants.flatMap((person) =>
    (person.participation.assignments ?? []).flatMap((assignment) => {
      if (person.participation.rsvp === "absent") return [];
      const profile = person.profiles?.find(
        (p) =>
          p.id === assignment.profileId &&
          p.cardUserId === person.userId &&
          person.participation.roles.includes(p.profession),
      );
      if (!profile) return [];
      const resolved = resolveProfessionalAssignment(
        profile,
        assignment,
        events,
        person.participation,
      );
      return resolved.ranges.map((range) => ({
        id: `card-presence:assignment:${assignment.id}:${range.key}`,
        time: range.start,
        endTime: range.end,
        durationMinutes: (range.end - range.start) / 60000,
        kind: "evenement",
        title: `${person.card.firstName} ${person.card.lastName} · ${range.label}`,
        detail: `${profile.profession} · Disponibilité ${resolved.availability === "available" ? "compatible" : resolved.availability === "unavailable" ? "en conflit" : "à confirmer"}`,
        ownerId: person.userId,
        responsible: `${person.card.firstName} ${person.card.lastName}`,
        status:
          resolved.errors.length || resolved.availability === "unavailable"
            ? "bloque"
            : resolved.availability === "unknown" ||
                person.participation.rsvp !== "present"
              ? "a_valider"
              : "prepare",
        confidence:
          !resolved.errors.length &&
          resolved.availability === "available" &&
          person.participation.rsvp === "present"
            ? "confirme"
            : "a_confirmer",
        phase: "pendant",
        universe: String(data.universe ?? "Mariage"),
        provenance: "integration",
        visibility: "equipe",
        relations: [],
        dependencyIds:
          "eventId" in assignment.anchor ? [assignment.anchor.eventId] : [],
        ...(person.card.photoUrl
          ? { visual: { kind: "image", url: person.card.photoUrl } }
          : {}),
      }));
    }),
  );
  return {
    ...data,
    cardParticipants: participants.map(
      ({ userId, card, participation, profiles = [] }) => ({
        functioning: (participation.assignments ?? [])
          .map((a) => {
            const profile = profiles.find(
              (p) =>
                p.id === a.profileId &&
                p.cardUserId === userId &&
                participation.roles.includes(p.profession),
            );
            if (!profile) return null;
            const resolved = resolveProfessionalAssignment(
              profile,
              a,
              events,
              participation,
            );
            return {
              profileId: profile.id,
              profession: profile.profession,
              parameters: resolved.parameters,
              availability: resolved.availability,
              errors: resolved.errors,
            };
          })
          .filter((v) => v !== null),
        userId,
        card: {
          firstName: card.firstName,
          lastName: card.lastName,
          nickname: card.nickname,
          photoUrl: card.photoUrl,
          profession: card.profession,
        },
        // Medical/private answers never enter a generic project snapshot.
        participation: {
          roles: participation.roles,
          rsvp: participation.rsvp,
          moments: participation.moments,
          arrival: participation.arrival,
          departure: participation.departure,
        },
      }),
    ),
    timeline: [
      ...(Array.isArray(data.timeline) ? data.timeline : []),
      ...professionalEvents,
      ...projectCardTimeline(
        timedParticipants,
        String(data.universe ?? "Mariage"),
      ),
    ],
  };
}

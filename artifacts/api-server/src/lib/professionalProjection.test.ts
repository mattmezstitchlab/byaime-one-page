import { describe, expect, it } from "vitest";
import {
  cardSchema,
  functioningSchema,
  profileInputSchema,
  participationSchema,
  assignmentErrors,
  projectWithCards,
} from "./universalCard";
import {
  emptyCard,
  emptyFunctioning,
  emptyParticipation,
  stripCardProjection,
  type ProfessionalAssignment,
  type ProfessionalProfile,
} from "@workspace/aime-domain";
const profile: ProfessionalProfile = {
  id: "a13ced47-f2b8-4e1d-a82d-ef663f7e79aa",
  cardUserId: "jean",
  profession: "Photographe",
  updatedAt: "2027-01-01T00:00:00.000Z",
  data: {
    ...emptyFunctioning(),
    parameters: { durationMinutes: 540, setupMinutes: 30 },
    availability: {
      ...emptyFunctioning().availability,
      weekly: [{ weekday: 6, start: "13:00", end: "23:30", overnight: false }],
    },
  },
};
const assignment: ProfessionalAssignment = {
  id: "b13ced47-f2b8-4e1d-a82d-ef663f7e79aa",
  profileId: profile.id,
  anchor: { start: "2027-06-12T14:00:00+02:00" },
  overrides: {},
};
const identity = {
  ...emptyCard(),
  firstName: "Jean",
  lastName: "Dupont",
  profession: "Photographe",
  city: "Paris",
};
const a = {
  userId: "jean",
  card: identity,
  profiles: [profile],
  participation: {
    ...emptyParticipation(),
    rsvp: "present" as const,
    roles: ["Photographe", "Témoin"],
    assignments: [assignment],
    allergens: "arachides",
    needs: "information confidentielle",
  },
};
describe("three sources, one read-only timeline", () => {
  it("keeps identity, professional data and contextual data strictly separate", () => {
    expect(cardSchema.safeParse(identity).success).toBe(true);
    expect(
      cardSchema.safeParse({ ...identity, professional: {} }).success,
    ).toBe(false);
    expect(
      cardSchema.safeParse({ ...identity, allergens: "arachides" }).success,
    ).toBe(false);
    expect(
      profileInputSchema.safeParse({
        profession: profile.profession,
        data: profile.data,
        updatedAt: profile.updatedAt,
      }).success,
    ).toBe(true);
    expect(
      functioningSchema.safeParse({ ...profile.data, rsvp: "present" }).success,
    ).toBe(false);
    expect(participationSchema.safeParse(a.participation).success).toBe(true);
  });
  it("checks ownership and contextual role, never grants permission via a métier", () => {
    expect(
      assignmentErrors("jean", ["Photographe"], [assignment], [profile], []),
    ).toEqual([]);
    expect(
      assignmentErrors("paul", ["Photographe"], [assignment], [profile], []),
    ).not.toEqual([]);
    expect(
      assignmentErrors("jean", ["Invité"], [assignment], [profile], []),
    ).not.toEqual([]);
    expect(
      participationSchema.safeParse({
        ...emptyParticipation(),
        roles: ["owner"],
      }).success,
    ).toBe(false);
  });
  it("rejects unavailable assignments, invalid anchors and unknown override parameters", () => {
    expect(
      assignmentErrors(
        "jean",
        ["Photographe"],
        [{ ...assignment, anchor: { start: "2027-06-12T13:00:00+02:00" } }],
        [profile],
        [],
      ),
    ).not.toEqual([]);
    expect(
      assignmentErrors(
        "jean",
        ["Photographe"],
        [{ ...assignment, anchor: { eventId: "missing" } }],
        [profile],
        [],
      ),
    ).not.toEqual([]);
    expect(
      assignmentErrors(
        "jean",
        ["Photographe"],
        [{ ...assignment, overrides: { allergies: "x" } }],
        [profile],
        [],
      ),
    ).not.toEqual([]);
    expect(
      profileInputSchema.safeParse({
        profession: profile.profession,
        data: {
          ...profile.data,
          availability: { ...profile.data.availability, timezone: "invalide" },
        },
        updatedAt: null,
      }).success,
    ).toBe(false);
  });
  it("produces 13:30 setup and 14–23 service without storing copied parameters", () => {
    const view = projectWithCards({ timeline: [], guests: [], providers: [] }, [
      a,
    ]);
    expect(view.timeline.map((e) => e.durationMinutes)).toEqual([30, 540]);
    expect(view.timeline[1]).toMatchObject({
      title: "Jean Dupont · Photographe",
      status: "prepare",
    });
    expect(view.cardParticipants[0].functioning[0].profileId).toBe(profile.id);
    expect(JSON.stringify(view)).not.toMatch(
      /arachides|information confidentielle|weekly|legacyNotes/,
    );
    expect(stripCardProjection(view)).toEqual({
      timeline: [],
      guests: [],
      providers: [],
    });
    expect(assignment.overrides).toEqual({});
  });
  it("does not schedule habitual availability without an explicit wedding assignment", () => {
    const b = {
      ...a,
      participation: {
        ...emptyParticipation(),
        roles: ["Invité"],
        moments: ["Cocktail"],
      },
    };
    const cocktail = {
      id: "cocktail",
      phase: "pendant",
      title: "Cocktail",
      time: Date.parse("2027-06-12T18:00:00+02:00"),
      endTime: Date.parse("2027-06-12T20:00:00+02:00"),
    };
    expect(b.card).toBe(a.card);
    expect(b.profiles[0]).toBe(a.profiles[0]);
    expect(projectWithCards({ timeline: [] }, [b]).timeline).toEqual([]);
    expect(
      projectWithCards({ timeline: [cocktail] }, [b]).timeline,
    ).toHaveLength(2);
    expect(
      projectWithCards({ timeline: [] }, [b]).cardParticipants[0].functioning,
    ).toEqual([]);
  });
  it("propagates changed profile defaults and flags newly incompatible schedules", () => {
    const changed = {
      ...profile,
      data: {
        ...profile.data,
        parameters: { durationMinutes: 600, setupMinutes: 30 },
      },
    };
    const result = projectWithCards({ timeline: [] }, [
      { ...a, profiles: [changed] },
    ]);
    expect(result.timeline[1].durationMinutes).toBe(600);
    expect(result.timeline[1].status).toBe("bloque");
    expect(projectWithCards(result, [{ ...a, profiles: [changed] }])).toEqual(
      result,
    );
    const override = {
      ...a,
      profiles: [changed],
      participation: {
        ...a.participation,
        assignments: [{ ...assignment, overrides: { durationMinutes: 120 } }],
      },
    };
    expect(projectWithCards({}, [override]).timeline[1].durationMinutes).toBe(
      120,
    );
  });
  it("allows cancellation even if availability has since changed", () => {
    const changed = {
      ...profile,
      data: {
        ...profile.data,
        availability: {
          ...profile.data.availability,
          unavailable: [
            { start: "2027-06-12T00:00:00Z", end: "2027-06-13T00:00:00Z" },
          ],
        },
      },
    };
    expect(
      assignmentErrors("jean", ["Photographe"], [assignment], [changed], [], {
        rsvp: "absent",
      }),
    ).toEqual([]);
  });
  it("does not emit intervention events for an absent participant", () => {
    expect(
      projectWithCards({}, [
        { ...a, participation: { ...a.participation, rsvp: "absent" } },
      ]).timeline,
    ).toEqual([]);
  });
  it("does not represent an unconfirmed RSVP as confirmed work", () => {
    expect(
      projectWithCards({}, [
        { ...a, participation: { ...a.participation, rsvp: "peut_etre" } },
      ]).timeline[0],
    ).toMatchObject({ status: "a_valider", confidence: "a_confirmer" });
  });
});

describe("Jean — une identité, Photographe + DJ, plusieurs rôles sociaux", () => {
  it("isolates A/Photographe and B/DJ parameters, calendars, interventions and timeline information in both directions", () => {
    const photo = structuredClone(profile);
    photo.data.parameters = {
      durationMinutes: 510,
      setupMinutes: 30,
      delivery: "Galerie photo uniquement",
    };
    const dj: ProfessionalProfile = {
      id: "a13ced47-f2b8-4e1d-a82d-ef663f7e79bb",
      cardUserId: "jean",
      profession: "DJ",
      updatedAt: profile.updatedAt,
      data: {
        ...emptyFunctioning(),
        parameters: {
          durationMinutes: 240,
          setupMinutes: 45,
          teardownMinutes: 15,
          technicalNeeds: "Régie DJ uniquement",
        },
        availability: {
          ...emptyFunctioning().availability,
          weekly: [
            { weekday: 0, start: "18:00", end: "03:00", overnight: true },
          ],
        },
      },
    };
    const pa = {
      ...emptyParticipation(),
      roles: ["Photographe", "Témoin", "Ami"],
      rsvp: "present" as const,
      arrival: "2027-06-12T14:00:00+02:00",
      departure: "2027-06-12T23:00:00+02:00",
      assignments: [
        { ...assignment, anchor: { presence: "arrival" as const } },
      ],
    };
    const pb = {
      ...emptyParticipation(),
      roles: ["DJ", "Invité", "Frère"],
      rsvp: "present" as const,
      arrival: "2027-06-13T20:00:00+02:00",
      departure: "2027-06-14T01:00:00+02:00",
      assignments: [
        {
          id: "b13ced47-f2b8-4e1d-a82d-ef663f7e79bb",
          profileId: dj.id,
          anchor: { presence: "arrival" as const },
          overrides: {},
        },
      ],
    };
    const profiles = [photo, dj],
      world = { timeline: [], universe: "Mariage" };
    const project = (participation: typeof pa, card = identity) =>
      projectWithCards(world, [
        { userId: "jean", card, profiles, participation },
      ]);
    expect(
      assignmentErrors("jean", pa.roles, pa.assignments, profiles, [], pa),
    ).toEqual([]);
    expect(
      assignmentErrors("jean", pb.roles, pb.assignments, profiles, [], pb),
    ).toEqual([]);
    expect(
      assignmentErrors("jean", pb.roles, pa.assignments, profiles, [], pb),
    ).not.toEqual([]);
    const first = project(pa),
      second = project(pb);
    expect(first.cardParticipants[0].functioning[0]).toMatchObject({
      profileId: photo.id,
      profession: "Photographe",
      availability: "available",
    });
    expect(second.cardParticipants[0].functioning[0]).toMatchObject({
      profileId: dj.id,
      profession: "DJ",
      availability: "available",
    });
    expect(
      first.timeline.find((e) => e.title === "Jean Dupont · Photographe")
        ?.durationMinutes,
    ).toBe(510);
    expect(
      second.timeline.find((e) => e.title === "Jean Dupont · DJ")
        ?.durationMinutes,
    ).toBe(240);
    expect(JSON.stringify(first)).not.toContain("Régie DJ uniquement");
    expect(JSON.stringify(second)).not.toContain("Galerie photo uniquement");
    expect(first.cardParticipants[0].participation.roles).toEqual([
      "Photographe",
      "Témoin",
      "Ami",
    ]);
    expect(second.cardParticipants[0].participation.roles).toEqual([
      "DJ",
      "Invité",
      "Frère",
    ]);
    const photoBefore = structuredClone(photo);
    dj.data.parameters.durationMinutes = 120;
    dj.data.availability.unavailable.push({
      start: "2027-06-13T18:00:00+02:00",
      end: "2027-06-14T04:00:00+02:00",
    });
    expect(project(pa)).toEqual(first);
    expect(photo).toEqual(photoBefore);
    expect(
      project(pb).timeline.find((e) => e.title === "Jean Dupont · DJ"),
    ).toMatchObject({ durationMinutes: 120, status: "bloque" });
    const bAfter = project(pb);
    photo.data.parameters.durationMinutes = 300;
    photo.data.availability.weekly = [];
    expect(project(pb)).toEqual(bAfter);
    // The presentation label can change without selecting, renaming or modifying a functioning profile.
    const renamed = project(pb, {
      ...identity,
      profession: "Photographe et musicien",
    });
    expect(renamed.cardParticipants[0].functioning).toEqual(
      bAfter.cardParticipants[0].functioning,
    );
    expect(
      renamed.timeline.filter((e) => e.id.includes(":assignment:")),
    ).toEqual(bAfter.timeline.filter((e) => e.id.includes(":assignment:")));
    expect(pa.assignments[0].profileId).toBe(photo.id);
    expect(pb.assignments[0].profileId).toBe(dj.id);
  });
});

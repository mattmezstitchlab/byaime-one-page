import { describe, expect, it } from "vitest";
import {
  cardSchema,
  participationSchema,
  projectWithCards,
} from "./universalCard";
import {
  emptyCard,
  emptyParticipation,
  projectCardTimeline,
  stripCardProjection,
  professionalConfig,
  type CardParticipant,
} from "@workspace/aime-domain";
const jean: CardParticipant = {
  userId: "test-jean-dupont",
  card: {
    ...emptyCard(),
    firstName: "Jean",
    lastName: "Dupont",
    city: "Paris",
    profession: "Photographe",
    photoUrl: "https://example.org/jean.png",

  },
  participation: {
    ...emptyParticipation(),
    roles: ["Photographe"],
    rsvp: "present",
    arrival: "2027-06-12T14:00:00+02:00",
    departure: "2027-06-12T23:00:00+02:00",
    allergens: "arachides",
    moments: ["Cérémonie", "Cocktail", "Dîner"],
  },
};
describe("Carte Universelle — Jean Dupont", () => {
  it("validates the person and participation separately", () => {
    expect(cardSchema.parse(jean.card)).toEqual(jean.card);
    expect(participationSchema.parse(jean.participation)).toEqual(
      jean.participation,
    );
    expect(
      cardSchema.safeParse({ ...jean.card, allergens: "not universal" }).success,
    ).toBe(false);
  });
  it("projects identity, photo, profession, contextual role and 14–23 in the existing timeline", () => {
    const existing = { id: "legacy-event", title: "Original", time: 1 };
    const project = projectWithCards({ timeline: [existing] }, [jean]);
    expect(project.timeline[0]).toBe(existing);
    const event = project.timeline[1];
    expect(event).toMatchObject({
      title: "Jean Dupont · Présence",
      ownerId: jean.userId,
      durationMinutes: 540,
      visual: { url: jean.card.photoUrl },
    });
    expect(event.detail).toContain("Photographe");
    expect(event.time).toBe(Date.parse(jean.participation.arrival));
    expect(project.cardParticipants[0].participation.roles).toEqual([
      "Photographe",
    ]);
    expect(JSON.stringify(project)).not.toContain("arachides");
    expect(jean.card).not.toHaveProperty("professional");
    expect(stripCardProjection(project)).toEqual({ timeline: [existing] });
  });
  it("does not clone a card when another marriage assigns Invité", () => {
    const second = {
      ...jean,
      participation: { ...jean.participation, roles: ["Invité"] },
    };
    expect(second.card).toBe(jean.card);
    expect(projectCardTimeline([second])[0].detail).toContain("Invité");
    expect(jean.participation.roles).toEqual(["Photographe"]);
    jean.card.firstName = "Jean-Paul";
    expect(projectCardTimeline([second])[0].title).toContain("Jean-Paul");
    jean.card.firstName = "Jean";
  });
  it("is idempotent on repeated projections and removes obsolete absence events", () => {
    const once = projectWithCards({ timeline: [] }, [jean]);
    expect(projectWithCards(once, [jean])).toEqual(once);
    expect(
      projectWithCards(once, [
        { ...jean, participation: { ...jean.participation, rsvp: "absent" } },
      ]).timeline,
    ).toEqual([]);
    expect(projectWithCards({}, []).timeline).toEqual([]);
  });
  it("projects explicit musical slots and supports overnight presence", () => {
    const p = {
      ...emptyParticipation(),
      roles: ["Saxophoniste"],
      slots: [
        {
          label: "Cocktail",
          start: "2027-06-12T18:00:00+02:00",
          end: "2027-06-12T20:00:00+02:00",
        },
      ],
    };
    expect(
      projectCardTimeline([{ ...jean, participation: p }])[0].durationMinutes,
    ).toBe(120);
    expect(
      participationSchema.safeParse({
        ...p,
        arrival: "2027-06-12T23:00:00Z",
        departure: "2027-06-13T02:00:00Z",
      }).success,
    ).toBe(true);
  });
  it("uses known wedding moments without asking the guest for their times again", () => {
    const ceremony = {
      id: "ceremony",
      title: "Cérémonie",
      phase: "pendant",
      time: Date.parse("2027-06-12T14:00:00Z"),
      endTime: Date.parse("2027-06-12T15:00:00Z"),
    };
    const person = {
      ...jean,
      participation: {
        ...emptyParticipation(),
        moments: ["Cérémonie"],
        rsvp: "present" as const,
      },
    };
    expect(
      projectWithCards({ timeline: [ceremony] }, [person]).timeline[1],
    ).toMatchObject({ time: ceremony.time, endTime: ceremony.endTime });
    expect(projectWithCards({ timeline: [] }, [person]).timeline).toEqual([]);
  });
  it("rejects bad dates, half ranges, URLs, inflated companions and access roles", () => {
    for (const value of [
      { companions: -1 },
      { roles: ["owner"] },
      { departure: "" },
      { departure: "2027-06-12T13:00:00+02:00" },
    ])
      expect(
        participationSchema.safeParse({ ...jean.participation, ...value })
          .success,
      ).toBe(false);
    expect(
      cardSchema.safeParse({ ...jean.card, photoUrl: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(cardSchema.safeParse({ ...jean.card, firstName: "" }).success).toBe(
      false,
    );
    expect(professionalConfig("DJ").fields.length).toBeGreaterThan(0);
  });
});

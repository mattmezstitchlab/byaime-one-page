import { describe, expect, it } from "vitest";
import {
  availabilityForRange,
  emptyFunctioning,
  parameterErrors,
  professionalConfig,
  resolveProfessionalAssignment,
  type ProfessionalProfile,
  type ProfessionalAssignment,
} from "./professional-profile";
const profile: ProfessionalProfile = {
  id: "p-jean",
  cardUserId: "jean",
  profession: "Photographe",
  updatedAt: "",
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
  id: "a",
  profileId: profile.id,
  anchor: { start: "2027-06-12T14:00:00+02:00" },
  overrides: {},
};
const ms = Date.parse;
describe("métier → paramètres → disponibilité → intervention contextuelle", () => {
  it("uses numeric minutes and includes installation in the availability footprint", () => {
    const resolved = resolveProfessionalAssignment(profile, assignment, []);
    expect(resolved.availability).toBe("available");
    expect(resolved.ranges).toEqual([
      {
        key: "setup",
        label: "Installation / préparation",
        start: ms("2027-06-12T13:30:00+02:00"),
        end: ms("2027-06-12T14:00:00+02:00"),
      },
      {
        key: "service",
        label: "Photographe",
        start: ms("2027-06-12T14:00:00+02:00"),
        end: ms("2027-06-12T23:00:00+02:00"),
      },
    ]);
    const tooEarly = {
      ...assignment,
      anchor: { start: "2027-06-12T13:00:00+02:00" },
    };
    expect(
      resolveProfessionalAssignment(profile, tooEarly, []).availability,
    ).toBe("unavailable");
  });
  it("references the existing arrival without re-entering or copying its timestamp", () => {
    const p = {
      ...profile,
      data: {
        ...profile.data,
        parameters: { durationMinutes: 510, setupMinutes: 30 },
      },
    };
    const a = { ...assignment, anchor: { presence: "arrival" as const } };
    const presence = {
      arrival: "2027-06-12T14:00:00+02:00",
      departure: "2027-06-12T23:00:00+02:00",
    };
    const resolved = resolveProfessionalAssignment(p, a, [], presence);
    expect(resolved.errors).toEqual([]);
    expect(resolved.ranges[0].start).toBe(ms(presence.arrival));
    expect(resolved.ranges[1].end).toBe(ms(presence.departure));
    expect(a.anchor).toEqual({ presence: "arrival" });
    expect(
      resolveProfessionalAssignment(profile, a, [], presence).errors,
    ).toContain("Intervention après votre départ du mariage");
    expect(resolveProfessionalAssignment(p, a, [], {}).ranges).toEqual([]);
  });
  it("resolves wedding overrides without changing the profile", () => {
    const a = resolveProfessionalAssignment(
      profile,
      { ...assignment, overrides: { durationMinutes: 120 } },
      [],
    );
    const b = resolveProfessionalAssignment(profile, assignment, []);
    expect((a.ranges[1].end - a.ranges[1].start) / 60000).toBe(120);
    expect((b.ranges[1].end - b.ranges[1].start) / 60000).toBe(540);
    expect(profile.data.parameters.durationMinutes).toBe(540);
  });
  it("recalculates defaults but not explicit exceptions when the source profile changes", () => {
    const changed = {
      ...profile,
      data: { ...profile.data, parameters: { durationMinutes: 180 } },
    };
    expect(
      resolveProfessionalAssignment(changed, assignment, []).ranges[0].end,
    ).toBe(ms("2027-06-12T17:00:00+02:00"));
    expect(
      resolveProfessionalAssignment(
        changed,
        { ...assignment, overrides: { durationMinutes: 60 } },
        [],
      ).ranges[0].end,
    ).toBe(ms("2027-06-12T15:00:00+02:00"));
  });
  it("anchors on the existing wedding event without copying its time", () => {
    const a = { ...assignment, anchor: { eventId: "cocktail" } };
    const t = ms("2027-06-12T16:00:00+02:00");
    expect(
      resolveProfessionalAssignment(profile, a, [{ id: "cocktail", time: t }])
        .ranges[1].start,
    ).toBe(t);
    expect(
      resolveProfessionalAssignment(profile, a, [
        { id: "cocktail", time: t + 60000 },
      ]).ranges[1].start,
    ).toBe(t + 60000);
    expect(
      resolveProfessionalAssignment(profile, a, []).errors.length,
    ).toBeGreaterThan(0);
  });
  it("calculates saxophone sets, breaks, soundcheck and setup", () => {
    const sax = {
      ...profile,
      profession: "Saxophoniste",
      data: {
        ...emptyFunctioning(),
        parameters: {
          setCount: 3,
          setMinutes: 30,
          breakMinutes: 15,
          setupMinutes: 20,
          soundcheckMinutes: 10,
        },
      },
    };
    const result = resolveProfessionalAssignment(sax, assignment, []);
    expect(result.ranges[1].end - result.ranges[1].start).toBe(120 * 60000);
    expect(result.ranges[0].end - result.ranges[0].start).toBe(30 * 60000);
    expect(result.availability).toBe("unknown");
    expect(
      resolveProfessionalAssignment(
        {
          ...sax,
          data: { ...sax.data, parameters: { setCount: 2, breakMinutes: 20 } },
        },
        assignment,
        [],
      ).errors.length,
    ).toBeGreaterThan(0);
  });
  it("does not parse legacy prose or confuse unknown availability with confirmation", () => {
    const unresolved = {
      ...profile,
      data: {
        ...emptyFunctioning(),
        legacyNotes: { Installation: "30 minutes", Durée: "9 heures" },
      },
    };
    expect(
      resolveProfessionalAssignment(unresolved, assignment, []).ranges,
    ).toEqual([]);
    expect(
      availabilityForRange(
        emptyFunctioning().availability,
        ms("2027-06-12T12:00Z"),
        ms("2027-06-12T13:00Z"),
      ),
    ).toBe("unknown");
  });
  it("prioritizes unavailable date exceptions over recurring and dated availability", () => {
    const range = {
      start: "2027-06-12T13:00:00+02:00",
      end: "2027-06-12T23:30:00+02:00",
    };
    const a = {
      ...profile.data.availability,
      windows: [range],
      unavailable: [
        {
          start: "2027-06-12T17:00:00+02:00",
          end: "2027-06-12T18:00:00+02:00",
        },
      ],
    };
    expect(availabilityForRange(a, ms(range.start), ms(range.end))).toBe(
      "unavailable",
    );
  });
  it("supports overnight weekly windows and enforces second-accurate boundaries", () => {
    const a = {
      ...emptyFunctioning().availability,
      weekly: [{ weekday: 6, start: "22:00", end: "02:00", overnight: true }],
    };
    expect(
      availabilityForRange(
        a,
        ms("2027-06-13T00:00:00+02:00"),
        ms("2027-06-13T02:00:00+02:00"),
      ),
    ).toBe("available");
    expect(
      availabilityForRange(
        a,
        ms("2027-06-13T00:00:00+02:00"),
        ms("2027-06-13T02:00:01+02:00"),
      ),
    ).toBe("unavailable");
  });
  it("uses the profile timezone across DST, not the host timezone", () => {
    const a = {
      ...emptyFunctioning().availability,
      weekly: [{ weekday: 0, start: "09:00", end: "17:00", overnight: false }],
    };
    expect(
      availabilityForRange(a, ms("2027-03-28T07:00Z"), ms("2027-03-28T15:00Z")),
    ).toBe("available");
    expect(
      availabilityForRange(a, ms("2027-03-28T06:00Z"), ms("2027-03-28T15:00Z")),
    ).toBe("unavailable");
  });
  it("uses a field registry with types and rejects unconfigured/sensitive keys", () => {
    expect(
      parameterErrors("Photographe", { durationMinutes: "9 hours" }),
    ).not.toEqual([]);
    expect(parameterErrors("Photographe", { setMinutes: 30 })).not.toEqual([]);
    expect(
      parameterErrors("Photographe", { allergens: "arachides" }),
    ).not.toEqual([]);
    expect(parameterErrors("Photographe", { durationMinutes: -1 })).not.toEqual(
      [],
    );
    expect(
      professionalConfig("Autre prestataire").fields.some(
        (f) => f.type === "minutes",
      ),
    ).toBe(true);
  });
});

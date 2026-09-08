import { describe, expect, it } from "vitest";
import { createTimelinePositioner } from "./profile-timeline-position";

describe("createTimelinePositioner", () => {
  it("centers an empty or single-point history", () => {
    expect(createTimelinePositioner([])(Date.now())).toBe(2000);
    expect(createTimelinePositioner([100])(100)).toBe(2000);
  });

  it("uses moments and RSVP arrivals in the same bounded domain", () => {
    const position = createTimelinePositioner([100, 200, 400]);
    expect(position(100)).toBe(1100);
    expect(position(250)).toBe(2000);
    expect(position(400)).toBe(2900);
  });

  it("clamps timestamps outside the visible history range", () => {
    const position = createTimelinePositioner([100, 200]);
    expect(position(-1000)).toBe(1100);
    expect(position(5000)).toBe(2900);
    expect(position(Number.NaN)).toBe(2000);
  });
});
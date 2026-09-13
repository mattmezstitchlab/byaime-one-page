import { describe, expect, it } from "vitest";
import {
  annotateDayRun,
  applyDayDelay,
  dayEventEnd,
  formatClock,
  formatCountdown,
  formatRelativeDayDelay,
} from "./day-run";
import type { TimelineEvent, WorldProject } from "./types";

const HOUR = 3_600_000;
const MINUTE = 60_000;
const DAY = new Date("2026-06-20T10:00:00").getTime();

function moment(partial: Partial<TimelineEvent> & { id: string; time: number }): TimelineEvent {
  return {
    title: partial.id,
    status: "prepare",
    confidence: "confirme",
    phase: "pendant",
    universe: "mariage",
    kind: "evenement",
    ...partial,
  } as TimelineEvent;
}

function projectWith(timeline: TimelineEvent[]): WorldProject {
  return { id: "p1", timeline } as WorldProject;
}

describe("moteur du Jour J", () => {
  it("repère le Moment en cours, le suivant et ceux en retard", () => {
    const events = [
      moment({ id: "m1", time: DAY, durationMinutes: 60, status: "execute" }),
      moment({ id: "m2", time: DAY + HOUR, durationMinutes: 60 }),
      moment({ id: "m3", time: DAY + 2 * HOUR, durationMinutes: 30 }),
      moment({ id: "m4", time: DAY + 3 * HOUR }),
    ];
    const snapshot = annotateDayRun(events, DAY + HOUR + 10 * MINUTE);

    expect(snapshot.live?.id).toBe("m2");
    expect(snapshot.next?.id).toBe("m3");
    expect(snapshot.firstLate).toBeUndefined();
    expect(snapshot.doneCount).toBe(1);
    expect(snapshot.states.get("m4")).toBe("upcoming");
  });

  it("signale les Moments dépassés non terminés au lieu de les oublier", () => {
    const events = [moment({ id: "m1", time: DAY, durationMinutes: 30 })];
    const snapshot = annotateDayRun(events, DAY + HOUR);

    expect(snapshot.live).toBeUndefined();
    expect(snapshot.next).toBeUndefined();
    expect(snapshot.firstLate?.id).toBe("m1");
    expect(snapshot.states.get("m1")).toBe("late");
  });

  it("formate le compte à rebours et l'horloge", () => {
    expect(formatCountdown(2 * HOUR + 14 * MINUTE + 33_000)).toBe("2:14:33");
    expect(formatCountdown(5 * MINUTE + 7_000)).toBe("05:07");
    expect(formatCountdown(-1_000)).toBe("00:00");
    expect(formatClock(DAY)).toMatch(/^\d{2}:\d{2}$/);
    expect(formatRelativeDayDelay(12 * MINUTE)).toBe("dans 12 min");
    expect(formatRelativeDayDelay(-65 * MINUTE)).toBe("il y a 1 h 05");
  });

  it("décale le Moment et toute la suite du déroulé, jamais le passé", () => {
    const timeline = [
      moment({ id: "m1", time: DAY, durationMinutes: 60 }),
      moment({ id: "m2", time: DAY + HOUR, durationMinutes: 60, endTime: DAY + 2 * HOUR }),
      moment({ id: "m3", time: DAY + 2 * HOUR, durationMinutes: 30 }),
      moment({ id: "early", time: DAY - HOUR, durationMinutes: 30 }),
      moment({ id: "avant", time: DAY + HOUR, durationMinutes: 10, phase: "avant" }),
    ];
    const { project, affectedIds } = applyDayDelay(projectWith(timeline), "m2", 15);

    expect(affectedIds).toEqual(["m2", "m3"]);
    const byId = new Map(project.timeline.map(event => [event.id, event]));
    expect(byId.get("m2")!.time).toBe(DAY + HOUR + 15 * MINUTE);
    expect(byId.get("m2")!.endTime).toBe(DAY + 2 * HOUR + 15 * MINUTE);
    expect(byId.get("m2")!.delayMinutes).toBe(15);
    expect(byId.get("m2")!.propagation?.state).toBe("applied");
    expect(byId.get("m3")!.time).toBe(DAY + 2 * HOUR + 15 * MINUTE);
    expect(byId.get("m3")!.delayMinutes).toBeUndefined();
    expect(byId.get("early")!.time).toBe(DAY - HOUR);
    expect(byId.get("avant")!.time).toBe(DAY + HOUR);
  });

  it("cumule les retards déclarés sur le même Moment", () => {
    const timeline = [moment({ id: "m1", time: DAY, durationMinutes: 60, delayMinutes: 10 })];
    const { project } = applyDayDelay(projectWith(timeline), "m1", 5);
    expect(project.timeline[0]!.delayMinutes).toBe(15);
  });

  it("ne touche à rien pour un Moment inconnu ou un retard nul", () => {
    const timeline = [moment({ id: "m1", time: DAY })];
    const project = projectWith(timeline);
    expect(applyDayDelay(project, "nope", 15).affectedIds).toEqual([]);
    expect(applyDayDelay(project, "m1", 0).affectedIds).toEqual([]);
    expect(applyDayDelay(project, "m1", 0).project).toBe(project);
  });
});

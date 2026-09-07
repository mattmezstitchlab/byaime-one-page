import { describe, expect, it } from "vitest";
import { createInitialProject, parseIntention } from "./parser";
import { analyzeEventImpact, applyPropagationPlan, buildTimelineIndex, findTimelineConflicts, planEventPropagation } from "./timeline-graph";
import { normalizeProject } from "./project-migration";

const project = () => createInitialProject(parseIntention("Mariage le 14 août 2027 à Lille"), "Mariage le 14 août 2027 à Lille");

describe("timeline graph", () => {
  it("migrates old projects deterministically", () => {
    const legacy = { ...project(), schemaVersion: undefined, timeline: project().timeline.map(({ relations: _r, ...event }) => event) } as never;
    expect(normalizeProject(legacy).schemaVersion).toBe(2);
    expect(normalizeProject(legacy)).toEqual(normalizeProject(legacy));
    expect(normalizeProject(legacy).timeline[0].relations).toEqual([]);
  });
  it("indexes reverse entity relations", () => {
    expect(buildTimelineIndex(project()).reverse.get("provider:p3")?.map(event => event.id)).toContain("dj3");
  });
  it("detects overlapping shared resources", () => {
    const events = [
      { ...project().timeline[0], id: "a", time: 0, durationMinutes: 60, resources: ["salle"] },
      { ...project().timeline[0], id: "b", time: 30 * 60000, durationMinutes: 60, resources: ["salle"] },
    ];
    expect(findTimelineConflicts(events)[0].type).toBe("resource");
  });
  it("previews impact and requires confirmation", () => {
    const value = project();
    const impact = analyzeEventImpact(value, "dj3", { location: "Jardin" });
    expect(impact.relations.length).toBeGreaterThan(0);
    const plan = planEventPropagation(value, "dj3", { location: "Jardin" });
    expect(() => applyPropagationPlan(value, plan, false)).toThrow("Confirmation");
    expect(applyPropagationPlan(value, plan, true).timeline.find(event => event.id === "dj3")?.location).toBe("Jardin");
  });
  it("previews and applies selected ripple dependencies only", () => {
    const value = project();
    const source = value.timeline.find(event => event.id === "dj3")!;
    value.timeline.push(
      { ...value.timeline[0], id: "after-dj", title: "Après le DJ", time: source.time + 3600000, dependencyIds: ["dj3"] },
      { ...value.timeline[0], id: "unrelated", title: "Sans lien", time: source.time + 7200000, dependencyIds: [] },
    );
    const plan = planEventPropagation(value, "dj3", { time: source.time + 30 * 60000 });
    expect(plan.timeDeltaMs).toBe(30 * 60000);
    expect(plan.dependentChanges.map(change => change.eventId)).toEqual(["after-dj"]);
    const applied = applyPropagationPlan(value, plan, true, ["after-dj"]);
    expect(applied.timeline.find(event => event.id === "dj3")?.time).toBe(source.time + 30 * 60000);
    expect(applied.timeline.find(event => event.id === "after-dj")?.time).toBe(source.time + 90 * 60000);
    expect(applied.timeline.find(event => event.id === "unrelated")?.time).toBe(source.time + 7200000);
  });
});
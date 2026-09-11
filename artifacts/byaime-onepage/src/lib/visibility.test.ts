import { describe, expect, it } from "vitest";
import { createInitialProject, parseIntention } from "./parser";
import { computeVisibilityModel, roleCanSeeEntityKind, roleCanSeeEvent } from "./timeline-graph";
import type { TimelineEvent } from "./types";

const base = () => createInitialProject(parseIntention("Mariage le 14 août 2027 à Lille"), "Mariage le 14 août 2027 à Lille");

const event = (id: string, visibility: "prive" | "equipe" | "audience", relations: TimelineEvent["relations"] = []): TimelineEvent => ({
  id,
  time: Date.UTC(2027, 7, 14),
  kind: "evenement",
  title: id,
  status: "prepare",
  confidence: "confirme",
  phase: "pendant",
  universe: "mariage",
  visibility,
  relations,
});

describe("visibility model", () => {
  it("gates events by visibility", () => {
    expect(roleCanSeeEvent("viewer", event("a", "audience"))).toBe(true);
    expect(roleCanSeeEvent("viewer", event("b", "equipe"))).toBe(false);
    expect(roleCanSeeEvent("viewer", event("c", "prive"))).toBe(false);
    expect(roleCanSeeEvent("family", event("b", "equipe"))).toBe(true);
    expect(roleCanSeeEvent("family", event("c", "prive"))).toBe(false);
    expect(roleCanSeeEvent("owner", event("c", "prive"))).toBe(true);
  });

  it("reserves payments and documents to owner/planner", () => {
    expect(roleCanSeeEntityKind("owner", "payment")).toBe(true);
    expect(roleCanSeeEntityKind("planner", "payment")).toBe(true);
    expect(roleCanSeeEntityKind("family", "payment")).toBe(false);
    expect(roleCanSeeEntityKind("viewer", "payment")).toBe(false);
    expect(roleCanSeeEntityKind("viewer", "document")).toBe(false);
    expect(roleCanSeeEntityKind("viewer", "guest")).toBe(true);
  });

  it("masks entities not linked to a public moment for viewers", () => {
    const p = base();
    p.timeline = [
      event("public", "audience", [{ kind: "guest", id: "g1" }]),
      event("private", "prive", [{ kind: "guest", id: "g2" }]),
    ];
    p.guests = [
      { id: "g1", name: "Visible", role: "invite", rsvp: "confirme", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } },
      { id: "g2", name: "Masqué", role: "invite", rsvp: "en_attente", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } },
    ];
    const model = computeVisibilityModel(p, "viewer");
    const g1 = model.nodes.find(node => node.key === "guest:g1");
    const g2 = model.nodes.find(node => node.key === "guest:g2");
    expect(g1?.visible).toBe(true);
    expect(g2?.visible).toBe(false);
    expect(g2?.maskedReason).toBe("non relié à un Moment public");
  });

  it("owner sees the whole world", () => {
    const p = base();
    p.timeline = [
      event("public", "audience", [{ kind: "payment", id: "p1" }]),
      event("private", "prive"),
    ];
    p.payments = [{ id: "p1", label: "Traiteur", amountCents: 100000, at: Date.now(), state: "du" }];
    const model = computeVisibilityModel(p, "owner");
    expect(model.nodes.every(node => node.visible)).toBe(true);
    expect(model.visibleCount).toBe(model.totalCount);
  });
});

import { describe, expect, it } from "vitest";
import { mergeProtectedProjectData, projectDataForRole } from "./projectDataPolicy";

const data = {
  budget: { value: 20000, confidence: "confirme" },
  payments: [{ id: "pay", amountCents: 1000 }],
  documents: [{ id: "doc" }],
  providers: [{ id: "provider", name: "Photo", amountCents: 5000, paidCents: 1000 }],
  tasks: [{ id: "task" }],
  publicProfile: { published: true },
  timeline: [
    { id: "public", visibility: "audience", kind: "moment" },
    { id: "private", visibility: "prive", kind: "moment" },
    { id: "invoice", visibility: "audience", kind: "facture", detail: "1 000 €" },
  ],
};

describe("project data policy", () => {
  it("redacts finance and private records before serialization", () => {
    const viewer = projectDataForRole(data, "viewer");
    expect(JSON.stringify(viewer)).not.toContain("20000");
    expect(JSON.stringify(viewer)).not.toContain("5000");
    expect(JSON.stringify(viewer)).not.toContain("private");
    expect(JSON.stringify(viewer)).not.toContain("invoice");
  });

  it("restores fields a collaborator never received when saving", () => {
    const visible = projectDataForRole(data, "planner");
    const merged = mergeProtectedProjectData(data, { ...visible, title: "modifié" }, "planner");
    expect(merged.payments).toEqual(data.payments);
    expect(merged.documents).toEqual(data.documents);
    expect(merged.budget).toEqual(data.budget);
    expect(rows(merged.timeline).map(event => event.id)).toContain("private");
    expect(rows(merged.timeline).map(event => event.id)).toContain("invoice");
    expect((rows(merged.providers)[0] as Record<string, unknown>).amountCents).toBe(5000);
    const injected = mergeProtectedProjectData(data, { ...visible, providers: [{ id: "new", amountCents: 999999 }] }, "family");
    expect(JSON.stringify(injected)).not.toContain("999999");
  });
});

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value as Record<string, unknown>[] : [];
}
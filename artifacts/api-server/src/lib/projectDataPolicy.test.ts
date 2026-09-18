import { describe, expect, it } from "vitest";
import { mergeProtectedProjectData, projectDataForRole } from "./projectDataPolicy";

const data = {
  budget: { value: 20000, confidence: "confirme" },
  payments: [{ id: "pay", amountCents: 1000 }],
  documents: [{ id: "doc" }],
  exportLog: [{ id: "x1", documentId: "doc", destination: "csv", exportedAt: 1, hash: "a", amountCents: 100, paymentIds: [] }],
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

  it("hides the export journal from collaborators and restores it on save", () => {
    expect(projectDataForRole(data, "planner").exportLog).toEqual([]);
    const merged = mergeProtectedProjectData(data, { ...projectDataForRole(data, "planner"), exportLog: [] }, "planner");
    expect(merged.exportLog).toEqual(data.exportLog);
  });

  it("lets the owner extend the export journal but never rewrite or shrink it", () => {
    const extended = [...data.exportLog, { id: "x2", documentId: "doc", destination: "csv", exportedAt: 2, hash: "b", amountCents: 100, paymentIds: [] }];
    expect(mergeProtectedProjectData(data, { ...data, exportLog: extended }, "owner").exportLog).toEqual(extended);
    expect(mergeProtectedProjectData(data, { ...data, exportLog: [] }, "owner").exportLog).toEqual(data.exportLog);
    const rewritten = [{ ...data.exportLog[0], amountCents: 1 }, extended[1]];
    expect(mergeProtectedProjectData(data, { ...data, exportLog: rewritten }, "owner").exportLog).toEqual(data.exportLog);
  });

  it("never lets anyone in the World write attestations through a save", () => {
    const withAttestation = { ...data, attestations: [{ id: "a1", eventId: "e", providerId: "p", status: "atteste", hash: "h", respondedAt: 1, amountCents: 1, time: 1 }] };
    expect(mergeProtectedProjectData(withAttestation, { ...withAttestation, attestations: [] }, "owner").attestations).toEqual(withAttestation.attestations);
    expect(mergeProtectedProjectData(data, { ...data, attestations: withAttestation.attestations }, "owner").attestations).toEqual([]);
    expect(mergeProtectedProjectData(withAttestation, { ...withAttestation, attestations: [] }, "planner").attestations).toEqual(withAttestation.attestations);
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
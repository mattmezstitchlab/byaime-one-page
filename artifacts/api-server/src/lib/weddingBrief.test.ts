import { describe, expect, it } from "vitest";
import { buildAuthorizedWeddingBrief } from "./weddingBrief";

const data = {
  city: { value: "Lille", confidence: "confirme" },
  venue: { value: "Domaine privé", confidence: "suggere" },
  timeline: [
    { id: "public", title: "Annonce", phase: "avant", time: 10, status: "execute", confidence: "confirme", provenance: "real", visibility: "audience" },
    { id: "team", title: "Réunion équipe", phase: "avant", time: 20, status: "prepare", confidence: "confirme", provenance: "real", visibility: "equipe" },
    { id: "private", title: "Surprise privée", phase: "avant", time: 30, status: "prepare", confidence: "confirme", provenance: "real", visibility: "prive" },
    { id: "money", title: "Facture 9 000 €", kind: "facture", phase: "avant", time: 40, status: "prepare", confidence: "confirme", provenance: "real", visibility: "audience" },
    { id: "demo", title: "Fausse scène", phase: "avant", time: 50, status: "prepare", confidence: "confirme", provenance: "demo", visibility: "audience" },
  ],
  tasks: [{ id: "task-private", title: "Secret organisation", status: "a_faire", priority: "haute" }],
  payments: [{ id: "payment", label: "Acompte", amountCents: 900000, at: 2, state: "du" }],
};

const brief = (role: "owner" | "planner" | "family" | "viewer", useWorldLocation = false) =>
  buildAuthorizedWeddingBrief({ projectId: "project", title: "Notre mariage", data, role, useWorldLocation, now: 15 });

describe("authorized wedding brief", () => {
  it("keeps private and financial facts away from non-owners", () => {
    const plannerText = JSON.stringify(brief("planner"));
    const viewerText = JSON.stringify(brief("viewer"));
    for (const value of [plannerText, viewerText]) {
      expect(value).not.toContain("Surprise privée");
      expect(value).not.toContain("9 000");
      expect(value).not.toContain("Acompte");
      expect(value).not.toContain("Secret organisation");
    }
    expect(plannerText).toContain("Réunion équipe");
    expect(viewerText).not.toContain("Réunion équipe");
  });

  it("excludes demo and unconfirmed facts from verified narration", () => {
    expect(JSON.stringify(brief("owner"))).not.toContain("Fausse scène");
  });

  it("reveals a confirmed World location only after owner consent", () => {
    expect(brief("owner").location.label).toBeUndefined();
    expect(brief("planner", true).location.label).toBeUndefined();
    const consented = brief("owner", true);
    expect(consented.location.label).toBe("Lille");
    expect(consented.nearbyCategories.every(item => item.evidenceStatus === "unverified")).toBe(true);
    expect(JSON.stringify(consented)).not.toContain("Domaine privé");
  });
});
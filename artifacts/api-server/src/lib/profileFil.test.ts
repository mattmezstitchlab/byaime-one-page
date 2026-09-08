import { describe, expect, it } from "vitest";
import { buildAuthorizedProfileFil } from "./profileFil";

const data = {
  timeline: [
    { id: "public", title: "Annonce", phase: "avant", time: 10, status: "execute", confidence: "confirme", provenance: "real", visibility: "audience" },
    { id: "team", title: "Réunion équipe", phase: "avant", time: 20, status: "prepare", confidence: "confirme", provenance: "real", visibility: "equipe" },
    { id: "private", title: "Surprise privée", phase: "avant", time: 30, status: "prepare", confidence: "confirme", provenance: "real", visibility: "prive" },
    { id: "money", title: "Facture secrète", kind: "facture", phase: "avant", time: 40, status: "prepare", confidence: "confirme", provenance: "real", visibility: "audience" },
  ],
  tasks: [
    { id: "todo", title: "Choisir les fleurs", status: "a_faire", priority: "haute", dueDate: 50 },
    { id: "done", title: "Étape terminée", status: "termine", priority: "normale" },
  ],
  payments: [{ id: "payment", label: "Acompte privé", amountCents: 50000, at: 2, state: "du" }],
};

const fil = (role: "owner" | "planner" | "family" | "viewer") =>
  buildAuthorizedProfileFil({ projectId: "project", title: "Notre mariage", data, role, now: 15 });

describe("authorized Profile Fil", () => {
  it("returns only active tasks and keeps them away from viewers", () => {
    expect(JSON.stringify(fil("owner"))).toContain("Choisir les fleurs");
    expect(JSON.stringify(fil("owner"))).not.toContain("Étape terminée");
    expect(JSON.stringify(fil("viewer"))).not.toContain("Choisir les fleurs");
  });

  it("keeps private and financial sources away from non-owners", () => {
    const collaborators = [JSON.stringify(fil("planner")), JSON.stringify(fil("family"))];
    const viewer = JSON.stringify(fil("viewer"));
    for (const value of [...collaborators, viewer]) {
      expect(value).not.toContain("Surprise privée");
      expect(value).not.toContain("Facture secrète");
      expect(value).not.toContain("Acompte privé");
    }
    for (const value of collaborators) expect(value).toContain("Réunion équipe");
    expect(viewer).not.toContain("Réunion équipe");
  });

  it("links sourced Moments back to the Timeline", () => {
    const momentCard = fil("owner").cards.find(card => card.source.collection === "timeline");
    expect(momentCard).toBeDefined();
    expect(momentCard?.action).toMatchObject({ kind: "open_timeline", targetId: momentCard?.source.id });
  });

  it("never invents inter-user inspiration cards", () => {
    expect(fil("owner").cards.every(card => card.source.collection !== "public_aggregate")).toBe(true);
    expect(fil("owner").cards.every(card => card.category !== "inspiration")).toBe(true);
  });

  it("shows an honest guide when no visible Moment exists", () => {
    const empty = buildAuthorizedProfileFil({
      projectId: "project",
      title: "Nouveau Monde",
      data: { timeline: [], tasks: [] },
      role: "owner",
      now: 15,
    });
    expect(empty.cards.some(card => card.id === "fil-guide-first-moment" && card.evidenceStatus === "verified")).toBe(true);
    expect(empty.cards.some(card => card.id === "fil-guide-first-task")).toBe(true);
  });
});
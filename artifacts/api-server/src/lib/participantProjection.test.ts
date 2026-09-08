import { describe, expect, it } from "vitest";
import { buildParticipantProjection, participantNameById } from "./participantProjection";

describe("buildParticipantProjection", () => {
  const now = new Date("2026-09-08T12:00:00.000Z");
  const project = {
    pivot: { value: now.getTime() },
    city: { value: "Paris", confidence: "confirmed" },
    venue: { value: "Le Domaine", confidence: "confirmed" },
    logistics: { parking: "Entrée nord", accessibility: "Accès sans marche", weatherFallback: "Orangerie", privateContact: "secret" },
    guests: [
      { id: "g1", name: "Camille", tableId: "t1", contact: "camille@example.test", privateNotes: "secret" },
      { id: "g2", name: "Autre personne", contact: "other@example.test" },
    ],
    tables: [{ id: "t1", name: "Les Étoiles", notes: "secret" }],
    budget: { total: 999_999 },
    timeline: [
      { id: "public-day", phase: "pendant", visibility: "audience", time: now.getTime(), title: "Cérémonie", detail: "Bienvenue" },
      { id: "personal-day", phase: "pendant", visibility: "team", time: now.getTime(), title: "Lecture", relations: [{ kind: "guest", id: "g1" }] },
      { id: "other-day", phase: "pendant", visibility: "team", time: now.getTime(), title: "Surprise privée", relations: [{ kind: "guest", id: "g2" }] },
      { id: "linked-private", phase: "pendant", visibility: "prive", time: now.getTime(), title: "Note strictement privée", relations: [{ kind: "guest", id: "g1" }] },
      { id: "linked-payment", phase: "pendant", visibility: "team", kind: "paiement", time: now.getTime(), title: "Solde du prestataire", relations: [{ kind: "guest", id: "g1" }] },
      { id: "after", phase: "apres", visibility: "audience", time: now.getTime(), title: "Le film" },
      { id: "private-after", phase: "apres", visibility: "prive", time: now.getTime(), title: "Privé" },
    ],
  };

  it("returns only the guest-scoped allow-listed projection", () => {
    const result = buildParticipantProjection(project, "g1", now);
    expect(result.guest).toEqual({ name: "Camille", tableName: "Les Étoiles" });
    expect(result.program.map((item) => item.id)).toEqual(["public-day", "personal-day"]);
    expect(result.afterContent.map((item) => item.id)).toEqual(["after"]);
    expect(result.practicalInfo).toEqual({
      city: "Paris",
      venue: "Le Domaine",
      parking: "Entrée nord",
      accessibility: "Accès sans marche",
      weatherFallback: "Orangerie",
    });
    expect(JSON.stringify(result)).not.toMatch(/budget|999999|privateNotes|privateContact|example\.test|Autre personne|Surprise privée|strictement privée|Solde du prestataire/);
  });

  it("derives the day phase without exposing the private World", () => {
    const result = buildParticipantProjection(project, "g1", now);
    expect(result.phase).toBe("pendant");
    expect(result.mediaPolicy.enabled).toBe(true);
    expect(result.mediaPolicy.maxSize).toBe(25 * 1024 * 1024);
    expect(result.mediaPolicy.accept).toContain("video/mp4");
  });

  it("resolves moderation provenance without exposing any other guest field", () => {
    expect(participantNameById(project, "g1")).toBe("Camille");
    expect(participantNameById(project, "missing")).toBeUndefined();
  });
});
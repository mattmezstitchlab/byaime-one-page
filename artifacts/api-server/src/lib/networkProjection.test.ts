import { describe, expect, it } from "vitest";
import { buildNetworkProjection } from "./networkProjection";

describe("network read projection", () => {
  it("projects several Worlds and keeps nested legacy ids non-canonical", () => {
    const projection = buildNetworkProjection(
      [
        {
          id: "world-a",
          title: "Monde A",
          role: "owner",
          data: {
            city: { value: "Paris" },
            venue: { value: "Le lieu" },
            timeline: [{ id: "same-id", title: "Cérémonie", location: "Paris" }],
            providers: [{ id: "same-id", name: "Camille", category: "photo" }],
          },
        },
        {
          id: "world-b",
          title: "Monde B",
          role: "viewer",
          data: { city: { value: "Lille" } },
        },
      ],
      "2026-01-01T00:00:00.000Z",
    );

    expect(projection.subjects.filter(({ ref }) => ref.kind === "world")).toHaveLength(2);
    const moment = projection.subjects.find(({ ref }) => ref.kind === "moment")!;
    expect(moment.ref.id).not.toBe("same-id");
    expect(moment.legacy?.legacyId).toBe("same-id");
    expect(moment.latitude).toBe(48.8566);
    expect(projection.relations[0].visibility).toBe("world");
  });

  it("returns server decisions and never projects contact or exact coordinates", () => {
    const [subject] = buildNetworkProjection([
      {
        id: "world",
        title: "Privé",
        role: "planner",
        data: { providers: [{ id: "p", name: "Photo", contact: "secret@example.test" }] },
      },
    ]).subjects.filter(({ ref }) => ref.kind === "card");

    expect(subject.capabilities["card.contact"]?.allowed).toBe(false);
    expect(subject).not.toHaveProperty("contact");
    expect(subject.locationLevel).not.toBe("exact_location");
  });

  it("applies the existing role redaction before projecting subjects and relations", () => {
    const projection = buildNetworkProjection([
      {
        id: "world",
        title: "Monde partagé",
        role: "viewer",
        data: {
          providers: [{ id: "provider", name: "Prestataire caché" }],
          timeline: [
            { id: "audience", title: "Moment visible", visibility: "audience", kind: "moment" },
            { id: "private", title: "Moment privé", visibility: "prive", kind: "moment" },
            { id: "invoice", title: "Facture secrète", visibility: "audience", kind: "facture" },
          ],
        },
      },
    ]);

    expect(projection.subjects.map(({ label }) => label)).toEqual([
      "Monde partagé",
      "Moment visible",
    ]);
    expect(projection.relations).toHaveLength(1);
    expect(JSON.stringify(projection)).not.toContain("Prestataire caché");
    expect(JSON.stringify(projection)).not.toContain("Moment privé");
    expect(JSON.stringify(projection)).not.toContain("Facture secrète");
  });
});
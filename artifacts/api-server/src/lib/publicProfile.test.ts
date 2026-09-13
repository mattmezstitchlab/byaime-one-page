import { describe, expect, it } from "vitest";
import { projectToPublicProfile } from "./publicProfile";

const event = (id: string, visibility: "prive" | "equipe" | "audience", time: number) => ({
  id,
  visibility,
  time,
  kind: "souvenir",
  title: id,
  detail: "Un souvenir",
  status: "execute",
  confidence: "confirme",
  phase: "avant",
  universe: "vie",
  relations: [{ kind: "guest", id: "private-person" }],
  notes: "information privée",
});

describe("public profile projection", () => {
  it("returns nothing until the owner publishes the profile", () => {
    expect(projectToPublicProfile({
      id: "project",
      title: "Camille",
      data: { publicProfile: { published: false }, timeline: [event("public", "audience", 2)] },
    })).toBeNull();
  });

  it("only exposes allow-listed fields from public moments", () => {
    const profile = projectToPublicProfile({
      id: "project",
      title: "Camille",
      data: {
        subtitle: "Une vie en mouvement",
        universe: "vie",
        city: { value: "Lille" },
        pivot: { value: 20 },
        publicProfile: { published: true },
        timeline: [
          event("private", "prive", 1),
          event("future", "audience", 30),
          event("past", "audience", 10),
        ],
        guests: [{ name: "Ne doit jamais sortir" }],
        documents: [{ name: "Privé.pdf" }],
      },
    });

    expect(profile?.timeline.map((item) => item.id)).toEqual(["past", "future"]);
    expect(profile?.timeline[0]).not.toHaveProperty("relations");
    expect(profile?.timeline[0]).not.toHaveProperty("notes");
    expect(profile).not.toHaveProperty("guests");
    expect(profile).not.toHaveProperty("documents");
  });

  it("never publishes financial events even when marked for the audience", () => {
    const profile = projectToPublicProfile({
      id: "project",
      title: "Camille",
      data: {
        publicProfile: { published: true },
        timeline: [
          event("memory", "audience", 1),
          { ...event("payment", "audience", 2), kind: "paiement", detail: "Acompte 2 000 €" },
          { ...event("invoice", "audience", 3), kind: "facture", detail: "Facture 5 000 €" },
          { ...event("quote", "audience", 4), kind: "devis", detail: "Devis 7 000 €" },
        ],
      },
    });

    expect(profile?.timeline.map(item => item.id)).toEqual(["memory"]);
    expect(JSON.stringify(profile)).not.toContain("2 000");
    expect(JSON.stringify(profile)).not.toContain("5 000");
    expect(JSON.stringify(profile)).not.toContain("7 000");
  });

  it("publishes the practical info guests need, never the private contact", () => {
    const profile = projectToPublicProfile({
      id: "project",
      title: "Camille & Jules",
      data: {
        publicProfile: { published: true },
        venue: { value: "Le Domaine" },
        logistics: {
          parking: "Entrée nord",
          accessibility: "Accès sans marche",
          weatherFallback: "Orangerie",
          privateContact: "06 12 34 56 78",
        },
        timeline: [event("ceremony", "audience", 1)],
      },
    });

    expect(profile?.practical).toEqual({
      venue: "Le Domaine",
      parking: "Entrée nord",
      accessibility: "Accès sans marche",
      weatherFallback: "Orangerie",
    });
    expect(JSON.stringify(profile)).not.toContain("06 12 34 56 78");
  });

  it("omits the practical block when the couple has nothing to publish yet", () => {
    const profile = projectToPublicProfile({
      id: "project",
      title: "Camille & Jules",
      data: { publicProfile: { published: true }, logistics: {}, timeline: [] },
    });

    expect(profile).not.toHaveProperty("practical");
  });
});
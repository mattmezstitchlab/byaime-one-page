import { describe, expect, it } from "vitest";
import {
  chapterAmbientAsset,
  DEFAULT_HERO_VISUAL,
  momentAmbientAsset,
  momentVisual,
  momentVisualZone,
  resolveHeroVisual,
  visualSourceUrl,
  WORLD_VISUAL_CHOICES,
} from "./world-visuals";
import { AIME_VISUALS } from "./assets";
import type { TimelineEvent, WorldProject } from "./types";

/*
 * La Timeline verticale ne doit plus jamais s'ouvrir sur des cartes blanches :
 * chaque zone reçoit un visuel du manifeste, et celui du couple l'emporte.
 */

const event = (overrides: Partial<TimelineEvent>): TimelineEvent => ({
  id: "m1",
  time: Date.UTC(2027, 7, 14, 16),
  kind: "evenement",
  title: "Moment",
  status: "prepare",
  confidence: "confirme",
  phase: "pendant",
  universe: "Mariage",
  ...overrides,
});

const project = {
  pivot: { value: Date.UTC(2027, 7, 14, 12), confidence: "confirme" },
  providers: [
    { id: "p4", category: "musique", role: "DJ", status: "reserve" },
    { id: "p2", category: "traiteur", role: "Traiteur", status: "devis" },
  ],
} as unknown as WorldProject;

describe("zones visuelles de la Timeline", () => {
  it("donne à chaque zone logique son visuel du manifeste", () => {
    expect(momentVisualZone(event({ title: "L'engagement", detail: "Échange des vœux" }))).toBe("ceremony");
    expect(momentVisualZone(event({ title: "Le banquet", detail: "Entrée en salle et saveurs" }))).toBe("table");
    expect(momentVisualZone(event({ title: "L'accueil", detail: "Arrivée des premiers invités" }))).toBe("guests");
    expect(momentVisualZone(event({ title: "Le temps pour soi", detail: "Coiffure et maquillage" }))).toBe("prep");
    expect(momentVisualZone(event({ title: "L'ouverture du bal" }))).toBe("music");
    expect(momentVisualZone(event({ title: "Les fleurs", detail: "Design floral" }))).toBe("flowers");
    expect(momentVisualZone(event({ title: "La première tenue", detail: "Essayages" }))).toBe("attire");
    expect(momentVisualZone(event({ title: "Départ", detail: "Fermeture du domaine et navette" }))).toBe("transport");
    expect(momentVisualZone(event({ title: "Le film", detail: "Réception de la vidéo" }))).toBe("film");
    expect(momentVisualZone(event({ title: "La découverte du lieu", detail: "Visite du château" }))).toBe("venue");
  });

  it("suit le prestataire relié au Moment", () => {
    expect(momentVisualZone(event({ title: "Réservation", relations: [{ kind: "provider", id: "p4" }] }), project)).toBe("music");
    expect(momentVisualZone(event({ title: "Réservation", relations: [{ kind: "provider", id: "p2" }] }), project)).toBe("table");
  });

  it("retombe sur le chapitre puis sur la période quand le texte ne dit rien", () => {
    expect(momentVisualZone(event({ title: "Point d'étape", phase: "pendant" }))).not.toBe("");
    expect(momentVisualZone(event({ title: "Point d'étape", phase: "avant" }))).toBe("portrait");
    expect(momentVisualZone(event({ title: "Point d'étape", phase: "apres" }))).toBe("film");
  });

  it("rend toujours un chemin du manifeste, jamais rien", () => {
    const asset = momentAmbientAsset(event({ title: "L'engagement" }));
    expect(asset.startsWith("images/")).toBe(true);
    expect(Object.values(AIME_VISUALS.universes)).toContain(asset);
  });

  it("laisse le visuel importé par le couple l'emporter", () => {
    const custom = { kind: "image" as const, url: "data:image/png;base64,AAAA", overlay: 40 };
    expect(momentVisual(event({ title: "L'engagement", visual: custom }))).toEqual(custom);
    expect(momentVisual(event({ title: "L'engagement" })).url).toMatch(/^images\//);
  });
});

describe("visuels des séparateurs de chapitre", () => {
  it("illustre le chapitre qui vient", () => {
    expect(chapterAmbientAsset("La cérémonie")).toBe(AIME_VISUALS.universes.venue);
    expect(chapterAmbientAsset("Le repas")).toBe(AIME_VISUALS.universes.food);
    expect(chapterAmbientAsset("L'ouverture du bal")).toBe(AIME_VISUALS.universes.music);
    expect(chapterAmbientAsset("Inconnu", "pendant")).toBe(AIME_VISUALS.universes.hotel);
  });

  it("expose tous les visuels du Monde à l'édition", () => {
    expect(WORLD_VISUAL_CHOICES.length).toBeGreaterThan(8);
    for (const choice of WORLD_VISUAL_CHOICES) expect(choice.asset.startsWith("images/")).toBe(true);
  });
});

describe("hero du Monde", () => {
  it("s'ouvre toujours sur le grand visuel, même sans visuel posé", () => {
    expect(resolveHeroVisual(null)).toEqual(DEFAULT_HERO_VISUAL);
    expect(resolveHeroVisual({ heroVisual: null })).toEqual(DEFAULT_HERO_VISUAL);
  });

  it("garde le visuel du couple", () => {
    const heroVisual = { kind: "video" as const, url: "https://exemple.fr/jour.mp4", overlay: 20 };
    expect(resolveHeroVisual({ heroVisual })).toEqual(heroVisual);
  });

  it("résout les chemins du manifeste et laisse les URL importées telles quelles", () => {
    expect(visualSourceUrl(DEFAULT_HERO_VISUAL)).toContain("/images/wedding/wedding-reception.jpg?v=");
    expect(visualSourceUrl({ kind: "image", url: "data:image/png;base64,AAAA" })).toBe("data:image/png;base64,AAAA");
    expect(visualSourceUrl({ kind: "image", url: "https://exemple.fr/photo.jpg" })).toBe("https://exemple.fr/photo.jpg");
  });
});

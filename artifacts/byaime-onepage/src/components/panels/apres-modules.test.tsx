import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WeddingModulesPanel } from "./WeddingModulesPanel";

// Rendu statique : les chargements serveur (photos, vidéos, dédicaces) ne partent pas ;
// on vérifie la structure des sections Après et les données locales (souvenirs, invités).
vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    project: {
      id: "project-1",
      title: "Test World",
      pivot: { value: 1716110000000 },
      guests: [{ id: "g1", name: "Camille", contact: "camille@example.fr" }],
      messageTemplates: [],
      tasks: [],
      tables: [],
      providers: [],
      payments: [],
      documents: [],
      timeline: [],
      logistics: { accommodations: [], shuttles: [], parking: "", accessibility: "", weatherFallback: "", emergencyContacts: [], packing: [] },
      music: [],
      team: [],
      memories: [
        { id: "mm1", kind: "message", title: "Merci pour cette journée magique", owner: "Camille", status: "termine" },
        { id: "mm2", kind: "shot", title: "Photo de groupe", status: "a_faire" },
      ],
      messageLogs: [],
      media: [],
      messages: [],
      missing: [],
    },
    currentRole: "owner",
    syncStatus: "saved",
    syncError: null,
    participantLinks: [],
    refreshParticipantLinks: vi.fn(),
    updateProject: vi.fn(),
    updateEntity: vi.fn(),
    addEntity: vi.fn(),
    removeEntity: vi.fn(),
  }),
}));

describe("Sections Après", () => {
  it("montre les mots doux reçus avant la table des remerciements", () => {
    const markup = renderToStaticMarkup(<WeddingModulesPanel module="thanks" />);
    expect(markup).toContain("Les mots doux reçus");
    expect(markup).toContain("Merci pour cette journée magique");
    expect(markup).toContain("Remercier chaque personne réellement");
    expect(markup).toContain("Camille");
  });

  it("ouvre la galerie des invités sur la liste des souvenirs à préparer", () => {
    const markup = renderToStaticMarkup(<WeddingModulesPanel module="memories" />);
    expect(markup).toContain("Galerie des invités");
    expect(markup).toContain("Aucune photo validée pour l’instant");
    expect(markup).toContain("Modérer les contributions");
    expect(markup).toContain("Souvenirs à préparer");
    expect(markup).toContain("Photo de groupe");
  });

  it("prépare le lecteur du film et le pont vers Documents", () => {
    const markup = renderToStaticMarkup(<WeddingModulesPanel module="film" />);
    expect(markup).toContain("Film du Jour J");
    expect(markup).toContain("Aucun film réel n’a encore été livré ou validé");
    expect(markup).toContain("Ouvrir Documents");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WeddingModulesPanel } from "./WeddingModulesPanel";

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
      ceremony: { notes: "", menu: "", drinks: "", cake: "", firstDance: "", structure: [], readings: [], vows: [] },
      music: [],
      team: [],
      memories: [
        { id: "mm1", kind: "message", title: "Merci pour cette journée magique", owner: "Camille", status: "termine" },
        { id: "mm2", kind: "shot", title: "Photo de groupe", status: "a_faire" },
      ],
      memoryChecklist: [{ id: "mc1", label: "Photo de groupe", done: false }],
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

describe("Sections Après fusionnées P2", () => {
  it("thanks fusionné dans Galerie", () => {
    const markup = renderToStaticMarkup(<WeddingModulesPanel module="thanks" />);
    expect(markup).toContain("fusionné dans Galerie");
    expect(markup).toContain("Galerie unifiée");
  });

  it("memories fusionné dans Galerie", () => {
    const markup = renderToStaticMarkup(<WeddingModulesPanel module="memories" />);
    expect(markup).toContain("Souvenirs fusionnés dans Galerie");
    expect(markup).toContain("Galerie unifiée");
  });

  it("film fusionné dans Galerie", () => {
    const markup = renderToStaticMarkup(<WeddingModulesPanel module="film" />);
    expect(markup).toContain("Film fusionné dans Galerie");
  });

  it("documents est la galerie unifiée", () => {
    const markup = renderToStaticMarkup(<WeddingModulesPanel module="documents" />);
    expect(markup).toContain("Galerie unifiée");
    expect(markup).toContain("Documents");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WeddingModulesPanel } from "./WeddingModulesPanel";

// Le module Messages est l'unique endroit de composition d'e-mail (modèles + message libre).
vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    project: {
      id: "project-1",
      title: "Test World",
      pivot: { value: 1716110000000 },
      guests: [],
      messageTemplates: [
        { id: "tpl1", title: "Infos pratiques", type: "pratique", body: "Le lieu ouvre à 14h." },
      ],
      tasks: [],
      tables: [],
      providers: [],
      payments: [],
      documents: [],
      timeline: [],
      logistics: { accommodations: [], shuttles: [], parking: "", accessibility: "", weatherFallback: "", emergencyContacts: [], packing: [] },
      music: [],
      team: [],
      memories: [],
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

describe("Module Messages", () => {
  it("regroupe modèles, composition libre et journal des envois dans un seul écran", () => {
    const markup = renderToStaticMarkup(<WeddingModulesPanel module="messages" />);
    // Les modèles restent éditables et envoyables ici.
    expect(markup).toContain("Infos pratiques");
    expect(markup).toContain("Nouveau modèle");
    // L'entrée unique du message libre (qui remplace le doublon « Envoyer un e-mail » des Réglages).
    expect(markup).toContain("Message libre");
    expect(markup).toContain("Journal des envois et rappels");
    expect(markup).toContain("Aucun message envoyé ou programmé");
  });
});

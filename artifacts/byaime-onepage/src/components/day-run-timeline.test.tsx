import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/store/project-store", () => {
  const hour = 3_600_000;
  const minute = 60_000;
  const now = Date.now();
  const project = {
    id: "p1",
    providers: [{ id: "p4", category: "musique", role: "DJ", name: "DJ Nova", status: "reserve" }],
    timeline: [
      { id: "m1", time: now - 2 * hour, durationMinutes: 60, kind: "evenement", title: "Cérémonie", status: "execute", phase: "pendant", universe: "mariage", relations: [] },
      { id: "m2", time: now - 10 * minute, durationMinutes: 60, kind: "evenement", title: "Vin d'honneur", location: "Jardin", status: "prepare", phase: "pendant", universe: "mariage", relations: [{ kind: "provider", id: "p4" }] },
      { id: "m3", time: now + hour, durationMinutes: 120, kind: "evenement", title: "Dîner", status: "prepare", phase: "pendant", universe: "mariage", relations: [] },
    ],
  };
  return {
    useProject: () => ({
      project,
      updateEntity: vi.fn(),
      updateProject: vi.fn(),
      removeEntity: vi.fn(),
      canEdit: true,
    }),
  };
});

import { DayRunTimeline } from "./DayRunTimeline";
import { useProject } from "@/store/project-store";

describe("DayRunTimeline (régie du Jour J)", () => {
  it("montre le compte à rebours du direct, les horaires agrandis et les prestataires", () => {
    const { project } = useProject();
    const markup = renderToStaticMarkup(<DayRunTimeline events={project!.timeline} onOpen={vi.fn()} onMomentAction={vi.fn()} capabilities={{ seeFinances: true, manageDocuments: true }} />);

    // Bandeau du direct : le Moment en cours, son compte à rebours, les retards.
    expect(markup).toContain('data-testid="day-countdown"');
    expect(markup).toContain("Vin d&#x27;honneur");
    expect(markup).toContain("Le Jour J");
    expect(markup).toContain("Retard +5 min");
    expect(markup).toContain("Retard +15 min");
    expect(markup).toContain("Terminer ce Moment");
    expect(markup).toContain("Suivre le direct");

    // Les trois Moments, chacun avec son état.
    expect(markup.match(/data-testid="day-moment"/g)).toHaveLength(3);
    expect(markup).toContain("En cours");
    expect(markup).toContain("Suivant");
    expect(markup).toContain("Terminé");

    // La vignette ronde du prestataire relié au Vin d'honneur (catégorie traduite).
    expect(markup).toContain("DJ Nova");
    expect(markup).toContain("Musique");
  });

  it("annonce le début du Jour J quand rien n'a encore commencé", () => {
    const { project } = useProject();
    const upcoming = project!.timeline.slice(2);
    const markup = renderToStaticMarkup(<DayRunTimeline events={upcoming} onOpen={vi.fn()} onMomentAction={vi.fn()} capabilities={{ seeFinances: true, manageDocuments: true }} />);

    expect(markup).toContain("Dîner");
    expect(markup).toContain("Retard +15 min");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    project: {
      id: "p1",
      memories: [
        { id: "mm1", kind: "message", title: "Merci pour cette journée magique", owner: "Camille", status: "termine" },
      ],
    },
    currentRole: "owner",
  }),
}));

import { ApresOverview } from "./ApresOverview";

describe("ApresOverview (tête du mode Après)", () => {
  it("montre les trois gestes avec leurs comptes et leurs accès directs", () => {
    const markup = renderToStaticMarkup(<ApresOverview />);

    expect(markup).toContain('data-testid="apres-overview"');
    expect(markup).toContain("Galerie des invités");
    expect(markup).toContain("Mots doux");
    expect(markup).toContain("Le film");
    // Le mot noté localement est visible sans attendre le serveur.
    expect(markup).toContain("Merci pour cette journée magique");
    expect(markup).toContain("1 mot doux");
    // Les vides sont honnêtes et disent d'où viendra le contenu.
    expect(markup).toContain("Aucune photo validée");
    expect(markup).toContain("Aucune vidéo livrée");
    expect(markup).toContain("Ouvrir la galerie");
    expect(markup).toContain("Lire et remercier");
    expect(markup).toContain("Regarder");
  });
});

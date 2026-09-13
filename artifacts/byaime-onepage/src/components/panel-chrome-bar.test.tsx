import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PanelChromeBar } from "./CenteredBlock";

/*
 * Le bandeau d'un panneau ne porte plus que la navigation de la page d'origine :
 * le fil d'ariane a été retiré de tous les panneaux (Monde, Profil, espace privé).
 */
describe("PanelChromeBar (bandeau d'un panneau)", () => {
  it("affiche la navigation de la page, sans fil d'ariane", () => {
    const markup = renderToStaticMarkup(
      <PanelChromeBar
        navigation={[
          { id: "guests", label: "Personnes", active: true, onClick: vi.fn() },
          { id: "budget", label: "Finances", onClick: vi.fn() },
        ]}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain('data-testid="panel-chrome-bar"');
    expect(markup).toContain('aria-label="Navigation de la page"');
    expect(markup).toContain("Personnes");
    expect(markup).toContain("Finances");
    expect(markup).toContain('aria-current="page"');

    // Plus aucune trace de fil d'ariane : ni libellé, ni seconde navigation.
    expect(markup).not.toContain("Fil d");
    expect(markup).not.toContain("Breadcrumb");
    expect(markup).not.toContain("AIME");
    expect(markup.match(/<nav/g)?.length).toBe(1);
  });

  it("disparaît entièrement quand la page n'a pas de navigation à proposer", () => {
    const markup = renderToStaticMarkup(<PanelChromeBar navigation={[]} onClose={vi.fn()} />);
    expect(markup).toBe("");
  });
});

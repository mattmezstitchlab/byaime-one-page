import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { Router } from "wouter";
import { LandingJourney } from "@/components/LandingJourney";

const render = (node: ReactNode) =>
  renderToStaticMarkup(
    <I18nProvider initialLocale="fr">
      <Router hook={() => ["/", () => undefined] as const}>{node}</Router>
    </I18nProvider>,
  );

/*
 * La visite verticale du produit : la landing se déroule comme la Timeline.
 * Garde-fous : cinq étapes numérotées sur un filet, des captures fidèles dans
 * des appareils (iPhone/iPad) — jamais de photo — et le principe en clôture.
 */
describe("LandingJourney — la visite verticale du produit", () => {
  it("déroule les cinq étapes du produit, chacune avec sa copie et son appareil", () => {
    const markup = render(<LandingJourney />);

    for (const stop of ["concept", "timeline", "agent", "phases", "card"]) {
      expect(markup).toContain(`data-testid="landing-journey-stop-${stop}"`);
    }
    // Le concept, la Timeline, l'agent et la Carte dans un iPhone ; les trois
    // temps sur un iPad.
    expect(markup.match(/data-testid="journey-device-phone"/g)).toHaveLength(4);
    expect(markup.match(/data-testid="journey-device-pad"/g)).toHaveLength(1);
  });

  it("suit un filet vertical, avec des nœuds numérotés de 01 à 05", () => {
    const markup = render(<LandingJourney />);

    expect(markup).toContain('data-testid="landing-journey-spine"');
    for (const n of ["01", "02", "03", "04", "05"]) {
      expect(markup).toContain(n);
    }
  });

  it("illustre les trois temps avec les vraies phases du produit", () => {
    const markup = render(<LandingJourney />);

    // Les libellés viennent de getWorldPhases, pas d'une maquette inventée.
    expect(markup).toContain("Avant");
    expect(markup).toContain("Le Jour J");
    expect(markup).toContain("Après");
  });

  it("met en avant une innovation par étape et termine sur le principe", () => {
    const markup = render(<LandingJourney />);

    expect(markup.match(/Innovation ·/g)?.length ?? 0).toBe(5);
    expect(markup).toContain("Vous gardez la main. Toujours.");
    expect(markup).toContain("AIME propose, il n’impose jamais");
  });

  it("reste une reconstitution fidèle : pas de photo, pas de titre de page en plus", () => {
    const markup = render(<LandingJourney />);

    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("<h1");
    // L'orbe AIME, signature de l'agent, est bien présent.
    expect(markup.match(/conic-gradient/g)?.length ?? 0).toBeGreaterThan(0);
  });

  it("le dit aussi en anglais", () => {
    const markup = renderToStaticMarkup(
      <I18nProvider initialLocale="en">
        <Router hook={() => ["/", () => undefined] as const}>
          <LandingJourney />
        </Router>
      </I18nProvider>,
    );

    expect(markup).toContain("Meet AIME, from top to bottom.");
    expect(markup).toContain("A World, not a form.");
    expect(markup).toContain("You stay in control. Always.");
  });
});

// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { Router } from "wouter";
import { LandingComposer } from "@/components/LandingComposer";

const render = (node: ReactNode) =>
  renderToStaticMarkup(
    <I18nProvider initialLocale="fr">
      <Router hook={() => ["/", () => undefined] as const}>{node}</Router>
    </I18nProvider>,
  );

describe("Parcours d'entrée : Timeline d'abord, Carte à part", () => {
  it("ouvre sur une seule promesse : la Timeline verticale", () => {
    const markup = render(<LandingComposer />);

    expect(markup).toContain('data-testid="timeline-entry"');
    expect(markup).toContain('data-testid="landing-open-timeline"');
    expect(markup).toContain('data-testid="landing-open-card"');
    expect(markup).toContain("Un seul fil. Tout votre mariage.");
    expect(markup).not.toContain('data-testid="landing-intention-form"');
    expect(markup).not.toContain("Créer un mariage");
    expect(markup).not.toContain("Wedding planner");
  });

  it("visiteur : crée son compte en revenant vers la Timeline ou la Carte demandée", () => {
    const markup = render(<LandingComposer />);

    expect(markup).toContain('href="/creation?returnTo=%2Fuser-portal"');
    expect(markup).toContain('href="/creation?returnTo=%2Fma-carte"');
  });

  it("membre : ouvre directement chaque espace sans repasser par l'onboarding", () => {
    const markup = render(<LandingComposer signedIn />);

    expect(markup).toContain('href="/user-portal"');
    expect(markup).toContain('href="/ma-carte"');
    expect(markup).not.toContain("Créer mon espace et ouvrir ma Timeline");
  });
});

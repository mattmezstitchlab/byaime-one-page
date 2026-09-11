import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import type { ReactNode } from "react";

vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    createProjectFromIntention: vi.fn(() => true),
    setIntentionText: vi.fn(),
  }),
}));

import { LandingPage } from "./Landing";

const render = (node: ReactNode) =>
  renderToStaticMarkup(<Router hook={() => ["/", () => {}] as const}>{node}</Router>);

describe("Landing (accueil)", () => {
  it("ouvre le hero sur le champ de saisie, avant toute autre section", () => {
    const markup = render(<LandingPage />);

    expect(markup).toContain('data-testid="landing"');
    expect(markup).toContain('data-testid="landing-composer"');
    expect(markup.indexOf('data-testid="landing-composer"')).toBeLessThan(markup.indexOf("Aperçu produit"));
  });

  it("pose un hero immersif plein écran à fond fixe, avec le visuel des astronautes et un appel à défiler", () => {
    const markup = render(<LandingPage />);

    // Le fond est fixe au viewport et animé d'une lente dérive cinématographique.
    expect(markup).toContain('fixed inset-0 z-0');
    expect(markup).toContain('landing-hero-astronauts.jpg');
    expect(markup).toContain('aime-hero-drift');
    // Le hero occupe tout l'écran et le contenu suivant glisse par-dessus (z-10 + fonds opaques).
    expect(markup).toContain('min-h-[100dvh]');
    expect(markup).toContain('id="landing-guides"');
    expect(markup).toContain('Faire défiler vers la suite');
    const guidesStart = markup.indexOf('id="landing-guides"');
    expect(markup.slice(guidesStart, guidesStart + 240)).toContain('relative z-10');
  });

  it("garde une seule hiérarchie de titre et le nom AIME cliquable vers l'accueil", () => {
    const markup = render(<LandingPage />);

    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="AIME — retour à l’accueil"');
    // Le logo mène à l'accueil lui-même, jamais à une page interne.
    expect(markup).toContain('href="/"');
  });

  it("propose l'accès à l'espace aux personnes déjà connectées, sans redirection automatique", () => {
    const guest = render(<LandingPage />);
    const member = render(<LandingPage signedIn />);

    expect(guest).toContain('data-testid="landing-sign-in"');
    expect(guest).toContain('data-testid="landing-sign-up"');
    expect(guest).not.toContain('data-testid="landing-open-space"');

    expect(member).toContain('data-testid="landing-open-space"');
    expect(member).not.toContain('data-testid="landing-sign-up"');
    expect(member).not.toContain('data-testid="landing-sign-in"');
  });

  it("place les guides sous le hero, en rangées défilantes et sur un grand visuel", () => {
    const markup = render(<LandingPage />);

    expect(markup).toContain('data-testid="landing-guides"');
    expect(markup).toContain('data-testid="landing-guides-explorer"');
    expect(markup).toContain("Comprendre avant de cliquer.");
    // Sous le hero, avant la section produit.
    expect(markup.indexOf('data-testid="landing-guides"')).toBeGreaterThan(markup.indexOf('data-testid="landing-composer"'));
    expect(markup.indexOf('data-testid="landing-guides"')).toBeLessThan(markup.indexOf("Aperçu produit"));
    // Une rangée par catégorie, et l'animation centrée — pas de grille de cartes ni de nuage de puces.
    expect(markup).toContain('data-testid="landing-guides-menu"');
    expect(markup).toContain("overflow-x-auto");
    expect(markup).toContain('data-testid="landing-guides-player"');
    expect(markup).toContain('data-testid="landing-guides-group-panneaux"');
    expect(markup).not.toContain('data-testid="landing-guides-group-monde"');
    expect(markup.match(/<h1/g)).toHaveLength(1);
    // Le visuel de fond est bien servi depuis le manifeste, pas un chemin codé en dur.
    expect(markup).toContain("images/wedding/wedding-reception.jpg");
    // L'accueil ne garde qu'une sélection de guides ; le catalogue complet est sur /guides.
    expect(markup.match(/data-testid="demo-select-/g)).toHaveLength(6);
    // Les filtres noirs superposés aux visuels ont disparu de l'accueil.
    expect(markup).not.toContain("from-black/85");
    expect(markup).not.toContain("via-black/55");
  });

  it("ne parle plus jamais de Laboratoire", () => {
    const markup = render(<LandingPage />);
    expect(markup).not.toContain("Laboratoire");
  });

  it("termine par un pied de page qui mène aux guides et aux mentions", () => {
    const markup = render(<LandingPage />);
    expect(markup).toContain("aria-label=\"Pages du site\"");
    expect(markup).toContain('href="/guides"');
    expect(markup).toContain('href="/conditions"');
    expect(markup).toContain('href="/confidentialite"');
  });
});

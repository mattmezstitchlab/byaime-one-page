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
  it("ouvre le hero sur les deux choix de l'onboarding, avant toute autre section", () => {
    const markup = render(<LandingPage />);

    expect(markup).toContain('data-testid="landing"');
    expect(markup).toContain('data-testid="landing-composer"');
    expect(markup).toContain('data-testid="landing-persona"');
    expect(markup).toContain("Wedding planner");
    expect(markup).toContain("Sans carte bancaire");
    expect(markup.indexOf('data-testid="landing-composer"')).toBeLessThan(markup.indexOf('data-testid="landing-guides"'));
  });

  it("pose un hero immersif plein écran sur un grand visuel photo, au-dessus du fond signature", () => {
    const markup = render(<LandingPage />);

    // Le shader reste le plan fixe de base ; le hero ajoute un grand visuel photo.
    expect(markup).toContain('data-testid="landing-shader"');
    expect(markup).toContain("fixed inset-0 z-0");
    expect(markup).toContain('data-testid="landing-hero-photo"');
    expect(markup).toContain("landing-hero-astronauts.jpg");
    expect(markup).toContain("<img");
    // Le hero occupe tout l'écran.
    expect(markup).toContain("min-h-[100dvh]");
    expect(markup).toContain('id="landing-guides"');
  });

  it("met en scène le produit puis les trois temps, avec les visuels du mariage", () => {
    const markup = render(<LandingPage />);

    // La vitrine du Monde Mariage, entre le hero et les guides.
    expect(markup).toContain('data-testid="landing-showcase"');
    expect(markup).toContain('data-testid="landing-product"');
    expect(markup.indexOf('data-testid="landing-showcase"')).toBeLessThan(markup.indexOf('data-testid="landing-guides"'));

    // Les trois temps, chacun sur un visuel immersif.
    expect(markup).toContain('data-testid="landing-avant"');
    expect(markup).toContain('data-testid="landing-jourj"');
    expect(markup).toContain('data-testid="landing-apres"');
    expect(markup).toContain("images/wedding/wedding-guests.jpg");
    expect(markup).toContain("images/wedding/wedding-reception.jpg");
    expect(markup).toContain("images/wedding/wedding-portrait.jpg");

    // Valeurs, témoignage et appel final complètent le parcours.
    expect(markup).toContain('data-testid="landing-values"');
    expect(markup).toContain('data-testid="landing-quote"');
    expect(markup).toContain('data-testid="landing-cta"');
    expect(markup).toContain("Créer mon espace gratuitement");
  });

  it("demande dès le hero si le visiteur est un couple ou un wedding planner, et expose la langue", () => {
    const markup = render(<LandingPage />);

    expect(markup).toContain('data-testid="landing-persona-couple"');
    expect(markup).toContain('data-testid="landing-persona-pro"');
    expect(markup).toContain("Couple");
    expect(markup).toContain("Wedding planner");
    expect(markup).toContain('data-testid="landing-locale"');
    expect(markup).toContain('data-testid="landing-locale-fr"');
    expect(markup).toContain('data-testid="landing-locale-en"');
  });

  it("garde une seule hiérarchie de titre et le nom AIME cliquable vers l'accueil", () => {
    const markup = render(<LandingPage />);

    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup).toContain("un seul espace privé");
    expect(markup).toContain('aria-label="AIME — retour à l’accueil"');
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

  it("propose les guides sous le hero par des liens directs, sans animation factice", () => {
    const markup = render(<LandingPage />);

    expect(markup).toContain('data-testid="landing-guides"');
    expect(markup).toContain('data-testid="landing-guides-links"');
    expect(markup).toContain("Comprendre avant de cliquer.");
    expect(markup).toContain("Tous les guides");
    // Les liens mènent au catalogue complet.
    expect(markup).toContain('href="/guides"');
    expect(markup.indexOf('data-testid="landing-guides"')).toBeGreaterThan(markup.indexOf('data-testid="landing-composer"'));
    expect(markup.match(/<h1/g)).toHaveLength(1);
    // Plus d'animation de démonstration sur l'accueil.
    expect(markup).not.toContain('data-testid="landing-guides-explorer"');
    expect(markup).not.toContain('data-testid="landing-guides-player"');
    expect(markup).not.toContain('data-testid="guide-chapters-open"');
    expect(markup).not.toContain('data-testid="guide-prev"');
    expect(markup).not.toContain('data-testid="guide-next"');
  });

  it("ne parle plus jamais de Laboratoire", () => {
    const markup = render(<LandingPage />);
    expect(markup).not.toContain("Laboratoire");
  });

  it("termine par un pied de page qui mène aux guides et aux mentions", () => {
    const markup = render(<LandingPage />);
    expect(markup).toContain('aria-label="Pages du site"');
    expect(markup).toContain('href="/guides"');
    expect(markup).toContain('href="/conditions"');
    expect(markup).toContain('href="/confidentialite"');
    // Pied de page façon Apple : tagline, colonnes et mention légale.
    expect(markup).toContain("L’art de créer des liens. Tout votre mariage");
    expect(markup).toContain("Produit");
    expect(markup).toContain("Légal");
    expect(markup).toContain("Tous droits réservés");
  });
});

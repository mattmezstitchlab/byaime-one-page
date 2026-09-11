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

  it("pose un hero immersif plein écran sur le shader fixe, sans visuel photo", () => {
    const markup = render(<LandingPage />);

    // Le shader est fixe au viewport ; aucun visuel photo sur la landing.
    expect(markup).toContain('data-testid="landing-shader"');
    expect(markup).toContain('fixed inset-0 z-0');
    expect(markup).not.toContain('landing-hero-astronauts.jpg');
    expect(markup).not.toContain('<img');
    // Le hero occupe tout l'écran et le contenu suivant glisse par-dessus (z-10 + fonds opaques).
    expect(markup).toContain('min-h-[100dvh]');
    expect(markup).toContain('id="landing-guides"');
    const guidesStart = markup.indexOf('id="landing-guides"');
    expect(markup.slice(guidesStart, guidesStart + 240)).toContain('relative z-10');
  });

  it("demande dès le hero si le visiteur est un couple ou un wedding planner, et expose la langue", () => {
    const markup = render(<LandingPage />);

    // Le tout premier écran du hero, avant les cinq questions.
    expect(markup).toContain('data-testid="landing-persona-couple"');
    expect(markup).toContain('data-testid="landing-persona-pro"');
    expect(markup).toContain("Couple");
    expect(markup).toContain("Wedding planner");
    // Bascule de langue FR/EN dans l'en-tête, en français par défaut.
    expect(markup).toContain('data-testid="landing-locale"');
    expect(markup).toContain('data-testid="landing-locale-fr"');
    expect(markup).toContain('data-testid="landing-locale-en"');
  });

  it("garde une seule hiérarchie de titre et le nom AIME cliquable vers l'accueil", () => {
    const markup = render(<LandingPage />);

    expect(markup.match(/<h1/g)).toHaveLength(1);
    // Le titre est la promesse, pas la marque (le logo suffit dans l'en-tête).
    expect(markup).toContain("un seul espace privé");
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

  it("place les guides animés sous le hero, pilotés par une capsule sobre sans bande de boutons", () => {
    const markup = render(<LandingPage />);

    expect(markup).toContain('data-testid="landing-guides"');
    expect(markup).toContain('data-testid="landing-guides-explorer"');
    expect(markup).toContain("Comprendre avant de cliquer.");
    // Juste après le hero.
    expect(markup.indexOf('data-testid="landing-guides"')).toBeGreaterThan(markup.indexOf('data-testid="landing-composer"'));
    // La capsule flotte sur l'animation : précédent, chapitres au centre, suivant.
    expect(markup).toContain('data-testid="landing-guides-player"');
    expect(markup).toContain('data-testid="guide-chapters-open"');
    expect(markup).toContain('data-testid="guide-prev"');
    expect(markup).toContain('data-testid="guide-next"');
    expect(markup).toContain("1/6");
    expect(markup.match(/<h1/g)).toHaveLength(1);
    // Aucune bande de cartes au-dessus ou au-dessous de l'animation sur l'accueil.
    expect(markup).not.toContain('data-testid="landing-guides-menu"');
    expect(markup).not.toContain('data-testid="landing-guides-screens"');
    // Les anciennes photos de mariage documentaires ont quitté l'accueil.
    expect(markup).not.toContain("images/wedding/wedding-reception.jpg");
    expect(markup).not.toContain("images/wedding/wedding-guests.jpg");
    expect(markup).not.toContain("images/wedding/wedding-music.jpg");
    // Une seule section de repérage, posée sur le shader continu (bande
    // translucide, sans photo).
    expect(markup).not.toContain("landing-guests-astronauts.jpg");
    // Les longs doublons de texte ont été supprimés (les guides animés les remplacent).
    expect(markup).not.toContain("Aperçu produit");
    expect(markup).not.toContain("Organiser un mariage, ce n’est pas");
    expect(markup).not.toContain("Prêts à organiser votre mariage autrement");
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

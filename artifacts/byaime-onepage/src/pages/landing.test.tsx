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
  it("ouvre le hero sur la création de carte, avant toute autre section", () => {
    const markup = render(<LandingPage />);

    expect(markup).toContain('data-testid="landing"');
    expect(markup).toContain('data-testid="landing-composer"');
    expect(markup).toContain('data-testid="landing-entry"');
    expect(markup).toContain('data-testid="landing-create-primary"');
    expect(markup).toContain("Sans carte bancaire");
    expect(markup.indexOf('data-testid="landing-composer"')).toBeLessThan(markup.indexOf('data-testid="landing-showcase"'));
  });

  it("pose un hero plein écran sur le papier, sans visuel photo ni fond animé", () => {
    const markup = render(<LandingPage />);

    /*
     * Le dégradé maillé a été retiré le 14/09 : il était `fixed inset-0 z-0`,
     * donc recouvert par le voile blanc du hero et par des sections toutes
     * opaques (`bg-background`) — un contexte WebGL animé en continu que
     * personne ne voyait. Le contrôle ci-dessous l'interdit de revenir sans
     * qu'une décision le rende visible.
     */
    expect(markup).not.toContain('data-testid="landing-shader"');
    expect(markup).not.toContain('data-testid="landing-hero-photo"');
    expect(markup).not.toContain("landing-hero-astronauts.jpg");
    // Le hero occupe tout l'écran.
    expect(markup).toContain("min-h-[100dvh]");
    expect(markup).toContain('data-testid="landing-cta"');
  });

  it("met en scène le produit puis va droit aux valeurs, sans sections visuelles", () => {
    const markup = render(<LandingPage />);

    // La vitrine du Monde Mariage, juste après le hero.
    expect(markup).toContain('data-testid="landing-showcase"');
    expect(markup).toContain('data-testid="landing-product"');

    // Les trois sections visuels immersifs ont été retirées.
    expect(markup).not.toContain('data-testid="landing-avant"');
    expect(markup).not.toContain('data-testid="landing-jourj"');
    expect(markup).not.toContain('data-testid="landing-apres"');

    // Valeurs, témoignage et appel final complètent le parcours.
    expect(markup).toContain('data-testid="landing-values"');
    expect(markup).toContain('data-testid="landing-quote"');
    expect(markup).toContain('data-testid="landing-cta"');
    expect(markup).toContain("Créer mon espace gratuitement");
  });

  it("propose la création de carte comme action principale du hero, et expose la langue", () => {
    const markup = render(<LandingPage />);

    expect(markup).toContain('data-testid="landing-create-primary"');
    expect(markup).toContain('data-testid="landing-start-blank"');
    // Le choix Couple / Wedding planner a disparu du héros.
    expect(markup).not.toContain('data-testid="landing-persona');
    expect(markup).toContain('data-testid="landing-locale"');
    expect(markup).toContain('data-testid="landing-locale-fr"');
    expect(markup).toContain('data-testid="landing-locale-en"');
  });

  it("garde une seule hiérarchie de titre et le nom AIME cliquable vers l’accueil", () => {
    const markup = render(<LandingPage />);

    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup).toContain("un seul espace privé");
    expect(markup).toContain('aria-label="AIME — accueil"');
    expect(markup).toContain('href="/"');
    expect(markup).toContain('data-testid="landing-admin"');
    expect(markup).toContain('returnTo=%2Fadmin');
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

  it("ne renvoie plus vers les guides : les temps mènent à la création de compte", () => {
    const markup = render(<LandingPage />);

    expect(markup).not.toContain('data-testid="landing-guides"');
    expect(markup).not.toContain('data-testid="landing-guides-links"');
    expect(markup).not.toContain('data-testid="landing-guide-button"');
    expect(markup).not.toContain('href="/guides"');
    expect(markup).not.toContain("Comprendre avant de cliquer.");
    // Les liens des trois temps mènent à la création d'espace.
    expect(markup).toContain('href="/creation"');
    expect(markup.match(/<h1/g)).toHaveLength(1);
  });

  it("ne parle plus jamais de Laboratoire", () => {
    const markup = render(<LandingPage />);
    expect(markup).not.toContain("Laboratoire");
  });

  it("termine par un pied de page qui mène au produit et aux mentions", () => {
    const markup = render(<LandingPage />);
    expect(markup).toContain('aria-label="Pages du site"');
    expect(markup).toContain('href="#landing-product"');
    expect(markup).toContain('href="/conditions"');
    expect(markup).toContain('href="/confidentialite"');
    // Pied de page façon Apple : tagline, colonnes et mention légale.
    expect(markup).toContain("L’art de créer des liens. Tout votre mariage");
    expect(markup).toContain("Produit");
    expect(markup).toContain("Légal");
    expect(markup).toContain("Tous droits réservés");
  });
});

/*
 * Constat §2.1 du plan, fusion du 14/09, puis retrait du 16/09/2026 : la
 * vitrine était introuvable, elle avait été fusionnée dans la Bande (`/monde`),
 * et la Bande a été supprimée. L'accueil est désormais la seule page publique du
 * site : il ne mène plus ni à `/monde`, ni à `/agence`, et ne nomme plus la
 * Bande nulle part.
 */
describe("Landing — l’accueil est la page unique du site", () => {
  it("ne propose plus aucun lien vers la Bande retirée", () => {
    const markup = render(<LandingPage />);

    expect(markup).not.toContain('data-testid="landing-bande"');
    expect(markup).not.toContain('data-testid="footer-bande"');
    expect(markup).not.toContain("La Bande");
    expect(markup).not.toContain('href="/monde"');
  });

  it("ne pointe plus vers l'ancienne vitrine non plus", () => {
    const markup = render(<LandingPage />);

    expect(markup).not.toContain('data-testid="landing-agency"');
    expect(markup).not.toContain('data-testid="footer-agency"');
    expect(markup).not.toContain('href="/agence"');
  });

  it("publie aussi les mentions légales depuis le pied de page", () => {
    const markup = render(<LandingPage />);

    expect(markup).toContain('data-testid="footer-mentions"');
    expect(markup).toContain('href="/mentions-legales"');
    expect(markup).toContain("Mentions légales");
  });

  it("dit la même chose en anglais", () => {
    const markup = render(<LandingPage />);
    // Les clés existent dans les deux langues : la parité est vérifiée par les
    // types (`en: Record<I18nKey, string>`), ici on verrouille leur présence.
    expect(markup).toContain('data-testid="landing-locale-en"');
    expect(markup.length).toBeGreaterThan(1000);
  });
});

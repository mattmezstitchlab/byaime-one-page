import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GuidesPage, GuideChaptersContent } from "./Guides";
import { DEMOS, DEMO_CATEGORIES } from "./guides-demos";
import { AIME_SCREENS, type AimeScreenId } from "@/lib/aime-architecture";
import { Router } from "wouter";

/* Le rendu statique de React échappe « & » et l'apostrophe : on compare la forme rendue. */
const renderable = (value: string) => value.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

describe("GuidesPage", () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Router hook={() => ["/guides", () => {}]}>{children}</Router>
  );
  const page = () => renderToStaticMarkup(<Wrapper><GuidesPage /></Wrapper>);

  it("anime le premier guide directement dans le player, sobrement", () => {
    const markup = page();
    expect(markup).toContain('data-testid="guides-page"');
    // Le titre du premier guide est celui de son étape courante, pas une carte du rail.
    expect(markup).toContain("Profil");
  });

  it("remplace les bandes de boutons par une capsule flottante sur l'animation", () => {
    const markup = page();

    // La capsule : précédent, chapitres au centre avec le compteur, suivant.
    expect(markup).toContain('data-testid="guide-prev"');
    expect(markup).toContain('data-testid="guide-next"');
    expect(markup).toContain('data-testid="guide-chapters-open"');
    expect(markup).toContain("1/25");
    expect(markup).toContain('aria-label="Faire défiler les guides"');

    // Plus aucune bande de cartes au-dessus ou au-dessous de l'animation.
    expect(markup).not.toContain('data-testid="guides-menu"');
    expect(markup).not.toContain('data-testid="guides-screens"');
    expect(markup).not.toContain('data-testid="demo-select-roles"');
  });

  it("garde des contrôles de lecture discrets et les segments d'étapes", () => {
    const markup = page();
    expect(markup).toContain('data-testid="demo-play-pause"');
    expect(markup).toContain('aria-label="Mettre en pause"');
    expect(markup).toContain('data-testid="demo-replay"');
    expect(markup).toContain('aria-label="Rejouer la démonstration"');
    expect(markup).toContain('aria-label="Étapes de la démonstration"');
  });

  it("centre l'animation dans la page", () => {
    const markup = page();
    expect(markup).toContain('data-testid="guides-player"');
    const player = markup.slice(markup.indexOf('data-testid="guides-player"'), markup.indexOf('data-testid="guide-prev"'));
    expect(player).toContain("mx-auto");
    expect(player).toContain("max-w-3xl");
  });

  it("ne mentionne jamais de chiffrement non garanti dans les démos", () => {
    expect(page()).not.toContain("chiffré");
  });
});

describe("GuideChaptersContent", () => {
  const render = (node: React.ReactNode) =>
    renderToStaticMarkup(<Router hook={() => ["/guides", () => {}]}>{node}</Router>);

  it("réunit tous les guides, groupés par catégorie", () => {
    const markup = render(<GuideChaptersContent activeDemo="architecture" onSelect={() => {}} />);

    expect(markup).toContain('data-testid="guide-chapters-content"');
    for (const category of DEMO_CATEGORIES) {
      expect(markup).toContain(renderable(category.label));
      expect(markup).toContain(`guide-chapters-group-${category.id}`);
    }
    for (const demo of DEMOS) {
      expect(markup, `guide « ${demo.id} » absent`).toContain(renderable(demo.title));
      expect(markup, `description du guide « ${demo.id} » absente`).toContain(renderable(demo.description));
    }
    // La phrase sur les frontières de rôles est celle de la démo Rôles, elle reste dans le catalogue.
    expect(markup).toContain(
      "Quatre rôles font varier les actions disponibles et masquent les informations d’organisation sensibles.",
    );
    // Le guide actif est signalé.
    expect(markup).toContain('aria-current="page"');
  });

  it("couvre chaque écran décrit par le registre d'architecture dans l'onglet écrans", () => {
    const markup = render(
      <GuideChaptersContent activeDemo="architecture" onSelect={() => {}} initialTab="screens" />,
    );
    const ids = Object.keys(AIME_SCREENS) as AimeScreenId[];
    for (const id of ids) {
      expect(markup, `écran « ${id} » absent des chapitres`).toContain(`data-screen-id="${id}"`);
      expect(markup).toContain(renderable(AIME_SCREENS[id].label));
    }
    expect(ids.length).toBeGreaterThan(30);
    expect(markup).toContain('guide-chapters-group-panneaux');
    expect(markup).toContain('guide-chapters-group-hors-monde');
    expect(markup).toContain('guide-chapters-group-monde');
  });

  it("ne montre que les guides en vedette sur l'accueil, avec un lien vers le catalogue", () => {
    const featured = ["architecture", "intention", "ai-plus-me", "budget", "dayof", "memories"];
    const markup = render(
      <GuideChaptersContent featuredDemos={featured} activeDemo="budget" onSelect={() => {}} />,
    );

    // L'onglet « écrans » n'existe pas en mode vedette.
    expect(markup).not.toContain("Écrans expliqués");
    // Un lien mène au catalogue complet.
    expect(markup).toContain('href="/guides"');
    expect(markup).toContain("Tous les guides animés");
    // Un guide hors vedette n'apparaît pas.
    expect(markup).not.toContain("Les Rôles et Frontières");
  });
});

describe("Données de démonstration", () => {
  it("attache chaque démo à une catégorie valide, sans doublon, avec des curseurs dans le cadre", () => {
    const categories = new Set(DEMO_CATEGORIES.map(category => category.id));
    const ids = DEMOS.map(demo => demo.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const demo of DEMOS) {
      expect(categories.has(demo.category), demo.id).toBe(true);
      expect(demo.steps.length).toBeGreaterThan(1);
      for (const step of demo.steps) {
        expect(step.cursor.x).toBeGreaterThanOrEqual(0);
        expect(step.cursor.x).toBeLessThanOrEqual(100);
        expect(step.cursor.y).toBeGreaterThanOrEqual(0);
        expect(step.cursor.y).toBeLessThanOrEqual(100);
      }
    }
  });
});

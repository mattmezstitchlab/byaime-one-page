import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GuidesPage, GuidesExplorer } from "./Guides";
import { DEMOS, DEMO_CATEGORIES } from "./guides-demos";
import { AIME_SCREENS, type AimeScreenId } from "@/lib/aime-architecture";
import { Router } from "wouter";

/* Le rendu statique de React échappe « & » et l'apostrophe : on compare la forme rendue. */
const renderable = (value: string) => value.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

describe("GuidesPage", () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Router hook={() => ["/guides", () => {}]}>{children}</Router>
  );

  it("renders the main title and all four demo concepts", () => {
    const markup = renderToStaticMarkup(<Wrapper><GuidesPage /></Wrapper>);
    expect(markup).toContain('data-testid="guides-page"');
    
    // Check main conceptual headers
    expect(markup).toContain("Un seul système, plusieurs réalités");
    expect(markup).toContain("Créer un Monde");
    expect(markup).toContain("Les Rôles et Frontières");
    expect(markup).toContain("AI · + · ME");
  });

  it("renders a single responsive demo selector with data-testids", () => {
    const markup = renderToStaticMarkup(<Wrapper><GuidesPage /></Wrapper>);
    expect(markup).toContain('data-testid="demo-select-roles"');
    expect(markup).toContain('data-testid="demo-select-creation"');
  });

  it("covers the new control tools of the World", () => {
    const markup = renderToStaticMarkup(<Wrapper><GuidesPage /></Wrapper>);
    expect(markup).toContain('data-testid="demo-select-synthesis"');
    expect(markup).toContain('data-testid="demo-select-graph"');
  });

  it("renders player controls with correct aria-labels", () => {
    const markup = renderToStaticMarkup(<Wrapper><GuidesPage /></Wrapper>);
    expect(markup).toContain('data-testid="demo-play-pause"');
    expect(markup).toContain('aria-label="Mettre en pause"');
    expect(markup).toContain('data-testid="demo-replay"');
    expect(markup).toContain('aria-label="Rejouer la démonstration"');
  });

  it("ranged the menu by category, horizontally", () => {
    const markup = renderToStaticMarkup(<Wrapper><GuidesPage /></Wrapper>);
    expect(markup).toContain('data-testid="guides-menu"');
    for (const category of DEMO_CATEGORIES) {
      expect(markup).toContain(renderable(category.label));
    }
    expect(markup).toContain('aria-label="Choisir un guide animé"');
    // Une seule rangée défilable, les catégories se suivent horizontalement.
    const menu = markup.slice(markup.indexOf('data-testid="guides-menu"'), markup.indexOf('data-testid="guides-player"'));
    expect(menu).toContain("overflow-x-auto");
    expect(menu).toContain("snap-x");
    expect(menu).toContain("snap-start");
    expect(menu).not.toContain("lg:sticky");
    // Le nuage de puces a disparu : une carte par démonstration, pas plus.
    expect(menu).not.toContain("flex-wrap");
    expect(menu.match(/data-testid="demo-select-/g)).toHaveLength(DEMOS.length);
  });

  it("centers the animation in the section", () => {
    const markup = renderToStaticMarkup(<Wrapper><GuidesPage /></Wrapper>);
    const player = markup.slice(markup.indexOf('data-testid="guides-player"'), markup.indexOf('data-testid="guides-screens"'));
    expect(player).toContain("mx-auto");
    expect(player).toContain("max-w-3xl");
    expect(player).toContain("text-center");
  });

  it("explains the first sentence and the contextual guide", () => {
    const markup = renderToStaticMarkup(<Wrapper><GuidesPage /></Wrapper>);
    expect(markup).toContain('data-testid="demo-select-intention"');
    expect(markup).toContain('data-testid="demo-select-guidance"');
    expect(markup).toContain("La première phrase du mariage");
    expect(markup).toContain("AIME vous guide à chaque écran");
  });

  it("covers every screen described by the architecture registry", () => {
    const markup = renderToStaticMarkup(<Wrapper><GuidesExplorer /></Wrapper>);
    const ids = Object.keys(AIME_SCREENS) as AimeScreenId[];
    for (const id of ids) {
      expect(markup, `écran « ${id} » absent des guides`).toContain(`data-screen-id="${id}"`);
      expect(markup).toContain(renderable(AIME_SCREENS[id].label));
    }
    expect(ids.length).toBeGreaterThan(30);
    expect(markup).toContain('data-testid="guides-group-panneaux"');
    expect(markup).toContain('data-testid="guides-group-hors-monde"');
    // Les écrans forment aussi une rangée défilante, plus une grille de cartes.
    const screens = markup.slice(markup.indexOf('data-testid="guides-screens"'));
    expect(screens.match(/overflow-x-auto/g)?.length).toBeGreaterThanOrEqual(3);
    expect(screens).not.toContain("lg:grid-cols-3");
  });

  it("keeps every demo attached to a valid category and unique", () => {
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

  it("describes only the role boundaries enforced by the server", () => {
    const markup = renderToStaticMarkup(<Wrapper><GuidesPage /></Wrapper>);
    expect(markup).toContain(
      "Quatre rôles font varier les actions disponibles et masquent les informations d’organisation sensibles.",
    );
    expect(markup).not.toContain("chiffré");
    expect(markup).not.toContain("les autres invités");
  });
});

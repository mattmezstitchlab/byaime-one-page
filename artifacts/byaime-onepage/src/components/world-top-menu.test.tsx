import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorldTopMenu } from "./WorldTopMenu";

/*
 * Le menu n'organise plus le produit : la Timeline l'organise. Il devient UN
 * bouton, qui ouvre une liste plate courte — plus deux catégories à explorer
 * pour retrouver où vit une entrée.
 */

describe("WorldTopMenu", () => {
  it("n'affiche qu'un seul bouton de menu, quelle que soit la période", () => {
    for (const phase of ["avant", "pendant", "apres"] as const) {
      const html = renderToStaticMarkup(
        <WorldTopMenu role="owner" locale="fr" phase={phase} onOpen={() => undefined} />,
      );

      expect(html).toContain('data-testid="world-top-menu"');
      expect(html).toContain('data-testid="world-top-menu-button"');
      expect(html.match(/data-testid="world-top-menu-button"/g)).toHaveLength(1);
      expect(html).not.toContain('data-testid="world-top-menu-concevoir"');
      expect(html).not.toContain('data-testid="world-top-menu-jour-j"');
    }
  });

  it("garde la liste fermée : rien ne déborde au rendu", () => {
    const html = renderToStaticMarkup(
      <WorldTopMenu role="owner" locale="fr" phase="avant" onOpen={() => undefined} />,
    );

    expect(html).not.toContain('data-testid="world-top-menu-panel"');
    expect(html).not.toContain("aria-expanded=\"true\"");
    expect(html).not.toContain("Pilotage");
  });
});

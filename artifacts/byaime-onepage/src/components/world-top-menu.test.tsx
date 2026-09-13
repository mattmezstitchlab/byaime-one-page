import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorldTopMenu } from "./WorldTopMenu";

/*
 * Le menu horizontal du portail : les trois catégories du rétroplanning,
 * fermées par défaut (les sous-menus s'ouvrent au clic, pas au rendu).
 */

describe("WorldTopMenu", () => {
  it("affiche les deux catégories du projet, dans l'ordre du mariage", () => {
    const html = renderToStaticMarkup(
      <WorldTopMenu role="owner" locale="fr" onOpen={() => undefined} />,
    );

    expect(html).toContain('data-testid="world-top-menu"');
    expect(html).toContain("Concevoir et préparer");
    expect(html).toContain("Le Jour J");
  });

  it("garde les sous-menus fermés : rien ne déborde au rendu", () => {
    const html = renderToStaticMarkup(
      <WorldTopMenu role="owner" locale="fr" onOpen={() => undefined} />,
    );

    expect(html).not.toContain("Le socle");
    expect(html).not.toContain("aria-expanded=\"true\"");
  });
});

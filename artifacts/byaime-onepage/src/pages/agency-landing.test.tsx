import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AgencyLanding from "./AgencyLanding";

/*
 * Verrouille la promesse de la vitrine : la marque, le rôle, la méthode en
 * quatre temps, les deux livrables (la page Jour J et le rapport automatique),
 * les prestations et le contact. Aucune chaîne testée ne contient d'apostrophe :
 * renderToStaticMarkup rend les entités typographiques telles quelles.
 */

function renderAgency() {
  return renderToStaticMarkup(<AgencyLanding />);
}

describe("vitrine de l'agence", () => {
  it("affiche la marque et le rôle", () => {
    const html = renderAgency();
    expect(html).toContain("La cerise sur le gâteau");
    expect(html).toContain("Wedding Architect");
  });

  it("déroule la méthode en quatre temps", () => {
    const html = renderAgency();
    expect(html).toContain("Quatre temps, un seul plan");
    expect(html).toContain("La conception");
    expect(html).toContain("Le Jour J");
  });

  it("vend les deux livrables, pas le logiciel", () => {
    const html = renderAgency();
    expect(html).toContain("Une page. Votre Jour J.");
    expect(html).toContain("Un rapport, présenté tout seul.");
    // Le vocabulaire produit reste absent de la vitrine.
    expect(html).not.toContain("timeline");
    expect(html).not.toContain("panneau");
  });

  it("présente les prestations et le contact", () => {
    const html = renderAgency();
    expect(html).toContain("Budget suivi au centime");
    expect(html).toContain("Parlons de votre mariage.");
    expect(html).toContain("Prendre rendez-vous");
    expect(html).toContain('href="/admin"');
  });

  it("sert les visuels avec le jeton de version", () => {
    const html = renderAgency();
    expect(html).toContain("images/agency/agency-hero.jpg?v=");
    expect(html).toContain("images/agency/agency-stationery.jpg?v=");
    expect(html).toContain("images/agency/agency-ceremony.jpg?v=");
  });
});

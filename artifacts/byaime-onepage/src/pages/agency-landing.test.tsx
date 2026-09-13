import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AGENCY_IDENTITY } from "@/lib/agency-identity";
import { agencyJsonLd } from "@/lib/agency-seo";
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

/*
 * Passe S1 du plan (docs/plan-site-agence-wedding-2026-09-13.md) : la vitrine
 * porte son identité documentaire, son contact sur le bon domaine et ses
 * couleurs en jetons mesurés AA. Le titre et la description eux-mêmes sont posés
 * par `useRouteMeta` (effet de bord navigateur) : ce qui est vérifiable en rendu
 * statique, c'est le JSON-LD injecté dans la page.
 */

describe("vitrine — identité documentaire et contact", () => {
  const html = renderAgency();

  it("embarque ses données structurées dans la page", () => {
    expect(html).toContain('data-testid="agency-jsonld"');
    expect(html).toContain('"@type":"ProfessionalService"');
    expect(html).toContain(`"name":"${AGENCY_IDENTITY.brand}"`);
  });

  it("écrit à l'agence sur le domaine qui porte le site", () => {
    // Décision D2 : byaime.fr partout. L'email était en @lacerisesurlegateau.fr.
    expect(html).toContain(`mailto:${AGENCY_IDENTITY.contactEmail}`);
    expect(html).not.toContain("lacerisesurlegateau");
  });

  it("mène aux mentions légales depuis l'en-tête et le pied de page", () => {
    expect(html).toContain('data-testid="agency-mentions"');
    expect(html).toContain('data-testid="agency-footer-links"');
    expect(html.match(/href="\/mentions-legales"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(html).toContain('href="/confidentialite"');
  });

  it("affiche les villes de l'identité, sans les recopier", () => {
    for (const city of AGENCY_IDENTITY.cities) expect(html).toContain(city);
    expect(html).toContain(AGENCY_IDENTITY.cities.join(" · "));
  });

  it("ne peint plus aucune couleur en dur : tout vient des jetons", () => {
    expect(html).toContain("var(--agency-ink)");
    expect(html).toContain("var(--agency-eyebrow)");
    expect(html).toContain("var(--agency-index)");
    for (const hex of ["#8A8375", "#B4AC9C", "#6F6A61", "#171410"]) {
      expect(html.includes(hex), `${hex} encore présent dans le rendu`).toBe(false);
    }
    // La serif de titrage est une classe, plus un style inline recopié.
    expect(html).toContain("agency-serif");
    expect(html).not.toContain("Didot");
  });

  it("annonce les mêmes prestations que les données structurées", () => {
    const offers = (agencyJsonLd().makesOffer as Array<{ itemOffered: { name: string } }>)
      .map(offer => offer.itemOffered.name);
    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) expect(html, `prestation « ${offer} » absente de la page`).toContain(offer);
  });
});

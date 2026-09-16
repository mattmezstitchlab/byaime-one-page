import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AGENCY_HOST, AGENCY_IDENTITY, AGENCY_LEGAL_FIELDS, missingAgencyLegalFields } from "@/lib/agency-identity";
import { MentionsLegalesPage } from "./Mentions";

/*
 * Les mentions légales sont une obligation de publication (LCEN art. 6 III-1),
 * pas une page produit : le test verrouille la présence de chaque rubrique
 * imposée, et surtout l'honnêteté de la page — un champ que la fondatrice n'a
 * pas fourni est affiché comme manquant, jamais inventé.
 *
 * Rendu statique : React échappe l'apostrophe droite en `&#x27;`, donc aucune
 * chaîne attendue n'en contient (même contrainte que la vitrine).
 */

function render(): string {
  return renderToStaticMarkup(<MentionsLegalesPage />);
}

describe("mentions légales", () => {
  const html = render();

  it("publie les rubriques imposées", () => {
    expect(html).toContain('data-testid="mentions-page"');
    expect(html).toContain("Mentions légales");
    expect(html).toContain("Éditeur du site");
    expect(html).toContain("Hébergement");
    expect(html).toContain("Données personnelles");
    expect(html).toContain("Propriété intellectuelle");
    // La base légale est citée, pas sous-entendue.
    expect(html).toContain("6 III-1");
    expect(html).toContain("2004-575");
  });

  it("nomme l'enseigne et le canal de contact du site", () => {
    expect(html).toContain(AGENCY_IDENTITY.brand);
    expect(html).toContain(AGENCY_IDENTITY.role);
    expect(html).toContain(AGENCY_IDENTITY.contactEmail);
    expect(html).toContain(`mailto:${AGENCY_IDENTITY.contactEmail}`);
  });

  it("identifie l'hébergeur, qui fait partie des mentions obligatoires", () => {
    expect(html).toContain('data-testid="legal-host"');
    expect(html).toContain(AGENCY_HOST.name);
    expect(html).toContain(AGENCY_HOST.address);
    expect(html).toContain(AGENCY_HOST.url);
  });

  it("liste chaque champ d'identité légale exigé", () => {
    expect(html).toContain('data-testid="legal-editor"');
    for (const field of AGENCY_LEGAL_FIELDS) {
      expect(html, `champ « ${field.label} » absent`).toContain(field.label);
    }
    expect(html).toContain("Immatriculation");
    expect(html).toContain("Directeur de la publication");
  });

  it("signale les champs manquants au lieu de les inventer", () => {
    const missing = missingAgencyLegalFields();

    if (missing.length > 0) {
      expect(html).toContain('data-testid="legal-incomplete"');
      expect(html).toContain(`${missing.length} champ`);
      expect(html).toContain("À compléter avant mise en ligne");
      // Tant que l'identité légale n'est pas fournie, le site n'est pas
      // publiable : la page le dit, et rien ne ressemble à un SIREN.
      expect(html).not.toMatch(/\b\d{9}\b/);
    } else {
      expect(html).not.toContain('data-testid="legal-incomplete"');
      expect(html).not.toContain("À compléter avant mise en ligne");
    }
  });

  it("renvoie vers l’accueil, la confidentialité et les conditions", () => {
    expect(html).toContain("Retour à l’accueil");
    expect(html).toContain('href="/"');
    expect(html).not.toContain('href="/monde"');
    expect(html).toContain('href="/confidentialite"');
    expect(html).toContain('href="/conditions"');
  });
});

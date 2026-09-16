import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AGENCY_IDENTITY, SITE_ORIGIN } from "./agency-identity";
import { AGENCY_META, AGENCY_PATH, agencyJsonLd, agencyJsonLdScript, agencyUrl } from "./agency-seo";

/*
 * Ce que la vitrine dit d'elle-même aux moteurs et aux réseaux (lot 1.2 / 2.4).
 *
 * Constat du plan (§2.2) : `/agence` héritait du titre, de la description et de
 * la canonical d'AIME, et n'avait aucune donnée structurée. Ces contrôles
 * verrouillent l'identité documentaire ET les deux réglages de publication qui
 * protègent le livrable d'un couple : `robots.txt` interdit `/bilan/`, et la
 * page elle-même pose `noindex`.
 */

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

describe("métadonnées de la vitrine", () => {
  it("porte un titre court qui nomme l'enseigne, le métier et la ville", () => {
    expect(AGENCY_META.title).toContain(AGENCY_IDENTITY.brand);
    expect(AGENCY_META.title).toContain(AGENCY_IDENTITY.role);
    expect(AGENCY_META.title).toContain(AGENCY_IDENTITY.cities[0]);
    // Un titre au-delà de ~60 caractères est tronqué dans les résultats.
    expect(AGENCY_META.title.length).toBeLessThanOrEqual(64);
  });

  it("décrit la prestation en une phrase, sans vocabulaire produit", () => {
    expect(AGENCY_META.description.length).toBeGreaterThan(90);
    expect(AGENCY_META.description.length).toBeLessThanOrEqual(180);
    for (const forbidden of ["timeline", "panneau", "logiciel", "AIME"]) {
      expect(AGENCY_META.description).not.toContain(forbidden);
    }
  });

  it("construit des URLs absolues sur le domaine du site", () => {
    // `/agence` et `/monde` sont retirées (16/09/2026) et redirigent : la page
    // publique déclarée aux moteurs est la racine, jamais une URL qui redirige.
    expect(AGENCY_PATH).toBe("/");
    expect(agencyUrl()).toBe(`${SITE_ORIGIN}/`);
    expect(agencyUrl("/mentions-legales")).toBe(`${SITE_ORIGIN}/mentions-legales`);
    expect(agencyUrl("images/agency/agency-hero.jpg")).toBe(`${SITE_ORIGIN}/images/agency/agency-hero.jpg`);
  });

  it("contacte l'agence sur le domaine qui porte le site (décision D2)", () => {
    // L'email était en @lacerisesurlegateau.fr, un domaine que ni le canonical,
    // ni le sitemap, ni robots.txt ne connaissent.
    expect(AGENCY_IDENTITY.contactEmail.endsWith("@byaime.fr")).toBe(true);
    expect(agencyJsonLd().email).toBe(AGENCY_IDENTITY.contactEmail);
  });
});

describe("données structurées de la vitrine", () => {
  const jsonLd = agencyJsonLd();

  it("déclare un service professionnel, pas un article", () => {
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("ProfessionalService");
    expect(jsonLd.name).toBe(AGENCY_IDENTITY.brand);
    expect(jsonLd.url).toBe(agencyUrl());
  });

  it("couvre les villes annoncées par la vitrine", () => {
    const areas = jsonLd.areaServed as Array<{ "@type": string; name: string }>;
    expect(areas.map(area => area.name)).toEqual([...AGENCY_IDENTITY.cities]);
    for (const area of areas) expect(area["@type"]).toBe("City");
  });

  it("n'invente ni adresse, ni téléphone, ni prix tant qu'ils manquent", () => {
    // Une donnée structurée fausse est pire qu'une donnée absente ; la
    // fourchette de prix reste non tranchée (décision D5).
    expect(jsonLd).not.toHaveProperty("priceRange");
    expect(AGENCY_IDENTITY.legal.address).toBeNull();
    expect(jsonLd).not.toHaveProperty("address");
    expect(jsonLd).not.toHaveProperty("telephone");
  });

  it("liste les prestations réellement annoncées sur la page", () => {
    const offers = jsonLd.makesOffer as Array<{ itemOffered: { name: string } }>;
    expect(offers.map(offer => offer.itemOffered.name)).toContain("Budget suivi au centime");
    expect(offers.map(offer => offer.itemOffered.name)).toContain("Direction artistique & conception");
  });

  it("produit un JSON injectable, sans `<` nu", () => {
    const script = agencyJsonLdScript();
    expect(() => JSON.parse(script)).not.toThrow();
    expect(script).not.toContain("<");
    expect(script).toContain('"@type":"ProfessionalService"');
  });
});

describe("publication : ce qui est indexable", () => {
  const robots = read("../../public/robots.txt");
  const sitemap = read("../../public/sitemap.xml");
  const shell = read("../../index.html");
  const bilan = read("../pages/BilanPage.tsx");

  it("interdit le bilan partagé d'un couple aux robots", () => {
    expect(robots).toContain("Disallow: /bilan/");
    // Les espaces privés le restaient déjà : on ne régresse pas.
    for (const path of ["/user-portal", "/profile", "/invite/", "/rsvp/", "/profil/", "/api"]) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
  });

  it("pose aussi noindex sur la page du bilan", () => {
    // Un robots.txt seul n'empêche pas une URL d'apparaître dans l'index si elle
    // est liée ailleurs : la directive suit la page.
    expect(bilan).toContain('robots: "noindex, nofollow"');
  });

  it("déclare la page publique et ses mentions légales dans le sitemap", () => {
    expect(sitemap).toContain(`${SITE_ORIGIN}/<`);
    expect(sitemap).toContain(`${SITE_ORIGIN}/mentions-legales`);
    // Une URL qui redirige ne se déclare pas : la vitrine et la Bande sont retirées.
    expect(sitemap).not.toContain("/agence");
    expect(sitemap).not.toContain("/monde");
    // Rien de privé dans le sitemap.
    expect(sitemap).not.toContain("/bilan/");
    expect(sitemap).not.toContain("/user-portal");
  });

  it("peint le site en clair dès la première peinture", () => {
    // L'app est blanche (décision du 2026-09-13) : le thème sombre par défaut
    // appliquait `color-scheme: dark` sur des pages 100 % blanches.
    expect(shell).toContain("dataset.aimeTheme = 'light'");
    expect(shell).not.toContain("dataset.aimeTheme = 'dark'");
    expect(shell).toContain('<meta name="theme-color" content="#FFFFFF" />');
  });
});

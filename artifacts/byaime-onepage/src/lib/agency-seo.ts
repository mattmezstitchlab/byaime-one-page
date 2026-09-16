/*
 * Ce que la page publique dit d'elle-même aux moteurs et aux réseaux sociaux.
 *
 * Constat du plan (§2.2) : une route d'application mono-page servait le titre, la
 * description et la canonical par défaut — la page n'existait ni pour Google, ni
 * pour un partage WhatsApp. Ce fichier est la source unique de son identité
 * documentaire :
 *
 *  - `AGENCY_META`          → titre et description posés par `useRouteMeta`,
 *                             qui réécrit aussi la balise canonical ;
 *  - `agencyJsonLd()`       → données structurées `ProfessionalService`, pour
 *                             que la page soit comprise comme un commerce et
 *                             pas comme un article ;
 *  - `agencyJsonLdScript()` → la même chose prête à injecter, `<` échappé.
 *
 * Le pré-rendu complet de la vitrine (le texte dans le HTML servi, sans
 * JavaScript) est le lot 2 du plan : il réutilisera ces deux exports.
 */

import { AGENCY_HOST, AGENCY_IDENTITY, SITE_ORIGIN } from "./agency-identity";

/**
 * Chemin de la page publique : la racine.
 *
 * La vitrine `/agence` avait été fusionnée dans la Bande (`/monde`), supprimée le
 * 16/09/2026 ; les deux URL redirigent désormais vers `/`. Déclarer ici une URL
 * qui redirige ferait publier une canonical morte — le pré-rendu (lot 2 du plan)
 * s'appuie donc sur la racine, la seule page publique du site.
 */
export const AGENCY_PATH = "/";

export const AGENCY_META = {
  title: `${AGENCY_IDENTITY.brand} — ${AGENCY_IDENTITY.role} · ${AGENCY_IDENTITY.cities[0]}`,
  /*
   * 162 caractères : au-delà de ~165, la description est tronquée dans les
   * résultats de recherche. Elle porte les mots réellement cherchés (wedding
   * architect, Paris, mariage, lieux, budget, invités, prestataires, Jour J) et
   * aucun vocabulaire produit — la vitrine vend le planner, pas l'outil.
   */
  description:
    "Wedding architect à Paris : je conçois et je tiens votre mariage de bout en bout — lieux, budget, invités, prestataires. Vous ne gardez qu'une page, votre Jour J.",
} as const;

/** URL absolue d'un chemin du site. */
export function agencyUrl(path: string = AGENCY_PATH): string {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

type JsonLd = Record<string, unknown>;

/**
 * `ProfessionalService` plutôt que `LocalBusiness` : l'agence vend une
 * prestation d'orchestration, pas un lieu. Les champs absents (adresse,
 * téléphone, fourchette de prix) sont **omis** plutôt que publiés vides — une
 * donnée structurée fausse est pire qu'une donnée manquante, et le prix reste
 * non tranché (décision D5).
 */
export function agencyJsonLd(): JsonLd {
  const { legal } = AGENCY_IDENTITY;
  const service: JsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: AGENCY_IDENTITY.brand,
    description: AGENCY_META.description,
    url: agencyUrl(),
    email: AGENCY_IDENTITY.contactEmail,
    image: agencyUrl("/images/agency/agency-hero.jpg"),
    knowsLanguage: "fr",
    areaServed: AGENCY_IDENTITY.cities.map(city => ({ "@type": "City", name: city })),
    makesOffer: [
      "Direction artistique & conception",
      "Sélection et contrat des prestataires",
      "Budget suivi au centime",
      "Invités, RSVP et plan de table",
      "Déroulé du Jour J et coordination le jour même",
    ].map(item => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: item } })),
  };

  if (legal.legalName) service.legalName = legal.legalName;
  if (legal.address) service.address = legal.address;
  if (legal.phone) service.telephone = legal.phone;
  if (legal.publicationDirector) {
    service.founder = { "@type": "Person", name: legal.publicationDirector };
  }

  return service;
}

/**
 * Le JSON-LD prêt à être injecté dans un `<script type="application/ld+json">`.
 * `<` est échappé : une occurrence de `</script>` dans une donnée casserait le
 * document. React échappe par ailleurs le texte d'un `<script>` rendu comme
 * enfant — d'où `dangerouslySetInnerHTML` côté composant, sur ce contenu qui
 * vient d'ici et de nulle part ailleurs.
 */
export function agencyJsonLdScript(): string {
  return JSON.stringify(agencyJsonLd()).replace(/</g, "\\u003c");
}

/** L'hébergeur, tel qu'il doit apparaître dans les mentions et en données structurées. */
export function agencyHostJsonLd(): JsonLd {
  return { "@type": "Organization", name: AGENCY_HOST.name, url: AGENCY_HOST.url };
}

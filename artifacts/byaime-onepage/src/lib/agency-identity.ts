/*
 * L'identité de l'agence, écrite UNE fois.
 *
 * La Bande (/monde, où la vitrine est fusionnée), la page de mentions légales
 * (/mentions-legales), le bilan partagé (/bilan/:id) et les métadonnées de
 * partage lisent ce fichier :
 * changer un nom, une ville ou une adresse ne se fait plus dans quatre
 * endroits. Jusqu'ici la marque, le rôle et l'email de contact étaient trois
 * constantes locales de la page de la vitrine, invisibles du reste du site.
 *
 * Décision D2 du 2026-09-13 : le site est porté par `byaime.fr` (canonical,
 * sitemap et robots.txt pointent déjà là). L'adresse de contact passe donc en
 * `@byaime.fr` — elle était en `@lacerisesurlegateau.fr`, un domaine qu'aucun
 * réglage du site ne connaît.
 *
 * Les champs légaux encore à `null` doivent être fournis par la fondatrice
 * (lot 1.3 du plan). Tant qu'ils le sont, `/mentions-legales` les signale comme
 * manquants : la page est en place, le site n'est pas publiable en l'état.
 */

/** Origine publique du site, sans slash final. Sert aux URLs canoniques et partagées. */
export const SITE_ORIGIN = "https://www.byaime.fr";

/** Hébergeur : connu et stable, il fait partie des mentions obligatoires (LCEN art. 6 III-1). */
export const AGENCY_HOST = {
  name: "Vercel Inc.",
  address: "340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis",
  url: "https://vercel.com",
} as const;

export const AGENCY_IDENTITY = {
  /** Nom d'enseigne affiché sur le site. */
  brand: "La cerise sur le gâteau",
  /** Signature de métier, sous le nom d'enseigne. */
  role: "Wedding Architect",
  contactEmail: "bonjour@byaime.fr",
  cities: ["Paris", "New York"],
  /** Identité légale de l'éditeur : `null` = à fournir avant mise en ligne. */
  legal: {
    legalName: null,
    legalForm: null,
    shareCapital: null,
    tradeRegister: null,
    address: null,
    phone: null,
    publicationDirector: null,
  },
} as const;

export type AgencyLegalField = keyof typeof AGENCY_IDENTITY.legal;

/** Libellé français de chaque champ légal, et ce qu'il recouvre. */
export const AGENCY_LEGAL_FIELDS: ReadonlyArray<{
  field: AgencyLegalField;
  label: string;
  hint: string;
}> = [
  { field: "legalName", label: "Raison sociale", hint: "Nom juridique de l'entreprise qui édite le site." },
  { field: "legalForm", label: "Forme juridique", hint: "EI, SAS, SASU, EURL… telle qu'elle est déclarée." },
  { field: "shareCapital", label: "Capital social", hint: "Montant déclaré au registre, en euros." },
  { field: "tradeRegister", label: "Immatriculation", hint: "Numéro SIREN ou RCS, et ville du greffe." },
  { field: "address", label: "Siège social", hint: "Adresse postale complète de l'éditeur." },
  { field: "phone", label: "Téléphone", hint: "Numéro auquel l'éditeur peut être joint." },
  { field: "publicationDirector", label: "Directeur de la publication", hint: "Prénom et nom de la personne responsable du site." },
];

export type AgencyLegalRow = {
  field: AgencyLegalField;
  label: string;
  hint: string;
  /** `null` tant que la fondatrice n'a pas fourni la valeur. */
  value: string | null;
};

/**
 * Les lignes de la page de mentions légales, dans l'ordre de la LCEN :
 * l'éditeur d'abord, puis l'hébergeur. Dérivation pure — la page ne décide
 * rien, elle affiche ce que l'identité contient.
 */
export function agencyLegalRows(): AgencyLegalRow[] {
  return AGENCY_LEGAL_FIELDS.map(entry => ({
    field: entry.field,
    label: entry.label,
    hint: entry.hint,
    value: AGENCY_IDENTITY.legal[entry.field],
  }));
}

/** Vrai tant qu'au moins un champ légal manque : le site n'est pas publiable. */
export function isAgencyIdentityComplete(): boolean {
  return agencyLegalRows().every(row => Boolean(row.value && row.value.trim()));
}

/** Les champs manquants, pour l'affiche d'alerte et les contrôles. */
export function missingAgencyLegalFields(): AgencyLegalField[] {
  return agencyLegalRows().filter(row => !row.value || !row.value.trim()).map(row => row.field);
}

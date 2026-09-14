/*
 * Le vocabulaire visuel du site public, écrit une seule fois.
 *
 * Constat du 14/09 : la direction artistique de l'accueil — panneaux blancs
 * bordés d'un filet, œil-de-bœuf en petites capitales, grand titre, amorce,
 * boutons-pilules, cartes arrondies — était recopiée à la main dans chaque page,
 * avec des variantes : 48 hexadécimaux en dur dans `Landing.tsx`, des gris à
 * 3,76:1, des pills de trois hauteurs différentes. Étendre ce dessin au site
 * entier en continuant à recopier aurait multiplié ces écarts.
 *
 * Ces constantes sont donc la seule source du dessin des pages publiques ; les
 * pages composent avec elles (`components/SiteChrome.tsx`). Deux contrôles les
 * tiennent : `lib/site-design.test.ts` (aucune couleur en dur, œil-de-bœuf sur
 * un jeton mesuré AA) et `lib/agency-theme.test.ts` (les pages listées ne
 * recopient aucune couleur).
 *
 * Règle de typographie posée le 14/09 : **le site parle en sans** — la police
 * d'affichage de l'accueil, via `.aime-apple-title`. La serif `--agency-serif`
 * reste réservée au livrable d'un couple (`components/CoupleReport.tsx`), qui
 * est un document à lire et à imprimer, pas un écran. Avant cette règle, les
 * deux se mélangeaient selon les pages.
 */

/** Filet qui sépare les panneaux : décoratif, jamais du texte. */
export const HAIRLINE = "border-[var(--agency-hairline)]";

/** Œil-de-bœuf : petites capitales espacées. Jeton mesuré à 5,20:1 (AA). */
export const EYEBROW =
  "text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--agency-eyebrow)]";

/** Grand titre et amorce : les classes de l'accueil. */
export const TITLE = "aime-apple-title text-[var(--agency-ink)]";
export const LEAD = "aime-apple-lead text-[var(--agency-body)]";

/** Texte courant d'une page publique. */
export const BODY = "text-[15px] leading-relaxed text-[var(--agency-body)]";

/** Barre de tête fixe, fine et floutée, comme celle de l'accueil. */
export const SITE_BAR =
  "fixed inset-x-0 top-0 z-40 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)]/85 backdrop-blur-xl";
export const SITE_BAR_INNER =
  "mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-4 px-5 md:px-8";
export const WORDMARK =
  "font-display text-[15px] font-semibold tracking-[.28em] text-[var(--agency-ink)]";

/** Panneau : une tranche de page, opaque, séparée d'un filet. */
export const PANEL =
  "relative z-10 border-t border-[var(--agency-hairline)] bg-[var(--agency-paper)]";
export const PANEL_INNER = "mx-auto max-w-5xl px-6";
/** Rythme : plus serré que la vitrine marketing, parce qu'une page se lit. */
export const PANEL_SPACING = "py-16 md:py-24";

/** Carte : le module de base d'un panneau. */
export const CARD = "rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)]";
/** Carte sombre : le compositeur de l'accueil, repris pour ce qui se manipule. */
export const CARD_INK =
  "rounded-[2rem] border border-[var(--agency-paper)]/15 bg-[var(--agency-ink)] text-[var(--agency-paper)]";

/* Boutons-pilules. `.aime-apple-pill` (min-height 44 px) pour les appels ;
   les variantes `small` (36 px) pour les choix répétés en ligne — une barre
   d'outils de régie ne se clique pas avec des cibles de 44 px partout. */
export const PILL =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40 disabled:cursor-not-allowed disabled:opacity-35";
export const PILL_CALL = `${PILL} min-h-11 px-7 text-[14px]`;
export const PILL_SMALL = `${PILL} h-9 px-4 text-xs font-medium`;

export const PILL_INK = `${PILL_CALL} bg-[var(--agency-ink)] text-[var(--agency-paper)] hover:opacity-85`;
export const PILL_GHOST = `${PILL_CALL} border border-[var(--agency-hairline)] text-[var(--agency-body)] hover:border-[var(--agency-index)] hover:text-[var(--agency-ink)]`;
/** L'accent de la marque, réservé à l'action qui engage (appliquer, envoyer). */
export const PILL_ACCENT = "aime-apple-pill aime-apple-pill-accent";

export const PILL_SMALL_INK = `${PILL_SMALL} bg-[var(--agency-ink)] text-[var(--agency-paper)] hover:opacity-85`;
export const PILL_SMALL_GHOST = `${PILL_SMALL} border border-[var(--agency-hairline)] text-[var(--agency-body)] hover:border-[var(--agency-index)] hover:text-[var(--agency-ink)]`;

/**
 * Champ de saisie. La cible fait 44 px de haut une fois le remplissage posé, et
 * l'anneau de focus est le même que celui des pilules.
 */
export const FIELD =
  "w-full rounded-xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-3 text-[15px] text-[var(--agency-ink)] placeholder:text-[var(--agency-eyebrow)] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40";

/** Lien de texte discret, souligné d'un filet. */
export const LINK_QUIET =
  "text-[var(--agency-body)] underline decoration-[var(--agency-hairline)] underline-offset-4 motion-safe:transition hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40";

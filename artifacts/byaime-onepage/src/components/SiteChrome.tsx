import type { ReactNode } from "react";

import { AGENCY_IDENTITY } from "@/lib/agency-identity";
import { sitePath } from "@/lib/site-path";
import {
  CARD,
  EYEBROW,
  LEAD,
  PANEL,
  PANEL_INNER,
  PANEL_SPACING,
  PILL_SMALL_GHOST,
  PILL_SMALL_INK,
  SITE_BAR,
  SITE_BAR_INNER,
  TITLE,
  WORDMARK,
} from "@/lib/site-design";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/Reveal";

/*
 * L'ossature des pages publiques : une barre, un pied de page, un hero, des
 * panneaux. Les pages composent, elles ne recopient pas le dessin.
 *
 * Deux choix assumés :
 *  - **des liens `<a>` et non le routeur** : les pages publiques sont rendues
 *    dans les tests hors de tout `Router` (`mentions.test.tsx`), et le
 *    pré-rendu du lot 2 les servira comme des documents. `sitePath()` pose le
 *    bon préfixe ;
 *  - **la barre ne dépend d'aucune session** : elle n'affiche ni compte, ni
 *    langue, ni état de connexion. Une page publique doit rester lisible quand
 *    l'authentification n'est pas configurée (`lib/public-shell.ts`).
 */

const { brand, role, cities, contactEmail } = AGENCY_IDENTITY;

/**
 * Les pages que la barre sait nommer, en plus du mot-marque qui ramène à
 * l'accueil. La Bande (`/monde`) a été retirée le 16/09/2026 : l'accueil est la
 * page unique du site, la barre ne nomme donc plus aucune page séparée. Les
 * textes légaux restent en pied de page, et chaque page garde son action propre
 * dans `actions`. La liste est conservée (vide) pour que l'ajout d'une page
 * publique soit un seul endroit à modifier.
 */
export const SITE_NAV: ReadonlyArray<{ path: string; label: string }> = [];

export function SiteHeader({
  current,
  actions,
}: {
  /** Chemin de la page affichée : son lien est marqué `aria-current`. */
  current?: string;
  /** Emplacement réservé à l'action propre à la page, à droite. */
  actions?: ReactNode;
}) {
  return (
    <header data-testid="site-header" className={SITE_BAR}>
      <div className={SITE_BAR_INNER}>
        <a
          href={sitePath("/")}
          data-testid="site-wordmark"
          aria-label="AIME — retour à l'accueil"
          className={cn(WORDMARK, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40")}
        >
          AIME
        </a>
        <nav aria-label="Pages du site" className="flex items-center gap-1.5 sm:gap-2">
          {SITE_NAV.map(item => (
            <a
              key={item.path}
              href={sitePath(item.path)}
              data-testid={`site-nav-${item.path.replace("/", "")}`}
              aria-current={current === item.path ? "page" : undefined}
              className={cn(
                "hidden h-8 items-center rounded-full px-3 text-xs motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40 sm:inline-flex",
                current === item.path
                  ? "bg-[var(--agency-ink)]/10 text-[var(--agency-ink)]"
                  : "text-[var(--agency-ink)]/75 hover:bg-[var(--agency-ink)]/10 hover:text-[var(--agency-ink)]",
              )}
            >
              {item.label}
            </a>
          ))}
          {actions}
        </nav>
      </div>
    </header>
  );
}

/** Le pied de page public : identité, pages, textes légaux. Rien d'autre. */
export function SiteFooter() {
  return (
    <footer
      data-testid="site-footer"
      className="relative z-10 border-t border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-6 pb-10 pt-14"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <p className={cn(WORDMARK, "text-[13px]")}>AIME</p>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-[var(--agency-body)]">
              {brand} — {role}. {cities.join(" · ")}.
            </p>
            <a
              href={`mailto:${contactEmail}`}
              data-testid="site-footer-email"
              className="mt-4 inline-block text-xs text-[var(--agency-ink)] underline decoration-[var(--agency-hairline)] underline-offset-4 motion-safe:transition hover:decoration-[var(--agency-index)]"
            >
              {contactEmail}
            </a>
          </div>
          <nav aria-label="Le site">
            <p className={EYEBROW}>Le site</p>
            <ul className="mt-4 space-y-2.5 text-xs text-[var(--agency-body)]">
              <li>
                <a href={sitePath("/")} className="motion-safe:transition hover:text-[var(--agency-ink)]">
                  Accueil
                </a>
              </li>
              {SITE_NAV.map(item => (
                <li key={item.path}>
                  <a
                    href={sitePath(item.path)}
                    data-testid={`site-footer-${item.path.replace("/", "")}`}
                    className="motion-safe:transition hover:text-[var(--agency-ink)]"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Informations légales" data-testid="site-footer-links">
            <p className={EYEBROW}>Informations légales</p>
            <ul className="mt-4 space-y-2.5 text-xs text-[var(--agency-body)]">
              <li>
                <a href={sitePath("/mentions-legales")} className="motion-safe:transition hover:text-[var(--agency-ink)]">
                  Mentions légales
                </a>
              </li>
              <li>
                <a href={sitePath("/confidentialite")} className="motion-safe:transition hover:text-[var(--agency-ink)]">
                  Confidentialité
                </a>
              </li>
              <li>
                <a href={sitePath("/conditions")} className="motion-safe:transition hover:text-[var(--agency-ink)]">
                  Conditions d’utilisation
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <p className="mt-12 border-t border-[var(--agency-hairline)] pt-6 text-[11px] uppercase tracking-[0.18em] text-[var(--agency-eyebrow)]">
          © {new Date().getFullYear()} {brand}
        </p>
      </div>
    </footer>
  );
}

/**
 * Ouverture d'une page publique : œil-de-bœuf, grand titre, amorce, puis ce que
 * la page veut poser là (un compositeur, un appel, un encadré).
 */
export function SiteHero({
  eyebrow,
  title,
  lead,
  children,
  testId,
  id,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
  testId?: string;
  /** Ancre de section, pour une navigation interne. */
  id?: string;
  /** Une page qui se lit ne prend pas tout l'écran : on passe `compact`. */
  className?: string;
}) {
  return (
    <section
      id={id}
      data-testid={testId}
      className={cn(
        "relative flex items-center justify-center overflow-hidden px-6 pb-16 pt-28 md:pb-20 md:pt-32",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-5xl text-center">
        <Reveal className="flex flex-col items-center">
          {eyebrow && <p className={EYEBROW}>{eyebrow}</p>}
          <h1 className={cn(TITLE, "mt-6 max-w-3xl text-4xl leading-tight md:text-6xl")}>{title}</h1>
          {lead && <p className={cn(LEAD, "mx-auto mt-6 max-w-2xl text-base md:text-lg")}>{lead}</p>}
        </Reveal>
        {children && <Reveal className="mt-10">{children}</Reveal>}
      </div>
    </section>
  );
}

/** Une tranche de page : titre centré facultatif, puis le contenu. */
export function SitePanel({
  eyebrow,
  title,
  lead,
  children,
  testId,
  id,
  narrow,
  className,
}: {
  eyebrow?: string;
  title?: string;
  lead?: ReactNode;
  children: ReactNode;
  testId?: string;
  id?: string;
  /** Contenu de lecture (textes légaux) plutôt que mise en scène. */
  narrow?: boolean;
  className?: string;
}) {
  return (
    <section id={id} data-testid={testId} className={cn(PANEL, PANEL_SPACING, className)}>
      <div className={cn(PANEL_INNER, narrow && "max-w-3xl")}>
        {(eyebrow || title || lead) && (
          <Reveal className="text-center">
            {eyebrow && <p className={EYEBROW}>{eyebrow}</p>}
            {title && <h2 className={cn(TITLE, "mt-5 text-3xl md:text-5xl")}>{title}</h2>}
            {lead && <p className={cn(LEAD, "mx-auto mt-5 max-w-2xl text-base md:text-lg")}>{lead}</p>}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}

/**
 * Un bloc titré à l'intérieur d'un panneau. Les textes légaux en sont faits :
 * un titre, un filet, du texte courant — pas de carte ni de décoration.
 */
export function SiteSection({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section data-testid={testId} className="mt-16 border-t border-[var(--agency-hairline)] pt-8 first:mt-0 first:border-t-0 first:pt-0">
      <h2 className={cn(TITLE, "text-2xl md:text-3xl")}>{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/**
 * Un choix répété en ligne, rendu comme un groupe de pilules : l'élément actif
 * est plein, les autres fantômes. `aria-pressed` porte l'état pour les lecteurs
 * d'écran — la couleur seule ne suffit pas.
 */
export function PillChoice<T extends string>({
  label,
  options,
  value,
  onChange,
  testId,
  groupLabel,
}: {
  label?: string;
  options: ReadonlyArray<{ id: T; label: string; hint?: string }>;
  value: T;
  onChange: (value: T) => void;
  testId: string;
  groupLabel: string;
}) {
  return (
    <div className={cn(CARD, "p-5")}>
      {label && <p className={EYEBROW}>{label}</p>}
      <div role="group" aria-label={groupLabel} className={cn("flex flex-wrap gap-2", label && "mt-4")}>
        {options.map(option => (
          <button
            key={option.id}
            type="button"
            data-testid={`${testId}-${option.id}`}
            aria-pressed={value === option.id}
            title={option.hint}
            onClick={() => onChange(option.id)}
            className={value === option.id ? PILL_SMALL_INK : PILL_SMALL_GHOST}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

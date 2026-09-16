import type { ReactNode } from "react";

import { SiteFooter, SiteHeader, SiteHero, SitePanel, SiteSection } from "@/components/SiteChrome";
import {
  AGENCY_HOST,
  AGENCY_IDENTITY,
  agencyLegalRows,
  missingAgencyLegalFields,
} from "@/lib/agency-identity";
import { useRouteMeta } from "@/lib/page-meta";
import { sitePath } from "@/lib/site-path";
import { BODY, CARD, EYEBROW, PILL_GHOST, PILL_INK } from "@/lib/site-design";
import { cn } from "@/lib/utils";

/*
 * Mentions légales de la vitrine — obligation française, pas une page produit.
 *
 * L'article 6 III-1 de la loi n° 2004-575 du 21 juin 2004 (LCEN) impose à tout
 * site professionnel de publier l'identité de son éditeur (raison sociale,
 * forme juridique, capital, immatriculation, adresse, téléphone), le directeur
 * de la publication et l'hébergeur. Le site n'avait que `/conditions` et
 * `/confidentialite`, deux textes écrits pour le pilote du logiciel AIME :
 * aucune de ces informations n'y figurait (constat §2.10 du plan).
 *
 * Tout vient de `lib/agency-identity.ts`. Les champs que la fondatrice n'a pas
 * encore fournis sont affichés comme manquants plutôt qu'inventés : une mention
 * légale fausse est plus grave qu'une mention incomplète. Tant que
 * `missingAgencyLegalFields()` n'est pas vide, la page le dit — et le site ne
 * peut pas être mis en ligne (lot 1.3 du plan).
 *
 * Dessin : l'ossature publique partagée (`components/SiteChrome.tsx`), comme
 * toutes les pages que l'on consulte sans compte.
 */

const { brand, role, contactEmail } = AGENCY_IDENTITY;

function Row({ label, hint, value }: { label: string; hint: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1 border-t border-[var(--agency-hairline)] py-4 sm:flex-row sm:items-baseline sm:gap-8">
      <dt className={cn(EYEBROW, "w-56 shrink-0 tracking-[0.28em]")}>{label}</dt>
      <dd className="text-[15px] leading-relaxed text-[var(--agency-ink)]">
        {value ?? (
          <span className="text-[var(--agency-body)]" data-testid={`legal-missing-${label}`}>
            À compléter avant mise en ligne — {hint}
          </span>
        )}
      </dd>
    </div>
  );
}

function Text({ children }: { children: ReactNode }) {
  return <p className={cn(BODY, "max-w-2xl")}>{children}</p>;
}

export function MentionsLegalesPage() {
  const rows = agencyLegalRows();
  const missing = missingAgencyLegalFields();

  useRouteMeta({
    title: `Mentions légales — ${brand}`,
    description: `Éditeur, hébergeur, directeur de la publication et données personnelles du site ${brand} — ${role}.`,
  });

  return (
    <>
      <SiteHeader current="/mentions-legales" />
      <main
        data-testid="mentions-page"
        className="min-h-[100dvh] bg-[var(--agency-paper)] text-[var(--agency-ink)] antialiased"
      >
        <SiteHero
          eyebrow="Informations légales"
          title="Mentions légales"
          lead={
            <>
              Ce site est édité dans le cadre de l&rsquo;article 6 III-1 de la loi
              n°&nbsp;2004-575 du 21 juin 2004 pour la confiance dans l&rsquo;économie
              numérique. Il présente une prestation d&rsquo;organisation de mariage ;
              les informations ci-dessous identifient qui le publie, qui
              l&rsquo;héberge et comment exercer ses droits sur ses données.
            </>
          }
          className="min-h-0 pb-4"
        />

        <SitePanel narrow className="border-t-0 pt-0 md:pt-0">
          {missing.length > 0 && (
            <div
              data-testid="legal-incomplete"
              role="status"
              className={cn(CARD, "mb-16 p-6")}
            >
              <p className={cn(EYEBROW, "text-[var(--agency-index)]")}>À compléter</p>
              <p className={cn(BODY, "mt-3")}>
                <strong className="font-medium text-[var(--agency-ink)]">
                  Page non publiable en l&rsquo;état.
                </strong>{" "}
                {missing.length} champ{missing.length > 1 ? "s" : ""} d&rsquo;identité
                légale {missing.length > 1 ? "restent" : "reste"} à fournir : il
                {missing.length > 1 ? "s" : ""} est signalé comme manquant
                ci-dessous.
              </p>
            </div>
          )}

          <SiteSection title="Éditeur du site">
            <dl data-testid="legal-editor" className="mb-2">
              {rows.map(row => (
                <Row key={row.field} label={row.label} hint={row.hint} value={row.value} />
              ))}
              <Row
                label="Nom d&rsquo;enseigne"
                hint="Nom commercial affiché sur le site."
                value={`${brand} — ${role}`}
              />
              <Row label="Courriel" hint="Adresse de contact du site." value={contactEmail} />
            </dl>
          </SiteSection>

          <SiteSection title="Hébergement">
            <dl data-testid="legal-host">
              <Row label="Hébergeur" hint="Nom de l'hébergeur." value={AGENCY_HOST.name} />
              <Row
                label="Adresse de l&rsquo;hébergeur"
                hint="Adresse postale de l'hébergeur."
                value={AGENCY_HOST.address}
              />
              <Row
                label="Site de l&rsquo;hébergeur"
                hint="Adresse web de l'hébergeur."
                value={AGENCY_HOST.url}
              />
            </dl>
          </SiteSection>

          <SiteSection title="Données personnelles">
            <Text>
              Les demandes adressées à {brand} (courriel, et à terme le formulaire de
              contact de la vitrine) servent uniquement à répondre à une demande de
              mariage et à préparer un rendez-vous. Elles ne sont ni revendues, ni
              utilisées pour du démarchage. Chaque personne dispose d&rsquo;un droit
              d&rsquo;accès, de rectification, d&rsquo;effacement et
              d&rsquo;opposition, exerçable en écrivant à{" "}
              <a href={`mailto:${contactEmail}`} className="text-[var(--agency-ink)] underline underline-offset-4">
                {contactEmail}
              </a>
              , et peut adresser une réclamation à la CNIL. Le détail des traitements
              est dans la{" "}
              <a href={sitePath("/confidentialite")} className="text-[var(--agency-ink)] underline underline-offset-4">
                politique de confidentialité
              </a>
              .
            </Text>
          </SiteSection>

          <SiteSection title="Propriété intellectuelle">
            <Text>
              Les textes, la marque, la charte graphique et les visuels de ce site
              sont la propriété de l&rsquo;éditeur, sauf mention contraire. Toute
              reproduction, même partielle, suppose un accord écrit préalable. Les
              photographies de mariages publiées ici le sont avec l&rsquo;accord des
              personnes concernées ; un retrait peut être demandé à tout moment à
              l&rsquo;adresse ci-dessus.
            </Text>
          </SiteSection>

          <div className="mt-16 flex flex-wrap items-center gap-3 border-t border-[var(--agency-hairline)] pt-8">
            <a href={sitePath("/")} className={PILL_INK}>
              Retour à l’accueil
            </a>
            <a href={sitePath("/confidentialite")} className={PILL_GHOST}>
              Confidentialité
            </a>
            <a href={sitePath("/conditions")} className={PILL_GHOST}>
              Conditions d’utilisation
            </a>
          </div>
        </SitePanel>
      </main>
      <SiteFooter />
    </>
  );
}

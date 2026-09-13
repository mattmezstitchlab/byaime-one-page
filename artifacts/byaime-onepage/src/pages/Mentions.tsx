import type { ReactNode } from "react";
import { AGENCY_HOST, AGENCY_IDENTITY, agencyLegalRows, missingAgencyLegalFields } from "@/lib/agency-identity";
import { useRouteMeta } from "@/lib/page-meta";
import { sitePath } from "@/lib/site-path";

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
 */

const { brand, role, contactEmail } = AGENCY_IDENTITY;

function Row({ label, hint, value }: { label: string; hint: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1 border-t border-[var(--agency-hairline)] py-4 sm:flex-row sm:items-baseline sm:gap-8">
      <dt className="w-56 shrink-0 text-[11px] uppercase tracking-[0.28em] text-[var(--agency-eyebrow)]">
        {label}
      </dt>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-16">
      <h2 className="agency-serif text-2xl text-[var(--agency-ink)] sm:text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function MentionsLegalesPage() {
  const rows = agencyLegalRows();
  const missing = missingAgencyLegalFields();

  useRouteMeta({
    title: `Mentions légales — ${brand}`,
    description: `Éditeur, hébergeur, directeur de la publication et données personnelles du site ${brand} — ${role}.`,
  });

  return (
    <main
      data-testid="mentions-page"
      className="min-h-[100dvh] bg-[var(--agency-paper)] px-6 py-16 text-[var(--agency-ink)] antialiased md:px-10"
    >
      <div className="mx-auto max-w-3xl">
        <a
          href={sitePath("/agence")}
          className="agency-serif text-lg text-[var(--agency-ink)] hover:opacity-70"
        >
          {brand}
        </a>

        <p className="mt-20 text-[11px] uppercase tracking-[0.38em] text-[var(--agency-eyebrow)]">
          Informations légales
        </p>
        <h1 className="agency-serif mt-5 text-4xl leading-tight text-[var(--agency-ink)] sm:text-5xl">
          Mentions légales
        </h1>
        <p className="mt-7 max-w-2xl text-[15px] leading-relaxed text-[var(--agency-body)]">
          Ce site est édité dans le cadre de l&rsquo;article 6 III-1 de la loi
          n°&nbsp;2004-575 du 21 juin 2004 pour la confiance dans l&rsquo;économie
          numérique. Il présente une prestation d&rsquo;organisation de mariage ;
          les informations ci-dessous identifient qui le publie, qui l&rsquo;héberge
          et comment exercer ses droits sur ses données.
        </p>

        {missing.length > 0 && (
          <p
            data-testid="legal-incomplete"
            role="status"
            className="mt-10 border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 text-[13px] leading-relaxed text-[var(--agency-body)]"
          >
            <strong className="font-medium text-[var(--agency-ink)]">
              Page non publiable en l&rsquo;état.
            </strong>{" "}
            {missing.length} champ{missing.length > 1 ? "s" : ""} d&rsquo;identité légale{" "}
            {missing.length > 1 ? "restent" : "reste"} à fournir : il{" "}
            {missing.length > 1 ? "s" : ""} est signalé comme manquant ci-dessous.
          </p>
        )}

        <Section title="Éditeur du site">
          <dl data-testid="legal-editor" className="mb-2">
            {rows.map(row => (
              <Row key={row.field} label={row.label} hint={row.hint} value={row.value} />
            ))}
            <Row label="Nom d&rsquo;enseigne" hint="Nom commercial affiché sur le site." value={`${brand} — ${role}`} />
            <Row label="Courriel" hint="Adresse de contact du site." value={contactEmail} />
          </dl>
        </Section>

        <Section title="Hébergement">
          <dl data-testid="legal-host">
            <Row label="Hébergeur" hint="Nom de l'hébergeur." value={AGENCY_HOST.name} />
            <Row label="Adresse de l&rsquo;hébergeur" hint="Adresse postale de l'hébergeur." value={AGENCY_HOST.address} />
            <Row label="Site de l&rsquo;hébergeur" hint="Adresse web de l'hébergeur." value={AGENCY_HOST.url} />
          </dl>
        </Section>

        <Section title="Données personnelles">
          <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--agency-body)]">
            Les demandes adressées à {brand} (courriel, et à terme le formulaire de
            contact de la vitrine) servent uniquement à répondre à une demande de
            mariage et à préparer un rendez-vous. Elles ne sont ni revendues, ni
            utilisées pour du démarchage. Chaque personne dispose d&rsquo;un droit
            d&rsquo;accès, de rectification, d&rsquo;effacement et d&rsquo;opposition,
            exerçable en écrivant à{" "}
            <a href={`mailto:${contactEmail}`} className="text-[var(--agency-ink)] underline underline-offset-4">
              {contactEmail}
            </a>
            , et peut adresser une réclamation à la CNIL. Le détail des traitements
            est dans la{" "}
            <a href={sitePath("/confidentialite")} className="text-[var(--agency-ink)] underline underline-offset-4">
              politique de confidentialité
            </a>
            .
          </p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--agency-body)]">
            Les textes, la marque, la charte graphique et les visuels de ce site sont
            la propriété de l&rsquo;éditeur, sauf mention contraire. Toute
            reproduction, même partielle, suppose un accord écrit préalable. Les
            photographies de mariages publiées ici le sont avec l&rsquo;accord des
            personnes concernées ; un retrait peut être demandé à tout moment à
            l&rsquo;adresse ci-dessus.
          </p>
        </Section>

        <div className="mt-16 flex flex-wrap gap-3 border-t border-[var(--agency-hairline)] pt-8 text-[11px] uppercase tracking-[0.28em]">
          <a href={sitePath("/agence")} className="border border-[var(--agency-ink)] px-5 py-3 text-[var(--agency-ink)] transition-colors hover:bg-[var(--agency-ink)] hover:text-[var(--agency-paper)]">
            Retour à la vitrine
          </a>
          <a href={sitePath("/confidentialite")} className="px-5 py-3 text-[var(--agency-body)] hover:text-[var(--agency-ink)]">
            Confidentialité
          </a>
          <a href={sitePath("/conditions")} className="px-5 py-3 text-[var(--agency-body)] hover:text-[var(--agency-ink)]">
            Conditions
          </a>
        </div>
      </div>
    </main>
  );
}

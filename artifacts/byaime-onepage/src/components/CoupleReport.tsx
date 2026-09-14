import type { Rapport } from "@/lib/rapport";
import { formatCents } from "@/lib/money";
import { AGENCY_IDENTITY } from "@/lib/agency-identity";

/*
 * Le livrable : une page verticale, ivoire et charbon, qui présente le mariage
 * tel qu'il a été construit — déroulé du Jour J, argent, invités, tâches,
 * documents. Même direction artistique que la vitrine de l'agence : une serif
 * de titrage, des hairlines, beaucoup de vide — les mêmes jetons `--agency-*`
 * que la vitrine, plus de couleurs recopiées ici. Pensée pour être imprimée ou
 * partagée telle quelle ; aucune donnée à ressaisir, tout vient du Monde.
 *
 * Une section vide disparaît : le rapport ne montre que ce qui existe.
 */

const { brand, role } = AGENCY_IDENTITY;

/* Les couleurs viennent des jetons de la vitrine (`index.css`) : un seul jeu,
 * mesuré AA sur le blanc par `agency-theme.test.ts`. La serif de titrage est la
 * classe `.agency-serif`, plus une constante recopiée par fichier. */
const ink = "text-[var(--agency-ink)]";
const muted = "text-[var(--agency-body)]";
const hairline = "border-[var(--agency-hairline)]";

const dateLong = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const timeShort = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

const providerStatus: Record<string, string> = {
  recherche: "En recherche",
  contacte: "Contacté",
  rencontre: "Rencontré",
  devis: "Devis reçu",
  reserve: "Réservé",
};

const documentKind: Record<string, string> = {
  devis: "Devis",
  contrat: "Contrat",
  facture: "Facture",
  autre: "Document",
};

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-[11px] uppercase tracking-[0.38em] text-[var(--agency-eyebrow)]">{children}</h2>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className={`agency-serif text-3xl ${ink}`}>{value}</p>
      <p className={`mt-1 text-[11px] uppercase tracking-[0.25em] ${muted}`}>{label}</p>
    </div>
  );
}

export function CoupleReport({
  rapport,
  title,
  subtitle,
  currency = null,
  now = Date.now(),
}: {
  rapport: Rapport;
  title: string;
  subtitle?: string;
  currency?: string | null;
  now?: number;
}) {

  return (
    <article data-testid="couple-report" className="mx-auto max-w-2xl bg-[var(--agency-paper)] px-6 py-16 text-[var(--agency-ink)]">
      {/* ————— Frontispice ————— */}
      <header className="text-center">
        <p className="text-[11px] uppercase tracking-[0.38em] text-[var(--agency-eyebrow)]">Le rapport</p>
        <h1 className={`agency-serif mt-6 text-4xl leading-tight sm:text-5xl ${ink}`}>
          {title}
        </h1>
        {subtitle ? (
          <p className={`mt-4 text-[15px] ${muted}`}>{subtitle}</p>
        ) : null}
        <p className={`mt-6 text-[11px] uppercase tracking-[0.25em] ${muted}`}>
          Présenté le {dateLong.format(now)}
        </p>
      </header>

      {/* ————— Le Jour J ————— */}
      {rapport.moments.length > 0 ? (
        <section data-testid="couple-report-moments" className={`mt-16 border-t ${hairline} pt-10`}>
          <SectionTitle>Le Jour J, minute par minute</SectionTitle>
          <ol className="mt-8">
            {rapport.moments.map(moment => (
              <li key={moment.id} className={`flex items-baseline gap-6 border-t ${hairline} py-4 first:border-t-0`}>
                <span className="w-14 shrink-0 text-[13px] tabular-nums tracking-wide text-[var(--agency-eyebrow)]">
                  {timeShort.format(moment.time)}
                </span>
                <span className={`agency-serif text-lg ${ink}`}>{moment.title}</span>
                {moment.location ? (
                  <span className={`ml-auto text-[12px] ${muted}`}>{moment.location}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* ————— L'argent ————— */}
      {rapport.budget ? (
        <section data-testid="couple-report-budget" className={`mt-16 border-t ${hairline} pt-10`}>
          <SectionTitle>L&rsquo;argent</SectionTitle>
          <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <Figure value={formatCents(rapport.budget.engagedCents, currency)} label="Engagé" />
            <Figure value={formatCents(rapport.budget.paidCents, currency)} label="Payé" />
            <Figure value={formatCents(rapport.budget.dueCents, currency)} label="Échu" />
            <Figure value={formatCents(Math.max(0, rapport.budget.remainingCents), currency)} label="Restant" />
          </div>
          {rapport.budget.rows.length > 0 ? (
            <ul className="mt-10">
              {rapport.budget.rows.map(row => (
                <li key={row.id} className={`flex items-baseline gap-4 border-t ${hairline} py-4 first:border-t-0`}>
                  <span className={`agency-serif text-[15px] ${ink}`}>{row.name}</span>
                  <span className={`text-[11px] uppercase tracking-[0.2em] ${muted}`}>
                    {providerStatus[row.status] ?? row.status}
                  </span>
                  <span className="ml-auto text-[14px] tabular-nums text-[var(--agency-body)]">
                    {row.amountCents !== undefined ? formatCents(row.amountCents, currency) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* ————— Les invités ————— */}
      {rapport.invites ? (
        <section data-testid="couple-report-invites" className={`mt-16 border-t ${hairline} pt-10`}>
          <SectionTitle>Les invités</SectionTitle>
          <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <Figure value={String(rapport.invites.total)} label="Invités" />
            <Figure value={String(rapport.invites.confirmed)} label="Confirmés" />
            <Figure value={String(rapport.invites.waiting)} label="En attente" />
            <Figure value={String(rapport.invites.declined)} label="Déclinés" />
          </div>
        </section>
      ) : null}

      {/* ————— Les tâches ————— */}
      {rapport.tasks ? (
        <section data-testid="couple-report-tasks" className={`mt-16 border-t ${hairline} pt-10`}>
          <SectionTitle>Les tâches</SectionTitle>
          <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <Figure value={String(rapport.tasks.total)} label="Au plan" />
            <Figure value={String(rapport.tasks.done)} label="Closes" />
            <Figure value={String(rapport.tasks.open)} label="En cours" />
            <Figure value={String(rapport.tasks.late)} label="En retard" />
          </div>
        </section>
      ) : null}

      {/* ————— Les documents ————— */}
      {rapport.documents.length > 0 ? (
        <section data-testid="couple-report-documents" className={`mt-16 border-t ${hairline} pt-10`}>
          <SectionTitle>Les documents</SectionTitle>
          <ul className="mt-8">
            {rapport.documents.map(doc => (
              <li key={doc.id} className={`flex items-baseline gap-4 border-t ${hairline} py-4 first:border-t-0`}>
                <span className={`w-20 shrink-0 text-[11px] uppercase tracking-[0.2em] ${muted}`}>
                  {documentKind[doc.kind] ?? "Document"}
                </span>
                <span className={`agency-serif text-[15px] ${ink}`}>{doc.title}</span>
                <span className={`ml-auto text-[12px] ${muted}`}>{dateLong.format(doc.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ————— Colophon ————— */}
      <footer className={`mt-16 border-t ${hairline} pt-8 text-center`}>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--agency-eyebrow)]">
          {brand} — {role}
        </p>
      </footer>
    </article>
  );
}

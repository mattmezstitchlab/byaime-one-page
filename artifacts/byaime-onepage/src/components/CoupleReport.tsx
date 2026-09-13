import type { Rapport } from "@/lib/rapport";
import { formatCents } from "@/lib/money";

/*
 * Le livrable : une page verticale, ivoire et charbon, qui présente le mariage
 * tel qu'il a été construit — déroulé du Jour J, argent, invités, tâches,
 * documents. Même direction artistique que la vitrine de l'agence : une serif
 * de titrage, des hairlines, beaucoup de vide. Pensée pour être imprimée ou
 * partagée telle quelle ; aucune donnée à ressaisir, tout vient du Monde.
 *
 * Une section vide disparaît : le rapport ne montre que ce qui existe.
 */

const serif = {
  fontFamily:
    "'Didot', 'Bodoni MT', 'Playfair Display', 'Cormorant Garamond', Georgia, 'Times New Roman', serif",
} as const;

const ink = "text-[#171410]";
const muted = "text-[#6F6A61]";
const hairline = "border-[#E6E1D8]";

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
    <h2 className="text-[11px] uppercase tracking-[0.38em] text-[#8A8375]">{children}</h2>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className={`text-3xl ${ink}`} style={serif}>{value}</p>
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
    <article data-testid="couple-report" className="mx-auto max-w-2xl bg-[#FFFFFF] px-6 py-16 text-[#171410]">
      {/* ————— Frontispice ————— */}
      <header className="text-center">
        <p className="text-[11px] uppercase tracking-[0.38em] text-[#8A8375]">Le rapport</p>
        <h1 className={`mt-6 text-4xl leading-tight sm:text-5xl ${ink}`} style={serif}>
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
                <span className="w-14 shrink-0 text-[13px] tabular-nums tracking-wide text-[#8A8375]">
                  {timeShort.format(moment.time)}
                </span>
                <span className={`text-lg ${ink}`} style={serif}>{moment.title}</span>
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
                  <span className={`text-[15px] ${ink}`} style={serif}>{row.name}</span>
                  <span className={`text-[11px] uppercase tracking-[0.2em] ${muted}`}>
                    {providerStatus[row.status] ?? row.status}
                  </span>
                  <span className="ml-auto text-[14px] tabular-nums text-[#4c463d]">
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
                <span className={`text-[15px] ${ink}`} style={serif}>{doc.title}</span>
                <span className={`ml-auto text-[12px] ${muted}`}>{dateLong.format(doc.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ————— Colophon ————— */}
      <footer className={`mt-16 border-t ${hairline} pt-8 text-center`}>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#8A8375]">
          La cerise sur le gâteau — Wedding Architect
        </p>
      </footer>
    </article>
  );
}

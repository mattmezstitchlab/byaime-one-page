import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { UniversalCardForm } from "@/components/UniversalCardForm";
import { useI18n } from "@/lib/i18n";

/**
 * Espace Carte — une surface distincte du Monde Mariage.
 *
 * La carte décrit la personne et ses activités réutilisables. Elle ne doit pas
 * ressembler à une étape de création du mariage : le mariage se pilote dans la
 * Timeline, ici on gère uniquement ce qui nous suit d'un Monde à l'autre.
 */
export function CardSite() {
  const { t } = useI18n();

  return (
    <main
      data-testid="card-site"
      className="min-h-[100dvh] bg-[#f7f4ef] text-[var(--agency-ink)]"
    >
      <header className="border-b border-[var(--agency-ink)]/10 bg-[#f7f4ef]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            href="/user-portal"
            data-testid="card-site-back"
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-xs text-[var(--agency-body)] transition hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            {t("card.site.back")}
          </Link>
          <span className="font-display text-sm font-medium tracking-[0.28em]">AIME</span>
          <span className="w-24" aria-hidden />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--agency-eyebrow)]">
            {t("card.site.eyebrow")}
          </p>
          <h1 className="mt-4 font-display text-4xl font-medium leading-tight tracking-tight sm:text-6xl">
            {t("card.site.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[var(--agency-body)] sm:text-base">
            {t("card.site.description")}
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--agency-ink)]/10 bg-white/50 px-4 py-2 text-[11px] text-[var(--agency-body)]">
            <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
            {t("card.site.private")}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <UniversalCardForm
            signedIn
            onBack={() => window.history.length > 1 ? window.history.back() : undefined}
            onCreateWedding={() => {
              window.location.assign("/user-portal");
            }}
          />
        </div>
      </div>
    </main>
  );
}

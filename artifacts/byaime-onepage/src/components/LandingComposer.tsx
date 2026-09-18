import { ArrowRight, CreditCard, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/*
 * La porte d'entrée n'est plus un formulaire de Carte Universelle.
 *
 * La carte personnelle vit dans son propre espace (`/ma-carte`). L'accueil
 * doit répondre à une seule question : « où vais-je ? » → la Timeline du
 * mariage. Le détail se renseigne ensuite depuis la Timeline, ou depuis le
 * bouton + et l'agent AIME.
 *
 * `composeIntention` reste exportée pour les anciens liens et les brouillons
 * déjà enregistrés ; elle n'est simplement plus rendue dans l'accueil.
 */
export { composeIntention } from "@/lib/wedding-answers";

export function LandingComposer({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();
  const timelineHref = signedIn
    ? "/user-portal"
    : "/creation?returnTo=%2Fuser-portal";
  const cardHref = signedIn
    ? "/ma-carte"
    : "/creation?returnTo=%2Fma-carte";

  return (
    <div data-testid="landing-composer" className="mx-auto w-full max-w-2xl text-left">
      <div
        data-testid="timeline-entry"
        className="relative overflow-hidden rounded-[2rem] border border-[var(--agency-ink)]/15 bg-[var(--agency-ink)] p-6 text-[var(--agency-paper)] shadow-[0_24px_70px_-28px_rgba(23,20,16,0.55)] sm:p-8"
      >
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--agency-paper)]/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--agency-paper)]/60">
            <Sparkles aria-hidden className="h-3.5 w-3.5" />
            {t("timeline.entry.eyebrow")}
          </div>
          <h2 className="mt-4 max-w-xl font-display text-3xl font-medium leading-[1.05] tracking-tight sm:text-4xl">
            {t("timeline.entry.title")}
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--agency-paper)]/68 sm:text-base">
            {t("timeline.entry.description")}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={timelineHref}
              data-testid="landing-open-timeline"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--agency-paper)] px-6 text-sm font-semibold text-[var(--agency-ink)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-paper)]/70"
            >
              {t(signedIn ? "timeline.entry.open" : "timeline.entry.createSpace")}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <Link
              href={cardHref}
              data-testid="landing-open-card"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--agency-paper)]/25 px-5 text-sm text-[var(--agency-paper)]/78 transition hover:border-[var(--agency-paper)]/60 hover:text-[var(--agency-paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-paper)]/70"
            >
              <CreditCard aria-hidden className="h-4 w-4" />
              {t("timeline.entry.card")}
            </Link>
          </div>
          <p className="mt-5 text-[11px] leading-relaxed text-[var(--agency-paper)]/45">
            {t("timeline.entry.cardHint")}
          </p>
        </div>
      </div>
      <p className={cn("mt-3 text-center text-[11px] text-[var(--agency-eyebrow)]", "sm:text-left")}>
        {t("timeline.entry.footer")}
      </p>
    </div>
  );
}

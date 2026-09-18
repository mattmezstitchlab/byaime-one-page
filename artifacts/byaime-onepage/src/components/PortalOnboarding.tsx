import { useState } from "react";
import { ArrowRight, CreditCard, Plus, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useProject } from "@/store/project-store";
import { useI18n } from "@/lib/i18n";
import { parseIntention } from "@/lib/parser";
import { cn } from "@/lib/utils";

/**
 * État de départ de l'espace privé : pas de second onboarding, pas de Carte
 * Universelle au milieu du mariage. On ouvre d'abord le fil vertical, puis on
 * complète ce qui manque depuis le fil ou depuis le + / AIME.
 *
 * La carte personnelle reste accessible dans son espace séparé (`/ma-carte`).
 * Le champ libre est volontairement optionnel : il permet à AIME de préremplir
 * les quelques faits reconnus, mais ne transforme pas l'entrée en questionnaire.
 */
export function PortalOnboarding() {
  const {
    createProjectFromDraft,
    createWeddingDemo,
  } = useProject();
  const { t } = useI18n();
  const [intention, setIntention] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const openTimeline = () => {
    setError("");
    setStarting(true);
    const clean = intention.trim();
    if (clean) {
      createProjectFromDraft(parseIntention(clean), clean);
    } else {
      createProjectFromDraft(
        { title: "Mon mariage", universe: "Mariage" },
        "",
      );
    }
  };

  const useAgent = () => {
    if (!intention.trim()) {
      setError(t("timeline.start.error"));
      return;
    }
    openTimeline();
  };

  return (
    <section
      data-testid="timeline-start"
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[var(--agency-paper)] px-5 py-12 text-[var(--agency-ink)] sm:px-8"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(195,159,113,0.18),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(113,156,160,0.16),transparent_36%)]" />
      <div className="relative z-10 w-full max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            data-testid="timeline-start-home"
            className="font-display text-sm font-medium tracking-[0.28em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
          >
            AIME
          </Link>
          <Link
            href="/ma-carte"
            data-testid="timeline-start-card"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--agency-ink)]/15 px-4 text-xs text-[var(--agency-body)] transition hover:border-[var(--agency-ink)]/40 hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
          >
            <CreditCard aria-hidden className="h-3.5 w-3.5" />
            {t("timeline.entry.card")}
          </Link>
        </div>

        <div className="mt-16 grid gap-10 md:grid-cols-[1.08fr_.92fr] md:items-end md:gap-14">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--agency-eyebrow)]">
              <Sparkles aria-hidden className="h-3.5 w-3.5" />
              {t("timeline.start.eyebrow")}
            </p>
            <h1 className="mt-5 font-display text-5xl font-medium leading-[.98] tracking-tight sm:text-7xl">
              {t("timeline.start.title")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--agency-body)] sm:text-lg">
              {t("timeline.start.description")}
            </p>
          </div>

          <div className="rounded-[2rem] border border-[var(--agency-ink)]/12 bg-white/70 p-5 shadow-[0_24px_70px_-38px_rgba(23,20,16,0.45)] backdrop-blur sm:p-7">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--agency-ink)] text-[var(--agency-paper)]">
                <Plus aria-hidden className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{t("timeline.start.oneClick")}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--agency-body)]">
                  {t("timeline.start.oneClickHint")}
                </p>
              </div>
            </div>

            <button
              type="button"
              data-testid="timeline-start-empty"
              disabled={starting}
              onClick={openTimeline}
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--agency-ink)] px-6 text-sm font-semibold text-[var(--agency-paper)] transition hover:opacity-85 disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/50"
            >
              {t("timeline.start.open")}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </button>

            <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[.18em] text-[var(--agency-eyebrow)]">
              <span className="h-px flex-1 bg-[var(--agency-ink)]/10" />
              {t("timeline.start.or")}
              <span className="h-px flex-1 bg-[var(--agency-ink)]/10" />
            </div>

            <form
              data-testid="timeline-start-agent"
              onSubmit={(event) => {
                event.preventDefault();
                useAgent();
              }}
              className="space-y-3"
            >
              <label htmlFor="timeline-start-intention" className="text-xs font-medium text-[var(--agency-ink)]/75">
                {t("timeline.start.agentLabel")}
              </label>
              <textarea
                id="timeline-start-intention"
                data-testid="timeline-start-input"
                value={intention}
                onChange={(event) => {
                  setIntention(event.target.value);
                  setError("");
                }}
                rows={3}
                placeholder={t("timeline.start.placeholder")}
                className="w-full resize-none rounded-2xl border border-[var(--agency-ink)]/15 bg-[var(--agency-paper)] px-4 py-3 text-sm leading-relaxed text-[var(--agency-ink)] outline-none transition placeholder:text-[var(--agency-body)]/55 focus:border-[var(--agency-ink)]/45 focus:ring-2 focus:ring-[var(--agency-ink)]/10"
              />
              {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
              <button
                type="submit"
                data-testid="timeline-start-agent-submit"
                disabled={starting || !intention.trim()}
                className={cn(
                  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--agency-ink)]/20 px-5 text-sm font-medium text-[var(--agency-ink)] transition hover:border-[var(--agency-ink)]/50 hover:bg-[var(--agency-ink)]/[.04] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40",
                )}
              >
                <Sparkles aria-hidden className="h-4 w-4" />
                {t("timeline.start.agentSubmit")}
              </button>
            </form>

            <button
              type="button"
              data-testid="demo-project"
              onClick={() => {
                setStarting(true);
                createWeddingDemo();
              }}
              className="mt-5 w-full text-center text-[11px] text-[var(--agency-body)] underline decoration-[var(--agency-ink)]/20 underline-offset-4 transition hover:text-[var(--agency-ink)]"
            >
              {t("timeline.start.demo")}
            </button>
          </div>
        </div>

        <p className="mt-10 text-center text-[11px] leading-relaxed text-[var(--agency-eyebrow)] md:text-left">
          {t("timeline.start.footer")}
        </p>
      </div>
    </section>
  );
}

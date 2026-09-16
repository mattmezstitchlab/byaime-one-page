import { ArrowLeft, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/*
 * Le cadre générique du Oneboarding BYAIME : « Question X sur N » → Continuer.
 *
 * Extrait tel quel de `LandingComposer` (le tunnel « Créer un mariage ») : même
 * markup, mêmes clés i18n (`composer.step`, `composer.continue`,
 * `composer.skip`, `composer.back`), mêmes `data-testid`. Ce composant ne sait
 * rien du contenu d'une étape : il pose le repère, la progression et les deux
 * actions. Le contenu vient de `children`, choisi par `lib/oneboarding-plan.ts`.
 *
 * Règle de conception : **aucune logique métier ici**. Si une étape doit
 * enregistrer, c'est l'orchestrateur (`OneboardingFlow`) qui le fait et qui
 * traduit le résultat en `notice` / `failure` — jamais ce cadre.
 */

export const ONEBOARDING_TOTAL_STEPS = 5;

export type StepFlowProps = {
  /** Numéro de l'étape courante, à partir de 1. */
  current: number;
  /** Repère stable : 5 par défaut. Ne change pas quand une étape est déjà connue. */
  total?: number;
  /** Identifiant de test du conteneur (`landing-intention-form` pour le tunnel mariage). */
  testId?: string;
  backTestId?: string;
  skipTestId?: string;
  submitTestId?: string;
  /** Libellé du bouton principal ; par défaut « Continuer ». */
  continueLabel?: string;
  /** Un bouton « Passer » n'apparaît que si ce rappel est fourni. */
  onSkip?: () => void;
  onBack?: () => void;
  onSubmit: () => void;
  /** En cours d'enregistrement : le cadre se verrouille, rien n'est perdu. */
  busy?: boolean;
  continueDisabled?: boolean;
  /** Une étape déjà connue le dit ici, sans changer le repère « Question X sur 5 ». */
  knownBadge?: string;
  children: ReactNode;
};

export function StepFlow({
  current,
  total = ONEBOARDING_TOTAL_STEPS,
  testId = "step-flow",
  backTestId = "step-flow-back",
  skipTestId = "step-flow-skip",
  submitTestId = "step-flow-submit",
  continueLabel,
  onSkip,
  onBack,
  onSubmit,
  busy = false,
  continueDisabled = false,
  knownBadge,
  children,
}: StepFlowProps) {
  const { t } = useI18n();
  const stepLabel = t("composer.step", { current, total });

  return (
    <form
      data-testid={testId}
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && !continueDisabled) onSubmit();
      }}
      className="rounded-[2rem] border border-white/15 bg-[#171410] p-6 text-white backdrop-blur-xl sm:p-8"
    >
      <div className="flex items-center justify-between gap-4">
        {onBack ? (
          <button
            type="button"
            data-testid={backTestId}
            disabled={busy}
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12.5px] text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {t("composer.back")}
          </button>
        ) : (
          <span aria-hidden />
        )}
        <p aria-hidden className="text-[12px] tabular-nums text-white/55">
          {stepLabel}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={stepLabel}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        className="mt-3 h-1 overflow-hidden rounded-full bg-white/12"
      >
        <div
          aria-hidden
          className="h-full rounded-full bg-white/80 transition-all"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>

      {knownBadge ? (
        <p
          data-testid="step-flow-known"
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#A9E5C3]/50 bg-[#ECFDF5]/10 px-3 py-1 text-[11.5px] text-[#A9E5C3]"
        >
          {knownBadge}
        </p>
      ) : null}

      {children}

      <div className="mt-6 flex items-center justify-between gap-3">
        {onSkip ? (
          <button
            type="button"
            data-testid={skipTestId}
            disabled={busy}
            onClick={onSkip}
            className="rounded-full px-4 py-2.5 text-[12.5px] uppercase tracking-[.12em] text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {t("composer.skip")}
          </button>
        ) : (
          <span aria-hidden />
        )}
        <button
          type="submit"
          data-testid={submitTestId}
          disabled={busy || continueDisabled}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {busy ? "Enregistrement…" : (continueLabel ?? t("composer.continue"))}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </form>
  );
}

/**
 * Le contrat de sauvegarde, affiché une seule fois par étape.
 *
 * Trois états, jamais quatre, et jamais de réussite sans persistance réelle :
 *  - `draft` : rien n'a quitté l'appareil, la personne peut continuer ;
 *  - `saved` : le service a répondu 2xx ;
 *  - `failure` : le service a refusé ou n'a pas répondu — la saisie est
 *    conservée, « Réessayer » est proposé, et l'étape suivante est interdite.
 */
export type SaveNotice =
  | { kind: "idle" }
  | { kind: "draft"; message: string }
  | { kind: "saved"; message: string }
  | { kind: "failure"; message: string };

export const NOTICE_TONE = {
  draft: "border-white/20 bg-white/[0.06] text-white/75",
  saved: "border-[#A9E5C3]/50 bg-[#ECFDF5]/10 text-[#A9E5C3]",
  failure: "border-[#FECACA]/50 bg-[#FEF2F2]/10 text-[#FECACA]",
} as const;

export function SaveNoticeBanner({
  notice,
  onRetry,
  retryLabel = "Réessayer",
}: {
  notice: SaveNotice;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  if (notice.kind === "idle") return null;
  const tone = NOTICE_TONE[notice.kind];
  const label =
    notice.kind === "draft"
      ? "Brouillon local"
      : notice.kind === "saved"
        ? "Enregistré"
        : "Non enregistré";
  return (
    <div
      data-testid="save-notice"
      data-save-state={notice.kind}
      role={notice.kind === "failure" ? "alert" : "status"}
      className={cn("mt-5 rounded-2xl border px-4 py-3 text-[12.5px] leading-relaxed", tone)}
    >
      <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-1">{notice.message}</p>
      {notice.kind === "failure" && onRetry ? (
        <button
          type="button"
          data-testid="save-notice-retry"
          onClick={onRetry}
          className="mt-3 inline-flex min-h-11 items-center rounded-full border border-current/40 px-5 text-[13px] font-medium transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/60"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

/** Un bloc d'informations déjà connues : lecture seule, avec « Modifier ». */
export function KnownSummary({
  title,
  lines,
  onEdit,
  editLabel = "Modifier",
}: {
  title: string;
  lines: string[];
  onEdit?: () => void;
  editLabel?: string;
}) {
  const visible = lines.filter((line) => line.trim().length > 0);
  return (
    <div className="mt-5 rounded-2xl border border-white/20 bg-white/[0.04] p-4">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/45">
        {title}
      </p>
      {visible.length ? (
        <dl className="mt-2 space-y-1 text-[13.5px] text-white/85">
          {visible.map((line) => (
            <div key={line} className="truncate">
              {line}
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-2 text-[13.5px] text-white/50">Rien à signaler.</p>
      )}
      {onEdit ? (
        <button
          type="button"
          data-testid="known-summary-edit"
          onClick={onEdit}
          className="mt-3 min-h-11 text-[12.5px] underline decoration-white/30 underline-offset-4 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {editLabel}
        </button>
      ) : null}
    </div>
  );
}

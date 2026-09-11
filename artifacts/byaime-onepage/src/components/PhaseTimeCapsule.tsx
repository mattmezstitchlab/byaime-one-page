import { ChevronLeft, ChevronRight } from "lucide-react";
import { getWorldPhases, type WorldPhase } from "@/lib/wedding-navigation";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/*
 * La capsule temporelle AVANT / JOUR J / APRÈS vit désormais tout en haut du
 * Monde, centrée, pour libérer le bas (la capsule AI + ME y reste centrée comme
 * sur les autres pages).
 */
export function PhaseTimeCapsule({
  phase,
  onPhaseChange,
  className = "",
  compact = false,
}: {
  phase: WorldPhase;
  onPhaseChange: (phase: WorldPhase) => void;
  className?: string;
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
  const phases = getWorldPhases(locale);
  const previousPhase: WorldPhase | null = phase === "avant" ? null : phase === "pendant" ? "avant" : "pendant";
  const nextPhase: WorldPhase | null = phase === "avant" ? "pendant" : phase === "pendant" ? "apres" : null;

  return (
    <div
      role="group"
      aria-label={t("world.capsule.group")}
      className={cn(
        "flex h-11 shrink-0 items-center rounded-full border border-foreground/15 bg-card/90 p-1 shadow-lg backdrop-blur-xl",
        compact ? "w-[min(310px,calc(100vw-2rem))]" : "w-[min(340px,calc(100vw-2rem))] sm:w-[390px]",
        className
      )}
    >
      <button
        type="button"
        disabled={!previousPhase}
        onClick={() => previousPhase && onPhaseChange(previousPhase)}
        className="grid h-9 w-8 shrink-0 place-items-center rounded-full text-foreground/45 transition hover:bg-foreground/[.06] hover:text-foreground disabled:opacity-15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-9"
        aria-label={previousPhase
          ? t("world.capsule.goto", { label: phases.find(p => p.id === previousPhase)?.label ?? "" })
          : t("world.capsule.noPrev")}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5" role="tablist" aria-label={t("world.capsule.tabs")}>
        {phases.map(phaseItem => (
          <button
            key={phaseItem.id}
            type="button"
            role="tab"
            aria-selected={phase === phaseItem.id}
            onClick={() => onPhaseChange(phaseItem.id)}
            className={cn(
              "min-w-0 rounded-full px-2.5 py-2 text-[9px] uppercase tracking-[.12em] text-foreground/55 transition hover:bg-foreground/[.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3.5 sm:text-[10px] sm:tracking-[.14em]",
              phase === phaseItem.id && "bg-foreground text-background hover:bg-foreground hover:text-background"
            )}
          >
            {phaseItem.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!nextPhase}
        onClick={() => nextPhase && onPhaseChange(nextPhase)}
        className="grid h-9 w-8 shrink-0 place-items-center rounded-full text-foreground/45 transition hover:bg-foreground/[.06] hover:text-foreground disabled:opacity-15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-9"
        aria-label={nextPhase
          ? t("world.capsule.goto", { label: phases.find(p => p.id === nextPhase)?.label ?? "" })
          : t("world.capsule.noNext")}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

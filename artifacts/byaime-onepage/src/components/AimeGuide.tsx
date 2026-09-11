import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Compass, Lightbulb, Search, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIME_SCREENS, getAimeScreen, type AimeScreenAction, type AimeScreenId } from "@/lib/aime-architecture";
import { answerAime, nextBestActions, runAimeAction, useAimeScreenContext, type AimeNextStep } from "@/lib/aime-guidance";
import type { WorldProject } from "@/lib/types";
import type { WorldPhase } from "@/lib/wedding-navigation";
import { useI18n } from "@/lib/i18n";

/**
 * Le visage de l'agent de guidage : un panneau « AIME, explique-moi » qui connaît
 * l'architecture de l'app et l'état réel du Monde. Il est monté dans la barre de
 * commande (bouton AI du portail), dans le chrome de chaque panneau et sur les
 * pages publiques.
 */

type GuideProps = {
  project: WorldProject | null;
  phase?: WorldPhase;
  role?: string;
  /** Écran à décrire quand rien n'a été déclaré dans le contexte. */
  fallbackScreen?: AimeScreenId | null;
  onJumped?: () => void;
  compact?: boolean;
};

function ActionButton({ action, onJumped, primary }: { action: AimeScreenAction; onJumped?: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => {
        runAimeAction(action);
        onJumped?.();
      }}
      className={cn(
        "group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        primary
          ? "border-foreground/25 bg-foreground/[0.06] hover:bg-foreground/[0.1]"
          : "border-border bg-transparent hover:bg-foreground/[0.04]",
      )}
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-foreground/70">
        <ArrowUpRight className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{action.label}</span>
        <span className="block text-xs leading-relaxed text-foreground/60">{action.detail}</span>
      </span>
    </button>
  );
}

function StepCard({ step, index, onJumped }: { step: AimeNextStep; index: number; onJumped?: () => void }) {
  return (
    <li className="rounded-2xl border border-border bg-foreground/[0.02] p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.18em] text-foreground/45">
        <span>{`0${index + 1}`}</span>
        <span className={cn(
          "rounded-full border px-2 py-0.5 tracking-[.08em]",
          step.weight === "blocant" ? "border-amber-500/45 text-amber-500" : "border-border text-foreground/50",
        )}
        >
          {step.weight}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{step.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-foreground/60">{step.why}</p>
      <div className="mt-3">
        <ActionButton action={step.action} onJumped={onJumped} primary />
      </div>
    </li>
  );
}

export function AimeGuide({ project, phase, role, fallbackScreen, onJumped, compact }: GuideProps) {
  const context = useAimeScreenContext();
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const screenId = context.screen ?? fallbackScreen ?? null;
  const screen = useMemo(() => (screenId ? getAimeScreen(screenId) : undefined), [screenId]);
  const steps = useMemo(() => nextBestActions(project, { phase, role }), [project, phase, role]);
  const answer = useMemo(() => (asked ? answerAime(asked, { project, phase, role, screen: screenId }) : null), [asked, project, phase, role, screenId]);

  useEffect(() => {
    if (screenId && inputRef.current && !question) inputRef.current.focus();
  }, [screenId, question]);

  return (
    <div data-testid="aime-guide" className={cn("space-y-5", compact && "text-sm")}>
      <section className="rounded-3xl border border-border bg-background/60 p-5">
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[.24em] text-foreground/50">
          <Compass className="h-3.5 w-3.5" />
          {screen ? `Vous êtes ici : ${screen.label}` : "AIME vous oriente"}
        </p>
        {screen ? (
          <>
            <h3 className="mt-3 font-display text-xl leading-snug text-foreground">{screen.purpose}</h3>
            <p className="mt-2 text-xs leading-relaxed text-foreground/60">{screen.where}</p>
            <ul className="mt-4 space-y-2">
              {screen.does.map(line => (
                <li key={line} className="flex gap-2 text-xs leading-relaxed text-foreground/70">
                  <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                  {line}
                </li>
              ))}
            </ul>
            {screen.mistakes.length > 0 && (
              <p className="mt-4 border-l border-foreground/20 pl-3 text-xs leading-relaxed text-foreground/60">
                <Sparkles className="mr-1 inline h-3 w-3 text-foreground/40" aria-hidden />
                {screen.mistakes[0]}
              </p>
            )}
            {screen.actions.length > 0 && (
              <div className="mt-4 space-y-2">
                {screen.actions.map(action => (
                  <ActionButton key={action.label} action={action} onJumped={onJumped} />
                ))}
              </div>
            )}
            {screen.related.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {screen.related.map(related => (
                  <button
                    key={related}
                    type="button"
                    onClick={() => {
                      const label = AIME_SCREENS[related]?.label;
                      if (!label) return;
                      setQuestion(label);
                      setAsked(label);
                    }}
                    className="rounded-full border border-border px-2.5 py-1 text-[10px] text-foreground/55 transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {AIME_SCREENS[related]?.label ?? related}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-foreground/60">
            Posez une question avec le mot d&rsquo;un écran — invités, plan de table, finances, musique, logistique, régie — ou laissez AIME vous dire ce qui débloque le plus maintenant.
          </p>
        )}
      </section>

      <section>
        <form
          onSubmit={event => {
            event.preventDefault();
            setAsked(question.trim() || null);
          }}
          className="flex items-center gap-2 rounded-full border border-border bg-foreground/[0.03] px-4 py-2.5 focus-within:border-foreground/40"
        >
          <Search className="h-4 w-4 shrink-0 text-foreground/45" aria-hidden />
          <input
            ref={inputRef}
            value={question}
            onChange={event => {
              setQuestion(event.target.value);
              if (!event.target.value.trim()) setAsked(null);
            }}
            placeholder="AIME, où je saisis les réponses des invités ?"
            aria-label="Poser une question à AIME sur un écran"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
          />
          {asked && (
            <button
              type="button"
              onClick={() => {
                setAsked(null);
                setQuestion("");
              }}
              aria-label="Effacer la question"
              className="rounded-full p-1 text-foreground/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        {answer && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-3xl border border-border bg-foreground/[0.02] p-5"
            data-testid="aime-guide-answer"
          >
            <p className="text-[10px] uppercase tracking-[.24em] text-foreground/45">
              {answer.kind === "howto" ? "Cet écran" : answer.kind === "next" ? "La suite" : answer.kind === "roles" ? "Frontières" : answer.kind === "model" ? "Le modèle" : "AIME"}
            </p>
            <h3 className="mt-2 font-display text-lg text-foreground">{answer.title}</h3>
            {answer.paragraphs.map(paragraph => (
              <p key={paragraph} className="mt-2 text-xs leading-relaxed text-foreground/65">{paragraph}</p>
            ))}
            {answer.steps.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {answer.steps.map(line => (
                  <li key={line} className="flex gap-2 text-xs leading-relaxed text-foreground/70">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/35" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            )}
            {answer.actions.length > 0 && (
              <div className="mt-4 space-y-2">
                {answer.actions.map(action => (
                  <ActionButton key={`${action.label}-${action.detail}`} action={action} onJumped={onJumped} primary />
                ))}
              </div>
            )}
            {answer.matches.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-[.2em] text-foreground/40">Aussi</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {answer.matches.map(match => (
                    <button
                      key={match.screen.id}
                      type="button"
                      onClick={() => setQuestion(match.screen.label)}
                      className="rounded-full border border-border px-2.5 py-1 text-[10px] text-foreground/55 transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {match.screen.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
        {answer?.kind === "unknown" && (
          <p className="mt-3 text-xs text-foreground/45">AIME ne propose que des écrans qui existent : le mot manquant est peut-être celui d’un panneau voisin.</p>
        )}
      </section>

      <section>
        <p className="text-[10px] uppercase tracking-[.24em] text-foreground/45">Ce qui débloque le plus maintenant</p>
        {steps.length ? (
          <ul className="mt-3 space-y-3">
            {steps.map((step, index) => (
              <StepCard key={step.id} step={step} index={index} onJumped={onJumped} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl border border-border px-4 py-3 text-xs leading-relaxed text-foreground/60">
            Rien ne bloque. Le Monde est cohérent : gardez la Timeline à l&rsquo;œil et profitez.
          </p>
        )}
      </section>
    </div>
  );
}

/** Le bouton discret que chaque écran affiche dans son chrome. */
export function AimeScreenHint({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("aime:open-ai"))}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-foreground/15 px-3 py-1.5 text-[9px] uppercase tracking-[.14em] text-foreground/60",
        "transition-colors hover:border-foreground/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      data-testid="aime-guide-hint"
    >
      <Compass className="h-3 w-3" aria-hidden />
      {label ?? t("panel.explain")}
    </button>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Coins,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { useLocation } from "wouter";
import { useProject } from "@/store/project-store";
import { parseIntention } from "@/lib/parser";
import { MIN_INTENTION_LENGTH, readIntentionDraft, saveIntentionDraft, clearIntentionDraft } from "@/lib/intention-draft";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * L'onboarding unique de l'accueil et de l'espace privé : cinq questions
 * simples, dans l'ordre où l'on prépare réellement un mariage. Il n'y a plus
 * ni champ libre alternatif, ni second composer : ce parcours est le seul
 * point de création. La phrase produite est écrite pour `parseIntention`
 * (univers « mariage »), donc elle n'est jamais réécrite plus loin.
 *
 * Chaque question est facultative (« Passer ») : une seule réponse suffit à
 * créer le Monde, les autres se complètent ensuite dans l'application.
 */
type FieldKey = "date" | "place" | "guests" | "budget" | "tone";

/** Le seul univers que l'app sait accompagner. */
const WEDDING_UNIVERSE = "mariage";

const QUESTIONS: ReadonlyArray<{
  key: FieldKey;
  icon: typeof CalendarDays;
  question: string;
  placeholder: string;
  hint: string;
  inputMode?: "numeric" | "text";
}> = [
  {
    key: "date",
    icon: CalendarDays,
    question: "La date du mariage, même approximative ?",
    placeholder: "14 août 2027",
    hint: "Une saison ou une année suffisent : AIME ajuste ensuite.",
  },
  {
    key: "place",
    icon: MapPin,
    question: "Près de quelle ville, ou de quel lieu ?",
    placeholder: "Lille",
    hint: "La région, le département, la ville ou déjà le domaine.",
  },
  {
    key: "guests",
    icon: Users,
    question: "Combien d’invités au repas ?",
    placeholder: "120",
    hint: "Une estimation : les réponses viendront des RSVP.",
    inputMode: "numeric",
  },
  {
    key: "budget",
    icon: Coins,
    question: "Quel budget pour le mariage ?",
    placeholder: "20 000 €",
    hint: "Le montant de départ, il évoluera avec vos choix.",
  },
  {
    key: "tone",
    icon: Sparkles,
    question: "L’ambiance du mariage, en un mot ?",
    placeholder: "champêtre, intime, festif…",
    hint: "Le ton que vous voulez donner à ce jour.",
  },
];

const TOTAL_FIELDS = QUESTIONS.length; // cinq informations, une à la fois

const digits = (value: string) => value.replace(/[^\d]/g, "");
/* Un espace ordinaire : le parseur local le lit, et le résultat reste lisible. */
const groupThousands = (value: string) => value.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const capitalise = (value: string) => value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);

/** Une phrase lisible que le parseur local sait déjà comprendre. */
export function composeIntention(answers: Partial<Record<FieldKey, string>>): string {
  const parts: string[] = [];
  const date = answers.date?.trim();
  const place = answers.place?.trim();
  const guests = digits(answers.guests ?? "");
  const budget = digits(answers.budget ?? "");

  if (date) parts.push(`le ${date.toLocaleLowerCase("fr-FR")}`);
  if (place) {
    /* Une seule forme est garantie au parseur : « près de Ville », préposition
       de départ et majuscule comprises ou non dans la réponse. */
    const bare = place.replace(/^(à|dans la région de|près de|proche de)\s+/i, "").trim();
    if (bare) parts.push(`près de ${capitalise(bare)}`);
  }
  if (guests) parts.push(`${guests} invités`);
  if (budget) parts.push(`${groupThousands(budget)} €`);
  if (answers.tone?.trim()) parts.push(`ambiance ${answers.tone.trim().toLocaleLowerCase("fr-FR")}`);

  return `Notre ${WEDDING_UNIVERSE}${parts.length ? ` ${parts.join(", ")}` : ""}.`;
}

/** Repeuple les réponses depuis un brouillon rédigé (reprise après connexion). */
function answersFromDraft(draft: string): Partial<Record<FieldKey, string>> {
  const parsed = parseIntention(draft);
  const answers: Partial<Record<FieldKey, string>> = {};
  if (parsed.pivot && parsed.pivot.confidence !== "manquant" && parsed.pivot.value) {
    answers.date = new Date(parsed.pivot.value).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  if (parsed.city?.value) answers.place = capitalise(parsed.city.value);
  if (parsed.guestsCount?.value) answers.guests = String(parsed.guestsCount.value);
  if (parsed.budget?.value) answers.budget = String(parsed.budget.value);
  return answers;
}

export function LandingComposer({ signedIn = false }: { signedIn?: boolean }) {
  const [, navigate] = useLocation();
  const { createProjectFromIntention, setIntentionText } = useProject();
  const reduceMotion = useReducedMotion();
  /* Une intention déjà posée (compte créé en cours de route) reprend la main. */
  const [savedDraft] = useState(() => (typeof window === "undefined" ? "" : readIntentionDraft()));
  const [answers, setAnswers] = useState<Partial<Record<FieldKey, string>>>(() =>
    savedDraft && savedDraft.trim().length >= MIN_INTENTION_LENGTH ? answersFromDraft(savedDraft) : {},
  );
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const done = index >= QUESTIONS.length;
  const field = QUESTIONS[index];
  const LeadingIcon = field?.icon ?? Sparkles;
  const answered = useMemo(
    () => QUESTIONS.filter(item => (answers[item.key] ?? "").trim()).map(item => item.key),
    [answers],
  );
  const sentence = useMemo(() => composeIntention(answers), [answers]);
  const facts = useMemo(() => {
    if (sentence.trim().length < MIN_INTENTION_LENGTH) return [] as string[];
    const draft = parseIntention(sentence);
    const lines: string[] = [];
    if (draft.pivot && draft.pivot.confidence !== "manquant" && draft.pivot.value) {
      lines.push(new Date(draft.pivot.value).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
    }
    if (draft.guestsCount?.value) lines.push(`${draft.guestsCount.value} invités`);
    if (draft.budget?.value) lines.push(`${draft.budget.value.toLocaleString("fr-FR")} €`);
    if (draft.city?.value) lines.push(capitalise(draft.city.value));
    return lines;
  }, [sentence]);

  const submitAnswer = () => {
    if (!field) return;
    const value = text.trim();
    if (!value) {
      setError("Répondez ou touchez « Passer » : cette question est facultative.");
      return;
    }
    setAnswers(current => ({ ...current, [field.key]: value }));
    setText("");
    setIndex(current => current + 1);
    setError("");
  };

  const skipAnswer = () => {
    if (!field) return;
    setText("");
    setIndex(current => current + 1);
    setError("");
  };

  const reopen = (position: number) => {
    setIndex(position);
    setText(answers[QUESTIONS[position]?.key] ?? "");
    setError("");
  };

  const finish = () => {
    const intention = sentence.trim();
    if (intention.length < MIN_INTENTION_LENGTH || answered.length === 0) {
      setError("Une seule réponse suffit : une date, un lieu, une ambiance…");
      return;
    }
    setError("");
    trackEvent("landing_intention_composed", { mode: "guided", universe: WEDDING_UNIVERSE, facts: facts.length });
    if (signedIn) {
      setIntentionText(intention);
      if (createProjectFromIntention(intention)) navigate("/user-portal");
      return;
    }
    /* Avant le compte, la phrase voyage avec la personne. */
    saveIntentionDraft(intention);
    navigate("/creation");
  };

  /*
   * Une phrase déjà posée avant la création du compte ne doit pas réafficher
   * l'onboarding : pour une personne connectée qui revient sur l'accueil avec
   * un brouillon, on ouvre directement son Monde.
   */
  useEffect(() => {
    if (!signedIn || !savedDraft || savedDraft.trim().length < MIN_INTENTION_LENGTH) return;
    const intention = savedDraft.trim();
    setIntentionText(intention);
    if (createProjectFromIntention(intention)) {
      clearIntentionDraft();
      navigate("/user-portal");
    }
    // Une seule reprise à l'ouverture : jamais de nouvelle soumission ensuite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="landing-composer" className="mx-auto w-full max-w-2xl text-left">
      <form
        data-testid="landing-intention-form"
        onSubmit={event => {
          event.preventDefault();
          if (done) finish();
          else submitAnswer();
        }}
        className="group relative"
      >
        <div aria-hidden className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-white/12 via-white/4 to-transparent opacity-0 blur-md transition duration-500 group-hover:opacity-100 group-focus-within:opacity-100" />
        <div className="relative flex flex-col gap-1.5 rounded-[1.6rem] border border-white/15 bg-black/35 p-1.5 text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all focus-within:border-white/30 focus-within:bg-black/45 sm:flex-row sm:items-center sm:gap-0 sm:rounded-full">
          <div className="relative flex min-w-0 shrink-0 items-center gap-2 sm:pl-1.5">
            <span aria-hidden className="hidden h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.07] sm:grid">
              <LeadingIcon className="h-4 w-4" />
            </span>
            {/* Le Monde ne sait tenir qu'un mariage : l'afficher vaut mieux
               qu'un sélecteur qui promettrait ce que l'app ne fait pas. */}
            <span data-testid="landing-universe" className="whitespace-nowrap px-1 text-[13.5px] font-medium text-white">
              Notre mariage
            </span>
          </div>

          <span aria-hidden className="h-px w-[88%] self-center bg-white/12 sm:mx-1 sm:h-6 sm:w-px" />

          <div className="flex min-w-0 flex-1 items-center">
            {done ? (
              <p className="min-w-0 flex-1 truncate px-3 py-2.5 text-[13.5px] text-white/75">
                AIME a tout ce qu’il lui faut.
              </p>
            ) : (
              <>
                <label className="sr-only" htmlFor="landing-intention-input">
                  {field.question}
                </label>
                <input
                  id="landing-intention-input"
                  data-testid="landing-intention-input"
                  aria-label={field.question}
                  aria-describedby="landing-intention-hint"
                  autoComplete="off"
                  autoFocus
                  value={text}
                  inputMode={field.inputMode}
                  onChange={event => {
                    setText(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder={field.placeholder}
                  className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[14.5px] text-white outline-none placeholder:text-white/45"
                />
                {!text.trim() && (
                  <button
                    type="button"
                    data-testid="landing-intention-skip"
                    onClick={skipAnswer}
                    className="mr-1 shrink-0 rounded-full px-3 py-1.5 text-[11.5px] uppercase tracking-[.12em] text-white/45 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    Passer
                  </button>
                )}
              </>
            )}

            <button
              type="submit"
              data-testid="landing-intention-submit"
              aria-label={done || !field ? "Créer mon espace" : "Question suivante"}
              disabled={done ? answered.length === 0 : !text.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center self-end rounded-full bg-white text-black transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-35 sm:self-auto"
            >
              {done ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2 text-[12px] text-white/55">
          <p id="landing-intention-hint" aria-live="polite" className="min-w-0 flex-1">
            {error || (done ? "Touchez une pastille pour modifier une réponse, puis créez votre espace." : field.hint)}
          </p>
          <span aria-hidden className="shrink-0 tabular-nums">
            {Math.min(index + 1, TOTAL_FIELDS)}/{TOTAL_FIELDS}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {QUESTIONS.map((item, position) => {
            const value = answers[item.key];
            const isCurrent = !done && index === position;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => reopen(position)}
                title={value ? `Modifier : ${item.question}` : item.question}
                aria-current={isCurrent}
                className={cn(
                  "inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                  isCurrent
                    ? "border-white/40 bg-white/15 text-white"
                    : value
                      ? "border-white/25 bg-white/[0.09] text-white/90 hover:bg-white/15"
                      : "border-white/10 text-white/45 hover:bg-white/[.07] hover:text-white/75",
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {value ? (
                  <span className="truncate">{item.key === "guests" ? `${digits(value)} invités` : value}</span>
                ) : (
                  <span className="uppercase tracking-[.12em]">{position + 1}</span>
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {facts.length > 0 && (
            <motion.p
              key={facts.join("|")}
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              role="status"
              className="mt-3 px-2 text-[12px] text-white/60"
            >
              AIME retient déjà : {facts.join(" · ")}
            </motion.p>
          )}
        </AnimatePresence>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-2">
        <button
          type="button"
          onClick={finish}
          disabled={answered.length === 0}
          data-testid="landing-intention-finish"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-[14px] font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {signedIn ? "Ouvrir mon espace" : "Créer mon espace"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        {answered.length > 0 && !done && (
          <button
            type="button"
            onClick={() => setIndex(QUESTIONS.length)}
            className="text-[12.5px] text-white/65 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            Terminer avec ces réponses
          </button>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Coins,
  MapPin,
  PencilLine,
  Sparkles,
  Users,
} from "lucide-react";
import { useLocation } from "wouter";
import { useProject } from "@/store/project-store";
import { parseIntention } from "@/lib/parser";
import { MIN_INTENTION_LENGTH, readIntentionDraft, saveIntentionDraft } from "@/lib/intention-draft";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Le champ de saisie de l'accueil : l'univers d'abord, puis une information
 * fine à la fois — la barre reste la même que celle du Monde pour qu'on
 * n'ait pas à réapprendre un geste en entrant dans l'application.
 */
type FieldKey = "date" | "place" | "guests" | "budget" | "tone";

const UNIVERSES = [
  { value: "Mariage", word: "mariage" },
  { value: "Anniversaire", word: "anniversaire" },
  { value: "Séminaire d'entreprise", word: "séminaire d'entreprise" },
  { value: "Voyage", word: "voyage" },
  { value: "Autre événement", word: "événement" },
] as const;

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
    question: "Quelle date, même approximative ?",
    placeholder: "14 août 2027",
    hint: "Une saison ou une année suffisent : AIME ajuste ensuite.",
  },
  {
    key: "place",
    icon: MapPin,
    question: "Près de quelle ville ?",
    placeholder: "Lille",
    hint: "La région, le département ou la ville du souhait.",
  },
  {
    key: "guests",
    icon: Users,
    question: "Combien d'invités en tête ?",
    placeholder: "120",
    hint: "Une estimation, personne ne vous en voudra.",
    inputMode: "numeric",
  },
  {
    key: "budget",
    icon: Coins,
    question: "Quel budget vous ressemble ?",
    placeholder: "20 000 €",
    hint: "Le montant de départ, il évoluera avec vos choix.",
  },
  {
    key: "tone",
    icon: Sparkles,
    question: "Et l'ambiance, en un mot ?",
    placeholder: "champêtre, intime, festif…",
    hint: "Le ton que vous voulez donner à ce jour.",
  },
];

const TOTAL_FIELDS = QUESTIONS.length + 1; // l'univers compte comme première étape

const digits = (value: string) => value.replace(/[^\d]/g, "");
/* Un espace ordinaire : le parseur local le lit, et le résultat reste lisible. */
const groupThousands = (value: string) => value.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const capitalise = (value: string) => value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);

/** Une phrase lisible que le parseur local sait déjà comprendre. */
export function composeIntention(universe: string, answers: Partial<Record<FieldKey, string>>): string {
  const subject = UNIVERSES.find(item => item.value === universe)?.word ?? "événement";
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

  return `Notre ${subject}${parts.length ? ` ${parts.join(", ")}` : ""}.`;
}

export function LandingComposer({ signedIn = false }: { signedIn?: boolean }) {
  const [, navigate] = useLocation();
  const { createProjectFromIntention, setIntentionText } = useProject();
  const reduceMotion = useReducedMotion();
  /* Une intention déjà posée (compte créé en cours de route) reprend la main. */
  const [savedDraft] = useState(() => (typeof window === "undefined" ? "" : readIntentionDraft()));
  const [universe, setUniverse] = useState<string>("");
  const [answers, setAnswers] = useState<Partial<Record<FieldKey, string>>>({});
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"guided" | "free">(savedDraft ? "free" : "guided");
  const [freeText, setFreeText] = useState(savedDraft);
  const [error, setError] = useState("");

  const done = index >= QUESTIONS.length;
  const field = QUESTIONS[index];
  const LeadingIcon = mode === "free" ? PencilLine : (field?.icon ?? Sparkles);
  const progress = done ? TOTAL_FIELDS : Math.min(index + 1, TOTAL_FIELDS);
  const answered = useMemo(
    () => QUESTIONS.filter(item => (answers[item.key] ?? "").trim()).map(item => item.key),
    [answers],
  );
  const sentence = useMemo(
    () => (mode === "free" ? freeText.trim() : composeIntention(universe, answers)),
    [answers, freeText, mode, universe],
  );
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
    if (!value) return;
    setAnswers(current => ({ ...current, [field.key]: value }));
    setText("");
    setIndex(current => current + 1);
    setError("");
  };

  const pickUniverse = (value: string) => {
    setUniverse(value);
    setIndex(current => (value ? Math.max(current, 1) : 0));
    setError("");
  };

  const reopen = (position: number) => {
    setIndex(position);
    setText(answers[QUESTIONS[position]?.key] ?? "");
    setMode("guided");
  };

  const finish = () => {
    const intention = sentence.trim();
    if (intention.length < MIN_INTENTION_LENGTH) {
      setError("Dites-nous un peu plus : une date, un lieu ou une ambiance suffisent.");
      return;
    }
    setError("");
    trackEvent("landing_intention_composed", { mode, universe, facts: facts.length });
    if (signedIn) {
      setIntentionText(intention);
      if (createProjectFromIntention(intention)) navigate("/user-portal");
      return;
    }
    /* Avant le compte, la phrase voyage avec la personne. */
    saveIntentionDraft(intention);
    navigate("/creation");
  };

  const canFinish = mode === "free" ? freeText.trim().length >= MIN_INTENTION_LENGTH : Boolean(universe);

  return (
    <div data-testid="landing-composer" className="mx-auto w-full max-w-2xl text-left">
      <form
        data-testid="landing-intention-form"
        onSubmit={event => {
          event.preventDefault();
          if (mode === "free" || done) finish();
          else if (!universe) {
            setError("Choisissez d’abord l’univers de votre projet.");
            setIndex(0);
          } else submitAnswer();
        }}
        className="group relative"
      >
        <div aria-hidden className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-white/12 via-white/4 to-transparent opacity-0 blur-md transition duration-500 group-hover:opacity-100 group-focus-within:opacity-100" />
        <div className="relative flex flex-col gap-1.5 rounded-[1.6rem] border border-white/15 bg-black/35 p-1.5 text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all focus-within:border-white/30 focus-within:bg-black/45 sm:flex-row sm:items-center sm:gap-0 sm:rounded-full">
          <div className="relative flex min-w-0 shrink-0 items-center gap-2 sm:pl-1.5">
            <span aria-hidden className="hidden h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.07] sm:grid">
              <LeadingIcon className="h-4 w-4" />
            </span>
            {mode === "free" ? (
              <span className="px-1 text-[13px] font-medium text-white/70">Une seule phrase</span>
            ) : (
              <>
                <select
                  data-testid="landing-universe"
                  aria-label="Univers du projet"
                  value={universe}
                  onChange={event => pickUniverse(event.target.value)}
                  className="h-10 min-w-0 max-w-[13rem] cursor-pointer appearance-none truncate rounded-full bg-transparent pl-1 pr-7 text-[13.5px] font-medium text-white outline-none transition-colors [color-scheme:dark] hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <option value="">Choisir l’univers</option>
                  {UNIVERSES.map(item => (
                    <option key={item.value} value={item.value}>{item.value}</option>
                  ))}
                </select>
                <ChevronDown aria-hidden className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-white/60" />
              </>
            )}
          </div>

          <span aria-hidden className="h-px w-[88%] self-center bg-white/12 sm:mx-1 sm:h-6 sm:w-px" />

          <div className="flex min-w-0 flex-1 items-center">
            {mode === "free" ? (
              <label className="sr-only" htmlFor="landing-intention-free">
                Décrivez votre projet en une phrase
              </label>
            ) : null}
            {mode === "free" ? (
              <textarea
                id="landing-intention-free"
                data-testid="landing-intention-free"
                autoFocus
                rows={3}
                value={freeText}
                onChange={event => {
                  setFreeText(event.target.value);
                  if (error) setError("");
                }}
                onKeyDown={event => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    finish();
                  }
                }}
                placeholder="On se marie le 14 août 2027 près de Lille, 120 invités, ambiance champêtre avec un budget de 20 000 €…"
                className="min-h-[44px] w-full resize-none bg-transparent px-3 py-2.5 text-[14.5px] leading-relaxed text-white outline-none placeholder:text-white/45"
              />
            ) : done ? (
              <p className="min-w-0 flex-1 truncate px-3 py-2.5 text-[13.5px] text-white/75">
                AIME a tout ce qu’il lui faut.
              </p>
            ) : (
              <input
                data-testid="landing-intention-input"
                aria-label={field?.question}
                aria-describedby="landing-intention-hint"
                autoComplete="off"
                value={text}
                disabled={!universe}
                inputMode={field?.inputMode}
                onChange={event => {
                  setText(event.target.value);
                  if (error) setError("");
                }}
                placeholder={universe ? field?.placeholder : "L’univers d’abord, puis une information à la fois."}
                className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[14.5px] text-white outline-none transition-opacity placeholder:text-white/45 focus:placeholder:opacity-0 disabled:cursor-not-allowed disabled:opacity-60"
              />
            )}

            <button
              type="submit"
              data-testid="landing-intention-submit"
              aria-label={mode === "free" || done || !field ? "Créer mon espace" : "Continuer"}
              disabled={mode === "free" || done ? !canFinish : !text.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center self-end rounded-full bg-white text-black transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-35 sm:self-auto"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2 text-[12px] text-white/55">
          <p id="landing-intention-hint" aria-live="polite" className="min-w-0 flex-1">
            {error || (mode === "free"
              ? "Écrivez librement : dates, lieu, invités, ambiance, ce qui vous tient à cœur."
              : !universe
                ? "Choisissez d’abord l’univers de votre projet."
                : done
                  ? "Touchez une pastille pour modifier une réponse."
                  : (field?.hint ?? ""))}
          </p>
          <span aria-hidden className="shrink-0 tabular-nums">
            {mode === "free" ? "libre" : `${progress}/${TOTAL_FIELDS}`}
          </span>
        </div>

        {mode === "guided" && answered.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {!universe && (
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[12.5px] text-white/85">Univers à choisir</span>
            )}
            {QUESTIONS.map((item, position) => {
              const value = answers[item.key];
              if (!value) return null;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => reopen(position)}
                  title={`Modifier : ${item.question}`}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                    index === position ? "border-white/40 bg-white/15 text-white" : "border-white/15 bg-white/[0.06] text-white/85 hover:bg-white/12",
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{item.key === "guests" ? `${digits(value)} invités` : value}</span>
                </button>
              );
            })}
          </div>
        )}

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
        {canFinish && (
          <button
            type="button"
            onClick={finish}
            data-testid="landing-intention-finish"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-[14px] font-medium text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {signedIn ? "Ouvrir mon espace" : "Créer mon espace"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}
        <button
          type="button"
          data-testid="landing-intention-mode"
          onClick={() => {
            setMode(current => (current === "free" ? "guided" : "free"));
            setError("");
          }}
          className="text-[12.5px] text-white/65 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          {mode === "free" ? "Revenir aux questions" : "Raconter autrement, en une phrase"}
        </button>
      </div>
    </div>
  );
}

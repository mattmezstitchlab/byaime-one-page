import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Check,
  Coins,
  Heart,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { useLocation } from "wouter";
import { useProject } from "@/store/project-store";
import { parseIntention } from "@/lib/parser";
import {
  MIN_INTENTION_LENGTH,
  readIntentionDraft,
  saveIntentionDraft,
  clearIntentionDraft,
  saveIntentionMeta,
  readIntentionMeta,
  type Persona,
} from "@/lib/intention-draft";
import { CURRENCIES, budgetToken, currencySymbol, type CurrencyCode } from "@/lib/money";
import { useI18n, type I18nKey } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * L'onboarding unique de l'accueil et de l'espace privé. La première décision,
 * dans le hero, est le persona : un couple qui prépare son mariage, ou un
 * professionnel qui accompagne des mariages. Viennent ensuite cinq questions
 * simples, dans l'ordre réel de préparation, dans la langue et la devise du
 * visiteur. Chaque question est facultative (« Passer »).
 */
type FieldKey = "date" | "place" | "guests" | "budget" | "tone";

const QUESTION_KEYS: ReadonlyArray<{ key: FieldKey; icon: typeof CalendarDays }> = [
  { key: "date", icon: CalendarDays },
  { key: "place", icon: MapPin },
  { key: "guests", icon: Users },
  { key: "budget", icon: Coins },
  { key: "tone", icon: Sparkles },
];

const TOTAL_FIELDS = QUESTION_KEYS.length; // cinq informations, une à la fois

const digits = (value: string) => value.replace(/[^\d]/g, "");
const capitalise = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1);

type ComposeOptions = { persona?: Persona; currency?: CurrencyCode; locale?: "fr" | "en" };

/** Une phrase lisible que le parseur local sait comprendre, en FR comme en EN. */
export function composeIntention(
  answers: Partial<Record<FieldKey, string>>,
  options: ComposeOptions = {},
): string {
  const persona: Persona = options.persona ?? "couple";
  const currency: CurrencyCode = options.currency ?? "EUR";
  const locale = options.locale ?? "fr";
  const parts: string[] = [];
  const date = answers.date?.trim();
  const place = answers.place?.trim();
  const guests = digits(answers.guests ?? "");
  const budget = digits(answers.budget ?? "");

  if (locale === "en") {
    const prefix = persona === "pro" ? "A client wedding" : "Our wedding";
    if (date) parts.push(`on ${date}`);
    if (place) {
      const bare = place.replace(/^(near|in|at|près de|à|dans la région de)\s+/i, "").trim();
      if (bare) parts.push(`near ${capitalise(bare)}`);
    }
    if (guests) parts.push(`${guests} guests`);
    if (budget) parts.push(budgetToken(budget, currency, "en"));
    if (answers.tone?.trim()) parts.push(`${answers.tone.trim().toLowerCase()} mood`);
    return `${prefix}${parts.length ? ` ${parts.join(", ")}` : ""}.`;
  }

  const prefix = persona === "pro" ? "Le mariage client" : "Notre mariage";
  if (date) parts.push(`le ${date.toLocaleLowerCase("fr-FR")}`);
  if (place) {
    const bare = place.replace(/^(à|dans la région de|près de|proche de|near|in)\s+/i, "").trim();
    if (bare) parts.push(`près de ${capitalise(bare)}`);
  }
  if (guests) parts.push(`${guests} invités`);
  if (budget) parts.push(budgetToken(budget, currency, "fr"));
  if (answers.tone?.trim()) parts.push(`ambiance ${answers.tone.trim().toLocaleLowerCase("fr-FR")}`);
  return `${prefix}${parts.length ? ` ${parts.join(", ")}` : ""}.`;
}

/** Repeuple les réponses depuis un brouillon rédigé (reprise après connexion). */
function answersFromDraft(draft: string, locale: "fr" | "en"): Partial<Record<FieldKey, string>> {
  const parsed = parseIntention(draft);
  const answers: Partial<Record<FieldKey, string>> = {};
  if (parsed.pivot && parsed.pivot.confidence !== "manquant" && parsed.pivot.value) {
    answers.date = new Date(parsed.pivot.value).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
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
  const { t, locale } = useI18n();
  const reduceMotion = useReducedMotion();

  const initialMeta = useMemo(() => (typeof window === "undefined" ? null : readIntentionMeta()), []);
  /* Une intention déjà posée (compte créé en cours de route) reprend la main. */
  const [savedDraft] = useState(() => (typeof window === "undefined" ? "" : readIntentionDraft()));
  const [persona, setPersona] = useState<Persona>(initialMeta?.persona ?? "couple");
  const [currency, setCurrency] = useState<CurrencyCode>(initialMeta?.currency ?? "EUR");
  const [answers, setAnswers] = useState<Partial<Record<FieldKey, string>>>(() =>
    savedDraft && savedDraft.trim().length >= MIN_INTENTION_LENGTH
      ? answersFromDraft(savedDraft, initialMeta?.locale ?? "fr")
      : {},
  );
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const done = index >= QUESTION_KEYS.length;
  const field = QUESTION_KEYS[index];
  const FieldIcon = field?.icon ?? Sparkles;
  const answered = useMemo(
    () => QUESTION_KEYS.filter(item => (answers[item.key] ?? "").trim()).map(item => item.key),
    [answers],
  );
  const sentence = useMemo(
    () => composeIntention(answers, { persona, currency, locale }),
    [answers, persona, currency, locale],
  );
  const facts = useMemo(() => {
    if (sentence.trim().length < MIN_INTENTION_LENGTH) return [] as string[];
    const draft = parseIntention(sentence);
    const lines: string[] = [];
    if (draft.pivot && draft.pivot.confidence !== "manquant" && draft.pivot.value) {
      lines.push(
        new Date(draft.pivot.value).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
          month: "long",
          year: "numeric",
        }),
      );
    }
    if (draft.guestsCount?.value) {
      lines.push(locale === "en" ? `${draft.guestsCount.value} guests` : `${draft.guestsCount.value} invités`);
    }
    if (draft.budget?.value) lines.push(budgetToken(String(draft.budget.value), (draft.currency as CurrencyCode) || currency, locale));
    if (draft.city?.value) lines.push(capitalise(draft.city.value));
    return lines;
  }, [sentence, currency, locale]);

  const labelFor = (key: FieldKey, suffix: "" | ".placeholder" | ".hint"): string =>
    t(`q.${persona}.${key}${suffix}` as I18nKey);

  const submitAnswer = () => {
    if (!field) return;
    const value = text.trim();
    if (!value) {
      setError(t("composer.error.empty"));
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
    setText(answers[QUESTION_KEYS[position]?.key] ?? "");
    setError("");
  };

  const finish = () => {
    const intention = sentence.trim();
    if (intention.length < MIN_INTENTION_LENGTH || answered.length === 0) {
      setError(t("composer.error.min"));
      return;
    }
    setError("");
    trackEvent("landing_intention_composed", { mode: "guided", universe: "mariage", persona, facts: facts.length });
    /* Le persona, la devise et la langue voyagent avec la phrase. */
    saveIntentionMeta({ persona, currency, locale });
    if (signedIn) {
      setIntentionText(intention);
      if (createProjectFromIntention(intention)) navigate("/user-portal");
      return;
    }
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
      {/* Le tout premier choix du hero : qui crée cet espace ? */}
      <div
        data-testid="landing-persona"
        role="group"
        aria-label={t("persona.label")}
        className="mx-auto mb-5 flex w-full max-w-xl flex-col items-center gap-2 sm:flex-row sm:justify-center"
      >
        <span className="text-[11px] uppercase tracking-[.18em] text-white/50 sm:sr-only">{t("persona.label")}</span>
        <PersonaButton
          testId="landing-persona-couple"
          active={persona === "couple"}
          icon={<Heart className="h-3.5 w-3.5" aria-hidden />}
          label={t("persona.couple")}
          sub={t("persona.couple.sub")}
          onClick={() => {
            setPersona("couple");
            saveIntentionMeta({ persona: "couple" });
          }}
        />
        <PersonaButton
          testId="landing-persona-pro"
          active={persona === "pro"}
          icon={<Briefcase className="h-3.5 w-3.5" aria-hidden />}
          label={t("persona.pro")}
          sub={t("persona.pro.sub")}
          onClick={() => {
            setPersona("pro");
            saveIntentionMeta({ persona: "pro" });
          }}
        />
      </div>

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
              <FieldIcon className="h-4 w-4" />
            </span>
            {/* Le Monde ne sait tenir qu'un mariage : l'afficher vaut mieux
               qu'un sélecteur qui promettrait ce que l'app ne fait pas. */}
            <span data-testid="landing-universe" className="whitespace-nowrap px-1 text-[13.5px] font-medium text-white">
              {t(`composer.universe.${persona}` as I18nKey)}
            </span>
          </div>

          <span aria-hidden className="h-px w-[88%] self-center bg-white/12 sm:mx-1 sm:h-6 sm:w-px" />

          <div className="flex min-w-0 flex-1 items-center">
            {done ? (
              <p className="min-w-0 flex-1 truncate px-3 py-2.5 text-[13.5px] text-white/75">
                {t("composer.done")}
              </p>
            ) : (
              <>
                <label className="sr-only" htmlFor="landing-intention-input">
                  {labelFor(field.key, "")}
                </label>
                <input
                  id="landing-intention-input"
                  data-testid="landing-intention-input"
                  aria-label={labelFor(field.key, "")}
                  aria-describedby="landing-intention-hint"
                  autoComplete="off"
                  autoFocus
                  value={text}
                  inputMode={field.key === "guests" || field.key === "budget" ? "numeric" : "text"}
                  onChange={event => {
                    setText(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder={`${labelFor(field.key, ".placeholder")}${field.key === "budget" ? ` (${currencySymbol(currency)})` : ""}`}
                  className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[14.5px] text-white outline-none placeholder:text-white/45"
                />
                {!text.trim() && (
                  <button
                    type="button"
                    data-testid="landing-intention-skip"
                    onClick={skipAnswer}
                    className="mr-1 shrink-0 rounded-full px-3 py-1.5 text-[11.5px] uppercase tracking-[.12em] text-white/45 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    {t("composer.skip")}
                  </button>
                )}
              </>
            )}

            <button
              type="submit"
              data-testid="landing-intention-submit"
              aria-label={done || !field ? t(persona === "pro" ? "composer.createPro" : "composer.create") : t("composer.next")}
              disabled={done ? answered.length === 0 : !text.trim()}
              className="mr-1 grid h-10 w-10 shrink-0 place-items-center self-end rounded-full bg-white text-black transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-35 sm:mr-0 sm:self-auto"
            >
              {done ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Devise du budget : des pastilles, jamais un second formulaire. */}
        {!done && field.key === "budget" && (
          <div
            data-testid="landing-currency"
            role="group"
            aria-label={t("composer.currency")}
            className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 px-2"
          >
            {CURRENCIES.map(item => (
              <button
                key={item.code}
                type="button"
                data-testid={`landing-currency-${item.code}`}
                aria-pressed={currency === item.code}
                title={item.code}
                onClick={() => {
                  setCurrency(item.code);
                  saveIntentionMeta({ currency: item.code });
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                  currency === item.code
                    ? "border-white/50 bg-white text-black"
                    : "border-white/15 bg-black/30 text-white/70 hover:border-white/35 hover:text-white",
                )}
              >
                {item.symbol}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2 text-[12px] text-white/55">
          <p id="landing-intention-hint" aria-live="polite" className="min-w-0 flex-1">
            {error || (done ? t("composer.hint.done") : labelFor(field.key, ".hint"))}
          </p>
          <span aria-hidden className="shrink-0 tabular-nums">
            {Math.min(index + 1, TOTAL_FIELDS)}/{TOTAL_FIELDS}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {QUESTION_KEYS.map((item, position) => {
            const value = answers[item.key];
            const isCurrent = !done && index === position;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => reopen(position)}
                title={value ? `${labelFor(item.key, "")} : ${value}` : labelFor(item.key, "")}
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
                  <span className="truncate">
                    {item.key === "guests"
                      ? locale === "en" ? `${digits(value)} guests` : `${digits(value)} invités`
                      : item.key === "budget"
                        ? budgetToken(digits(value), currency, locale)
                        : value}
                  </span>
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
              {t("composer.facts")} {facts.join(" · ")}
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
          {signedIn
            ? t(persona === "pro" ? "composer.openPro" : "composer.open")
            : t(persona === "pro" ? "composer.createPro" : "composer.create")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        {answered.length > 0 && !done && (
          <button
            type="button"
            onClick={() => setIndex(QUESTION_KEYS.length)}
            className="text-[12.5px] text-white/65 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {t("composer.finishEarly")}
          </button>
        )}
      </div>
    </div>
  );
}

function PersonaButton({
  testId,
  active,
  icon,
  label,
  sub,
  onClick,
}: {
  testId: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-full border px-4 py-2 text-left backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
        active
          ? "border-white bg-white text-black"
          : "border-white/25 bg-black/40 text-white/85 hover:border-white/50 hover:bg-white/10",
      )}
    >
      {icon}
      <span>
        <span className="block text-[12.5px] font-medium leading-tight">{label}</span>
        <span className={cn("block max-w-[15rem] truncate text-[10px] leading-tight", active ? "text-black/55" : "text-white/50")}>
          {sub}
        </span>
      </span>
    </button>
  );
}

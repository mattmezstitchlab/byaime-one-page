import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Coins,
  MapPin,
  ScanLine,
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
import { CarteImport } from "@/components/CarteImport";
import { RoleChoice } from "@/components/RoleChoice";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/*
 * Le parcours d'entrée d'AIME, dans l'ordre validé : CARTE → IMPORT →
 * « Voici ce que nous avons compris » → confirmation → rôle → Monde.
 *
 * Deux portes, plus jamais de choix Couple / Wedding planner : l'import de la
 * carte est l'action principale, « Commencer sans carte » l'alternative. Le
 * persona reste techniquement dans le modèle (vaut « couple ») mais n'est plus
 * une question : une seule expérience, et une seule fois chaque information.
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

type Stage = "entry" | "import" | "role" | "composer";

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

  const initialMeta = useMemo(() => (typeof window === "undefined" ? null : readIntentionMeta()), []);
  /* Une intention déjà posée (compte créé en cours de route) reprend la main. */
  const [savedDraft] = useState(() => (typeof window === "undefined" ? "" : readIntentionDraft()));
  const currency = initialMeta?.currency ?? "EUR";

  const resumed = savedDraft && savedDraft.trim().length >= MIN_INTENTION_LENGTH
    ? answersFromDraft(savedDraft, initialMeta?.locale ?? "fr")
    : {};
  /*
   * Une carte ou un brouillon repris saute la porte d'entrée ; sinon, la porte :
   * importer la carte d'abord, ou commencer les cinq questions.
   */
  const [stage, setStage] = useState<Stage>(() =>
    Object.keys(resumed).length > 0 ? "composer" : "entry",
  );
  const [answers, setAnswers] = useState<Partial<Record<FieldKey, string>>>(resumed);
  const [index, setIndex] = useState(() => {
    const keys = QUESTION_KEYS.map(item => item.key);
    const firstEmpty = keys.findIndex(key => !(resumed[key] ?? "").trim());
    return firstEmpty === -1 ? keys.length : firstEmpty;
  });
  const [text, setText] = useState(() => {
    const keys = QUESTION_KEYS.map(item => item.key);
    const firstEmpty = keys.findIndex(key => !(resumed[key] ?? "").trim());
    return firstEmpty === -1 ? "" : (resumed[keys[firstEmpty]] ?? "");
  });
  const [error, setError] = useState("");

  const done = index >= QUESTION_KEYS.length;
  const field = !done ? QUESTION_KEYS[index] : undefined;
  const FieldIcon = field?.icon ?? Sparkles;
  const answered = useMemo(
    () => QUESTION_KEYS.filter(item => (answers[item.key] ?? "").trim()).map(item => item.key),
    [answers],
  );
  const sentence = useMemo(
    () => composeIntention(answers, { persona: "couple", currency, locale }),
    [answers, currency, locale],
  );

  const labelFor = (key: FieldKey, suffix: "" | ".placeholder" | ".hint"): string =>
    t(`q.couple.${key}${suffix}` as I18nKey);

  const goTo = (position: number) => {
    setIndex(position);
    setText(position >= 0 && position < QUESTION_KEYS.length ? (answers[QUESTION_KEYS[position].key] ?? "") : "");
    setError("");
  };

  const submitAnswer = () => {
    if (!field) return;
    const value = text.trim();
    if (!value) {
      setError(t("composer.error.empty"));
      return;
    }
    const next = { ...answers, [field.key]: value };
    setAnswers(next);
    const position = index + 1;
    setIndex(position);
    setText(position < QUESTION_KEYS.length ? (next[QUESTION_KEYS[position].key] ?? "") : "");
    setError("");
  };

  const skipAnswer = () => {
    if (!field) return;
    goTo(index + 1);
  };

  const goBack = () => {
    if (index <= 0) {
      /* Retour depuis la première question : la porte d'entrée (import d'abord). */
      setStage("entry");
      setError("");
      return;
    }
    goTo(index - 1);
  };

  const finish = () => {
    const intention = sentence.trim();
    if (intention.length < MIN_INTENTION_LENGTH || answered.length === 0) {
      setError(t("composer.error.min"));
      return;
    }
    setError("");
    trackEvent("landing_intention_composed", { mode: "guided", universe: "mariage", persona: "couple", facts: answered.length });
    /* La devise et la langue voyagent avec la phrase ; le persona n'est plus une question. */
    saveIntentionMeta({ persona: "couple", currency, locale });
    if (signedIn) {
      setIntentionText(intention);
      if (createProjectFromIntention(intention)) {
        clearIntentionDraft();
        navigate("/user-portal");
      }
      return;
    }
    saveIntentionDraft(intention);
    navigate("/creation");
  };

  /*
   * Une phrase déjà posée avant la création du compte ne doit pas réafficher
   * l'onboarding : pour une personne connectée qui revient avec un brouillon,
   * on ouvre directement son Monde.
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

  const stepLabel = !done ? t("composer.step", { current: index + 1, total: TOTAL_FIELDS }) : "";

  return (
    <div data-testid="landing-composer" className="mx-auto w-full max-w-2xl text-left">
      {stage === "entry" ? (
        <div
          data-testid="landing-entry"
          className="overflow-hidden rounded-[22px] border border-white/15 bg-[#0b0b0d] text-white shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)_inset]"
        >
          <div className="flex h-[46px] items-center gap-2.5 border-b border-white/10 bg-[#0b0b0d] px-5">
            <span className="flex items-center gap-1.5">
              <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" />
              <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" />
              <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
            </span>
            <span className="ml-3 text-[12px] font-medium tracking-[.02em] text-white/60">AIME — Nouveau Monde</span>
          </div>
          <div className="p-5 text-center sm:p-6">
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.24em] text-white/60">
              {t("carte.entry.title")}
            </p>
            <p className="mx-auto mt-2 max-w-md text-center text-[13px] leading-relaxed text-white/50">
              {t("carte.entry.subtitle")}
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                data-testid="landing-import-primary"
                onClick={() => {
                  trackEvent("carte_entry_opened", { entry: "import" });
                  setStage("import");
                }}
                className="inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-white px-6 text-[14.5px] font-semibold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <ScanLine className="h-4 w-4" aria-hidden />
                {t("carte.entry.primary")}
              </button>
              <button
                type="button"
                data-testid="landing-start-blank"
                onClick={() => {
                  trackEvent("carte_entry_opened", { entry: "blank" });
                  setStage("composer");
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 px-5 text-[13px] text-white/75 transition hover:border-white/45 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {t("carte.entry.secondary")}
              </button>
            </div>
          </div>
        </div>
      ) : stage === "import" ? (
        <CarteImport signedIn={signedIn} onConfirmed={() => setStage("role")} onBack={() => setStage("entry")} />
      ) : stage === "role" ? (
        <RoleChoice signedIn={signedIn} onBack={() => setStage("entry")} />
      ) : done ? (
        <div className="rounded-[2rem] border border-white/15 bg-[#171410] p-6 text-center text-white backdrop-blur-xl sm:p-8">
          <span aria-hidden className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white text-black">
            <Check className="h-5 w-5" />
          </span>
          <p className="mt-4 text-[15px] font-medium">{t("composer.ready")}</p>
          <p className="mx-auto mt-3 max-w-md text-sm font-light leading-relaxed text-white/75">{sentence}</p>
          <button
            type="button"
            onClick={finish}
            disabled={answered.length === 0}
            data-testid="landing-intention-finish"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-7 text-[14px] font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {signedIn ? t("composer.open") : t("composer.create")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <p className="mt-4">
            <button
              type="button"
              onClick={() => goTo(0)}
              className="text-[12.5px] text-white/65 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              {t("composer.review")}
            </button>
          </p>
        </div>
      ) : (
        <form
          data-testid="landing-intention-form"
          onSubmit={event => {
            event.preventDefault();
            submitAnswer();
          }}
          className="rounded-[2rem] border border-white/15 bg-[#171410] p-6 text-white backdrop-blur-xl sm:p-8"
        >
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              data-testid="landing-intention-back"
              onClick={goBack}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12.5px] text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              {t("composer.back")}
            </button>
            <p aria-hidden className="text-[12px] tabular-nums text-white/55">{stepLabel}</p>
          </div>
          <div
            role="progressbar"
            aria-label={stepLabel}
            aria-valuemin={1}
            aria-valuemax={TOTAL_FIELDS}
            aria-valuenow={index + 1}
            className="mt-3 h-1 overflow-hidden rounded-full bg-white/12"
          >
            <div
              aria-hidden
              className="h-full rounded-full bg-white/80 transition-all"
              style={{ width: `${((index + 1) / TOTAL_FIELDS) * 100}%` }}
            />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.07]">
              <FieldIcon className="h-4 w-4" />
            </span>
            <label htmlFor="landing-intention-input" className="text-[16px] font-medium leading-snug">
              {field && labelFor(field.key, "")}
            </label>
          </div>
          <input
            id="landing-intention-input"
            data-testid="landing-intention-input"
            aria-describedby="landing-intention-hint"
            autoComplete="off"
            autoFocus
            value={text}
            inputMode={field?.key === "guests" || field?.key === "budget" ? "numeric" : "text"}
            onChange={event => {
              setText(event.target.value);
              if (error) setError("");
            }}
            placeholder={field ? `${labelFor(field.key, ".placeholder")}${field.key === "budget" ? ` (${currencySymbol(currency)})` : ""}` : ""}
            className="mt-4 h-12 w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 text-[15px] text-white outline-none transition placeholder:text-white/45 focus:border-white/40 focus:bg-white/[0.09]"
          />
          <p id="landing-intention-hint" aria-live="polite" className="mt-2.5 min-h-5 px-1 text-[12.5px] text-white/60">
            {error || (field && labelFor(field.key, ".hint"))}
          </p>

          {/* Devise du budget : des pastilles, jamais un second formulaire. */}
          {field?.key === "budget" && (
            <div
              data-testid="landing-currency"
              role="group"
              aria-label={t("composer.currency")}
              className="mt-1 flex flex-wrap items-center gap-1.5 px-1"
            >
              {CURRENCIES.map(item => (
                <button
                  key={item.code}
                  type="button"
                  data-testid={`landing-currency-${item.code}`}
                  aria-pressed={currency === item.code}
                  title={item.code}
                  onClick={() => {
                    saveIntentionMeta({ currency: item.code });
                    window.dispatchEvent(new Event("aime-currency-changed"));
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                    currency === item.code
                      ? "border-white/50 bg-white text-black"
                      : "border-white/25 bg-black/20 text-white/70 hover:border-white/45 hover:text-white",
                  )}
                >
                  {item.symbol}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              data-testid="landing-intention-skip"
              onClick={skipAnswer}
              className="rounded-full px-4 py-2.5 text-[12.5px] uppercase tracking-[.12em] text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {t("composer.skip")}
            </button>
            <button
              type="submit"
              data-testid="landing-intention-submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {t("composer.continue")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

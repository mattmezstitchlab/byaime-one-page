/**
 * La barre du héros : une seule ligne fine, pas un bloc.
 * À gauche, le menu des univers (même design que le champ) ; au centre, la
 * question en cours — sa réponse se pose en pastille en dessous et se rouvre
 * d'un clic. Changer d'univers relance les questions : elles dépendent du
 * registre (Vague 3 : socle universel A, puis packs Univers et Domaine).
 *
 * Les questions affichées viennent de `questionsFor(typeId)` ; le blueprint
 * ne sert plus que de filet dormant. Les réponses sont stockées BRUTES sous
 * la clé de la question (registre ouvert — étape 4) ; c'est
 * `storyFromAnswers` qui compose le récit via le `sentence` de chacune.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Coins,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { UNIVERSE_TREE } from "@/lib/aime/universeTree";
import { PROJECT_TYPES, blueprintFor, projectTypeById } from "@/lib/aime/world/blueprints";
import {
  blueprintQuestionsAsSpecs,
  chipText,
  questionsFor,
  type QuestionInputType,
  type QuestionSpec,
} from "@/lib/aime/world/questions";
import type { JourneyAnswers } from "@/lib/aime/world/journey";

type HeroField = {
  key: string;
  label: string;
  placeholder: string;
  type: "type" | QuestionInputType;
  spec?: QuestionSpec;
};

/* La barre reste fine : une ligne au repos, trois au maximum. */
const TEXTAREA_MIN_HEIGHT = 44;
const TEXTAREA_MAX_HEIGHT = 132;

function iconFor(field: HeroField): typeof CalendarDays {
  if (field.type === "type") return Sparkles;
  switch (field.spec?.mapsTo) {
    case "day":
      return CalendarDays;
    case "place":
      return MapPin;
    case "guests":
      return Users;
    case "budget":
      return Coins;
    default:
      return Sparkles;
  }
}

function usesTextarea(field?: HeroField) {
  if (!field?.spec || field.type !== "text") return false;
  return field.spec.mapsTo === "intention" || field.spec.mapsTo.startsWith("detail:");
}

export function HeroBar({
  answers,
  onAnswer,
  onCompletionChange,
  onRestart,
  startAddon,
}: {
  answers: JourneyAnswers;
  onAnswer: (key: string, value: string) => void;
  onCompletionChange?: (done: boolean) => void;
  /** Changer d'univers efface les réponses du monde précédent. */
  onRestart?: () => void;
  startAddon?: ReactNode;
}) {
  const [raw, setRaw] = useState<Partial<Record<string, string>>>({});
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const typeId = raw["type"] ?? answers["type"] ?? "";

  /* Le type choisi est la source de vérité des questions posées. Le
     blueprint historique reste un filet si le registre renvoyait vide. */
  const questions = useMemo(() => {
    const seq = questionsFor(typeId);
    return seq.length ? seq : blueprintQuestionsAsSpecs(blueprintFor(typeId));
  }, [typeId]);

  const fields: HeroField[] = useMemo(
    () => [
      {
        key: "type",
        label: "Type de projet",
        placeholder: "Mariage, concert, séminaire…",
        type: "type",
      },
      ...questions.map((q): HeroField => ({ ...q, type: q.type, spec: q })),
    ],
    [questions],
  );

  const field = fields[index];
  const done = index >= fields.length;
  const longText = usesTextarea(field);

  useEffect(() => {
    onCompletionChange?.(done);
  }, [done, onCompletionChange]);

  /* Un univers déjà connu (brouillon repris) entre directement dans ses questions. */
  useEffect(() => {
    if (typeId && index === 0) setIndex(1);
  }, [typeId, index]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = `${TEXTAREA_MIN_HEIGHT}px`;
    if (!longText) {
      el.style.overflowY = "hidden";
      return;
    }
    el.style.height = "0px";
    const next = Math.max(TEXTAREA_MIN_HEIGHT, Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT));
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
  }, [field?.key, longText, text]);

  const displayText = (f: HeroField, value: string) => {
    if (f.type === "type") {
      const type = projectTypeById(value);
      return type ? `${type.universeLabel} · ${type.label}` : value;
    }
    return f.spec ? chipText(f.spec, value) : value;
  };

  const submit = (forced?: string) => {
    if (!field || field.type === "type") return;
    const value = (forced ?? text).trim();
    if (!value) return;
    setRaw((r) => ({ ...r, [field.key]: value }));
    /* La réponse est transmise BRUTE sous la clé de la question : c'est le
       registre qui saura la formuler dans le récit (étape 4). */
    onAnswer(field.key, value);
    setText("");
    setIndex((i) => i + 1);
  };

  /* Choisir ou changer d'univers : les questions suivantes en découlent,
     on repart de sa première question, réponses nettoyées. */
  const pickType = (value: string) => {
    if (!value || value === typeId) return;
    onRestart?.();
    setRaw({ type: value });
    onAnswer("type", value);
    setText("");
    setIndex(1);
  };

  const reopen = (i: number) => {
    const f = fields[i];
    if (!f) return;
    setIndex(i);
    setText(raw[f.key] ?? "");
  };

  /* Le menu des univers montre déjà le monde choisi : pas de pastille pour lui. */
  const posed = fields.slice(1, Math.min(index, fields.length)).filter((f) => raw[f.key]);
  const progressCurrent = done ? fields.length : index + 1;

  return (
    <div className="mt-5 w-full text-left">
      {/* Une seule barre fine : l'univers, la réponse, l'action. */}
      <div className="flex w-full items-center gap-1 rounded-full border border-white/25 bg-white/[0.08] p-1 text-white backdrop-blur-md [color-scheme:dark]">
        {startAddon && <div className="shrink-0">{startAddon}</div>}
        {/* Le menu des univers — même design que la barre elle-même. */}
        <div className="relative shrink-0">
          <select
            value={typeId}
            onChange={(e) => pickType(e.target.value)}
            aria-label="Univers du projet"
            className="h-11 max-w-[46vw] cursor-pointer appearance-none truncate rounded-full bg-transparent py-0 pr-8 pl-4 text-[13.5px] font-medium text-white outline-none transition-colors hover:bg-white/10 sm:max-w-none"
          >
            <option value="">Choisir l'univers</option>
            {UNIVERSE_TREE.map((u) => (
              <optgroup key={u.slug} label={u.label}>
                {PROJECT_TYPES.filter((t) => t.universeSlug === u.slug).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-white/60"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.p
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-11 min-w-0 flex-1 truncate px-2 text-[13.5px] leading-[44px] text-white/75"
            >
              AIME a tout ce qu'il lui faut.
            </motion.p>
          ) : field?.type === "choice" ? null : (
            <motion.div
              key={field?.key ?? "vide"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-w-0 flex-1 items-center"
            >
              {field && field.type !== "type" ? (
                <>
                  <span aria-hidden className="h-5 w-px shrink-0 bg-white/20" />
                  {longText ? (
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
                      }}
                      aria-label={field.spec?.question ?? field.label}
                      placeholder={field.spec?.question ?? field.placeholder}
                      rows={1}
                      className="max-h-[132px] min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-3 pr-2 pl-3 text-[14.5px] leading-[20px] text-white outline-none placeholder:text-white/55"
                    />
                  ) : (
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submit();
                      }}
                      type={
                        field.type === "date" ? "date" : field.type === "number" ? "number" : "text"
                      }
                      inputMode={field.type === "number" ? "numeric" : undefined}
                      aria-label={field.spec?.question ?? field.label}
                      placeholder={field.spec?.question ?? field.placeholder}
                      className="h-11 min-w-0 flex-1 bg-transparent py-0 pr-2 pl-3 text-[14.5px] text-white outline-none placeholder:text-white/55"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => submit()}
                    disabled={!text.trim()}
                    aria-label="Continuer"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-black transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </button>
                </>
              ) : (
                <p className="h-11 min-w-0 flex-1 truncate px-2 text-[13.5px] leading-[44px] text-white/55">
                  L'univers d'abord, puis une question fine à la fois.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sous la barre, une ligne discrète : l'aide, le compteur. */}
      <div className="mt-2 flex items-center justify-between gap-3 px-2 text-[12px] text-white/60">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={done ? "done" : (field?.key ?? "type")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-w-0 truncate"
          >
            {done
              ? "La ligne de temps ci-dessous montre déjà ce qu'AIME vient de poser."
              : (field?.spec?.hint ?? "Choisissez d'abord l'univers de votre projet.")}
          </motion.span>
        </AnimatePresence>
        <span aria-hidden className="shrink-0 tabular-nums">
          {progressCurrent}/{fields.length}
        </span>
      </div>

      {/* Les questions à choix : des pastilles fines, même ligne. */}
      {!done && field?.type === "choice" && (
        <div className="mt-2 flex w-full flex-wrap gap-1.5">
          {(field.spec?.choices ?? []).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => submit(c)}
              className="rounded-full border border-white/25 bg-white/[0.08] px-3.5 py-2 text-[13px] text-white/90 backdrop-blur-md transition-colors hover:bg-white/15"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Les réponses posées : de petites pastilles, rouvrables d'un clic. */}
      {posed.length > 0 && (
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5">
          {posed.map((f, i) => {
            const Icon = iconFor(f);
            return (
              <motion.button
                key={f.key}
                type="button"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => reopen(i + 1)}
                title={`Modifier : ${f.label}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[12.5px] text-white/85 transition-colors hover:bg-white/12"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="truncate">{displayText(f, raw[f.key] ?? "")}</span>
              </motion.button>
            );
          })}
          {done && (
            <span className="px-1 text-[12px] text-white/50">Touchez un badge pour modifier</span>
          )}
        </div>
      )}
    </div>
  );
}

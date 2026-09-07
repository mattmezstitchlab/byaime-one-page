import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { AimeField } from "@/components/aime/AimeField";
import { HeroTimeline, type TimelineMarker } from "@/components/aime/HeroTimeline";
import { useRevealedMarkers } from "@/components/aime/home/MarkerReveal";
import { HeroBar } from "@/components/aime/home/HeroBar";
import { AimeLoader } from "@/components/aime/home/AimeLoader";

import { useAuth } from "@/hooks/useAuth";
import { deriveTimeline } from "@/lib/aime/world/derive";
import {
  projectFromJourney,
  proposedMoments,
  storyFromAnswers,
  toneTags,
  type JourneyAnswers,
  type JourneyProposal,
} from "@/lib/aime/world/journey";
import { journeyQuestionCount, questionsFor } from "@/lib/aime/world/questions";
import { readStory, rememberReading, type StoryReading } from "@/lib/aime/world/parseStory";
import { readStoryAI } from "@/lib/aime/world/storyRead.functions";
import {
  clearProjectDraft,
  loadAnyProjectDraft,
  saveProjectDraft,
} from "@/lib/aime/world/projectDraft";
import { persistValidatedProject } from "@/lib/aime/world/projectPersistence";
import { SourceMenu } from "@/components/aime/sources/SourceMenu";
import {
  addPendingSource,
  pendingSources,
  removePendingSource,
  type NewSource,
} from "@/lib/aime/sources/sources";
import { rememberIntention } from "@/lib/aime/rememberIntention";
import { blueprintFor, PROJECT_TYPES } from "@/lib/aime/world/blueprints";
import type { WorldProject } from "@/lib/aime/world/types";

import heroVideo from "@/assets/aime-wedding.mp4.asset.json";

const CONFIDENCE_LABEL: Record<string, string> = {
  confirme: "Confirmé",
  deduit: "Déduit par AIME",
  suggere: "Proposé par AIME",
  a_confirmer: "À confirmer",
  manquant: "À renseigner",
};

/**
 * L'accueil : une intention devient un monde, et ce monde se voit tout de suite
 * sur la ligne de temps. Le monde (`WorldProject`) est la seule source ;
 * la ligne de temps en est la projection (`deriveTimeline`).
 */
export function HomeJourney() {
  const navigate = useNavigate();
  const { userId } = useAuth();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<JourneyAnswers>({});
  const [free, setFree] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [ai, setAi] = useState<Partial<StoryReading> | null>(null);
  const [droppedTones, setDroppedTones] = useState<string[]>([]);
  const [droppedMoments, setDroppedMoments] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [heroDone, setHeroDone] = useState(false);
  const [phase, setPhase] = useState(0);
  const [fading, setFading] = useState(false);
  const [buildSteps, setBuildSteps] = useState<string[]>([]);
  const [resumed, setResumed] = useState<{ story: string; project: WorldProject } | null>(null);
  /* Les sources déposées avant que le projet n'existe : localStorage fait foi. */
  const [pending, setPending] = useState<NewSource[]>([]);
  useEffect(() => setPending(pendingSources()), []);

  const story = useMemo(() => storyFromAnswers(answers), [answers]);

  const tones = useMemo(
    () =>
      toneTags(answers["intention"] ?? answers["libre"]).filter((t) => !droppedTones.includes(t)),
    [answers, droppedTones],
  );
  const moments: JourneyProposal[] = useMemo(
    () =>
      proposedMoments(answers["intention"] ?? answers["libre"]).filter(
        (m) => !droppedMoments.includes(m.id),
      ),
    [answers, droppedMoments],
  );

  const derived = useMemo(
    () => projectFromJourney(answers, { ai, tones, moments, force: step > 0 }),
    [answers, ai, tones, moments, step],
  );
  const project = resumed?.project ?? derived;

  const markers = useMemo(() => (project ? deriveTimeline(project) : []), [project]);
  const { revealed, placed, total } = useRevealedMarkers(markers);

  /* AIME relit le récit complet en arrière-plan : la timeline est déjà là. */
  const read = useServerFn(readStoryAI);
  useEffect(() => {
    const brief = story.trim();
    if (brief.length < 12) {
      setAi(null);
      return;
    }
    let alive = true;
    const t = window.setTimeout(() => {
      /* La lecture d'AIME est spécialisée par le Domaine choisi (étape 6). */
      read({ data: { recit: brief, type: answers["type"] ?? null } })
        .then((r) => {
          if (!alive) return;
          const base = readStory(brief);
          const day = r.date ? new Date(`${r.date}T00:00:00`).getTime() : null;
          const merged: StoryReading = {
            day: day && Number.isFinite(day) ? day : base.day,
            city: r.ville ?? base.city,
            venue: r.lieu ?? base.venue,
            guests: r.invites ?? base.guests,
            ceremonyH: r.heure ?? base.ceremonyH,
            couple: r.couple ?? base.couple,
            booked: r.prestatairesTrouves.length
              ? r.prestatairesTrouves.map((role) => ({ role }))
              : base.booked,
            /* Faits extensibles lus par AIME : fusionnés par mergeReading,
               la réponse de l'utilisateur restant prioritaire. */
            ...(r.details && Object.keys(r.details).length ? { details: r.details } : {}),
          };
          rememberReading(brief, merged);
          setAi(merged);
        })
        .catch(() => {
          /* le repérage local suffit : le parcours n'est jamais bloqué */
        });
    }, 700);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story]);

  const enterProject = useCallback(
    async (target: WorldProject, targetStory: string, typeId?: string | null) => {
      saveProjectDraft(targetStory, target);
      void rememberIntention(userId, targetStory);
      if (!userId) {
        navigate({ to: "/auth", search: { suite: "projet" } });
        return;
      }

      /* Les étapes affichées sont celles du projet réellement construit. */
      const steps = [...blueprintFor(typeId).loadingSteps, "Ouverture de votre projet"];
      setBuildSteps(steps);
      setPhase(0);
      setFading(false);
      setBusy(true);

      const started = Date.now();
      const MIN = 10_000;
      /* Le travail réel commence tout de suite ; la mise en scène suit. */
      const work = persistValidatedProject(target, userId, targetStory);

      const timer = window.setInterval(
        () => setPhase((p) => Math.min(p + 1, steps.length - 2)),
        Math.max(900, MIN / steps.length),
      );

      try {
        const id = await work;
        clearProjectDraft();
        const rest = Math.max(0, MIN - (Date.now() - started));
        await new Promise((r) => window.setTimeout(r, rest));
        window.clearInterval(timer);
        setPhase(steps.length - 1);
        await new Promise((r) => window.setTimeout(r, 700));
        setFading(true);
        await new Promise((r) => window.setTimeout(r, 600));
        navigate({ to: "/projets/$id", params: { id } });
      } catch (err) {
        window.clearInterval(timer);
        toast((err as Error).message);
        setBusy(false);
        setFading(false);
      }
    },
    [navigate, userId],
  );

  /* Le seuil de progression vient du registre de questions — une seule
     source de vérité ; les futurs packs l'allongeront sans rien changer ici. */
  const questionCount = journeyQuestionCount(answers["type"] ?? null);

  /* Retour de connexion : le brouillon devient le projet, sans rien redemander. */
  const resumedOnce = useRef(false);
  useEffect(() => {
    if (!userId || resumedOnce.current) return;
    const draft = loadAnyProjectDraft();
    if (!draft) return;
    resumedOnce.current = true;
    setResumed(draft);
    setStep(questionCount + 1);
    /* Le brouillon porte déjà son type : on le retransmet pour que les étapes
       de chargement reflètent le bon blueprint, jamais un mariage supposé. */
    const resumedType = draft.project.kind
      ? (PROJECT_TYPES.find((t) => t.id.endsWith("/" + draft.project.kind))?.id ?? null)
      : null;
    void enterProject(draft.project, draft.story, resumedType);
  }, [userId, enterProject, questionCount]);

  /* Au-delà des questions du registre : le parcours est considéré terminé
     (mode libre ou reprise). Le parcours guidé signale sa propre fin depuis
     HeroBar, pour que la composition du Hero reste cohérente. */
  const last = step > questionCount;
  const heroComplete = last || heroDone;

  const openFree = () => {
    setFree(true);
    setFreeText(answers["libre"] ?? "");
  };

  const mergeFreeIntoAnswers = (current: JourneyAnswers, text: string): JourneyAnswers => {
    const next: JourneyAnswers = { ...current, libre: text };
    const reading = readStory(text);
    const specs = questionsFor(current["type"] ?? null);
    const dayIso = reading.day ? new Date(reading.day).toISOString().slice(0, 10) : null;
    const place = reading.venue ?? reading.city ?? null;
    const guests = reading.guests != null ? String(Math.round(reading.guests)) : null;
    const pivotH =
      reading.ceremonyH != null
        ? (() => {
            const h = Math.floor(reading.ceremonyH);
            const m = Math.round((reading.ceremonyH - h) * 60);
            return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
          })()
        : null;
    for (const q of specs) {
      if ((next[q.key] ?? "").trim()) continue;
      if (q.mapsTo === "day" && dayIso) next[q.key] = dayIso;
      else if (q.mapsTo === "place" && place) next[q.key] = place;
      else if (q.mapsTo === "guests" && guests) next[q.key] = guests;
      else if (q.mapsTo === "pivotH" && pivotH) next[q.key] = pivotH;
    }
    return next;
  };

  const submitFree = () => {
    const t = freeText.trim();
    if (t.length < 8) return;
    setAnswers((a) => mergeFreeIntoAnswers(a, t));
    setFree(false);
    setStep(1);
  };

  const openProject = () => {
    if (!project) return;
    void enterProject(project, story || (resumed?.story ?? ""), answers["type"] ?? null);
  };

  const fiche = (m: TimelineMarker) => {
    const confidence = String(
      (m.metadata as Record<string, unknown> | undefined)?.["confidence"] ?? "confirme",
    );
    return (
      <div className="space-y-1.5 text-[12.5px] leading-relaxed">
        <p className="text-[11px] tracking-[0.18em] text-white/50 uppercase">AIME a compris</p>
        <p className="font-medium">{m.title}</p>
        {m.detail && <p className="text-white/70">{m.detail}</p>}
        <p className="text-white/60">
          {CONFIDENCE_LABEL[confidence] ?? "Confirmé"}
          {m.location ? ` · ${m.location}` : ""}
        </p>
      </div>
    );
  };

  return (
    /* Le héros tient dans l'écran restant : en-tête au-dessus, barre du bas
       en dessous — la ligne de temps reste visible, ancrée, jamais décalée sous le pli. */
    <section className="relative isolate flex min-h-[calc(100svh-140px)] flex-col overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-black">
        <video
          src={heroVideo.url}
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          aria-hidden
          className="h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-black/45" />
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-10 text-center md:py-14">
        <AnimatePresence mode="wait">
          {busy ? (
            <motion.div key="chargement" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <AimeLoader steps={buildSteps} active={phase} fading={fading} />
            </motion.div>
          ) : free ? (
            <motion.div
              key="libre"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="w-full max-w-xl"
            >
              <h2 className="text-2xl font-semibold tracking-[-0.03em] md:text-4xl">
                Racontez-nous tout.
              </h2>
              <p className="mt-3 text-[14px] text-white/75">
                La date, le lieu, les invités, l'ambiance : une seule phrase suffit pour commencer.
              </p>
              <div className="mt-6">
                <AimeField
                  value={freeText}
                  onChange={setFreeText}
                  onSubmit={submitFree}
                  disabled={freeText.trim().length < 8}
                  placeholder="On se marie le 14 août 2027 près de Lille, 120 invités, ambiance champêtre…"
                  submitLabel="Continuer"
                />
              </div>
              <button
                type="button"
                onClick={() => setFree(false)}
                className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-white/70 underline underline-offset-4 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Revenir aux questions
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="barre"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl"
            >
              <h1 className="text-3xl font-semibold tracking-[0.06em] uppercase md:text-5xl">
                The art of connection
              </h1>

              <HeroBar
                answers={answers}
                onAnswer={(key, value) => {
                  setAnswers((a) => ({ ...a, [key]: value }));
                  setStep((s) => Math.max(s, 1));
                }}
                onRestart={() => setAnswers({})}
                onCompletionChange={setHeroDone}
                startAddon={
                  <SourceMenu
                    userId={userId}
                    tone="sombre"
                    compact
                    onSource={(source) => {
                      addPendingSource(source);
                      setPending(pendingSources());
                    }}
                  />
                }
              />

              {heroComplete ? (
                project && !busy ? (
                  <div className="mt-5 flex justify-center">
                    <button
                      type="button"
                      onClick={openProject}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-black transition hover:bg-white/92"
                    >
                      Ouvrir mon projet
                      <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>
                ) : null
              ) : (
                <button
                  type="button"
                  onClick={openFree}
                  className="mt-4 text-[13px] text-white/70 underline underline-offset-4 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  Raconter autrement, en une phrase
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* La ligne de temps, ancrée en bas du hero : rien ne passe dessous. */}
      <div className="w-full">
        <div className="flex min-h-10 items-center gap-3 px-4 pb-1.5">
          {total > 0 && (
            <p className="min-w-0 truncate text-[12px] text-white/60">
              {placed} / {total} moments posés
            </p>
          )}
          <span aria-hidden className="flex-1" />
        </div>

        {pending.length > 0 && (
          <ul className="mx-auto mb-2 flex w-full max-w-2xl flex-wrap justify-center gap-1.5 px-4 text-left">
            {pending.map((source, index) => (
              <li
                key={`${source.url}-${index}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[12px] text-white/80"
              >
                <span className="min-w-0 truncate">{source.title || source.url}</span>
                <span className="shrink-0 text-[11px] text-white/50">rejoindra le projet</span>
                <button
                  type="button"
                  aria-label="Retirer cette source"
                  onClick={() => {
                    removePendingSource(index);
                    setPending(pendingSources());
                  }}
                  className="shrink-0 rounded-full p-0.5 text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        {total > 0 ? (
          <HeroTimeline
            markers={revealed}
            preview
            renderExtra={(m) => fiche(m)}
            className="w-full"
          />
        ) : (
          <div className="relative w-full">
            <HeroTimeline markers={[]} preview className="w-full" />
            <p className="pointer-events-none absolute inset-0 grid place-items-center text-[12.5px] text-white/55">
              Votre ligne de temps, prête à recevoir
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

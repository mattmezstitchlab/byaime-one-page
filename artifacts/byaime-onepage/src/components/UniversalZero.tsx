import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Link } from "wouter";
import { useProject } from "@/store/project-store";
import {
  ACTOR_CHOICES,
  ECOSYSTEM_CHOICES,
  intentionChoicesForActor,
  situationChoicesForActor,
  buildUniversalWorld,
  parseFreePhraseToFacts,
} from "@/lib/universal-world";
import type { UniversalActorKind } from "@/lib/types";
import { clearUniversalDraft, loadUniversalDraft, saveUniversalDraft, type UniversalZeroDraft } from "@/lib/universal-draft";
import { cn } from "@/lib/utils";

/**
 * Nouvelle expérience d'accueil : très blanche et minimale.
 * - AIME au-dessus ;
 * - bouton "+" au centre, micro-libellé "Commencer un Monde" au focus/hover ;
 * - après clic, lettre A devient active en couleur ;
 * - parcours A,I,M,E une seule question par étape ;
 * - toujours option "Je ne sais pas encore" / "Passer pour l'instant" ;
 * - retour arrière, brouillon et reprise, accessibilité clavier/lecteur d'écran.
 */

type Step = "idle" | "A" | "I" | "M" | "E";

const STEP_LABEL: Record<Step, string> = {
  idle: "Accueil",
  A: "A — Acteur",
  I: "I — Intention",
  M: "M — Monde",
  E: "E — Écosystème",
};

export function UniversalZero() {
  const projectStore = useProject() as any;

  const [step, setStep] = useState<Step>("idle");
  const [actorKind, setActorKind] = useState<UniversalActorKind | null>(null);
  const [actorDetail, setActorDetail] = useState<string | undefined>(undefined);
  const [actorSub, setActorSub] = useState<string | undefined>(undefined);
  const [intention, setIntention] = useState<string[]>([]);
  const [situation, setSituation] = useState<string[]>([]);
  const [situationFree, setSituationFree] = useState("");
  const [ecosystem, setEcosystem] = useState<string[]>([]);
  const [showFactsPreview, setShowFactsPreview] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  const plusRef = useRef<HTMLButtonElement>(null);

  // Load draft on mount
  useEffect(() => {
    const draft = loadUniversalDraft();
    if (draft && draft.step) {
      setHasDraft(true);
    }
  }, []);

  // Save draft on change
  useEffect(() => {
    if (step === "idle") return;
    const draft: UniversalZeroDraft = {
      step,
      actorKind: actorKind ?? undefined,
      actorDetail,
      actorSub,
      intention,
      situation,
      situationFree,
      ecosystem,
      updatedAt: Date.now(),
    };
    saveUniversalDraft(draft);
  }, [step, actorKind, actorDetail, actorSub, intention, situation, situationFree, ecosystem]);

  const resumeDraft = () => {
    const draft = loadUniversalDraft();
    if (!draft) return;
    setStep(draft.step ?? "A");
    if (draft.actorKind) setActorKind(draft.actorKind);
    if (draft.actorDetail) setActorDetail(draft.actorDetail);
    if (draft.actorSub) setActorSub(draft.actorSub);
    if (draft.intention) setIntention(draft.intention);
    if (draft.situation) setSituation(draft.situation);
    if (draft.situationFree) setSituationFree(draft.situationFree);
    if (draft.ecosystem) setEcosystem(draft.ecosystem);
  };

  const clearDraft = () => {
    clearUniversalDraft();
    setHasDraft(false);
    setStep("idle");
    setActorKind(null);
    setActorDetail(undefined);
    setActorSub(undefined);
    setIntention([]);
    setSituation([]);
    setSituationFree("");
    setEcosystem([]);
  };

  const start = () => {
    setStep("A");
  };

  const next = () => {
    if (step === "A") setStep("I");
    else if (step === "I") setStep("M");
    else if (step === "M") setStep("E");
    else if (step === "E") {
      // Créer le Monde et ouvrir Timeline
      const input = {
        actorKind: actorKind ?? "person",
        actorDetail,
        intention,
        situation,
        situationFree: situationFree.trim() || undefined,
        ecosystem,
      };
      const project = buildUniversalWorld(input);
      projectStore.createProjectFromWorld(project);
      clearUniversalDraft();
    }
  };

  const back = () => {
    if (step === "I") setStep("A");
    else if (step === "M") setStep("I");
    else if (step === "E") setStep("M");
    else if (step === "A") setStep("idle");
  };

  const skip = () => {
    // Passer pour l'instant : vide la sélection de l'étape courante et avance
    if (step === "A") {
      // ne rien faire, juste avancer
    } else if (step === "I") setIntention([]);
    else if (step === "M") {
      setSituation([]);
      setSituationFree("");
    } else if (step === "E") setEcosystem([]);
    next();
  };

  const toggleChoice = (list: string[], setList: (v: string[]) => void, value: string) => {
    if (value === "je ne sais pas encore" || value === "je pars de zéro" || value === "je continue seul pour l’instant") {
      // option exclusive : si on coche ça, on vide le reste, et inversement
      if (list.includes(value)) setList([]);
      else setList([value]);
      return;
    }
    if (list.includes(value)) setList(list.filter(v => v !== value));
    else {
      // retirer l'option exclusive si présente
      const filtered = list.filter(v => !["je ne sais pas encore", "je pars de zéro", "je continue seul pour l’instant"].includes(v));
      setList([...filtered, value]);
    }
  };

  const factsPreview = useMemo(() => {
    if (!situationFree.trim()) return [];
    return parseFreePhraseToFacts(situationFree);
  }, [situationFree]);

  const isSaxoPath = actorDetail === "saxophoniste";
  const isRestoPath = actorDetail === "restaurateur" || actorDetail === "cuisinier";
  const isGroupPath = actorKind === "group" || actorDetail === "groupe" || actorDetail === "collectif artistique" || actorDetail === "groupe musical";
  const isAssoPath = actorKind === "organization" || actorDetail === "association";
  const isEventPath = actorKind === "event" || actorDetail === "festival";


  return (
    <section
      data-testid="universal-zero"
      className="relative flex min-h-[100dvh] flex-col bg-white text-zinc-900"
      aria-labelledby="zero-title"
    >
      {/* Header : AIME au-dessus */}
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <Link
          href="/"
          data-testid="zero-home"
          className="font-display text-sm font-medium tracking-[0.32em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30"
          aria-label="Retour à l’accueil AIME"
        >
          AIME
        </Link>
        <Link
          href="/ma-carte"
          data-testid="zero-card"
          className="text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30"
        >
          Ma carte personnelle
        </Link>
      </header>

      {/* Draft resume banner */}
      {hasDraft && step === "idle" && (
        <div className="mx-auto w-full max-w-xl px-6">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
            <span>Brouillon en cours — reprendre ?</span>
            <div className="flex gap-2">
              <button
                data-testid="zero-resume"
                onClick={resumeDraft}
                className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30"
              >
                Reprendre
              </button>
              <button
                data-testid="zero-discard"
                onClick={clearDraft}
                className="rounded-full border border-zinc-200 px-4 py-1.5 text-xs hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30"
              >
                Effacer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progression A I M E */}
      <nav aria-label="Progression du parcours" className="mx-auto mt-2 flex items-center gap-3">
        {(["A", "I", "M", "E"] as const).map(letter => {
          const active = step === letter;
          const done = step !== "idle" && (["A", "I", "M", "E"].indexOf(step) > ["A", "I", "M", "E"].indexOf(letter));
          return (
            <span
              key={letter}
              data-testid={`zero-step-${letter}`}
              aria-current={active ? "step" : undefined}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full border text-sm font-medium transition",
                active
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : done
                  ? "border-zinc-900/20 bg-zinc-900/5 text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-400"
              )}
            >
              {letter}
            </span>
          );
        })}
      </nav>
      <p className="mt-2 text-center text-[11px] uppercase tracking-[0.18em] text-zinc-400" aria-live="polite">
        {step === "idle" ? "Prêt à commencer" : STEP_LABEL[step]}
      </p>

      {step === "idle" ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-10">
          <button
            ref={plusRef}
            data-testid="zero-plus"
            onClick={start}
            aria-label="Commencer un Monde"
            className="group relative grid h-28 w-28 place-items-center rounded-full border border-zinc-900/10 bg-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.4)] transition hover:border-zinc-900/20 hover:shadow-[0_24px_70px_-30px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-900/10"
          >
            <Plus aria-hidden className="h-10 w-10 stroke-[1.5] text-zinc-900" />
            <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-3 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              Commencer un Monde
            </span>
          </button>
          <p className="mt-10 max-w-sm text-center text-sm leading-relaxed text-zinc-500">
            Architecture Intelligente des Mondes Ensemble.<br />
            <span className="text-zinc-900">Le mariage est le premier vertical.</span> AIME permet à toute personne, activité, collectif ou événement de construire son propre Monde.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-[11px] text-zinc-400">
            <span>saxophoniste</span>
            <span>·</span>
            <span>restaurateur</span>
            <span>·</span>
            <span>groupe</span>
            <span>·</span>
            <span>association</span>
            <span>·</span>
            <span>couple</span>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-10 pt-8">
          {/* Question principale */}
          <div className="space-y-6">
            {step === "A" && (
              <div data-testid="zero-step-A" role="group" aria-labelledby="zero-q-A">
                <h1 id="zero-q-A" className="font-display text-2xl font-medium tracking-tight">
                  Qui êtes-vous dans ce Monde ?
                </h1>
                <p className="mt-2 text-sm text-zinc-500">Choisissez ce qui vous décrit le mieux — vous pourrez préciser ensuite.</p>

                <div className="mt-6 grid gap-2" role="listbox" aria-label="Choix d’acteur">
                  {ACTOR_CHOICES.map(choice => (
                    <button
                      key={choice.id}
                      data-testid={`actor-${choice.id}`}
                      role="option"
                      aria-selected={actorKind === choice.id}
                      onClick={() => {
                        setActorKind(choice.id);
                        // reset detail if kind changes
                        if (choice.id !== actorKind) {
                          setActorDetail(undefined);
                          setActorSub(undefined);
                        }
                      }}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30",
                        actorKind === choice.id ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:border-zinc-300"
                      )}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>

                {/* Sous-choix pour saxophoniste */}
                {actorKind === "person" && (
                  <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-sm font-medium">Précisez votre activité (optionnel)</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["artiste / musicien", "restaurateur", "artisan", "activité indépendante", "je ne sais pas encore"].map(opt => (
                        <button
                          key={opt}
                          data-testid={`actor-sub-${opt.replace(/\W/g, "-")}`}
                          onClick={() => {
                            setActorSub(opt);
                            if (opt === "restaurateur") setActorDetail("restaurateur");
                            else if (opt === "artisan") setActorDetail("artisan");
                            else if (opt !== "artiste / musicien" && opt !== "je ne sais pas encore") setActorDetail(opt);
                            else if (opt === "je ne sais pas encore") setActorDetail(undefined);
                          }}
                          aria-pressed={actorSub === opt}
                          className={cn(
                            "rounded-full border px-4 py-2 text-xs",
                            actorSub === opt ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {actorSub === "artiste / musicien" && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-zinc-600">Instrument / discipline</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {["saxophoniste", "autre musicien", "autre artiste"].map(opt => (
                            <button
                              key={opt}
                              data-testid={`actor-detail-${opt}`}
                              onClick={() => setActorDetail(opt)}
                              aria-pressed={actorDetail === opt}
                              className={cn(
                                "rounded-full border px-4 py-2 text-xs",
                                actorDetail === opt ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {actorSub === "restaurateur" && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-zinc-600">Précisez</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {["restaurateur", "cuisinier", "autre restauration"].map(opt => (
                            <button key={opt} data-testid={`actor-detail-${opt}`} onClick={() => setActorDetail(opt)} aria-pressed={actorDetail === opt} className={cn("rounded-full border px-4 py-2 text-xs", actorDetail === opt ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white")}>{opt}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {actorKind === "independent" && (
                  <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-sm font-medium">Votre activité indépendante</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["artiste / musicien", "restaurateur", "artisan", "services", "autre"].map(opt => (
                        <button
                          key={opt}
                          data-testid={`actor-sub-${opt.replace(/\W/g, "-")}`}
                          onClick={() => {
                            setActorSub(opt);
                            if (opt === "restaurateur") setActorDetail("restaurateur");
                            else if (opt === "artisan") setActorDetail("artisan");
                            else if (opt !== "artiste / musicien") setActorDetail(opt === "autre" ? undefined : opt);
                          }}
                          aria-pressed={actorSub === opt}
                          className={cn("rounded-full border px-4 py-2 text-xs", actorSub === opt ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white")}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {actorSub === "artiste / musicien" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {["saxophoniste", "autre musicien"].map(opt => (
                          <button key={opt} data-testid={`actor-detail-${opt}`} onClick={() => setActorDetail(opt)} aria-pressed={actorDetail === opt} className={cn("rounded-full border px-4 py-2 text-xs", actorDetail === opt ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white")}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                    {actorSub === "restaurateur" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {["restaurateur", "cuisinier"].map(opt => (
                          <button key={opt} data-testid={`actor-detail-${opt}`} onClick={() => setActorDetail(opt)} aria-pressed={actorDetail === opt} className={cn("rounded-full border px-4 py-2 text-xs", actorDetail === opt ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white")}>{opt}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {actorKind === "group" && (
                  <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-sm font-medium">Précisez le collectif (optionnel)</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["groupe musical", "collectif artistique", "association", "autre collectif", "je ne sais pas encore"].map(opt => (
                        <button key={opt} data-testid={`actor-sub-${opt.replace(/\W/g, "-")}`} onClick={() => { setActorSub(opt); if (opt === "groupe musical") setActorDetail("groupe"); else if (opt !== "je ne sais pas encore") setActorDetail(opt); else setActorDetail(undefined); }} aria-pressed={actorSub === opt} className={cn("rounded-full border px-4 py-2 text-xs", actorSub === opt ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white")}>{opt}</button>
                      ))}
                    </div>
                    {actorSub === "groupe musical" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {["groupe", "saxophoniste", "autre musicien"].map(opt => (
                          <button key={opt} data-testid={`actor-detail-${opt}`} onClick={() => setActorDetail(opt)} aria-pressed={actorDetail === opt} className={cn("rounded-full border px-4 py-2 text-xs", actorDetail === opt ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white")}>{opt}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {actorKind === "organization" && (
                  <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-sm font-medium">Votre organisation (optionnel)</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["association", "collectif", "entreprise", "autre organisation", "je ne sais pas encore"].map(opt => (
                        <button key={opt} data-testid={`actor-sub-${opt.replace(/\W/g, "-")}`} onClick={() => { setActorSub(opt); setActorDetail(opt === "je ne sais pas encore" ? undefined : opt); }} aria-pressed={actorSub === opt} className={cn("rounded-full border px-4 py-2 text-xs", actorSub === opt ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white")}>{opt}</button>
                      ))}
                    </div>
                  </div>
                )}

                {actorKind === "event" && (
                  <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-sm font-medium">Type d’événement (optionnel)</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["festival", "événement privé", "rencontre", "autre événement", "je ne sais pas encore"].map(opt => (
                        <button key={opt} data-testid={`actor-sub-${opt.replace(/\W/g, "-")}`} onClick={() => { setActorSub(opt); setActorDetail(opt === "je ne sais pas encore" ? undefined : opt); }} aria-pressed={actorSub === opt} className={cn("rounded-full border px-4 py-2 text-xs", actorSub === opt ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white")}>{opt}</button>
                      ))}
                    </div>
                  </div>
                )}

                {actorKind === "couple" && (
                  <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-xs text-zinc-600">Monde pour un couple — le mariage reste le premier vertical, mais vous pouvez créer tout autre Monde à deux.</p>
                )}
                {actorKind === "join" && (
                  <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-xs text-zinc-600">Vous rejoindrez un Monde existant — AIME vous guidera vers l’invitation.</p>
                )}

                {/* Cas saxo direct : afficher info */}
                {isSaxoPath && (
                  <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                    Branche contextualisée : <strong>saxophoniste auto-entrepreneur</strong> — trajectoire vers intermittence proposée, jamais appliquée sans validation.
                  </p>
                )}
                {isRestoPath && (
                  <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                    Branche contextualisée : <strong>restaurateur</strong> — trajectoire d’ouverture de lieu et de carte, proposée à vérifier.
                  </p>
                )}
                {isGroupPath && !isSaxoPath && (
                  <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-700">
                    Branche contextualisée : <strong>collectif / groupe</strong> — organisation des dates et du répertoire, trajectoire générique proposée.
                  </p>
                )}
                {isAssoPath && (
                  <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-700">
                    Branche contextualisée : <strong>association</strong> — fédération des membres et événements, trajectoire générique proposée.
                  </p>
                )}
                {isEventPath && (
                  <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-700">
                    Branche contextualisée : <strong>événement</strong> — date, lieu et programme, trajectoire générique proposée.
                  </p>
                )}
              </div>
            )}

            {step === "I" && (
              <div data-testid="zero-step-I" role="group" aria-labelledby="zero-q-I">
                <h1 id="zero-q-I" className="font-display text-2xl font-medium tracking-tight">
                  Qu’est-ce que vous voulez rendre possible ?
                </h1>
                <p className="mt-2 text-sm text-zinc-500">Choisissez une ou plusieurs intentions. Vous pourrez en ajouter plus tard.</p>
                <div className="mt-6 grid gap-2">
                  {intentionChoicesForActor(actorDetail, actorKind ?? undefined).map(choice => (
                    <button
                      key={choice}
                      data-testid={`intention-${choice.replace(/\W/g, "-")}`}
                      aria-pressed={intention.includes(choice)}
                      onClick={() => toggleChoice(intention, setIntention, choice)}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left text-sm transition",
                        intention.includes(choice) ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:border-zinc-300"
                      )}
                    >
                      {choice}
                      {choice === "explorer le régime du spectacle" && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900">trajectoire à explorer</span>}
                    </button>
                  ))}
                </div>
                {intention.includes("explorer le régime du spectacle") && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                    L’intermittence n’est pas un bouton de changement de statut — c’est une trajectoire à explorer, à vérifier auprès des organismes compétents. AIME la modélise comme objectif, pas comme bascule automatique.
                  </p>
                )}
              </div>
            )}

            {step === "M" && (
              <div data-testid="zero-step-M" role="group" aria-labelledby="zero-q-M">
                <h1 id="zero-q-M" className="font-display text-2xl font-medium tracking-tight">
                  Qu’est-ce qui existe déjà aujourd’hui ?
                </h1>
                <p className="mt-2 text-sm text-zinc-500">Cochez ce qui est déjà là. Laissez vide ce qui est à vérifier.</p>
                <div className="mt-6 grid gap-2">
                  {situationChoicesForActor(actorDetail, actorKind ?? undefined).map(choice => (
                    <button
                      key={choice}
                      data-testid={`situation-${choice.replace(/\W/g, "-")}`}
                      aria-pressed={situation.includes(choice)}
                      onClick={() => toggleChoice(situation, setSituation, choice)}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left text-sm transition",
                        situation.includes(choice) ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:border-zinc-300"
                      )}
                    >
                      {choice}
                    </button>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
                  <label htmlFor="situation-free" className="text-sm font-medium">
                    Ou décrivez en une phrase (optionnel)
                  </label>
                  <textarea
                    id="situation-free"
                    data-testid="situation-free"
                    value={situationFree}
                    onChange={e => setSituationFree(e.target.value)}
                    placeholder="Ex. Je suis saxophoniste auto-entrepreneur, je joue dans des mariages et je donne des cours."
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />
                  {situationFree.trim().length > 10 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        data-testid="situation-analyze"
                        onClick={() => setShowFactsPreview(v => !v)}
                        className="text-xs text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900"
                      >
                        {showFactsPreview ? "Masquer l’analyse AIME" : "Voir ce qu’AIME a compris"}
                      </button>
                      {showFactsPreview && (
                        <div data-testid="facts-preview" className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                          <p className="text-xs font-medium text-zinc-700">AIME propose ces faits — à confirmer :</p>
                          <ul className="mt-2 space-y-1">
                            {factsPreview.map(f => (
                              <li key={f.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
                                <span>{f.label}</span>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900">{f.status}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 text-[11px] text-zinc-500">Aucun fait n’est enregistré sans votre confirmation. Vous pouvez cocher, corriger ou laisser à vérifier.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === "E" && (
              <div data-testid="zero-step-E" role="group" aria-labelledby="zero-q-E">
                <h1 id="zero-q-E" className="font-display text-2xl font-medium tracking-tight">
                  Avec qui ou quoi ce Monde existe-t-il ?
                </h1>
                <p className="mt-2 text-sm text-zinc-500">Votre écosystème actuel — ceux qui font déjà partie de votre Monde.</p>
                <div className="mt-6 grid gap-2">
                  {ECOSYSTEM_CHOICES.map(choice => (
                    <button
                      key={choice}
                      data-testid={`ecosystem-${choice.replace(/\W/g, "-")}`}
                      aria-pressed={ecosystem.includes(choice)}
                      onClick={() => toggleChoice(ecosystem, setEcosystem, choice)}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left text-sm transition",
                        ecosystem.includes(choice) ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:border-zinc-300"
                      )}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-10 flex items-center justify-between gap-3">
            <button
              data-testid="zero-back"
              onClick={back}
              className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30"
            >
              Retour
            </button>
            <div className="flex items-center gap-2">
              <button
                data-testid="zero-skip"
                onClick={skip}
                className="rounded-full px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30"
              >
                {step === "E" ? "Je continue seul pour l’instant" : "Passer pour l’instant"}
              </button>
              <button
                data-testid="zero-next"
                onClick={next}
                disabled={false}
                className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30 disabled:opacity-40"
              >
                {step === "E" ? "Ouvrir le Fil" : "Continuer"}
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-400">
            Option <em>Je ne sais pas encore</em> toujours disponible — vous pouvez avancer et reprendre plus tard. Carte personnelle séparée.
          </p>
        </div>
      )}
    </section>
  );
}

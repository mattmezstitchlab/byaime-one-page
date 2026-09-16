import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coins, CalendarDays, Check, MapPin, ScanLine, Sparkles, Users } from "lucide-react";
import { useLocation } from "wouter";
import {
  emptyCard,
  emptyFunctioning,
  emptyParticipation,
  PRESENCE_MOMENTS,
  ROLE_GROUPS,
  type CardMusic,
  type Participation,
  type ProfessionalFunctioning,
  type ProfessionalProfile,
  type UniversalCard,
} from "@workspace/aime-domain";
import { weddingDisplayLabel } from "@/lib/project-catalog";
import { useProject } from "@/store/project-store";
import { apiCall, jsonPut } from "@/lib/api-call";
import { failureMessage } from "@/lib/api-messages";
import { CARD_DRAFT_KEY } from "@/lib/intention-draft";
import { useI18n, type I18nKey } from "@/lib/i18n";
import { CURRENCIES, currencySymbol, type CurrencyCode } from "@/lib/money";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  IdentityFields,
  MusicPicker,
  PresenceFields,
  RolesPicker,
  SlotsEditor,
  cardButtonStyle,
  cardInputStyle,
} from "@/components/card-blocks";
import {
  ProfessionalAssignmentsEditor,
  ProfessionalParametersEditor,
  ProfessionalProfileEditor,
} from "@/components/ProfessionalProfileEditor";
import { RsvpClaimPanel } from "@/components/RsvpClaimPanel";
import { CarteImport } from "@/components/CarteImport";
import {
  KnownSummary,
  SaveNoticeBanner,
  StepFlow,
  type SaveNotice,
} from "./StepFlow";
import {
  activityOptions,
  emptyOneboardingContext,
  resolveOneboardingPlan,
  suggestRolesFromActivities,
  type OneboardingContext,
} from "@/lib/oneboarding-plan";
import {
  answeredFields,
  composeIntention,
  weddingDraftFromAnswers,
  type WeddingAnswers,
  type WeddingFieldKey,
} from "@/lib/wedding-answers";

/*
 * Le Oneboarding BYAIME — un seul parcours, pour tout le monde.
 *
 * Ce composant est un **orchestrateur**. Il ne possède aucune règle métier qui
 * existe déjà ailleurs : les champs viennent de `components/card-blocks.tsx`,
 * l'édition d'une activité de `ProfessionalProfileEditor`, le rattachement d'une
 * invitation de `RsvpClaimPanel`, la persistance des endpoints existants. Ce
 * qu'il ajoute, c'est l'ordre — et cet ordre vient de `lib/oneboarding-plan.ts`,
 * une fonction pure.
 *
 * Trois règles tenues ici :
 *  1. cinq étapes, toujours, même quand BYAIME sait déjà ;
 *  2. Ma carte → Mon activité → Ce mariage, jamais un quatrième niveau ;
 *  3. aucune étape suivante tant qu'une écriture obligatoire a échoué — on ne
 *     navigue jamais vers un mariage qui n'existe pas côté serveur.
 */

const ACTIVITIES_DRAFT_KEY = "aime-oneboarding-activities-v1";
const WEDDING_ANSWERS_KEY = "aime-oneboarding-wedding-answers-v1";

const PROFESSIONAL_ROLES: readonly string[] = ROLE_GROUPS.Professionnels;
const NON_PROFESSIONAL_GROUPS: [string, readonly string[]][] = [
  ["Couple", ROLE_GROUPS.Couple],
  ["Famille", ROLE_GROUPS.Famille],
  ["Entourage", ROLE_GROUPS.Entourage],
];

const WEDDING_FIELD_ICON: Record<WeddingFieldKey, typeof CalendarDays> = {
  date: CalendarDays,
  place: MapPin,
  guests: Users,
  budget: Coins,
  tone: Sparkles,
};
const WEDDING_FIELDS: WeddingFieldKey[] = ["date", "place", "guests", "budget", "tone"];

async function api(path: string, body?: unknown): Promise<any> {
  return apiCall(path, body === undefined ? undefined : jsonPut(body));
}

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function Oneboarding({
  signedIn = false,
  onOpenWedding,
}: {
  signedIn?: boolean;
  /** Appelée à la fin du parcours. Par défaut : navigation vers le Monde. */
  onOpenWedding?: () => void;
}) {
  const [, navigate] = useLocation();
  const { t, locale } = useI18n();
  const { projects = [], selectProject, project, createProjectOnServer } = useProject();

  const [stage, setStage] = useState<"entry" | "flow" | "import">("entry");
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(signedIn);
  const [loaded, setLoaded] = useState(!signedIn);
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  /* Ma carte */
  const [card, setCard] = useState<UniversalCard>(emptyCard);
  const [version, setVersion] = useState<string | null>(null);
  const [cardUserId, setCardUserId] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState("");

  /* Mon activité */
  const [profiles, setProfiles] = useState<ProfessionalProfile[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [functioningDraft, setFunctioningDraft] = useState<Record<string, ProfessionalFunctioning>>({});
  const [editingProfile, setEditingProfile] = useState<string | null>(null);

  /* Ce mariage */
  const [weddingRoles, setWeddingRoles] = useState<string[]>([]);
  /*
   * Rôles **proposés** par BYAIME à partir des activités de la personne.
   *
   * Une proposition, jamais une affectation : la case est pré-cochée pour éviter
   * une double saisie, mais la personne confirme en validant l'étape — et reste
   * libre de la décocher. Rien ici ne devient un rôle permanent : le rôle
   * appartient à ce mariage, l'activité appartient à la carte.
   */
  const [proposedRoles, setProposedRoles] = useState<string[]>([]);
  const [weddingMode, setWeddingMode] = useState<"create" | "join" | null>(null);
  const [projectId, setProjectId] = useState("");
  const [contextReady, setContextReady] = useState(false);
  const [hasSavedContext, setHasSavedContext] = useState(false);
  const [presence, setPresence] = useState<Participation>(emptyParticipation());
  const [linkedRsvp, setLinkedRsvp] = useState<{ token: string; revoked: boolean } | null>(null);
  const [joining, setJoining] = useState(false);
  const [answers, setAnswers] = useState<WeddingAnswers>({});
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");

  const [notice, setNotice] = useState<SaveNotice>({ kind: "idle" });
  const invitationToken = useRef(
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("invitation") ?? ""),
  );
  const sectionRef = useRef<HTMLElement>(null);

  /* Un parcours qui change d'étape remet son regard en haut de l'écran. */
  useEffect(() => {
    sectionRef.current?.scrollIntoView?.({ block: "start" });
  }, [index, editing, weddingMode, stage]);

  /* ------------------------------------------------------------------ */
  /* Chargement : ce que BYAIME sait déjà de cette personne.             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let active = true;
    const fresh = reloadToken === 0;
    if (fresh) {
      setCard(emptyCard());
      setVersion(null);
      setCardUserId(null);
      setPresence(emptyParticipation());
    }
    setLoadError("");
    setLoaded(!signedIn);
    setBusy(signedIn);

    const restoreLocal = () => {
      const draft = readJson<{ card: UniversalCard }>(CARD_DRAFT_KEY);
      if (draft?.card) setCard(draft.card);
      const activities = readJson<string[]>(ACTIVITIES_DRAFT_KEY);
      if (activities) setSelectedActivities(activities);
      const saved = readJson<WeddingAnswers>(WEDDING_ANSWERS_KEY);
      if (saved) setAnswers(saved);
    };

    const load = async () => {
      try {
        const current = signedIn ? await api("/me/card") : null;
        if (!active) return;
        if (current) {
          setCard(current.data);
          setVersion(current.updatedAt);
          setCardUserId(current.userId);
          sessionStorage.removeItem(CARD_DRAFT_KEY);
        } else {
          restoreLocal();
        }
        /* Les activités sont un complément : leur échec ne bloque pas l'entrée. */
        if (signedIn) {
          try {
            const rows = await api("/me/professional-profiles");
            if (!active) return;
            const list: ProfessionalProfile[] = Array.isArray(rows) ? rows : [];
            setProfiles(list);
            setSelectedActivities((current2) =>
              current2.length ? current2 : list.map((p) => p.profession),
            );
          } catch {
            if (active && fresh) setProfiles([]);
          }
        } else {
          restoreLocal();
        }
      } catch (e) {
        if (!active) return;
        /* Un service injoignable est une information, pas une page morte. */
        setLoadError(failureMessage(e, "Chargement de votre carte impossible"));
        restoreLocal();
      } finally {
        if (active) {
          setLoaded(true);
          setBusy(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [signedIn, reloadToken]);

  /* ------------------------------------------------------------------ */
  /* Le plan : quoi demander, et dans quel ordre.                        */
  /* ------------------------------------------------------------------ */
  const planContext: OneboardingContext = useMemo(
    () => ({
      cardSaved: version !== null,
      activities: profiles.map((p) => p.profession),
      configuredActivities: profiles
        .filter((p) => Object.keys(p.data.parameters).length > 0)
        .map((p) => p.profession),
      selectedActivities,
      weddingRoles,
      wedding: projectId ? { id: projectId, label: labelFor(projectId) } : null,
      participationSaved: hasSavedContext,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, profiles, selectedActivities, weddingRoles, projectId, hasSavedContext, projects, project],
  );
  const plan = useMemo(() => resolveOneboardingPlan(planContext), [planContext]);
  const step = plan.steps[Math.min(index, plan.steps.length - 1)];

  function labelFor(id: string): string {
    const found = projects.find((p) => p.id === id);
    if (found) return found.displayLabel ?? found.title;
    return project?.id === id ? weddingDisplayLabel(project.title, project) : "Votre mariage";
  }

  const update = useCallback(
    <K extends keyof UniversalCard>(key: K, value: UniversalCard[K]) =>
      setCard((c) => ({ ...c, [key]: value })),
    [],
  );
  const contextual = useCallback(
    <K extends keyof Participation>(key: K, value: Participation[K]) =>
      setPresence((p) => ({
        ...p,
        [key]: value,
        ...(key === "roles"
          ? {
              assignments: (p.assignments ?? []).filter((a) =>
                (value as string[]).includes(
                  profiles.find((profile) => profile.id === a.profileId)?.profession ?? "",
                ),
              ),
            }
          : {}),
      })),
    [profiles],
  );

  /* ------------------------------------------------------------------ */
  /* Les écritures. Chacune rend l'état réel — jamais une réussite feinte.*/
  /* ------------------------------------------------------------------ */
  const saveCardNow = async (): Promise<SaveNotice> => {
    if (!card.firstName.trim() || !card.lastName.trim())
      throw new Error("Renseignez votre prénom et votre nom.");
    if (!signedIn) {
      sessionStorage.setItem(CARD_DRAFT_KEY, JSON.stringify({ card }));
      return {
        kind: "draft",
        message:
          "Vos réponses sont conservées pendant cette étape. Créez un compte pour les retrouver sur tous vos appareils.",
      };
    }
    const saved = await api("/me/card", { data: card, updatedAt: version });
    setCard(saved.data);
    setVersion(saved.updatedAt);
    setCardUserId(saved.userId);
    sessionStorage.removeItem(CARD_DRAFT_KEY);
    return { kind: "saved", message: "Votre carte est enregistrée." };
  };

  const saveActivitiesNow = async (): Promise<SaveNotice> => {
    if (!selectedActivities.length)
      return { kind: "idle" };
    if (!signedIn) {
      sessionStorage.setItem(ACTIVITIES_DRAFT_KEY, JSON.stringify(selectedActivities));
      return {
        kind: "draft",
        message:
          "Vos activités sont conservées pendant cette étape. Elles seront enregistrées avec votre compte.",
      };
    }
    for (const profession of selectedActivities) {
      if (profiles.some((p) => p.profession === profession)) continue;
      await api("/me/professional-profiles", {
        profession,
        data: emptyFunctioning(),
        updatedAt: null,
      });
    }
    const rows = await api("/me/professional-profiles");
    setProfiles(Array.isArray(rows) ? rows : []);
    sessionStorage.removeItem(ACTIVITIES_DRAFT_KEY);
    return {
      kind: "saved",
      message:
        selectedActivities.length > 1
          ? `Vos activités sont enregistrées : ${selectedActivities.join(", ")}.`
          : `Votre activité est enregistrée : ${selectedActivities[0]}.`,
    };
  };

  const saveFunctioningNow = async (): Promise<SaveNotice> => {
    const pending = selectedActivities.filter(
      (activity) =>
        !profiles.some(
          (p) => p.profession === activity && Object.keys(p.data.parameters).length > 0,
        ),
    );
    if (!pending.length) return { kind: "idle" };
    if (!signedIn) {
      return {
        kind: "draft",
        message: "Vos réglages sont conservés pendant cette étape.",
      };
    }
    for (const profession of pending) {
      const current = profiles.find((p) => p.profession === profession);
      const data = functioningDraft[profession] ?? current?.data ?? emptyFunctioning();
      const saved = await api("/me/professional-profiles", {
        profession,
        data,
        updatedAt: current?.updatedAt ?? null,
      });
      setProfiles((list) => [...list.filter((p) => p.id !== saved.id), saved]);
    }
    return { kind: "saved", message: "Votre fonctionnement est enregistré." };
  };

  /*
   * L'identifiant du mariage et la charge utile sont passés explicitement.
   *
   * Sans cela, l'étape qui vient de créer le mariage lisait `projectId` — encore
   * vide dans cette closure, puisque `setProjectId` n'a pas encore rendu — et
   * l'enregistrement de la participation échouait juste après une création
   * réussie. Même chose pour les rôles : ils sont dans l'état React, pas encore
   * appliqués au moment de l'appel.
   */
  const saveParticipationTo = async (
    id: string,
    payload: Participation,
  ): Promise<SaveNotice> => {
    if (!signedIn || !id)
      throw new Error("Choisissez un mariage avant d’enregistrer cette association.");
    if (payload.arrival && payload.departure && Date.parse(payload.departure) <= Date.parse(payload.arrival))
      throw new Error("La fin de présence doit suivre le début.");
    if (
      payload.slots.some(
        (s) => !s.label.trim() || !s.start || !s.end || Date.parse(s.end) <= Date.parse(s.start),
      )
    )
      throw new Error("Complétez chaque créneau avec un début et une fin cohérents.");
    await api(`/projects/${id}/my-participation`, payload);
    if (cardUserId) sessionStorage.removeItem(`aime-card-context-draft:${cardUserId}`);
    setHasSavedContext(true);
    return {
      kind: "saved",
      message: "C’est enregistré. BYAIME organise votre Timeline avec ces informations.",
    };
  };
  /** La participation telle qu'elle est à l'écran, pour ce mariage. */
  const participationPayload = (): Participation => ({
    ...presence,
    /* Le rôle choisi à l'étape précédente est repris, jamais redemandé. */
    roles: presence.roles.length ? presence.roles : weddingRoles,
  });

  /* Créer le mariage : réponse structurée → serveur → 2xx → seulement ensuite
     on avance. Un échec laisse les réponses intactes et propose « Réessayer ». */
  const createWeddingNow = async (): Promise<{ notice: SaveNotice; id: string | null }> => {
    const composeOptions = { persona: "couple" as const, currency, locale };
    const result = await createProjectOnServer(
      weddingDraftFromAnswers(answers, composeOptions),
      composeIntention(answers, composeOptions),
    );
    if (!result.ok) return { notice: { kind: "failure", message: result.error }, id: null };
    sessionStorage.removeItem(WEDDING_ANSWERS_KEY);
    return {
      notice: {
        kind: result.pendingServer ? "draft" : "saved",
        message: result.pendingServer
          ? "Votre mariage est conservé pendant cette étape. Il sera enregistré dès votre connexion."
          : "Votre mariage est enregistré.",
      },
      id: result.id,
    };
  };

  const selectWedding = async (id: string) => {
    setProjectId(id);
    setContextReady(false);
    setLinkedRsvp(null);
    setHasSavedContext(false);
    setPresence((p) => ({ ...emptyParticipation(), roles: p.roles }));
    setNotice({ kind: "idle" });
    if (!id || !signedIn) return;
    setBusy(true);
    try {
      const current = await api(`/projects/${id}/my-participation`);
      if (!(await selectProject(id))) throw new Error("Impossible de charger ce mariage.");
      if (current) {
        const { linkedRsvp: source, ...context } = current;
        /* Les rôles choisis à l'étape précédente restent proposés, pas écrasés. */
        setPresence({ ...context, roles: context.roles?.length ? context.roles : weddingRoles });
        setHasSavedContext(true);
        setLinkedRsvp(source ?? null);
      } else {
        setPresence((p) => ({ ...p, roles: weddingRoles }));
      }
      setContextReady(true);
    } catch (e) {
      setNotice({ kind: "failure", message: failureMessage(e, "Chargement impossible") });
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Avancer : une étape à la fois, jamais avant une écriture réussie.   */
  /* ------------------------------------------------------------------ */
  const runStep = async () => {
    setBusy(true);
    setFieldError("");
    try {
      let next: SaveNotice = { kind: "idle" };
      if (step.id === "person") {
        next = await saveCardNow();
      } else if (step.id === "role") {
        /*
         * Aucun rôle n'est imposé. Le plan prévoit explicitement le profil
         * `unknown` — mariage · présence · confirmation — pour qui ne sait pas
         * encore quoi répondre ici. Bloquer l'étape rendait cette branche
         * inatteignable : la personne restait coincée sans porte de sortie.
         *
         * Ne rien choisir n'écrit rien (`idle`) et n'est donc jamais présenté
         * comme un enregistrement réussi.
         */
        next = await saveActivitiesNow();
      } else if (step.id === "functioning") {
        next = await saveFunctioningNow();
      } else if (step.id === "wedding") {
        if (!weddingMode) throw new Error("Créez un mariage, ou rejoignez le vôtre.");
        let weddingId = projectId;
        if (weddingMode === "create" && !projectId) {
          const created = await createWeddingNow();
          next = created.notice;
          /* Pas d'identifiant = la création n'a pas abouti : on reste ici. */
          if (!created.id)
            throw new Error(
              created.notice.kind === "idle" ? "Création impossible" : created.notice.message,
            );
          weddingId = created.id;
          setProjectId(created.id);
          await selectProject(created.id);
          setContextReady(true);
        } else if (!projectId) {
          throw new Error("Choisissez le mariage que vous rejoignez.");
        } else if (!contextReady) {
          throw new Error("Chargez le mariage avant d’enregistrer votre association.");
        }
        /* Les rôles font partie de ce mariage : ils sont enregistrés avec lui. */
        const payload = participationPayload();
        setPresence(payload);
        next = await saveParticipationTo(weddingId, payload);
      } else if (step.id === "presence" || step.id === "organize") {
        const payload = participationPayload();
        setPresence(payload);
        next = await saveParticipationTo(projectId, payload);
      }
      setNotice(next);
      setEditing(false);
      if (index < plan.steps.length - 1) setIndex((i) => i + 1);
      else trackEvent("oneboarding_completed", { profile: plan.profile });
    } catch (e) {
      const message = failureMessage(e, "Enregistrement impossible");
      setNotice({ kind: "failure", message });
      setFieldError(message);
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Ce que chaque étape affiche.                                        */
  /* ------------------------------------------------------------------ */
  if (!loaded)
    return (
      <section
        data-testid="oneboarding-loading"
        className="rounded-[2rem] bg-[#171410] p-8 text-white"
      >
        <p role="status">Chargement de votre carte…</p>
      </section>
    );

  if (stage === "entry")
    return (
      <div
        data-testid="oneboarding-entry"
        className="overflow-hidden rounded-[22px] border border-white/15 bg-[#0b0b0d] text-white shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)_inset]"
      >
        <div className="flex h-[46px] items-center gap-2.5 border-b border-white/10 bg-[#0b0b0d] px-5">
          <span className="flex items-center gap-1.5">
            <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" />
            <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
          </span>
          <span className="ml-3 text-[12px] font-medium tracking-[.02em] text-white/60">
            BYAIME
          </span>
        </div>
        <div className="p-5 text-center sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/60">
            Votre carte BYAIME
          </p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-white/50">
            Votre identité. Une seule fois.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              data-testid="landing-create-primary"
              onClick={() => {
                trackEvent("carte_entry_opened", { entry: version ? "existing" : "create" });
                setStage("flow");
              }}
              className="inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-white px-6 text-[14.5px] font-semibold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ScanLine className="h-4 w-4" aria-hidden />
              {version ? "Ma carte" : "Créer ma carte"}
            </button>
            {version ? (
              <p className="text-[12px] text-white/50">
                Bonjour {card.firstName} — nous ne vous redemanderons pas qui vous êtes.
              </p>
            ) : (
              <p className="max-w-xs text-[12px] leading-relaxed text-white/45">
                Vous ne créez pas encore un mariage. BYAIME vous posera ensuite
                uniquement ce qui vous concerne.
              </p>
            )}
            <button
              type="button"
              data-testid="landing-import-advanced"
              onClick={() => setStage("import")}
              className="min-h-11 text-[12px] text-white/45 underline decoration-white/20 underline-offset-4 transition hover:text-white/70"
            >
              Vous avez déjà un fichier BYAIME ?
            </button>
          </div>
        </div>
      </div>
    );

  if (stage === "import")
    return (
      <CarteImport
        signedIn={signedIn}
        onConfirmed={() => {
          setStage("flow");
          setReloadToken((token) => token + 1);
        }}
        onBack={() => setStage("entry")}
      />
    );

  if (joining && signedIn && version)
    return (
      <RsvpClaimPanel
        initialToken={invitationToken.current}
        onClose={() => setJoining(false)}
        onJoined={async (id) => {
          invitationToken.current = "";
          setJoining(false);
          setWeddingMode("join");
          await selectWedding(id);
        }}
      />
    );

  if (editingProfile)
    return (
      <ProfessionalProfileEditor
        profiles={profiles}
        initialProfileId={profiles.find((p) => p.profession === editingProfile)?.id}
        onClose={() => setEditingProfile(null)}
        onSaved={(saved) => {
          setProfiles((list) => [...list.filter((p) => p.id !== saved.id), saved]);
          setEditingProfile(null);
        }}
      />
    );

  const showEditor = !step.known || editing;
  const knownBadge =
    step.known && !editing ? "BYAIME le sait déjà — vérifiez, puis continuez" : undefined;

  return (
    <section ref={sectionRef} data-testid="oneboarding" className="space-y-4">
      {loadError && (
        <div
          data-testid="card-load-error"
          className="rounded-2xl border border-amber-200/40 bg-amber-100/10 p-4"
        >
          <p role="alert" className="text-sm text-amber-100">
            {loadError}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-amber-100/70">
            Votre carte n’a pas pu être relue depuis votre compte. Vous pouvez
            continuer ici : rien n’est enregistré tant que l’enregistrement n’a
            pas abouti.
          </p>
          <button
            type="button"
            className={`${cardButtonStyle} mt-3`}
            disabled={busy}
            onClick={() => setReloadToken((token) => token + 1)}
          >
            {busy ? "Chargement…" : "Recharger ma carte"}
          </button>
        </div>
      )}

      <StepFlow
        current={index + 1}
        busy={busy}
        knownBadge={knownBadge}
        testId={`oneboarding-step-${step.id}`}
        backTestId="oneboarding-back"
        submitTestId="oneboarding-submit"
        continueLabel={
          step.id === "confirm"
            ? "Ouvrir ma Timeline"
            : step.id === "wedding" && weddingMode === "create" && !projectId
              ? "Créer ce mariage"
              : undefined
        }
        onBack={
          index === 0
            ? () => setStage("entry")
            : () => {
                setIndex((i) => Math.max(0, i - 1));
                setEditing(false);
                setNotice({ kind: "idle" });
              }
        }
        onSubmit={() => {
          if (step.id === "confirm") {
            trackEvent("oneboarding_completed", { profile: plan.profile });
            if (onOpenWedding) onOpenWedding();
            else navigate("/user-portal");
            return;
          }
          void runStep();
        }}
      >
        {/* Le plan fournit la clé, la vue traduit : le cadre et son contenu
            restent dans la même langue. */}
        <h2 className="mt-6 text-[22px] font-medium leading-snug">{t(step.titleKey)}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-white/60">{t(step.descriptionKey)}</p>

        {/* ---------------------------------------------------------- */}
        {step.id === "person" &&
          (showEditor ? (
            <div className="mt-5 space-y-5">
              <IdentityFields card={card} update={update} onError={setFieldError} />
              <MusicPicker
                music={card.music as CardMusic | undefined}
                onSelect={(result) => update("music", result)}
                onClear={() => update("music", undefined)}
                onSkipped={() =>
                  setNotice({
                    kind: "idle",
                  })
                }
              />
            </div>
          ) : (
            <KnownSummary
              title="Moi"
              lines={[
                `${card.firstName} ${card.lastName}`.trim(),
                [card.nickname, card.city].filter(Boolean).join(" · "),
                card.profession,
                card.interests.join(" · "),
                card.music ? `♪ ${card.music.title} — ${card.music.artist}` : "",
              ]}
              onEdit={() => setEditing(true)}
            />
          ))}

        {/* ---------------------------------------------------------- */}
        {step.id === "role" &&
          (showEditor ? (
            <div className="mt-5 space-y-6">
              <div>
                <h3 className="text-lg">Quel est votre rôle dans ce mariage ?</h3>
                <p className="mt-1 text-xs text-white/60">
                  Vous pouvez en choisir plusieurs. Ce choix concerne ce mariage,
                  pas votre carte.
                </p>
                <div className="mt-4 space-y-5">
                  <RolesPicker
                    groups={NON_PROFESSIONAL_GROUPS}
                    roles={weddingRoles.filter((r) => !PROFESSIONAL_ROLES.includes(r))}
                    onChange={(picked) =>
                      setWeddingRoles([
                        ...picked,
                        ...weddingRoles.filter((r) => PROFESSIONAL_ROLES.includes(r)),
                      ])
                    }
                  />
                  <RolesPicker
                    groups={[["Professionnels", PROFESSIONAL_ROLES]]}
                    roles={weddingRoles.filter((r) => PROFESSIONAL_ROLES.includes(r))}
                    onChange={(picked) =>
                      setWeddingRoles([
                        ...weddingRoles.filter((r) => !PROFESSIONAL_ROLES.includes(r)),
                        ...picked,
                      ])
                    }
                  />
                </div>
              </div>

              {/* Une activité appartient à la personne, pas au mariage. */}
              <div className="rounded-2xl border border-white/15 p-4">
                <h3 className="text-lg">Quelles activités exercez-vous ?</h3>
                <p className="mt-1 text-xs text-white/60">
                  Sur votre carte, une seule fois. Vous choisirez ensuite laquelle
                  vous concerne pour chaque mariage — un photographe peut aussi
                  être saxophoniste.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activityOptions(
                    profiles.map((p) => p.profession),
                    selectedActivities,
                  ).map((activity) => (
                    <label
                      key={activity}
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedActivities.includes(activity)}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setSelectedActivities((current) =>
                            on
                              ? [...current, activity]
                              : current.filter((a) => a !== activity),
                          );
                          /*
                           * La règle « une activité qui est aussi un rôle du
                           * modèle peut être proposée » vit dans le plan, pas
                           * ici : `suggestRolesFromActivities` est la seule
                           * source. La recopier ici finirait par diverger.
                           */
                          const isRole = suggestRolesFromActivities([activity]).length > 0;
                          if (on && isRole && !weddingRoles.includes(activity)) {
                            setWeddingRoles((current) => [...current, activity]);
                            setProposedRoles((current) =>
                              current.includes(activity) ? current : [...current, activity],
                            );
                          } else if (!on && isRole && proposedRoles.includes(activity)) {
                            /* Retirer l'activité retire la proposition — mais jamais
                               un rôle que la personne a coché elle-même. */
                            setWeddingRoles((current) => current.filter((r) => r !== activity));
                            setProposedRoles((current) => current.filter((r) => r !== activity));
                          }
                        }}
                      />
                      {activity}
                    </label>
                  ))}
                </div>
                {proposedRoles.length > 0 && (
                  <p
                    data-testid="oneboarding-role-proposal"
                    className="mt-3 rounded-xl border border-white/15 p-3 text-xs text-white/60"
                  >
                    Pour <strong className="font-medium text-white/85">ce mariage</strong>,
                    BYAIME vous propose : {proposedRoles.join(" · ")}. C'est pré-coché
                    pour vous éviter de le redire — confirmez, ou décochez.
                  </p>
                )}
                {selectedActivities.length > 0 && (
                  <p className="mt-3 text-xs text-white/50">
                    Facultatif : vous pourrez passer ces réglages plus tard.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <KnownSummary
              title="Votre rôle"
              lines={[
                weddingRoles.join(" · "),
                selectedActivities.length
                  ? `Activités : ${selectedActivities.join(" · ")}`
                  : "",
              ]}
              onEdit={() => setEditing(true)}
            />
          ))}

        {/* ---------------------------------------------------------- */}
        {step.id === "functioning" &&
          (selectedActivities.length === 0 ? (
            <p className="mt-5 text-sm text-white/65">
              Aucune activité choisie à l’étape précédente. Vous pourrez configurer
              votre fonctionnement plus tard, depuis votre carte.
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              {selectedActivities.map((activity) => {
                const profile = profiles.find((p) => p.profession === activity);
                const configured =
                  !!profile && Object.keys(profile.data.parameters).length > 0;
                const values =
                  functioningDraft[activity]?.parameters ?? profile?.data.parameters ?? {};
                return (
                  <div key={activity} className="rounded-2xl border border-white/15 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg">{activity}</h3>
                      {configured && !editing ? (
                        <span className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                          Déjà renseigné
                        </span>
                      ) : null}
                    </div>
                    {configured && !editing ? (
                      <>
                        <dl className="mt-2 space-y-1 text-[13px] text-white/80">
                          {Object.entries(profile!.data.parameters).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-white/50">{key}</span> · {String(value)}
                            </div>
                          ))}
                        </dl>
                        <button
                          type="button"
                          className="mt-3 min-h-11 text-[12.5px] underline"
                          onClick={() => setEditing(true)}
                        >
                          Modifier
                        </button>
                      </>
                    ) : (
                      <div className="mt-3 space-y-4">
                        <ProfessionalParametersEditor
                          profession={activity}
                          values={values}
                          onChange={(parameters) =>
                            setFunctioningDraft((draft) => ({
                              ...draft,
                              [activity]: {
                                ...(draft[activity] ?? profile?.data ?? emptyFunctioning()),
                                parameters,
                              },
                            }))
                          }
                        />
                        <fieldset>
                          <legend className="mb-2 text-sm">
                            Moments habituellement couverts
                          </legend>
                          <div className="flex flex-wrap gap-3">
                            {PRESENCE_MOMENTS.map((moment) => {
                              const covered =
                                functioningDraft[activity]?.coveredMoments ??
                                profile?.data.coveredMoments ??
                                [];
                              return (
                                <label
                                  key={moment}
                                  className="flex min-h-11 items-center gap-2 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={covered.includes(moment)}
                                    onChange={(e) =>
                                      setFunctioningDraft((draft) => {
                                        const base =
                                          draft[activity] ?? profile?.data ?? emptyFunctioning();
                                        return {
                                          ...draft,
                                          [activity]: {
                                            ...base,
                                            coveredMoments: e.target.checked
                                              ? [...covered, moment]
                                              : covered.filter((m) => m !== moment),
                                          },
                                        };
                                      })
                                    }
                                  />
                                  {moment}
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                        <button
                          type="button"
                          className="min-h-11 text-[12.5px] underline text-white/60"
                          onClick={() => setEditingProfile(activity)}
                        >
                          Ouvrir le détail (disponibilités, installation)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

        {/* ---------------------------------------------------------- */}
        {step.id === "wedding" && (
          <div className="mt-5 space-y-5">
            {!weddingMode ? (
              <div>
                <h3 className="text-lg">Que souhaitez-vous faire ?</h3>
                {/*
                  Les deux portes restent ouvertes : c'est la personne qui
                  décide. Le plan indique seulement laquelle est attendue vu son
                  rôle — un couple ou un wedding planner ouvre un Monde, les
                  autres en rejoignent un. Une indication, jamais une contrainte.
                */}
                {plan.weddingAction && (
                  <p className="mt-2 text-xs text-white/50">
                    Vu votre rôle, BYAIME s’attend plutôt à ce que vous{" "}
                    <strong className="font-medium text-white/80">
                      {plan.weddingAction === "create"
                        ? "créiez un mariage"
                        : "rejoigniez un mariage"}
                    </strong>
                    . Vous pouvez choisir l’autre option.
                  </p>
                )}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    data-testid="oneboarding-wedding-create"
                    aria-pressed={plan.weddingAction === "create"}
                    onClick={() => setWeddingMode("create")}
                    className={cn(
                      "min-h-12 flex-1 rounded-2xl border px-5 text-left text-[14px] transition hover:border-white/50 hover:bg-white/5",
                      plan.weddingAction === "create"
                        ? "border-white/60 bg-white/[0.06]"
                        : "border-white/25",
                    )}
                  >
                    Créer un mariage
                    {plan.weddingAction === "create" && (
                      <span className="ml-2 rounded-full border border-white/30 px-2 py-0.5 align-middle text-[10.5px] uppercase tracking-[.12em] text-white/70">
                        Suggéré
                      </span>
                    )}
                    <span className="mt-1 block text-[12px] text-white/50">
                      Cinq informations, et votre Monde est ouvert.
                    </span>
                  </button>
                  <button
                    type="button"
                    data-testid="oneboarding-wedding-join"
                    aria-pressed={plan.weddingAction === "join"}
                    onClick={() => setWeddingMode("join")}
                    className={cn(
                      "min-h-12 flex-1 rounded-2xl border px-5 text-left text-[14px] transition hover:border-white/50 hover:bg-white/5",
                      plan.weddingAction === "join"
                        ? "border-white/60 bg-white/[0.06]"
                        : "border-white/25",
                    )}
                  >
                    Rejoindre un mariage
                    {plan.weddingAction === "join" && (
                      <span className="ml-2 rounded-full border border-white/30 px-2 py-0.5 align-middle text-[10.5px] uppercase tracking-[.12em] text-white/70">
                        Suggéré
                      </span>
                    )}
                    <span className="mt-1 block text-[12px] text-white/50">
                      Avec le lien reçu, ou parmi ceux déjà ouverts.
                    </span>
                  </button>
                </div>
              </div>
            ) : weddingMode === "create" && !projectId ? (
              <div className="space-y-4">
                <h3 className="text-lg">Votre mariage</h3>
                {WEDDING_FIELDS.map((key) => {
                  const Icon = WEDDING_FIELD_ICON[key];
                  return (
                    <div key={key} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.07]"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <label className="block flex-1 text-sm">
                        {t(`q.couple.${key}` as I18nKey)}
                        <input
                          className={cardInputStyle}
                          value={answers[key] ?? ""}
                          inputMode={key === "guests" || key === "budget" ? "numeric" : "text"}
                          placeholder={
                            key === "budget"
                              ? `${t(`q.couple.${key}.placeholder` as I18nKey)} (${currencySymbol(currency)})`
                              : t(`q.couple.${key}.placeholder` as I18nKey)
                          }
                          onChange={(e) => {
                            setAnswers((current) => ({ ...current, [key]: e.target.value }));
                            sessionStorage.setItem(
                              WEDDING_ANSWERS_KEY,
                              JSON.stringify({ ...answers, [key]: e.target.value }),
                            );
                          }}
                        />
                        <span className="mt-1 block text-[11.5px] text-white/45">
                          {t(`q.couple.${key}.hint` as I18nKey)}
                        </span>
                      </label>
                    </div>
                  );
                })}
                <div
                  data-testid="oneboarding-currency"
                  role="group"
                  aria-label={t("composer.currency")}
                  className="flex flex-wrap items-center gap-1.5"
                >
                  {CURRENCIES.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      data-testid={`oneboarding-currency-${item.code}`}
                      aria-pressed={currency === item.code}
                      title={item.code}
                      onClick={() => setCurrency(item.code)}
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
                {answeredFields(answers).length === 0 && (
                  <p className="text-xs text-white/50">
                    Une seule réponse suffit — vous compléterez le reste dans votre
                    Monde.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/20 bg-white/5 p-4">
                  <p className="text-xs text-white/60">Vous rejoignez :</p>
                  <p className="mt-1 font-medium">{labelFor(projectId)}</p>
                  <p className="mt-2 text-sm text-white/65">
                    {card.firstName} {card.lastName} · votre carte est déjà
                    renseignée.
                  </p>
                  <p className="mt-2 text-xs text-white/50">
                    Votre présence et vos besoins restent dans ce mariage, jamais
                    sur votre fiche publique.
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-11 text-[12.5px] underline text-white/60"
                  onClick={() => setWeddingMode(null)}
                >
                  Changer de mariage
                </button>

                {/* Activité choisie → rôle proposé → confirmé → intervention
                    possible. La règle serveur reste la source de vérité : on
                    évite seulement la double saisie. */}
                {plan.profile === "professional" && (
                  <ProfessionalAssignmentsEditor
                    arrival={presence.arrival}
                    departure={presence.departure}
                    profiles={profiles.filter((p) => selectedActivities.includes(p.profession))}
                    roles={presence.roles}
                    assignments={presence.assignments ?? []}
                    events={
                      project?.id === projectId
                        ? project.timeline.filter((e) => e.phase === "pendant")
                        : []
                    }
                    onChange={(assignments) => contextual("assignments", assignments)}
                  />
                )}
              </div>
            )}

            {weddingMode === "join" && !projectId && (
              <div className="space-y-3">
                {projects.length > 0 && (
                  <label className="block text-sm">
                    Mariage concerné
                    <select
                      className={cardInputStyle}
                      value={projectId}
                      disabled={busy}
                      onChange={(e) => void selectWedding(e.target.value)}
                    >
                      <option value="">À choisir</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayLabel ?? p.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  className={cardButtonStyle}
                  onClick={() => setJoining(true)}
                >
                  Rejoindre avec une invitation
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------- */}
        {(step.id === "presence" || step.id === "organize") &&
          (showEditor ? (
            <div className="mt-5 space-y-5">
              {!projectId ? (
                <p className="text-sm text-white/65">
                  Choisissez d’abord le mariage concerné à l’étape précédente.
                </p>
              ) : (
                <>
                  <PresenceFields
                    presence={presence}
                    contextual={contextual}
                    linkedRsvp={linkedRsvp}
                  />
                  <SlotsEditor
                    slots={presence.slots}
                    onChange={(slots) => contextual("slots", slots)}
                  />
                </>
              )}
            </div>
          ) : (
            <KnownSummary
              title={t(step.titleKey)}
              lines={[
                { present: "Présent", absent: "Absent", peut_etre: "Peut-être", en_attente: "À confirmer" }[
                  presence.rsvp
                ],
                `${presence.companions} accompagnant(s)`,
                presence.moments.join(" · "),
                presence.arrival
                  ? `${new Date(presence.arrival).toLocaleString("fr-FR")}${
                      presence.departure ? ` → ${new Date(presence.departure).toLocaleString("fr-FR")}` : ""
                    }`
                  : "",
              ]}
              onEdit={() => setEditing(true)}
            />
          ))}

        {/* ---------------------------------------------------------- */}
        {step.id === "confirm" && (
          <div className="mt-5 space-y-4" data-testid="oneboarding-summary">
            <KnownSummary
              title="Moi"
              lines={[
                `${card.firstName} ${card.lastName}`.trim(),
                [card.nickname, card.city].filter(Boolean).join(" · "),
                card.profession,
              ]}
            />
            {selectedActivities.length > 0 && (
              <KnownSummary
                title="Mon activité"
                lines={[selectedActivities.join(" · ")]}
              />
            )}
            <KnownSummary
              title="Ce mariage"
              lines={[
                projectId ? labelFor(projectId) : "Aucun mariage pour l’instant",
                weddingRoles.join(" · "),
              ]}
            />
            <div className="flex items-start gap-3 rounded-2xl border border-white/20 bg-white/[0.04] p-4">
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-black"
              >
                <Check className="h-4 w-4" />
              </span>
              <p className="text-[13px] leading-relaxed text-white/75">
                {projectId
                  ? "Vos horaires et vos réglages sont repris dans la Timeline de ce mariage."
                  : "Votre carte est prête. Vous pourrez rejoindre un mariage dès qu’on vous invitera."}
              </p>
            </div>
          </div>
        )}

        <SaveNoticeBanner notice={notice} onRetry={() => void runStep()} />
        {fieldError && notice.kind !== "failure" && (
          <p role="alert" className="mt-4 rounded-xl border border-red-300/40 p-3 text-sm text-red-200">
            {fieldError}
          </p>
        )}
      </StepFlow>
    </section>
  );
}

export const oneboardingTestContext = { emptyOneboardingContext };

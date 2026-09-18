import { weddingDisplayLabel } from "@/lib/project-catalog";
import { RsvpClaimPanel } from "./RsvpClaimPanel";
import { AttestationClaimPanel } from "./AttestationClaimPanel";
import { CountersignedMoments } from "./CountersignedMoments";
import {
  ProfessionalProfileEditor,
  ProfessionalAssignmentsEditor,
} from "./ProfessionalProfileEditor";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  emptyCard,
  emptyParticipation,
  type ProfessionalProfile,
  ROLE_GROUPS,
  type UniversalCard,
  type Participation,
} from "@workspace/aime-domain";
import { useProject } from "@/store/project-store";
import { useI18n } from "@/lib/i18n";
import { failureMessage } from "@/lib/api-messages";
import { CARD_DRAFT_KEY } from "@/lib/intention-draft";
import { apiCall, jsonPut } from "@/lib/api-call";
import {
  IdentityFields,
  MusicCard,
  MusicPicker,
  PresenceFields,
  RolesPicker,
  SlotsEditor,
  cardButtonStyle as buttonStyle,
  cardInputStyle as inputStyle,
} from "./card-blocks";

/**
 * Un appel au service de la Carte. Trois issues, toutes nommées en français
 * (`lib/api-messages.ts`) : la donnée, le refus expliqué du serveur, ou un
 * service injoignable. Jamais le texte brut d'un `JSON.parse` qui échoue sur une
 * page HTML — c'est ce qui s'affichait sur `/ma-carte` quand l'API ne répondait
 * pas, à la place du formulaire entier.
 */
async function api(path: string, body?: unknown): Promise<any> {
  return apiCall(path, body === undefined ? undefined : jsonPut(body));
}

export function UniversalCardForm({
  signedIn = false,
  onBack,
  onCreateWedding,
}: {
  signedIn?: boolean;
  onBack?: () => void;
  onCreateWedding?: () => void;
}) {
  const [, navigate] = useLocation();
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-US" : "fr-FR";
  const { projects = [], selectProject, project, syncStatus } = useProject();
  const [card, setCard] = useState<UniversalCard>(emptyCard);
  const [presence, setPresence] = useState<Participation>(emptyParticipation);
  const [version, setVersion] = useState<string | null>(null);
  const [cardUserId, setCardUserId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [profiles, setProfiles] = useState<ProfessionalProfile[]>([]);
  const [editingFunctioning, setEditingFunctioning] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string>();
  const [joining, setJoining] = useState(false);
  const initialInvitation = useRef(
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("invitation") ?? ""),
  );
  /* Arrivée depuis une page d'attestation : la contrepartie vient rattacher
     ses Moments à sa carte (le Profil qui naît rempli). */
  const [claimingAttestation, setClaimingAttestation] = useState(false);
  const initialAttestation = useRef(
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("attestation") ?? ""),
  );
  const [attestationsVersion, setAttestationsVersion] = useState(0);
  const savedIdentity = useRef<UniversalCard | null>(null);
  const [linkedRsvp, setLinkedRsvp] = useState<{
    token: string;
    revoked: boolean;
  } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    sectionRef.current?.scrollIntoView?.({ block: "start" });
  }, [step, editingFunctioning, joining, claimingAttestation]);
  const [projectId, setProjectId] = useState("");
  const [hasSavedContext, setHasSavedContext] = useState(false);
  const savedPresence = useRef<Participation>(emptyParticipation());
  const [contextReady, setContextReady] = useState(false);
  const [busy, setBusy] = useState(signedIn);
  const [loaded, setLoaded] = useState(!signedIn);
  const [error, setError] = useState("");
  /** Échec du chargement initial : il s'affiche à côté du formulaire, pas à sa place. */
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [notice, setNotice] = useState("");
  const [justSavedCard, setJustSavedCard] = useState(false);
  useEffect(() => {
    let active = true;
    /* Le premier chargement repart d'une carte vide — le serveur ou le brouillon
       local la remplissent aussitôt après. Un réessai ne touche pas à la saisie
       en cours : réessayer ne doit jamais effacer ce qui est écrit. */
    const fresh = reloadToken === 0;
    if (fresh) {
      setCard(emptyCard());
      setPresence(emptyParticipation());
      setVersion(null);
      setCardUserId(null);
    }
    setLoadError("");
    setLoaded(!signedIn);
    setBusy(signedIn);
    /** Le brouillon de session : identité déjà saisie sur cet appareil. */
    const restoreDraft = () => {
      try {
        const raw = sessionStorage.getItem(CARD_DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw);
        const { professional, ...identity } = draft.card;
        if (professional && Object.keys(professional).length)
          sessionStorage.setItem(
            "aime-legacy-professional-draft",
            JSON.stringify(professional),
          );
        setCard(identity);
        if (identity.firstName?.trim() && identity.lastName?.trim())
          setStep(4);
      } catch {
        /* Brouillon illisible : on repart d'une carte vide, sans message. */
      }
    };
    const load = async () => {
      try {
        const current = signedIn ? await api("/me/card") : null;
        if (!active) return;
        if (current) {
          setCard(current.data);
          savedIdentity.current = current.data;
          setStep(4);
          if (initialInvitation.current) setJoining(true);
          else if (initialAttestation.current) setClaimingAttestation(true);
          setVersion(current.updatedAt);
          setCardUserId(current.userId);
        } else {
          restoreDraft();
        }
        /* Les activités sont un complément de la carte : leur échec ne doit pas
           empêcher de l'ouvrir (elles resteront simplement absentes). */
        if (signedIn) {
          try {
            const functioning = await api("/me/professional-profiles");
            if (active) setProfiles(Array.isArray(functioning) ? functioning : []);
          } catch {
            if (active && fresh) setProfiles([]);
          }
        }
      } catch (e) {
        if (!active) return;
        /* Le service peut être momentanément injoignable : la page reste
           utilisable — saisie locale, brouillon retrouvé — et le dit, au lieu
           de se remplacer par un message technique. */
        setLoadError(failureMessage(e, t("ucf.err.loadCard")));
        restoreDraft();
      } finally {
        /* Toujours rendre le formulaire : un échec de chargement est une
           information, pas une page morte. */
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
  const update = <K extends keyof UniversalCard>(
    key: K,
    value: UniversalCard[K],
  ) => setCard((c) => ({ ...c, [key]: value }));
  const contextual = <K extends keyof Participation>(
    key: K,
    value: Participation[K],
  ) =>
    setPresence((p) => ({
      ...p,
      [key]: value,
      ...(key === "roles"
        ? {
            assignments: (p.assignments ?? []).filter((a) =>
              profiles.some(
                (profile) =>
                  profile.id === a.profileId &&
                  (value as string[]).includes(profile.profession),
              ),
            ),
          }
        : {}),
    }));
  const saveCard = async () => {
    if (!signedIn) {
      sessionStorage.setItem(CARD_DRAFT_KEY, JSON.stringify({ card }));
      return;
    }
    const saved = await api("/me/card", { data: card, updatedAt: version });
    savedIdentity.current = saved.data;
    setCard(saved.data);
    setJustSavedCard(true);
    setVersion(saved.updatedAt);
    setCardUserId(saved.userId);
    sessionStorage.removeItem(CARD_DRAFT_KEY);
  };
  const next = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (step > 0 && step < 4 && !contextReady)
        throw new Error(t("ucf.err.loadWeddingFirst"));
      if (
        (step === 0 || (step === 4 && !version)) &&
        (!card.firstName.trim() || !card.lastName.trim())
      )
        throw new Error(t("ucf.err.identityRequired"));
      if (
        step === 2 &&
        (!!presence.arrival !== !!presence.departure ||
          (presence.arrival &&
            Date.parse(presence.departure) <= Date.parse(presence.arrival)))
      )
        throw new Error(t("ucf.err.presenceOrder"));
      if (
        step === 3 &&
        presence.slots.some(
          (s) =>
            !s.label.trim() ||
            !s.start ||
            !s.end ||
            Date.parse(s.end) <= Date.parse(s.start),
        )
      )
        throw new Error(t("ucf.err.slotsIncomplete"));
      if (step === 0 || (step === 4 && !version)) {
        await saveCard();
        setStep(4); // Creation is complete. No wedding or role is required.
        if (signedIn && initialInvitation.current) setJoining(true);
        else if (signedIn && initialAttestation.current) setClaimingAttestation(true);
        return;
      }
      if (
        step === 3 ||
        (step === 2 &&
          !presence.roles.some((role) =>
            (ROLE_GROUPS.Professionnels as readonly string[]).includes(role),
          ))
      ) {
        if (!signedIn || !projectId)
          throw new Error(t("ucf.err.weddingRequired"));
        await associate();
        return;
      }
      setStep((s) => s + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ucf.err.saveFailed"));
    } finally {
      setBusy(false);
    }
  };
  const associate = async () => {
    setBusy(true);
    setError("");
    try {
      await api(`/projects/${projectId}/my-participation`, presence);
      if (cardUserId)
        sessionStorage.removeItem(`aime-card-context-draft:${cardUserId}`);
      if (!(await selectProject(projectId)))
        throw new Error(t("ucf.err.reloadWedding"));
      setNotice(t("ucf.notice.saved"));
      savedPresence.current = structuredClone(presence);
      setHasSavedContext(true);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ucf.err.associateFailed"));
    } finally {
      setBusy(false);
    }
  };
  const selectContext = async (id: string) => {
    setProjectId(id);
    setContextReady(false);
    setLinkedRsvp(null);
    setHasSavedContext(false);
    setPresence(emptyParticipation());
    savedPresence.current = emptyParticipation();
    setNotice("");
    if (!id || !signedIn) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const current = await api(`/projects/${id}/my-participation`);
      if (!(await selectProject(id)))
        throw new Error(t("ucf.err.loadWedding"));
      if (current) {
        const { linkedRsvp: source, ...context } = current;
        setPresence(context);
        savedPresence.current = structuredClone(context);
        setHasSavedContext(true);
        setLinkedRsvp(source ?? null);
        setNotice(t("ucf.notice.restored"));
      }
      setContextReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ucf.err.loadFailed"));
    } finally {
      setBusy(false);
    }
  };
  /* Uniquement pendant le chargement en cours : dès qu'il aboutit — réussite ou
     échec — le formulaire est rendu, avec son avertissement le cas échéant. */
  if (!loaded)
    return (
      <section
        data-testid="universal-card-loading"
        className="rounded-[2rem] bg-[#171410] p-8 text-white"
      >
        <p role="status">{t("ucf.loading")}</p>
      </section>
    );
  const contextSelector = (
    <label className="block text-sm">
      {t("ucf.weddingLabel")}
      <select
        className={inputStyle}
        value={projectId}
        disabled={busy}
        onChange={(e) => void selectContext(e.target.value)}
      >
        <option value="">{t("ucf.later")}</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayLabel ?? p.title}
          </option>
        ))}
      </select>
    </label>
  );
  if (joining && signedIn && version)
    return (
      <RsvpClaimPanel
        initialToken={initialInvitation.current}
        onClose={() => setJoining(false)}
        onJoined={async (id) => {
          initialInvitation.current = "";
          navigate("/ma-carte", { replace: true });
          setJoining(false);
          await selectContext(id);
          setStep(1);
        }}
      />
    );
  if (claimingAttestation && signedIn && version)
    return (
      <AttestationClaimPanel
        initialToken={initialAttestation.current}
        onClose={() => setClaimingAttestation(false)}
        onJoined={() => {
          initialAttestation.current = "";
          navigate("/ma-carte", { replace: true });
          setClaimingAttestation(false);
          setAttestationsVersion((n) => n + 1);
          setNotice("Vos Moments attestés sont rattachés à votre carte.");
        }}
      />
    );
  if (editingFunctioning)
    return (
      <ProfessionalProfileEditor
        profiles={profiles}
        initialProfileId={editingProfileId}
        onClose={() => setEditingFunctioning(false)}
        onSaved={(profile) => {
          setProfiles((current) => [
            ...current.filter((p) => p.id !== profile.id),
            profile,
          ]);
          if (project && syncStatus === "saved") void selectProject(project.id);
        }}
      />
    );
  return (
    <section
      ref={sectionRef}
      data-testid="universal-card-form"
      className="rounded-[2rem] border border-white/15 bg-[#171410] p-5 text-left text-white sm:p-8"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={busy}
          className="min-h-11 text-sm text-white/70"
          onClick={() =>
            step === 4
              ? setStep(0)
              : step === 1
                ? (() => {
                    if (
                      JSON.stringify(presence) ===
                        JSON.stringify(savedPresence.current) ||
                      window.confirm(
                        t("ucf.confirmDiscardWedding"),
                      )
                    ) {
                      setPresence(structuredClone(savedPresence.current));
                      setStep(hasSavedContext ? 5 : 4);
                    }
                  })()
                : step
                  ? setStep(step - 1)
                  : version && savedIdentity.current
                    ? (() => {
                        if (
                          JSON.stringify(card) ===
                            JSON.stringify(savedIdentity.current) ||
                          window.confirm(
                            t("ucf.confirmDiscardIdentity"),
                          )
                        ) {
                          setCard(savedIdentity.current!);
                          setStep(4);
                        }
                      })()
                    : onBack
                      ? onBack()
                      : navigate("/")
          }
        >
          {step === 4
            ? version
              ? t("ucf.editCard")
              : t("ucf.editDraft")
            : t("ucf.back")}
        </button>
        <span className="text-xs text-white/60">
          {step === 0 || step === 4
            ? version
              ? t("ucf.saved")
              : step === 4
                ? t("ucf.draft")
                : t("ucf.creating")
            : step === 5
              ? t("ucf.yourWedding")
              : t("ucf.weddingStep", { step })}
        </span>
      </div>
      <h2 className="mt-3 text-2xl font-medium">
        {
          [
            version ? t("ucf.editCard") : t("ucf.step.create"),
            t("ucf.step.role"),
            t("ucf.step.presence"),
            t("ucf.step.organize"),
            version
              ? justSavedCard
                ? t("ucf.step.cardReady")
                : t("ucf.step.card")
              : t("ucf.step.draftReady"),
            t("ucf.step.allThere"),
          ][step]
        }
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        {step === 0
          ? t("ucf.desc.identity")
          : step === 1
            ? t("ucf.desc.role")
            : step === 2
              ? t("ucf.desc.presence")
              : step === 3
                ? t("ucf.desc.slots")
                : t("ucf.desc.ready")}
      </p>
      {loadError && (
        <div
          data-testid="card-load-error"
          className="mt-5 rounded-2xl border border-amber-200/40 bg-amber-100/10 p-4"
        >
          <p role="alert" className="text-sm text-amber-100">
            {loadError}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-amber-100/70">
            {t("ucf.loadError.hint")}
          </p>
          <button
            type="button"
            className={`${buttonStyle} mt-3`}
            disabled={busy}
            onClick={() => setReloadToken((token) => token + 1)}
          >
            {busy ? t("ucf.loadingShort") : t("ucf.reload")}
          </button>
        </div>
      )}
      {step === 4 && (
        <ol
          aria-label={t("ucf.journey.aria")}
          className="mt-6 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4"
        >
          {[
            t("ucf.journey.intro"),
            t("ucf.journey.work"),
            t("ucf.journey.where"),
            t("ucf.journey.organize"),
          ].map((label, i) => (
            <li key={label} className="rounded-xl border border-white/15 p-3">
              <span className="mb-2 block text-white/40">
                0{i + 1}
                {i === 0 && version ? " · ✓" : ""}
              </span>
              {label}
            </li>
          ))}
        </ol>
      )}
      {step > 0 && step !== 4 && (
        <div className="mt-5 rounded-2xl border border-white/20 bg-white/5 p-4">
          <p className="text-xs text-white/60">{t("ucf.joining")}</p>
          <p className="mt-1 font-medium">
            {projects.find((p) => p.id === projectId)?.displayLabel ??
              (project?.id === projectId
                ? weddingDisplayLabel(project.title, project)
                : projects.find((p) => p.id === projectId)?.title ??
                  t("ucf.yourWedding"))}
          </p>
          <p className="mt-2 text-sm text-white/65">
            {t("ucf.cardFilled", { name: `${card.firstName} ${card.lastName}` })}
          </p>
          <p className="mt-2 text-xs text-white/50">
            {t("ucf.contextPrivate")}
          </p>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void next();
        }}
        className="mt-6"
      >
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          {step === 0 && (
            <>
              <IdentityFields card={card} update={update} onError={setError} />
              <MusicPicker
                music={card.music}
                onSelect={(result) => update("music", result)}
                onClear={() => update("music", undefined)}
                onSkipped={() => {
                  setNotice(t("ucf.notice.musicLater"));
                  document.getElementById("card-save")?.focus();
                }}
              />
            </>
          )}
          {step === 4 && (
            <div className="flex items-center gap-4 rounded-2xl border border-white/20 p-4">
              {card.photoUrl && (
                <img
                  src={card.photoUrl}
                  alt={`${card.firstName} ${card.lastName}`}
                  className="h-20 w-20 rounded-full object-cover"
                />
              )}
              <div>
                <h3 className="text-xl">
                  {card.firstName} {card.lastName}
                </h3>
                <p>{card.nickname}</p>
                <p className="text-sm text-white/70">
                  {card.city} · {card.profession}
                </p>
                <p className="text-sm text-white/60">
                  {card.interests.join(" · ")}
                </p>
              </div>
            </div>
          )}
          {/* À l'étape 0, le morceau est rendu par MusicPicker (avec « Retirer »). */}
          {step === 4 && card.music && <MusicCard music={card.music} />}
          {step === 5 && (
            <div className="space-y-5" data-testid="participation-summary">
              <p className="text-sm text-white/70">
                {t("ucf.summary.ready")}
              </p>
              <div className="rounded-xl border border-white/20 p-4">
                <h3 className="font-medium">{t("ucf.step.role")}</h3>
                <p className="mt-2 text-sm">
                  {presence.roles.join(" · ") || t("ucf.toDefine")}
                </p>
                <button
                  type="button"
                  className="mt-2 min-h-11 text-sm underline"
                  onClick={() => setStep(1)}
                >
                  {t("ucf.editRole")}
                </button>
              </div>
              <div className="rounded-xl border border-white/20 p-4">
                <h3 className="font-medium">{t("ucf.step.presence")}</h3>
                <p className="mt-2 text-sm">
                  {
                    {
                      present: t("ucf.rsvp.present"),
                      absent: t("ucf.rsvp.absent"),
                      peut_etre: t("ucf.rsvp.maybe"),
                      en_attente: t("ucf.rsvp.waiting"),
                    }[presence.rsvp]
                  }{" "}
                  · {t("ucf.companions", { n: presence.companions })}
                </p>
                <p className="mt-2 text-sm">{presence.moments.join(" · ")}</p>
                <p className="mt-2 text-sm">
                  {presence.arrival
                    ? new Date(presence.arrival).toLocaleString(dateLocale)
                    : t("ucf.arrivalTBD")}
                  {presence.departure
                    ? ` → ${new Date(presence.departure).toLocaleString(dateLocale)}`
                    : ""}
                </p>
                <button
                  type="button"
                  className="mt-2 min-h-11 text-sm underline"
                  onClick={() => setStep(2)}
                >
                  {t("ucf.editPresence")}
                </button>
              </div>
              <div className="rounded-xl border border-white/20 p-4">
                <h3 className="font-medium">{t("ucf.step.organize")}</h3>
                <p className="mt-2 text-sm text-white/70">
                  {t("ucf.organizeAuto")}
                </p>
                <button
                  type="button"
                  className="mt-2 min-h-11 text-sm underline"
                  onClick={() => setStep(3)}
                >
                  {t("ucf.viewSettings")}
                </button>
              </div>
              <button
                type="button"
                className={buttonStyle}
                onClick={() => navigate("/user-portal")}
              >
                {t("ucf.openWedding")}
              </button>
            </div>
          )}
          {step === 1 && (
            <RolesPicker
              roles={presence.roles}
              onChange={(roles) => contextual("roles", roles)}
            />
          )}
          {step === 2 && (
            <PresenceFields
              presence={presence}
              contextual={contextual}
              linkedRsvp={linkedRsvp}
            />
          )}
          {step === 2 &&
            !presence.roles.some((role) =>
              (ROLE_GROUPS.Professionnels as readonly string[]).includes(role),
            ) && (
              <button
                type="button"
                className="min-h-11 text-sm underline text-white/60"
                onClick={() => setStep(3)}
              >
                {t("ucf.addSlots")}
              </button>
            )}
          {step === 3 && (
            <>
              <ProfessionalAssignmentsEditor
                arrival={presence.arrival}
                departure={presence.departure}
                profiles={profiles}
                roles={presence.roles}
                assignments={presence.assignments ?? []}
                events={
                  project?.id === projectId
                    ? project.timeline.filter((e) => e.phase === "pendant")
                    : []
                }
                onChange={(assignments) =>
                  contextual("assignments", assignments)
                }
              />
              <SlotsEditor
                slots={presence.slots}
                onChange={(slots) => contextual("slots", slots)}
              />
            </>
          )}
          {step === 4 && (
            <>
              {!version ? (
                <>
                  <p className="text-sm">
                    {signedIn
                      ? t("ucf.draft.saved")
                      : t("ucf.draft.signedOut")}
                  </p>
                  <button
                    type="button"
                    className={buttonStyle}
                    onClick={() => {
                      if (signedIn) {
                        void next();
                        return;
                      }
                      try {
                        sessionStorage.setItem(CARD_DRAFT_KEY, JSON.stringify({ card }));
                        navigate("/creation?returnTo=%2Fma-carte");
                      } catch {
                        setError(t("ucf.storageError"));
                      }
                    }}
                  >
                    {signedIn
                      ? t("ucf.saveCard")
                      : t("ucf.saveCardWithAccount")}
                  </button>
                </>
              ) : (
                <>
                  <section
                    className="rounded-2xl border border-white/15 p-5"
                    aria-label={t("ucf.activities.aria")}
                  >
                    <p className="text-[11px] uppercase tracking-[.16em] text-white/50">
                      {t("ucf.activities.eyebrow")}
                    </p>
                    <h3 className="mt-2 text-lg">{t("ucf.activities.title")}</h3>
                    <p className="mt-2 text-sm text-white/65">
                      {card.profession
                        ? t("ucf.activities.question", { profession: card.profession })
                        : t("ucf.activities.generic")}
                    </p>
                    {profiles.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {profiles.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              className="flex min-h-12 w-full items-center justify-between rounded-xl border border-white/20 px-4 text-left text-sm"
                              onClick={() => {
                                setEditingProfileId(p.id);
                                setEditingFunctioning(true);
                              }}
                            >
                              <span>{p.profession}</span>
                              <span className="text-white/55">{t("ucf.editArrow")}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      className={`${buttonStyle} mt-4`}
                      onClick={() => {
                        setEditingProfileId(undefined);
                        setEditingFunctioning(true);
                      }}
                    >
                      {profiles.length
                        ? t("ucf.addActivity")
                        : t("ucf.configureActivity")}
                    </button>
                    <p className="mt-3 text-xs text-white/50">
                      {t("ucf.guestHint")}
                    </p>
                  </section>
                  <CountersignedMoments
                    enabled={signedIn && Boolean(version)}
                    refreshToken={attestationsVersion}
                    onClaim={() => setClaimingAttestation(true)}
                  />
                  <section
                    className="space-y-4 rounded-2xl border border-white/15 p-5"
                    aria-label={t("ucf.weddings.aria")}
                  >
                    <p className="text-[11px] uppercase tracking-[.16em] text-white/50">
                      {t("ucf.weddings.eyebrow")}
                    </p>
                    <h3 className="text-lg">{t("ucf.weddings.title")}</h3>
                    {projects.length ? (
                      <>
                        {contextSelector}
                        <button
                          className={buttonStyle}
                          type="button"
                          disabled={!projectId || !contextReady || busy}
                          onClick={() => setStep(hasSavedContext ? 5 : 1)}
                        >
                          {hasSavedContext
                            ? t("ucf.viewInfos")
                            : t("ucf.prepareParticipation")}
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-white/65">
                        {t("ucf.noWedding")}
                      </p>
                    )}
                    <button
                      type="button"
                      className="min-h-11 rounded-full border border-white/30 px-5 text-sm"
                      onClick={() => setJoining(true)}
                    >
                      {t("ucf.joinWedding")}
                    </button>
                  </section>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className={buttonStyle}
                      type="button"
                      onClick={() =>
                        onCreateWedding
                          ? onCreateWedding()
                          : navigate("/?creer=mariage")
                      }
                    >
                      {t("ucf.createWedding")}
                    </button>
                    {project && (
                      <button
                        type="button"
                        className="min-h-11 underline"
                        onClick={() => navigate("/user-portal")}
                      >
                        {t("ucf.openWedding")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="min-h-11 underline"
                      onClick={() => navigate("/")}
                    >
                      {t("ucf.discover")}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-300/40 p-3 text-sm text-red-200"
            >
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-green-200">
              {notice}
            </p>
          )}
          {step < 4 && (
            <button
              id="card-save"
              className={buttonStyle}
              disabled={busy || !loaded}
              type="submit"
            >
              {busy
                ? t("ucf.saving")
                : step === 0
                  ? version
                    ? t("ucf.saveChanges")
                    : signedIn
                      ? t("ucf.saveCard")
                      : t("ucf.prepareCard")
                  : step === 3 ||
                      (step === 2 &&
                        !presence.roles.some((role) =>
                          (
                            ROLE_GROUPS.Professionnels as readonly string[]
                          ).includes(role),
                        ))
                    ? t("ucf.validateParticipation")
                    : t("ucf.continue")}
            </button>
          )}
          {step === 0 && (
            <p className="text-xs text-white/50">
              {signedIn
                ? t("ucf.footer.signedIn")
                : t("ucf.footer.signedOut")}
            </p>
          )}
        </fieldset>
      </form>
    </section>
  );
}

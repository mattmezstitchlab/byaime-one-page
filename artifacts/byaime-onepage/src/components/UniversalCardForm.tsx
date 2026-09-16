import { weddingDisplayLabel } from "@/lib/project-catalog";
import { RsvpClaimPanel } from "./RsvpClaimPanel";
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
  PRESENCE_MOMENTS,
  type UniversalCard,
  type Participation,
} from "@workspace/aime-domain";
import { useProject } from "@/store/project-store";
import { searchAppleMusic } from "@/lib/music-search";
import type { MusicSearchResult } from "@/lib/types";

const DRAFT = "aime-personal-card-draft-v1";
const inputStyle =
  "mt-1 min-h-11 w-full rounded-xl border border-white/25 bg-[#262320] px-3 py-2 text-white";
const buttonStyle =
  "min-h-11 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-40";
async function api(path: string, body?: unknown) {
  const response = await fetch(`/api${path}`, {
    ...(body === undefined
      ? {}
      : {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Enregistrement impossible");
  return data;
}
function localDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        className={inputStyle}
        type="datetime-local"
        value={localDate(value)}
        onChange={(e) =>
          onChange(e.target.value ? new Date(e.target.value).toISOString() : "")
        }
      />
    </label>
  );
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
  const savedIdentity = useRef<UniversalCard | null>(null);
  const [linkedRsvp, setLinkedRsvp] = useState<{
    token: string;
    revoked: boolean;
  } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    sectionRef.current?.scrollIntoView?.({ block: "start" });
  }, [step, editingFunctioning, joining]);
  const [projectId, setProjectId] = useState("");
  const [hasSavedContext, setHasSavedContext] = useState(false);
  const savedPresence = useRef<Participation>(emptyParticipation());
  const [contextReady, setContextReady] = useState(false);
  const [busy, setBusy] = useState(signedIn);
  const [loaded, setLoaded] = useState(!signedIn);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [musicError, setMusicError] = useState("");
  const [justSavedCard, setJustSavedCard] = useState(false);
  const searchController = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    setCard(emptyCard());
    setPresence(emptyParticipation());
    setVersion(null);
    setCardUserId(null);
    setLoaded(!signedIn);
    setBusy(signedIn);
    const load = async () => {
      try {
        const current = signedIn ? await api("/me/card") : null;
        const functioning = signedIn
          ? await api("/me/professional-profiles")
          : [];
        if (!active) return;
        setProfiles(functioning);
        if (current) {
          setCard(current.data);
          savedIdentity.current = current.data;
          setStep(4);
          if (initialInvitation.current) setJoining(true);
          setVersion(current.updatedAt);
          setCardUserId(current.userId);
        } else {
          const raw = sessionStorage.getItem(DRAFT);
          if (raw) {
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
          }
        }
        setLoaded(true);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Chargement impossible");
      } finally {
        if (active) setBusy(false);
      }
    };
    void load();
    return () => {
      active = false;
      searchController.current?.abort();
    };
  }, [signedIn]);
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
      sessionStorage.setItem(DRAFT, JSON.stringify({ card }));
      return;
    }
    const saved = await api("/me/card", { data: card, updatedAt: version });
    savedIdentity.current = saved.data;
    setCard(saved.data);
    setJustSavedCard(true);
    setVersion(saved.updatedAt);
    setCardUserId(saved.userId);
    sessionStorage.removeItem(DRAFT);
  };
  const next = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (step > 0 && step < 4 && !contextReady)
        throw new Error(
          "Chargez le mariage avant de configurer votre association.",
        );
      if (
        (step === 0 || (step === 4 && !version)) &&
        (!card.firstName.trim() || !card.lastName.trim())
      )
        throw new Error("Renseignez votre prénom et votre nom.");
      if (
        step === 2 &&
        (!!presence.arrival !== !!presence.departure ||
          (presence.arrival &&
            Date.parse(presence.departure) <= Date.parse(presence.arrival)))
      )
        throw new Error("La fin de présence doit suivre le début.");
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
        throw new Error(
          "Complétez chaque créneau avec un début et une fin cohérents.",
        );
      if (step === 0 || (step === 4 && !version)) {
        await saveCard();
        setStep(4); // Creation is complete. No wedding or role is required.
        if (signedIn && initialInvitation.current) setJoining(true);
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
          throw new Error(
            "Choisissez un mariage avant d’enregistrer cette association.",
          );
        await associate();
        return;
      }
      setStep((s) => s + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible");
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
        throw new Error(
          "Participation enregistrée, mais le mariage n’a pas pu être rechargé. Réessayez son ouverture.",
        );
      setNotice(
        "C’est enregistré. BYAIME organise votre Timeline avec ces informations.",
      );
      savedPresence.current = structuredClone(presence);
      setHasSavedContext(true);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Association impossible");
    } finally {
      setBusy(false);
    }
  };
  const search = async () => {
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setSearching(true);
    setMusicError("");
    setResults([]);
    setSearched(false);
    try {
      const found = await searchAppleMusic(query, controller.signal);
      if (!controller.signal.aborted) {
        setResults(found);
        setSearched(true);
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setMusicError(
          "Le catalogue musical est momentanément inaccessible. Vous pouvez réessayer ou continuer sans musique.",
        );
    } finally {
      if (!controller.signal.aborted) setSearching(false);
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
        throw new Error("Impossible de charger ce mariage.");
      if (current) {
        const { linkedRsvp: source, ...context } = current;
        setPresence(context);
        savedPresence.current = structuredClone(context);
        setHasSavedContext(true);
        setLinkedRsvp(source ?? null);
        setNotice("Vos réponses pour ce mariage ont été récupérées.");
      }
      setContextReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setBusy(false);
    }
  };
  if (!loaded)
    return (
      <section className="rounded-[2rem] bg-[#171410] p-8 text-white">
        <p role={error ? "alert" : "status"}>
          {error || "Chargement de votre carte…"}
        </p>
        {error && (
          <button
            type="button"
            className="mt-4 underline"
            onClick={() => window.location.reload()}
          >
            Réessayer
          </button>
        )}
      </section>
    );
  const contextSelector = (
    <label className="block text-sm">
      Mariage concerné
      <select
        className={inputStyle}
        value={projectId}
        disabled={busy}
        onChange={(e) => void selectContext(e.target.value)}
      >
        <option value="">À choisir plus tard</option>
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
                        "Abandonner les modifications non enregistrées pour ce mariage ?",
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
                            "Abandonner les modifications non enregistrées de votre identité ?",
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
              ? "Modifier ma carte"
              : "Modifier mon brouillon"
            : "← Retour"}
        </button>
        <span className="text-xs text-white/60">
          {step === 0 || step === 4
            ? version
              ? "Carte enregistrée"
              : step === 4
                ? "Brouillon · non enregistré"
                : "En cours de création"
            : step === 5
              ? "Votre mariage"
              : `Votre mariage · ${step} / 3`}
        </span>
      </div>
      <h2 className="mt-3 text-2xl font-medium">
        {
          [
            version ? "Modifier ma carte" : "Créer ma carte",
            "Votre rôle",
            "Votre présence",
            "BYAIME organise",
            version
              ? justSavedCard
                ? "Ma carte est prête"
                : "Ma carte"
              : "Mon brouillon est prêt",
            "Tout est déjà là",
          ][step]
        }
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        {step === 0
          ? "Votre identité BYAIME, une seule fois. Pour commencer, seuls votre prénom et votre nom sont nécessaires."
          : step === 1
            ? "Quel sera votre rôle ? Vous pouvez en choisir plusieurs."
            : step === 2
              ? "Quand serez-vous là ? Ces informations concernent uniquement ce mariage."
              : step === 3
                ? "Retrouvez vos réglages habituels. Changez seulement ce qui est différent cette fois-ci."
                : "Je me présente une fois. Je dis ce que je fais. Je choisis où je vais. BYAIME sait déjà le reste."}
      </p>
      {step === 4 && (
        <ol
          aria-label="Votre parcours BYAIME"
          className="mt-6 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4"
        >
          {[
            "Je me présente",
            "Je dis ce que je fais",
            "Je choisis où je vais",
            "BYAIME organise",
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
          <p className="text-xs text-white/60">Vous rejoignez :</p>
          <p className="mt-1 font-medium">
            {projects.find((p) => p.id === projectId)?.displayLabel ??
              (project?.id === projectId
                ? weddingDisplayLabel(project.title, project)
                : (projects.find((p) => p.id === projectId)?.title ??
                  "Votre mariage"))}
          </p>
          <p className="mt-2 text-sm text-white/65">
            {card.firstName} {card.lastName} · Votre carte est déjà renseignée.
          </p>
          <p className="mt-2 text-xs text-white/50">
            Votre présence et vos besoins restent dans ce mariage, jamais sur
            votre fiche publique.
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
              <h3 className="text-lg">Identité</h3>
              <p className="text-xs text-white/60">
                Photo, pseudo et ville sont facultatifs.
              </p>
              <label className="block text-sm">
                Photo de profil
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-2 block w-full text-sm"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (
                      !["image/jpeg", "image/png", "image/webp"].includes(
                        file.type,
                      ) ||
                      file.size > 500000
                    ) {
                      setError(
                        "Choisissez une photo JPEG, PNG ou WebP de moins de 500 Ko.",
                      );
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () =>
                      update("photoUrl", String(reader.result));
                    reader.onerror = () =>
                      setError("Lecture de photo impossible");
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {card.photoUrl && (
                <div className="flex items-center gap-3">
                  <img
                    src={card.photoUrl}
                    alt="Votre photo de profil"
                    className="h-20 w-20 rounded-full object-cover"
                  />
                  <button type="button" onClick={() => update("photoUrl", "")}>
                    Retirer
                  </button>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["firstName", "Prénom"],
                    ["lastName", "Nom"],
                    ["nickname", "Pseudo"],
                    ["city", "Ville"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-sm">
                    {label}
                    <input
                      className={inputStyle}
                      required={key === "firstName" || key === "lastName"}
                      maxLength={100}
                      value={card[key]}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
              <h3 className="border-t border-white/15 pt-5 text-lg">Moi</h3>
              <label className="block text-sm">
                Métier
                <input
                  className={inputStyle}
                  maxLength={100}
                  value={card.profession}
                  onChange={(e) => update("profession", e.target.value)}
                  placeholder="Photographe, DJ… (facultatif)"
                />
              </label>
              <p className="text-xs text-white/60">
                Quelques mots pour vous présenter. Vous pourrez préciser votre
                façon de travailler ensuite, si vous le souhaitez.
              </p>
              <label className="block text-sm">
                Centres d’intérêt (séparés par des virgules)
                <input
                  className={inputStyle}
                  value={card.interests.join(",")}
                  onChange={(e) =>
                    update("interests", e.target.value.split(","))
                  }
                  onBlur={() =>
                    update(
                      "interests",
                      card.interests.map((v) => v.trim()).filter(Boolean),
                    )
                  }
                />
              </label>
              <h3 className="border-t border-white/15 pt-5 text-lg">
                Ma musique
              </h3>
              <p className="text-xs text-white/60">
                Le morceau qui vous ressemble, directement sur votre carte.
              </p>
              <div>
                <label className="block text-sm">
                  Votre musique
                  <input
                    className={inputStyle}
                    value={query}
                    placeholder="Titre ou artiste"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void search();
                      }
                    }}
                  />
                </label>
                <button
                  className={`${buttonStyle} mt-3`}
                  type="button"
                  disabled={searching || query.trim().length < 2}
                  onClick={() => void search()}
                >
                  {searching ? "Recherche…" : "Rechercher un morceau"}
                </button>
                {musicError && (
                  <div className="mt-3 rounded-xl border border-amber-200/30 p-4">
                    <p role="alert" className="text-sm text-amber-100">
                      {musicError}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className={buttonStyle}
                        disabled={searching || query.trim().length < 2}
                        onClick={() => void search()}
                      >
                        Réessayer
                      </button>
                      <button
                        type="button"
                        className="min-h-11 text-sm underline"
                        onClick={() => {
                          searchController.current?.abort();
                          setSearching(false);
                          setMusicError("");
                          setResults([]);
                          setSearched(false);
                          update("music", undefined);
                          setNotice(
                            "Vous pourrez ajouter un morceau plus tard. Vous pouvez maintenant terminer votre carte.",
                          );
                          document.getElementById("card-save")?.focus();
                        }}
                      >
                        Continuer sans musique
                      </button>
                    </div>
                  </div>
                )}
                {searched && !musicError && !searching && !results.length && (
                  <p role="status" className="mt-2 text-sm text-white/60">
                    Aucun résultat affiché. Essayez une autre recherche.
                  </p>
                )}
                {results.length > 0 && (
                  <ul className="mt-3 max-h-64 overflow-auto">
                    {results.map((result) => (
                      <li key={result.externalId}>
                        <button
                          type="button"
                          className="flex min-h-14 w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/10"
                          onClick={() => {
                            update("music", result);
                            setResults([]);
                            setSearched(false);
                            setMusicError("");
                          }}
                        >
                          {result.artworkUrl && (
                            <img
                              className="h-10 w-10 rounded"
                              src={result.artworkUrl}
                              alt=""
                            />
                          )}
                          <span>
                            {result.title}
                            <small className="block text-white/60">
                              {result.artist}
                            </small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
          {(step === 0 || step === 4) && card.music && (
            <div className="rounded-2xl border border-white/20 p-4">
              {card.music.artworkUrl && (
                <img
                  src={card.music.artworkUrl}
                  alt="Pochette du morceau"
                  className="mb-3 h-20 w-20 rounded-lg"
                />
              )}
              <p>
                {card.music.title} · {card.music.artist}
              </p>
              {card.music.previewUrl ? (
                <>
                  <span className="mt-2 block text-xs text-white/60">
                    ▶ PLAY — extrait du catalogue
                  </span>
                  <audio
                    aria-label={`Écouter ${card.music.title}`}
                    className="mt-2 w-full"
                    controls
                    preload="none"
                    src={card.music.previewUrl}
                  />
                </>
              ) : (
                <p className="text-sm text-white/60">
                  Aucun extrait disponible.
                </p>
              )}
              {card.music.trackUrl && (
                <a
                  className="mt-2 block text-sm underline"
                  href={card.music.trackUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir dans Apple Music
                </a>
              )}
              {step === 0 && (
                <button
                  type="button"
                  className="mt-3 text-sm underline"
                  onClick={() => update("music", undefined)}
                >
                  Retirer ce morceau
                </button>
              )}
            </div>
          )}
          {step === 5 && (
            <div className="space-y-5" data-testid="participation-summary">
              <p className="text-sm text-white/70">
                Vos informations sont déjà enregistrées. Rien à remplir de
                nouveau.
              </p>
              <div className="rounded-xl border border-white/20 p-4">
                <h3 className="font-medium">Votre rôle</h3>
                <p className="mt-2 text-sm">
                  {presence.roles.join(" · ") || "À préciser"}
                </p>
                <button
                  type="button"
                  className="mt-2 min-h-11 text-sm underline"
                  onClick={() => setStep(1)}
                >
                  Modifier mon rôle
                </button>
              </div>
              <div className="rounded-xl border border-white/20 p-4">
                <h3 className="font-medium">Votre présence</h3>
                <p className="mt-2 text-sm">
                  {
                    {
                      present: "Présent",
                      absent: "Absent",
                      peut_etre: "Peut-être",
                      en_attente: "À confirmer",
                    }[presence.rsvp]
                  }{" "}
                  · {presence.companions} accompagnant(s)
                </p>
                <p className="mt-2 text-sm">{presence.moments.join(" · ")}</p>
                <p className="mt-2 text-sm">
                  {presence.arrival
                    ? new Date(presence.arrival).toLocaleString("fr-FR")
                    : "Arrivée à préciser"}
                  {presence.departure
                    ? ` → ${new Date(presence.departure).toLocaleString("fr-FR")}`
                    : ""}
                </p>
                <button
                  type="button"
                  className="mt-2 min-h-11 text-sm underline"
                  onClick={() => setStep(2)}
                >
                  Modifier ma présence ou mes besoins
                </button>
              </div>
              <div className="rounded-xl border border-white/20 p-4">
                <h3 className="font-medium">BYAIME organise</h3>
                <p className="mt-2 text-sm text-white/70">
                  Vos horaires et réglages validés sont repris automatiquement
                  dans la Timeline.
                </p>
                <button
                  type="button"
                  className="mt-2 min-h-11 text-sm underline"
                  onClick={() => setStep(3)}
                >
                  Voir mes réglages pour ce mariage
                </button>
              </div>
              <button
                type="button"
                className={buttonStyle}
                onClick={() => navigate("/user-portal")}
              >
                Ouvrir mon mariage
              </button>
            </div>
          )}
          {step === 1 && (
            <>
              {Object.entries(ROLE_GROUPS).map(([group, roles]) => (
                <fieldset key={group}>
                  <legend className="mb-2 text-xs uppercase tracking-wider text-white/60">
                    {group}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <label
                        key={role}
                        className="flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={presence.roles.includes(role)}
                          onChange={(e) =>
                            contextual(
                              "roles",
                              e.target.checked
                                ? [...presence.roles, role]
                                : presence.roles.filter((r) => r !== role),
                            )
                          }
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </>
          )}
          {step === 2 && (
            <>
              {linkedRsvp && (
                <div className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm">
                  <strong>
                    Vos réponses viennent de votre invitation RSVP.
                  </strong>
                  <p className="mt-2 text-white/70">
                    Vous avez déjà répondu à l’invitation. Retrouvez votre
                    réponse ci-dessous ; utilisez le lien pour la modifier. Vos
                    autres informations concernent uniquement ce mariage.
                  </p>
                  {linkedRsvp.revoked ? (
                    <p className="mt-2">
                      Lien révoqué : contactez l’organisateur pour le réémettre.
                    </p>
                  ) : (
                    <a
                      className="mt-2 inline-block min-h-11 py-3 underline"
                      href={`/rsvp/${linkedRsvp.token}`}
                    >
                      Modifier mes réponses RSVP
                    </a>
                  )}
                </div>
              )}
              <label className="block text-sm">
                RSVP
                <select
                  className={inputStyle}
                  disabled={Boolean(linkedRsvp)}
                  value={presence.rsvp}
                  onChange={(e) =>
                    contextual("rsvp", e.target.value as Participation["rsvp"])
                  }
                >
                  <option value="en_attente">À confirmer</option>
                  <option value="present">Présent</option>
                  <option value="absent">Absent</option>
                  <option value="peut_etre">Peut-être</option>
                </select>
              </label>
              <label className="block text-sm">
                Nombre d’accompagnants
                <input
                  className={inputStyle}
                  type="number"
                  min="0"
                  max="50"
                  disabled={Boolean(linkedRsvp)}
                  value={presence.companions}
                  onChange={(e) =>
                    contextual("companions", Number(e.target.value))
                  }
                />
              </label>
              <fieldset>
                <legend className="mb-2 text-sm">Moments de présence</legend>
                <div className="flex flex-wrap gap-3">
                  {PRESENCE_MOMENTS.map((moment) => (
                    <label
                      key={moment}
                      className="flex min-h-11 items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        disabled={
                          Boolean(linkedRsvp) &&
                          ["Cérémonie", "Cocktail", "Dîner", "Brunch"].includes(
                            moment,
                          )
                        }
                        checked={presence.moments.includes(moment)}
                        onChange={(e) =>
                          contextual(
                            "moments",
                            e.target.checked
                              ? [...presence.moments, moment]
                              : presence.moments.filter((m) => m !== moment),
                          )
                        }
                      />
                      {moment}
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="text-xs text-white/60">
                Dates et heures dans votre fuseau local. Pour une fin après
                minuit, choisissez le lendemain.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <DateField
                  label="Arrivée"
                  value={presence.arrival}
                  onChange={(v) => contextual("arrival", v)}
                />
                <DateField
                  label="Départ"
                  value={presence.departure}
                  onChange={(v) => contextual("departure", v)}
                />
              </div>
              {(
                [
                  ["allergens", "Allergènes"],
                  ["dietary", "Contraintes alimentaires"],
                  ["needs", "Besoins particuliers"],
                  ["notes", "Informations utiles"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  {label}
                  <textarea
                    className={inputStyle}
                    maxLength={2000}
                    disabled={
                      Boolean(linkedRsvp) &&
                      (key === "dietary" || key === "notes")
                    }
                    value={presence[key]}
                    onChange={(e) => contextual(key, e.target.value)}
                  />
                </label>
              ))}
            </>
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
                Ajouter des horaires particuliers
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
              <details>
                <summary className="min-h-11 cursor-pointer text-sm">
                  Ajouter des horaires particuliers (facultatif)
                </summary>
                <fieldset>
                  <legend className="sr-only">
                    Créneaux pour ce mariage (facultatifs)
                  </legend>
                  {presence.slots.map((slot, i) => (
                    <div
                      className="mt-3 space-y-3 rounded-xl border border-white/20 p-3"
                      key={i}
                    >
                      <label className="text-sm">
                        Moment
                        <input
                          required
                          className={inputStyle}
                          value={slot.label}
                          placeholder="Cocktail, cérémonie…"
                          onChange={(e) =>
                            contextual(
                              "slots",
                              presence.slots.map((s, n) =>
                                n === i ? { ...s, label: e.target.value } : s,
                              ),
                            )
                          }
                        />
                      </label>
                      <DateField
                        label="Début"
                        value={slot.start}
                        onChange={(v) =>
                          contextual(
                            "slots",
                            presence.slots.map((s, n) =>
                              n === i ? { ...s, start: v } : s,
                            ),
                          )
                        }
                      />
                      <DateField
                        label="Fin"
                        value={slot.end}
                        onChange={(v) =>
                          contextual(
                            "slots",
                            presence.slots.map((s, n) =>
                              n === i ? { ...s, end: v } : s,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          contextual(
                            "slots",
                            presence.slots.filter((_, n) => n !== i),
                          )
                        }
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                  <button
                    className="mt-3 min-h-11 text-sm underline"
                    type="button"
                    onClick={() =>
                      contextual("slots", [
                        ...presence.slots,
                        { label: "", start: "", end: "" },
                      ])
                    }
                  >
                    + Ajouter un créneau
                  </button>
                </fieldset>
              </details>
            </>
          )}
          {step === 4 && (
            <>
              {!version ? (
                <>
                  <p className="text-sm">
                    {signedIn
                      ? "Vous êtes connecté. Votre brouillon a été conservé : enregistrez-le pour terminer votre carte, sans ressaisir vos informations."
                      : "Votre brouillon est prêt, mais pas encore enregistré dans votre compte. Connectez-vous ou créez un compte pour le conserver et le retrouver dans vos mariages."}
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
                        sessionStorage.setItem(DRAFT, JSON.stringify({ card }));
                        navigate("/creation?returnTo=%2Fma-carte");
                      } catch {
                        setError(
                          "Stockage indisponible. Ne fermez pas cette page.",
                        );
                      }
                    }}
                  >
                    {signedIn
                      ? "Enregistrer ma carte"
                      : "Enregistrer ma carte avec mon compte"}
                  </button>
                </>
              ) : (
                <>
                  <section
                    className="rounded-2xl border border-white/15 p-5"
                    aria-label="Mes activités"
                  >
                    <p className="text-[11px] uppercase tracking-[.16em] text-white/50">
                      02 · Mon fonctionnement · Facultatif
                    </p>
                    <h3 className="mt-2 text-lg">Ma façon de travailler</h3>
                    <p className="mt-2 text-sm text-white/65">
                      {card.profession
                        ? `${card.profession} : voulez-vous configurer votre façon de travailler ?`
                        : "Vous exercez une activité ? Retrouvez vos durées et vos disponibilités sans les ressaisir à chaque mariage."}
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
                              <span className="text-white/55">Modifier →</span>
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
                        ? "Ajouter une activité"
                        : "Configurer mon fonctionnement"}
                    </button>
                    <p className="mt-3 text-xs text-white/50">
                      Invité, proche ou témoin ? Passez directement à votre
                      mariage.
                    </p>
                  </section>
                  <section
                    className="space-y-4 rounded-2xl border border-white/15 p-5"
                    aria-label="Mes mariages"
                  >
                    <p className="text-[11px] uppercase tracking-[.16em] text-white/50">
                      03 · Mes mariages
                    </p>
                    <h3 className="text-lg">Où allez-vous ?</h3>
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
                            ? "Voir mes informations"
                            : "Préparer ma participation"}
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-white/65">
                        Vous n’avez encore rejoint aucun mariage. Utilisez une
                        invitation ou créez votre propre mariage ; votre
                        identité est déjà prête.
                      </p>
                    )}
                    <button
                      type="button"
                      className="min-h-11 rounded-full border border-white/30 px-5 text-sm"
                      onClick={() => setJoining(true)}
                    >
                      Rejoindre un mariage
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
                      Créer un mariage
                    </button>
                    {project && (
                      <button
                        type="button"
                        className="min-h-11 underline"
                        onClick={() => navigate("/user-portal")}
                      >
                        Ouvrir mon mariage
                      </button>
                    )}
                    <button
                      type="button"
                      className="min-h-11 underline"
                      onClick={() => navigate("/monde")}
                    >
                      Découvrir
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
                ? "Enregistrement…"
                : step === 0
                  ? version
                    ? "Enregistrer mes modifications"
                    : signedIn
                      ? "Enregistrer ma carte"
                      : "Préparer ma carte"
                  : step === 3 ||
                      (step === 2 &&
                        !presence.roles.some((role) =>
                          (
                            ROLE_GROUPS.Professionnels as readonly string[]
                          ).includes(role),
                        ))
                    ? "Valider ma participation"
                    : "Continuer"}
            </button>
          )}
          {step === 0 && (
            <p className="text-xs text-white/50">
              {signedIn
                ? "La visibilité de votre carte suit vos règles de partage. Vos horaires et besoins pour un mariage ne figurent jamais sur votre fiche publique."
                : "Sans compte, votre saisie reste un brouillon dans cette session du navigateur."}
            </p>
          )}
        </fieldset>
      </form>
    </section>
  );
}

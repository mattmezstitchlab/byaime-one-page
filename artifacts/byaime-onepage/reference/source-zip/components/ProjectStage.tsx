import { CHAIN_LINE, NO_CASH_LINE } from "@/lib/aime/wording";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Clock3,
  Images,
  Link2,
  MessageCircle,
  Music2,
  Pencil,
  Users,
  WalletCards,
} from "lucide-react";
import {
  HeroTimeline,
  KIND_LABEL_TIMELINE,
  STATUS_LABEL,
  type TimelineMarker,
} from "@/components/aime/HeroTimeline";
import { markerAlerts } from "@/lib/aime/timelineAlerts";
import { TimelineLayers } from "@/components/aime/TimelineLayers";
import { TimeCapsule } from "@/components/aime/TimeCapsule";
import { HeartAgent } from "@/components/aime/heart/HeartAgent";
import type { AgentNote } from "@/components/aime/heart/HeartMenu";
import type { FieldAction } from "@/components/aime/AimeField";
import { PlayProvider, usePlay } from "@/components/aime/play/PlayProvider";
import { PlayButton } from "@/components/aime/play/PlayButton";
import { PlayStage } from "@/components/aime/play/PlayStage";
import type { PlayableItem } from "@/lib/aime/play/types";
import { deriveTimeline, financeOf, bookedProviders, openProviders } from "@/lib/aime/world/derive";
import { euros, formatLongDate, type WorldProject } from "@/lib/aime/world/types";
import {
  familiesOf,
  makeLayerFilter,
  FAMILY_ORDER,
  type TimelineFamily,
} from "@/lib/aime/timelineFilters";
import { askTimeline } from "@/lib/aime/timelineAsk.functions";
import { cn } from "@/lib/utils";
import { PARTICIPANT_STATUS_LABEL } from "@/lib/aime/calendar";

const DAY = 86_400_000;
const HERO_INTRO_LIMIT = 300;

type Focus = { from: number; to: number; at?: number } | null;

/** Les trois fenêtres de la même ligne de temps (libellés : TimeCapsule). */
export type PhaseKey = "tout" | "avant" | "pendant" | "apres";

const HEART_ACTIONS: FieldAction[] = [
  { key: "tout", label: "Tout le projet", hint: "Toute la ligne de temps", icon: CalendarDays },
  { key: "avant", label: "Les préparatifs", hint: "Avant le jour J", icon: Clock3 },
  { key: "pendant", label: "Le jour J", hint: "La journée heure par heure", icon: CalendarDays },
  { key: "apres", label: "Les souvenirs", hint: "Photos, vidéos et messages", icon: Images },
  { key: "personnes", label: "Les personnes", hint: "Invités et prestataires", icon: Users },
  { key: "argent", label: "L'argent", hint: "Devis, acomptes et soldes", icon: WalletCards },
  { key: "musique", label: "La musique", hint: "Morceaux placés dans le temps", icon: Music2 },
  {
    key: "messages",
    label: "Les messages",
    hint: "Échanges et remerciements",
    icon: MessageCircle,
  },
];

export type ProjectStageProps = {
  project: WorldProject;
  /** Le film de fond du hero. */
  filmUrl: string;
  eyebrow: string;
  /** Ce que le cœur adopte : le projet enrichi, jamais dupliqué. */
  onProjectChange?: (next: WorldProject) => void;
  /** Contenu glissé dans le panneau du cœur (bouton « Activer », par exemple). */
  heartFooter?: ReactNode;
  onEditProject?: (() => void) | undefined;
  participants?: {
    id: string;
    cardId?: string | null;
    name: string;
    role?: string | null;
    photo?: string | null;
    status?: string | null;
  }[];
  command?: {
    token: number;
    focus?: Focus;
    phase?: PhaseKey;
    layers?: TimelineFamily[];
  } | null;
  onOpenParticipants?: (() => void) | undefined;
};

/**
 * La scène d'un projet : un film, une seule ligne de temps, trois fenêtres.
 * La page de démonstration et la page Projet affichent exactement la même chose.
 */
export function ProjectStage(props: ProjectStageProps) {
  const [focus, setFocus] = useState<Focus>(null);
  const onCurrent = useCallback((item: PlayableItem) => {
    setFocus({
      from: item.timestamp - 6 * 3_600_000,
      to: item.timestamp + 6 * 3_600_000,
      at: Date.now(),
    });
  }, []);

  return (
    <PlayProvider onCurrent={onCurrent}>
      <StageBody {...props} focus={focus} setFocus={setFocus} />
    </PlayProvider>
  );
}

function StageBody({
  project,
  filmUrl,
  eyebrow,
  onProjectChange,
  heartFooter,
  onEditProject,
  participants = [],
  command,
  onOpenParticipants,
  focus,
  setFocus,
}: ProjectStageProps & { focus: Focus; setFocus: (focus: Focus) => void }) {
  const markers = useMemo(() => deriveTimeline(project), [project]);
  const finance = useMemo(() => financeOf(project), [project]);
  const booked = useMemo(() => bookedProviders(project), [project]);
  const open = useMemo(() => openProviders(project), [project]);
  const [layers, setLayers] = useState<TimelineFamily[]>([]);
  const [phase, setPhase] = useState<PhaseKey>("tout");
  const [recenter, setRecenter] = useState(0);
  const [heartOpen, setHeartOpen] = useState(false);
  const [heartValue, setHeartValue] = useState("");
  const [notes, setNotes] = useState<AgentNote[]>([]);
  const play = usePlay();
  const layerFilter = useMemo(() => makeLayerFilter(layers), [layers]);
  const layerCounts = useMemo(() => {
    const counts: Partial<Record<TimelineFamily, number>> = {};
    for (const marker of markers) {
      for (const family of familiesOf(marker)) counts[family] = (counts[family] ?? 0) + 1;
    }
    return counts;
  }, [markers]);

  const focusRange = useCallback(
    (from: number, to: number) => setFocus({ from, to, at: Date.now() }),
    [setFocus],
  );

  const pivot = project.pivot.value;
  const first = markers[0]?.time ?? pivot - 180 * DAY;
  const last = markers.at(-1)?.time ?? pivot + 30 * DAY;

  /** Les trois fenêtres : même donnée, bornes différentes. */
  const phaseCounts = useMemo(() => {
    const counts = { tout: markers.length, avant: 0, pendant: 0, apres: 0 };
    for (const m of markers) {
      if (m.time < pivot) counts.avant += 1;
      else if (m.time < pivot + DAY) counts.pendant += 1;
      else counts.apres += 1;
    }
    return counts;
  }, [markers, pivot]);

  /** Ce que la scène montre vraiment : calques actifs et fenêtre de temps. */
  const visibleMarkers = useMemo(() => {
    const inWindow = (m: TimelineMarker) =>
      phase === "tout" ||
      (phase === "avant" && m.time < pivot) ||
      (phase === "pendant" && m.time >= pivot && m.time < pivot + DAY) ||
      (phase === "apres" && m.time >= pivot + DAY);
    return markers.filter((m) => (!layerFilter || layerFilter(m)) && inWindow(m));
  }, [markers, layerFilter, phase, pivot]);

  const daysToPivot = Math.max(0, Math.ceil((pivot - Date.now()) / DAY));
  const heroMedia = useMemo(
    () =>
      project.media.find((item) => item.id === "hero-media") ??
      project.media.find((item) => item.url || item.thumb) ??
      null,
    [project],
  );
  const heroUrl = heroMedia?.url ?? heroMedia?.thumb ?? null;
  const heroIntro = useMemo(
    () => project.subtitle?.trim().slice(0, HERO_INTRO_LIMIT) ?? "",
    [project.subtitle],
  );
  const rsvp = useMemo(
    () => ({
      confirme: participants.filter((p) => p.status === "confirme").length,
      invite: participants.filter((p) => p.status === "invite").length,
      decline: participants.filter((p) => p.status === "decline").length,
    }),
    [participants],
  );

  /** Ce que le héros raconte selon la fenêtre de temps choisie. */
  const phaseHighlights = useMemo(() => {
    const now = Date.now();
    if (phase === "apres") return visibleMarkers.slice(-3);
    const ahead = visibleMarkers.filter((m) => m.time >= now);
    return (ahead.length ? ahead : visibleMarkers).slice(0, 3);
  }, [visibleMarkers, phase]);

  const phaseLine =
    phase === "avant"
      ? `Les préparatifs : ${phaseCounts.avant} étapes avant la date.`
      : phase === "pendant"
        ? `Le jour même : ${phaseCounts.pendant} moments, heure par heure.`
        : phase === "apres"
          ? `Après : ${phaseCounts.apres} souvenirs et suites.`
          : `Tout le projet : ${phaseCounts.tout} moments sur la ligne de temps.`;

  const openPhase = useCallback(
    (key: PhaseKey) => {
      setPhase(key);
      if (key === "tout") focusRange(first, last);
      else if (key === "avant") focusRange(first, pivot);
      else if (key === "pendant") focusRange(pivot, pivot + DAY);
      else focusRange(pivot + DAY, last);
    },
    [first, focusRange, last, pivot],
  );
  const commandTokenRef = useRef<number | null>(null);

  useEffect(() => {
    if (!command || command.token === commandTokenRef.current) return;
    commandTokenRef.current = command.token;
    if ("layers" in command) setLayers(command.layers ?? []);
    if (command.phase) openPhase(command.phase);
    if ("focus" in command) setFocus(command.focus ?? null);
  }, [command, openPhase, setFocus]);

  /** Ce qui est relié à un repère : même prestataire, ou lien explicite. */
  const relatedTo = (m: TimelineMarker): TimelineMarker[] => {
    const providerId = m.metadata?.["providerId"];
    return markers.filter(
      (other) =>
        other.id !== m.id &&
        ((typeof providerId === "string" && other.metadata?.["providerId"] === providerId) ||
          m.relatedIds?.includes(other.id) ||
          other.relatedIds?.includes(m.id)),
    );
  };

  const chooseHeartAction = (key: string) => {
    if (key === "tout" || key === "avant" || key === "pendant" || key === "apres") {
      setLayers(
        key === "pendant"
          ? ["rdv", "musique", "personne"]
          : key === "apres"
            ? ["souvenir", "photo", "video", "message"]
            : [],
      );
      openPhase(key);
    } else if (key === "personnes") setLayers(["personne"]);
    else if (key === "argent") setLayers(["finance"]);
    else if (key === "musique") setLayers(["musique"]);
    else if (key === "messages") setLayers(["message"]);
    setHeartOpen(false);
  };

  const submitHeart = async () => {
    const value = heartValue.trim();
    if (!value) return;
    const noteId = `stage-${Date.now()}`;
    setNotes((current) => [
      {
        id: noteId,
        at: Date.now(),
        said: value,
        understood: "AIME regarde votre ligne de temps…",
        confirmable: false,
        state: "attente",
      },
      ...current,
    ]);
    setHeartValue("");

    const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
    try {
      const answer = await askTimeline({
        data: {
          question: value,
          projet: {
            titre: project.title,
            jourJ: iso(pivot),
            lieu: [project.city.value, project.venue.value].filter(Boolean).join(" · "),
            invites: typeof project.guests.value === "number" ? project.guests.value : null,
            engage: euros(finance.engaged),
            paye: euros(finance.paid),
            reste: euros(finance.balance),
            aPourvoir: open.map((p) => p.role),
          },
          items: markers.slice(0, 220).map((m) => ({
            id: m.id,
            quoi: KIND_LABEL_TIMELINE[m.kind],
            titre: m.title,
            quand: iso(m.time),
            etat: m.status ? STATUS_LABEL[m.status] : "—",
            montant: typeof m.amountCents === "number" ? euros(m.amountCents) : null,
          })),
          fenetre: focus ? { de: iso(focus.from), a: iso(focus.to) } : null,
        },
      });

      const families = answer.calques.filter((c): c is TimelineFamily =>
        FAMILY_ORDER.includes(c as TimelineFamily),
      );
      setLayers(families);
      const targets = markers.filter((m) => answer.cibles.includes(m.id));
      if (targets.length) {
        const times = targets.map((t) => t.time);
        focusRange(Math.min(...times) - DAY, Math.max(...times) + DAY);
      } else if (answer.focusDe && answer.focusA) {
        focusRange(Date.parse(answer.focusDe), Date.parse(answer.focusA));
      }
      setNotes((current) =>
        current.map((n) =>
          n.id === noteId ? { ...n, understood: answer.reponse, state: "confirme" as const } : n,
        ),
      );
    } catch (error) {
      setNotes((current) =>
        current.map((n) =>
          n.id === noteId
            ? {
                ...n,
                understood: error instanceof Error ? error.message : "AIME n’a pas pu répondre.",
                state: "corrige" as const,
              }
            : n,
        ),
      );
    }
  };

  return (
    <>
      <header className="relative isolate min-h-[calc(100svh-68px)] w-full overflow-hidden bg-foreground">
        {heroUrl ? (
          heroMedia?.kind === "video" ? (
            <video
              src={heroUrl}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <img src={heroUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )
        ) : (
          <video
            src={filmUrl}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/80 via-foreground/25 to-foreground/90" />
        {onEditProject && (
          <button
            type="button"
            onClick={onEditProject}
            className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-[12.5px] font-medium text-black backdrop-blur-md transition-opacity hover:opacity-85 md:right-6 md:top-6"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            Modifier
          </button>
        )}

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-68px)] w-full max-w-6xl flex-col justify-end gap-5 px-5 pb-44 pt-28 text-primary-foreground">
          <span className="w-fit rounded-full border border-primary-foreground/25 bg-foreground/30 px-3 py-1 text-[11px] uppercase tracking-[0.28em] backdrop-blur">
            {eyebrow}
          </span>
          {play.current ? (
            /* La lecture se déroule ici même : plus aucune fenêtre noire. */
            <PlayStage embedded />
          ) : (
            <>
              <h1 className="text-4xl font-semibold sm:text-6xl">{project.title}</h1>
              {heroIntro && (
                <p className="max-w-2xl text-[15px] leading-relaxed text-primary-foreground/88">
                  {heroIntro}
                </p>
              )}
              <p className="max-w-2xl text-base text-primary-foreground/80">
                {formatLongDate(pivot)}
                {project.city.value ? ` · ${project.city.value}` : ""}
                {project.venue.value ? ` · ${project.venue.value}` : ""}
                {project.guests.value ? ` · ${project.guests.value} personnes` : ""}
              </p>

              {/* Passé, présent, futur : le héros change de contenu, sans surcouche. */}
              <p className="text-[13px] text-primary-foreground/75">{phaseLine}</p>
              {phaseHighlights.length > 0 && (
                <ul className="flex flex-wrap gap-2 text-[12.5px]">
                  {phaseHighlights.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-full border border-primary-foreground/20 bg-foreground/30 px-3 py-1 backdrop-blur"
                    >
                      {m.title}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2 text-[13px]">
                {[
                  `${booked.length} places pourvues`,
                  open.length ? `${open.length} places à pourvoir` : "Toutes les places pourvues",
                  finance.engaged ? `${euros(finance.engaged)} engagés` : "Budget à poser",
                  pivot < Date.now() ? "Date passée" : `${daysToPivot} jours avant la date`,
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-primary-foreground/20 bg-foreground/30 px-3 py-1 backdrop-blur"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              {participants.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
                  <div className="flex -space-x-2">
                    {participants.slice(0, 6).map((person) =>
                      person.cardId ? (
                        <Link
                          key={person.id}
                          to="/carte/$id"
                          params={{ id: person.cardId }}
                          title={`${person.name} · ${PARTICIPANT_STATUS_LABEL[(person.status as "invite" | "confirme" | "decline") ?? "invite"]}${person.role ? ` · ${person.role}` : ""}`}
                          className="relative block"
                        >
                          {person.photo ? (
                            <img
                              src={person.photo}
                              alt={person.name}
                              className="h-10 w-10 rounded-full border border-white/25 object-cover"
                            />
                          ) : (
                            <span className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/15 text-sm font-medium text-white">
                              {person.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-foreground",
                              person.status === "confirme"
                                ? "bg-emerald-400"
                                : person.status === "decline"
                                  ? "bg-rose-400"
                                  : "bg-amber-300",
                            )}
                          />
                        </Link>
                      ) : (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => onOpenParticipants?.()}
                          title={person.name}
                          className="relative block"
                        >
                          {person.photo ? (
                            <img
                              src={person.photo}
                              alt={person.name}
                              className="h-10 w-10 rounded-full border border-white/25 object-cover"
                            />
                          ) : (
                            <span className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/15 text-sm font-medium text-white">
                              {person.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-foreground",
                              person.status === "confirme"
                                ? "bg-emerald-400"
                                : person.status === "decline"
                                  ? "bg-rose-400"
                                  : "bg-amber-300",
                            )}
                          />
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenParticipants?.()}
                    className="rounded-full border border-primary-foreground/20 bg-foreground/30 px-3 py-1 backdrop-blur"
                  >
                    {rsvp.confirme} confirmés · {rsvp.invite} en attente · {rsvp.decline} absents
                  </button>
                </div>
              )}
              <p className="max-w-2xl text-[12.5px] leading-relaxed text-primary-foreground/65">
                {CHAIN_LINE} {NO_CASH_LINE}
              </p>
            </>
          )}
        </div>

        {/* La ligne de temps reste sur le visuel ; toutes ses commandes passent dessous. */}
        <div className="absolute inset-x-0 bottom-0 z-20">
          <HeroTimeline
            markers={markers}
            focus={focus}
            recenter={recenter}
            preview
            actionsFor={(m) => [
              {
                key: "relie",
                label: "Ce qui est relié",
                icon: Link2,
                run: () => {
                  const times = relatedTo(m).map((r) => r.time);
                  if (times.length) focusRange(Math.min(...times) - DAY, Math.max(...times) + DAY);
                },
              },
            ]}
            contextFor={() => ({ label: project.title })}
            alertsFor={markerAlerts}
            relatedFor={relatedTo}
            {...(layerFilter ? { visible: layerFilter } : {})}
            className="w-full"
          />
        </div>
      </header>

      <div className="border-b border-hairline bg-background">
        <div className="mx-auto max-w-5xl px-3 py-2 sm:px-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <TimeCapsule
              compact
              mode="projet"
              phase={phase}
              counts={phaseCounts}
              className="min-w-0"
              onRecenter={() => {
                setRecenter(Date.now());
                openPhase("tout");
              }}
              onPhase={openPhase}
            />
            <div className="flex shrink-0 items-center gap-1.5">
              <HeartAgent
                inline
                open={heartOpen}
                onOpenChange={setHeartOpen}
                actions={HEART_ACTIONS}
                onPick={chooseHeartAction}
                value={heartValue}
                onChange={setHeartValue}
                onSubmit={submitHeart}
                notes={notes}
                onCorrect={(note) => setHeartValue(note.said)}
                title="Tout part de la ligne de temps"
                tone="aime"
                project={project}
                {...(onProjectChange ? { onAdopt: onProjectChange } : {})}
                contextLabel={
                  focus ? `${formatLongDate(focus.from)} → ${formatLongDate(focus.to)}` : undefined
                }
              >
                {heartFooter}
              </HeartAgent>
              <PlayButton markers={markers} visibleMarkers={visibleMarkers} at={pivot} />
              <TimelineLayers active={layers} onChange={setLayers} counts={layerCounts} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

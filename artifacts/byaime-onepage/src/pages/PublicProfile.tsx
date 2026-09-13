import { type ReactNode, useEffect, useMemo, useState, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MapPin, CalendarDays, User, Folder, Image as ImageIcon, Network, BookOpen, Fingerprint, Plus, Pencil, ZoomIn, ZoomOut, Car, Accessibility, CloudRain } from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { useLocation, useParams } from "wouter";
import { getGetPublicProfileQueryKey, useGetPublicProfile, type PublicProfile } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/store/project-store";
import { EntityEditor } from "@/components/EntityEditor";
import { CenteredBlock } from "@/components/CenteredBlock";

import type { ProfileTimelineEvent } from "@/components/ProfileFeed";
import { canRoleSeeTimelineEvent } from "@/lib/profile-visibility";
import { layoutTimeline } from "@/lib/timeline-layout";
import { focusWorld } from "@/lib/world-focus";
import { EventIcon, FilTrack } from "@/components/FilTrack";
import { indexTimelineConflicts } from "@/lib/timeline-graph";

import { ProfileFil } from "@/components/ProfileFil";
import { CoupleReport } from "@/components/CoupleReport";
import { buildRapport } from "@/lib/rapport";
import { trackEvent } from "@/lib/analytics";

type ProfileView = Omit<PublicProfile, "timeline"> & {
  timeline: ProfileTimelineEvent[];
};

const SECTIONS = [
  { id: "identity", label: "Identité", x: 400, icon: Fingerprint },
  { id: "history", label: "Histoire", x: 2000, icon: BookOpen },
  { id: "archives", label: "Archives", x: 4000, icon: Folder },
  { id: "network", label: "Réseau", x: 5000, icon: Network },
];

/** Étiquette de section : au-dessus de la dernière ligne de Moments. */
const SECTION_LABEL_TOP = -300;

export function ProfileIdentityHero({
  displayName,
  profileImage,
  subtitle,
  city,
  pivot,
  isPrivatePreview,
  onEditIdentity,
  children,
}: {
  displayName: string;
  profileImage?: string;
  subtitle?: string;
  city?: string;
  pivot?: number;
  isPrivatePreview: boolean;
  onEditIdentity: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      data-testid="profile-identity-hero"
      className="relative flex w-[min(38rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col items-center gap-4 px-4 text-center sm:px-6"
    >
      <button
        type="button"
        onClick={onEditIdentity}
        disabled={!isPrivatePreview}
        aria-label={isPrivatePreview ? "Modifier l’identité du Profil" : displayName}
        className={cn(
          "relative mb-2 flex h-28 w-28 items-center justify-center overflow-visible rounded-full border-2 border-foreground/15 bg-background shadow-2xl sm:h-32 sm:w-32",
          isPrivatePreview && "group transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
        )}
      >
        <div className="h-full w-full overflow-hidden rounded-full">
          {profileImage ? (
            <img data-preserve-color src={profileImage} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <User className="h-10 w-10 text-foreground/20" />
          )}
          {isPrivatePreview && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <Pencil className="h-6 w-6 text-white" />
              <span className="mt-2 text-[9px] uppercase tracking-widest text-white">Modifier</span>
            </div>
          )}
        </div>
        {isPrivatePreview && (
          <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-brand-accent shadow-lg transition-transform group-hover:scale-110">
            <Pencil className="h-3.5 w-3.5 text-brand-accent-foreground" />
          </div>
        )}
      </button>

      <h1 className="max-w-full text-balance font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        {displayName}
      </h1>

      {subtitle && (
        <p className="max-w-[min(30rem,100%)] text-balance text-sm font-light leading-7 text-foreground/45 [overflow-wrap:anywhere] sm:text-base md:text-lg">
          {subtitle}
        </p>
      )}

      <p className="pt-1 text-[10px] uppercase tracking-[0.3em] text-foreground/35">Identité</p>

      <div
        data-testid="profile-identity-meta"
        className="flex max-w-full flex-wrap items-center justify-center gap-3"
      >
        {city && (
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-foreground/5 bg-foreground/5 px-4 py-2 text-[10px] uppercase tracking-widest text-foreground/40">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{city}</span>
          </span>
        )}
        {pivot && (
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-foreground/5 bg-foreground/5 px-4 py-2 text-[10px] uppercase tracking-widest text-foreground/40">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {format(pivot, "d MMM yyyy", { locale: fr })}
            </span>
          </span>
        )}
      </div>

      {children}
    </div>
  );
}

/** Ce que le couple publie pour ses invité·es : le lieu, l'accès, le plan B. Jamais les contacts ni les chiffres. */
export type ProfilePractical = {
  venue?: string;
  parking?: string;
  accessibility?: string;
  weatherFallback?: string;
};

const PRACTICAL_ROWS: { key: keyof ProfilePractical; label: string; icon: typeof MapPin }[] = [
  { key: "venue", label: "Lieu", icon: MapPin },
  { key: "parking", label: "Stationnement", icon: Car },
  { key: "accessibility", label: "Accès", icon: Accessibility },
  { key: "weatherFallback", label: "Plan B", icon: CloudRain },
];

export function ProfilePracticalInfo({
  practical,
  isPrivatePreview,
  onEdit,
}: {
  practical?: ProfilePractical;
  isPrivatePreview: boolean;
  onEdit: () => void;
}) {
  const rows = PRACTICAL_ROWS.filter(row => practical?.[row.key]?.trim());
  if (!rows.length && !isPrivatePreview) return null;

  return (
    <section
      data-testid="profile-practical"
      aria-label="Infos pratiques"
      className="mt-6 w-full max-w-[min(30rem,100%)] rounded-3xl border border-foreground/8 bg-foreground/[0.03] px-5 py-5 text-left"
    >
      <p className="text-center text-[10px] uppercase tracking-[0.3em] text-foreground/35">Infos pratiques</p>

      {rows.length === 0 ? (
        <p data-testid="profile-practical-empty" className="mt-4 text-center text-xs font-light leading-6 text-foreground/45">
          Rien n'est encore publié : les invité·es ne verront que le programme.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map(row => (
            <li key={row.key} data-testid={`profile-practical-${row.key}`} className="flex items-start gap-3">
              <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground/35" />
              <span className="min-w-0">
                <span className="block text-[9px] uppercase tracking-[.18em] text-foreground/40">{row.label}</span>
                <span className="mt-0.5 block text-sm font-light leading-6 text-foreground/75 [overflow-wrap:anywhere]">
                  {practical?.[row.key]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {isPrivatePreview && (
        <button
          type="button"
          data-testid="profile-practical-edit"
          onClick={onEdit}
          className="mt-5 w-full rounded-full border border-foreground/12 px-4 py-2 text-[10px] uppercase tracking-[.16em] text-foreground/65 transition hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          Modifier ces infos
        </button>
      )}
    </section>
  );
}

export function PublicProfilePage({ privatePreview: forcePrivatePreview = false }: { privatePreview?: boolean }) {
  const params = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const {
    project,
    isHydrated,
    currentRole,
    canEdit,
    participantLinks,
    refreshParticipantLinks,
    updateProject,
    updateEntity,
  } = useProject();

  const profileId = forcePrivatePreview ? project?.id || "" : params.projectId || "";
  const { data: publishedProfile, isLoading, error } = useGetPublicProfile(profileId, {
    query: { queryKey: getGetPublicProfileQueryKey(profileId), retry: false, enabled: !forcePrivatePreview && Boolean(profileId) },
  });

  const privatePreview = useMemo<ProfileView | undefined>(() => {
    if (!project || (!forcePrivatePreview && project.id !== params.projectId)) return undefined;
    /* Ce que les invité·es verront : le couple le remplit dans la logistique,
       et l'aperçu montre exactement la projection publique — ni contacts, ni chiffres. */
    const logistics = project.logistics;
    const publishedPractical: ProfilePractical = {
      ...(project.venue.value?.trim() ? { venue: project.venue.value.trim() } : {}),
      ...(logistics?.parking?.trim() ? { parking: logistics.parking.trim() } : {}),
      ...(logistics?.accessibility?.trim() ? { accessibility: logistics.accessibility.trim() } : {}),
      ...(logistics?.weatherFallback?.trim() ? { weatherFallback: logistics.weatherFallback.trim() } : {}),
    };
    return {
      id: project.id,
      title: project.title,
      ...(project.subtitle?.trim() ? { subtitle: project.subtitle.trim() } : {}),
      ...(project.universe ? { universe: project.universe } : {}),
      ...(project.city.value?.trim() ? { city: project.city.value.trim() } : {}),
      pivot: project.pivot.value,
      ...(Object.keys(publishedPractical).length ? { practical: publishedPractical } : {}),
      timeline: project.timeline
        .filter(event => forcePrivatePreview ? canRoleSeeTimelineEvent(event, currentRole) : event.visibility === "audience")
        .sort((a, b) => a.time - b.time)
        .map(event => ({
          id: event.id,
          time: event.time,
          ...(event.endTime === undefined ? {} : { endTime: event.endTime }),
          ...(event.durationMinutes === undefined ? {} : { durationMinutes: event.durationMinutes }),
          kind: event.kind,
          title: event.title,
          ...(event.detail ? { detail: event.detail } : {}),
          ...(event.location ? { location: event.location } : {}),
          status: event.status,
          confidence: event.confidence,
          phase: event.phase,
          universe: event.universe,
          ...(event.provenance ? { provenance: event.provenance } : {}),
          visibility: event.visibility || "prive",
          relations: event.relations,
        })),
    };
  }, [currentRole, forcePrivatePreview, params.projectId, project]);

  const profile: ProfileView | undefined = forcePrivatePreview ? privatePreview : publishedProfile;
  const isPrivatePreview = forcePrivatePreview && Boolean(privatePreview);

  const [viewMode, setViewMode] = useState<"fil" | "rapport">("fil");

  /* Le bilan partagé : un choix explicite du planner, jamais un défaut. */
  const shareReport = project?.publicProfile?.shareReport === true;
  const toggleShareReport = () => {
    if (!project) return;
    updateProject({
      publicProfile: {
        published: project.publicProfile?.published ?? false,
        shareReport: !shareReport,
      },
    });
  };

  /* Quel mode du Profil est réellement ouvert : cinématique, Fil, ou frise. */
  useEffect(() => {
    trackEvent("profile_mode_opened", { mode: viewMode });
  }, [viewMode]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [selectedPublicEvent, setSelectedPublicEvent] = useState<ProfileTimelineEvent | null>(null);

  useEffect(() => {
    if (!profile) return;
    const previousTitle = document.title;
    const description = profile.subtitle || `La Timeline publique de ${profile.title} sur AIME.`;
    const existingMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = existingMeta?.content;
    document.title = `${profile.title} · AIME`;
    let meta = existingMeta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
    return () => {
      document.title = previousTitle;
      if (meta && previousDescription !== undefined) meta.content = previousDescription;
      else if (meta && !existingMeta) meta.remove();
    };
  }, [profile]);

  useEffect(() => {
    if (!isPrivatePreview) return;
    const toggleEditor = () => setSelectedNode({ type: "identity", label: "Identité" });
    window.addEventListener("aime:toggle-profile-editor", toggleEditor);
    return () => window.removeEventListener("aime:toggle-profile-editor", toggleEditor);
  }, [isPrivatePreview]);

  useEffect(() => {
    if (!isPrivatePreview || (currentRole !== "owner" && currentRole !== "planner")) return;
    void refreshParticipantLinks().catch(() => {
      // The RSVP projection remains absent when the current role cannot load it.
    });
  }, [currentRole, isPrivatePreview, refreshParticipantLinks]);

  const sortedEvents = useMemo(() => {
    return [...(profile?.timeline || [])].sort((a, b) => a.time - b.time);
  }, [profile?.timeline]);

  if (isLoading || (!isHydrated && !profile)) {
    return (
      <main data-testid="profile-loading" className="flex min-h-[100dvh] items-center justify-center bg-background px-6 text-foreground">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-[10px] uppercase tracking-[.35em] text-muted-foreground"
        >
          AIME · Ouverture des archives
        </motion.p>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main data-testid="profile-error" className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-6 text-center text-foreground">
        <div className="max-w-md">
          <p className="mb-8 text-[10px] uppercase tracking-[.4em] text-muted-foreground">Erreur</p>
          <h1 className="text-3xl font-display font-semibold tracking-tight mb-6">L'accès à cette histoire est impossible.</h1>
          <p className="mb-12 text-sm font-light text-muted-foreground">{error instanceof Error ? error.message : "Profil introuvable"}</p>
        </div>
      </main>
    );
  }

  const displayName = isPrivatePreview ? user?.fullName || user?.firstName || profile.title : profile.title;
  const profileImage = isPrivatePreview ? user?.imageUrl : undefined;


  return (
    <main data-testid="public-profile-page" className="relative h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* Background Depth */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      {/* Main Canvas Scroll Area */}
      {viewMode === "rapport" && project ? (
        <div className="w-full h-full overflow-y-auto pt-28 pb-16 animate-in fade-in duration-500 relative z-10">
          {isPrivatePreview && canEdit && (
            <div className="mx-auto mb-6 mt-2 flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 border border-[#E6E1D8] bg-[#FFFFFF] px-5 py-3">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#6F6A61]">
                {shareReport ? "Bilan partagé avec les mariés" : "Bilan non partagé"}
              </p>
              <div className="flex items-center gap-3">
                {shareReport ? <code className="text-[12px] text-[#4c463d]">/bilan/{profileId}</code> : null}
                <button
                  onClick={toggleShareReport}
                  className="border border-[#171410] px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-[#171410] transition-colors hover:bg-[#171410] hover:text-[#FFFFFF]"
                >
                  {shareReport ? "Ne plus partager" : "Partager le bilan"}
                </button>
              </div>
            </div>
          )}
          <CoupleReport
            rapport={buildRapport(project)}
            title={project.title}
            subtitle={project.subtitle}
            currency={project.currency}
          />
        </div>
      ) : (
        <div className="w-full h-full overflow-y-auto pt-32 pb-24 px-6 animate-in fade-in duration-500 relative z-10">
          <div className="max-w-3xl mx-auto">
            <ProfileFil projectId={profileId} onOpenMoment={(id) => {
              const ev = sortedEvents.find(e => e.id === id);
              if (ev) {
                setSelectedNode({ type: "item", collection: "timeline", sourceRef: ev, label: ev.title });
              }
            }} />
          </div>
        </div>
      )}

            {/* Contextual Navigation Header */}
      <header data-testid="profile-context-header" className="fixed left-1/2 top-20 z-[75] flex -translate-x-1/2 flex-col items-center justify-center gap-2 sm:flex-row md:top-8">
        {isPrivatePreview && (
          <div className="flex gap-1 border border-border/40 shadow-lg bg-background/88 px-1 py-1 backdrop-blur-xl rounded-full" role="tablist">


            <button
              onClick={() => setViewMode("rapport")}
              className={cn("whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-medium uppercase tracking-[.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground", viewMode === "rapport" ? "bg-foreground text-background shadow-md" : "text-foreground/60 hover:bg-foreground/10 hover:text-foreground")}
            >
              Bilan
            </button>
            <button
              onClick={() => setViewMode("fil")}
              className={cn("whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-medium uppercase tracking-[.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground", viewMode === "fil" ? "bg-foreground text-background shadow-md" : "text-foreground/60 hover:bg-foreground/10 hover:text-foreground")}
            >
              Le Fil
            </button>
          </div>
        )}


      </header>

      {/* Unified Entity Editor Modal */}
      <AnimatePresence>
        {selectedNode && (
          <EntityEditor
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            project={project}
            updateProject={updateProject}
            updateEntity={updateEntity}
            openUserProfile={openUserProfile}
            currentRole={currentRole}
            canEdit={canEdit}
          />
        )}
        {selectedPublicEvent && (
          <CenteredBlock
            eyebrow={format(selectedPublicEvent.time, "d MMMM yyyy", { locale: fr })}
            title={selectedPublicEvent.title}
            description="Moment publié en lecture seule."
            onClose={() => setSelectedPublicEvent(null)}
            leading={<EventIcon kind={selectedPublicEvent.kind} className="mt-4 h-6 w-6 text-foreground/50" />}
          >
            <div className="mt-5 space-y-4 text-sm font-light leading-7 text-foreground/60">
              {selectedPublicEvent.detail && <p>{selectedPublicEvent.detail}</p>}
              {selectedPublicEvent.location && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {selectedPublicEvent.location}
                </p>
              )}
              <p className="text-[10px] uppercase tracking-[.16em] text-foreground/38">
                {selectedPublicEvent.phase === "avant" ? "Avant" : selectedPublicEvent.phase === "pendant" ? "Jour J" : "Après"}
                {" · "}
                Public
              </p>
            </div>
          </CenteredBlock>
        )}
      </AnimatePresence>
    </main>
  );
}

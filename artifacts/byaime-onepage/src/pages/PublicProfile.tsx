import { useEffect, useMemo, useState, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  MapPin, CalendarDays, User, FileText, Folder, Wallet,
  Calendar, Users, Image as ImageIcon, Network, BookOpen, Fingerprint, Lock, Globe2, Plus, Pencil, ZoomIn, ZoomOut
} from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { useLocation, useParams } from "wouter";
import { getGetPublicProfileQueryKey, useGetPublicProfile, type PublicProfile } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/store/project-store";
import { EntityEditor } from "@/components/EntityEditor";
import { CenteredBlock } from "@/components/CenteredBlock";

import type { ProfileTimelineEvent } from "@/components/ProfileFeed";
import { canRoleSeeTimelineEvent } from "@/lib/profile-visibility";
import { createTimelinePositioner } from "@/lib/profile-timeline-position";

import { ProfileFil } from "@/components/ProfileFil";

type ProfileView = Omit<PublicProfile, "timeline"> & {
  timeline: ProfileTimelineEvent[];
};

function EventIcon({ kind, className }: { kind?: string, className?: string }) {
  const classes = cn("w-5 h-5", className);
  switch (kind) {
    case "document":
    case "devis":
    case "facture":
      return <FileText className={classes} />;
    case "paiement":
      return <Wallet className={classes} />;
    case "evenement":
    case "jalon":
      return <Calendar className={classes} />;
    case "souvenir":
      return <ImageIcon className={classes} />;
    case "message":
    case "team":
    case "guest":
      return <Users className={classes} />;
    default:
      return <Folder className={classes} />;
  }
}

const SECTIONS = [
  { id: "identity", label: "Identité", x: 400, icon: Fingerprint },
  { id: "history", label: "Histoire", x: 2000, icon: BookOpen },
  { id: "archives", label: "Archives", x: 4000, icon: Folder },
  { id: "network", label: "Réseau", x: 5000, icon: Network },
];

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
    return {
      id: project.id,
      title: project.title,
      ...(project.subtitle?.trim() ? { subtitle: project.subtitle.trim() } : {}),
      ...(project.universe ? { universe: project.universe } : {}),
      ...(project.city.value?.trim() ? { city: project.city.value.trim() } : {}),
      pivot: project.pivot.value,
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

  const [viewMode, setViewMode] = useState<"timeline" | "fil">("timeline");
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [selectedPublicEvent, setSelectedPublicEvent] = useState<ProfileTimelineEvent | null>(null);
  const [activeSection, setActiveSection] = useState("identity");
  const [timelineFocusX, setTimelineFocusX] = useState(SECTIONS[0].x);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const guestArrivals = useMemo(() => {
    if (!project || !isPrivatePreview || (currentRole !== "owner" && currentRole !== "planner")) return [];
    return Object.values(participantLinks).flatMap(link => {
      if (!link.respondedAt || !link.response?.status) return [];
      const guest = project.guests.find(item => item.id === link.guestId);
      const time = Date.parse(link.respondedAt);
      if (!guest || !Number.isFinite(time)) return [];
      return [{
        id: `rsvp-${guest.id}-${link.respondedAt}`,
        guest,
        time,
        status: link.response.status,
      }];
    });
  }, [currentRole, isPrivatePreview, participantLinks, project]);

  const sortedEvents = useMemo(() => {
    return [...(profile?.timeline || [])].sort((a, b) => a.time - b.time);
  }, [profile?.timeline]);

  const { getEventX } = useMemo(() => {
    const times = [
      ...sortedEvents.map(event => event.time),
      ...guestArrivals.map(arrival => arrival.time),
    ];
    return { getEventX: createTimelinePositioner(times) };
  }, [guestArrivals, sortedEvents]);

  const prefersReducedMotion = useReducedMotion();

  const scrollToSection = (x: number) => {
    setTimelineFocusX(x);
    if (scrollRef.current) {
      const containerWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({ left: x * zoom - containerWidth / 2, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  const contextItems = useMemo(() => {
    if (!project || !isPrivatePreview) return [];
    const items: Array<Record<string, unknown> & {
      id: string;
      _type: "timeline" | "documents" | "memories" | "guests" | "providers" | "tasks";
      _date: number;
      _title: string;
      kind: string;
    }> = [];
    project.timeline.forEach(event => items.push({ ...event, _type: "timeline", _date: event.time, _title: event.title }));
    project.documents.forEach(document => items.push({ ...document, _type: "documents", _date: document.at, _title: document.title, kind: "document" }));
    project.memories.forEach(memory => items.push({ ...memory, _type: "memories", _date: 0, _title: memory.title, kind: "souvenir" }));
    project.guests.forEach(guest => items.push({ ...guest, _type: "guests", _date: 0, _title: guest.name, kind: "guest" }));
    project.providers.forEach(provider => items.push({ ...provider, _type: "providers", _date: 0, _title: provider.name || provider.role, kind: "provider" }));
    project.tasks.forEach(task => items.push({ ...task, _type: "tasks", _date: task.dueDate || 0, _title: task.title, kind: "task" }));
    return items.sort((a, b) => b._date - a._date).slice(0, 10);
  }, [isPrivatePreview, project]);

  useEffect(() => {
    if (!scrollRef.current || viewMode !== "timeline") return;
    const containerWidth = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({
      left: timelineFocusX * zoom - containerWidth / 2,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [prefersReducedMotion, timelineFocusX, viewMode, zoom]);

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
          <h1 className="text-3xl font-display font-light mb-6">L'accès à cette histoire est impossible.</h1>
          <p className="mb-12 text-sm font-light text-muted-foreground">{error instanceof Error ? error.message : "Profil introuvable"}</p>
        </div>
      </main>
    );
  }

  const displayName = isPrivatePreview ? user?.fullName || user?.firstName || profile.title : profile.title;
  const profileImage = isPrivatePreview ? user?.imageUrl : undefined;

  // Distribute Archives
  const archives = isPrivatePreview ? [
    ...(project?.documents || []).map(d => ({ ...d, collection: "documents", kind: "document" })),
    ...(project?.payments || []).map(p => ({ ...p, collection: "payments", kind: "paiement" })),
    ...(project?.memories || []).map(m => ({ ...m, collection: "memories", kind: "souvenir" }))
  ] : [];
  const guests = isPrivatePreview ? (project?.guests || []) : [];

  return (
    <main data-testid="public-profile-page" className="relative h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* Background Depth */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      {/* Main Canvas Scroll Area */}
      {viewMode === "fil" ? (
        <div className="w-full h-full overflow-y-auto pt-32 pb-24 px-6 animate-in fade-in duration-500 relative z-10">
          <div className="max-w-3xl mx-auto">
            <ProfileFil projectId={profileId} onOpenMoment={(id) => {
              const ev = sortedEvents.find(e => e.id === id);
              if (ev) {
                setSelectedNode({ type: "item", collection: "timeline", sourceRef: ev, label: ev.title });
                setViewMode("timeline");
                scrollToSection(getEventX(ev.time));
              }
            }} />
          </div>
        </div>
      ) : (
      <div
        ref={scrollRef}
        className="absolute inset-0 z-10 overflow-x-auto overflow-y-hidden hide-scrollbar animate-in fade-in duration-500"
      >
        <div className="relative h-full" style={{ width: `${5600 * zoom}px` }}>
          <div
            className="absolute inset-y-0 left-0 w-[5600px] origin-left"
            style={{ transform: `scale(${zoom})`, transformOrigin: "left center" }}
          >
          {/* Main Horizontal Trunk */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-foreground/15 shadow-[0_0_15px_rgba(255,255,255,0.1)]" />

          {/* Section Markers */}
          {SECTIONS.map(section => (
            <div key={section.id} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${section.x}px` }}>
               <div className="w-[1px] h-32 bg-foreground/10 absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2" />
               <div className="absolute top-20 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-foreground/30 font-medium bg-background px-4 py-1 rounded-full border border-foreground/5">
                 {section.label}
               </div>
            </div>
          ))}

          {/* 1. IDENTITÉ (Hero) */}
          <div className="absolute top-1/2 -translate-y-1/2" style={{ left: '400px' }}>
             <div className="relative flex flex-col items-center -translate-x-1/2 w-[600px]">
                <button
                    type="button"
                    onClick={() => isPrivatePreview && setSelectedNode({ type: "identity", label: "Identité" })}
                    disabled={!isPrivatePreview}
                    aria-label={isPrivatePreview ? "Modifier l’identité du Profil" : displayName}
                    className={cn(
                      "relative group w-32 h-32 rounded-full border-2 border-foreground/15 bg-background flex items-center justify-center overflow-visible mb-8 shadow-2xl",
                      isPrivatePreview && "transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                    )}
                >
                  <div className="w-full h-full rounded-full overflow-hidden">
                    {profileImage
                      ? <img data-preserve-color src={profileImage} alt={displayName} className="h-full w-full object-cover" />
                      : <User className="w-10 h-10 text-foreground/20" />}
                    {isPrivatePreview && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="w-6 h-6 text-white" />
                        <span className="text-[9px] uppercase tracking-widest text-white mt-2">Modifier</span>
                      </div>
                    )}
                  </div>
                  {isPrivatePreview && (
                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-brand-accent rounded-full border-2 border-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                       <Pencil className="w-3.5 h-3.5 text-brand-accent-foreground" />
                    </div>
                  )}
                </button>

                <h1 className="text-5xl font-display font-light tracking-tight text-foreground mb-4 text-center">
                  {displayName}
                </h1>
                {profile.subtitle && (
                  <h2 className="mb-8 max-w-[min(28rem,calc(100vw-3rem))] text-balance text-center text-base font-light leading-7 text-foreground/40 md:text-lg">
                    {profile.subtitle}
                  </h2>
                )}

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
                  {profile.city && (
                    <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-foreground/40 bg-foreground/5 px-4 py-2 rounded-full border border-foreground/5">
                      <MapPin className="w-3.5 h-3.5" /> {profile.city}
                    </span>
                  )}
                  {profile.pivot && (
                    <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-foreground/40 bg-foreground/5 px-4 py-2 rounded-full border border-foreground/5">
                      <CalendarDays className="w-3.5 h-3.5" /> {format(profile.pivot, "d MMM yyyy", { locale: fr })}
                    </span>
                  )}
                </div>

                {isPrivatePreview && contextItems.length > 0 && (
                  <div className="mt-8 flex max-w-full items-center justify-center -space-x-2 overflow-x-auto px-4 py-4 hide-scrollbar" aria-label="Collections du Monde">
                    {contextItems.map((item, index) => (
                      <button
                        key={item.id + index}
                        type="button"
                        onClick={() => setSelectedNode({ type: "item", collection: item._type, sourceRef: item, label: item._title })}
                        title={item._title}
                        className="relative group grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-background bg-card text-foreground shadow-xl transition-transform hover:z-20 hover:-translate-y-1 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                        style={{ zIndex: 10 - index }}
                      >
                        <EventIcon kind={item.kind} className="w-5 h-5 text-foreground/70 group-hover:text-foreground transition-colors" />
                        <span className="sr-only">{item._title}</span>
                      </button>
                    ))}
                    {currentRole !== 'viewer' && (
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event("aime:open-create"))}
                        title="Ajouter au Monde"
                        className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-background bg-brand-accent text-brand-accent-foreground shadow-[0_0_15px_hsl(var(--brand-accent)/0.4)] transition-transform hover:z-20 hover:-translate-y-1 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="sr-only">Ajouter au Monde</span>
                      </button>
                    )}
                  </div>
                )}
             </div>
          </div>

          {/* 2. HISTOIRE (Timeline) */}
          {sortedEvents.map((event, i) => {
            const x = getEventX(event.time);
            const isTop = i % 2 === 0;
            const yOffset = isTop ? -100 : 100;
            return (
              <div key={event.id} className="absolute top-1/2" style={{ left: `${x}px` }}>
                 <div
                    className="absolute left-0 w-[1px] bg-foreground/15"
                    style={{
                       height: `${Math.abs(yOffset)}px`,
                       top: isTop ? `${yOffset}px` : `0px`,
                    }}
                 />
                 <button
                    type="button"
                    onClick={() => {
                      if (isPrivatePreview) {
                        setSelectedNode({ type: "item", collection: "timeline", sourceRef: event, label: event.title });
                      } else {
                        setSelectedPublicEvent(event);
                      }
                    }}
                    aria-label={`Ouvrir le Moment ${event.title}`}
                    className="absolute group flex flex-col items-center justify-center w-14 h-14 -translate-x-1/2 -translate-y-1/2"
                    style={{ top: `${yOffset}px`, left: '0px' }}
                 >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-foreground/15 bg-background shadow-xl transition-all group-hover:scale-110 group-hover:border-foreground/40 group-hover:bg-foreground/10">
                       <EventIcon kind={event.kind} className="text-foreground/60 group-hover:text-foreground" />
                    </div>
                    <div className={cn(
                      "absolute flex flex-col items-center w-48 transition-opacity pointer-events-none",
                      isTop ? "bottom-full mb-3" : "top-full mt-3"
                    )}>
                       <span className="text-[10px] uppercase tracking-widest text-foreground/80 text-center truncate w-full group-hover:text-brand-accent">
                         {event.title}
                       </span>
                       <span className="text-[9px] text-foreground/40 mt-1">
                         {format(event.time, "d MMM yyyy", { locale: fr })}
                       </span>
                       {/* Related Entities Branches */}
                       {event.relations && event.relations.length > 0 && (
                         <div className="flex gap-1 mt-2">
                            {event.relations.map((rel, idx) => (
                               <div key={idx} className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground/10" title={rel.kind}>
                                  <EventIcon kind={rel.kind} className="w-2 h-2 text-foreground/40" />
                               </div>
                            ))}
                         </div>
                       )}
                    </div>
                 </button>
              </div>
            );
          })}

          {guestArrivals.map(arrival => {
            const x = getEventX(arrival.time);
            return (
              <div key={arrival.id} className="absolute top-1/2" style={{ left: `${x}px` }}>
                <div className="absolute left-0 top-0 h-44 w-px -translate-y-full bg-brand-accent/25" />
                <button
                  type="button"
                  onClick={() => setSelectedNode({
                    type: "item",
                    collection: "guests",
                    sourceRef: arrival.guest,
                    label: arrival.guest.name,
                  })}
                  aria-label={`Ouvrir l’arrivée de ${arrival.guest.name}`}
                  className="group absolute left-0 top-[-176px] flex w-44 -translate-x-1/2 flex-col items-center rounded-2xl border border-brand-accent/25 bg-background/85 px-3 py-3 text-center shadow-xl backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                >
                  <span className="relative mb-2 grid h-8 w-8 place-items-center rounded-full bg-brand-accent text-brand-accent-foreground">
                    <span className="absolute inset-0 animate-ping rounded-full bg-brand-accent/35 motion-reduce:animate-none" />
                    <Users className="relative h-3.5 w-3.5" />
                  </span>
                  <span className="text-[9px] uppercase tracking-[.18em] text-foreground/80">{arrival.guest.name}</span>
                  <span className="mt-1 text-[8px] uppercase tracking-[.14em] text-foreground/40">
                    {arrival.status === "confirmed" ? "Arrivée confirmée" : "Réponse reçue"}
                  </span>
                </button>
              </div>
            );
          })}

          {/* 3. ARCHIVES */}
          {isPrivatePreview && canEdit && (currentRole === "owner" || currentRole === "planner") && (
            <button
              type="button"
              onClick={() => navigate("/user-portal?create=document-media")}
              className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full border border-foreground/12 bg-background/85 px-5 py-3 text-left shadow-xl backdrop-blur-md transition hover:border-foreground/30 hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              style={{ left: "4000px" }}
              aria-label="Ajouter ou remplacer un visuel du Monde"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground/8">
                <ImageIcon className="h-4 w-4 text-foreground/65" />
              </span>
              <span>
                <span className="block text-[9px] uppercase tracking-[.16em] text-foreground/78">Visuels du Monde</span>
                <span className="mt-0.5 block text-[8px] uppercase tracking-[.12em] text-foreground/35">Ajouter ou remplacer</span>
              </span>
            </button>
          )}
          {archives.map((item, i) => {
             const angle = (i / archives.length) * Math.PI * 2;
             const radius = 180 + (i % 3) * 40;
             const x = 4000 + Math.cos(angle) * radius;
             const yOffset = Math.sin(angle) * radius;

             return (
               <div key={item.id || i} className="absolute top-1/2" style={{ left: `${x}px` }}>
                  <button
                     onClick={() => isPrivatePreview && setSelectedNode({ type: "item", collection: item.collection, sourceRef: item, label: (item as any).title || (item as any).label })}
                     className="absolute group flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110"
                     style={{ top: `${yOffset}px`, left: '0px' }}
                  >
                     <div className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-background/50 backdrop-blur-md shadow-lg group-hover:bg-foreground/10 group-hover:border-foreground/30">
                        <EventIcon kind={item.kind} className="w-4 h-4 text-foreground/50 group-hover:text-foreground" />
                     </div>
                     <span className="absolute top-full mt-2 text-[8px] uppercase tracking-widest text-foreground/40 group-hover:text-foreground truncate w-24 text-center">
                       {(item as any).title || (item as any).label || item.kind}
                     </span>
                  </button>
               </div>
             );
          })}

          {/* 4. RÉSEAU */}
          {guests.map((guest, i) => {
             const angle = (i / guests.length) * Math.PI * 2;
             const radius = 200 + (i % 2) * 50;
             const x = 5000 + Math.cos(angle) * radius;
             const yOffset = Math.sin(angle) * radius;

             return (
               <div key={guest.id || i} className="absolute top-1/2" style={{ left: `${x}px` }}>
                  <button
                     onClick={() => isPrivatePreview && setSelectedNode({ type: "item", collection: "guests", sourceRef: guest, label: guest.name })}
                     className="absolute group flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110"
                     style={{ top: `${yOffset}px`, left: '0px' }}
                  >
                     <div className="flex h-8 w-8 items-center justify-center rounded-full border border-foreground/10 bg-background/50 backdrop-blur-md shadow-lg group-hover:bg-foreground/10 group-hover:border-foreground/30">
                        <User className="w-3 h-3 text-foreground/50 group-hover:text-foreground" />
                     </div>
                     <span className="absolute top-full mt-2 text-[8px] uppercase tracking-widest text-foreground/40 group-hover:text-foreground truncate w-20 text-center">
                       {guest.name}
                     </span>
                  </button>
               </div>
             );
          })}
          </div>

        </div>
      </div>
      )}

      {/* Contextual Navigation Header */}
      <header data-testid="profile-context-header" className="fixed left-1/2 top-20 z-[75] flex -translate-x-1/2 flex-col items-center justify-center gap-2 sm:flex-row md:top-8">
        {isPrivatePreview && (
          <div className="flex gap-1 border border-border/40 shadow-lg bg-background/88 px-1 py-1 backdrop-blur-xl rounded-full" role="tablist">
            <button
              onClick={() => setViewMode("timeline")}
              className={cn("whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-medium uppercase tracking-[.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground", viewMode === "timeline" ? "bg-foreground text-background shadow-md" : "text-foreground/60 hover:bg-foreground/10 hover:text-foreground")}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("fil")}
              className={cn("whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-medium uppercase tracking-[.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground", viewMode === "fil" ? "bg-foreground text-background shadow-md" : "text-foreground/60 hover:bg-foreground/10 hover:text-foreground")}
            >
              Le Fil
            </button>
          </div>
        )}

        {viewMode === "timeline" && (
          <nav className="flex items-center gap-1 rounded-full border border-border/40 bg-background/88 p-1 shadow-lg backdrop-blur-xl">
             {SECTIONS.map((section) => (
                <button
                   key={section.id}
                   onClick={() => {
                     setActiveSection(section.id);
                     scrollToSection(section.x);
                   }}
                   aria-current={activeSection === section.id ? "location" : undefined}
                   className={cn(
                     "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] uppercase tracking-widest transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                     activeSection === section.id ? "text-foreground bg-foreground/10" : "text-foreground/60",
                   )}
                >
                   <section.icon className="w-3 h-3" />
                   <span className="hidden sm:inline">{section.label}</span>
                </button>
             ))}
             <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
             <button
               type="button"
               onClick={() => setZoom(value => Math.max(0.75, Number((value - 0.15).toFixed(2))))}
               disabled={zoom <= 0.75}
               aria-label="Réduire la Timeline"
               className="grid h-7 w-7 place-items-center rounded-full text-foreground/55 transition hover:bg-foreground/10 hover:text-foreground disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
             >
               <ZoomOut className="h-3.5 w-3.5" />
             </button>
             <button
               type="button"
               onClick={() => setZoom(value => Math.min(1.3, Number((value + 0.15).toFixed(2))))}
               disabled={zoom >= 1.3}
               aria-label="Agrandir la Timeline"
               className="grid h-7 w-7 place-items-center rounded-full text-foreground/55 transition hover:bg-foreground/10 hover:text-foreground disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
             >
               <ZoomIn className="h-3.5 w-3.5" />
             </button>
          </nav>
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

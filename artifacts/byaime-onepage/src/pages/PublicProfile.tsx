import { useEffect, useMemo, useState, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Clock3, CalendarDays, User, Plus, FileText, Folder, Wallet, Plane,
  Calendar, Users, Image as ImageIcon, ZoomIn, ZoomOut, Network, BookOpen, Fingerprint
} from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { useParams, Link } from "wouter";
import { getGetPublicProfileQueryKey, useGetPublicProfile, type PublicProfile, type PublicTimelineEvent } from "@workspace/api-client-react";
import { CenteredBlock } from "@/components/CenteredBlock";
import { cn } from "@/lib/utils";
import { useProject } from "@/store/project-store";

function EventIcon({ kind }: { kind?: string }) {
  switch (kind) {
    case "document":
    case "devis":
    case "facture":
      return <FileText className="w-5 h-5 text-white/60" />;
    case "paiement":
      return <Wallet className="w-5 h-5 text-white/60" />;
    case "evenement":
    case "jalon":
      return <Calendar className="w-5 h-5 text-white/60" />;
    case "souvenir":
      return <ImageIcon className="w-5 h-5 text-white/60" />;
    case "message":
      return <Users className="w-5 h-5 text-white/60" />;
    default:
      return <Folder className="w-5 h-5 text-white/60" />;
  }
}

const CATEGORIES = [
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'dossiers', label: 'Dossiers', icon: Folder },
  { id: 'finances', label: 'Finances', icon: Wallet },
  { id: 'voyages', label: 'Voyages', icon: Plane },
  { id: 'evenements', label: 'Événements', icon: Calendar },
  { id: 'personnes', label: 'Personnes', icon: Users },
  { id: 'medias', label: 'Médias', icon: ImageIcon },
];

const REPERES = [
  { id: "identity", label: "Identité", left: 12.5, icon: Fingerprint, description: "Noms, naissance, villes vécues et informations que vous choisissez de relier à votre identité." },
  { id: "history", label: "Histoire", left: 37.5, icon: BookOpen, description: "Moments, voyages, rencontres et événements qui composent votre histoire." },
  { id: "archives", label: "Archives", left: 62.5, icon: Folder, description: "Documents, dossiers, contrats et finances conservés avec leurs droits d’accès." },
  { id: "network", label: "Réseau", left: 87.5, icon: Network, description: "Personnes, organisations et Mondes reliés à votre Profil." },
];

const yOffsets = [
  -80,
  80,
  -40,
  40
];

function MissingDataHint({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-dashed border-white/10 bg-white/[0.02] px-4 py-2 text-[9px] uppercase tracking-widest text-white/32">
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
  );
}

export function PublicProfilePage({ privatePreview: forcePrivatePreview = false }: { privatePreview?: boolean }) {
  const params = useParams<{ projectId: string }>();
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const { project, isHydrated } = useProject();
  const profileId = forcePrivatePreview ? project?.id || "" : params.projectId || "";
  const { data: publishedProfile, isLoading, error } = useGetPublicProfile(profileId, {
    query: { queryKey: getGetPublicProfileQueryKey(profileId), retry: false, enabled: !forcePrivatePreview && Boolean(profileId) },
  });

  const privatePreview = useMemo<PublicProfile | undefined>(() => {
    if (!project || (!forcePrivatePreview && project.id !== params.projectId)) return undefined;
    return {
      id: project.id,
      title: project.title,
      ...(project.subtitle?.trim() ? { subtitle: project.subtitle.trim() } : {}),
      ...(project.universe ? { universe: project.universe } : {}),
      ...(project.city.value?.trim() ? { city: project.city.value.trim() } : {}),
      pivot: project.pivot.value,
      timeline: project.timeline
        .filter(event => forcePrivatePreview || event.visibility === "audience")
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
          visibility: "audience" as const,
        })),
    };
  }, [forcePrivatePreview, params.projectId, project]);

  const profile = forcePrivatePreview ? privatePreview : publishedProfile;
  const isPrivatePreview = forcePrivatePreview && Boolean(privatePreview);
  const [selectedEvent, setSelectedEvent] = useState<PublicTimelineEvent | undefined>();
  const [selectedRepere, setSelectedRepere] = useState<(typeof REPERES)[number] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 1.5;
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeft - walk;
  };
  const handlePointerUp = () => setIsDragging(false);

  useEffect(() => {
    if (!profile) return;
    const previousTitle = document.title;
    const description = profile.subtitle || `La Timeline publique de ${profile.title} sur AIME.`;
    document.title = `${profile.title} · AIME`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = meta?.content;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
    return () => {
      document.title = previousTitle;
      if (meta && previousDescription !== undefined) meta.content = previousDescription;
    };
  }, [profile]);

  const sortedEvents = useMemo(() => {
     const events = [...(profile?.timeline || [])];
     if (isPrivatePreview && project) {
       events.push(
         ...project.documents.map(document => ({
           id: `profile-document-${document.id}`,
           time: document.at,
           kind: "document",
           title: document.title,
           detail: `${document.kind === "autre" ? "Document" : document.kind} conservé dans les Archives de ${project.title}.`,
           status: "execute",
           confidence: "confirme",
           phase: document.at < Date.now() ? "avant" : "apres",
           universe: "Archives",
           provenance: "real",
           visibility: "audience" as const,
         })),
         ...project.payments.map(payment => ({
           id: `profile-payment-${payment.id}`,
           time: payment.at,
           kind: "paiement",
           title: payment.label,
           detail: `${(payment.amountCents / 100).toLocaleString("fr-FR")} € · ${payment.state === "paye" ? "Payé" : "À régler"} · ${project.title}`,
           status: payment.state === "paye" ? "execute" : "prepare",
           confidence: "confirme",
           phase: payment.at < Date.now() ? "avant" : "apres",
           universe: "Finances",
           provenance: "real",
           visibility: "audience" as const,
         })),
       );
     }
     return events.sort((a, b) => a.time - b.time);
  }, [isPrivatePreview, profile?.timeline, project]);

  const filteredEvents = useMemo(() => {
    if (!activeCategory) return sortedEvents;
    return sortedEvents.filter(e => {
        if (activeCategory === 'documents' || activeCategory === 'dossiers') return ['document', 'devis', 'facture'].includes(e.kind);
        if (activeCategory === 'finances') return e.kind === 'paiement';
        if (activeCategory === 'voyages') return /voyage|lune de miel|déplacement|séjour/i.test(`${e.title} ${e.detail || ""}`);
        if (activeCategory === 'evenements') return ['evenement', 'jalon'].includes(e.kind);
        if (activeCategory === 'personnes') return e.kind === 'message' || e.kind === 'intention';
        if (activeCategory === 'medias') return e.kind === 'souvenir';
        return true;
    });
  }, [sortedEvents, activeCategory]);

  const { getPosition } = useMemo(() => {
    const minTime = sortedEvents.length > 0 ? sortedEvents[0].time : 0;
    const maxTime = sortedEvents.length > 0 ? sortedEvents[sortedEvents.length - 1].time : 0;
    const timeSpan = maxTime - minTime || 86400000;
    const paddedMin = minTime - timeSpan * 0.15;
    const paddedMax = maxTime + timeSpan * 0.15;
    const paddedSpan = paddedMax - paddedMin;
    return {
      getPosition: (time: number) => ((time - paddedMin) / paddedSpan) * 100
    };
  }, [sortedEvents]);

  if (isLoading || (!isHydrated && !profile)) {
    return (
      <main data-testid="profile-loading" className="min-h-[100dvh] bg-[#020202] text-white flex items-center justify-center px-6">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-[10px] tracking-[.35em] uppercase text-white/30"
        >
          AIME · Ouverture des archives
        </motion.p>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main data-testid="profile-error" className="min-h-[100dvh] bg-[#020202] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <p className="text-[10px] tracking-[.4em] uppercase text-white/30 mb-8">Erreur</p>
          <h1 className="text-3xl font-display font-light mb-6">L'accès à cette histoire est impossible.</h1>
          <p className="text-white/40 text-sm font-light mb-12">{error instanceof Error ? error.message : "Profil introuvable"}</p>
          <Link href="/" className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors border-b border-white/10 pb-1">
            Retourner à l'accueil
          </Link>
        </div>
      </main>
    );
  }

  const displayName = isPrivatePreview ? user?.fullName || user?.firstName || profile.title : profile.title;
  const displaySubtitle = isPrivatePreview ? `Profil relié au Monde ${profile.title}` : profile.subtitle;
  const displayCity = isPrivatePreview ? undefined : profile.city;
  const profileImage = isPrivatePreview ? user?.imageUrl : undefined;
  const requestIdentityEdit = () => openUserProfile();

  return (
    <main data-testid="public-profile-page" className="min-h-[100dvh] bg-[#020202] text-white pb-40 overflow-x-hidden">
      <div className="fixed inset-0 z-0 bg-[#020202] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] to-[#020202] opacity-80" />
        <div
          className="absolute inset-0 opacity-[0.02] mix-blend-screen"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />
      </div>

      {isPrivatePreview && (
        <div className="fixed right-4 top-4 z-50 rounded-full border border-white/12 bg-black/75 px-4 py-2 text-[9px] uppercase tracking-[.18em] text-white/55 backdrop-blur-xl">
          Prévisualisation privée
        </div>
      )}

      {/* Hero Section */}
      <div className="relative z-10 pt-24 pb-12 flex flex-col items-center px-6 text-center">
        <div className="relative group w-32 h-32 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden mb-8 shadow-2xl">
          {profileImage
            ? <img data-preserve-color src={profileImage} alt={`Portrait de ${displayName}`} className="h-full w-full object-cover" />
            : <User className="w-10 h-10 text-white/20" />}
          {isPrivatePreview && <button type="button" onClick={requestIdentityEdit} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] uppercase tracking-widest text-white">{profileImage ? "Gérer mon identité" : "Ajouter une photo"}</span>
          </button>}
        </div>

        <h1 className="text-5xl md:text-7xl font-display font-light tracking-tight text-white mb-4">
          {displayName}
        </h1>

        {displaySubtitle && (
          <h2 className="text-lg md:text-xl font-light text-white/40 mb-8 max-w-2xl text-balance">
            {displaySubtitle}
          </h2>
        )}

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
          {displayCity ? (
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <MapPin className="w-3.5 h-3.5" /> {displayCity}
            </span>
          ) : isPrivatePreview ? <MissingDataHint icon={MapPin} label="Ville à relier" /> : null}

          <span className="w-1 h-1 rounded-full bg-white/10 hidden sm:block" />

          {!isPrivatePreview && profile.pivot ? (
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <CalendarDays className="w-3.5 h-3.5" /> Repère · {profile.pivot > 10000 ? format(profile.pivot, "d MMM yyyy", { locale: fr }) : profile.pivot}
            </span>
          ) : isPrivatePreview ? <MissingDataHint icon={CalendarDays} label="Anniversaire à relier" /> : null}

          {isPrivatePreview && <>
            <span className="w-1 h-1 rounded-full bg-white/10 hidden sm:block" />
            <MissingDataHint icon={Plus} label="Statut à relier" />
          </>}
        </div>
        {isPrivatePreview && sortedEvents.length > 0 && (
          <div className="mt-9 flex max-w-full items-center justify-center -space-x-2 overflow-x-auto px-4 py-2 hide-scrollbar" aria-label="Moments visuels du Profil">
            {profileImage && <span className="relative z-10 h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#020202]"><img data-preserve-color src={profileImage} alt="" className="h-full w-full object-cover" /></span>}
            {sortedEvents.slice(-7).reverse().map((event, index) => (
              <button key={event.id} type="button" onClick={() => setSelectedEvent(event)} title={event.title} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[#020202] bg-[#111] text-white shadow-xl transition hover:z-20 hover:-translate-y-1 hover:scale-110" style={{ zIndex: 9 - index }}>
                <EventIcon kind={event.kind} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timeline Section */}
      <div className="relative z-10 w-full mt-8 border-t border-white/5 pt-8">
        <div className="flex flex-col md:flex-row items-center justify-between px-6 md:px-12 gap-6 mb-12 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 bg-white/[0.02] rounded-full border border-white/5 p-1 shrink-0">
             <button onClick={() => setZoom(z => Math.max(1, z - 0.5))} className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors" aria-label="Dézoomer">
               <ZoomOut className="w-4 h-4" />
             </button>
             <div className="w-12 text-center text-[9px] uppercase tracking-widest text-white/40 font-medium">
               {Math.round(zoom * 100)}%
             </div>
             <button onClick={() => setZoom(z => Math.min(5, z + 0.5))} className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors" aria-label="Zoomer">
               <ZoomIn className="w-4 h-4" />
             </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar max-w-full pb-2 md:pb-0 w-full md:w-auto">
            {CATEGORIES.map(cat => (
               <button
                 key={cat.id}
                 onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                 className={cn(
                   "flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all shrink-0",
                   activeCategory === cat.id
                     ? "bg-white/15 border-white/30 text-white"
                     : "bg-white/[0.02] border-white/5 hover:border-white/20 text-white/40 hover:text-white"
                 )}
               >
                 <cat.icon className="w-3.5 h-3.5" />
                 <span className="text-[9px] uppercase tracking-widest">{cat.label}</span>
               </button>
            ))}
          </div>
        </div>

        <div
          ref={scrollRef}
          className="w-full overflow-x-auto hide-scrollbar cursor-grab active:cursor-grabbing border-y border-white/5 bg-[#050505]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div
            className="relative h-[440px] transition-all duration-300 ease-out"
            style={{ width: `${zoom * 100}%`, minWidth: '100%' }}
          >
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/15 shadow-[0_0_10px_rgba(255,255,255,0.1)]" />

            {REPERES.map(rep => (
              <div key={rep.label} className="absolute top-1/2" style={{ left: `${rep.left}%` }}>
                <div className="absolute left-0 top-0 w-[1px] h-6 bg-white/20" />
                <button type="button" onClick={() => setSelectedRepere(rep)} className="absolute top-8 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-2 text-[9px] uppercase tracking-[0.25em] text-white/30 transition hover:bg-white/[.06] hover:text-white">
                  {rep.label}
                </button>
              </div>
            ))}

            {filteredEvents.map((event, i) => {
              const left = getPosition(event.time);
              const yOffset = yOffsets[i % 4];
              const isTop = yOffset < 0;

              return (
                <div
                  key={event.id}
                  className="absolute top-1/2"
                  style={{ left: `${left}%` }}
                >
                   <div
                      className="absolute left-0 w-[1px] bg-white/10"
                      style={{
                         height: `${Math.abs(yOffset)}px`,
                         top: isTop ? `${yOffset}px` : `0px`,
                      }}
                   />
                   <button
                      onClick={() => setSelectedEvent(event)}
                      className="absolute group flex flex-col items-center justify-center w-14 h-14 -translate-x-1/2 -translate-y-1/2"
                      style={{ top: `${yOffset}px`, left: '0px' }}
                   >
                      <div className="w-12 h-12 rounded-full border border-white/15 bg-[#0a0a0a] flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/40 group-hover:scale-110 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                         <EventIcon kind={event.kind} />
                      </div>
                      <div className={cn(
                        "absolute flex flex-col items-center w-40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                        isTop ? "bottom-full mb-3" : "top-full mt-3"
                      )}>
                         <span className="text-[9px] uppercase tracking-widest text-white/80 text-center truncate w-full">
                           {event.title}
                         </span>
                         <span className="text-[8px] text-white/40 mt-1">
                           {format(event.time, "d MMM yyyy", { locale: fr })}
                         </span>
                      </div>
                   </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {isPrivatePreview && <nav aria-label="Centre AI plus ME" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 text-white">
        <div className="flex h-[72px] w-[320px] shrink-0 items-center justify-between rounded-full border border-white/8 bg-black/80 p-2 shadow-2xl backdrop-blur-xl sm:w-[360px]">
          <button onClick={() => window.dispatchEvent(new Event("aime:open-ai"))} className="h-14 flex-1 rounded-full text-[11px] font-medium tracking-[0.2em] text-white/50 hover:bg-white/10 hover:text-white transition-colors" aria-label="Demander à AIME">AI</button>
          <button type="button" onClick={() => setCreateOpen(true)} className="h-[56px] w-[56px] shrink-0 rounded-full bg-[conic-gradient(from_180deg,#ff5b79,#ffb44a,#f6f06a,#50e3a4,#4cc9ff,#8b7cff,#e26cff,#ff5b79)] p-[2px] transition-transform hover:scale-105" aria-label="Ajouter">
            <span className="flex h-full w-full items-center justify-center rounded-full bg-black"><Plus className="h-6 w-6 stroke-[1.5]" /></span>
          </button>
          <button onClick={() => window.dispatchEvent(new Event("aime:open-me"))} className="h-14 flex-1 rounded-full text-[11px] font-medium tracking-[0.2em] text-white/50 hover:bg-white/10 hover:text-white transition-colors" aria-label="Ouvrir mon espace">ME</button>
        </div>
      </nav>}

      <AnimatePresence>
        {selectedRepere && (
          <CenteredBlock eyebrow="Repère du Profil" title={selectedRepere.label} description={selectedRepere.description} onClose={() => setSelectedRepere(null)} leading={<selectedRepere.icon className="mt-4 h-6 w-6 shrink-0 text-white/55" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              {(selectedRepere.id === "archives" ? CATEGORIES.slice(0, 3) : selectedRepere.id === "network" ? CATEGORIES.slice(5, 6) : selectedRepere.id === "history" ? CATEGORIES.slice(3) : [{ id: "identity", label: "Naissance et identité", icon: Fingerprint }]).map(item => (
                <button key={item.id} type="button" onClick={() => { setSelectedRepere(null); setActiveCategory(item.id === "identity" ? null : item.id); }} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-5 text-left transition hover:border-white/25 hover:bg-white/[.06]">
                  <item.icon className="h-5 w-5 text-white/45" /><span className="text-xs uppercase tracking-[.16em] text-white/75">{item.label}</span>
                </button>
              ))}
            </div>
          </CenteredBlock>
        )}
        {createOpen && (
          <CenteredBlock eyebrow="Ajouter au Profil" title="Que voulez-vous relier ?" description="Chaque ajout rejoint la Timeline, le bon Repère et les Mondes autorisés après votre confirmation." onClose={() => setCreateOpen(false)}>
            <div className="grid gap-3 sm:grid-cols-2">
              {CATEGORIES.map(item => <button key={item.id} type="button" onClick={() => { setCreateOpen(false); setActiveCategory(item.id); }} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-5 text-left transition hover:border-white/25 hover:bg-white/[.06]"><item.icon className="h-5 w-5 text-white/45" /><span className="text-xs uppercase tracking-[.16em] text-white/75">{item.label}</span></button>)}
            </div>
          </CenteredBlock>
        )}
        {selectedEvent && (
          <CenteredBlock
            testId={`event-detail-${selectedEvent.id}`}
            eyebrow={format(selectedEvent.time, "d MMMM yyyy", { locale: fr })}
            title={selectedEvent.title}
            description={selectedEvent.detail}
            onClose={() => setSelectedEvent(undefined)}
            size="lg"
            leading={
               <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 mb-4 sm:mb-0 shrink-0">
                  <EventIcon kind={selectedEvent.kind} />
               </div>
            }
          >
            <div className="mt-6 space-y-8 text-white/70 font-light leading-relaxed">
               <div className="flex flex-wrap gap-x-8 gap-y-4 text-[10px] uppercase tracking-[0.2em] text-white/40 pt-6 border-t border-white/10">
                 {selectedEvent.location && (
                   <span className="flex items-center gap-2">
                     <MapPin className="w-3.5 h-3.5" />
                     {selectedEvent.location}
                   </span>
                 )}
                 {selectedEvent.durationMinutes && (
                   <span className="flex items-center gap-2">
                     <Clock3 className="w-3.5 h-3.5" />
                     {selectedEvent.durationMinutes} MIN
                   </span>
                 )}
                 {selectedEvent.kind && (
                   <span className="flex items-center gap-2">
                     · {selectedEvent.kind.replace("_", " ")}
                   </span>
                 )}
               </div>
            </div>
          </CenteredBlock>
        )}
      </AnimatePresence>
    </main>
  );
}

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock3, CalendarDays } from "lucide-react";
import { useParams, Link } from "wouter";
import { useGetPublicProfile, type PublicTimelineEvent } from "@workspace/api-client-react";
import { CenteredBlock } from "@/components/CenteredBlock";
import { cn } from "@/lib/utils";

const YEAR = 365 * 86400000;
const WEEK = 7 * 86400000;

function PublicEventCard({ event, onClick }: { event: PublicTimelineEvent, onClick: () => void }) {
  const isMajor = event.kind === "jalon" || event.kind === "evenement" || event.phase === "pendant";
  let eyebrowText = "Fragment";
  if (event.kind === "souvenir") eyebrowText = "Souvenir";
  if (event.kind === "intention") eyebrowText = "Intention";
  if (event.kind === "message") eyebrowText = "Correspondance";

  return (
    <motion.button 
      data-testid={`event-${event.id}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="group relative w-full flex flex-col items-center py-20 px-6 sm:px-12 border-t border-white/5 hover:bg-white/[0.015] transition-colors focus:outline-none"
    >
      <div className="max-w-5xl w-full flex flex-col md:flex-row gap-6 md:gap-16 items-start md:items-center">
        <div className="w-full md:w-1/3 flex flex-col md:items-end text-left md:text-right shrink-0">
           <div className="text-[9px] tracking-[0.25em] uppercase text-white/30 mb-2">
             {eyebrowText}
           </div>
           <div className="text-sm font-light text-white/50 tracking-wide">
             {format(event.time, event.phase === "pendant" ? "HH:mm" : "d MMMM yyyy", { locale: fr })}
           </div>
        </div>
        
        <div className="w-full md:w-2/3 flex flex-col text-left">
          <h3 className={cn("font-display font-light text-balance text-white group-hover:text-white/90 transition-colors",
            isMajor ? "text-3xl md:text-5xl lg:text-6xl" : "text-xl md:text-3xl"
          )}>
            {event.title}
          </h3>
          
          {event.detail && (
            <p className="mt-4 text-sm md:text-base text-white/40 font-light line-clamp-2 md:line-clamp-3 leading-relaxed max-w-2xl group-hover:text-white/60 transition-colors">
              {event.detail}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function Hero({ profile }: { profile: { title: string; subtitle?: string; city?: string; timeline: PublicTimelineEvent[] } }) {
  return (
    <header className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[#020202]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] to-[#020202] opacity-80" />
        <div 
          className="absolute inset-0 opacity-[0.03] mix-blend-screen pointer-events-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center max-w-4xl"
      >
        <p className="text-[10px] tracking-[0.4em] uppercase text-white/30 mb-10">
          AIME · MÉMOIRE
        </p>
        
        <h1 data-testid="profile-title" className="text-6xl md:text-8xl lg:text-9xl font-display font-light tracking-tight text-white mb-6">
          {profile.title}
        </h1>
        
        {profile.subtitle && (
          <h2 data-testid="profile-subtitle" className="text-xl md:text-2xl font-light text-white/50 mb-12">
            {profile.subtitle}
          </h2>
        )}
        
        <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] uppercase tracking-[0.25em] text-white/40 mt-12">
           {profile.city && (
             <span className="flex items-center gap-2">
               <MapPin className="w-3 h-3" />
                {profile.city}
             </span>
          )}
           {profile.timeline.length > 0 && (
            <span className="flex items-center gap-2">
              <CalendarDays className="w-3 h-3" />
               {format(profile.timeline[0].time, "yyyy", { locale: fr })} — aujourd’hui
            </span>
          )}
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 96 }}
        transition={{ delay: 1, duration: 1.5, ease: "easeOut" }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-gradient-to-b from-white/20 to-transparent origin-top"
      />
    </header>
  );
}

export function PublicProfilePage() {
  const params = useParams<{ projectId: string }>();
  const { data: profile, isLoading, error } = useGetPublicProfile(params.projectId || "", {
    query: { retry: false },
  });
  const [selectedEvent, setSelectedEvent] = useState<PublicTimelineEvent | undefined>();
  const now = Date.now();
  const sections = useMemo(() => {
    const values = [
      { id: "archives", label: "Archives", description: "Les traces lointaines, les origines et les souvenirs préservés.", events: [] as PublicTimelineEvent[] },
      { id: "passe", label: "Passé", description: "Les moments qui ont construit cette histoire.", events: [] as PublicTimelineEvent[] },
      { id: "maintenant", label: "Maintenant", description: "Ce qui est vivant, proche et en mouvement.", events: [] as PublicTimelineEvent[] },
      { id: "avenir", label: "À venir", description: "Les intentions, rendez-vous et futurs encore ouverts.", events: [] as PublicTimelineEvent[] },
    ];
    for (const event of [...(profile?.timeline ?? [])].sort((a, b) => a.time - b.time)) {
      if (event.time < now - 5 * YEAR) values[0].events.push(event);
      else if (event.time < now - WEEK) values[1].events.push(event);
      else if (event.time <= now + 30 * 86400000) values[2].events.push(event);
      else values[3].events.push(event);
    }
    return values;
  }, [profile?.timeline, now]);

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

  if (isLoading) {
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

  return (
    <main data-testid="public-profile-page" className="min-h-[100dvh] bg-[#020202] text-white selection:bg-white/20 selection:text-white">
      <Hero profile={profile} />

      <div className="sticky top-0 z-30 border-y border-white/10 bg-black/80 px-4 py-3 backdrop-blur-xl">
        <nav aria-label="Traverser la Timeline" className="mx-auto flex max-w-3xl justify-between gap-1">
          {sections.map(section => <button
            data-testid={`button-jump-${section.id}`}
            key={section.id}
            type="button"
            onClick={() => document.getElementById(`timeline-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="min-w-0 flex-1 py-2 text-[9px] uppercase tracking-[.16em] text-white/45 transition hover:text-white"
          >
            <span className="block truncate">{section.label}</span>
            <span className="mt-1 block text-[8px] tracking-normal text-white/20">{section.events.length}</span>
          </button>)}
        </nav>
      </div>

      <section className="w-full pb-32">
        {profile.timeline.length === 0 ? (
          <div data-testid="profile-empty" className="py-32 text-center text-[10px] uppercase tracking-[0.3em] text-white/30">
            Aucun fragment de vie publié.
          </div>
        ) : (
          sections.map(section => <section
            id={`timeline-${section.id}`}
            data-testid={`section-${section.id}`}
            key={section.id}
            className="scroll-mt-20 border-t border-white/5"
          >
            <div className="mx-auto max-w-5xl px-6 pb-16 pt-28 text-center">
              <p className="text-[9px] uppercase tracking-[.35em] text-white/25">{section.id === "maintenant" ? "Aujourd’hui" : "Dans le temps"}</p>
              <h2 className="mt-5 font-display text-4xl font-light md:text-6xl">{section.label}</h2>
              <p className="mx-auto mt-5 max-w-xl text-sm font-light leading-relaxed text-white/35">{section.description}</p>
            </div>
            {section.events.length > 0
              ? section.events.map(item => <PublicEventCard key={item.id} event={item} onClick={() => setSelectedEvent(item)} />)
              : <p className="pb-24 text-center text-[9px] uppercase tracking-[.25em] text-white/20">Rien de public pour le moment</p>}
          </section>)
        )}
      </section>

      <AnimatePresence>
        {selectedEvent && (
          <CenteredBlock
            testId={`event-detail-${selectedEvent.id}`}
            eyebrow={format(selectedEvent.time, "d MMMM yyyy", { locale: fr })}
            title={selectedEvent.title}
            description={selectedEvent.detail}
            onClose={() => setSelectedEvent(undefined)}
            size="lg"
          >
            <div className="mt-8 space-y-8 text-white/70 font-light leading-relaxed">
               <div className="flex flex-wrap gap-x-8 gap-y-4 text-[10px] uppercase tracking-[0.2em] text-white/30 pt-6 border-t border-white/10">
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

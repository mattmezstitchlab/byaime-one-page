import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Play, MapPin, Lock, Globe2, Users, Users2, ArrowRight, ArrowLeft, Wallet, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicTimelineEvent } from "@workspace/api-client-react";
import type { TimelineRelation, TimelineVisibility } from "@/lib/types";
import { AIME_VISUALS, getAssetUrl } from "@/lib/assets";

export type ProfileTimelineEvent = Omit<PublicTimelineEvent, "visibility"> & {
  visibility: TimelineVisibility;
  relations?: TimelineRelation[];
};

type FeedEvent = {
  id: string;
  time: number;
  category: "image" | "son" | "finance" | "monde";
  title: string;
  subtitle?: string;
  location?: string;
  visibility: string;
  universe: string;
  relations: Array<{ kind: string; label: string; icon: any }>;
  raw: ProfileTimelineEvent;
};

/*
 * Les visuels du fil de profil viennent du manifeste : remplacer une photo dans
 * `public/images/wedding` met à jour l'accueil, la Timeline et le profil d'un coup.
 */
const visualSources = AIME_VISUALS.timelineAmbientImages;

const SlideBackground = ({ event, isActive }: { event: FeedEvent, isActive: boolean }) => {
  const seed = event.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = seed % 360;
  
  if (event.category === "image") {
    return (
      <div className="absolute inset-0 z-0">
        <img
          src={getAssetUrl(visualSources[seed % visualSources.length])}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
        <motion.div 
          animate={isActive ? { scale: [1.1, 1], opacity: [0.3, 0.6] } : { scale: 1.1, opacity: 0 }}
          transition={{ duration: 8, ease: "easeOut" }}
          className="absolute inset-0 opacity-50 mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 50% 50%, hsl(${hue}, 40%, 40%), transparent 70%)`
          }}
        />
        <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      </div>
    );
  }

  if (event.category === "son") {
    return (
      <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
         <div className="absolute top-1/2 left-0 right-0 h-64 -translate-y-1/2 flex items-center justify-center gap-1 opacity-20">
            {Array.from({ length: 40 }).map((_, i) => {
               const h = 20 + Math.sin(seed + i) * 40 + Math.cos(seed * 2 + i * 0.5) * 30;
               return (
                 <motion.div 
                   key={i}
                   animate={isActive ? { height: [Math.max(10, Math.abs(h)) + '%', Math.max(10, Math.abs(h)) * 1.5 + '%', Math.max(10, Math.abs(h)) + '%'] } : {}}
                   transition={{ duration: 1.5 + (i%3)*0.5, repeat: Infinity }}
                   className="w-1 bg-white rounded-full"
                 />
               );
            })}
         </div>
      </div>
    );
  }

  if (event.category === "finance") {
    return (
      <div className="absolute inset-0 z-0 bg-[#050505] overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <motion.div 
          animate={isActive ? { opacity: [0, 0.1, 0.05], x: [20, 0] } : { opacity: 0 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute -right-20 top-20 text-[30vw] font-display font-bold text-white/5 leading-none select-none pointer-events-none"
        >
          {event.subtitle?.replace(/[^0-9]/g, '').slice(0, 4) || "0000"}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 bg-black">
      <motion.div 
         animate={isActive ? { rotate: [0, 1, 0], scale: [1, 1.02, 1] } : {}}
         transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
         className="absolute inset-0 opacity-30"
         style={{
           background: `conic-gradient(from 90deg at 50% 50%, hsl(${hue}, 30%, 15%), black, hsl(${hue}, 30%, 10%), black)`
         }}
      />
    </div>
  );
};

const CinematicSlide = ({ event, isActive, onSelect }: { event: FeedEvent, isActive: boolean, onSelect: () => void }) => {
  return (
    <button type="button" className="relative w-full h-full flex flex-col justify-end p-8 md:p-16 overflow-hidden bg-black text-left text-white group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white" onClick={onSelect} aria-label={`Ouvrir le Moment ${event.title}`}>
       <SlideBackground event={event} isActive={isActive} />

       <div className="relative z-10 max-w-4xl transition-transform duration-500 group-hover:-translate-y-2">
         <div className="flex items-center gap-3 mb-4 text-[10px] md:text-xs font-medium tracking-[0.2em] uppercase text-white/60">
            <span className="flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5"/> {event.universe}</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>{format(event.time, "d MMM yyyy", { locale: fr })}</span>
            {event.location && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> {event.location}</span>
              </>
            )}
         </div>

         <motion.h2 
           initial={{ opacity: 0, y: 20 }}
           animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
           transition={{ duration: 0.8, delay: 0.2 }}
           className="text-4xl md:text-6xl lg:text-7xl font-display font-light tracking-tight mb-4"
         >
           {event.title}
         </motion.h2>

         {event.subtitle && (
           <motion.p 
             initial={{ opacity: 0, y: 20 }}
             animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
             transition={{ duration: 0.8, delay: 0.3 }}
             className="text-lg md:text-2xl text-white/60 font-light mb-8 max-w-2xl line-clamp-3"
           >
             {event.subtitle}
           </motion.p>
         )}

         <motion.div 
           initial={{ opacity: 0 }}
           animate={isActive ? { opacity: 1 } : { opacity: 0 }}
           transition={{ duration: 0.8, delay: 0.4 }}
           className="flex flex-wrap items-center gap-3 mt-8"
         >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
               {event.visibility === 'prive' ? <Lock className="w-3.5 h-3.5 text-white/60" /> : 
                event.visibility === 'equipe' ? <Users className="w-3.5 h-3.5 text-white/60" /> : 
                <Globe2 className="w-3.5 h-3.5 text-white/60" />}
               <span className="text-[10px] uppercase tracking-widest text-white/80">
                 {event.visibility === "prive" ? "Privé" : event.visibility === "equipe" ? "Réseau" : "Public"}
               </span>
            </div>

            {event.relations.map((rel, idx) => (
               <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                  <rel.icon className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-[10px] uppercase tracking-widest text-white/80 truncate max-w-[150px]">
                    {rel.label}
                  </span>
               </div>
            ))}
         </motion.div>
       </div>
       
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
         <div className="w-20 h-20 rounded-full border border-white/20 bg-black/20 backdrop-blur-md flex items-center justify-center text-white">
           <ExternalLink className="w-6 h-6" />
         </div>
       </div>
    </button>
  )
}

export function ProfileFeed({ 
  events, 
  project, 
  onSelect 
}: { 
  events: ProfileTimelineEvent[],
  project: any, 
  onSelect: (e: ProfileTimelineEvent) => void 
}) {
  const prefersReducedMotion = useReducedMotion();
  const allEvents = useMemo(() => {
    return events.map(e => {
      let category: FeedEvent["category"] = "monde";
      const relationKinds = new Set(e.relations?.map(relation => relation.kind) ?? []);
      if (e.kind === "souvenir" || relationKinds.has("memory") || e.universe === "Images") category = "image";
      else if (relationKinds.has("music") || e.universe === "Sons") category = "son";
      else if (e.kind === "paiement" || e.kind === "facture" || e.kind === "devis") category = "finance";

      const relations: any[] = [];
      if (e.relations && project) {
        e.relations.forEach((r) => {
          let label = r.id;
          let icon = Users2;
          if (r.kind === 'guest') {
            const guest = project.guests?.find((g: any) => g.id === r.id);
            if (guest) label = guest.name;
            icon = Users;
          } else if (r.kind === 'provider') {
            const provider = project.providers?.find((p: any) => p.id === r.id);
            if (provider) label = provider.name || provider.role;
            icon = Wallet;
          }
          relations.push({ kind: r.kind, label, icon });
        });
      }

      return {
        id: e.id,
        time: e.time,
        category,
        title: e.title,
        subtitle: e.detail,
        location: e.location,
        visibility: e.visibility || "prive",
        universe: e.universe || project?.universe || "Monde",
        relations,
        raw: e
      };
    });
  }, [events, project]);

  const [filter, setFilter] = useState<"tout" | "image" | "son" | "finance" | "monde">("tout");
  const [mode, setMode] = useState<"maintenant" | "replay">("maintenant");
  const [currentIndex, setCurrentIndex] = useState(0);

  const filteredEvents = useMemo(() => {
    if (filter === "tout") return allEvents;
    return allEvents.filter(e => e.category === filter);
  }, [allEvents, filter]);
  const currentEvent = filteredEvents[currentIndex] ?? filteredEvents[0];

  useEffect(() => {
    if (currentIndex >= filteredEvents.length) {
      setCurrentIndex(Math.max(0, filteredEvents.length - 1));
    }
  }, [filteredEvents.length, currentIndex]);

  useEffect(() => {
    if (mode !== "replay" || filteredEvents.length === 0 || prefersReducedMotion) return;
    const timer = setInterval(() => {
      setCurrentIndex(idx => (idx + 1) % filteredEvents.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [mode, filteredEvents.length, prefersReducedMotion]);

  const setMaintenant = () => {
    setMode("maintenant");
    if (filteredEvents.length === 0) return;
    const now = Date.now();
    let closestIdx = 0;
    let minDiff = Infinity;
    filteredEvents.forEach((e, idx) => {
      const diff = Math.abs(e.time - now);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    setCurrentIndex(closestIdx);
  };

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] bg-black flex flex-col rounded-[2.5rem] overflow-hidden border border-foreground/10 shadow-2xl">
      <AnimatePresence mode="wait">
        {currentEvent ? (
           <motion.div 
             key={currentEvent.id}
             initial={{ opacity: 0, filter: "blur(10px)" }}
             animate={{ opacity: 1, filter: "blur(0px)" }}
             exit={{ opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: "easeInOut" }}
             className="absolute inset-0"
           >
             <CinematicSlide 
               event={currentEvent}
               isActive={true} 
               onSelect={() => onSelect(currentEvent.raw)}
             />
           </motion.div>
        ) : (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 text-sm">
             <Globe2 className="w-12 h-12 text-white/20 mb-4" />
             Aucun événement dans cette vue.
           </div>
        )}
      </AnimatePresence>

      <div className="absolute top-0 left-0 w-full p-6 md:p-8 z-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pointer-events-none">
         <div className="flex flex-wrap gap-2 pointer-events-auto">
           {[
             { id: "tout", label: "Tout" },
             { id: "image", label: "Images" },
             { id: "son", label: "Sons" },
             { id: "finance", label: "Finance" },
             { id: "monde", label: "Mondes" },
           ].map(f => (
             <button 
               key={f.id}
               onClick={() => { setFilter(f.id as any); setCurrentIndex(0); }}
               className={cn(
                 "px-4 py-2 rounded-full text-[9px] md:text-[10px] uppercase tracking-widest transition-colors backdrop-blur-md border",
                 filter === f.id ? "bg-white text-black font-semibold border-white" : "bg-black/20 text-white hover:bg-white/10 border-white/10"
               )}
             >
               {f.label}
             </button>
           ))}
         </div>

         <div className="flex gap-1 bg-black/40 p-1.5 rounded-full backdrop-blur-xl border border-white/10 pointer-events-auto shrink-0">
            <button 
              onClick={setMaintenant}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full text-[9px] md:text-[10px] uppercase tracking-widest transition-colors",
                mode === "maintenant" ? "bg-white text-black font-semibold" : "text-white/60 hover:text-white"
              )}
            >
              Maintenant
            </button>
            <button 
              onClick={() => setMode("replay")}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full text-[9px] md:text-[10px] uppercase tracking-widest transition-colors",
                mode === "replay" ? "bg-white text-black font-semibold" : "text-white/60 hover:text-white"
              )}
            >
              <Play className="w-3 h-3" /> Replay
            </button>
         </div>
      </div>

      {filteredEvents.length > 1 && (
        <div className="absolute bottom-8 right-8 z-20 flex gap-3 pointer-events-auto">
           <button 
             onClick={(e) => {
               e.stopPropagation();
               setMode("maintenant");
               setCurrentIndex(i => (i - 1 + filteredEvents.length) % filteredEvents.length);
             }}
              aria-label="Moment précédent"
             className="w-14 h-14 rounded-full bg-black/20 backdrop-blur-xl flex items-center justify-center text-white hover:bg-white/10 transition-colors border border-white/10 hover:scale-105"
           >
             <ArrowLeft className="w-5 h-5" />
           </button>
           <button 
             onClick={(e) => {
               e.stopPropagation();
               setMode("maintenant");
               setCurrentIndex(i => (i + 1) % filteredEvents.length);
             }}
              aria-label="Moment suivant"
             className="w-14 h-14 rounded-full bg-black/20 backdrop-blur-xl flex items-center justify-center text-white hover:bg-white/10 transition-colors border border-white/10 hover:scale-105"
           >
             <ArrowRight className="w-5 h-5" />
           </button>
        </div>
      )}

      {mode === "replay" && filteredEvents.length > 0 && (
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/10 z-20">
          <motion.div 
            key={currentIndex} 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 4.5, ease: "linear" }}
            className="h-full bg-white"
          />
        </div>
      )}
    </div>
  );
}

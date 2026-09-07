import { useEffect, useMemo, useState } from 'react';
import { useProject } from '@/store/project-store';
import {
  evaluateCapability,
  mapLegacyProjectRole,
  type LegacyProjectRole,
  type MapSubject,
  type WorldAccessRole,
} from '@workspace/aime-domain';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, MapPin, Calendar, Map as MapIcon, Users, Navigation, ExternalLink, Lock, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from 'framer-motion';
import { buildMapSubjects, mapSubjectKey } from '@/lib/universal/map-subjects';
import { CenteredBlock } from '@/components/CenteredBlock';
import { UniversalMap } from '@/components/UniversalMap';

function toWorldRole(role: string): WorldAccessRole {
  const legacyRoles: LegacyProjectRole[] = ['owner', 'planner', 'family', 'viewer'];
  return legacyRoles.includes(role as LegacyProjectRole)
    ? mapLegacyProjectRole(role as LegacyProjectRole)
    : 'viewer';
}

export function NetworkPage() {
  const { project, hasProject, isHydrated, currentRole } = useProject();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isHydrated && !hasProject) {
      setLocation('/user-portal');
    }
  }, [hasProject, isHydrated, setLocation]);

  const subjects = useMemo(
    () => (project ? buildMapSubjects(project) : []),
    [project],
  );

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const shouldReduceMotion = useReducedMotion();

  const mappedSubjects = subjects.filter(s => s.latitude !== undefined && s.longitude !== undefined);
  const unmappedSubjects = subjects.filter(s => s.latitude === undefined || s.longitude === undefined);

  const activeSubject = subjects.find(s => mapSubjectKey(s) === activeId);
  const worldRole = toWorldRole(currentRole);

  if (!isHydrated || !project) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-black text-white">
        <div className="text-center" role="status">
          <p className="text-[10px] uppercase tracking-[.28em] text-white/40">Réseau AIME</p>
          <p className="mt-3 text-sm text-white/70">Ouverture du Monde…</p>
        </div>
      </main>
    );
  }

  return (
    <div data-testid="network-page" className="flex h-[100dvh] w-full overflow-hidden bg-black text-white selection:bg-white/20 font-sans">
      <div className="sr-only" aria-live="polite">
        {activeSubject ? `Sélectionné: ${activeSubject.label}` : 'Aucune sélection'}
      </div>
      
      {/* Noise overlay */}
      <div className="pointer-events-none fixed inset-0 z-[100] opacity-[0.03] mix-blend-screen" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      <UniversalMap
        subjects={mappedSubjects}
        activeId={activeId}
        focusId={activeId}
        reduceMotion={shouldReduceMotion}
        onReady={() => { setMapReady(true); setMapError(false); }}
        onError={() => setMapError(true)}
        onSelect={id => { setActiveId(id); setMobileView('map'); }}
      />
      {!mapReady && !mapError && (
        <div className="absolute inset-0 z-[1] grid place-items-center bg-[#fbf8f4] text-black/50" role="status">
          <div className="text-center">
            <MapIcon className="mx-auto mb-3 h-8 w-8 opacity-20" />
            <p className="text-sm">La carte se dessine…</p>
          </div>
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 z-[1] grid place-items-center bg-[#fbf8f4] text-black/50" role="alert">
          <div className="text-center">
            <MapIcon className="mx-auto mb-3 h-8 w-8 opacity-20" />
            <p className="text-sm">Carte indisponible</p>
            <p className="mt-1 text-xs text-white/35">La liste reste entièrement accessible.</p>
          </div>
        </div>
      )}

      <div className="relative z-10 flex h-full w-full pointer-events-none">
        
        {/* Mobile View Toggle */}
        <div className="md:hidden absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center rounded-full border border-white/10 bg-black/60 backdrop-blur-xl p-1 shadow-xl">
           <button aria-pressed={mobileView === 'list'} onClick={() => setMobileView('list')} className={cn("px-4 py-1.5 rounded-full text-[11px] font-medium transition-colors", mobileView === 'list' ? "bg-white text-black" : "text-white/60 hover:text-white")}>
             Liste
           </button>
           <button aria-pressed={mobileView === 'map'} onClick={() => setMobileView('map')} className={cn("px-4 py-1.5 rounded-full text-[11px] font-medium transition-colors", mobileView === 'map' ? "bg-white text-black" : "text-white/60 hover:text-white")}>
             Carte
           </button>
        </div>

        {/* Sidebar */}
        <div className={cn(
          "pointer-events-auto absolute inset-y-0 left-0 z-40 flex w-full max-w-[400px] flex-col border-r border-white/10 bg-black/90 md:bg-black/80 backdrop-blur-2xl transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) md:relative md:translate-x-0",
          mobileView === 'list' ? "translate-x-0" : "-translate-x-full"
        )}>
          
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 mt-14 md:mt-0">
             <div>
               <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="AIME" className="mb-3 h-9 w-auto rounded-xl" />
               <h1 className="font-display text-xl font-medium tracking-tight">Réseau AIME</h1>
               <p className="text-[10px] text-white/50 tracking-widest uppercase mt-1">Carte des lieux et des personnes</p>
             </div>
             <Link href="/user-portal" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 hover:bg-white/10 hover:text-white text-white/70 transition-colors">
               <ArrowLeft className="h-4 w-4" />
             </Link>
          </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-10 hide-scrollbar" role="listbox" aria-label="Sujets du Monde">
             
             <div className="space-y-4">
               <h2 className="text-[10px] font-semibold tracking-widest text-white/40 uppercase">Sur la carte</h2>
               <div className="space-y-2">
                 {mappedSubjects.map(subject => (
                    <SubjectItem 
                       key={mapSubjectKey(subject)}
                      subject={subject} 
                       isActive={activeId === mapSubjectKey(subject)}
                       isHovered={hoverId === mapSubjectKey(subject)}
                      onHover={setHoverId}
                      onClick={() => {
                         setActiveId(mapSubjectKey(subject));
                          if (subject.longitude !== undefined && subject.latitude !== undefined) {
                          setMobileView('map');
                        }
                      }}
                    />
                 ))}
                  {mappedSubjects.length === 0 && <p className="text-[13px] text-white/30 italic">Aucun élément trouvé sur la carte</p>}
               </div>
             </div>

             <div className="space-y-4">
               <h2 className="text-[10px] font-semibold tracking-widest text-white/40 uppercase flex items-center justify-between">
                 Hors carte
                 <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px]">{unmappedSubjects.length}</span>
               </h2>
               <div className="space-y-2">
                 {unmappedSubjects.map(subject => (
                    <SubjectItem 
                       key={mapSubjectKey(subject)}
                      subject={subject} 
                       isActive={activeId === mapSubjectKey(subject)}
                       isHovered={hoverId === mapSubjectKey(subject)}
                      onHover={setHoverId}
                      onClick={() => {
                         setActiveId(mapSubjectKey(subject));
                        setMobileView('map');
                      }}
                    />
                 ))}
               </div>
             </div>

          </div>
        </div>

      </div>
      {activeSubject && (
        <CenteredBlock
          eyebrow={subjectKindLabel(activeSubject)}
          title={activeSubject.label}
          description={activeSubject.summary}
          onClose={() => setActiveId(null)}
          leading={<SubjectIcon subject={activeSubject} />}
        >
          <ContextCard subject={activeSubject} worldRole={worldRole} />
        </CenteredBlock>
      )}
    </div>
  );
}

function SubjectItem({ subject, isActive, isHovered, onHover, onClick }: { 
  subject: MapSubject; isActive: boolean; isHovered: boolean; onHover: (id: string | null) => void; onClick: () => void;
}) {
  const Icon = subject.ref.kind === 'world' ? Navigation : subject.ref.kind === 'place' ? Landmark : subject.ref.kind === 'moment' ? Calendar : Users;
  const key = mapSubjectKey(subject);
  
  return (
    <button
      role="option"
      aria-selected={isActive}
      onMouseEnter={() => onHover(key)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        "w-full flex items-start gap-3 rounded-2xl p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-white border",
        isActive 
          ? "bg-white/10 border-white/20 shadow-sm" 
          : isHovered 
            ? "bg-white/5 border-white/10" 
            : "bg-transparent border-transparent hover:bg-white/5"
      )}
    >
       <div className={cn(
         "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
         isActive ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/70"
       )}>
         <Icon className="h-4 w-4" />
       </div>
       <div className="flex-1 min-w-0">
         <div className={cn("truncate text-[13px] font-medium transition-colors", isActive ? "text-white" : "text-white/90")}>{subject.label}</div>
         {subject.summary && <div className="truncate text-xs text-white/50">{subject.summary}</div>}
         {subject.city && (
           <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/40">
             <MapPin className="h-3 w-3" />
             <span className="truncate">{subject.city}</span>
           </div>
         )}
       </div>
    </button>
  );
}

function SubjectIcon({ subject }: { subject: MapSubject }) {
  const Icon = subject.ref.kind === 'world' ? Navigation : subject.ref.kind === 'place' ? Landmark : subject.ref.kind === 'moment' ? Calendar : Users;
  return <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black"><Icon className="h-5 w-5" /></span>;
}

function subjectKindLabel(subject: MapSubject) {
  return subject.ref.kind === 'world' ? 'Monde' : subject.ref.kind === 'place' ? 'Lieu' : subject.ref.kind === 'moment' ? 'Moment' : 'Personne ou organisation';
}

function ContextCard({ subject, worldRole }: { subject: MapSubject; worldRole: WorldAccessRole }) {
  const decision = evaluateCapability(subject.primaryCapability ?? 'world.view', {
    authenticated: true,
    worldRole,
    worldPublic: subject.locationLevel === 'public',
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2 text-[11px] font-medium">
         {subject.city && (
           <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/70">
             <MapPin className="h-3 w-3" /> {subject.city}
           </span>
         )}
         <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/70">
           <Lock className="h-3 w-3" /> 
           {subject.locationLevel === 'public' ? 'Public' : 'Accès projet'}
         </span>
      </div>

      <div className="mt-1 flex gap-2">
          {decision.allowed && (
           <Link href="/user-portal" className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white text-black px-4 py-3 text-xs font-semibold hover:bg-white/90 transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> Voir le Monde
           </Link>
         )}
          {!decision.allowed && <p className="text-xs text-white/50">{decision.reason}</p>}
      </div>
    </div>
  );
}

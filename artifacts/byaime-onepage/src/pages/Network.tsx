import { useEffect, useMemo, useState } from 'react';
import { useProject } from '@/store/project-store';
import { useUser } from '@clerk/react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Users, ArrowUpRight, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CenteredBlock } from '@/components/CenteredBlock';
import {
  UniversalPersonGrid,
} from '@/components/UniversalPersonGrid';
import { buildUniversalPeople, type PersonNode } from '@/lib/universal/people-grid';

export function NetworkPage() {
  const { project, hasProject, isHydrated, canEdit } = useProject();
  const { user } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isHydrated && !hasProject) {
      setLocation('/user-portal');
    }
  }, [hasProject, isHydrated, setLocation]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'grid' | 'list'>('grid');

  const people: PersonNode[] = useMemo(() => {
    if (!project) return [];
    return buildUniversalPeople(project, {
      name: user?.fullName || user?.firstName,
      imageUrl: user?.imageUrl,
    });
  }, [project, user]);

  const activePerson = people.find(p => p.id === activeId);

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
        {activePerson ? `Sélectionné: ${activePerson.name}` : 'Aucune sélection'}
      </div>
      
      {/* Noise overlay */}
      <div className="pointer-events-none fixed inset-0 z-[100] opacity-[0.03] mix-blend-screen" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      <div className="absolute inset-y-0 right-0 left-0 z-0 md:left-[400px]">
        <UniversalPersonGrid
          people={people}
          activeId={activeId}
          allowContact={canEdit}
          onSelect={(id) => {
            setActiveId(id);
            setMobileView('grid');
          }}
        />
      </div>

      <div className="relative z-10 flex h-full w-full pointer-events-none">
        
        {/* Mobile View Toggle */}
        <div className="md:hidden absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center rounded-full border border-white/10 bg-black/60 backdrop-blur-xl p-1 shadow-xl">
           <button aria-pressed={mobileView === 'list'} onClick={() => setMobileView('list')} className={cn("px-4 py-1.5 rounded-full text-[11px] font-medium transition-colors", mobileView === 'list' ? "bg-white text-black" : "text-white/60 hover:text-white")}>
             Liste
           </button>
           <button aria-pressed={mobileView === 'grid'} onClick={() => setMobileView('grid')} className={cn("px-4 py-1.5 rounded-full text-[11px] font-medium transition-colors", mobileView === 'grid' ? "bg-white text-black" : "text-white/60 hover:text-white")}>
             Grille
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
               <p className="text-[10px] text-white/50 tracking-widest uppercase mt-1">Personnes et professionnels</p>
             </div>
             <Link href="/user-portal" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 hover:bg-white/10 hover:text-white text-white/70 transition-colors">
               <ArrowLeft className="h-4 w-4" />
             </Link>
          </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-10 hide-scrollbar" role="listbox" aria-label="Personnes du Monde">
             
             <div className="space-y-4">
               <h2 className="text-[10px] font-semibold tracking-widest text-white/40 uppercase">Dans le réseau</h2>
               <div className="space-y-2">
                  {people.map((person) => (
                    <PersonItem
                      key={person.id}
                      person={person}
                      isActive={activeId === person.id}
                      isHovered={hoverId === person.id}
                      onHover={setHoverId}
                      onClick={() => {
                        setActiveId(person.id);
                        setMobileView('grid');
                      }}
                    />
                 ))}
                  {people.length === 0 && <p className="text-[13px] text-white/30 italic">Aucune personne trouvée dans le réseau</p>}
               </div>
             </div>
          </div>
        </div>

      </div>
      {activePerson && (
        <CenteredBlock
          eyebrow={activePerson.type === 'me' ? 'Profil' : activePerson.type === 'guest' ? 'Invité' : 'Professionnel'}
          title={activePerson.name}
          description={activePerson.role}
          onClose={() => setActiveId(null)}
          leading={<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black"><Users className="h-5 w-5" /></span>}
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2 text-[11px] font-medium">
               {activePerson.status && (
                 <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/70">
                   Statut: {activePerson.status}
                 </span>
               )}
                {canEdit && activePerson.contact && (
                 <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/70">
                   Contact: {activePerson.contact}
                 </span>
               )}
                <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/70">
                  Profondeur Z{activePerson.zLayer}
                </span>
            </div>

            <div className="mt-1 flex gap-2">
              {canEdit && activePerson.contact && (
                <a
                  href={contactHref(activePerson.contact)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" /> Contacter
                </a>
              )}
              <Link href={activePerson.type === 'me' ? '/profile' : '/user-portal'} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white text-black px-4 py-3 text-xs font-semibold hover:bg-white/90 transition-colors">
                 <Eye className="h-3.5 w-3.5" /> {activePerson.type === 'me' ? 'Voir mon Profil' : 'Gérer dans le Monde'}
              </Link>
            </div>
          </div>
        </CenteredBlock>
      )}
    </div>
  );
}

function contactHref(contact: string) {
  return contact.includes('@') ? `mailto:${contact}` : `tel:${contact.replace(/\s/g, '')}`;
}

function PersonItem({ person, isActive, isHovered, onHover, onClick }: {
  person: PersonNode; isActive: boolean; isHovered: boolean; onHover: (id: string | null) => void; onClick: () => void;
}) {
  return (
    <button
      role="option"
      aria-selected={isActive}
      onMouseEnter={() => onHover(person.id)}
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
         <Users className="h-4 w-4" />
       </div>
       <div className="flex-1 min-w-0">
         <div className={cn("truncate text-[13px] font-medium transition-colors", isActive ? "text-white" : "text-white/90")}>{person.name}</div>
         <div className="truncate text-xs text-white/50">{person.role}</div>
       </div>
    </button>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { User, Eye, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
const GRID_SIZE = 280;
function squareRingPosition(index, startRing) {
    let ring = startRing;
    let offset = index;
    while (offset >= ring * 8) {
        offset -= ring * 8;
        ring += 1;
    }
    const sideLength = ring * 2;
    if (offset < sideLength)
        return { x: -ring + offset, y: -ring, ring };
    if (offset < sideLength * 2)
        return { x: ring, y: -ring + (offset - sideLength), ring };
    if (offset < sideLength * 3)
        return { x: ring - (offset - sideLength * 2), y: ring, ring };
    return { x: -ring, y: ring - (offset - sideLength * 3), ring };
}
function nextRingAfter(count, startRing) {
    let ring = startRing;
    let remaining = count;
    while (remaining > ring * 8) {
        remaining -= ring * 8;
        ring += 1;
    }
    return count > 0 ? ring + 1 : startRing;
}
export function UniversalPersonGrid({ people, activeId, allowContact = false, onSelect, }) {
    const containerRef = useRef(null);
    const reduceMotion = useReducedMotion();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const scale = useMotionValue(1);
    const [currentScale, setCurrentScale] = useState(1);
    const [depth, setDepth] = useState(2);
    useEffect(() => {
        return scale.on('change', v => setCurrentScale(v));
    }, [scale]);
    const { nodes, edges } = useMemo(() => {
        const resultNodes = [];
        const resultEdges = [];
        const me = people.find(p => p.type === 'me');
        if (me) {
            resultNodes.push({
                id: me.id,
                x: 0,
                y: 0,
                isCenter: true,
                person: me
            });
        }
        const guests = people
            .filter((person) => person.type === 'guest')
            .sort((a, b) => a.id.localeCompare(b.id));
        const providers = people
            .filter((person) => person.type === 'provider')
            .sort((a, b) => a.id.localeCompare(b.id));
        const providerStartRing = Math.max(2, nextRingAfter(guests.length, 1));
        const positionedPeople = [
            ...guests.map((person, index) => ({ person, ...squareRingPosition(index, 1) })),
            ...providers.map((person, index) => ({ person, ...squareRingPosition(index, providerStartRing) })),
        ];
        positionedPeople.forEach(({ person, x: gridX, y: gridY }) => {
            const pos = { x: gridX * GRID_SIZE, y: gridY * GRID_SIZE };
            resultNodes.push({
                id: person.id,
                x: pos.x,
                y: pos.y,
                person
            });
            resultEdges.push({
                id: `edge-center-${person.id}`,
                source: 'me:center',
                target: person.id
            });
        });
        return { nodes: resultNodes, edges: resultEdges };
    }, [people]);
    useEffect(() => {
        const container = containerRef.current;
        if (!container)
            return;
        const handleWheel = (e) => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                setDepth((current) => Math.min(2, Math.max(0, current + (e.deltaY > 0 ? 1 : -1))));
            }
            else {
                const current = scale.get();
                const delta = e.deltaY * -0.0015;
                scale.set(Math.min(Math.max(0.15, current + delta), 3));
            }
        };
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [x, y, scale]);
    const showAvatarsOnly = currentScale <= 0.4;
    const visibleNodes = nodes.filter((node) => (node.person?.zLayer ?? 0) <= depth);
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
    const visibleEdges = edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
    const selectPerson = (id) => {
        onSelect?.(id);
    };
    const focusNode = (node) => {
        const current = scale.get();
        x.set(-node.x * current);
        y.set(-node.y * current);
    };
    const resetView = () => {
        x.set(0);
        y.set(0);
        scale.set(1);
    };
    const handleKeyboardNavigation = (event) => {
        const panStep = 64;
        if (event.key === 'ArrowLeft')
            x.set(x.get() + panStep);
        else if (event.key === 'ArrowRight')
            x.set(x.get() - panStep);
        else if (event.key === 'ArrowUp')
            y.set(y.get() + panStep);
        else if (event.key === 'ArrowDown')
            y.set(y.get() - panStep);
        else if (event.key === '+' || event.key === '=')
            scale.set(Math.min(3, scale.get() + 0.2));
        else if (event.key === '-')
            scale.set(Math.max(0.15, scale.get() - 0.2));
        else if (event.key === 'Home')
            resetView();
        else if (event.key === 'PageUp')
            setDepth((current) => Math.max(0, current - 1));
        else if (event.key === 'PageDown')
            setDepth((current) => Math.min(2, current + 1));
        else
            return;
        event.preventDefault();
    };
    return (<div ref={containerRef} className="relative h-full w-full cursor-grab overflow-hidden bg-background active:cursor-grabbing" aria-label="Grille universelle des personnes" aria-describedby="universal-grid-help" onKeyDown={handleKeyboardNavigation} role="region" tabIndex={0}>
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px',
        }}/>
      <motion.div drag dragElastic={0.1} style={{ x, y, scale }} className="absolute top-1/2 left-1/2 w-0 h-0">
        <svg className="absolute overflow-visible pointer-events-none" style={{ top: 0, left: 0 }}>
          {visibleEdges.map(edge => {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);
            if (!source || !target)
                return null;
            return (<line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="4 4"/>);
        })}
        </svg>

        {visibleNodes.map(node => {
            const directHref = allowContact && node.person?.contact
                ? node.person.contact.includes('@') ? `mailto:${node.person.contact}` : `tel:${node.person.contact.replace(/\s/g, '')}`
                : null;
            return (<motion.div key={node.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ x: node.x, y: node.y }} whileHover={reduceMotion ? undefined : { scale: 1.05 }} onClick={(e) => {
                    e.stopPropagation();
                    selectPerson(node.id);
                }} onPointerDown={(event) => event.stopPropagation()}>
              {node.isCenter ? (<button type="button" className="group relative flex flex-col items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label={`Ouvrir le Profil de ${node.person?.name ?? 'la personne au point zéro'}`} onFocus={() => focusNode(node)}>
                  <div className="w-24 h-24 rounded-full border border-foreground/20 bg-foreground/5 backdrop-blur-xl flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)] overflow-hidden">
                    {node.person?.imageUrl ? (<img src={node.person.imageUrl} alt={node.person.name} className="w-full h-full object-cover"/>) : (<User className="w-10 h-10 text-foreground/80"/>)}
                  </div>
                  {!showAvatarsOnly && (<div className="absolute top-full mt-4 whitespace-nowrap text-center">
                      <p className="text-xs font-display tracking-widest uppercase text-foreground">{node.person?.name}</p>
                      <p className="mt-1 text-[8px] uppercase tracking-[.2em] text-foreground/35">X 0 · Y 0 · Z 0</p>
                    </div>)}
                </button>) : (<div className={cn("relative p-5 rounded-2xl border bg-background/60 backdrop-blur-md transition-all group focus:outline-none focus:ring-2 focus:ring-white pointer-events-auto cursor-pointer", showAvatarsOnly ? "w-16 h-16 !p-0 rounded-full flex items-center justify-center" : "w-48", activeId === node.id ? "border-foreground/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "border-foreground/10 hover:border-foreground/20 hover:bg-foreground/5 focus:border-foreground/40")} tabIndex={0} onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            selectPerson(node.id);
                        }
                    }} onFocus={() => focusNode(node)} aria-label={node.person?.name}>
                  <div className={cn("flex items-start gap-3", showAvatarsOnly && "items-center justify-center w-full h-full")}>
                    <div className={cn("rounded-full border border-foreground/10 bg-foreground/5 flex items-center justify-center shrink-0", showAvatarsOnly ? "w-12 h-12" : "w-10 h-10")}>
                      <User className={cn("text-foreground/50 group-hover:text-foreground/80 transition-colors", showAvatarsOnly ? "w-6 h-6" : "w-5 h-5")}/>
                    </div>
                    {!showAvatarsOnly && (<div className="min-w-0">
                        <h3 className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors leading-tight line-clamp-2">{node.person?.name}</h3>
                        <p className="text-[10px] uppercase tracking-wider text-foreground/40 mt-1 line-clamp-1">{node.person?.role}</p>
                        <p className="mt-1 text-[8px] uppercase tracking-[.18em] text-foreground/25">
                          X {node.x / GRID_SIZE} · Y {node.y / GRID_SIZE} · Z {node.person?.zLayer}
                        </p>
                      </div>)}
                  </div>
                  
                  {!showAvatarsOnly && (<div className="mt-4 pt-4 border-t border-foreground/10 flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      {directHref ? (<a href={directHref} onClick={e => e.stopPropagation()} className="flex-1 py-1.5 rounded bg-foreground/10 hover:bg-foreground/20 text-[10px] uppercase tracking-widest text-foreground/70 transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-foreground/50">
                          <ArrowUpRight className="w-3 h-3"/> Contacter
                        </a>) : (<button onClick={(e) => {
                                e.stopPropagation();
                                selectPerson(node.id);
                            }} className="flex-1 py-1.5 rounded bg-foreground/10 hover:bg-foreground/20 text-[10px] uppercase tracking-widest text-foreground/70 transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-foreground/50">
                          <Eye className="w-3 h-3"/> Inspecter
                        </button>)}
                    </div>)}
                </div>)}
            </motion.div>);
        })}
      </motion.div>

      <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-10">
        <button onClick={() => scale.set(Math.min(3, scale.get() + 0.2))} className="w-10 h-10 rounded-full border border-foreground/10 bg-background/60 backdrop-blur-md flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition-colors text-lg" aria-label="Zoomer">
          +
        </button>
        <button onClick={() => scale.set(Math.max(0.15, scale.get() - 0.2))} className="w-10 h-10 rounded-full border border-foreground/10 bg-background/60 backdrop-blur-md flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition-colors text-lg" aria-label="Dézoomer">
          -
        </button>
        <button onClick={resetView} className="w-10 h-10 rounded-full border border-foreground/10 bg-background/60 backdrop-blur-md flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition-colors mt-2" aria-label="Recentrer">
          <User className="w-4 h-4"/>
        </button>
      </div>
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-foreground/10 bg-background/80 p-1 backdrop-blur-xl sm:right-6 sm:top-6">
        {[
            { value: 0, label: 'Z0', title: 'Moi' },
            { value: 1, label: 'Z1', title: 'Invités' },
            { value: 2, label: 'Z2', title: 'Professionnels' },
        ].map((layer) => (<button key={layer.value} type="button" aria-label={`Afficher jusqu’à la profondeur ${layer.label} · ${layer.title}`} aria-pressed={depth === layer.value} onClick={() => setDepth(layer.value)} className={cn("rounded-full px-3 py-2 text-[9px] uppercase tracking-[.16em] transition", depth === layer.value ? "bg-foreground text-background" : "text-foreground/55 hover:bg-foreground/[.08] hover:text-foreground")}>
            {layer.label}
          </button>))}
      </div>
      <div className="pointer-events-none absolute bottom-8 left-6 z-10 hidden sm:block">
        <p id="universal-grid-help" className="text-[8px] uppercase tracking-[.24em] text-foreground/[.42]">Glisser ou flèches pour parcourir · molette ou +/− pour zoomer</p>
        <p className="mt-1 text-[8px] uppercase tracking-[.24em] text-foreground/[.32]">Ctrl + molette ou Page haut/bas pour traverser Z</p>
      </div>
    </div>);
}
//# sourceMappingURL=UniversalPersonGrid.jsx.map
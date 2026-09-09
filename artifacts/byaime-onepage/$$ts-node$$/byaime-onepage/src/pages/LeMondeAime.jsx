import { useState, useMemo, useEffect } from "react";
import { format, differenceInMinutes, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import { AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Activity, Clock, Settings, Search, MapPin, Database, Shield, Zap, Pause, Play, Eye, GitCommitHorizontal, SkipBack, SkipForward, ZoomIn, ZoomOut, List } from "lucide-react";
import { DIMENSIONS } from "@/lib/world-model/types";
import { DemoProvider, CITIES, CONTINENTS, COUNTRIES } from "@/lib/world-model/demo-provider";
import { WorldEngine } from "@/lib/world-model/engine";
import { WorldMap } from "@/components/WorldMap";
import { CenteredBlock } from "@/components/CenteredBlock";
import { cn } from "@/lib/utils";
const TEMPORAL_LABELS = {
    maintenant: "Maintenant (1h)",
    aujourdhui: "Aujourd'hui",
    semaine: "Cette semaine",
    annee: "Cette année",
    histoire: "Période chargée · 2 ans"
};
export function LeMondeAimePage() {
    const [activeDimensions, setActiveDimensions] = useState(new Set(DIMENSIONS));
    const [selectedEventId, setSelectedEventId] = useState(null);
    // Realtime & Scopes
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [isPlaying, setIsPlaying] = useState(true);
    const [spatialScope, setSpatialScope] = useState("monde");
    const [temporalScope, setTemporalScope] = useState("histoire");
    // Timeline Zoom Window (in ms)
    const [timelineSpan, setTimelineSpan] = useState(86400000); // 1 day default window
    // Modals
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [syncsOpen, setSyncsOpen] = useState(false);
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [eventsListOpen, setEventsListOpen] = useState(false);
    // Engine & Data
    const engine = useMemo(() => {
        const eng = new WorldEngine();
        eng.register(new DemoProvider());
        return eng;
    }, []);
    const [historicalEvents, setHistoricalEvents] = useState([]);
    const [liveEvents, setLiveEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const allEvents = useMemo(() => [...historicalEvents, ...liveEvents].sort((a, b) => a.timestamp - b.timestamp), [historicalEvents, liveEvents]);
    useEffect(() => {
        let active = true;
        setIsLoading(true);
        // Fetch a wide 2-year range for the demo
        engine.fetchEvents([Date.now() - 86400000 * 365, Date.now() + 86400000 * 365])
            .then(events => {
            if (active) {
                setHistoricalEvents(events);
                setIsLoading(false);
            }
        })
            .catch(() => {
            if (active) {
                setError("Impossible de charger la partition mondiale.");
                setIsLoading(false);
            }
        });
        return () => {
            active = false;
        };
    }, [engine]);
    const providerFilter = useMemo(() => {
        const filter = { dimension: [...activeDimensions] };
        if (CONTINENTS.includes(spatialScope))
            filter.continent = spatialScope;
        else if (COUNTRIES.includes(spatialScope))
            filter.country = spatialScope;
        else if (spatialScope !== "monde")
            filter.location = spatialScope;
        return filter;
    }, [activeDimensions, spatialScope]);
    const subscriptionRangeKey = temporalScope === "maintenant"
        ? Math.floor(currentTime / 60000)
        : temporalScope === "aujourdhui"
            ? format(currentTime, "yyyy-MM-dd")
            : temporalScope === "semaine"
                ? format(startOfWeek(currentTime, { weekStartsOn: 1 }), "yyyy-MM-dd")
                : temporalScope === "annee"
                    ? format(currentTime, "yyyy")
                    : "histoire";
    useEffect(() => {
        let range;
        if (temporalScope === "maintenant") {
            range = [currentTime - 3600000, currentTime + 60000];
        }
        else if (temporalScope === "aujourdhui") {
            range = [startOfDay(currentTime).getTime(), endOfDay(currentTime).getTime()];
        }
        else if (temporalScope === "semaine") {
            range = [
                startOfWeek(currentTime, { weekStartsOn: 1 }).getTime(),
                endOfWeek(currentTime, { weekStartsOn: 1 }).getTime(),
            ];
        }
        else if (temporalScope === "annee") {
            range = [startOfYear(currentTime).getTime(), endOfYear(currentTime).getTime()];
        }
        else {
            range = [currentTime - 86400000 * 365, currentTime + 86400000 * 365];
        }
        return engine.subscribe(event => {
            setLiveEvents(previous => [...previous.slice(-499), event]);
        }, { range, filter: providerFilter });
    }, [engine, providerFilter, subscriptionRangeKey, temporalScope]);
    // Apply filters
    const filteredEvents = useMemo(() => {
        let list = allEvents.filter(e => activeDimensions.has(e.dimension));
        if (spatialScope !== "monde") {
            list = list.filter(e => e.continent === spatialScope || e.country === spatialScope || e.location === spatialScope);
        }
        let startTime = 0;
        let endTime = Infinity;
        if (temporalScope === "maintenant") {
            startTime = currentTime - 3600000;
            endTime = currentTime;
        }
        else if (temporalScope === "aujourdhui") {
            startTime = startOfDay(currentTime).getTime();
            endTime = endOfDay(currentTime).getTime();
        }
        else if (temporalScope === "semaine") {
            startTime = startOfWeek(currentTime, { weekStartsOn: 1 }).getTime();
            endTime = endOfWeek(currentTime, { weekStartsOn: 1 }).getTime();
        }
        else if (temporalScope === "annee") {
            startTime = startOfYear(currentTime).getTime();
            endTime = endOfYear(currentTime).getTime();
        }
        list = list.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
        return list;
    }, [allEvents, activeDimensions, spatialScope, temporalScope, currentTime]);
    const selectedEvent = useMemo(() => {
        return allEvents.find(e => e.id === selectedEventId);
    }, [allEvents, selectedEventId]);
    const searchResults = useMemo(() => {
        if (!searchQuery.trim())
            return [];
        const q = searchQuery.toLowerCase();
        return filteredEvents.filter(e => e.title.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q) ||
            (e.location && e.location.toLowerCase().includes(q))).slice(0, 15);
    }, [searchQuery, filteredEvents]);
    // Derive Synchs (sliding window clusters)
    const synchronisations = useMemo(() => {
        const clusters = [];
        const byCategory = filteredEvents.reduce((groups, event) => {
            const categoryEvents = groups.get(event.category) ?? [];
            categoryEvents.push(event);
            groups.set(event.category, categoryEvents);
            return groups;
        }, new Map());
        for (const [category, categoryEvents] of byCategory) {
            const sorted = categoryEvents.sort((a, b) => a.timestamp - b.timestamp);
            let currentCluster = [];
            for (const event of sorted) {
                if (currentCluster.length === 0 || event.timestamp - currentCluster[0].timestamp <= 300000) {
                    currentCluster.push(event);
                }
                else {
                    const locations = new Set(currentCluster.map(item => item.location).filter(Boolean));
                    if (currentCluster.length >= 2 && locations.size >= 2) {
                        clusters.push({ category, events: [...currentCluster] });
                    }
                    currentCluster = [event];
                }
            }
            const locations = new Set(currentCluster.map(item => item.location).filter(Boolean));
            if (locations.size >= 2) {
                clusters.push({ category, events: [...currentCluster] });
            }
        }
        return clusters
            .sort((a, b) => b.events[0].timestamp - a.events[0].timestamp)
            .slice(0, 8);
    }, [filteredEvents]);
    // Derive Summary
    const currentSummary = useMemo(() => {
        const active = filteredEvents.filter(event => event.timestamp <= currentTime && event.timestamp >= currentTime - 86400000);
        const byDim = active.reduce((acc, e) => {
            acc[e.dimension] = (acc[e.dimension] || 0) + 1;
            return acc;
        }, {});
        return { count: active.length, byDim };
    }, [filteredEvents, currentTime]);
    const toggleDimension = (dim) => {
        setActiveDimensions(prev => {
            const next = new Set(prev);
            if (next.has(dim))
                next.delete(dim);
            else
                next.add(dim);
            return next;
        });
    };
    useEffect(() => {
        if (!isPlaying)
            return;
        const interval = setInterval(() => {
            setCurrentTime(time => time + 1000);
        }, 1000);
        return () => clearInterval(interval);
    }, [isPlaying]);
    const { minTime, maxTime } = useMemo(() => {
        if (allEvents.length === 0) {
            return {
                minTime: currentTime - 86400000,
                maxTime: currentTime + 86400000,
            };
        }
        return allEvents.reduce((bounds, event) => ({
            minTime: Math.min(bounds.minTime, event.timestamp),
            maxTime: Math.max(bounds.maxTime, event.timestamp),
        }), { minTime: Infinity, maxTime: -Infinity });
    }, [allEvents, currentTime]);
    useEffect(() => {
        setCurrentTime(time => Math.min(maxTime, Math.max(minTime, time)));
    }, [minTime, maxTime]);
    return (<main className="aime-cinematic-surface fixed inset-0 flex flex-col overflow-hidden bg-[#020202] font-sans text-foreground">
      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 z-50 flex flex-col sm:flex-row items-center justify-between px-6 py-5 bg-gradient-to-b from-[#020202] to-transparent pointer-events-none gap-4">
        <div className="flex items-center gap-6 pointer-events-auto">
          <Link href="/" className="text-sm font-medium tracking-[.32em] text-foreground/80 hover:text-foreground transition-colors">
            AIME
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10" aria-label="Avertissement de simulation">
            <Activity className="w-3 h-3 text-yellow-500"/>
            <span className="text-[9px] uppercase tracking-widest text-yellow-500 font-semibold">
              Démonstration · Données Simulées
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-center pointer-events-auto text-center order-first sm:order-none">
          <h1 className="text-lg md:text-xl font-display font-light tracking-[.15em] uppercase text-foreground/90">
            Le Cœur Battant du Monde
          </h1>
          <p className="text-[9px] uppercase tracking-[.2em] text-foreground/40 mt-1">
            Association LE MONDE AIME • Marraine : Sandrine Sarroche
          </p>
        </div>

        <div className="flex items-center gap-4 pointer-events-auto">
          <button onClick={() => setEventsListOpen(true)} className="text-foreground/40 hover:text-foreground transition-colors" aria-label="Ouvrir la liste des événements">
            <List className="w-4 h-4"/>
          </button>
          <button onClick={() => setSearchOpen(true)} className="text-foreground/40 hover:text-foreground transition-colors" aria-label="Rechercher">
            <Search className="w-4 h-4"/>
          </button>
          
          <div className="hidden lg:flex items-center gap-2 text-[10px] uppercase tracking-widest text-foreground/50 border border-foreground/10 rounded-full px-4 py-1.5 bg-foreground/5">
            <Clock className="w-3 h-3"/>
            {format(currentTime, "d MMM yyyy • HH:mm:ss", { locale: fr })}
          </div>
          
          <button onClick={() => setSettingsOpen(true)} className="text-foreground/40 hover:text-foreground transition-colors" aria-label="Paramètres spatiaux et temporels">
            <Settings className="w-4 h-4"/>
          </button>
        </div>
      </header>

      {/* TOP-LEFT REALTIME INDICATORS */}
      <div className="absolute top-[168px] sm:top-24 left-6 z-40 flex flex-col gap-2 pointer-events-auto">
        <button onClick={() => setSyncsOpen(true)} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-foreground/50 hover:text-foreground transition-colors px-3 py-1.5 bg-background/40 backdrop-blur-md rounded-full border border-foreground/10">
          <GitCommitHorizontal className="w-3 h-3"/>
          Synchronisations ({synchronisations.length})
        </button>
        <button onClick={() => setSummaryOpen(true)} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-foreground/50 hover:text-foreground transition-colors px-3 py-1.5 bg-background/40 backdrop-blur-md rounded-full border border-foreground/10">
          <Eye className="w-3 h-3"/>
          En ce moment ({currentSummary.count})
        </button>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 relative flex mt-[230px] sm:mt-16">
        {/* SIDEBAR / TOP SCROLL BAR */}
        <aside className="absolute top-0 sm:top-1/2 left-0 sm:left-6 w-full sm:w-auto sm:-translate-y-1/2 z-40 flex sm:flex-col gap-2 pointer-events-auto overflow-x-auto px-6 sm:px-0 hide-scrollbar pb-4 sm:pb-0">
          {DIMENSIONS.map(dim => {
            const isActive = activeDimensions.has(dim);
            return (<button key={dim} onClick={() => toggleDimension(dim)} className={cn("flex items-center gap-3 px-4 py-2.5 rounded-full border backdrop-blur-md transition-all text-left shrink-0", isActive
                    ? "bg-foreground/10 border-foreground/20 text-foreground shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                    : "bg-background/40 border-foreground/5 text-foreground/40 hover:text-foreground hover:border-foreground/15")}>
                <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]", isActive ? "bg-white" : "bg-foreground/20")}/>
                <span className="text-[10px] uppercase tracking-widest font-medium">
                  {dim}
                </span>
              </button>);
        })}
        </aside>

        {/* MAP */}
        <div className="flex-1 relative">
          {isLoading ? (<div className="absolute inset-0 flex items-center justify-center bg-[#020202]">
              <p className="text-[10px] tracking-[.35em] uppercase text-foreground/30 animate-pulse">Initialisation du World Model...</p>
            </div>) : error ? (<div className="absolute inset-0 flex items-center justify-center bg-[#020202]">
              <p className="text-[10px] tracking-[.35em] uppercase text-red-500/70">{error}</p>
            </div>) : (<WorldMap events={filteredEvents} activeId={selectedEventId} onSelect={(id) => setSelectedEventId(id)}/>)}
        </div>
      </div>

      {/* BOTTOM TIMELINE */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-4 pointer-events-auto">
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-background/60 backdrop-blur-xl border border-foreground/10 rounded-[2rem] p-4 shadow-2xl">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? "Mettre en pause" : "Jouer"} className="flex items-center justify-center w-10 h-10 rounded-full border border-foreground/20 bg-foreground/5 text-foreground hover:bg-foreground/10 transition-colors shrink-0">
              {isPlaying ? <Pause className="w-4 h-4 fill-current"/> : <Play className="w-4 h-4 fill-current ml-0.5"/>}
            </button>
            <button onClick={() => setCurrentTime(t => t - timelineSpan / 4)} aria-label="Reculer dans le temps" className="flex items-center justify-center w-8 h-8 rounded-full border border-foreground/10 text-foreground/50 hover:text-foreground transition-colors shrink-0">
              <SkipBack className="w-3 h-3"/>
            </button>
            <button onClick={() => setCurrentTime(t => t + timelineSpan / 4)} aria-label="Avancer dans le temps" className="flex items-center justify-center w-8 h-8 rounded-full border border-foreground/10 text-foreground/50 hover:text-foreground transition-colors shrink-0">
              <SkipForward className="w-3 h-3"/>
            </button>
          </div>
          
          <div className="flex-1 h-12 relative flex items-center w-full group">
            <input type="range" aria-label="Curseur temporel" min={minTime} max={maxTime} value={currentTime} onChange={(e) => {
            setIsPlaying(false);
            setCurrentTime(Number(e.target.value));
        }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
            <div className="absolute left-0 right-0 h-[1px] bg-foreground/10"/>
            
            {filteredEvents.slice(0, 300).map(e => {
            const left = 50 + ((e.timestamp - currentTime) / timelineSpan) * 50;
            if (left < 0 || left > 100)
                return null;
            return (<button key={e.id} aria-label={`Ouvrir l'événement: ${e.title}`} onClick={() => setSelectedEventId(e.id)} className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full bg-foreground/30 hover:bg-white transition-colors z-20" style={{ left: `${left}%` }}/>);
        })}
            
            <div className="absolute left-1/2 -translate-x-1/2 w-[1px] h-full bg-foreground/30"/>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1">
              <button onClick={() => setTimelineSpan(s => Math.min(s * 2, 86400000 * 365))} aria-label="Dézoomer la timeline" className="p-1.5 text-foreground/40 hover:text-foreground"><ZoomOut className="w-3 h-3"/></button>
              <button onClick={() => setTimelineSpan(s => Math.max(s / 2, 3600000))} aria-label="Zoomer la timeline" className="p-1.5 text-foreground/40 hover:text-foreground"><ZoomIn className="w-3 h-3"/></button>
            </div>
            <button onClick={() => {
            setCurrentTime(Date.now());
            setIsPlaying(true);
        }} className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full border border-foreground/20 bg-foreground/5 text-foreground text-[10px] tracking-widest uppercase hover:bg-foreground/10 transition-colors">
              MAINTENANT
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {selectedEvent && (<CenteredBlock eyebrow="Événement mondial simulé" title={selectedEvent.title} description={selectedEvent.description} onClose={() => setSelectedEventId(null)} size="lg" leading={<div className="w-12 h-12 rounded-full border border-foreground/20 bg-foreground/5 flex items-center justify-center shrink-0"><Zap className="w-5 h-5 text-foreground/70"/></div>}>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-6 border-t border-foreground/10">
              <div className="space-y-1">
                <p className="text-[9px] uppercase tracking-widest text-foreground/40 flex items-center gap-2"><MapPin className="w-3 h-3"/> Lieu</p>
                <p className="text-sm text-foreground/90">{selectedEvent.location}, {selectedEvent.country}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[9px] uppercase tracking-widest text-foreground/40 flex items-center gap-2"><Database className="w-3 h-3"/> Catégorie</p>
                <p className="text-sm text-foreground/90">{selectedEvent.category}</p>
              </div>

              {selectedEvent.value !== undefined && (<div className="space-y-1">
                  <p className="text-[9px] uppercase tracking-widest text-foreground/40 flex items-center gap-2"><Activity className="w-3 h-3"/> Valeur</p>
                  <p className="text-sm text-foreground/90 font-mono">
                    {selectedEvent.value.toLocaleString("fr-FR")} {selectedEvent.unit}
                  </p>
                </div>)}

              <div className="space-y-1">
                <p className="text-[9px] uppercase tracking-widest text-foreground/40 flex items-center gap-2"><Shield className="w-3 h-3"/> Source & Fiabilité</p>
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-foreground/90">{selectedEvent.source}</p>
                  <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-[9px] uppercase tracking-widest text-yellow-500">
                    Mode simulation
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-foreground/10 flex flex-col sm:flex-row gap-8">
              {selectedEvent.relations && selectedEvent.relations.length > 0 && (<div className="flex-1">
                  <p className="text-[9px] uppercase tracking-widest text-foreground/40 mb-4">Relations du World Model</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.relations.map(rel => (<span key={rel.id} className="px-3 py-1.5 rounded-full border border-foreground/10 bg-foreground/5 text-[10px] uppercase tracking-widest text-foreground/70">
                        {rel.label}
                      </span>))}
                  </div>
                </div>)}
              
              <div className="sm:w-1/3">
                <p className="text-[9px] uppercase tracking-widest text-foreground/40 mb-4">Horodatage</p>
                <p className="text-xs text-foreground/60">
                  Temps simulé :<br />
                  {format(selectedEvent.timestamp, "d MMM yyyy à HH:mm:ss", { locale: fr })}
                </p>
              </div>
            </div>
          </CenteredBlock>)}

        {searchOpen && (<CenteredBlock eyebrow="Recherche" title="Explorer la partition" onClose={() => setSearchOpen(false)}>
            <input autoFocus type="text" placeholder="Chercher un événement, un lieu, une catégorie..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-background/50 border border-foreground/10 rounded-xl px-5 py-4 text-foreground text-lg font-light focus:outline-none focus:border-foreground/30"/>
            <div className="mt-6 flex flex-col gap-2">
              {searchResults.length > 0 ? searchResults.map(e => (<button key={e.id} onClick={() => { setSelectedEventId(e.id); setSearchOpen(false); }} className="flex flex-col text-left px-5 py-3 rounded-xl border border-foreground/5 bg-foreground/[0.02] hover:bg-foreground/[0.06] hover:border-foreground/15 transition-colors">
                  <span className="text-sm font-medium text-foreground">{e.title}</span>
                  <span className="text-xs text-foreground/50">{e.location} • {format(e.timestamp, "d MMM yyyy", { locale: fr })}</span>
                </button>)) : searchQuery.trim() ? (<p className="text-foreground/40 text-sm py-4">Aucun événement simulé trouvé.</p>) : null}
            </div>
          </CenteredBlock>)}

        {eventsListOpen && (<CenteredBlock eyebrow="Index" title="Liste des Événements Simulés" description="Tous les événements du filtre actuel" onClose={() => setEventsListOpen(false)}>
            <div className="flex flex-col gap-2">
              {filteredEvents.length === 0 ? <p className="text-foreground/40 text-sm">Aucun événement dans le scope actuel.</p> : null}
              {filteredEvents.map(e => (<button key={e.id} onClick={() => { setSelectedEventId(e.id); setEventsListOpen(false); }} className="flex flex-col text-left px-5 py-3 rounded-xl border border-foreground/5 bg-foreground/[0.02] hover:bg-foreground/[0.06] hover:border-foreground/15 transition-colors">
                  <span className="text-sm font-medium text-foreground">{e.title}</span>
                  <span className="text-xs text-foreground/50">{e.location} • {format(e.timestamp, "d MMM yyyy", { locale: fr })}</span>
                </button>))}
            </div>
          </CenteredBlock>)}

        {settingsOpen && (<CenteredBlock eyebrow="Configuration" title="Filtres Spatiaux et Temporels" onClose={() => setSettingsOpen(false)}>
            <div className="grid sm:grid-cols-2 gap-10">
              <div className="space-y-5">
                <p className="text-[10px] uppercase tracking-widest text-foreground/50 border-b border-foreground/10 pb-2">Scope Spatial</p>
                <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto hide-scrollbar pr-2">
                  <button onClick={() => setSpatialScope("monde")} className={cn("text-left px-4 py-3 rounded-xl border text-sm transition-colors", spatialScope === "monde" ? "bg-foreground/10 border-foreground/30 text-foreground" : "bg-background/30 border-foreground/5 text-foreground/60 hover:text-foreground")}>
                    Monde Entier
                  </button>
                  <p className="text-[9px] uppercase tracking-widest text-foreground/30 mt-2">Continents</p>
                  {CONTINENTS.map(c => (<button key={c} onClick={() => setSpatialScope(c)} className={cn("text-left px-4 py-3 rounded-xl border text-sm transition-colors", spatialScope === c ? "bg-foreground/10 border-foreground/30 text-foreground" : "bg-background/30 border-foreground/5 text-foreground/60 hover:text-foreground")}>
                      {c}
                    </button>))}
                  <p className="text-[9px] uppercase tracking-widest text-foreground/30 mt-2">Pays</p>
                  {COUNTRIES.map(c => (<button key={c} onClick={() => setSpatialScope(c)} className={cn("text-left px-4 py-3 rounded-xl border text-sm transition-colors", spatialScope === c ? "bg-foreground/10 border-foreground/30 text-foreground" : "bg-background/30 border-foreground/5 text-foreground/60 hover:text-foreground")}>
                      {c}
                    </button>))}
                  <p className="text-[9px] uppercase tracking-widest text-foreground/30 mt-2">Villes Simulées</p>
                  {CITIES.map(c => (<button key={c.name} onClick={() => setSpatialScope(c.name)} className={cn("text-left px-4 py-3 rounded-xl border text-sm transition-colors", spatialScope === c.name ? "bg-foreground/10 border-foreground/30 text-foreground" : "bg-background/30 border-foreground/5 text-foreground/60 hover:text-foreground")}>
                      {c.name}
                    </button>))}
                </div>
              </div>
              <div className="space-y-5">
                <p className="text-[10px] uppercase tracking-widest text-foreground/50 border-b border-foreground/10 pb-2">Scope Temporel</p>
                <div className="flex flex-col gap-2">
                  {Object.entries(TEMPORAL_LABELS).map(([key, label]) => (<button key={key} onClick={() => setTemporalScope(key)} className={cn("text-left px-4 py-3 rounded-xl border text-sm transition-colors", temporalScope === key ? "bg-foreground/10 border-foreground/30 text-foreground" : "bg-background/30 border-foreground/5 text-foreground/60 hover:text-foreground")}>
                      {label}
                    </button>))}
                </div>
              </div>
            </div>
          </CenteredBlock>)}

        {syncsOpen && (<CenteredBlock eyebrow="Analyse Temporelle" title="Synchronisations Détectées" description="Grappes d'événements de même nature se produisant dans un intervalle de 5 minutes sur des lieux distincts." onClose={() => setSyncsOpen(false)}>
            <div className="flex flex-col gap-4">
              {synchronisations.length === 0 ? <p className="text-foreground/50 text-sm">Aucune synchronisation dans le scope actuel.</p> : null}
              {synchronisations.map((sync, idx) => (<div key={idx} className="bg-foreground/5 border border-foreground/10 rounded-xl p-5">
                  <p className="text-[10px] uppercase tracking-widest text-foreground/50 mb-3">{sync.category} (Cluster de {sync.events.length})</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {sync.events.map(e => (<button key={e.id} onClick={() => { setSelectedEventId(e.id); setSyncsOpen(false); }} className="text-left bg-background/40 border border-foreground/5 p-3 rounded-lg hover:bg-foreground/10 transition-colors">
                        <p className="text-sm text-foreground">{e.title}</p>
                        <p className="text-xs text-foreground/40 mt-1">{e.location} • Diff: {Math.abs(differenceInMinutes(e.timestamp, sync.events[0].timestamp))} min</p>
                      </button>))}
                  </div>
                </div>))}
            </div>
          </CenteredBlock>)}

        {summaryOpen && (<CenteredBlock eyebrow="Volume" title="En ce moment (24h)" description="Activité simulée observée dans le périmètre spatial et dimensionnel actuel." onClose={() => setSummaryOpen(false)}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(currentSummary.byDim).map(([dim, count]) => (<div key={dim} className="bg-foreground/5 border border-foreground/10 rounded-xl p-5 flex flex-col justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-foreground/50 mb-3">{dim}</p>
                  <p className="text-3xl font-display font-light text-foreground">{count}</p>
                </div>))}
            </div>
          </CenteredBlock>)}
      </AnimatePresence>
    </main>);
}
//# sourceMappingURL=LeMondeAime.jsx.map
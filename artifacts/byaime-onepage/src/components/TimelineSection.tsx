import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Calendar, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/use-app-store';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function TimelineSection() {
  const { timelineEvents, addTimelineEvent, removeTimelineEvent, selectedUniverse } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventYear, setNewEventYear] = useState(new Date().getFullYear().toString());

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle) return;
    
    addTimelineEvent({
      title: newEventTitle,
      year: parseInt(newEventYear) || new Date().getFullYear(),
      universe: selectedUniverse || 'Général'
    });
    
    setNewEventTitle('');
    setIsAdding(false);
  };

  const sortedEvents = [...timelineEvents].sort((a, b) => a.year - b.year);

  return (
    <section id="timeline" className="relative w-full overflow-hidden border-t border-border bg-card pb-48 pt-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-24 text-center relative z-10">
          <h2 className="text-[10px] font-medium tracking-[0.3em] text-foreground/40 uppercase mb-4">
            Ligne de temps
          </h2>
          <h3 className="text-3xl md:text-5xl font-display font-light text-foreground text-balance">
            Votre calendrier,<br />prêt à être rempli.
          </h3>
        </div>

        {/* Timeline Visual */}
        <div className="relative mt-32 pb-32">
          {/* Main axis line */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-y-1/2" />
          
          <div className="relative flex items-center justify-center min-h-[300px] w-full max-w-5xl mx-auto">
            {sortedEvents.map((event, index) => {
              const isTop = index % 2 === 0;
              const isToday = event.year === new Date().getFullYear() && index === 0;
              
              return (
                <motion.div 
                  key={event.id}
                  initial={{ opacity: 0, y: isTop ? -20 : 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative flex flex-col items-center group flex-1"
                >
                  {/* Stem */}
                  <div className={cn(
                    "absolute left-1/2 -translate-x-1/2 w-[1px] bg-foreground/10 transition-all duration-500 group-hover:bg-foreground/40",
                    isTop ? "bottom-[calc(50%+4px)] h-24" : "top-[calc(50%+4px)] h-24"
                  )} />
                  
                  {/* Node */}
                  <div className={cn(
                    "w-2 h-2 rounded-full z-10 ring-4 transition-all duration-300 group-hover:scale-150",
                    isToday ? "bg-[#e53935] ring-[#e53935]/20 shadow-[0_0_20px_rgba(229,57,53,0.5)]" : "bg-white ring-foreground/10 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                  )} />
                  
                  {/* Event Content */}
                  <div className={cn(
                    "absolute left-1/2 -translate-x-1/2 w-56 text-center transition-all duration-300",
                    isTop ? "bottom-[calc(50%+110px)] group-hover:-translate-y-2" : "top-[calc(50%+110px)] group-hover:translate-y-2"
                  )}>
                    <div className="text-[10px] text-foreground/40 font-mono tracking-widest mb-2 flex items-center justify-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {event.year}
                    </div>
                    <div className="text-sm text-foreground font-medium mb-1 px-2">{event.title}</div>
                    <div className="text-[10px] text-foreground/30 uppercase tracking-[0.2em] flex items-center justify-center gap-1 mt-2">
                      <MapPin className="w-3 h-3" />
                      {event.universe}
                    </div>
                    
                    <button 
                      onClick={() => removeTimelineEvent(event.id)}
                      className="absolute -top-2 -right-2 p-1.5 rounded-full bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity text-foreground/40 hover:text-foreground hover:bg-foreground/10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {/* Add Node Button */}
            <motion.div className="relative flex flex-col items-center flex-1 justify-center h-full">
              <button 
                onClick={() => setIsAdding(true)}
                className="w-12 h-12 rounded-full border border-foreground/20 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 hover:bg-white hover:text-black hover:scale-110 transition-all duration-300 group"
              >
                <Plus className="w-5 h-5 opacity-70 group-hover:opacity-100" />
              </button>
              
              {sortedEvents.length === 0 && (
                <div className="absolute top-[calc(50%+40px)] text-xs text-foreground/40 tracking-widest uppercase">
                  Commencer
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Add Event Form Overlay */}
        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-[#111] border border-foreground/10 rounded-[2rem] p-10 max-w-md w-full relative shadow-2xl"
              >
                <button 
                  onClick={() => setIsAdding(false)}
                  className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-foreground/5 text-foreground/50 hover:text-foreground hover:bg-foreground/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <h4 className="text-2xl font-display text-foreground mb-8 font-light">Ajouter un jalon</h4>
                
                <form onSubmit={handleAdd} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-foreground/40 uppercase tracking-widest font-medium ml-1">Année</label>
                    <Input 
                      type="number" 
                      value={newEventYear}
                      onChange={(e) => setNewEventYear(e.target.value)}
                      className="bg-foreground/5 border-foreground/10 text-foreground h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-foreground/30 focus-visible:border-foreground/30 text-lg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-foreground/40 uppercase tracking-widest font-medium ml-1">Titre de l'événement</label>
                    <Input 
                      type="text" 
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      className="bg-foreground/5 border-foreground/10 text-foreground h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-foreground/30 focus-visible:border-foreground/30 text-lg"
                      placeholder="Ex: Première rencontre"
                      required
                    />
                  </div>
                  <div className="pt-6">
                    <Button type="submit" variant="pill" className="w-full bg-white text-black hover:bg-foreground/90 h-12 text-sm uppercase tracking-wider font-semibold">
                      Ajouter à la ligne
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command } from 'cmdk';
import { Sparkles, CalendarDays, Users, WalletCards, Images, Search } from 'lucide-react';
import { useProject } from '@/store/project-store';

export function CommandBar({ 
  setPhase, 
  setLayers 
}: { 
  setPhase: (phase: "tout"|"avant"|"pendant"|"apres") => void;
  setLayers: (layers: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const { project } = useProject();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!project) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 md:right-12 z-40 bg-white text-black px-4 py-3 rounded-full flex items-center gap-3 shadow-2xl hover:scale-105 transition-transform"
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">Demander à AIME</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 font-sans text-[10px] bg-black/10 px-1.5 py-0.5 rounded ml-2">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-xl bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <Command className="w-full" label="Command Menu" loop>
                <div className="flex items-center px-4 py-4 border-b border-white/10">
                  <Sparkles className="w-5 h-5 text-white/40 mr-3 shrink-0" />
                  <Command.Input 
                    autoFocus
                    placeholder="Que souhaitez-vous voir ou faire ?" 
                    className="flex-1 bg-transparent border-none outline-none text-white text-base placeholder:text-white/30"
                  />
                </div>

                <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-none">
                  <Command.Empty className="py-6 text-center text-sm text-white/40">
                    Aucune action trouvée.
                  </Command.Empty>

                  <Command.Group heading="Filtrer la ligne de temps" className="text-xs text-white/40 px-2 py-2">
                    <Command.Item 
                      onSelect={() => { setPhase("avant"); setLayers([]); setOpen(false); }}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 cursor-pointer text-white/80 text-sm mt-1"
                    >
                      <CalendarDays className="w-4 h-4" /> Les préparatifs
                    </Command.Item>
                    <Command.Item 
                      onSelect={() => { setPhase("pendant"); setLayers(["evenement", "jalon", "tache"]); setOpen(false); }}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 cursor-pointer text-white/80 text-sm"
                    >
                      <CalendarDays className="w-4 h-4" /> Le Jour J heure par heure
                    </Command.Item>
                    <Command.Item 
                      onSelect={() => { setPhase("tout"); setLayers(["devis", "facture", "paiement"]); setOpen(false); }}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 cursor-pointer text-white/80 text-sm"
                    >
                      <WalletCards className="w-4 h-4" /> L'argent et les devis
                    </Command.Item>
                  </Command.Group>

                  <Command.Group heading="Analyse" className="text-xs text-white/40 px-2 py-2 border-t border-white/5 mt-2">
                    <Command.Item 
                      onSelect={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 cursor-pointer text-white/80 text-sm mt-1"
                    >
                      <Search className="w-4 h-4" /> Voir les informations manquantes
                    </Command.Item>
                  </Command.Group>
                </Command.List>
              </Command>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

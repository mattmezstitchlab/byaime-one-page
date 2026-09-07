import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, FileText, Map, Folder, MessageSquare, User, WalletCards, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProject } from '@/store/project-store';

import { PlanningPanel } from './panels/PlanningPanel';
import { GuestPanel } from './panels/GuestPanel';
import { ProviderPanel } from './panels/ProviderPanel';
import { DayOfPanel } from './panels/DayOfPanel';

export function BottomDock() {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const { project } = useProject();

  const togglePanel = (panel: string) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const navItems = [
    { id: 'planning', icon: Folder, label: "Planning" },
    { id: 'guests', icon: User, label: "Invités" },
    { id: 'providers', icon: Store, label: "Prestataires" },
    { id: 'dayof', icon: Map, label: "Le Jour J" },
  ];

  if (!project) return null;

  return (
    <>
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-[4rem] md:bottom-[5rem] left-0 right-0 z-40 bg-[#0a0a0a] border-t border-white/10 shadow-2xl h-[70vh] max-h-[600px] rounded-t-3xl text-white"
          >
            <div className="absolute top-6 right-6">
              <button 
                onClick={() => setActivePanel(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-8 h-full overflow-y-auto pb-20">
              <h3 className="text-2xl font-display mb-8 font-light">
                {navItems.find(i => i.id === activePanel)?.label}
              </h3>
              
              {/* Contextual Panel Content based on ID */}
              {activePanel === 'planning' && <PlanningPanel />}
              {activePanel === 'guests' && <GuestPanel />}
              {activePanel === 'providers' && <ProviderPanel />}
              {activePanel === 'dayof' && <DayOfPanel />}
              
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#050505]/90 backdrop-blur-xl border-t border-white/10 flex justify-center pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-center gap-8 sm:gap-14 w-full max-w-3xl px-6 h-16 md:h-20">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => togglePanel(item.id)}
              className={cn(
                "p-3 rounded-full flex flex-col items-center justify-center transition-colors relative group",
                activePanel === item.id ? "text-white bg-white/10" : "text-white/40 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <item.icon className="w-5 h-5 md:w-6 md:h-6 stroke-[1.5]" />
              {activePanel === item.id && (
                <motion.div layoutId="dock-indicator" className="absolute -top-[1px] w-8 h-[2px] bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

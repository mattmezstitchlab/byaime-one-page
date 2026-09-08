import { useState } from 'react';
import { Search, Map, Folder, MessageSquare, User, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getAssetUrl } from '@/lib/assets';

export function BottomBar() {
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const togglePanel = (panel: string) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const navItems = [
    { id: 'search', icon: Search },
    { id: 'documents', icon: FileText },
    { id: 'map', icon: Map },
    { id: 'folder', icon: Folder },
    { id: 'chat', icon: MessageSquare },
    { id: 'profile', icon: User },
  ];

  return (
    <>
      {/* Sliding Panel */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 bg-zinc-950 border-t border-foreground/10 shadow-2xl h-[60vh] max-h-[500px] rounded-t-3xl text-foreground"
          >
            <div className="absolute top-6 right-6">
              <button 
                onClick={() => setActivePanel(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-8 h-full overflow-y-auto pb-20">
              <h3 className="text-2xl font-display mb-8 capitalize font-light">
                {navItems.find(i => i.id === activePanel)?.id === 'folder' ? 'Projets' : 
                 navItems.find(i => i.id === activePanel)?.id === 'map' ? 'Lieux' :
                 navItems.find(i => i.id === activePanel)?.id === 'chat' ? 'Échanges' :
                 navItems.find(i => i.id === activePanel)?.id}
              </h3>
              
              {/* Mock Content */}
              <div className="grid gap-3 max-w-2xl mx-auto">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-xl border border-foreground/5 bg-foreground/5 flex items-center gap-4 group hover:bg-foreground/10 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-foreground/10 flex flex-shrink-0 items-center justify-center">
                      {activePanel === 'documents' ? <FileText className="w-4 h-4 opacity-50 group-hover:opacity-100" /> :
                       activePanel === 'chat' ? <MessageSquare className="w-4 h-4 opacity-50 group-hover:opacity-100" /> :
                       <Folder className="w-4 h-4 opacity-50 group-hover:opacity-100" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">Élément {i}</div>
                      <div className="text-foreground/40 text-xs mt-0.5">Mis à jour récemment</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {activePanel === 'chat' && (
                <div className="mt-12 flex justify-center opacity-20 grayscale">
                  <img src={getAssetUrl('images/aime-icon.png')} alt="AIME" className="w-10 h-10 rounded-full" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Bottom Bar itself */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] text-foreground backdrop-blur-xl">
        <div className="flex items-center justify-center gap-10 sm:gap-16 w-full max-w-3xl px-6 h-14">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => togglePanel(item.id)}
              className={cn(
                "p-2 flex items-center justify-center transition-colors relative group",
                activePanel === item.id ? "text-foreground" : "text-foreground/45 hover:text-foreground/80"
              )}
            >
              <item.icon className="w-[20px] h-[20px] stroke-[1.5]" />
              {activePanel === item.id && (
                <motion.div layoutId="active-indicator" className="absolute -top-[15px] h-[2px] w-full bg-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

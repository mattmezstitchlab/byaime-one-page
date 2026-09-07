import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, FileText, Map, Folder, MessageSquare, User, WalletCards } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProject } from '@/store/project-store';

export function BottomDock() {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const { project } = useProject();

  const togglePanel = (panel: string) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const navItems = [
    { id: 'search', icon: Search, label: "Recherche" },
    { id: 'documents', icon: FileText, label: "Documents" },
    { id: 'budget', icon: WalletCards, label: "Budget" },
    { id: 'chat', icon: MessageSquare, label: "Échanges" },
    { id: 'profile', icon: User, label: "Profil" },
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
              {activePanel === 'budget' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                      <div className="text-xs text-white/50 uppercase tracking-wider mb-2">Total Engagé</div>
                      <div className="text-2xl md:text-3xl font-mono">
                        {(project.payments.reduce((a, p) => a + p.amountCents, 0) / 100).toLocaleString('fr-FR')} €
                      </div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl text-emerald-400">
                      <div className="text-xs uppercase tracking-wider mb-2">Déjà Payé</div>
                      <div className="text-2xl md:text-3xl font-mono">
                        {(project.payments.filter(p => p.state === 'paye').reduce((a, p) => a + p.amountCents, 0) / 100).toLocaleString('fr-FR')} €
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-8">
                    <h4 className="text-sm font-medium mb-4">Paiements</h4>
                    {project.payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5">
                        <div>
                          <div className="font-medium text-sm">{p.label}</div>
                          <div className="text-white/40 text-xs mt-1">
                            {new Date(p.at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm">{(p.amountCents / 100).toLocaleString('fr-FR')} €</div>
                          <div className={cn(
                            "text-[10px] uppercase tracking-wider mt-1",
                            p.state === 'paye' ? "text-emerald-400" : "text-amber-400"
                          )}>
                            {p.state === 'paye' ? 'Réglé' : 'Dû'}
                          </div>
                        </div>
                      </div>
                    ))}
                    {project.payments.length === 0 && (
                      <div className="text-center py-10 text-white/40 text-sm">Aucun paiement enregistré</div>
                    )}
                  </div>
                </div>
              )}

              {activePanel === 'documents' && (
                <div className="max-w-2xl mx-auto space-y-3">
                  {project.documents.map(d => (
                    <div key={d.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 opacity-50" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{d.title}</div>
                        <div className="text-white/40 text-xs mt-1 uppercase tracking-wider">{d.kind}</div>
                      </div>
                    </div>
                  ))}
                  {project.documents.length === 0 && (
                    <div className="text-center py-10 text-white/40 text-sm">Aucun document</div>
                  )}
                </div>
              )}
              
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

import { useState } from 'react';
import { useProject } from '@/store/project-store';
import { WalletCards, FileText, Phone, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProviderPanel() {
  const { project } = useProject();
  const [tab, setTab] = useState<'liste' | 'budget' | 'documents'>('liste');
  
  if (!project) return null;

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-full">
      <div className="flex bg-white/5 p-1 rounded-full w-fit mb-8">
        <button 
          onClick={() => setTab('liste')}
          className={cn("px-4 py-1.5 rounded-full text-xs font-medium transition-colors", tab === 'liste' ? "bg-white text-black" : "text-white/60 hover:text-white")}
        >
          Prestataires
        </button>
        <button 
          onClick={() => setTab('budget')}
          className={cn("px-4 py-1.5 rounded-full text-xs font-medium transition-colors", tab === 'budget' ? "bg-white text-black" : "text-white/60 hover:text-white")}
        >
          Budget
        </button>
        <button 
          onClick={() => setTab('documents')}
          className={cn("px-4 py-1.5 rounded-full text-xs font-medium transition-colors", tab === 'documents' ? "bg-white text-black" : "text-white/60 hover:text-white")}
        >
          Documents
        </button>
      </div>

      {tab === 'liste' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
          {project.providers.map(p => (
            <div key={p.id} className="p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">{p.role}</div>
                  <h4 className="font-medium text-base">{p.name || "À trouver"}</h4>
                </div>
                <span className={cn(
                  "text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border",
                  p.status === 'reserve' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  p.status === 'devis' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                  "bg-amber-500/10 text-amber-400 border-amber-500/20"
                )}>
                  {p.status}
                </span>
              </div>
              
              {(p.amountCents !== undefined || p.nextAction) && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                  {p.amountCents !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Budget</span>
                      <span className="font-mono">{(p.amountCents / 100).toLocaleString('fr-FR')} €</span>
                    </div>
                  )}
                  {p.nextAction && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Action</span>
                      <span className="text-white/90 text-right">{p.nextAction}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'budget' && (
        <div className="space-y-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
              <div className="text-xs uppercase tracking-wider text-white/50 mb-2">Total Estimé</div>
              <div className="text-3xl font-mono">{project.budget.value?.toLocaleString('fr-FR')} €</div>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
              <div className="text-xs uppercase tracking-wider text-white/50 mb-2">Engagé</div>
              <div className="text-3xl font-mono">
                {(project.providers.reduce((a, p) => a + (p.amountCents || 0), 0) / 100).toLocaleString('fr-FR')} €
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl text-emerald-400">
              <div className="text-xs uppercase tracking-wider mb-2">Payé</div>
              <div className="text-3xl font-mono">
                {(project.payments.filter(p => p.state === 'paye').reduce((a, p) => a + p.amountCents, 0) / 100).toLocaleString('fr-FR')} €
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <h4 className="text-sm font-medium mb-4">Échéancier</h4>
            <div className="space-y-2">
              {project.payments.map(p => {
                const provider = project.providers.find(prov => prov.id === p.providerId);
                return (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5">
                    <div>
                      <div className="font-medium text-sm">{p.label}</div>
                      <div className="text-white/40 text-xs mt-1 flex items-center gap-2">
                        <span>{new Date(p.at).toLocaleDateString('fr-FR')}</span>
                        {provider && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span>{provider.name || provider.role}</span>
                          </>
                        )}
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
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-3 pb-20">
          {project.documents.map(d => {
            const provider = project.providers.find(p => p.id === d.providerId);
            return (
              <div key={d.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                  <FileText className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                </div>
                <div>
                  <div className="font-medium text-sm">{d.title}</div>
                  <div className="text-white/40 text-xs mt-1 flex items-center gap-2">
                    <span className="uppercase tracking-wider">{d.kind}</span>
                    {provider && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span>{provider.name || provider.role}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

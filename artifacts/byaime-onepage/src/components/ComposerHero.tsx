import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useProject } from '@/store/project-store';
import { getAssetUrl } from '@/lib/assets';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function ComposerHero() {
  const { intentionText, setIntentionText, draft, commitDraft, createWeddingDemo } = useProject();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && intentionText.length > 10) {
      e.preventDefault();
      commitDraft();
    }
  };

  return (
    <section data-testid="project-composer" className="relative w-full h-[100dvh] flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105"
        style={{ backgroundImage: `url(${getAssetUrl('images/visual-event-D_L9Q-iW.jpg')})` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-black/40 to-black/95" />

      <div className="relative z-10 w-full max-w-3xl mx-auto px-6 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full text-center space-y-6"
        >
          <h1 className="text-4xl md:text-6xl font-display font-medium text-white uppercase tracking-[0.08em] text-balance">
            Racontez-nous tout.
          </h1>
          <p className="text-white/60 text-sm md:text-base max-w-xl mx-auto font-light">
            La date, le lieu, les invités, l'ambiance : une seule phrase suffit pour commencer.
          </p>

          <div className="mt-10 relative w-full group">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-2 sm:p-3 transition-all focus-within:border-white/30 focus-within:bg-black/60 shadow-2xl">
              <textarea
                data-testid="project-intention"
                value={intentionText}
                onChange={(e) => setIntentionText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="On se marie le 14 août 2027 près de Lille, 120 invités, ambiance champêtre avec un budget de 20 000€..."
                className="w-full bg-transparent border-none outline-none resize-none text-white/90 placeholder:text-white/30 text-lg md:text-xl p-4 min-h-[120px] font-light leading-relaxed"
              />
              
              <div className="flex justify-between items-end px-4 pb-2">
                <div className="flex-1 flex gap-2 overflow-hidden">
                  {draft && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-wrap gap-2"
                    >
                      {draft.universe && (
                        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-white/10 text-white/70 border border-white/5">
                          {draft.universe}
                        </span>
                      )}
                      {draft.pivot?.confidence === "confirme" && (
                        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {format(draft.pivot.value, 'MMM yyyy', { locale: fr })}
                        </span>
                      )}
                      {draft.guestsCount?.confidence === "confirme" && (
                        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {draft.guestsCount.value} invités
                        </span>
                      )}
                      {draft.budget?.confidence === "confirme" && (
                        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {draft.budget.value?.toLocaleString('fr-FR')} €
                        </span>
                      )}
                    </motion.div>
                  )}
                </div>
                
                  <button
                    data-testid="create-project"
                  onClick={commitDraft}
                  disabled={intentionText.length < 10}
                  className="flex-shrink-0 ml-4 h-12 w-12 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30 disabled:bg-white/10 disabled:text-white transition-all hover:scale-105 active:scale-95"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <button
            data-testid="demo-project"
            type="button"
            onClick={createWeddingDemo}
            className="mt-5 text-[11px] uppercase tracking-[0.18em] text-white/55 underline decoration-white/25 underline-offset-8 transition-colors hover:text-white"
          >
            Explorer un mariage complet
          </button>
        </motion.div>
      </div>
      
      {/* Decorative timeline hint */}
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center opacity-40 pointer-events-none">
        <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/30 to-transparent" />
        <div className="w-2 h-2 rounded-full bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.5)] mt-2" />
        <span className="text-[9px] uppercase tracking-[0.3em] text-white/50 mt-4">La ligne de temps attend</span>
      </div>
    </section>
  );
}

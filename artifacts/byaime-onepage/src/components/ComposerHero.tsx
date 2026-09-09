import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useProject } from '@/store/project-store';
import { getAssetUrl } from '@/lib/assets';
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
    <section data-testid="project-composer" className="aime-cinematic-surface relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0 scale-105 bg-cover bg-center bg-no-repeat opacity-50"
        style={{ backgroundImage: `url(${getAssetUrl('images/visual-event-D_L9Q-iW.jpg')})` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/70 via-black/45 to-black/95" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-6 text-center"
        >
          <h1 className="aime-visual-copy text-balance font-display text-4xl font-medium uppercase tracking-[0.08em] text-white md:text-6xl">
            Racontez-nous tout.
          </h1>
          <p className="aime-visual-copy mx-auto max-w-xl text-sm font-light text-white/72 md:text-base">
            Dites-nous la date, le lieu, le nombre d’invités et l’ambiance. Une phrase suffit.
          </p>

          <div className="group relative mx-auto mt-10 w-full max-w-2xl">
            <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-white/12 via-white/4 to-transparent opacity-0 blur-md transition duration-500 group-hover:opacity-100" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all focus-within:border-white/20 focus-within:bg-black/45">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/10" />
              <textarea
                data-testid="project-intention"
                value={intentionText}
                onChange={(e) => setIntentionText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="On se marie le 14 août 2027 près de Lille, 120 invités, ambiance champêtre avec un budget de 20 000€..."
                rows={3}
                className="relative z-10 min-h-[96px] w-full resize-none border-none bg-transparent px-6 pt-6 text-base leading-relaxed text-white outline-none placeholder:text-white/35 md:text-lg"
              />
              
              <div className="relative z-10 flex items-end justify-between gap-4 px-6 pb-5">
                <div className="flex flex-1 gap-2 overflow-hidden">
                  {draft && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-wrap gap-2"
                    >
                      {draft.universe && (
                        <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-1 text-[10px] uppercase tracking-widest text-white/75">
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
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white transition-all hover:scale-105 hover:bg-white/16 active:scale-95 disabled:border-white/5 disabled:bg-white/5 disabled:text-white/35"
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
            className="mt-5 text-[11px] uppercase tracking-[0.18em] text-foreground/55 underline decoration-white/25 underline-offset-8 transition-colors hover:text-foreground"
          >
            Explorer un mariage complet
          </button>
        </motion.div>
      </div>
      
      {/* Decorative timeline hint */}
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center opacity-40 pointer-events-none">
        <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/30 to-transparent" />
        <div className="w-2 h-2 rounded-full bg-foreground/50 shadow-[0_0_10px_rgba(255,255,255,0.5)] mt-2" />
        <span className="text-[9px] uppercase tracking-[0.3em] text-foreground/50 mt-4">Votre calendrier vous attend</span>
      </div>
    </section>
  );
}

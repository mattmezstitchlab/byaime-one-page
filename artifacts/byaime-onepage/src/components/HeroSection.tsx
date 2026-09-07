import { motion } from 'framer-motion';
import { getAssetUrl } from '@/lib/assets';
import { ChevronDown, Plus } from 'lucide-react';
import { useAppStore } from '@/store/use-app-store';
import { cn } from '@/lib/utils';

export function HeroSection() {
  const { currentQuestion, setCurrentQuestion, selectedUniverse } = useAppStore();

  return (
    <section className="relative w-full h-[100dvh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000"
        style={{ backgroundImage: `url(${getAssetUrl('images/visual-event-D_L9Q-iW.jpg')})` }}
      />
      {/* Subtle overlay for text readability */}
      <div className="absolute inset-0 z-0 bg-black/40" />
      
      {/* Gradient overlay at bottom to blend with next section */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent z-0" />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-8 md:space-y-10 w-full"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-medium text-white uppercase tracking-[0.1em] text-balance drop-shadow-xl">
            The Art Of<br />Connection
          </h1>
          
          <div className="w-full flex justify-center px-2">
            {/* Pill shaped input container */}
            <div className="w-full max-w-3xl glass-panel-dark rounded-[2rem] sm:rounded-full flex flex-col sm:flex-row items-center p-1.5 transition-all duration-300 hover:bg-black/30 border border-white/20 gap-2 sm:gap-0">
              
              {/* Universe Selector Button */}
              <button 
                onClick={() => document.getElementById('universes')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto flex justify-between sm:justify-start items-center gap-3 px-5 py-3 rounded-full hover:bg-white/10 transition-colors whitespace-nowrap text-sm font-medium text-white/90"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border border-white/40 flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </div>
                  <span>{selectedUniverse || "Choisir l'univers"}</span>
                </div>
                <ChevronDown className="w-4 h-4 opacity-50 sm:ml-2" />
              </button>
              
              <div className="hidden sm:block w-px h-6 bg-white/20 mx-1" />
              <div className="sm:hidden w-[90%] h-px bg-white/10 my-1" />
              
              <input 
                type="text"
                placeholder="Choisissez un sujet, puis répondez à une question à la fois."
                className="bg-transparent border-none outline-none w-full flex-1 px-5 py-3 text-sm placeholder:text-white/40 text-center sm:text-left min-w-0 text-white font-medium focus:placeholder:opacity-0 transition-opacity"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
              />
              
              <div className="hidden sm:block px-5 text-xs font-medium text-white/40">
                1/8
              </div>
            </div>
          </div>
          
          <div className="pt-2">
            <button className="text-white/60 text-xs tracking-wide hover:text-white transition-colors border-b border-white/20 pb-0.5 hover:border-white/50">
              Décrire votre projet en une phrase
            </button>
          </div>
        </motion.div>
      </div>
      
      {/* Scroll timeline indicator */}
      <div className="absolute bottom-24 sm:bottom-32 left-0 right-0 z-10 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="flex flex-col items-center gap-3 cursor-pointer opacity-50 hover:opacity-100 transition-opacity w-full px-6"
          onClick={() => document.getElementById('timeline')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <div className="text-[10px] font-medium tracking-[0.2em] uppercase text-white/70 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            Aujourd'hui
          </div>
          <span className="text-[10px] sm:text-xs text-white/50 font-medium">Votre calendrier est prêt à être rempli</span>
          
          {/* Subtle timeline axis preview */}
          <div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mt-4 sm:mt-6 relative">
            <div className="absolute top-1/2 left-1/4 w-[1px] h-2 bg-white/30 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-[1px] h-3 bg-[#e53935] -translate-y-1/2 shadow-[0_0_10px_rgba(229,57,53,0.5)]" />
            <div className="absolute top-1/2 left-3/4 w-[1px] h-2 bg-white/30 -translate-y-1/2" />
            
            <span className="absolute top-4 left-1/4 -translate-x-1/2 text-[9px] sm:text-[10px] text-white/30">2026</span>
            <span className="absolute top-4 left-3/4 -translate-x-1/2 text-[9px] sm:text-[10px] text-white/30">2028</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

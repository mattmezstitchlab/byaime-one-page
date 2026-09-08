import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TimelineEvent } from '@/lib/types';
import { X, Play, Pause, FastForward, Rewind } from 'lucide-react';

export function PlayMode({ events, onClose }: { events: TimelineEvent[], onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  // Filter out non-visual events if necessary, but we'll show everything in play mode
  const playableEvents = events.sort((a, b) => a.time - b.time);

  useEffect(() => {
    let timer: number;
    if (playing && currentIndex < playableEvents.length - 1) {
      timer = window.setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 4000); // 4 seconds per slide
    } else if (currentIndex >= playableEvents.length - 1) {
      setPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [playing, currentIndex, playableEvents.length]);

  if (playableEvents.length === 0) return null;

  const currentEvent = playableEvents[currentIndex];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black text-white flex flex-col"
    >
      {/* Visual background related to event if we had images, fallback to a dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-black opacity-80" />
      
      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between p-6">
        <div className="text-white/60 text-xs tracking-[0.2em] uppercase font-medium">
          The Art of Connection
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bars */}
      <div className="relative z-10 flex gap-1 px-6 w-full max-w-4xl mx-auto mb-10">
        {playableEvents.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-white"
              initial={{ width: "0%" }}
              animate={{ width: idx < currentIndex ? "100%" : idx === currentIndex && playing ? "100%" : "0%" }}
              transition={{ duration: idx === currentIndex ? 4 : 0, ease: "linear" }}
            />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEvent.id}
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            <div className="text-white/50 text-sm tracking-widest uppercase mb-6 font-mono">
              {new Date(currentEvent.time).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </div>
            
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display text-white font-medium text-balance leading-tight mb-8">
              {currentEvent.title}
            </h2>
            
            {currentEvent.detail && (
              <p className="text-lg md:text-xl text-white/70 font-light leading-relaxed">
                {currentEvent.detail}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="relative z-10 flex items-center justify-center gap-6 p-8 pb-12">
        <button 
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          className="p-3 text-white/50 hover:text-white transition-colors"
        >
          <Rewind className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setPlaying(!playing)}
          className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
        >
          {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </button>
        <button 
          onClick={() => setCurrentIndex(Math.min(playableEvents.length - 1, currentIndex + 1))}
          className="p-3 text-white/50 hover:text-white transition-colors"
        >
          <FastForward className="w-6 h-6" />
        </button>
      </div>
    </motion.div>
  );
}

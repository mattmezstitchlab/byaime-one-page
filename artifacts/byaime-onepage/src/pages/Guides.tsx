import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMOS, DEMO_CATEGORIES, type DemoConfig } from "./guides-demos";

const FakeCursor = ({ x, y, active, reducedMotion }: { x: number; y: number; active: boolean; reducedMotion: boolean | null }) => {
  if (reducedMotion) return null;
  return (
    <motion.div
      initial={false}
      animate={{ left: `${x}%`, top: `${y}%`, scale: active ? 0.9 : 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, mass: 15 }}
      className="absolute z-50 pointer-events-none drop-shadow-xl"
      style={{ marginLeft: -12, marginTop: -12 }}
    >
      <MousePointer2 className="w-8 h-8 text-foreground fill-background" />
      {active && (
        <motion.div
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 rounded-full border-2 border-foreground"
        />
      )}
    </motion.div>
  );
};

function ScriptedDemoPlayer({ config }: { config: DemoConfig }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isPlaying || reducedMotion) return;
    const timer = setTimeout(() => {
      setCurrentStep((s) => (s + 1) % config.steps.length);
    }, 4500);
    return () => clearTimeout(timer);
  }, [currentStep, isPlaying, config.steps.length, reducedMotion]);

  const step = config.steps[currentStep];

  return (
    <div className="flex flex-col overflow-hidden rounded-[2rem] border border-border bg-card/30 shadow-2xl">
      <div className="relative h-[400px] w-full bg-background overflow-hidden border-b border-border">
         <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              {step.ui}
            </motion.div>
         </AnimatePresence>

         <FakeCursor x={step.cursor.x} y={step.cursor.y} active={true} reducedMotion={reducedMotion} />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-card gap-6">
         <div className="flex-1">
           <h4 className="font-display text-xl mb-2">{step.label}</h4>
           <p className="text-sm font-light text-foreground/60 leading-relaxed min-h-[3rem]">{step.content}</p>
         </div>

         <div className="flex items-center gap-2 shrink-0">
           <button data-testid="demo-prev" aria-label="Étape précédente" onClick={() => { setIsPlaying(false); setCurrentStep((s) => (s - 1 + config.steps.length) % config.steps.length); }} className="grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-foreground/5 transition-colors focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none">
             <ChevronLeft className="w-4 h-4 text-foreground/70" />
           </button>
           <button data-testid="demo-play-pause" aria-label={isPlaying ? "Mettre en pause" : "Jouer"} onClick={() => setIsPlaying(!isPlaying)} className="grid h-12 w-12 place-items-center rounded-full bg-foreground text-background hover:scale-105 transition-transform focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none">
             {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
           </button>
           <button data-testid="demo-next" aria-label="Étape suivante" onClick={() => { setIsPlaying(false); setCurrentStep((s) => (s + 1) % config.steps.length); }} className="grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-foreground/5 transition-colors focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none">
             <ChevronRight className="w-4 h-4 text-foreground/70" />
           </button>
           <button data-testid="demo-replay" aria-label="Rejouer la démonstration" onClick={() => { setCurrentStep(0); setIsPlaying(true); }} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-foreground/70 hover:bg-foreground/5 transition-colors focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none ml-2">
             <RotateCcw className="w-3.5 h-3.5" /> Rejouer
           </button>
         </div>
      </div>

      <div className="flex gap-1 p-2 bg-background/50">
        {config.steps.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 rounded-full overflow-hidden bg-foreground/10">
             {idx === currentStep && isPlaying && !reducedMotion && (
               <motion.div
                 initial={{ width: "0%" }}
                 animate={{ width: "100%" }}
                 transition={{ duration: 4.5, ease: "linear" }}
                 className="h-full bg-foreground"
                 data-testid="demo-progress-active"
               />
             )}
             {(idx < currentStep || (idx === currentStep && !isPlaying) || (idx === currentStep && reducedMotion)) && (
               <div className="h-full bg-foreground w-full" data-testid="demo-progress-static" />
             )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function GuidesPage() {
  const [activeDemo, setActiveDemo] = useState(DEMOS[0].id);
  const activeConfig = DEMOS.find(demo => demo.id === activeDemo) ?? DEMOS[0];

  return (
    <main data-testid="guides-page" className="min-h-[100dvh] bg-background text-foreground selection:bg-foreground/20">
      <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-6 bg-background/80 backdrop-blur-xl border-b border-border/50">
         <Link href="/" className="font-display font-medium tracking-[.2em] text-foreground hover:opacity-70 transition-opacity focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none rounded">AIME</Link>
         <Link href="/sign-up" className="rounded-full bg-foreground px-5 py-2 text-xs font-semibold text-background hover:bg-foreground/90 transition-colors focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none">Commencer</Link>
      </nav>

      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
         <p className="text-[10px] uppercase tracking-[.35em] text-foreground/40 mb-6">Guides et Concepts</p>
         <h1 className="font-display text-5xl md:text-7xl font-light mb-8 max-w-3xl leading-tight">
           L'outil d'organisation qui respecte votre vie privée.
         </h1>
         <p className="text-lg md:text-xl font-light text-foreground/60 max-w-2xl leading-relaxed">
            AIME remplace les dizaines de fichiers dispersés par un système élégant et organisé, pensé pour vous redonner le contrôle. Découvrez son fonctionnement.
         </p>
      </section>

      <section className="px-6 pb-40 max-w-6xl mx-auto grid lg:grid-cols-[300px_1fr] gap-12 items-start">
         <div className="flex snap-x gap-3 overflow-x-auto pb-4 hide-scrollbar lg:sticky lg:top-24 lg:block lg:space-y-6 lg:overflow-visible lg:pb-0">
            {DEMO_CATEGORIES.map(category => (
              <div key={category.id} className="shrink-0 snap-center lg:snap-none">
                <p className="mb-2 px-1 text-[9px] uppercase tracking-[.22em] text-foreground/35 lg:mb-2">{category.label}</p>
                <div className="flex w-72 flex-col gap-2 lg:w-auto">
                  {DEMOS.filter(demo => demo.category === category.id).map(demo => (
                    <button
                      key={demo.id}
                      data-testid={`demo-select-${demo.id}`}
                      onClick={() => setActiveDemo(demo.id)}
                      className={cn(
                        "text-left px-5 py-4 rounded-2xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none",
                        activeDemo === demo.id ? "bg-foreground text-background lg:shadow-xl" : "bg-card/50 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                      )}
                    >
                       <span className="block font-display text-lg mb-1 truncate">{demo.title}</span>
                       <span className={cn("block text-xs leading-relaxed line-clamp-2 lg:line-clamp-none", activeDemo === demo.id ? "text-background/80" : "text-foreground/40")}>{demo.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
         </div>

         <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeConfig.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                 <ScriptedDemoPlayer config={activeConfig} />
              </motion.div>
            </AnimatePresence>
         </div>
      </section>

      <footer className="border-t border-border px-6 py-12 text-center text-xs text-foreground/40">
        <p>AIME · {new Date().getFullYear()} · Pensé pour garder le contrôle.</p>
      </footer>
    </main>
  );
}

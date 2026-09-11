import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import { AppearanceToggle } from "@/components/AppearanceToggle";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, MousePointer2, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMOS, DEMO_CATEGORIES, type DemoConfig } from "./guides-demos";
import { AIME_VISUALS, getAssetUrl } from "@/lib/assets";
import { AIME_SCREENS, type AimeScreenId } from "@/lib/aime-architecture";
import { useRouteMeta } from "@/lib/page-meta";

/*
 * Les guides sont une rangée d'animations : on fait défiler les catégories,
 * l'animation répond au centre. Rien n'est empilé en grille ni en nuage de
 * puces — sur l'accueil comme ici, le même composant, juste un autre ton.
 */

type ReducedMotionFlag = boolean | null;
type RailTone = "light" | "onDark";

const FakeCursor = ({ x, y, active, reducedMotion }: { x: number; y: number; active: boolean; reducedMotion: ReducedMotionFlag }) => {
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
      setCurrentStep(s => (s + 1) % config.steps.length);
    }, 4500);
    return () => clearTimeout(timer);
  }, [currentStep, isPlaying, config.steps.length, reducedMotion]);

  const step = config.steps[currentStep];

  return (
    <div className="flex flex-col overflow-hidden rounded-[2rem] border border-border bg-card/60 shadow-2xl">
      <div className="relative h-[380px] w-full overflow-hidden border-b border-border bg-background sm:h-[420px]">
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

        <FakeCursor x={step.cursor.x} y={step.cursor.y} active reducedMotion={reducedMotion} />
      </div>

      <div className="flex flex-col items-center gap-5 bg-card/60 px-6 py-6 text-center">
        <div className="w-full max-w-xl">
          <h3 className="font-display text-xl text-foreground">{step.label}</h3>
          <p className="mt-2 min-h-[3rem] text-sm font-light leading-relaxed text-foreground/60">{step.content}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button data-testid="demo-prev" aria-label="Étape précédente" onClick={() => { setIsPlaying(false); setCurrentStep(s => (s - 1 + config.steps.length) % config.steps.length); }} className="grid h-10 w-10 place-items-center rounded-full border border-border text-foreground/70 transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button data-testid="demo-play-pause" aria-label={isPlaying ? "Mettre en pause" : "Jouer"} onClick={() => setIsPlaying(!isPlaying)} className="grid h-12 w-12 place-items-center rounded-full bg-foreground text-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2">
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-1 h-5 w-5" />}
          </button>
          <button data-testid="demo-next" aria-label="Étape suivante" onClick={() => { setIsPlaying(false); setCurrentStep(s => (s + 1) % config.steps.length); }} className="grid h-10 w-10 place-items-center rounded-full border border-border text-foreground/70 transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button data-testid="demo-replay" aria-label="Rejouer la démonstration" onClick={() => { setCurrentStep(0); setIsPlaying(true); }} className="ml-2 flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-foreground/70 transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Rejouer
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-background/60 p-2">
        {config.steps.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
            {idx === currentStep && isPlaying && !reducedMotion && (
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 4.5, ease: "linear" }}
                className="h-full bg-foreground"
                data-testid="demo-progress-active"
              />
            )}
            {(idx < currentStep || (idx === currentStep && (!isPlaying || reducedMotion))) && (
              <div className="h-full w-full bg-foreground" data-testid="demo-progress-static" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ————————————————————————————————————————————————
   Rail horizontal : les catégories se suivent, on fait défiler.
———————————————————————————————————————————————— */

const railClasses =
  "hide-scrollbar flex snap-x snap-proximity gap-3 overflow-x-auto scroll-pl-6 px-6 pb-3 focus-visible:outline-none md:px-10";
const cardWidth = "w-[15.5rem] shrink-0 snap-start sm:w-[17rem]";

const toneCard = (tone: RailTone, active: boolean) =>
  cn(
    "group rounded-3xl border p-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2",
    active
      ? tone === "onDark"
        ? "border-white bg-white text-black focus-visible:ring-white"
        : "border-foreground bg-foreground text-background focus-visible:ring-foreground"
      : tone === "onDark"
        ? "border-white/15 bg-white/[.06] text-white/80 hover:border-white/45 hover:text-white focus-visible:ring-white/70"
        : "border-border bg-card/40 text-foreground/75 hover:border-foreground/35 hover:text-foreground focus-visible:ring-foreground",
  );

function RailGroup({ label, tone, children }: { label: string; tone: RailTone; children: ReactNode }) {
  return (
    <div className="shrink-0 snap-start">
      <p className={cn("mb-2 pl-1 text-[9px] uppercase tracking-[.22em]", tone === "onDark" ? "text-white/45" : "text-foreground/35")}>
        {label}
      </p>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function DemoRail({
  idPrefix,
  tone,
  activeDemo,
  onSelect,
  featuredDemos,
}: {
  idPrefix: string;
  tone: RailTone;
  activeDemo: string;
  onSelect: (demoId: string) => void;
  /** Une sélection courte sur l'accueil ; tout le catalogue reste sur la page Guides. */
  featuredDemos?: string[];
}) {
  const featured = featuredDemos ? new Set(featuredDemos) : null;
  return (
    <div
      data-testid={`${idPrefix}-menu`}
      role="group"
      aria-label="Choisir un guide animé"
      tabIndex={0}
      className={railClasses}
    >
      {DEMO_CATEGORIES.map(category => {
        let demos = DEMOS.filter(demo => demo.category === category.id);
        if (featured) demos = demos.filter(demo => featured.has(demo.id));
        if (!demos.length) return null;
        return (
          <RailGroup key={category.id} label={category.label} tone={tone}>
            {demos.map(demo => {
              const isActive = demo.id === activeDemo;
              return (
                <button
                  key={demo.id}
                  type="button"
                  data-testid={`demo-select-${demo.id}`}
                  onClick={() => onSelect(demo.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(cardWidth, toneCard(tone, isActive))}
                >
                  <span className="block font-display text-[15px] leading-snug">{demo.title}</span>
                  <span className={cn("mt-1.5 block line-clamp-2 text-xs leading-relaxed", isActive ? "opacity-70" : "opacity-60")}>
                    {demo.description}
                  </span>
                </button>
              );
            })}
          </RailGroup>
        );
      })}
    </div>
  );
}

/** Écrans qu'aucune démo ne porte par leur seul nom : on les rattache à la démo la plus proche. */
const DEMO_FOR_SCREEN: Record<string, string> = {
  "panel:logistics": "infos",
  "panel:contributions": "memories",
  "panel:film": "memories",
  "panel:honeymoon": "thanks",
  "panel:sections": "synthesis",
  "view:person": "graph",
  "view:collaborative": "roles",
  "view:provider": "providers",
  "view:public-info": "infos",
  "portal:me": "me",
  "portal:world-settings": "creation",
  "portal:invite": "roles",
  home: "intention",
  legal: "graph",
  guides: "architecture",
};

const DEMO_IDS = new Set(DEMOS.map(demo => demo.id));

export function demoIdForScreen(screenId: AimeScreenId) {
  const suffix = screenId.includes(":") ? screenId.split(":")[1] : screenId;
  if (DEMO_IDS.has(suffix)) return suffix;
  return DEMO_FOR_SCREEN[screenId] ?? null;
}

const SCREEN_GROUPS: { id: string; label: string; match: (screenId: AimeScreenId) => boolean }[] = [
  { id: "monde", label: "Le Monde, ses phases et ses vues", match: screenId => screenId.startsWith("phase:") || screenId.startsWith("view:") },
  { id: "panneaux", label: "Les panneaux du Monde", match: screenId => screenId.startsWith("panel:") },
  { id: "hors-monde", label: "Compte, portail et écrans publics", match: screenId => !screenId.startsWith("phase:") && !screenId.startsWith("view:") && !screenId.startsWith("panel:") },
];

/**
 * Tous les écrans décrits par le registre d'architecture, en une rangée par
 * catégorie : le guide n'est jamais plus vague que l'interface.
 */
function ScreensRail({
  idPrefix,
  tone,
  activeDemo,
  onSelect,
  only,
  featuredDemos,
}: {
  idPrefix: string;
  tone: RailTone;
  activeDemo: string | null;
  onSelect: (demoId: string) => void;
  /** Une seule rangée sur l'accueil, les trois sur la page Guides. */
  only?: string[];
  /** Sur l'accueil, ne montre que les écrans reliés aux démos mises en avant. */
  featuredDemos?: string[];
}) {
  const screens = useMemo(() => {
    const all = Object.keys(AIME_SCREENS) as AimeScreenId[];
    if (!featuredDemos) return all;
    const featured = new Set(featuredDemos);
    return all.filter(screenId => {
      const demoId = demoIdForScreen(screenId);
      return demoId !== null && featured.has(demoId);
    });
  }, [featuredDemos]);
  const groups = only ? SCREEN_GROUPS.filter(group => only.includes(group.id)) : SCREEN_GROUPS;
  return (
    <div data-testid={`${idPrefix}-screens`} className="space-y-7">
      {groups.map(group => {
        const items = screens.filter(group.match);
        if (!items.length) return null;
        return (
          <div key={group.id} data-testid={`${idPrefix}-group-${group.id}`} className={railClasses} role="group" aria-label={group.label} tabIndex={0}>
            <RailGroup label={group.label} tone={tone}>
              {items.map(screenId => {
                const screen = AIME_SCREENS[screenId];
                const demoId = demoIdForScreen(screenId);
                const isActive = demoId !== null && demoId === activeDemo;
                const inner = (
                  <>
                    <span data-screen-id={screenId} className="sr-only">{screenId}</span>
                    <span className="block font-display text-[15px] leading-snug">{screen.label}</span>
                    <span className="mt-1.5 block line-clamp-2 text-xs leading-relaxed opacity-60">{screen.purpose}</span>
                    <span className="mt-2 block text-[10px] uppercase tracking-[.14em] opacity-45">{screen.where}</span>
                    {demoId && (
                      <span className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px]", isActive ? "border-current opacity-80" : tone === "onDark" ? "border-white/25" : "border-foreground/20")}>
                        <Play className="h-2.5 w-2.5" /> {isActive ? "à l’écran" : "voir la démo"}
                      </span>
                    )}
                  </>
                );
                return demoId ? (
                  <button
                    key={screenId}
                    type="button"
                    onClick={() => onSelect(demoId)}
                    className={cn(cardWidth, toneCard(tone, isActive))}
                  >
                    {inner}
                  </button>
                ) : (
                  <div key={screenId} className={cn(cardWidth, toneCard(tone, false), "opacity-80")}>
                    {inner}
                  </div>
                );
              })}
            </RailGroup>
          </div>
        );
      })}
    </div>
  );
}

export function GuidesExplorer({
  idPrefix = "guides",
  tone = "light",
  screens = "all",
  featuredDemos,
}: {
  idPrefix?: string;
  tone?: RailTone;
  /** La page Guides garde les trois rangées ; l'accueil ne montre que les panneaux. */
  screens?: "all" | "panneaux" | "none";
  /** Sélection courte pour l'accueil : le catalogue complet vit sur /guides. */
  featuredDemos?: string[];
}) {
  const initialDemo = featuredDemos && DEMOS.some(demo => demo.id === featuredDemos[0]) ? featuredDemos[0] : DEMOS[0].id;
  const [activeDemo, setActiveDemo] = useState(initialDemo);
  const activeConfig = DEMOS.find(demo => demo.id === activeDemo) ?? DEMOS[0];

  const selectDemo = (demoId: string) => {
    setActiveDemo(demoId);
    if (typeof document !== "undefined") {
      document.getElementById(`${idPrefix}-player`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div data-testid={`${idPrefix}-explorer`} className="space-y-8">
      <DemoRail idPrefix={idPrefix} tone={tone} activeDemo={activeDemo} onSelect={selectDemo} featuredDemos={featuredDemos} />

      <div id={`${idPrefix}-player`} data-testid={`${idPrefix}-player`} className="mx-auto w-full max-w-3xl px-6 md:px-10">
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
        <p className={cn("mt-4 text-center text-sm font-light leading-relaxed", tone === "onDark" ? "text-white/60" : "text-foreground/55")}>
          {activeConfig.description}
        </p>
      </div>

      {screens !== "none" && (
        <ScreensRail
          idPrefix={idPrefix}
          tone={tone}
          activeDemo={activeDemo}
          onSelect={selectDemo}
          only={screens === "panneaux" ? ["panneaux"] : undefined}
          featuredDemos={featuredDemos}
        />
      )}
    </div>
  );
}

export function GuidesPage() {
  useRouteMeta({
    title: "Guides — Comprendre AIME, pas à pas",
    description:
      `${DEMOS.length} démonstrations animées pour comprendre comment AIME organise un mariage : Monde, invités, budget, Jour J, rôles et partage.`,
  });

  return (
    <main data-testid="guides-page" className="min-h-[100dvh] bg-background text-foreground selection:bg-foreground/20">
      <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-xl">
        <Link href="/" className="rounded font-display text-lg font-medium tracking-[.2em] text-foreground transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
          AIME
        </Link>
        <AppearanceToggle />
        <Link href="/creation" className="rounded-full bg-foreground px-5 py-2 text-xs font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
          Commencer
        </Link>
      </nav>

      <section className="relative overflow-hidden border-b border-border bg-black px-6 pb-20 pt-32 text-center md:pb-24 md:pt-40">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-45"
          style={{ backgroundImage: `url(${getAssetUrl(AIME_VISUALS.universes.patrimoine)})` }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/35 to-black/90" />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-[10px] uppercase tracking-[.35em] text-white/55">Guides AIME</p>
          <h1 className="mt-6 font-display text-4xl font-light leading-tight text-white md:text-6xl">
            Comprendre avant de cliquer.
          </h1>
          <p className="mt-6 text-base font-light leading-relaxed text-white/70 md:text-lg">
            {DEMOS.length} démonstrations animées, dans l&rsquo;ordre réel du mariage. Faites défiler les
            catégories, l&rsquo;animation répond au centre.
          </p>
        </div>
      </section>

      <section className="border-b border-border py-14 md:py-16">
        <GuidesExplorer idPrefix="guides" tone="light" />
      </section>

      <section className="border-b border-border px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Compass className="mx-auto h-5 w-5 text-foreground/45" aria-hidden />
          <h2 className="mt-4 font-display text-2xl font-light md:text-3xl">Un doute, sur place ?</h2>
          <p className="mt-3 text-sm font-light leading-relaxed text-foreground/55">
            Dans votre espace, chaque panneau porte la puce « Expliquer cet écran » et le panneau AI ouvre
            sur l&rsquo;onglet « Me guider ». Ces guides racontent exactement la même chose, sans quitter le site.
          </p>
          <Link href="/creation" className="mt-6 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Créer mon espace
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-12 text-center text-xs text-foreground/40">
        <p>AIME · {new Date().getFullYear()} · Pensé pour garder le contrôle.</p>
      </footer>
    </main>
  );
}

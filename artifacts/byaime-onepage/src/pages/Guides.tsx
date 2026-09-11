import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import { AppearanceToggle } from "@/components/AppearanceToggle";
import { CenteredBlock } from "@/components/CenteredBlock";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, MousePointer2, Compass, Plus, List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMOS, DEMO_CATEGORIES, type DemoConfig } from "./guides-demos";
import { AIME_VISUALS, getAssetUrl } from "@/lib/assets";
import { AIME_SCREENS, type AimeScreenId } from "@/lib/aime-architecture";
import { useRouteMeta } from "@/lib/page-meta";

/*
 * Les guides sont une animation plein cadre, sobre : aucune bande de boutons
 * au-dessus ni au-dessous. Une capsule flottante (à l'image de la capsule
 * temporelle AVANT / JOUR J / APRÈS ou de AI + ME) fait défiler les guides ;
 * son bouton central « + » ouvre le panneau de tous les chapitres.
 */

type ReducedMotionFlag = boolean | null;

const FakeCursor = ({ x, y, active, reducedMotion }: { x: number; y: number; active: boolean; reducedMotion: ReducedMotionFlag }) => {
  if (reducedMotion) return null;
  return (
    <motion.div
      initial={false}
      animate={{ left: `${x}%`, top: `${y}%`, scale: active ? 0.9 : 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, mass: 15 }}
      className="pointer-events-none absolute z-50 drop-shadow-xl"
      style={{ marginLeft: -12, marginTop: -12 }}
    >
      <MousePointer2 className="h-8 w-8 text-foreground fill-background" />
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

/* La capsule flottante de navigation entre guides, calée au bas de l'animation. */
function GuideCapsule({
  index,
  total,
  categoryLabel,
  onPrev,
  onNext,
  onOpenChapters,
}: {
  index: number;
  total: number;
  categoryLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onOpenChapters: () => void;
}) {
  return (
    <div
      role="group"
      aria-label="Faire défiler les guides"
      className="flex items-center gap-1 rounded-full border border-white/20 bg-black/55 p-1 text-white shadow-[0_18px_50px_rgba(0,0,0,.55)] backdrop-blur-xl"
    >
      <button
        type="button"
        data-testid="guide-prev"
        onClick={onPrev}
        aria-label="Guide précédent"
        className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        data-testid="guide-chapters-open"
        onClick={onOpenChapters}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[10px] font-medium uppercase tracking-[.18em] text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Chapitres</span>
        <span className="tabular-nums opacity-55">{index + 1}/{total}</span>
      </button>
      <button
        type="button"
        data-testid="guide-next"
        onClick={onNext}
        aria-label="Guide suivant"
        className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <span className="sr-only">{categoryLabel}</span>
    </div>
  );
}

function ScriptedDemoPlayer({
  config,
  chapter,
}: {
  config: DemoConfig;
  chapter: { index: number; total: number; categoryLabel: string; onPrev: () => void; onNext: () => void; onOpenChapters: () => void };
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(true);
  }, [config.id]);

  useEffect(() => {
    if (!isPlaying || reducedMotion) return;
    const timer = setTimeout(() => {
      setCurrentStep(s => (s + 1) % config.steps.length);
    }, 4500);
    return () => clearTimeout(timer);
  }, [currentStep, isPlaying, config.steps.length, reducedMotion]);

  const step = config.steps[currentStep];

  return (
    <div className="flex flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-card/60 shadow-2xl">
      <div
        className="group relative h-[380px] w-full overflow-hidden border-b border-white/10 bg-background sm:h-[440px]"
        onKeyDown={event => {
          if (event.key === "ArrowLeft") { event.preventDefault(); chapter.onPrev(); }
          if (event.key === "ArrowRight") { event.preventDefault(); chapter.onNext(); }
        }}
        tabIndex={0}
        aria-label={`Animation du guide : ${config.title}. Flèches gauche et droite pour changer de guide.`}
      >
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

        {/* Étiquette sobre : catégorie du guide et position. */}
        <p className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[9px] uppercase tracking-[.2em] text-white/75 backdrop-blur-md">
          {chapter.categoryLabel}
        </p>

        {/* Lecture / replays, discrets en haut à droite. */}
        <div className="absolute right-4 top-4 flex items-center gap-1.5">
          <button
            data-testid="demo-play-pause"
            aria-label={isPlaying ? "Mettre en pause" : "Jouer"}
            onClick={() => setIsPlaying(!isPlaying)}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          <button
            data-testid="demo-replay"
            aria-label="Rejouer la démonstration"
            onClick={() => { setCurrentStep(0); setIsPlaying(true); }}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* La capsule de chapitres, flottante sur l'animation. */}
        <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2">
          <GuideCapsule
            index={chapter.index}
            total={chapter.total}
            categoryLabel={chapter.categoryLabel}
            onPrev={chapter.onPrev}
            onNext={chapter.onNext}
            onOpenChapters={chapter.onOpenChapters}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 bg-card/60 px-6 py-6 text-center">
        <div className="w-full max-w-xl">
          <h3 className="font-display text-xl text-foreground">{step.label}</h3>
          <p className="mt-2 min-h-[3rem] text-sm font-light leading-relaxed text-foreground/60">{step.content}</p>
        </div>

        {/* Segments d'étapes : cliquables, ils remplacent la rangée de boutons. */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Étapes de la démonstration">
          {config.steps.map((stepItem, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={idx === currentStep}
              aria-label={`Étape ${idx + 1} : ${stepItem.label}`}
              onClick={() => { setIsPlaying(false); setCurrentStep(idx); }}
              className={cn(
                "h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                idx === currentStep ? "w-8 bg-foreground" : idx < currentStep ? "w-4 bg-foreground/55 hover:bg-foreground/80" : "w-4 bg-foreground/15 hover:bg-foreground/35",
              )}
            />
          ))}
        </div>
      </div>

      {/* Filet de progression temporel de l'étape courante. */}
      <div className="h-0.5 w-full bg-foreground/10">
        {isPlaying && !reducedMotion && (
          <motion.div
            key={currentStep}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 4.5, ease: "linear" }}
            className="h-full bg-foreground"
            data-testid="demo-progress-active"
          />
        )}
      </div>
    </div>
  );
}

/* ————————————————————————————————————————————————
   Panneau des chapitres : tout le catalogue, sans
   bande de boutons autour de l'animation.
———————————————————————————————————————————————— */

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

function ChapterRow({
  active,
  title,
  description,
  meta,
  screenId,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  meta?: string;
  /** Identifiant d'écran du registre d'architecture, exposé aux tests/lecteurs d'écran. */
  screenId?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-card/50 hover:border-foreground/35 hover:bg-foreground/[.04]",
      )}
    >
      {screenId && <span data-screen-id={screenId} className="sr-only">{screenId}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className={cn("mt-0.5 block truncate text-xs", active ? "text-background/65" : "text-foreground/50")}>{description}</span>
      </span>
      {meta && (
        <span className={cn("shrink-0 text-[9px] uppercase tracking-[.14em]", active ? "text-background/60" : "text-foreground/40")}>{meta}</span>
      )}
      <ChevronRight className={cn("h-4 w-4 shrink-0 transition group-hover:translate-x-0.5", active ? "text-background/70" : "text-foreground/30")} />
    </button>
  );
}

/**
 * Le contenu du panneau des chapitres, rendu directement (sans portail) pour
 * pouvoir être testé en rendu statique et réutilisé.
 */
export function GuideChaptersContent({
  featuredDemos,
  activeDemo,
  onSelect,
  initialTab = "guides",
}: {
  /** Sur l'accueil : seulement les guides en vedette. */
  featuredDemos?: string[];
  activeDemo: string;
  onSelect: (demoId: string) => void;
  initialTab?: "guides" | "screens";
}) {
  const [tab, setTab] = useState<"guides" | "screens">(initialTab);
  const featured = featuredDemos ? new Set(featuredDemos) : null;
  const showScreensTab = !featured;

  const screens = useMemo(() => {
    const all = Object.keys(AIME_SCREENS) as AimeScreenId[];
    if (!featured) return all;
    return all.filter(screenId => {
      const demoId = demoIdForScreen(screenId);
      return demoId !== null && featured.has(demoId);
    });
  }, [featured]);

  return (
    <div data-testid="guide-chapters-content">
      {showScreensTab && (
        <div className="mb-5 inline-flex rounded-full border border-border p-1" role="tablist" aria-label="Type de chapitres">
          {([
            ["guides", "Guides animés", List],
            ["screens", "Écrans expliqués", LayoutGrid],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === id ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      )}

      {tab === "guides" && (
        <div className="space-y-6">
          {DEMO_CATEGORIES.map(category => {
            let demos = DEMOS.filter(demo => demo.category === category.id);
            if (featured) demos = demos.filter(demo => featured.has(demo.id));
            if (!demos.length) return null;
            return (
              <section key={category.id} data-testid={`guide-chapters-group-${category.id}`}>
                <p className="mb-2 text-[9px] uppercase tracking-[.22em] text-foreground/40">{category.label}</p>
                <div className="space-y-2">
                  {demos.map(demo => (
                    <ChapterRow
                      key={demo.id}
                      active={demo.id === activeDemo}
                      title={demo.title}
                      description={demo.description}
                      meta={`${demo.steps.length} étapes`}
                      onClick={() => onSelect(demo.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          {featured && (
            <p className="pt-2 text-center">
              <Link
                href="/guides"
                className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-5 py-2.5 text-xs text-foreground/75 transition hover:bg-foreground/5 hover:text-foreground"
              >
                Tous les guides animés
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </p>
          )}
        </div>
      )}

      {tab === "screens" && showScreensTab && (
        <div className="space-y-6">
          {SCREEN_GROUPS.map(group => {
            const items = screens.filter(group.match);
            if (!items.length) return null;
            return (
              <section key={group.id} data-testid={`guide-chapters-group-${group.id}`}>
                <p className="mb-2 text-[9px] uppercase tracking-[.22em] text-foreground/40">{group.label}</p>
                <div className="space-y-2">
                  {items.map(screenId => {
                    const screen = AIME_SCREENS[screenId];
                    const demoId = demoIdForScreen(screenId);
                    return (
                      <ChapterRow
                        key={screenId}
                        screenId={screenId}
                        active={demoId === activeDemo}
                        title={screen.label}
                        description={screen.purpose}
                        meta={screen.where}
                        onClick={() => demoId && onSelect(demoId)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GuidesExplorer({
  idPrefix = "guides",
  tone: _tone = "light",
  featuredDemos,
}: {
  idPrefix?: string;
  tone?: "light" | "onDark";
  /** Sélection courte pour l'accueil : le catalogue complet vit sur /guides. */
  featuredDemos?: string[];
}) {
  const cycleDemos = useMemo(() => {
    if (!featuredDemos) return DEMOS;
    const featured = new Set(featuredDemos);
    return DEMOS.filter(demo => featured.has(demo.id));
  }, [featuredDemos]);

  const initialDemo = cycleDemos[0]?.id ?? DEMOS[0].id;
  const [activeDemo, setActiveDemo] = useState(initialDemo);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const activeConfig = DEMOS.find(demo => demo.id === activeDemo) ?? cycleDemos[0] ?? DEMOS[0];
  const activeIndex = Math.max(0, cycleDemos.findIndex(demo => demo.id === activeConfig.id));
  const categoryLabel = DEMO_CATEGORIES.find(category => category.id === activeConfig.category)?.label ?? "Guides";

  const selectDemo = (demoId: string) => {
    setActiveDemo(demoId);
    setChaptersOpen(false);
    if (typeof document !== "undefined") {
      document.getElementById(`${idPrefix}-player`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };
  const stepDemo = (direction: 1 | -1) => {
    if (cycleDemos.length < 2) return;
    const nextIndex = (activeIndex + direction + cycleDemos.length) % cycleDemos.length;
    setActiveDemo(cycleDemos[nextIndex].id);
  };

  return (
    <div data-testid={`${idPrefix}-explorer`}>
      <div id={`${idPrefix}-player`} data-testid={`${idPrefix}-player`} className="mx-auto w-full max-w-3xl px-6 md:px-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeConfig.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <ScriptedDemoPlayer
              config={activeConfig}
              chapter={{
                index: activeIndex,
                total: cycleDemos.length,
                categoryLabel,
                onPrev: () => stepDemo(-1),
                onNext: () => stepDemo(1),
                onOpenChapters: () => setChaptersOpen(true),
              }}
            />
          </motion.div>
        </AnimatePresence>
        <p className="mt-4 text-center text-sm font-light leading-relaxed text-white/60">
          {activeConfig.description}
        </p>
      </div>

      {chaptersOpen && (
        <CenteredBlock
          eyebrow="Guides"
          title="Tous les chapitres"
          description={featuredDemos ? "Les six repères de l’accueil. Le catalogue complet vous attend sur la page Guides." : "Choisissez un guide animé, ou parcourez chaque écran expliqué."}
          onClose={() => setChaptersOpen(false)}
          size="lg"
          testId={`${idPrefix}-chapters-panel`}
          showGuideHint={false}
        >
          <GuideChaptersContent featuredDemos={featuredDemos} activeDemo={activeDemo} onSelect={selectDemo} />
        </CenteredBlock>
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

      <section className="relative overflow-hidden border-b border-border bg-black px-6 pb-16 pt-32 text-center md:pb-20 md:pt-40">
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
            {DEMOS.length} démonstrations animées, dans l&rsquo;ordre réel du mariage. Faites-les défiler avec la
            capsule, ou ouvrez les chapitres avec le bouton central.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-14 md:py-20">
        <GuidesExplorer idPrefix="guides" tone="onDark" />
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

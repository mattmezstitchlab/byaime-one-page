import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, MousePointer2, User, Globe2, FlaskConical, Plus, Shield, PenLine, Settings, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DemoStep = {
  label: string;
  content: string;
  ui: React.ReactNode;
  cursor: { x: number; y: number };
};

type DemoConfig = {
  id: string;
  title: string;
  description: string;
  steps: DemoStep[];
};

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

// Fake UIs for Demos
const ProfileFakeUI = () => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-card/50">
    <div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center mb-6">
      <User className="w-8 h-8 text-foreground/40" />
    </div>
    <h3 className="font-display text-2xl mb-2">Votre Profil</h3>
    <p className="text-sm text-foreground/50 max-w-xs">Vos informations personnelles, vos souvenirs et votre Timeline centralisée.</p>
    <div className="mt-8 w-full max-w-sm space-y-3">
      <div className="h-16 w-full rounded-xl bg-foreground/5 border border-border" />
      <div className="h-16 w-full rounded-xl bg-foreground/5 border border-border" />
    </div>
  </div>
);

const WorldFakeUI = () => (
  <div className="flex flex-col h-full bg-card/50 p-6">
    <div className="flex items-center gap-4 mb-8">
      <div className="w-12 h-12 rounded-xl bg-brand-accent/20 flex items-center justify-center border border-brand-accent/30">
        <Globe2 className="w-6 h-6 text-brand-accent" />
      </div>
      <div>
        <h3 className="font-display text-xl">Mariage · 2025</h3>
        <p className="text-xs text-foreground/50 uppercase tracking-widest">Le Monde Actif</p>
      </div>
    </div>
    <div className="flex-1 rounded-2xl border border-border bg-background p-4 relative overflow-hidden">
       <div className="absolute top-0 bottom-0 left-8 w-px bg-border" />
       <div className="space-y-6 mt-4 ml-6">
         {[1, 2, 3].map(i => (
           <div key={i} className="relative flex items-center gap-4">
              <div className="absolute -left-[33px] w-4 h-4 rounded-full bg-background border-2 border-foreground/30" />
              <div className="h-12 w-full rounded-xl bg-foreground/5" />
           </div>
         ))}
       </div>
    </div>
  </div>
);

const LaboratoryFakeUI = () => (
  <div className="flex flex-col items-center justify-center h-full bg-card/50 p-8 text-center">
    <div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center mb-6">
      <FlaskConical className="w-8 h-8 text-foreground/40" />
    </div>
    <h3 className="font-display text-2xl mb-2">Le Laboratoire</h3>
    <p className="text-sm text-foreground/50 max-w-xs">Vos retours volontaires, reliés à leur contexte, pour améliorer AIME sans se substituer à vos données.</p>
    <div className="mt-8 w-full max-w-sm space-y-3">
      <div className="h-12 w-full rounded-xl bg-foreground/5 border border-border" />
      <div className="h-12 w-full rounded-xl bg-foreground/5 border border-border" />
      <div className="h-12 w-full rounded-xl bg-foreground/5 border border-border" />
    </div>
  </div>
);

const ActionPillFakeUI = ({ focus }: { focus: 'ai' | 'plus' | 'me' }) => (
  <div className="flex flex-col items-center justify-center h-full bg-card/50 p-6 relative">
    <div className="mb-12 w-full max-w-md">
       <AnimatePresence mode="wait">
         {focus === 'ai' && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 rounded-2xl border border-border bg-background shadow-xl">
             <h3 className="font-display text-lg mb-2">Que souhaitez-vous faire ?</h3>
             <div className="h-10 w-full rounded-lg bg-foreground/5 mb-4" />
             <div className="flex gap-2"><div className="h-6 w-24 rounded bg-foreground/10" /><div className="h-6 w-32 rounded bg-foreground/10" /></div>
           </motion.div>
         )}
         {focus === 'plus' && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 rounded-2xl border border-border bg-background shadow-xl">
             <h3 className="font-display text-lg mb-4">Créer ou relier</h3>
             <div className="grid grid-cols-2 gap-3">
                <div className="h-24 rounded-xl bg-foreground/5" />
                <div className="h-24 rounded-xl bg-foreground/5" />
             </div>
           </motion.div>
         )}
         {focus === 'me' && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 rounded-2xl border border-border bg-background shadow-xl">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-foreground/10" />
                <div><div className="h-4 w-32 bg-foreground/20 rounded mb-2" /><div className="h-3 w-48 bg-foreground/10 rounded" /></div>
             </div>
             <div className="h-12 w-full rounded-xl border border-border mb-2" />
             <div className="h-12 w-full rounded-xl border border-border" />
           </motion.div>
         )}
       </AnimatePresence>
    </div>

    <div className="flex items-center gap-1.5 rounded-full border border-border/40 bg-background/80 p-1 shadow-2xl">
      <div className={cn("px-5 py-2 rounded-full text-sm font-display font-medium", focus === 'ai' ? "bg-foreground/10 text-foreground" : "text-foreground/50")}>AI</div>
      <div className={cn("w-12 h-10 rounded-full flex items-center justify-center transition-all", focus === 'plus' ? "bg-brand-accent text-brand-accent-foreground shadow-[0_0_15px_hsl(var(--brand-accent)/0.4)]" : "bg-foreground/5 text-foreground/50")}>
        <Plus className="w-5 h-5" />
      </div>
      <div className={cn("px-5 py-2 rounded-full text-sm font-display font-medium", focus === 'me' ? "bg-foreground/10 text-foreground" : "text-foreground/50")}>ME</div>
    </div>
  </div>
);


const CreateMondeFakeUI = ({ step }: { step: number }) => (
  <div className="flex flex-col items-center justify-center h-full p-8 bg-card/50 relative">
    <AnimatePresence mode="wait">
       {step === 0 && (
         <motion.div key="btn" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="p-4 rounded-2xl border border-border bg-background shadow-xl flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-brand-accent text-brand-accent-foreground flex items-center justify-center"><Plus className="w-6 h-6" /></div>
           <div><p className="font-display font-medium text-foreground">Nouveau Monde</p><p className="text-xs text-foreground/50">Créer un espace vierge</p></div>
         </motion.div>
       )}
       {step === 1 && (
         <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-sm p-6 rounded-2xl border border-border bg-background shadow-xl">
           <h3 className="font-display text-lg mb-4 text-foreground">Créer votre Monde</h3>
           <div className="space-y-4">
              <div><div className="text-[10px] uppercase text-foreground/40 mb-1">Titre</div><div className="h-10 w-full rounded border border-border bg-foreground/5" /></div>
              <div><div className="text-[10px] uppercase text-foreground/40 mb-1">Type</div><div className="h-10 w-full rounded border border-border bg-foreground/5" /></div>
              <div className="h-10 w-full rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium mt-2">Continuer</div>
           </div>
         </motion.div>
       )}
       {step === 2 && (
         <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="w-full max-w-sm p-8 rounded-2xl border border-border bg-background shadow-xl flex flex-col items-center text-center">
           <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4"><CheckCircle2 className="w-8 h-8" /></div>
           <h3 className="font-display text-xl mb-2 text-foreground">Monde créé</h3>
            <p className="text-sm text-foreground/60 mb-6">Votre nouvel espace est prêt à être organisé.</p>
           <div className="h-10 w-full rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium">Entrer</div>
         </motion.div>
       )}
    </AnimatePresence>
  </div>
);

const RolesFakeUI = ({ role }: { role: 'owner' | 'planner' | 'family' | 'viewer' }) => (
  <div className="flex flex-col h-full bg-card/50 p-6 relative">
    <div className="flex items-center gap-4 mb-6 border-b border-border pb-4">
      <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center">
        <User className="w-6 h-6 text-foreground/60" />
      </div>
      <div>
        <h3 className="font-display text-lg capitalize text-foreground">{role === 'owner' ? 'Propriétaire' : role === 'planner' ? 'Planificateur' : role === 'family' ? 'Proche (Famille)' : 'Invité (Vue restreinte)'}</h3>
        <p className="text-xs text-foreground/50">Limites d'accès simulées</p>
      </div>
    </div>
    <div className="flex-1 space-y-4">
      {role === 'owner' && (
        <>
          <div className="p-4 rounded-xl bg-foreground/5 border border-border flex items-center gap-3 text-foreground/80 text-sm"><Settings className="w-5 h-5 text-brand-accent shrink-0" /> Voit les finances et peut publier ou supprimer le Monde.</div>
          <div className="p-4 rounded-xl bg-foreground/5 border border-border flex items-center gap-3 text-foreground/80 text-sm"><PenLine className="w-5 h-5 shrink-0" /> Pilote les accès et l’ensemble du contenu du Monde.</div>
        </>
      )}
      {role === 'planner' && (
        <>
          <div className="p-4 rounded-xl bg-foreground/5 border border-border flex items-center gap-3 text-foreground/80 text-sm"><PenLine className="w-5 h-5 shrink-0" /> Organise les tâches, prestataires, invités et Moments partagés.</div>
          <div className="p-4 rounded-xl bg-destructive/5 text-destructive/80 border border-destructive/20 flex items-center gap-3 text-sm"><Shield className="w-5 h-5 shrink-0" /> Peut gérer les documents, mais ne voit pas les finances et ne peut pas supprimer ou publier le Monde.</div>
        </>
      )}
      {role === 'family' && (
        <>
          <div className="p-4 rounded-xl bg-foreground/5 border border-border flex items-center gap-3 text-foreground/80 text-sm"><Globe2 className="w-5 h-5 shrink-0" /> Collabore sur le programme et l’organisation partagée.</div>
          <div className="p-4 rounded-xl bg-destructive/5 text-destructive/80 border border-destructive/20 flex items-center gap-3 text-sm"><Shield className="w-5 h-5 shrink-0" /> Finances, documents et Moments privés restent masqués.</div>
        </>
      )}
      {role === 'viewer' && (
        <>
          <div className="p-4 rounded-xl bg-foreground/5 border border-border flex items-center gap-3 text-foreground/80 text-sm"><User className="w-5 h-5 shrink-0" /> Consultation en lecture des informations partagées dans le Monde.</div>
          <div className="p-4 rounded-xl bg-destructive/5 text-destructive/80 border border-destructive/20 flex items-center gap-3 text-sm"><Shield className="w-5 h-5 shrink-0" /> Finances, documents, prestataires, tâches et Moments non destinés à l’audience restent masqués.</div>
        </>
      )}
    </div>
  </div>
);

const DEMOS: DemoConfig[] = [
  {
    id: "architecture",
    title: "Un seul système, plusieurs réalités",
    description: "Votre vie n'est pas une succession de tableaux de bord jetables. Découvrez comment Profil, Monde et Laboratoire interagissent durablement.",
    steps: [
      { label: "Profil", content: "Votre identité durable. Une projection unique qui réunit ce qui vous concerne à travers tous les Mondes.", ui: <ProfileFakeUI />, cursor: { x: 15, y: 30 } },
      { label: "Monde", content: "L'espace collaboratif et privé. C'est ici que s'organise l'événement avec les rôles stricts et les outils dédiés.", ui: <WorldFakeUI />, cursor: { x: 50, y: 50 } },
      { label: "Laboratoire", content: "Le recueil de vos retours volontaires, reliés à leur contexte, pour faire évoluer AIME sans mélanger vos données et vos remarques.", ui: <LaboratoryFakeUI />, cursor: { x: 85, y: 70 } }
    ]
  },
  {
    id: "creation",
    title: "Créer un Monde",
    description: "Le point de départ d'une nouvelle réalité organisée, de l'intention à l'espace prêt à l'emploi.",
    steps: [
      { label: "L'impulsion", content: "Initiez un nouveau projet depuis votre interface globale grâce au bouton universel +.", ui: <CreateMondeFakeUI step={0} />, cursor: { x: 50, y: 50 } },
      { label: "Configuration", content: "Définissez le contexte. Le Monde est créé en privé et sa publication reste un choix du propriétaire.", ui: <CreateMondeFakeUI step={1} />, cursor: { x: 50, y: 70 } },
      { label: "Confirmation", content: "Le Monde est prêt. Un espace dédié à ce projet s'ouvre à vous.", ui: <CreateMondeFakeUI step={2} />, cursor: { x: 50, y: 80 } }
    ]
  },
  {
    id: "roles",
    title: "Les Rôles et Frontières",
    description: "Quatre rôles font varier les actions disponibles et masquent les informations d’organisation sensibles.",
    steps: [
      { label: "Propriétaire", content: "Le créateur du Monde. Lui seul voit les finances et peut publier ou supprimer cet espace.", ui: <RolesFakeUI role="owner" />, cursor: { x: 20, y: 30 } },
      { label: "Planificateur", content: "Un co-pilote qui organise les éléments partagés, les accès et les documents sans voir les finances ni disposer des actions réservées au propriétaire.", ui: <RolesFakeUI role="planner" />, cursor: { x: 40, y: 40 } },
      { label: "Proche (Famille)", content: "Un rôle de collaboration sur le programme et la logistique partagés, sans finances, documents ni Moments privés.", ui: <RolesFakeUI role="family" />, cursor: { x: 60, y: 50 } },
      { label: "Invité", content: "Un accès en lecture au Monde dont les informations d’organisation sensibles sont masquées. Le lien RSVP personnel reste un parcours séparé.", ui: <RolesFakeUI role="viewer" />, cursor: { x: 80, y: 60 } }
    ]
  },
  {
    id: "ai-plus-me",
    title: "AI · + · ME",
    description: "Le centre de contrôle cinématique d'AIME, accessible depuis n'importe quel écran.",
    steps: [
      { label: "Comprendre", content: "Demandez à l'AI de vérifier un horaire, d'analyser un conflit ou de rédiger une relance sans agir à votre place.", ui: <ActionPillFakeUI focus="ai" />, cursor: { x: 42, y: 88 } },
      { label: "Créer", content: "Le bouton + centralise toute création ou liaison de donnée dans le Monde actif de façon contextuelle.", ui: <ActionPillFakeUI focus="plus" />, cursor: { x: 50, y: 88 } },
      { label: "Contrôler", content: "ME est votre espace souverain. Gérez vos accès, votre sécurité, vos exports et passez d'un Monde à l'autre.", ui: <ActionPillFakeUI focus="me" />, cursor: { x: 58, y: 88 } }
    ]
  }
];

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

      <section className="px-6 pb-40 max-w-6xl mx-auto grid lg:grid-cols-[280px_1fr] gap-12 items-start">
         <div className="sticky top-24 space-y-2 hidden lg:block">
            {DEMOS.map(demo => (
              <button
                key={demo.id}
                data-testid={`demo-select-${demo.id}-desktop`}
                onClick={() => setActiveDemo(demo.id)}
                className={cn(
                  "block w-full text-left px-5 py-4 rounded-2xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none",
                  activeDemo === demo.id ? "bg-foreground text-background shadow-xl" : "bg-card/50 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                )}
              >
                 <span className="block font-display text-lg mb-1">{demo.title}</span>
                 <span className={cn("block text-xs leading-relaxed opacity-80", activeDemo === demo.id ? "text-background/80" : "text-foreground/40")}>{demo.description}</span>
              </button>
            ))}
         </div>
         
         {/* Mobile selector */}
         <div className="lg:hidden flex overflow-x-auto gap-3 pb-4 hide-scrollbar snap-x">
            {DEMOS.map(demo => (
              <button
                key={demo.id}
                data-testid={`demo-select-${demo.id}-mobile`}
                onClick={() => setActiveDemo(demo.id)}
                className={cn(
                  "shrink-0 w-72 text-left px-5 py-4 rounded-2xl transition-all duration-300 snap-center focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none",
                  activeDemo === demo.id ? "bg-foreground text-background" : "bg-card/50 text-foreground/60"
                )}
              >
                 <span className="block font-display text-lg mb-1 truncate">{demo.title}</span>
                 <span className={cn("block text-xs line-clamp-2", activeDemo === demo.id ? "text-background/80" : "text-foreground/40")}>{demo.description}</span>
              </button>
            ))}
         </div>

         <div className="min-w-0">
            <AnimatePresence mode="wait">
               {DEMOS.map(demo => demo.id === activeDemo && (
                 <motion.div
                   key={demo.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -20 }}
                   transition={{ duration: 0.4 }}
                 >
                    <ScriptedDemoPlayer config={demo} />
                 </motion.div>
               ))}
            </AnimatePresence>
         </div>
      </section>
      
      <footer className="border-t border-border px-6 py-12 text-center text-xs text-foreground/40">
        <p>AIME · {new Date().getFullYear()} · Pensé pour garder le contrôle.</p>
      </footer>
    </main>
  );
}

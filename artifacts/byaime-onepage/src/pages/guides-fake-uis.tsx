import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, CalendarDays, CheckCircle2, Check, Clock, Copy, Eye, EyeOff, FolderOpen, Globe2,
  Heart, Image as ImageIcon, Link2, ListChecks, Lock, MapPin, Music, PenLine, Plus, Send, Settings,
  Shield, User, Users, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ————————————————————————————————————————————————
   Primitives — reprennent les vrais tokens visuels de l'app
   (bg-foreground/[.035], border-foreground/10, text-[8px] uppercase tracking, etc.)
———————————————————————————————————————————————— */

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("rounded-lg bg-foreground/5", className)} />
);

const Chip = ({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "ok" | "warn" | "brand" | "danger" }) => {
  const tones = {
    muted: "border-foreground/10 text-foreground/55",
    ok: "border-emerald-400/30 text-emerald-300",
    warn: "border-amber-300/30 text-amber-200",
    brand: "border-brand-accent/40 text-brand-accent",
    danger: "border-destructive/30 text-destructive",
  } as const;
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[.12em]", tones[tone])}>
      {children}
    </span>
  );
};

const Row = ({ icon: Icon, title, meta, right }: { icon?: typeof User; title: ReactNode; meta?: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[.035] p-3">
    {Icon && <Icon className="h-4 w-4 shrink-0 text-foreground/35" />}
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs">{title}</p>
      {meta && <p className="mt-0.5 truncate text-[10px] text-foreground/45">{meta}</p>}
    </div>
    {right}
  </div>
);

const NAV_PILL = "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[8px] uppercase tracking-[.13em]";

/** Cadre qui reproduit l'écran du Monde : barre de navigation + hero + contenu. */
function AppFrame({ nav, active, eyebrow, title, subtitle, children }: {
  nav: string[]; active: string; eyebrow: string; title: string; subtitle?: string; children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col bg-card/50 p-4 sm:p-5">
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar border-b border-border/60 pb-2.5">
        {nav.map(item => (
          <span key={item} className={cn(NAV_PILL, item === active ? "border-foreground bg-foreground text-background" : "border-foreground/10 text-foreground/60")}>{item}</span>
        ))}
      </div>
      <div className="pt-3 pb-2.5">
        <p className="text-[8px] uppercase tracking-[.28em] text-foreground/40">{eyebrow}</p>
        <h4 className="mt-1 font-display text-base leading-tight sm:text-lg">{title}</h4>
        {subtitle && <p className="mt-1 text-[10px] font-light leading-relaxed text-foreground/55">{subtitle}</p>}
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-hidden">{children}</div>
    </div>
  );
}

const PhaseChips = ({ active }: { active: "avant" | "pendant" | "apres" }) => (
  <div className="flex gap-1.5">
    {(["avant", "pendant", "apres"] as const).map(p => (
      <span key={p} className={cn(
        "rounded-full border px-2.5 py-1 text-[8px] uppercase tracking-[.14em]",
        p === active ? "border-foreground bg-foreground text-background" : "border-foreground/15 text-foreground/45",
      )}>
        {p === "avant" ? "Avant" : p === "pendant" ? "Le Jour J" : "Après"}
      </span>
    ))}
  </div>
);

const NAV_WEDDING = ["Timeline", "Personnes", "Prestataires", "Tâches", "Documents", "Finances", "Musique"];

/* ————————————————————————————————————————————————
   Démos existantes (déplacées telles quelles)
———————————————————————————————————————————————— */

export const ProfileFakeUI = () => (
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

export const WorldFakeUI = () => (
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

export const ActionPillFakeUI = ({ focus }: { focus: 'ai' | 'plus' | 'me' }) => (
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

export const CreateMondeFakeUI = ({ step }: { step: number }) => (
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

export const RolesFakeUI = ({ role }: { role: 'owner' | 'planner' | 'family' | 'viewer' }) => (
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

/* ————————————————————————————————————————————————
   Nouveaux tutoriels — répliques fidèles des écrans réels
———————————————————————————————————————————————— */

const MOMENTS = [
  { title: "Fiançailles", meta: "Samedi 18 mai · Salle des fêtes · Vous" },
  { title: "Choisir le traiteur", meta: "Vendredi 7 juin · Dégustation · Planificateur" },
  { title: "Essai coiffure", meta: "Mardi 25 juin · Atelier · Vous" },
];

export const TimelineFakeUI = ({ step }: { step: number }) => {
  const activeNav = step === 2 ? "Musique" : "Timeline";
  return (
    <AppFrame nav={NAV_WEDDING} active={activeNav} eyebrow="Avant · Préparation" title="Mariage · Samedi 18 septembre" subtitle="Une seule ligne de temps, de la première idée au Jour J.">
      <PhaseChips active={step === 2 ? "apres" : "avant"} />
      <div className="space-y-1.5 pt-1">
        {MOMENTS.map((m, i) => (
          <div key={m.title} className={cn("relative flex items-center gap-3 rounded-xl border p-3", i === step ? "border-foreground/25 bg-foreground/[.06]" : "border-foreground/10 bg-foreground/[.035] opacity-60")}>
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", i === step ? "border-foreground bg-foreground text-background" : "border-foreground/30 text-foreground/40")}>
              <Clock className="h-3 w-3" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs">{m.title}</p>
              <p className="truncate text-[10px] text-foreground/45">{m.meta}</p>
            </div>
            <Chip tone={i === 0 ? "ok" : i === 1 ? "warn" : "muted"}>{i === 0 ? "Confirmé" : i === 1 ? "À valider" : "À venir"}</Chip>
          </div>
        ))}
      </div>
      {step === 2 && (
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-[10px] text-amber-100/70">
          La destination « Musique » reste la projection sonore de la Timeline, pas une simple playlist.
        </div>
      )}
    </AppFrame>
  );
};

export const GuestsFakeUI = ({ step }: { step: number }) => (
  <AppFrame nav={NAV_WEDDING} active="Personnes" eyebrow="Personnes" title="Liste des invités" subtitle="Groupes, régimes et besoins importants.">
    {step === 0 && (
      <div className="space-y-2">
        {[
          { name: "Camille & Hugo", meta: "Témoins · table d'honneur", tone: "ok", chip: "Oui" },
          { name: "La famille Martin", meta: "6 personnes · 1 enfant", tone: "warn", chip: "En attente" },
          { name: "Julie Bernard", meta: "Végétarienne · accès PMR", tone: "muted", chip: "Oui" },
        ].map(g => (
          <Row key={g.name} icon={Users} title={g.name} meta={g.meta} right={<Chip tone={g.tone as "ok" | "warn" | "muted"}>{g.chip}</Chip>} />
        ))}
      </div>
    )}
    {step === 1 && (
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-foreground/10 bg-foreground/[.035] p-3">
          <p className="text-xs">Réponses RSVP</p>
          <div className="flex gap-1.5">
            <Chip tone="ok">Oui · 42</Chip>
            <Chip tone="warn">En attente · 6</Chip>
            <Chip tone="danger">Non · 3</Chip>
          </div>
        </div>
        {["Régime sans gluten", "Chaise haute demandée", "Allergie arachides"].map((besoin, i) => (
          <Row key={besoin} icon={i === 0 ? ListChecks : i === 1 ? Heart : Shield} title={besoin} meta="Besoin signalé par l'invité" />
        ))}
      </div>
    )}
    {step === 2 && (
      <div className="flex h-full flex-col justify-center gap-3">
        <div className="rounded-2xl border border-foreground/10 bg-background p-4">
          <p className="text-[10px] uppercase tracking-widest text-foreground/40">Lien RSVP personnel</p>
          <div className="mt-2 flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-foreground/45" />
            <span className="min-w-0 flex-1 truncate text-[10px] text-foreground/70">byaime.fr/rsvp/camille-hugo</span>
            <Copy className="h-3.5 w-3.5 shrink-0 text-foreground/45" />
          </div>
          <p className="mt-2 text-[10px] text-foreground/45">Chaque invité répond sans jamais accéder au Monde.</p>
        </div>
      </div>
    )}
  </AppFrame>
);

export const BudgetFakeUI = ({ step }: { step: number }) => (
  <AppFrame nav={NAV_WEDDING} active="Finances" eyebrow="Finances" title="Budget & engagements" subtitle="Dépenses, paiements et échéances réunis.">
    <div className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-foreground/40">Budget engagé</p>
          <p className="mt-1 font-display text-xl">14 200 € <span className="text-xs text-foreground/40">/ 20 000 €</span></p>
        </div>
        <Chip tone="ok">71 %</Chip>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div className="h-full w-[71%] rounded-full bg-foreground" />
      </div>
    </div>
    <div className="space-y-2">
      {step >= 1 && (
        <>
          <Row icon={Wallet} title="Traiteur — acompte 30 %" meta="Échéance · 15 juillet" right={<Chip>1 800 €</Chip>} />
          <Row icon={Wallet} title="Photographe — solde" meta="Échéance · 10 septembre" right={<Chip tone="warn">1 200 €</Chip>} />
        </>
      )}
      {step >= 2 && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
          <Lock className="h-4 w-4 shrink-0 text-destructive/70" />
          <p className="text-[10px] text-destructive/80">Seuls le Propriétaire et le Planificateur voient les finances.</p>
        </div>
      )}
      {step < 1 && <Skeleton className="h-16 w-full" />}
    </div>
  </AppFrame>
);

export const ProvidersFakeUI = ({ step }: { step: number }) => (
  <AppFrame nav={NAV_WEDDING} active="Prestataires" eyebrow="Prestataires" title="Les professionnels" subtitle="Contacts, décisions et prochaines actions.">
    <div className="space-y-2">
      {[
        { name: "Maison Pichon — Traiteur", meta: "Dégustation validée · menu signé", tone: "ok", chip: "Engagé" },
        { name: "Atelier Lumière — Photographe", meta: "Devis reçu · à comparer", tone: "warn", chip: "À décider" },
        { name: "DJ Horizon", meta: "Recherche en cours", tone: "muted", chip: "À trouver" },
      ].map((p, i) => (
        <Row key={p.name} icon={Globe2} title={p.name} meta={p.meta} right={<Chip tone={p.tone as "ok" | "warn" | "muted"}>{p.chip}</Chip>} />
      ))}
    </div>
    {step === 2 && (
      <div className="flex items-center justify-between rounded-xl border border-foreground/10 bg-foreground/[.035] p-3">
        <p className="text-xs">Il reste à trouver</p>
        <Chip tone="brand">2 professionnels</Chip>
      </div>
    )}
  </AppFrame>
);

export const TasksFakeUI = ({ step }: { step: number }) => (
  <AppFrame nav={NAV_WEDDING} active="Tâches" eyebrow="Tâches" title="Ce qu'il reste à préparer" subtitle="Classé, daté, à valider.">
    <div className="space-y-2">
      {[
        { title: "Confirmer le traiteur", meta: "Échéance · 15 juillet", done: true },
        { title: "Envoyer les faire-part", meta: "Échéance · 1er août", done: true },
        { title: "Choisir les alliances", meta: "Échéance · 20 août", done: false },
      ].map(t => (
        <div key={t.title} className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[.035] p-3">
          <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", t.done ? "border-foreground bg-foreground text-background" : "border-foreground/25")}>
            {t.done && <Check className="h-3 w-3" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-xs", t.done && "text-foreground/45 line-through")}>{t.title}</p>
            <p className="truncate text-[10px] text-foreground/40">{t.meta}</p>
          </div>
        </div>
      ))}
    </div>
    {step === 1 && (
      <div className="rounded-xl border border-foreground/10 bg-foreground/[.035] p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-foreground/40">Progression du Monde</p>
          <Chip tone="ok">67 %</Chip>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full w-[67%] rounded-full bg-foreground" />
        </div>
      </div>
    )}
  </AppFrame>
);

export const DocumentsFakeUI = ({ step }: { step: number }) => (
  <AppFrame nav={NAV_WEDDING} active="Documents" eyebrow="Documents" title="Fichiers privés" subtitle="Les documents reliés à ce Monde.">
    <div className="space-y-2">
      <Row icon={FolderOpen} title="Contrat — traiteur.pdf" meta="Signé · 2,1 Mo" right={<Lock className="h-3.5 w-3.5 text-foreground/35" />} />
      <Row icon={FolderOpen} title="Liste des invités.xlsx" meta="À jour · 240 Ko" right={<Lock className="h-3.5 w-3.5 text-foreground/35" />} />
    </div>
    {step >= 1 && (
      <div className="rounded-2xl border border-foreground/10 bg-background p-4">
        <p className="text-[10px] uppercase tracking-widest text-foreground/40">AIME LOCAL</p>
        <p className="mt-2 text-[10px] text-foreground/55">Importez depuis votre dossier local, sans tout re-saisir.</p>
        <div className="mt-2 flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-2">
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-foreground/45" />
          <span className="min-w-0 flex-1 truncate text-[10px] text-foreground/70">/Users/marie/Documents/Mariage</span>
          <Chip tone="brand">Scanner</Chip>
        </div>
      </div>
    )}
    {step >= 2 && (
      <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[.035] p-3">
        <Shield className="h-4 w-4 shrink-0 text-foreground/40" />
        <p className="text-[10px] text-foreground/55">Servis sans cache public · transfert par jeton court et signé.</p>
      </div>
    )}
  </AppFrame>
);

export const MessagesFakeUI = ({ step }: { step: number }) => (
  <AppFrame nav={NAV_WEDDING} active="Messages" eyebrow="Messages" title="Invitations & relances" subtitle="Préparés une fois, envoyés après confirmation.">
    <div className="space-y-2">
      {[
        { title: "Faire-part", meta: "Modèle · 48 destinataires", status: "Envoyé" },
        { title: "Rappel RSVP", meta: "Modèle · 6 destinataires", status: "Programmé" },
      ].map(m => (
        <Row key={m.title} icon={Send} title={m.title} meta={m.meta} right={<Chip tone={m.status === "Envoyé" ? "ok" : "warn"}>{m.status}</Chip>} />
      ))}
    </div>
    {step >= 1 && (
      <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3">
        <p className="text-[10px] text-amber-100/80">L'envoi ne partira qu'après votre confirmation explicite.</p>
        <div className="mt-2 flex gap-2">
          <span className="rounded-full border border-foreground/15 px-3 py-1.5 text-[9px] uppercase tracking-wider text-foreground/55">Annuler</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[9px] uppercase tracking-wider text-background">
            <Send className="h-3 w-3" /> Confirmer et envoyer
          </span>
        </div>
      </div>
    )}
    {step >= 2 && (
      <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[.035] p-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
        <p className="text-[10px] text-foreground/60">Faire-part · envoyé le 2 août · relié à « Annonce du mariage »</p>
      </div>
    )}
  </AppFrame>
);

export const MusicFakeUI = ({ step }: { step: number }) => (
  <AppFrame nav={NAV_WEDDING} active="Musique" eyebrow="Musique" title="Morceaux reliés" subtitle="Chaque morceau se relie à un ou plusieurs Moments.">
    <div className="space-y-2">
      {[
        { title: "La Vie en rose", meta: "Entrée des mariés · Édith Piaf", status: "Validé", tone: "ok" },
        { title: "First Dance", meta: "Première danse · à choisir", status: "À choisir", tone: "warn" },
      ].map(t => (
        <Row key={t.title} icon={Music} title={t.title} meta={t.meta} right={<Chip tone={t.tone as "ok" | "warn"}>{t.status}</Chip>} />
      ))}
    </div>
    {step === 1 && (
      <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-[10px] text-amber-100/70">
        La destination majeure « Musique » reste la projection sonore de la Timeline, pas une simple playlist.
      </div>
    )}
  </AppFrame>
);

export const SeatingFakeUI = ({ step }: { step: number }) => (
  <AppFrame nav={[...NAV_WEDDING, "Plan de table"]} active="Plan de table" eyebrow="Plan de table" title="Tables & placements" subtitle="Capacités, places et voisinages.">
    <div className="grid grid-cols-2 gap-2">
      {[
        { name: "Table d'honneur", seats: "8 places · 8 placées" },
        { name: "Table des amis", seats: "10 places · 7 placées" },
      ].map((t, i) => (
        <div key={t.name} className={cn("rounded-2xl border p-3", i === step ? "border-foreground/25 bg-foreground/[.06]" : "border-foreground/10 bg-foreground/[.035] opacity-70")}>
          <p className="text-xs">{t.name}</p>
          <p className="mt-1 text-[10px] text-foreground/45">{t.seats}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {Array.from({ length: 4 }).map((_, s) => (
              <span key={s} className="h-5 w-5 rounded-full border border-foreground/15 bg-foreground/5" />
            ))}
          </div>
        </div>
      ))}
    </div>
    {step === 1 && (
      <div className="rounded-xl border border-foreground/10 bg-foreground/[.035] p-3 text-[10px] text-foreground/55">
        Déplacez chaque invité d'une table à l'autre — le plan se met à jour en direct.
      </div>
    )}
  </AppFrame>
);

export const CeremonyFakeUI = ({ step }: { step: number }) => (
  <AppFrame nav={[...NAV_WEDDING, "Cérémonie"]} active="Cérémonie" eyebrow="Cérémonie & réception" title="Le déroulé du Jour J" subtitle="Structure, lectures, vœux et menu.">
    {step === 0 && (
      <div className="space-y-1.5">
        {["Arrivée des invités", "Entrée des mariés", "Échange des vœux", "Cocktail"].map((s, i) => (
          <div key={s} className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[.035] p-2.5">
            <span className="text-[10px] font-mono text-foreground/30">{String(i + 1).padStart(2, "0")}</span>
            <p className="text-xs">{s}</p>
          </div>
        ))}
      </div>
    )}
    {step === 1 && (
      <div className="space-y-2">
        <div className="rounded-xl border border-foreground/10 bg-foreground/[.035] p-3">
          <p className="text-xs">Lecture — « Extrait choisi »</p>
          <p className="mt-1 text-[10px] text-foreground/45">Lucie, témoin</p>
        </div>
        <div className="rounded-xl border border-foreground/10 bg-foreground/[.035] p-3">
          <p className="text-xs">Vœux de Marie</p>
          <p className="mt-1 text-[10px] text-foreground/45">Brouillon en cours</p>
        </div>
      </div>
    )}
    {step === 2 && (
      <div className="grid grid-cols-2 gap-2">
        {["Menu", "Boissons", "Gâteau", "Première danse"].map(f => (
          <div key={f} className="rounded-xl border border-foreground/10 bg-foreground/[.035] p-3">
            <p className="text-[9px] uppercase tracking-widest text-foreground/40">{f}</p>
            <Skeleton className="mt-2 h-3 w-3/4" />
          </div>
        ))}
      </div>
    )}
  </AppFrame>
);

export const DayofFakeUI = ({ step }: { step: number }) => (
  <AppFrame nav={NAV_WEDDING} active="Régie" eyebrow="Le Jour J · En direct" title="Régie du Jour J" subtitle="Le programme opérationnel, en direct.">
    <div className="space-y-2">
      {[
        { title: "Ouverture des portes", meta: "14:00 · Accueil", live: false },
        { title: "Cérémonie", meta: "15:00 · Salle des fêtes · Officiant", live: true },
        { title: "Cocktail", meta: "16:30 · Jardin", live: false },
      ].map(e => (
        <div key={e.title} className={cn("flex items-center gap-3 rounded-xl border p-3", e.live ? "border-brand-accent/40 bg-brand-accent/5" : "border-foreground/10 bg-foreground/[.035]")}>
          <Clock className="h-4 w-4 shrink-0 text-foreground/35" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs">{e.title}</p>
            <p className="truncate text-[10px] text-foreground/45">{e.meta}</p>
          </div>
          {e.live ? <Chip tone="brand">Maintenant</Chip> : <Chip>À venir</Chip>}
        </div>
      ))}
    </div>
    {step === 1 && (
      <div className="space-y-2 pt-1">
        <Row icon={Users} title="Julie — accueil des invités" meta="Responsable de l'entrée" />
        <Row icon={Users} title="Hugo — coordination traiteur" meta="Liaison cuisine / salle" />
      </div>
    )}
  </AppFrame>
);

export const InfosFakeUI = ({ step }: { step: number }) => (
  <AppFrame nav={NAV_WEDDING} active="Infos pratiques" eyebrow="Informations pratiques" title="Pour vos invités" subtitle="Les informations utiles aux personnes concernées.">
    <div className="space-y-2">
      <Row icon={MapPin} title="Domaine des Saules" meta="12 route du Château · 91680" />
      <Row icon={MapPin} title="Parking sur place" meta="120 places · accès PMR" />
      <Row icon={CalendarDays} title="Météo de repli" meta="Tente chauffée en cas de pluie" />
    </div>
    {step === 1 && (
      <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[.035] p-3">
        <Globe2 className="h-4 w-4 shrink-0 text-foreground/40" />
        <p className="text-[10px] text-foreground/55">Ces informations sont rendues visibles aux personnes concernées par le Monde.</p>
      </div>
    )}
  </AppFrame>
);

export const RsvpInviteFakeUI = ({ step }: { step: number }) => (
  <div className="flex h-full flex-col items-center justify-center bg-card/50 p-5">
    <p className="text-[9px] uppercase tracking-[.3em] text-foreground/40">AIME · Participation personnelle</p>
    <h4 className="mt-2 font-display text-lg">Bonjour Camille</h4>
    <p className="text-[10px] text-foreground/50">Votre invitation · aucun accès au Monde</p>
    <div className="mt-4 w-full max-w-sm space-y-2">
      <div className="rounded-2xl border border-foreground/10 bg-background p-4">
        <p className="text-[9px] uppercase tracking-widest text-foreground/40">RSVP</p>
        <div className="mt-2 flex gap-1.5">
          <Chip tone={step === 0 ? "ok" : "muted"}>Oui</Chip>
          <Chip>Non</Chip>
        </div>
        <Skeleton className="mt-3 h-8 w-full" />
      </div>
      {step === 1 && (
        <div className="rounded-2xl border border-foreground/10 bg-background p-4">
          <p className="text-[9px] uppercase tracking-widest text-foreground/40">Votre programme personnel</p>
          <div className="mt-2 space-y-1.5">
            <Row icon={Clock} title="15:00 — Cérémonie" meta="Salle des fêtes" />
            <Row icon={Music} title="Proposer un morceau" meta="Une envie musicale pour le soir" />
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
          <p className="text-[10px] text-emerald-200/90">Votre réponse a bien été enregistrée.</p>
        </div>
      )}
    </div>
  </div>
);

export const MemoriesFakeUI = ({ step }: { step: number }) => (
  <AppFrame nav={NAV_WEDDING} active="Photos" eyebrow="Après · Mémoire" title="Souvenirs & médias" subtitle="Photos et vidéos partagées avec consentement.">
    <div className="grid grid-cols-3 gap-2">
      {["Entrée", "Première danse", "Cocktail"].map((m, i) => (
        <div key={m} className={cn("flex aspect-square items-center justify-center rounded-xl border bg-foreground/[.035]", i === step ? "border-foreground/30" : "border-foreground/10")}>
          <ImageIcon className="h-5 w-5 text-foreground/30" />
        </div>
      ))}
    </div>
    {step === 1 && (
      <div className="rounded-xl border border-foreground/10 bg-foreground/[.035] p-3">
        <p className="text-xs">Partager avec mon consentement</p>
        <p className="mt-1 text-[10px] text-foreground/45">Chaque média passe par une modération avant visibilité.</p>
      </div>
    )}
    {step === 2 && (
      <div className="rounded-xl border border-foreground/10 bg-foreground/[.035] p-3 text-[10px] text-foreground/55">
        Les souvenirs restent reliés au Monde, bien après le Jour J.
      </div>
    )}
  </AppFrame>
);

export const ThanksFakeUI = ({ step }: { step: number }) => (
  <AppFrame nav={NAV_WEDDING} active="Après" eyebrow="Après · Mémoire" title="Remerciements & actualités" subtitle="Les mots après le mariage.">
    <div className="space-y-2">
      <Row icon={Heart} title="Merci à la famille Martin" meta="Message préparé · à envoyer" />
      <Row icon={Send} title="Actualité : photos en ligne" meta="Publiée aux invités · 12 sept." right={<Chip tone="ok">Publié</Chip>} />
    </div>
    {step === 1 && (
      <div className="rounded-xl border border-foreground/10 bg-foreground/[.035] p-3">
        <p className="text-[10px] text-foreground/55">Préparez une actualité privée ou partagez-la avec les invités — à vous de choisir.</p>
      </div>
    )}
  </AppFrame>
);

export const ProfileTimelineFakeUI = ({ step }: { step: number }) => (
  <div className="flex h-full flex-col bg-card/50 p-5">
    <div className="flex items-center justify-between">
      <p className="text-[9px] uppercase tracking-[.3em] text-foreground/40">Votre Profil</p>
      <div className="flex gap-1.5">
        <Chip tone={step === 2 ? "muted" : "ok"}>Timeline</Chip>
        <Chip tone={step === 2 ? "ok" : "muted"}>Le Fil</Chip>
      </div>
    </div>
    <div className="mt-3 flex items-center gap-3">
      <div className="h-12 w-12 rounded-full bg-foreground/10" />
      <div>
        <p className="font-display text-sm">Marie & Thomas</p>
        <p className="text-[10px] text-foreground/45">Depuis 2021 · 3 Mondes</p>
      </div>
    </div>
    <div className="relative mt-5 flex-1">
      <div className="absolute left-0 right-0 top-1/2 h-px bg-foreground/15" />
      <div className="absolute left-[12%] top-1/2 -translate-y-1/2">
        <Chip tone={step === 0 ? "ok" : "muted"}>Identité</Chip>
      </div>
      <div className="absolute left-[42%] top-1/2 -translate-y-1/2">
        <Chip tone={step === 1 ? "ok" : "muted"}>Histoire</Chip>
      </div>
      <div className="absolute left-[72%] top-1/2 -translate-y-1/2">
        <Chip tone={step === 2 ? "ok" : "muted"}>Réseau</Chip>
      </div>
    </div>
    <div className="mt-3 space-y-2">
      {step <= 1 && <Row icon={CalendarDays} title="Fiançailles · 18 mai" meta="Moment relié au Monde Mariage" />}
      {step >= 1 && <Row icon={Users} title="Camille, témoin" meta="Reliée à votre Réseau" />}
    </div>
  </div>
);

export const MeFakeUI = ({ step }: { step: number }) => (
  <div className="flex h-full flex-col bg-card/50 p-5">
    <div className="flex items-center gap-3 border-b border-border/60 pb-3">
      <div className="h-12 w-12 rounded-full bg-foreground/10" />
      <div>
        <h4 className="font-display text-lg">ME — Votre espace</h4>
        <p className="text-[10px] text-foreground/45">Identité, accès et sécurité</p>
      </div>
    </div>
    <div className="mt-3 space-y-2">
      {step === 0 && (
        <>
          <Row icon={User} title="Marie Dupont" meta="marie@exemple.fr · vérifiée" />
          <Row icon={Settings} title="Apparence" meta="Mode sombre / clair" right={<Chip tone="ok">Sombre</Chip>} />
        </>
      )}
      {step === 1 && (
        <>
          <Row icon={Shield} title="Télécharger mes données" meta="Export complet de vos informations" />
          <Row icon={Lock} title="Supprimer mon compte" meta="Retire aussi vos accès aux Mondes partagés" right={<Chip tone="danger">Irréversible</Chip>} />
        </>
      )}
      {step === 2 && (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[.035] p-3 text-[10px] text-foreground/55">
          Vous gardez la maîtrise de l'identité, des droits, de la confidentialité et des exports.
        </div>
      )}
    </div>
  </div>
);

export const SynthesisFakeUI = ({ step }: { step: number }) => (
  <div className="flex h-full flex-col bg-card/50 p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[8px] uppercase tracking-[.28em] text-foreground/40">Synthèse du Monde</p>
        <h4 className="mt-1 font-display text-lg">Votre mariage en un coup d'œil</h4>
      </div>
      <Chip tone="brand">En direct</Chip>
    </div>
    <div className="mt-4 grid flex-1 grid-cols-2 gap-2">
      <div className={cn("rounded-2xl border p-3 transition", step === 0 ? "border-brand-accent/40 bg-brand-accent/5" : "border-foreground/10 bg-foreground/[.035]")}>
        <p className="text-[8px] uppercase tracking-wider text-foreground/40">Budget engagé</p>
        <p className="mt-2 font-display text-xl tabular-nums">14 200 €</p>
        <p className="mt-1 text-[9px] text-foreground/45">sur 20 000 € prévus</p>
      </div>
      <div className={cn("rounded-2xl border p-3 transition", step === 0 ? "border-brand-accent/40 bg-brand-accent/5" : "border-foreground/10 bg-foreground/[.035]")}>
        <p className="text-[8px] uppercase tracking-wider text-foreground/40">Progression</p>
        <p className="mt-2 font-display text-xl tabular-nums">67%</p>
        <p className="mt-1 text-[9px] text-foreground/45">8 étapes sur 12</p>
      </div>
      <div className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-3">
        <p className="text-[8px] uppercase tracking-wider text-foreground/40">Invités</p>
        <p className="mt-2 font-display text-xl tabular-nums">42</p>
        <p className="mt-1 text-[9px] text-foreground/45">38 oui · 4 en attente</p>
      </div>
      <div className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-3">
        <p className="text-[8px] uppercase tracking-wider text-foreground/40">Prestataires</p>
        <p className="mt-2 font-display text-xl tabular-nums">3/5</p>
        <p className="mt-1 text-[9px] text-foreground/45">2 à trouver</p>
      </div>
    </div>
    {step === 1 && (
      <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
          <p className="text-[9px] uppercase tracking-wider text-amber-200/80">Alertes de planning</p>
        </div>
        <p className="mt-1.5 text-[10px] text-amber-100/70">Prestataire mobilisé simultanément · « Cérémonie » ⇄ « Cocktail »</p>
      </div>
    )}
    {step === 2 && (
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/[.035] p-3 text-[10px] text-foreground/55">
        Chaque carte ouvre directement son panneau — la salle de contrôle du Monde.
      </div>
    )}
  </div>
);

const GRAPH_EVENTS = [
  { label: "Cérémonie", y: 34 },
  { label: "Cocktail", y: 96 },
  { label: "Repas", y: 158 },
];
const GRAPH_ENTITIES = [
  { label: "Traiteur", kind: "Prestataire", masked: false, y: 34 },
  { label: "Acompte", kind: "Finances", masked: true, y: 96 },
  { label: "Contrat", kind: "Document", masked: true, y: 158 },
];
const GRAPH_EDGES = [
  [0, 0], [0, 2], [1, 0], [2, 1],
] as const;

export const GraphFakeUI = ({ step }: { step: number }) => {
  const inviteView = step >= 1;
  return (
    <div className="flex h-full flex-col bg-card/50 p-5">
      <div className="flex items-center justify-between">
        <p className="text-[8px] uppercase tracking-[.28em] text-foreground/40">Graphe de visibilité</p>
        <div className="flex gap-1">
          {["Propriétaire", "Planificateur", "Proche", "Invité"].map((r, i) => (
            <span key={r} className={cn(
              "rounded-full border px-2 py-1 text-[8px] uppercase tracking-wider",
              (inviteView && i === 3) || (!inviteView && i === 0) ? "border-foreground bg-foreground text-background" : "border-foreground/15 text-foreground/45",
            )}>{r}</span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex-1 rounded-2xl border border-foreground/10 bg-background p-2">
        <svg viewBox="0 0 340 200" className="h-full w-full" role="img" aria-label="Graphe du Monde simulé">
          {GRAPH_EDGES.map(([e, n], i) => {
            const masked = inviteView && GRAPH_ENTITIES[n].masked;
            return <line key={i} x1={86} y1={GRAPH_EVENTS[e].y} x2={240} y2={GRAPH_ENTITIES[n].y} stroke="currentColor" opacity={masked ? 0.12 : 0.3} strokeWidth={1} strokeDasharray={masked ? "3 4" : undefined} />;
          })}
          {GRAPH_EVENTS.map((e, i) => (
            <g key={`e-${i}`}>
              <circle cx={70} cy={e.y} r={6} fill="#ffffff" stroke="#ffffff" strokeWidth={1.5} />
              <text x={84} y={e.y + 3} fill="currentColor" fontSize="10">{e.label}</text>
            </g>
          ))}
          {GRAPH_ENTITIES.map((n, i) => {
            const masked = inviteView && n.masked;
            const color = n.masked ? "#bf5af2" : "#64d2ff";
            return (
              <g key={`n-${i}`} opacity={masked ? 0.32 : 1}>
                {step === 2 && !masked && <circle cx={256} cy={n.y} r={12} fill="none" stroke={color} strokeWidth={1} strokeDasharray="2 3" />}
                <circle cx={256} cy={n.y} r={6} fill={masked ? "transparent" : color} stroke={color} strokeWidth={1.5} strokeDasharray={masked ? "2 3" : undefined} />
                <text x={270} y={n.y + 3} fill="currentColor" fontSize="10">{n.label}</text>
                <text x={270} y={n.y + 15} fill="currentColor" opacity="0.35" fontSize="7" className="uppercase">{n.kind}{masked ? " · masqué" : ""}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-[10px] text-foreground/50">
        {inviteView ? "Vu comme un invité, les finances et documents disparaissent." : "Le propriétaire voit tout, finances et documents compris."}
        {step === 2 ? " Cliquez un élément pour l'ouvrir." : ""}
      </p>
    </div>
  );
};

/* ————————————————————————————————————————————————
   Guidage contextuel et première phrase du mariage
———————————————————————————————————————————————— */

const GuidePanel = ({ focus, lines }: { focus: string; lines: string[] }) => (
  <div className="mx-auto h-full w-[min(100%,560px)] rounded-2xl border border-foreground/10 bg-foreground/[.02] p-4">
    <p className="text-[8px] uppercase tracking-[.24em] text-foreground/40">{focus}</p>
    <div className="mt-3 space-y-2">
      {lines.map((line, index) => (
        <div key={line} className="flex items-start gap-2 rounded-xl border border-foreground/10 bg-background/40 px-3 py-2">
          <span className="mt-0.5 text-[8px] font-mono text-foreground/35">{`0${index + 1}`}</span>
          <span className="text-[10px] leading-relaxed text-foreground/70">{line}</span>
        </div>
      ))}
    </div>
  </div>
);

export const GuidanceFakeUI = ({ step = 0 }: { step?: number }) => (
  <div className="flex h-full flex-col bg-background">
    <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[8px] uppercase tracking-[.24em] text-foreground/35">Monde · Mariage</p>
        <p className="truncate text-[12px] text-foreground">Plan de table</p>
      </div>
      <Chip tone={step === 0 ? "brand" : "muted"}>
        <span className="mr-1">◎</span> Expliquer cet écran
      </Chip>
    </div>
    {step === 0 && (
      <div className="flex-1 p-4">
        <div className="h-full rounded-2xl border border-dashed border-brand-accent/30 bg-brand-accent/[.04] p-4">
          <p className="text-[8px] uppercase tracking-[.24em] text-brand-accent">Vous êtes ici : Plan de table</p>
          <p className="mt-2 text-[11px] leading-relaxed text-foreground/75">
            Les tables et leurs capacités, le placement, les régimes alimentaires.
          </p>
          <p className="mt-2 text-[9px] leading-relaxed text-foreground/45">
            Erreur classique : placer les invités avant d'avoir reçu toutes les réponses.
          </p>
          <div className="mt-3 flex gap-2">
            <Chip tone="ok">Ouvrir le plan de table</Chip>
            <Chip>Voir les réponses</Chip>
          </div>
        </div>
      </div>
    )}
    {step === 1 && <GuidePanel focus="Panneau AI · onglet « Me guider »" lines={[
      "Confirmer la date du Jour J — tout le compte à rebours en dépend.",
      "Relancer les 7 réponses en attente — le traiteur ne peut pas attendre.",
      "Ouvrir le plan de table — 120 invités, aucune table.",
    ]} />}
    {step === 2 && (
      <div className="flex-1 p-4">
        <div className="rounded-full border border-foreground/15 bg-foreground/[.03] px-3 py-2 text-[10px] text-foreground/70">
          AIME, où je saisis les réponses des invités ?
        </div>
        <div className="mt-3 rounded-2xl border border-foreground/10 bg-foreground/[.02] p-4">
          <p className="text-[8px] uppercase tracking-[.24em] text-foreground/40">Cet écran</p>
          <p className="mt-2 text-[11px] leading-relaxed text-foreground/75">
            Liste des invités : chaque ligne porte le statut de réponse, le régime et le foyer. Le saut proposé ouvre exactement ce panneau.
          </p>
          <div className="mt-3 flex gap-2"><Chip tone="ok">Ouvrir la liste des invités</Chip><Chip>Plan de table</Chip></div>
        </div>
      </div>
    )}
  </div>
);

export const IntentionFakeUI = ({ step = 0 }: { step?: number }) => {
  const questions = [
    ["La date du mariage, même approximative ?", "14 août 2027"],
    ["Près de quelle ville, ou de quel lieu ?", "Lille"],
    ["Combien d'invités au repas ?", "120"],
    ["Quel budget pour le mariage ?", "20 000 €"],
    ["L'ambiance du mariage, en un mot ?", "champêtre"],
  ];
  const answered = step === 0 ? 1 : step === 1 ? 5 : 5;
  return (
    <div className="flex h-full items-center justify-center bg-foreground px-5">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center gap-2 text-[10px] text-white/70">
          <span className="rounded-full border border-white/25 px-2 py-0.5 text-white">Notre mariage</span>
          <span className="ml-auto font-mono">{Math.min(step + 1, 5)}/5</span>
        </div>
        <div className="mt-3 rounded-2xl bg-white/[.07] p-4">
          {step < 2 ? (
            <>
              <p className="text-[11px] text-white">{questions[step][0]}</p>
              <div className="mt-2 flex items-center justify-between rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] text-white/85">
                <span>{questions[step][1]}</span>
                <span className="text-white/50">Entrée ↵</span>
              </div>
              <div className="mt-3 flex gap-1.5">
                {questions.map((_, index) => (
                  <span key={index} className={cn("h-1 flex-1 rounded-full", index < answered ? "bg-white" : "bg-white/25")} />
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] leading-relaxed text-white">
                Notre mariage le 14 août 2027, près de Lille, 120 invités, 20 000 €, ambiance champêtre.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] text-white/75">
                <span className="rounded-full border border-white/25 px-2 py-0.5">date confirmée</span>
                <span className="rounded-full border border-white/25 px-2 py-0.5">120 invités</span>
                <span className="rounded-full border border-white/25 px-2 py-0.5">20 000 €</span>
              </div>
              <p className="mt-3 text-[9px] uppercase tracking-[.2em] text-white/50">Le Monde est ouvert · Timeline, invités, budget déjà reliés</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

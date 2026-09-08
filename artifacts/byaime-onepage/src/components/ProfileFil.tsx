import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Compass,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  useGetProfileFil,
  type ProfileFilAction,
  type ProfileFilCard,
  type ProfileFilCardCategory,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const typeMeta: Record<ProfileFilCard["type"], { label: string; icon: LucideIcon; tone: string }> = {
  task: { label: "À faire", icon: CheckSquare, tone: "border-sky-400/25 bg-sky-400/10 text-sky-300" },
  fact: { label: "Point confirmé", icon: Activity, tone: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" },
  alert: { label: "À regarder", icon: ShieldAlert, tone: "border-rose-400/25 bg-rose-400/10 text-rose-300" },
  suggestion: { label: "Conseil", icon: Compass, tone: "border-violet-400/25 bg-violet-400/10 text-violet-300" },
  tutorial: { label: "Comprendre AIME", icon: BookOpen, tone: "border-amber-400/25 bg-amber-400/10 text-amber-300" },
  inspiration: { label: "Inspiration publique", icon: Sparkles, tone: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300" },
};

const categoryMeta: Record<ProfileFilCardCategory, { eyebrow: string; title: string }> = {
  now: { eyebrow: "Maintenant", title: "Ce qui mérite votre attention" },
  world: { eyebrow: "Votre Monde", title: "Ce que vos informations racontent" },
  learn: { eyebrow: "Aide", title: "Comprendre et avancer simplement" },
  inspiration: { eyebrow: "Autres Mondes", title: "Idées publiques et anonymisées" },
};

export function ProfileFilCardView({ card, onAction }: { card: ProfileFilCard; onAction: (action: ProfileFilAction) => void }) {
  const meta = typeMeta[card.type];
  const Icon = meta.icon;
  const actionable = card.action.kind !== "none";

  return (
    <article data-testid={`profile-fil-card-${card.id}`} className="group relative flex h-full flex-col gap-4 rounded-[1.75rem] border border-foreground/8 bg-card/70 p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-foreground/18 hover:bg-card md:p-6">
      <div className="flex items-start gap-4">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full border", meta.tone)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[8px] uppercase tracking-[.19em] text-foreground/42">{meta.label}</span>
            {(card.priority === "urgent" || card.priority === "high") && (
              <span className="rounded-full border border-rose-400/20 bg-rose-400/8 px-2 py-0.5 text-[8px] uppercase tracking-[.16em] text-rose-300">
                Prioritaire
              </span>
            )}
          </div>
          <h3 className="text-lg font-medium leading-snug tracking-tight text-foreground/90">{card.title}</h3>
          <p className="mt-2 text-sm font-light leading-6 text-foreground/58">{card.summary}</p>
        </div>
      </div>

      <div className="ml-[3.75rem] border-l border-foreground/10 py-0.5 pl-4">
        <p className="text-[11px] font-light leading-5 text-foreground/45">
          <span className="mr-2 text-[8px] uppercase tracking-[.16em] text-foreground/32">Pourquoi</span>
          {card.reason}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] text-foreground/38">
          <span className="rounded-full border border-foreground/8 bg-foreground/[.025] px-2.5 py-1">{card.source.label}</span>
          {card.evidenceStatus === "verified" && (
            <span className="flex items-center gap-1 uppercase tracking-[.14em] text-emerald-400/65">
              <CheckCircle2 className="h-3 w-3" /> Sourcé
            </span>
          )}
        </div>
      </div>

      <div className="mt-auto pl-[3.75rem] pt-1">
        {actionable ? (
          <button
            type="button"
            onClick={() => onAction(card.action)}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[.15em] text-background transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {card.action.label} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="text-[9px] uppercase tracking-[.16em] text-foreground/30">{card.action.label}</span>
        )}
      </div>
    </article>
  );
}

export function ProfileFil({ projectId, onOpenMoment }: { projectId: string, onOpenMoment: (id: string) => void }) {
  const [, navigate] = useLocation();
  const { data, isLoading, error, refetch } = useGetProfileFil(projectId);

  if (isLoading) {
    return (
      <div data-testid="profile-fil-loading" className="flex flex-col items-center justify-center py-28 text-center">
        <div className="mb-6 h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/80 motion-reduce:animate-none" />
        <p className="text-[10px] uppercase tracking-[.35em] text-foreground/40">Lecture du Monde en cours</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div data-testid="profile-fil-error" className="flex flex-col items-center justify-center px-6 py-28 text-center">
        <AlertCircle className="mb-5 h-8 w-8 text-amber-400/75" />
        <h3 className="mb-2 text-xl font-light">Le Fil est momentanément indisponible</h3>
        <p className="max-w-md text-sm font-light leading-6 text-foreground/50">La Timeline reste accessible et aucune recommandation n’a été inventée.</p>
        <button type="button" onClick={() => void refetch()} className="mt-6 inline-flex items-center gap-2 rounded-full border border-foreground/15 px-4 py-2.5 text-[9px] uppercase tracking-[.16em] text-foreground/65 hover:bg-foreground/5">
          <RotateCcw className="h-3.5 w-3.5" /> Réessayer
        </button>
      </div>
    );
  }

  if (data.cards.length === 0) {
    return (
      <div data-testid="profile-fil-empty" className="flex flex-col items-center justify-center px-6 py-28 text-center">
        <CheckCircle2 className="mb-5 h-8 w-8 text-emerald-400/70" />
        <h3 className="mb-2 text-xl font-light">Rien ne demande votre attention</h3>
        <p className="max-w-md text-sm font-light leading-6 text-foreground/50">Le Fil n’a aucune carte fiable à proposer pour ce Monde en ce moment.</p>
      </div>
    );
  }

  const order: ProfileFilCardCategory[] = ["now", "world", "learn", "inspiration"];
  const groups = order
    .map(category => ({ category, cards: data.cards.filter(card => card.category === category) }))
    .filter(group => group.cards.length > 0);
  const hasPublicInspiration = data.cards.some(card => card.category === "inspiration");

  return (
    <div data-testid="profile-fil" className="mx-auto w-full max-w-5xl px-5 pb-28 md:px-8">
      <div className="mb-12 max-w-2xl">
        <p className="mb-3 text-[9px] uppercase tracking-[.32em] text-foreground/38">Votre compagnon</p>
        <h2 className="font-display text-3xl font-light md:text-4xl">Le Fil</h2>
        <p className="mt-4 text-sm font-light leading-6 text-foreground/50">Des cartes courtes, sourcées depuis votre Monde, pour savoir quoi regarder sans masquer votre histoire.</p>
      </div>

      <div className="space-y-14">
        {groups.map(group => (
          <section key={group.category} aria-labelledby={`profile-fil-${group.category}`}>
            <p className="text-[8px] uppercase tracking-[.24em] text-foreground/35">{categoryMeta[group.category].eyebrow}</p>
            <h3 id={`profile-fil-${group.category}`} className="mt-2 text-xl font-light text-foreground/82">{categoryMeta[group.category].title}</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {group.cards.map(card => (
                <ProfileFilCardView
                  key={card.id}
                  card={card}
                  onAction={action => {
                    if (action.kind === "open_timeline" && action.targetId) onOpenMoment(action.targetId);
                    if (action.kind === "open_world") navigate("/user-portal");
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {!hasPublicInspiration && (
        <aside className="mt-14 rounded-2xl border border-dashed border-foreground/10 px-5 py-4 text-xs font-light leading-6 text-foreground/40">
          Les idées d’autres Mondes apparaîtront ici uniquement lorsqu’elles seront publiées, consenties et suffisamment anonymisées. AIME préfère ne rien montrer plutôt que d’exposer un couple.
        </aside>
      )}
    </div>
  );
}

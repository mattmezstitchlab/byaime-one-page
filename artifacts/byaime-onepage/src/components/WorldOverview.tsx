import { useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Euro, ListChecks, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { CenteredBlock } from "./CenteredBlock";
import { findTimelineConflicts } from "@/lib/timeline-graph";
import { useProject } from "@/store/project-store";
import type { WeddingPanelId } from "@/lib/wedding-navigation";
import { formatBudget } from "@/lib/money";

function Stat({ label, value, hint, onClick, icon: Icon, accent }: {
  label: string; value: string; hint?: string; onClick?: () => void; icon?: typeof Euro; accent?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[.18em] text-foreground/40">{label}</p>
        {Icon && <Icon className={cn("h-4 w-4", accent ? "text-brand-accent" : "text-foreground/30")} />}
      </div>
      <p className="mt-3 font-display text-3xl font-light tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-xs font-light text-foreground/45">{hint}</p>}
    </>
  );
  if (!onClick) {
    return <div className={cn("rounded-2xl border border-foreground/10 bg-foreground/[.035] p-5", accent && "border-brand-accent/25")}>{content}</div>;
  }
  return (
    <button type="button" onClick={onClick} className={cn("group rounded-2xl border border-foreground/10 bg-foreground/[.035] p-5 text-left transition hover:border-foreground/30 hover:bg-foreground/[.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", accent && "border-brand-accent/25")}>
      {content}
      <span className="mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-foreground/40 transition group-hover:text-foreground">
        Ouvrir <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

export function WorldOverview({ onClose, onOpenPanel }: { onClose: () => void; onOpenPanel: (panel: WeddingPanelId) => void }) {
  const { project } = useProject();
  const summary = useMemo(() => {
    if (!project) return null;
    const guests = project.guests;
    const rsvpYes = guests.filter(g => g.rsvp === "confirme").length;
    const rsvpPending = guests.filter(g => g.rsvp === "en_attente").length;
    const rsvpNo = guests.filter(g => g.rsvp === "decline").length;
    const tasksDone = project.tasks.filter(t => t.status === "termine").length;
    const completion = project.tasks.length ? Math.round((tasksDone / project.tasks.length) * 100) : 0;
    const providersBooked = project.providers.filter(p => p.status === "reserve").length;
    const providersOpen = project.providers.filter(p => p.status === "recherche").length;
    const engaged = project.payments.reduce((sum, p) => sum + p.amountCents, 0) / 100;
    const total = project.budget.value ?? null;
    const conflicts = findTimelineConflicts(project.timeline);
    const upcoming = project.timeline.filter(e => e.time > Date.now()).sort((a, b) => a.time - b.time).slice(0, 3);
    const memories = project.memories.length + project.media.length;
    return { rsvpYes, rsvpPending, rsvpNo, tasksDone, tasksTotal: project.tasks.length, completion, providersBooked, providersOpen, engaged, total, conflicts, upcoming, memories };
  }, [project]);

  if (!project || !summary) return null;

  return (
    <CenteredBlock eyebrow="Synthèse du Monde" title="Votre mariage en un coup d'œil" description="La salle de contrôle du Monde : ce qui avance, ce qui reste, et ce qu'il faut vérifier." onClose={onClose} size="xl">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Budget engagé" value={summary.engaged > 0 ? formatBudget(summary.engaged, project.currency) : formatBudget(0, project.currency)} hint={summary.total ? `sur ${formatBudget(summary.total, project.currency)} prévus` : "budget global non défini"} icon={Euro} accent onClick={() => onOpenPanel("budget")} />
          <Stat label="Progression" value={`${summary.completion}%`} hint={`${summary.tasksDone} étape${summary.tasksDone > 1 ? "s" : ""} sur ${summary.tasksTotal}`} icon={ListChecks} onClick={() => onOpenPanel("planning")} />
          <Stat label="Invités" value={String(project.guests.length)} hint={`${summary.rsvpYes} oui · ${summary.rsvpPending} en attente · ${summary.rsvpNo} non`} icon={Users} onClick={() => onOpenPanel("guests")} />
          <Stat label="Prestataires engagés" value={`${summary.providersBooked}/${project.providers.length}`} hint={summary.providersOpen > 0 ? `${summary.providersOpen} encore à trouver` : "équipe complète"} icon={CheckCircle2} onClick={() => onOpenPanel("providers")} />
          <Stat label="Souvenirs" value={String(summary.memories)} hint="photos, vidéos et idées conservées" onClick={() => onOpenPanel("memories")} />
          <Stat label="Points à vérifier" value={String(summary.conflicts.length)} hint={summary.conflicts.length ? "conflits de planning détectés" : "aucun conflit détecté"} accent={summary.conflicts.length > 0} />
        </div>

        <section className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[.18em] text-foreground/40">Prochains Moments</p>
            <CalendarDays className="h-4 w-4 text-foreground/30" />
          </div>
          {summary.upcoming.length ? (
            <div className="mt-4 space-y-2">
              {summary.upcoming.map(event => (
                <div key={event.id} className="flex items-center justify-between gap-3 border-b border-foreground/5 pb-2 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{event.title}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-foreground/40">{format(event.time, "d MMMM yyyy", { locale: fr })}{event.location ? ` · ${event.location}` : ""}</p>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-foreground/40">{event.phase === "avant" ? "Avant" : event.phase === "pendant" ? "Jour J" : "Après"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm font-light text-foreground/45">Aucun Moment à venir.</p>
          )}
        </section>

        {summary.conflicts.length > 0 && (
          <section className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              <p className="text-[10px] uppercase tracking-[.18em] text-amber-200/80">Alertes de planning</p>
            </div>
            <div className="mt-4 space-y-2">
              {summary.conflicts.map((conflict, i) => (
                <div key={i} className="rounded-xl border border-amber-300/15 bg-background/30 p-3">
                  <p className="text-xs text-amber-100/85">{conflict.message}</p>
                  <p className="mt-1 text-[10px] text-amber-100/45">
                    {conflict.eventIds.map(id => project.timeline.find(e => e.id === id)?.title).filter(Boolean).join(" ⇄ ")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </CenteredBlock>
  );
}

import { CalendarClock, ListChecks, Store, Users, Wallet } from "lucide-react";
import { useProject } from "@/store/project-store";
import { useI18n } from "@/lib/i18n";
import { focusWorld } from "@/lib/world-focus";
import { getWeddingCapabilities } from "@/lib/wedding-navigation";
import { formatCents } from "@/lib/money";

/*
 * La tête du mode Avant. Le Jour J avait la sienne (`DayRunTimeline`), l'Après
 * aussi (`ApresOverview`) : l'Avant, lui, n'affichait que la liste des Moments.
 * Or c'est la période où le couple a le plus besoin de savoir où il en est.
 *
 * Trois cartes, aucune simulation : tâches restantes et en retard, prestataires
 * à réserver, argent engagé et déjà payé. Les comptes viennent des mêmes
 * collections que les panneaux correspondants, et chaque carte ouvre le sien.
 * Un rôle qui ne voit pas les finances voit les réponses des invités à la place.
 */
export function AvantOverview() {
  const { project, currentRole } = useProject();
  const { t } = useI18n();

  if (!project) return null;

  const now = Date.now();
  const pivot = project.pivot.value;
  const daysLeft = Number.isFinite(pivot) ? Math.ceil((pivot - now) / 86_400_000) : undefined;

  const openTasks = project.tasks.filter(task => task.status !== "termine");
  const lateTasks = openTasks.filter(task => task.dueDate !== undefined && task.dueDate < now);
  const nextTask = [...openTasks]
    .filter(task => task.dueDate !== undefined)
    .sort((a, b) => a.dueDate! - b.dueDate!)[0];

  const toBook = project.providers.filter(provider => provider.status !== "reserve");
  const booked = project.providers.length - toBook.length;
  const nextProvider = toBook.find(provider => provider.nextAction?.trim());

  const seeFinances = getWeddingCapabilities(currentRole).seeFinances;
  const committed = project.providers.reduce((sum, provider) => sum + (provider.amountCents ?? 0), 0);
  const paid = project.payments.filter(payment => payment.state === "paye").reduce((sum, payment) => sum + payment.amountCents, 0);
  const owed = project.payments.filter(payment => payment.state === "du");

  const confirmed = project.guests.filter(guest => guest.rsvp === "confirme").length;
  const waiting = project.guests.filter(guest => guest.rsvp === "en_attente").length;

  const nextMoment = project.timeline
    .filter(event => event.phase === "avant" && event.time >= now)
    .sort((a, b) => a.time - b.time)[0];

  const tasksText =
    openTasks.length === 0
      ? t("avant.tasks.empty")
      : lateTasks.length > 0
        ? t("avant.tasks.someLate", { n: openTasks.length, plural: openTasks.length > 1 ? "s" : "", late: lateTasks.length })
        : t("avant.tasks.some", { n: openTasks.length, plural: openTasks.length > 1 ? "s" : "" });

  const providersText =
    project.providers.length === 0
      ? t("avant.providers.empty")
      : toBook.length === 0
        ? t("avant.providers.allBooked", { n: booked })
        : t("avant.providers.mix", { toBook: toBook.length, booked, plural: booked > 1 ? "s" : "" });

  const dueText =
    owed.length === 0
      ? t("avant.budget.noneDue")
      : t("avant.budget.due", {
          n: owed.length,
          plural: owed.length > 1 ? "s" : "",
          past: owed.length > 1 ? "s" : "",
        });

  const guestsText =
    project.guests.length === 0
      ? t("avant.guests.empty")
      : t("avant.guests.summary", {
          confirmed,
          plural: confirmed > 1 ? "s" : "",
          waiting,
        });

  return (
    <section data-testid="avant-overview" aria-label={t("avant.aria")} className="mx-auto w-full max-w-4xl px-4 pt-8 sm:px-6">
      <p className="text-[10px] uppercase tracking-[.24em] text-[var(--agency-eyebrow)]">{t("avant.eyebrow")}</p>
      <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--agency-ink)] sm:text-3xl">{t("avant.title")}</h3>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          data-testid="avant-overview-countdown"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-4 py-2 text-xs text-[var(--agency-body)]"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {daysLeft === undefined
            ? t("avant.dateToSet")
            : daysLeft > 0
              ? t("avant.daysLeft", { n: daysLeft })
              : daysLeft === 0
                ? t("avant.today")
                : t("avant.passed")}
        </span>
        {nextMoment && (
          <span data-testid="avant-overview-next" className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-4 py-2 text-xs text-[var(--agency-body)]">
            {t("avant.nextMilestone", { title: nextMoment.title })}
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <article data-testid="avant-overview-tasks" className="flex flex-col rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] text-[var(--agency-eyebrow)]">
            <ListChecks className="h-5 w-5" />
          </span>
          <h4 className="mt-4 text-sm font-medium text-[var(--agency-ink)]">{t("avant.tasks.title")}</h4>
          <p className="mt-1 text-xs text-[var(--agency-body)]">
            {tasksText}
          </p>
          {nextTask && (
            <p className="mt-1 line-clamp-2 text-xs font-light italic leading-relaxed text-[var(--agency-body)]">
              {t("avant.tasks.next", { title: nextTask.title })}
            </p>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => focusWorld({ panel: "planning" })}
            className="mt-4 w-fit rounded-full border border-[var(--agency-hairline)] px-4 py-1.5 text-xs text-[var(--agency-body)] transition hover:border-[var(--agency-index)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
          >
            {t("avant.tasks.open")}
          </button>
        </article>

        <article data-testid="avant-overview-providers" className="flex flex-col rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] text-[var(--agency-eyebrow)]">
            <Store className="h-5 w-5" />
          </span>
          <h4 className="mt-4 text-sm font-medium text-[var(--agency-ink)]">{t("avant.providers.title")}</h4>
          <p className="mt-1 text-xs text-[var(--agency-body)]">
            {providersText}
          </p>
          {nextProvider && (
            <p className="mt-1 line-clamp-2 text-xs font-light italic leading-relaxed text-[var(--agency-body)]">
              {t("avant.providers.next", { name: nextProvider.name || nextProvider.role, action: nextProvider.nextAction ?? "" })}
            </p>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => focusWorld({ panel: "providers" })}
            className="mt-4 w-fit rounded-full border border-[var(--agency-hairline)] px-4 py-1.5 text-xs text-[var(--agency-body)] transition hover:border-[var(--agency-index)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
          >
            {t("avant.providers.open")}
          </button>
        </article>

        {seeFinances ? (
          <article data-testid="avant-overview-budget" className="flex flex-col rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] text-[var(--agency-eyebrow)]">
              <Wallet className="h-5 w-5" />
            </span>
            <h4 className="mt-4 text-sm font-medium text-[var(--agency-ink)]">{t("avant.budget.title")}</h4>
            <p data-testid="avant-overview-budget-figures" className="mt-1 text-xs tabular-nums text-[var(--agency-body)]">
              {t("avant.budget.figures", { paid: formatCents(paid, project.currency), committed: formatCents(committed, project.currency) })}
            </p>
            <p className="mt-1 text-xs text-[var(--agency-eyebrow)]">
              {dueText}
            </p>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => focusWorld({ panel: "budget" })}
              className="mt-4 w-fit rounded-full border border-[var(--agency-hairline)] px-4 py-1.5 text-xs text-[var(--agency-body)] transition hover:border-[var(--agency-index)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
            >
              {t("avant.budget.open")}
            </button>
          </article>
        ) : (
          <article data-testid="avant-overview-guests" className="flex flex-col rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] text-[var(--agency-eyebrow)]">
              <Users className="h-5 w-5" />
            </span>
            <h4 className="mt-4 text-sm font-medium text-[var(--agency-ink)]">{t("avant.guests.title")}</h4>
            <p className="mt-1 text-xs text-[var(--agency-body)]">
              {guestsText}
            </p>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => focusWorld({ panel: "guests" })}
              className="mt-4 w-fit rounded-full border border-[var(--agency-hairline)] px-4 py-1.5 text-xs text-[var(--agency-body)] transition hover:border-[var(--agency-index)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
            >
              {t("avant.guests.open")}
            </button>
          </article>
        )}
      </div>
    </section>
  );
}

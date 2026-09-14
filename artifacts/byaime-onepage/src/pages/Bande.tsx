import { useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { addDays, format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

import { KIND_COLORS } from "@/lib/category-colors";
import { cn } from "@/lib/utils";
import { MIN_INTENTION_LENGTH } from "@/lib/intention-draft";
import { useRouteMeta } from "@/lib/page-meta";
import { sitePath } from "@/lib/site-path";
import type { PropagationPlan, RoleVisibility } from "@/lib/timeline-graph";
import {
  DAY_SHIFT_OPTIONS,
  ENGAGEMENT_KIND_LABELS,
  PHRASE_EXAMPLES,
  RESOLUTIONS,
  RESOLUTION_LABELS,
  SHIFT_OPTIONS,
  buildBandeState,
  commitShift,
  declareDayDelay,
  demoWorld,
  markMomentDone,
  previewShift,
  projectFromPhrase,
  settleEngagement,
  understoodFacts,
  type BandeMoment,
  type BandeResolution,
  type EngagementUrgency,
  type RegieFigure,
} from "@/lib/bande";
import type { WorldProject } from "@/lib/types";

/*
 * La Bande — `/monde`.
 *
 * Un écran, trois résolutions, aucune navigation : le mariage s'organise en
 * regardant le temps passer, pas en ouvrant quarante-deux panneaux. Tout est
 * dérivé du `WorldProject` par `lib/bande.ts` ; ce fichier ne fait que rendre.
 *
 * Trois règles tenues ici :
 *  - **aucune session** : la page ne monte ni ClerkProvider, ni store, ni appel
 *    réseau. Elle est servie même quand l'authentification n'est pas configurée
 *    (`lib/public-shell.ts`) — une démonstration ne dépend pas d'un réglage ;
 *  - **rien n'est écrit sans confirmation** : décaler un Moment montre d'abord
 *    ce que ça décale (`previewShift`), et l'application est un second geste ;
 *  - **les couleurs ne portent jamais seules une information** : l'état d'un
 *    Moment est écrit en toutes lettres à côté de sa pastille.
 */

export const BANDE_PATH = "/monde";

export const BANDE_META = {
  title: "La Bande — organiser un mariage sur un seul écran · AIME",
  description:
    "Un écran, trois échelles : les mois, les engagements du dernier mois, les minutes du Jour J. Décalez un moment, l'outil montre ce que ça change.",
  /*
   * Prototype : la page n'est pas indexable tant qu'elle n'est pas le produit.
   * Le pré-rendu (lot 2 du plan) et l'ouverture au référencement se feront
   * ensemble, quand la Bande remplacera l'écran actuel du Monde privé.
   */
  robots: "noindex, nofollow",
} as const;

const HOUR = 3_600_000;

const ROLES: ReadonlyArray<{ id: RoleVisibility; label: string; hint: string }> = [
  { id: "owner", label: "Les mariés", hint: "Tout est visible, finances et documents compris." },
  { id: "planner", label: "L'agence", hint: "Tout, sauf publier, supprimer et gérer les accès." },
  { id: "family", label: "Un proche", hint: "Le partagé, sans finances ni documents privés." },
  { id: "viewer", label: "Un invité", hint: "Seulement ce qui est publié à l'audience." },
];

const URGENCY_LABELS: Record<EngagementUrgency, string> = {
  retard: "En retard",
  semaine: "Cette semaine",
  suite: "À suivre",
};

const STATE_LABELS: Record<string, string> = {
  done: "Terminé",
  live: "En cours",
  late: "En retard",
  next: "Ensuite",
  upcoming: "À venir",
};

export function BandePage() {
  useRouteMeta(BANDE_META);

  /* Le Monde de démonstration est construit une fois, au premier rendu : la
     phrase affichée et les données disent la même date. */
  const [seed] = useState(() => {
    const now = Date.now();
    const demo = demoWorld(now);
    return { now, project: demo.project, phrase: demo.phrase };
  });
  const [now, setNow] = useState(seed.now);
  const [project, setProject] = useState<WorldProject>(seed.project);
  const [draft, setDraft] = useState(seed.phrase);
  const [role, setRole] = useState<RoleVisibility>("owner");
  const [forced, setForced] = useState<BandeResolution | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plan, setPlan] = useState<{ plan: PropagationPlan; selected: string[]; minutes: number } | null>(null);

  const bande = useMemo(() => buildBandeState(project, role, now, forced), [project, role, now, forced]);
  const facts = useMemo(() => understoodFacts(project), [project]);
  const selected = useMemo(
    () => project.timeline.find(event => event.id === selectedId) ?? null,
    [project, selectedId],
  );

  const travel = (instant: number) => {
    setNow(instant);
    setForced(null);
    setPlan(null);
  };

  const applyPhrase = (event: FormEvent) => {
    event.preventDefault();
    const phrase = draft.trim();
    if (phrase.length < MIN_INTENTION_LENGTH) return;
    setProject(projectFromPhrase(phrase));
    setForced(null);
    setPlan(null);
    setSelectedId(null);
    setNow(Date.now());
  };

  const restart = () => {
    const instant = Date.now();
    const demo = demoWorld(instant);
    setProject(demo.project);
    setDraft(demo.phrase);
    setNow(instant);
    setForced(null);
    setPlan(null);
    setSelectedId(null);
  };

  const proposeShift = (minutes: number) => {
    if (!selected) return;
    const preview = previewShift(project, selected.id, minutes);
    if (!preview) return;
    setPlan({
      plan: preview,
      minutes,
      selected: preview.dependentChanges.map(change => change.eventId),
    });
  };

  const applyPlan = () => {
    if (!plan) return;
    setProject(commitShift(project, plan.plan, plan.selected));
    setPlan(null);
  };

  const instants = [
    { id: "maintenant", label: "Aujourd'hui", at: Date.now() },
    { id: "dernier-mois", label: "Le dernier mois", at: startOfDay(addDays(project.pivot.value, -21)).getTime() + 9 * HOUR },
    { id: "veille", label: "La veille", at: startOfDay(project.pivot.value).getTime() - 6 * HOUR },
    { id: "ceremonie", label: "Le Jour J, 16 h 30", at: project.pivot.value + 16.5 * HOUR },
    { id: "soiree", label: "Le Jour J, 22 h", at: project.pivot.value + 22 * HOUR },
  ];

  return (
    <div className="min-h-[100dvh] bg-[var(--agency-paper)] text-[var(--agency-ink)]">
      <a
        href="#bande-contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--agency-ink)] focus:px-4 focus:py-2 focus:text-xs focus:text-[var(--agency-paper)]"
      >
        Aller à la Bande
      </a>

      <header className="sticky top-0 z-30 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)]/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <Link
              href={sitePath("/")}
              data-testid="bande-home"
              className="font-display text-[13px] font-semibold tracking-[.28em] text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
            >
              AIME
            </Link>
            <p className="agency-serif text-[15px] tracking-wide">La Bande</p>
            <nav aria-label="Autres pages" className="flex items-center gap-3 text-xs text-[var(--agency-body)]">
              <Link href={sitePath("/agence")} data-testid="bande-agency" className="motion-safe:transition hover:text-[var(--agency-ink)]">
                L'agence
              </Link>
            </nav>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-3">
            <div role="group" aria-label="Échelle de la Bande" className="flex flex-wrap items-center gap-1.5">
              {RESOLUTIONS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`bande-resolution-${item.id}`}
                  aria-pressed={bande.resolution === item.id}
                  onClick={() => setForced(item.id)}
                  title={item.hint}
                  className={cn(
                    "h-8 rounded-full border px-3.5 text-xs motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40",
                    bande.resolution === item.id
                      ? "border-[var(--agency-ink)] bg-[var(--agency-ink)] text-[var(--agency-paper)]"
                      : "border-[var(--agency-hairline)] text-[var(--agency-body)] hover:border-[var(--agency-index)] hover:text-[var(--agency-ink)]",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div role="group" aria-label="Qui regarde l'écran" className="flex flex-wrap items-center gap-1.5">
              {ROLES.map(item => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`bande-role-${item.id}`}
                  aria-pressed={role === item.id}
                  onClick={() => setRole(item.id)}
                  title={item.hint}
                  className={cn(
                    "h-8 rounded-full px-3 text-xs motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40",
                    role === item.id
                      ? "bg-[var(--agency-ink)]/10 text-[var(--agency-ink)]"
                      : "text-[var(--agency-eyebrow)] hover:text-[var(--agency-ink)]",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main id="bande-contenu" data-testid="bande-page" className="mx-auto max-w-5xl px-5 pb-24 md:px-8">
        {/* ——— La régie : cinq nombres, pas un tableau de bord ——— */}
        <section aria-labelledby="bande-regie-titre" className="py-7">
          <h2 id="bande-regie-titre" className="sr-only">
            L'état du mariage en cinq nombres
          </h2>
          <dl data-testid="bande-regie" className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {bande.regie.map(figure => (
              <RegieFigureView key={figure.id} figure={figure} />
            ))}
          </dl>
          <p className="mt-5 text-xs text-[var(--agency-body)]" data-testid="bande-role-hint">
            {ROLES.find(item => item.id === role)?.hint} · {bande.visibleCount} Moment
            {bande.visibleCount > 1 ? "s" : ""} visible{bande.visibleCount > 1 ? "s" : ""} sur {bande.totalCount}.
          </p>
        </section>

        {/* ——— L'instant regardé : c'est lui qui choisit l'échelle ——— */}
        <section aria-labelledby="bande-instant-titre" className="border-t border-[var(--agency-hairline)] py-7">
          <h2 id="bande-instant-titre" className="agency-serif text-[19px]">
            L'instant regardé
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--agency-body)]">
            La Bande change d'échelle toute seule : les mois quand le mariage est loin, les engagements le dernier
            mois, les minutes le Jour J. Voyagez dans le temps pour voir les trois — c'est le même objet.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {instants.map(item => (
              <button
                key={item.id}
                type="button"
                data-testid={`bande-now-${item.id}`}
                onClick={() => travel(item.at)}
                className={cn(
                  "h-9 rounded-full border px-4 text-xs motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40",
                  Math.abs(now - item.at) < HOUR / 2
                    ? "border-[var(--agency-ink)] text-[var(--agency-ink)]"
                    : "border-[var(--agency-hairline)] text-[var(--agency-body)] hover:border-[var(--agency-index)] hover:text-[var(--agency-ink)]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--agency-eyebrow)]" data-testid="bande-now-label">
            {format(now, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })} ·{" "}
            {bande.days > 0 ? `J-${bande.days}` : bande.days === 0 ? "Jour J" : `J+${-bande.days}`} · échelle imposée
            par la date : {RESOLUTION_LABELS[bande.automatic]}
            {forced && forced !== bande.automatic ? " (vous avez forcé une autre échelle)" : ""}
          </p>
        </section>

        {/* ——— La phrase : le seul point d'entrée ——— */}
        <section aria-labelledby="bande-phrase-titre" className="border-t border-[var(--agency-hairline)] py-7">
          <h2 id="bande-phrase-titre" className="agency-serif text-[19px]">
            Une phrase, et le mariage existe
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--agency-body)]">
            Rien à remplir ligne par ligne : dites-le, AIME en tire un Monde — et montre ce qu'il a compris, ce qu'il a
            déduit, et ce qu'il ne sait pas encore.
          </p>
          <form onSubmit={applyPhrase} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="bande-phrase" className="sr-only">
              Décrivez votre mariage en une phrase
            </label>
            <input
              id="bande-phrase"
              data-testid="bande-phrase"
              value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder="Mariage le samedi 6 juin 2027, 120 invités, budget 30 000 €"
              className="h-11 flex-1 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-4 text-sm text-[var(--agency-ink)] placeholder:text-[var(--agency-index)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
            />
            <button
              type="submit"
              data-testid="bande-phrase-submit"
              disabled={draft.trim().length < MIN_INTENTION_LENGTH}
              className="h-11 shrink-0 rounded-full bg-[var(--agency-ink)] px-6 text-xs font-medium text-[var(--agency-paper)] motion-safe:transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Construire le Monde
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {PHRASE_EXAMPLES.map(example => (
              <button
                key={example}
                type="button"
                data-testid="bande-phrase-example"
                onClick={() => setDraft(example)}
                className="rounded-full border border-[var(--agency-hairline)] px-3 py-1.5 text-left text-[11px] leading-snug text-[var(--agency-body)] motion-safe:transition hover:border-[var(--agency-index)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
              >
                {example}
              </button>
            ))}
            <button
              type="button"
              data-testid="bande-reset"
              onClick={restart}
              className="rounded-full px-3 py-1.5 text-[11px] text-[var(--agency-eyebrow)] underline decoration-[var(--agency-hairline)] underline-offset-4 motion-safe:transition hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
            >
              Revenir au Monde de démonstration
            </button>
          </div>

          <ul data-testid="bande-facts" className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map(fact => (
              <li key={fact.id} data-testid={`bande-fact-${fact.id}`} className="flex items-baseline gap-2 text-sm">
                <span className="text-xs text-[var(--agency-eyebrow)]">{fact.label}</span>
                <span className="agency-serif text-[15px]">{fact.value}</span>
                <span
                  className={cn(
                    "ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[.1em]",
                    fact.needsAction
                      ? "border-[var(--agency-ink)]/35 text-[var(--agency-ink)]"
                      : "border-[var(--agency-hairline)] text-[var(--agency-eyebrow)]",
                  )}
                >
                  {fact.confidence}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ——— La Bande ——— */}
        <section aria-labelledby="bande-titre" className="border-t border-[var(--agency-hairline)] py-8">
          <h2 id="bande-titre" data-testid="bande-title" className="agency-serif text-[24px] leading-tight">
            {RESOLUTION_LABELS[bande.resolution]}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--agency-body)]">
            {RESOLUTIONS.find(item => item.id === bande.resolution)?.hint}
          </p>

          {bande.conflicts.length > 0 && (
            <p className="mt-4 rounded-lg border border-[var(--agency-hairline)] bg-[var(--agency-ink)]/[0.03] px-4 py-3 text-xs text-[var(--agency-body)]" data-testid="bande-conflicts">
              {bande.conflicts.length} conflit{bande.conflicts.length > 1 ? "s" : ""} détecté
              {bande.conflicts.length > 1 ? "s" : ""} dans le déroulé : {bande.conflicts.join(" · ")}
            </p>
          )}

          {bande.visibleCount === 0 && (
            <p className="mt-6 rounded-lg border border-[var(--agency-hairline)] px-4 py-5 text-sm text-[var(--agency-body)]" data-testid="bande-nothing-visible">
              Rien n'est publié pour ce rôle. Un invité ne voit que les Moments publiés à l'audience : sur un vrai
              Monde, publier un Moment le fait apparaître ici, sur sa page et sur le bilan partagé.
            </p>
          )}

          {bande.resolution === "mois" && (
            <div className="mt-7">
              {bande.chapters.map((chapter, index) => (
                <article key={chapter.chapter} data-testid={`bande-chapter-${index}`} className="mb-7">
                  <header className="flex items-baseline justify-between gap-4 border-b border-[var(--agency-hairline)] pb-2">
                    <h3 className="agency-serif text-[17px]">{chapter.chapter}</h3>
                    <p className="text-[11px] uppercase tracking-[.12em] text-[var(--agency-eyebrow)]">
                      {chapter.visibleCount} / {chapter.totalCount}
                    </p>
                  </header>
                  <ul>
                    {chapter.moments.map(moment => (
                      <MomentRow
                        key={moment.event.id}
                        moment={moment}
                        role={role}
                        selected={selectedId === moment.event.id}
                        onSelect={() => {
                          setSelectedId(moment.event.id === selectedId ? null : moment.event.id);
                          setPlan(null);
                        }}
                      />
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}

          {bande.resolution === "engagements" && (
            <div className="mt-7" data-testid="bande-engagements">
              {(["retard", "semaine", "suite"] as const).map(urgency => {
                const rows = bande.engagements.filter(item => item.urgency === urgency);
                if (rows.length === 0) return null;
                return (
                  <section key={urgency} className="mb-7">
                    <header className="flex items-baseline justify-between gap-4 border-b border-[var(--agency-hairline)] pb-2">
                      <h3 className="agency-serif text-[17px]">{URGENCY_LABELS[urgency]}</h3>
                      <p className="text-[11px] uppercase tracking-[.12em] text-[var(--agency-eyebrow)]">{rows.length}</p>
                    </header>
                    <ul>
                      {rows.map(engagement => (
                        <li
                          key={engagement.id}
                          data-testid={`bande-engagement-${engagement.id}`}
                          className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--agency-hairline)]/70 py-3"
                        >
                          <span className="w-24 shrink-0 text-[11px] uppercase tracking-[.12em] text-[var(--agency-eyebrow)]">
                            {ENGAGEMENT_KIND_LABELS[engagement.kind]}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="agency-serif block text-[15px] leading-snug">{engagement.label}</span>
                            {engagement.detail && (
                              <span className="mt-0.5 block text-xs leading-relaxed text-[var(--agency-body)]">
                                {engagement.detail}
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            data-testid={`bande-settle-${engagement.id}`}
                            onClick={() => setProject(settleEngagement(project, engagement))}
                            className="h-8 shrink-0 rounded-full border border-[var(--agency-hairline)] px-3.5 text-xs text-[var(--agency-body)] motion-safe:transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
                          >
                            C'est réglé
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
              {bande.engagements.length === 0 && (
                <p className="rounded-lg border border-[var(--agency-hairline)] px-4 py-5 text-sm text-[var(--agency-body)]">
                  Rien n'attend de réponse : tout ce que le graphe implique est déjà réglé.
                </p>
              )}
            </div>
          )}

          {bande.resolution === "minutes" && (
            <div className="mt-7" data-testid="bande-day">
              <p className="mb-5 text-sm text-[var(--agency-body)]" data-testid="bande-day-summary">
                {bande.day.snapshot.doneCount} / {bande.day.snapshot.total} Moments terminés
                {bande.day.snapshot.live ? ` · en cours : ${bande.day.snapshot.live.title}` : ""}
                {bande.day.snapshot.next ? ` · ensuite : ${bande.day.snapshot.next.title}` : ""}
                {bande.day.snapshot.firstLate
                  ? ` · en retard : ${bande.day.snapshot.firstLate.title}, prévu à ${format(bande.day.snapshot.firstLate.time, "HH'h'mm")}`
                  : ""}
              </p>
              <ul>
                {bande.day.moments.map(moment => (
                  <li
                    key={moment.event.id}
                    data-testid={`bande-day-${moment.event.id}`}
                    className={cn(
                      "flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--agency-hairline)]/70 py-3",
                      moment.state === "live" && "bg-[var(--agency-ink)]/[0.03]",
                    )}
                  >
                    <span className="w-16 shrink-0 font-display text-[15px] tabular-nums">{moment.clock}</span>
                    <span className="w-24 shrink-0 text-[11px] uppercase tracking-[.12em] text-[var(--agency-eyebrow)]">
                      {moment.state ? STATE_LABELS[moment.state] : ""}
                      {moment.countdown ? ` · ${moment.countdown}` : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="agency-serif block text-[15px] leading-snug">{moment.event.title}</span>
                      {moment.event.detail && (
                        <span className="mt-0.5 block text-xs leading-relaxed text-[var(--agency-body)]">
                          {moment.event.detail}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {DAY_SHIFT_OPTIONS.map(option => (
                        <button
                          key={option.minutes}
                          type="button"
                          data-testid={`bande-delay-${moment.event.id}-${option.minutes}`}
                          onClick={() => setProject(declareDayDelay(project, moment.event.id, option.minutes).project)}
                          className="h-8 rounded-full border border-[var(--agency-hairline)] px-3 text-xs tabular-nums text-[var(--agency-body)] motion-safe:transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
                        >
                          {option.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        data-testid={`bande-done-${moment.event.id}`}
                        onClick={() => setProject(markMomentDone(project, moment.event.id))}
                        className="h-8 rounded-full bg-[var(--agency-ink)] px-3.5 text-xs text-[var(--agency-paper)] motion-safe:transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
                      >
                        Terminé
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ——— Le tiroir : ce que le déplacement changerait ——— */}
        {selected && bande.resolution === "mois" && (
          <section
            aria-labelledby="bande-atelier-titre"
            data-testid="bande-atelier"
            className="sticky bottom-4 z-20 mt-2 rounded-xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 shadow-[0_12px_40px_-24px_rgba(23,20,16,0.45)]"
          >
            <h2 id="bande-atelier-titre" className="agency-serif text-[17px]">
              {selected.title}
            </h2>
            <p className="mt-1 text-xs text-[var(--agency-body)]">
              {format(selected.time, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
              {selected.durationMinutes ? ` · ${selected.durationMinutes} min` : ""}
            </p>

            {!plan && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--agency-eyebrow)]">Le déplacer de :</span>
                {SHIFT_OPTIONS.map(option => (
                  <button
                    key={option.minutes}
                    type="button"
                    data-testid={`bande-shift-${option.minutes}`}
                    onClick={() => proposeShift(option.minutes)}
                    className="h-8 rounded-full border border-[var(--agency-hairline)] px-3.5 text-xs text-[var(--agency-body)] motion-safe:transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  data-testid="bande-atelier-close"
                  onClick={() => setSelectedId(null)}
                  className="ml-auto text-xs text-[var(--agency-eyebrow)] underline decoration-[var(--agency-hairline)] underline-offset-4 motion-safe:transition hover:text-[var(--agency-ink)]"
                >
                  Fermer
                </button>
              </div>
            )}

            {plan && (
              <div aria-live="polite" data-testid="bande-plan" className="mt-4">
                <p className="text-sm text-[var(--agency-ink)]">
                  {plan.minutes > 0 ? "Plus tard" : "Plus tôt"} de {Math.abs(plan.minutes)} minutes.
                  {plan.plan.dependentChanges.length > 0
                    ? ` ${plan.plan.dependentChanges.length} Moment${plan.plan.dependentChanges.length > 1 ? "s" : ""} suivraient :`
                    : " Aucun autre Moment n'en dépend."}
                </p>
                {plan.plan.dependentChanges.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {plan.plan.dependentChanges.map(change => (
                      <li key={change.eventId} className="flex items-center gap-3 text-xs">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-[var(--agency-body)]">
                          <input
                            type="checkbox"
                            data-testid={`bande-plan-dependent-${change.eventId}`}
                            checked={plan.selected.includes(change.eventId)}
                            onChange={event =>
                              setPlan({
                                ...plan,
                                selected: event.target.checked
                                  ? [...plan.selected, change.eventId]
                                  : plan.selected.filter(id => id !== change.eventId),
                              })
                            }
                            className="h-4 w-4 accent-[var(--agency-ink)]"
                          />
                          <span className="truncate">{change.title}</span>
                        </label>
                        <span className="shrink-0 tabular-nums text-[var(--agency-eyebrow)]">
                          {format(change.currentTime, "HH'h'mm")} → {format(change.nextTime, "HH'h'mm")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {plan.plan.warnings.length > 0 && (
                  <p className="mt-3 text-xs text-[var(--agency-ink)]" data-testid="bande-plan-warnings">
                    {plan.plan.warnings.join(" · ")}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="bande-plan-apply"
                    onClick={applyPlan}
                    className="h-9 rounded-full bg-[var(--agency-ink)] px-5 text-xs font-medium text-[var(--agency-paper)] motion-safe:transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
                  >
                    Appliquer ce décalage
                  </button>
                  <button
                    type="button"
                    data-testid="bande-plan-cancel"
                    onClick={() => setPlan(null)}
                    className="h-9 rounded-full border border-[var(--agency-hairline)] px-5 text-xs text-[var(--agency-body)] motion-safe:transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
                  >
                    Revenir en arrière
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-[var(--agency-eyebrow)]">
                  Rien n'est écrit tant que vous n'avez pas appliqué : l'aperçu ne modifie pas le Monde.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ——— Ce que c'est, ce que ce n'est pas ——— */}
        <footer className="mt-12 border-t border-[var(--agency-hairline)] pt-7 text-xs leading-relaxed text-[var(--agency-body)]">
          <p className="max-w-3xl" data-testid="bande-scope">
            Prototype du lot 8 du plan : la Bande est une projection du graphe sur le temps, pas un nouvel endroit où
            saisir. Tout est calculé dans votre navigateur à partir d'un Monde de démonstration — aucune donnée n'est
            envoyée, rien n'est enregistré, aucune connexion n'est demandée. Le plan de table, le budget détaillé et les
            médias gardent leurs ateliers : la Bande porte le déroulé, pas les contraintes en deux dimensions.
          </p>
          <nav aria-label="Retour au site" className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            <Link href={sitePath("/")} className="underline decoration-[var(--agency-hairline)] underline-offset-4 motion-safe:transition hover:text-[var(--agency-ink)]">
              Accueil
            </Link>
            <Link href={sitePath("/agence")} className="underline decoration-[var(--agency-hairline)] underline-offset-4 motion-safe:transition hover:text-[var(--agency-ink)]">
              La vitrine de l'agence
            </Link>
            <Link href={sitePath("/mentions-legales")} className="underline decoration-[var(--agency-hairline)] underline-offset-4 motion-safe:transition hover:text-[var(--agency-ink)]">
              Mentions légales
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}

/** Un nombre de la régie : valeur lisible, détail en dessous, alerte écrite. */
function RegieFigureView({ figure }: { figure: RegieFigure }) {
  return (
    <div data-testid={`bande-regie-${figure.id}`}>
      <dt className="text-[11px] uppercase tracking-[.14em] text-[var(--agency-eyebrow)]">{figure.label}</dt>
      <dd className="mt-1.5 flex items-baseline gap-2">
        <span className="agency-serif text-[26px] leading-none">{figure.value}</span>
        {figure.alert && (
          <span className="rounded-full border border-[var(--agency-ink)]/35 px-2 py-0.5 text-[10px] uppercase tracking-[.1em] text-[var(--agency-ink)]">
            à traiter
          </span>
        )}
      </dd>
      <dd className="mt-1.5 text-xs leading-relaxed text-[var(--agency-body)]">{figure.detail}</dd>
    </div>
  );
}

/**
 * Une ligne de la Bande en résolution « mois ».
 *
 * Masquée pour le rôle consulté, la ligne le dit au lieu de disparaître : un
 * proche qui ne voit pas un Moment doit savoir qu'il existe quelque chose qu'on
 * ne lui montre pas, et pourquoi.
 */
function MomentRow({
  moment,
  role,
  selected,
  onSelect,
}: {
  moment: BandeMoment;
  role: RoleVisibility;
  selected: boolean;
  onSelect: () => void;
}) {
  if (!moment.visible) {
    return (
      <li
        data-testid={`bande-moment-${moment.event.id}`}
        className="flex items-baseline gap-4 border-b border-[var(--agency-hairline)]/70 py-3 text-[var(--agency-index)]"
      >
        <span className="w-16 shrink-0 text-xs tabular-nums">{format(moment.event.time, "d MMM", { locale: fr })}</span>
        <span className="text-xs italic">Moment masqué — {moment.maskedReason}</span>
      </li>
    );
  }

  return (
    <li data-testid={`bande-moment-${moment.event.id}`} className="border-b border-[var(--agency-hairline)]/70">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-start gap-4 py-3 text-left motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40",
          selected && "bg-[var(--agency-ink)]/[0.03]",
        )}
      >
        <span className="w-16 shrink-0 pt-0.5 text-xs tabular-nums text-[var(--agency-eyebrow)]">
          {format(moment.event.time, "d MMM", { locale: fr })}
        </span>
        <span className="min-w-0 flex-1">
          <span className="agency-serif flex items-center gap-2 text-[15px] leading-snug">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: KIND_COLORS.event }}
            />
            {moment.event.title}
          </span>
          {moment.event.detail && (
            <span className="mt-0.5 block text-xs leading-relaxed text-[var(--agency-body)]">{moment.event.detail}</span>
          )}
          {(moment.relations.length > 0 || moment.conflicts.length > 0 || moment.confidence) && (
            <span className="mt-2 flex flex-wrap items-center gap-1.5">
              {moment.relations.map(relation => (
                <span
                  key={`${relation.kind}:${relation.id}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-[var(--agency-hairline)] px-2 py-0.5 text-[10px] text-[var(--agency-body)]",
                    !relation.visible && "italic opacity-70",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: KIND_COLORS[relation.kind] }}
                  />
                  {relation.visible ? `${relation.family} · ${relation.label}` : `${relation.family} masqué`}
                </span>
              ))}
              {moment.confidence && (
                <span className="rounded-full border border-[var(--agency-hairline)] px-2 py-0.5 text-[10px] text-[var(--agency-eyebrow)]">
                  {moment.confidence}
                </span>
              )}
              {moment.conflicts.map(conflict => (
                <span
                  key={conflict}
                  data-testid={`bande-conflict-${moment.event.id}`}
                  className="rounded-full border border-[var(--agency-ink)]/35 px-2 py-0.5 text-[10px] text-[var(--agency-ink)]"
                >
                  {conflict}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="shrink-0 pt-0.5 text-[11px] uppercase tracking-[.12em] text-[var(--agency-index)]">
          {selected ? "ouvert" : role === "owner" || role === "planner" ? "décaler" : ""}
        </span>
      </button>
    </li>
  );
}

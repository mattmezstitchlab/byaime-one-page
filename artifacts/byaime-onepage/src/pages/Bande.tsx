import { useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { addDays, format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, CalendarDays, CircleCheck, Landmark, Sparkles, TriangleAlert, Users, Wallet } from "lucide-react";

import { KIND_COLORS } from "@/lib/category-colors";
import { cn } from "@/lib/utils";
import { MIN_INTENTION_LENGTH } from "@/lib/intention-draft";
import { useRouteMeta } from "@/lib/page-meta";
import { sitePath } from "@/lib/site-path";
import { Reveal } from "@/components/Reveal";
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
 * La Bande — `/monde`, dans la direction artistique de l'accueil.
 *
 * Même mise en scène que `Landing.tsx` : un hero pleine hauteur, un œil-de-bœuf
 * en petites capitales espacées, un titre en `aime-apple-title`, une amorce en
 * `aime-apple-lead`, la phrase dans une carte sombre arrondie (le « compositeur »
 * de l'accueil), des panneaux blancs bordés d'un filet, des boutons-pilules, et
 * des révélations au défilement (`Reveal`).
 *
 * Deux écarts assumés, et documentés :
 *  - **les couleurs de texte restent les jetons `--agency-*`**, mesurés AA. Les
 *    deux classes de petites capitales de l'accueil (œil-de-bœuf et ligne de
 *    réassurance) posent du texte à `foreground / 0.55`, soit ~3,9:1 sur blanc :
 *    sous le seuil AA pour du petit texte. Leur dessin est repris — capitales,
 *    espacement 0,24 em — avec un jeton mesuré à 5,20:1, et
 *    `agency-theme.test.ts` recalcule ces contrastes à chaque contrôle ;
 *  - **le rythme est plus serré** (`py-16`/`py-24` au lieu de `py-24`/`py-36`) :
 *    l'accueil est une vitrine qui se regarde, la Bande est un écran qui
 *    s'emploie. Même langage, pas même respiration.
 *
 * Trois règles inchangées : aucune session (ni Clerk, ni store, ni réseau), rien
 * n'est écrit sans un second geste, et la couleur ne porte jamais seule une
 * information — l'état d'un Moment est écrit en toutes lettres.
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

/** Œil-de-bœuf de l'accueil, repris avec un contraste mesuré AA (5,20:1). */
const EYEBROW = "text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--agency-eyebrow)]";

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

const REGIE_ICONS: Record<RegieFigure["id"], typeof CalendarDays> = {
  jours: CalendarDays,
  argent: Landmark,
  "a-payer": Wallet,
  invites: Users,
  prestataires: CircleCheck,
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

      {/* ——— Navigation fine, façon Apple : la même barre que l'accueil ——— */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-5 md:px-8">
          <Link
            href={sitePath("/")}
            data-testid="bande-home"
            aria-label="AIME — retour à l'accueil"
            className="inline-flex items-center font-display text-[15px] font-semibold tracking-[.28em] text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
          >
            AIME
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href={sitePath("/agence")}
              data-testid="bande-agency"
              className="hidden h-8 items-center rounded-full px-3 text-xs text-[var(--agency-ink)]/75 motion-safe:transition hover:bg-[var(--agency-ink)]/10 hover:text-[var(--agency-ink)] sm:inline-flex"
            >
              L'agence
            </Link>
            <span className="inline-flex h-8 items-center rounded-full bg-[var(--agency-ink)] px-4 text-xs font-semibold text-[var(--agency-paper)]">
              La Bande
            </span>
          </div>
        </div>
      </header>

      <main id="bande-contenu" data-testid="bande-page">
        {/* ——— Hero : la promesse, et la phrase pour la tenir ——— */}
        <section
          data-testid="bande-hero"
          className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6 pb-20 pt-28 md:pb-24 md:pt-32"
        >
          <div className="mx-auto w-full max-w-5xl text-center">
            <Reveal className="flex flex-col items-center">
              <p className={EYEBROW}>Prototype · lot 8 du plan</p>
              <h1 className="aime-apple-title mt-6 max-w-3xl text-5xl text-[var(--agency-ink)] md:text-7xl">
                La Bande
              </h1>
              <p className="aime-apple-lead mx-auto mt-6 max-w-2xl text-lg text-[var(--agency-body)] md:text-xl">
                Tout le mariage sur un seul écran. Il change d'échelle tout seul : les mois quand le mariage est loin,
                les engagements le dernier mois, les minutes le Jour J.
              </p>
            </Reveal>

            {/* Le compositeur : la carte sombre de l'accueil, même objet. */}
            <Reveal className="mt-12">
              <div
                data-testid="bande-composer"
                className="mx-auto max-w-2xl rounded-[2rem] border border-[var(--agency-paper)]/15 bg-[var(--agency-ink)] p-6 text-left text-[var(--agency-paper)] shadow-[0_24px_60px_-40px_rgba(23,20,16,0.9)] sm:p-8"
              >
                <form onSubmit={applyPhrase}>
                  <label
                    htmlFor="bande-phrase"
                    className="block text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--agency-paper)]/70"
                  >
                    Décrivez votre mariage en une phrase
                  </label>
                  <input
                    id="bande-phrase"
                    data-testid="bande-phrase"
                    value={draft}
                    onChange={event => setDraft(event.target.value)}
                    placeholder="Mariage le samedi 6 juin 2027, 120 invités, budget 30 000 €"
                    className="mt-4 w-full rounded-2xl border border-[var(--agency-paper)]/25 bg-[var(--agency-paper)]/10 px-5 py-4 text-[15px] text-[var(--agency-paper)] placeholder:text-[var(--agency-paper)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-paper)]/70"
                  />
                  <button
                    type="submit"
                    data-testid="bande-phrase-submit"
                    disabled={draft.trim().length < MIN_INTENTION_LENGTH}
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--agency-paper)] px-7 text-[14px] font-semibold text-[var(--agency-ink)] motion-safe:transition hover:bg-[var(--agency-paper)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-paper)]/70 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Construire le Monde
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </button>
                </form>
                <div className="mt-5 flex flex-wrap gap-2">
                  {PHRASE_EXAMPLES.map(example => (
                    <button
                      key={example}
                      type="button"
                      data-testid="bande-phrase-example"
                      onClick={() => setDraft(example)}
                      className="rounded-full border border-[var(--agency-paper)]/25 px-3 py-1.5 text-[11px] leading-snug text-[var(--agency-paper)]/80 motion-safe:transition hover:border-[var(--agency-paper)]/60 hover:text-[var(--agency-paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-paper)]/70"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal>
              <p className={cn(EYEBROW, "mt-8")}>Rien n'est envoyé · rien n'est enregistré · aucune connexion demandée</p>
              <button
                type="button"
                data-testid="bande-reset"
                onClick={restart}
                className="mt-5 text-xs text-[var(--agency-eyebrow)] underline decoration-[var(--agency-hairline)] underline-offset-4 motion-safe:transition hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
              >
                Revenir au Monde de démonstration
              </button>
            </Reveal>
          </div>
        </section>

        {/* ——— Ce que la phrase a fait comprendre ——— */}
        <section className="relative z-10 border-t border-[var(--agency-hairline)] bg-[var(--agency-paper)] py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-6">
            <Reveal className="text-center">
              <p className={EYEBROW}>La phrase</p>
              <h2 className="aime-apple-title mt-5 text-4xl md:text-5xl">Ce qu'AIME a compris</h2>
              <p className="aime-apple-lead mx-auto mt-5 max-w-2xl text-base md:text-lg">
                Chaque information porte son état : confirmé, déduit, suggéré, à confirmer, manquant. Ce qui n'a pas été
                dit reste dit comme manquant — jamais inventé.
              </p>
            </Reveal>
            <Reveal className="mt-12">
              <ul data-testid="bande-facts" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {facts.map(item => (
                  <li
                    key={item.id}
                    data-testid={`bande-fact-${item.id}`}
                    className={cn(
                      "rounded-3xl border bg-[var(--agency-paper)] p-5",
                      item.needsAction ? "border-[var(--agency-ink)]/35" : "border-[var(--agency-hairline)]",
                    )}
                  >
                    <p className={EYEBROW}>{item.label}</p>
                    <p className="aime-apple-title mt-3 text-2xl">{item.value}</p>
                    <p className="mt-3 text-[11px] uppercase tracking-[.14em] text-[var(--agency-body)]">
                      {item.confidence}
                    </p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ——— La régie : cinq nombres ——— */}
        <section className="relative z-10 border-t border-[var(--agency-hairline)] bg-[var(--agency-paper)] py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-6">
            <Reveal className="text-center">
              <p className={EYEBROW}>L'état du mariage</p>
              <h2 className="aime-apple-title mt-5 text-4xl md:text-5xl">Cinq nombres, pas un tableau de bord</h2>
              <p className="aime-apple-lead mx-auto mt-5 max-w-2xl text-base md:text-lg">
                Ils ne sont saisis nulle part : ils sortent du graphe. Régler une ligne plus bas change le nombre ici,
                parce que c'est la même donnée.
              </p>
            </Reveal>
            <Reveal className="mt-12">
              <dl data-testid="bande-regie" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bande.regie.map(figure => (
                  <RegieFigureView key={figure.id} figure={figure} />
                ))}
              </dl>
            </Reveal>
            <Reveal>
              <p className="mt-6 text-center text-sm text-[var(--agency-body)]" data-testid="bande-role-hint">
                {ROLES.find(item => item.id === role)?.hint} · {bande.visibleCount} Moment
                {bande.visibleCount > 1 ? "s" : ""} visible{bande.visibleCount > 1 ? "s" : ""} sur {bande.totalCount}.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ——— L'instant regardé : c'est lui qui choisit l'échelle ——— */}
        <section className="relative z-10 border-t border-[var(--agency-hairline)] bg-[var(--agency-paper)] py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-6">
            <Reveal className="text-center">
              <p className={EYEBROW}>L'instant regardé</p>
              <h2 className="aime-apple-title mt-5 text-4xl md:text-5xl">Le même écran, trois échelles</h2>
              <p className="aime-apple-lead mx-auto mt-5 max-w-2xl text-base md:text-lg">
                Voyagez dans le temps : la Bande passe toute seule des mois aux engagements, puis aux minutes du Jour J.
              </p>
            </Reveal>

            <Reveal className="mt-10">
              <div className="flex flex-wrap justify-center gap-2">
                {instants.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`bande-now-${item.id}`}
                    onClick={() => travel(item.at)}
                    className={cn(
                      "aime-apple-pill text-[13px]",
                      Math.abs(now - item.at) < HOUR / 2
                        ? "bg-[var(--agency-ink)] text-[var(--agency-paper)]"
                        : "aime-apple-pill-ghost",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mt-5 text-center text-xs text-[var(--agency-eyebrow)]" data-testid="bande-now-label">
                {format(now, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })} ·{" "}
                {bande.days > 0 ? `J-${bande.days}` : bande.days === 0 ? "Jour J" : `J+${-bande.days}`} · échelle imposée
                par la date : {RESOLUTION_LABELS[bande.automatic]}
                {forced && forced !== bande.automatic ? " (vous avez forcé une autre échelle)" : ""}
              </p>
            </Reveal>

            <Reveal className="mt-10">
              <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
                <div role="group" aria-label="Échelle de la Bande" className="rounded-3xl border border-[var(--agency-hairline)] p-5">
                  <p className={EYEBROW}>L'échelle</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {RESOLUTIONS.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`bande-resolution-${item.id}`}
                        aria-pressed={bande.resolution === item.id}
                        onClick={() => setForced(item.id)}
                        title={item.hint}
                        className={cn(
                          "h-9 rounded-full border px-4 text-xs motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40",
                          bande.resolution === item.id
                            ? "border-[var(--agency-ink)] bg-[var(--agency-ink)] text-[var(--agency-paper)]"
                            : "border-[var(--agency-hairline)] text-[var(--agency-body)] hover:border-[var(--agency-index)] hover:text-[var(--agency-ink)]",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div role="group" aria-label="Qui regarde l'écran" className="rounded-3xl border border-[var(--agency-hairline)] p-5">
                  <p className={EYEBROW}>Qui regarde</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {ROLES.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`bande-role-${item.id}`}
                        aria-pressed={role === item.id}
                        onClick={() => setRole(item.id)}
                        title={item.hint}
                        className={cn(
                          "h-9 rounded-full px-3.5 text-xs motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40",
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
            </Reveal>
          </div>
        </section>

        {/* ——— La Bande ——— */}
        <section className="relative z-10 border-t border-[var(--agency-hairline)] bg-[var(--agency-paper)] py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-6">
            <Reveal className="text-center">
              <p className={EYEBROW}>La Bande</p>
              <h2 id="bande-titre" data-testid="bande-title" className="aime-apple-title mt-5 text-4xl md:text-6xl">
                {RESOLUTION_LABELS[bande.resolution]}
              </h2>
              <p className="aime-apple-lead mx-auto mt-5 max-w-2xl text-base md:text-lg">
                {RESOLUTIONS.find(item => item.id === bande.resolution)?.hint}
              </p>
            </Reveal>

            {bande.conflicts.length > 0 && (
              <Reveal className="mt-8">
                <p
                  className="mx-auto flex max-w-2xl items-start gap-3 rounded-3xl border border-[var(--agency-ink)]/35 bg-[var(--agency-ink)]/[0.03] px-5 py-4 text-sm text-[var(--agency-body)]"
                  data-testid="bande-conflicts"
                >
                  <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--agency-ink)]" />
                  <span>
                    {bande.conflicts.length} conflit{bande.conflicts.length > 1 ? "s" : ""} détecté
                    {bande.conflicts.length > 1 ? "s" : ""} dans le déroulé : {bande.conflicts.join(" · ")}
                  </span>
                </p>
              </Reveal>
            )}

            {bande.visibleCount === 0 && (
              <Reveal className="mt-8">
                <p
                  className="mx-auto max-w-2xl rounded-3xl border border-[var(--agency-hairline)] px-5 py-6 text-center text-sm text-[var(--agency-body)]"
                  data-testid="bande-nothing-visible"
                >
                  Rien n'est publié pour ce rôle. Un invité ne voit que les Moments publiés à l'audience : sur un vrai
                  Monde, publier un Moment le fait apparaître ici, sur sa page et sur le bilan partagé.
                </p>
              </Reveal>
            )}

            {bande.resolution === "mois" && (
              <div className="mt-12 space-y-6">
                {bande.chapters.map((chapter, index) => (
                  <Reveal key={chapter.chapter}>
                    <article
                      data-testid={`bande-chapter-${index}`}
                      className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 sm:p-7"
                    >
                      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--agency-hairline)] pb-3">
                        <h3 className="font-display text-lg font-semibold tracking-tight text-[var(--agency-ink)]">
                          {chapter.chapter}
                        </h3>
                        <p className={EYEBROW}>
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
                  </Reveal>
                ))}
              </div>
            )}

            {bande.resolution === "engagements" && (
              <div className="mt-12 space-y-6" data-testid="bande-engagements">
                {(["retard", "semaine", "suite"] as const).map(urgency => {
                  const rows = bande.engagements.filter(item => item.urgency === urgency);
                  if (rows.length === 0) return null;
                  return (
                    <Reveal key={urgency}>
                      <section className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 sm:p-7">
                        <header className="flex items-baseline justify-between gap-4 border-b border-[var(--agency-hairline)] pb-3">
                          <h3 className="font-display text-lg font-semibold tracking-tight text-[var(--agency-ink)]">
                            {URGENCY_LABELS[urgency]}
                          </h3>
                          <p className={EYEBROW}>{rows.length}</p>
                        </header>
                        <ul>
                          {rows.map(engagement => (
                            <li
                              key={engagement.id}
                              data-testid={`bande-engagement-${engagement.id}`}
                              className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-[var(--agency-hairline)]/70 py-4 last:border-b-0"
                            >
                              <span className={cn(EYEBROW, "w-24 shrink-0")}>
                                {ENGAGEMENT_KIND_LABELS[engagement.kind]}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-display text-[15px] font-medium tracking-tight">
                                  {engagement.label}
                                </span>
                                {engagement.detail && (
                                  <span className="mt-1 block text-xs leading-relaxed text-[var(--agency-body)]">
                                    {engagement.detail}
                                  </span>
                                )}
                              </span>
                              <button
                                type="button"
                                data-testid={`bande-settle-${engagement.id}`}
                                onClick={() => setProject(settleEngagement(project, engagement))}
                                className="h-9 shrink-0 rounded-full border border-[var(--agency-hairline)] px-4 text-xs text-[var(--agency-body)] motion-safe:transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
                              >
                                C'est réglé
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    </Reveal>
                  );
                })}
                {bande.engagements.length === 0 && (
                  <p className="rounded-3xl border border-[var(--agency-hairline)] px-5 py-6 text-center text-sm text-[var(--agency-body)]">
                    Rien n'attend de réponse : tout ce que le graphe implique est déjà réglé.
                  </p>
                )}
              </div>
            )}

            {bande.resolution === "minutes" && (
              <div className="mt-12" data-testid="bande-day">
                <Reveal>
                  <div className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-ink)] p-6 text-[var(--agency-paper)] sm:p-8">
                    <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--agency-paper)]/70">
                      La régie
                    </p>
                    <p className="mt-3 text-lg font-light leading-relaxed" data-testid="bande-day-summary">
                      {bande.day.snapshot.doneCount} / {bande.day.snapshot.total} Moments terminés
                      {bande.day.snapshot.live ? ` · en cours : ${bande.day.snapshot.live.title}` : ""}
                      {bande.day.snapshot.next ? ` · ensuite : ${bande.day.snapshot.next.title}` : ""}
                      {bande.day.snapshot.firstLate
                        ? ` · en retard : ${bande.day.snapshot.firstLate.title}, prévu à ${format(bande.day.snapshot.firstLate.time, "HH'h'mm")}`
                        : ""}
                    </p>
                  </div>
                </Reveal>
                <Reveal className="mt-6">
                  <ul className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 sm:p-7">
                    {bande.day.moments.map(moment => (
                      <li
                        key={moment.event.id}
                        data-testid={`bande-day-${moment.event.id}`}
                        className={cn(
                          "flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-[var(--agency-hairline)]/70 py-4 last:border-b-0",
                          moment.state === "live" && "rounded-2xl bg-[var(--agency-ink)]/[0.04] px-3",
                        )}
                      >
                        <span className="w-16 shrink-0 font-display text-[17px] font-semibold tabular-nums tracking-tight">
                          {moment.clock}
                        </span>
                        <span className={cn(EYEBROW, "w-28 shrink-0")}>
                          {moment.state ? STATE_LABELS[moment.state] : ""}
                          {moment.countdown ? ` · ${moment.countdown}` : ""}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-[15px] font-medium tracking-tight">
                            {moment.event.title}
                          </span>
                          {moment.event.detail && (
                            <span className="mt-1 block text-xs leading-relaxed text-[var(--agency-body)]">
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
                              className="h-9 rounded-full border border-[var(--agency-hairline)] px-3 text-xs tabular-nums text-[var(--agency-body)] motion-safe:transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
                            >
                              {option.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            data-testid={`bande-done-${moment.event.id}`}
                            onClick={() => setProject(markMomentDone(project, moment.event.id))}
                            className="h-9 rounded-full bg-[var(--agency-ink)] px-4 text-xs font-medium text-[var(--agency-paper)] motion-safe:transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
                          >
                            Terminé
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>
            )}

            {/* ——— Le tiroir : ce que le déplacement changerait ——— */}
            {selected && bande.resolution === "mois" && (
              <section
                aria-labelledby="bande-atelier-titre"
                data-testid="bande-atelier"
                className="sticky bottom-4 z-20 mt-8 rounded-[2rem] border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-6 shadow-[0_24px_60px_-40px_rgba(23,20,16,0.9)] sm:p-8"
              >
                <p className={EYEBROW}>Le tiroir</p>
                <h2 id="bande-atelier-titre" className="aime-apple-title mt-3 text-2xl md:text-3xl">
                  {selected.title}
                </h2>
                <p className="mt-2 text-sm text-[var(--agency-body)]">
                  {format(selected.time, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                  {selected.durationMinutes ? ` · ${selected.durationMinutes} min` : ""}
                </p>

                {!plan && (
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--agency-eyebrow)]">Le déplacer de :</span>
                    {SHIFT_OPTIONS.map(option => (
                      <button
                        key={option.minutes}
                        type="button"
                        data-testid={`bande-shift-${option.minutes}`}
                        onClick={() => proposeShift(option.minutes)}
                        className="h-9 rounded-full border border-[var(--agency-hairline)] px-4 text-xs text-[var(--agency-body)] motion-safe:transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
                      >
                        {option.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      data-testid="bande-atelier-close"
                      onClick={() => setSelectedId(null)}
                      className="ml-auto text-xs text-[var(--agency-eyebrow)] underline decoration-[var(--agency-hairline)] underline-offset-4 motion-safe:transition hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
                    >
                      Fermer
                    </button>
                  </div>
                )}

                {plan && (
                  <div aria-live="polite" data-testid="bande-plan" className="mt-5">
                    <p className="text-sm text-[var(--agency-ink)]">
                      {plan.minutes > 0 ? "Plus tard" : "Plus tôt"} de {Math.abs(plan.minutes)} minutes.
                      {plan.plan.dependentChanges.length > 0
                        ? ` ${plan.plan.dependentChanges.length} Moment${plan.plan.dependentChanges.length > 1 ? "s" : ""} suivraient :`
                        : " Aucun autre Moment n'en dépend."}
                    </p>
                    {plan.plan.dependentChanges.length > 0 && (
                      <ul className="mt-4 space-y-2.5">
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
                      <p className="mt-4 text-xs text-[var(--agency-ink)]" data-testid="bande-plan-warnings">
                        {plan.plan.warnings.join(" · ")}
                      </p>
                    )}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        data-testid="bande-plan-apply"
                        onClick={applyPlan}
                        className="aime-apple-pill aime-apple-pill-accent text-[13px]"
                      >
                        Appliquer ce décalage
                        <ArrowRight aria-hidden className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        data-testid="bande-plan-cancel"
                        onClick={() => setPlan(null)}
                        className="aime-apple-pill aime-apple-pill-ghost text-[13px]"
                      >
                        Revenir en arrière
                      </button>
                    </div>
                    <p className="mt-4 text-[11px] uppercase tracking-[.14em] text-[var(--agency-eyebrow)]">
                      Rien n'est écrit tant que vous n'avez pas appliqué : l'aperçu ne modifie pas le Monde.
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>
        </section>

        {/* ——— Ce que c'est, ce que ce n'est pas ——— */}
        <section className="relative z-10 border-t border-[var(--agency-hairline)] bg-[var(--agency-paper)] py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <Reveal>
              <p className={EYEBROW}>Où en est cet écran</p>
              <h2 className="aime-apple-title mt-5 text-3xl md:text-4xl">Un prototype, pas une promesse</h2>
              <p className="aime-apple-lead mx-auto mt-5 text-base leading-relaxed md:text-lg" data-testid="bande-scope">
                Prototype du lot 8 du plan : la Bande est une projection du graphe sur le temps, pas un nouvel endroit où
                saisir. Tout est calculé dans votre navigateur à partir d'un Monde de démonstration — aucune donnée n'est
                envoyée, rien n'est enregistré, aucune connexion n'est demandée. Le plan de table, le budget détaillé et
                les médias gardent leurs ateliers : la Bande porte le déroulé, pas les contraintes en deux dimensions.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
                <Link
                  href={sitePath("/")}
                  className="inline-flex items-center gap-2 text-[var(--agency-body)] underline decoration-[var(--agency-hairline)] underline-offset-4 motion-safe:transition hover:text-[var(--agency-ink)]"
                >
                  Accueil
                </Link>
                <Link
                  href={sitePath("/agence")}
                  className="inline-flex items-center gap-2 text-[var(--agency-body)] underline decoration-[var(--agency-hairline)] underline-offset-4 motion-safe:transition hover:text-[var(--agency-ink)]"
                >
                  La vitrine de l'agence
                </Link>
                <Link
                  href={sitePath("/mentions-legales")}
                  className="inline-flex items-center gap-2 text-[var(--agency-body)] underline decoration-[var(--agency-hairline)] underline-offset-4 motion-safe:transition hover:text-[var(--agency-ink)]"
                >
                  Mentions légales
                </Link>
              </div>
              <p className="mt-10 text-[11px] uppercase tracking-[.18em] text-[var(--agency-eyebrow)]">
                AIME — {new Date().getFullYear()}
              </p>
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  );
}

/** Un nombre de la régie : icône posée comme sur l'accueil, valeur en titrage. */
function RegieFigureView({ figure }: { figure: RegieFigure }) {
  const Icon = REGIE_ICONS[figure.id] ?? Sparkles;
  return (
    <div
      data-testid={`bande-regie-${figure.id}`}
      className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5 text-left"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--agency-hairline)] bg-[var(--agency-ink)]/5 text-[var(--agency-ink)]">
        <Icon aria-hidden className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <dt className={cn(EYEBROW, "mt-5")}>{figure.label}</dt>
      <dd className="aime-apple-title mt-2 flex flex-wrap items-baseline gap-2 text-3xl">
        {figure.value}
        {figure.alert && (
          <span className="rounded-full border border-[var(--agency-ink)]/35 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[.1em] text-[var(--agency-ink)]">
            à traiter
          </span>
        )}
      </dd>
      <dd className="mt-2 text-xs leading-relaxed text-[var(--agency-body)]">{figure.detail}</dd>
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
        className="flex items-baseline gap-4 border-b border-[var(--agency-hairline)]/70 py-4 text-[var(--agency-index)] last:border-b-0"
      >
        <span className="w-16 shrink-0 text-xs tabular-nums">{format(moment.event.time, "d MMM", { locale: fr })}</span>
        <span className="text-xs italic">Moment masqué — {moment.maskedReason}</span>
      </li>
    );
  }

  return (
    <li data-testid={`bande-moment-${moment.event.id}`} className="border-b border-[var(--agency-hairline)]/70 last:border-b-0">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-start gap-4 rounded-2xl py-4 text-left motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40",
          selected && "bg-[var(--agency-ink)]/[0.04] px-3",
        )}
      >
        <span className="w-16 shrink-0 pt-0.5 text-xs tabular-nums text-[var(--agency-eyebrow)]">
          {format(moment.event.time, "d MMM", { locale: fr })}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-display text-[15px] font-medium tracking-tight">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: KIND_COLORS.event }}
            />
            {moment.event.title}
          </span>
          {moment.event.detail && (
            <span className="mt-1 block text-xs leading-relaxed text-[var(--agency-body)]">{moment.event.detail}</span>
          )}
          {(moment.relations.length > 0 || moment.conflicts.length > 0 || moment.confidence) && (
            <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--agency-ink)]/35 px-2 py-0.5 text-[10px] text-[var(--agency-ink)]"
                >
                  <TriangleAlert aria-hidden className="h-3 w-3" />
                  {conflict}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className={cn(EYEBROW, "shrink-0 pt-0.5")}>
          {selected ? "ouvert" : role === "owner" || role === "planner" ? "décaler" : ""}
        </span>
      </button>
    </li>
  );
}

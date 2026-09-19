import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, Clapperboard, Play, X } from "lucide-react";
import { useI18n, type I18nKey } from "@/lib/i18n";
import { Reveal } from "@/components/Reveal";
import { getAssetUrl } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { LandingDeviceFrame, LandingDeviceThumb } from "@/components/LandingDeviceFrame";

/**
 * La visite guidée — huit chapitres réels, une voix off.
 *
 * Ce ne sont pas des maquettes : chaque chapitre est un enregistrement d'écran
 * du produit (`scripts/record-tour.mjs`), joué à la vitesse de sa narration. La
 * voix explique le concept, l'écran montre le geste ; les sous-titres reprennent
 * la phrase dictée, pour que la vidéo reste lisible sans son.
 *
 * Le lecteur est unique et le chapitre courant se choisit dans un carrousel :
 * huit affiches prises dans la vidéo, une seule vidéo chargée à la fois
 * (`preload="none"` — l'accueil reste léger sur mobile). La visite complète est
 * le même plan-séquence, recollé : pas de montage parallèle, donc pas de
 * divergence possible entre le film et ses chapitres.
 */

export type TourChapterId =
  | "concept"
  | "inscription"
  | "monde"
  | "ouverture"
  | "timeline"
  | "invites"
  | "prestataires"
  | "partage";

export type TourChapter = {
  id: TourChapterId;
  n: string;
  label: I18nKey;
  text: I18nKey;
  /** Durée lisible, figée à l'encodage et vérifiée par test contre le manifeste. */
  duration: string;
};

/* Les durées viennent de `public/videos/tour.manifest.json`, produit par
   l'enregistrement. `landing-tour.test.tsx` vérifie qu'elles collent encore au
   fichier : une durée annoncée n'est pas un ornement, c'est une promesse. */
export const TOUR_CHAPTERS: ReadonlyArray<TourChapter> = [
  { id: "concept", n: "01", label: "tour.concept.label", text: "tour.concept.text", duration: "0:43" },
  { id: "inscription", n: "02", label: "tour.inscription.label", text: "tour.inscription.text", duration: "0:45" },
  { id: "monde", n: "03", label: "tour.monde.label", text: "tour.monde.text", duration: "0:51" },
  { id: "ouverture", n: "04", label: "tour.ouverture.label", text: "tour.ouverture.text", duration: "0:43" },
  { id: "timeline", n: "05", label: "tour.timeline.label", text: "tour.timeline.text", duration: "0:40" },
  { id: "invites", n: "06", label: "tour.invites.label", text: "tour.invites.text", duration: "1:00" },
  { id: "prestataires", n: "07", label: "tour.prestataires.label", text: "tour.prestataires.text", duration: "0:54" },
  { id: "partage", n: "08", label: "tour.partage.label", text: "tour.partage.text", duration: "0:50" },
];

/** Le plan-séquence entier, chapitres recollés dans l'ordre. */
export const TOUR_FILM = { duration: "6:27" } as const;

export function tourVideoUrl(id: TourChapterId | "complet") {
  return getAssetUrl(`videos/tour-${id}.mp4`);
}

export function tourPosterUrl(id: TourChapterId | "complet") {
  return getAssetUrl(`videos/tour-${id}.jpg`);
}

export function LandingTour() {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [film, setFilm] = useState(false);
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const current = TOUR_CHAPTERS[index];

  const select = useCallback((next: number, focus = false) => {
    setFilm(false);
    const wrapped = (next + TOUR_CHAPTERS.length) % TOUR_CHAPTERS.length;
    setIndex(wrapped);
    if (focus) tabsRef.current[wrapped]?.focus();
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") { event.preventDefault(); select(index + 1, true); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); select(index - 1, true); }
    else if (event.key === "Home") { event.preventDefault(); select(0, true); }
    else if (event.key === "End") { event.preventDefault(); select(TOUR_CHAPTERS.length - 1, true); }
  };

  return (
    <section
      id="landing-tour"
      data-testid="landing-tour"
      aria-labelledby="landing-tour-title"
      className="aime-apple-surface relative z-10 border-t border-border/60 bg-background py-24 md:py-32"
    >
      <div className="mx-auto max-w-5xl px-6">
        <Reveal className="text-center">
          <p className="aime-apple-eyebrow">{t("tour.eyebrow")}</p>
          <h2 id="landing-tour-title" className="aime-apple-title mt-5 text-4xl md:text-6xl">
            {t("tour.title")}
          </h2>
          <p className="aime-apple-lead mx-auto mt-5 max-w-2xl text-base md:text-lg">{t("tour.subtitle")}</p>
        </Reveal>

        <Reveal className="mt-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
            <div>
              <TourPlayer
                key={film ? "complet" : current.id}
                id={film ? "complet" : current.id}
                title={film ? t("tour.film.title") : t(current.label)}
                duration={film ? TOUR_FILM.duration : current.duration}
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {film ? t("tour.film.caption") : `${current.n} · ${t(current.label)}`}
                </p>
                <button
                  type="button"
                  data-testid="landing-tour-film"
                  onClick={() => setFilm(value => !value)}
                  className="aime-apple-pill aime-apple-pill-ghost inline-flex items-center gap-2 text-sm"
                >
                  {film
                    ? <X className="h-4 w-4" aria-hidden="true" />
                    : <Clapperboard className="h-4 w-4" aria-hidden="true" />}
                  {film ? t("tour.film.leave") : t("tour.film.enter", { duration: TOUR_FILM.duration })}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[.2em] text-muted-foreground">
                  {t("tour.counter", { n: film ? "—" : current.n, total: String(TOUR_CHAPTERS.length) })}
                </p>
                <div className="flex gap-1.5">
                  <CarouselArrow direction="prev" onClick={() => select(index - 1)} />
                  <CarouselArrow direction="next" onClick={() => select(index + 1)} />
                </div>
              </div>
              <div
                role="tablist"
                aria-label={t("tour.tabs")}
                onKeyDown={onKeyDown}
                data-testid="landing-tour-tabs"
                className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:grid lg:max-h-[420px] lg:grid-cols-1 lg:gap-3 lg:overflow-y-auto lg:pb-0"
              >
                {TOUR_CHAPTERS.map((chapter, position) => (
                  <ChapterTab
                    key={chapter.id}
                    chapter={chapter}
                    selected={!film && position === index}
                    forwardedRef={node => { tabsRef.current[position] = node; }}
                    onSelect={() => select(position)}
                  />
                ))}
              </div>
              <p className="sr-only" aria-live="polite" data-testid="landing-tour-status">
                {film
                  ? t("tour.film.title")
                  : t("tour.announce", { n: String(index + 1), total: String(TOUR_CHAPTERS.length), label: t(current.label) })}
              </p>
              <div id="landing-tour-panel" role="tabpanel" aria-labelledby={`landing-tour-tab-${current.id}`} className="mt-6">
                <p className="text-sm leading-relaxed text-muted-foreground">{film ? t("tour.film.text") : t(current.text)}</p>
                <Link
                  href="/creation"
                  data-testid="landing-tour-cta"
                  className="aime-apple-pill mt-5 inline-flex items-center gap-2 text-sm"
                >
                  {t("tour.cta")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">{t("tour.caption")}</p>
        </Reveal>
      </div>
    </section>
  );
}

/** Une pastille du carrousel : l'affiche du chapitre, son numéro, sa durée. */
function ChapterTab({
  chapter,
  selected,
  forwardedRef,
  onSelect,
}: {
  chapter: TourChapter;
  selected: boolean;
  forwardedRef: (node: HTMLButtonElement | null) => void;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      ref={forwardedRef}
      type="button"
      role="tab"
      id={`landing-tour-tab-${chapter.id}`}
      aria-selected={selected}
      aria-controls="landing-tour-panel"
      tabIndex={selected ? 0 : -1}
      data-testid={`landing-tour-tab-${chapter.id}`}
      onClick={onSelect}
      className={cn(
        "group flex w-[228px] shrink-0 items-center gap-3 rounded-2xl border p-2 text-left transition lg:w-full",
        selected
          ? "border-[var(--agency-ink)]/35 bg-card shadow-sm"
          : "border-border/70 hover:border-[var(--agency-ink)]/20 hover:bg-card/60",
      )}
    >
      {/* La vignette est dans sa propre vitre : c'est le même objet que
          l'écran du lecteur, en timbre-poste. */}
      <LandingDeviceThumb className="h-[52px] w-[84px] shrink-0">
        <img
          src={tourPosterUrl(chapter.id)}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </LandingDeviceThumb>
      <span className="min-w-0">
        <span className="aime-apple-eyebrow block">
          <span className="tabular-nums">{chapter.n}</span>
          <span aria-hidden="true"> · </span>
          {t("tour.kicker")}
        </span>
        <span className="aime-apple-title mt-0.5 block truncate text-sm">{t(chapter.label)}</span>
        <span className="mt-0.5 block text-[11px] tabular-nums text-muted-foreground">{chapter.duration}</span>
      </span>
    </button>
  );
}

function CarouselArrow({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  const { t } = useI18n();
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? t("tour.prev") : t("tour.next")}
      data-testid={`landing-tour-${direction}`}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground/70 transition hover:border-[var(--agency-ink)]/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/**
 * Un lecteur sobre : l'affiche et un bouton de lecture tant qu'on n'a pas
 * appuyé, les commandes natives ensuite. La voix porte le chapitre : le son
 * n'est jamais coupé, et la lecture ne démarre que sur un geste — pas
 * d'autoplay, que le navigateur refuserait de toute façon.
 */
function TourPlayer({ id, title, duration }: { id: TourChapterId | "complet"; title: string; duration: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => () => ref.current?.pause(), []);

  const start = () => {
    setStarted(true);
    void ref.current?.play().catch(() => {
      /* Lecture refusée (politique du navigateur) : les commandes natives
         restent visibles, le visiteur relance lui-même. */
    });
  };

  return (
    <LandingDeviceFrame
      device="screen"
      testId="landing-tour-device"
      label={`${title} — ${duration}`}
    >
      <video
        ref={ref}
        data-testid={`landing-tour-player-${id}`}
        className="absolute inset-0 h-full w-full object-contain"
        controls={started}
        playsInline
        preload="none"
        poster={tourPosterUrl(id)}
        aria-label={title}
        onPlay={() => setStarted(true)}
      >
        <source src={tourVideoUrl(id)} type="video/mp4" />
        {t("tour.unsupported")}
      </video>
      {!started && (
        <button
          type="button"
          onClick={start}
          data-testid={`landing-tour-play-${id}`}
          aria-label={`${t("tour.play")} — ${title}`}
          className="group absolute inset-0 flex items-end justify-between p-4 text-left text-white outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-inset md:p-5"
        >
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" aria-hidden="true" />
          <span className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg transition group-hover:scale-105">
              <Play className="ml-0.5 h-5 w-5" aria-hidden="true" fill="currentColor" />
            </span>
            <span className="text-sm font-medium drop-shadow">{t("tour.play")}</span>
          </span>
          <span className="relative rounded-full bg-black/55 px-2.5 py-1 text-xs tabular-nums backdrop-blur">{duration}</span>
        </button>
      )}
    </LandingDeviceFrame>
  );
}

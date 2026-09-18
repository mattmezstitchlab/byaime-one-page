import { useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Play } from "lucide-react";
import { useI18n, type I18nKey } from "@/lib/i18n";
import { Reveal } from "@/components/Reveal";
import { getAssetUrl } from "@/lib/assets";
import { cn } from "@/lib/utils";

/**
 * Les vidéos-guides — trois parcours réels, sous le hero.
 *
 * Un prestataire qui crée son Monde, une mariée qui crée son Monde Mariage,
 * un invité qui rejoint un Monde Mariage. Ce sont des enregistrements d'écran
 * du vrai produit (`scripts/record-guides.mjs`), pas des animations : la règle
 * de la vitrine — jamais de maquette inventée — s'applique aussi à la vidéo.
 *
 * Les fichiers vivent dans `public/videos/guide-*.mp4` avec une affiche JPEG
 * du même nom. Ils ne sont pas préchargés (`preload="none"`) : l'affiche
 * suffit tant que le visiteur n'a pas appuyé sur lecture, et la page reste
 * légère sur mobile. Le rendu serveur affiche tout ; seul `Reveal` anime.
 */

export type GuideId = "prestataire" | "mariee" | "invite";

export const GUIDES: ReadonlyArray<{
  id: GuideId;
  kicker: I18nKey;
  title: I18nKey;
  text: I18nKey;
  cta: I18nKey;
  href: string;
  /* Durée lisible, figée à l'enregistrement (≈ 1 min chacune). */
  duration: string;
}> = [
  {
    id: "prestataire",
    kicker: "guides.prestataire.kicker",
    title: "guides.prestataire.title",
    text: "guides.prestataire.text",
    cta: "guides.prestataire.cta",
    href: "/creation",
    duration: "1:13",
  },
  {
    id: "mariee",
    kicker: "guides.mariee.kicker",
    title: "guides.mariee.title",
    text: "guides.mariee.text",
    cta: "guides.mariee.cta",
    href: "/creation",
    duration: "1:20",
  },
  {
    id: "invite",
    kicker: "guides.invite.kicker",
    title: "guides.invite.title",
    text: "guides.invite.text",
    cta: "guides.invite.cta",
    href: "/ma-carte",
    duration: "1:02",
  },
];

export function guideVideoUrl(id: GuideId) {
  return getAssetUrl(`videos/guide-${id}.mp4`);
}

export function guidePosterUrl(id: GuideId) {
  return getAssetUrl(`videos/guide-${id}.jpg`);
}

export function LandingGuides() {
  const { t } = useI18n();
  return (
    <section
      id="landing-videos"
      data-testid="landing-videos"
      aria-labelledby="landing-videos-title"
      className="aime-apple-surface relative z-10 border-t border-border/60 bg-background py-24 md:py-32"
    >
      <div className="mx-auto max-w-5xl px-6">
        <Reveal className="text-center">
          <p className="aime-apple-eyebrow">{t("guides.eyebrow")}</p>
          <h2 id="landing-videos-title" className="aime-apple-title mt-5 text-4xl md:text-6xl">
            {t("guides.title")}
          </h2>
          <p className="aime-apple-lead mx-auto mt-5 max-w-2xl text-base md:text-lg">{t("guides.subtitle")}</p>
        </Reveal>

        <ol className="mt-16 space-y-16 md:mt-20 md:space-y-24">
          {GUIDES.map((guide, index) => (
            <li key={guide.id} data-testid={`landing-video-${guide.id}`}>
              <Reveal
                className={cn(
                  "grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12",
                )}
              >
                <div className={cn("order-2 lg:order-none", index % 2 === 1 && "lg:col-start-2 lg:row-start-1")}>
                  <p className="aime-apple-eyebrow">
                    <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                    <span aria-hidden="true"> · </span>
                    {t(guide.kicker)}
                  </p>
                  <h3 className="aime-apple-title mt-4 text-2xl md:text-3xl">{t(guide.title)}</h3>
                  <p className="aime-apple-lead mt-4 text-base">{t(guide.text)}</p>
                  <Link
                    href={guide.href}
                    data-testid={`landing-video-${guide.id}-cta`}
                    className="aime-apple-pill aime-apple-pill-ghost mt-6 inline-flex items-center gap-2 text-sm"
                  >
                    {t(guide.cta)}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
                <div className={cn("order-1 lg:order-none", index % 2 === 1 && "lg:col-start-1 lg:row-start-1")}>
                  <GuidePlayer id={guide.id} title={t(guide.title)} duration={guide.duration} />
                </div>
              </Reveal>
            </li>
          ))}
        </ol>

        <Reveal className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">{t("guides.caption")}</p>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Un lecteur sobre : l'affiche et un bouton de lecture tant qu'on n'a pas
 * appuyé, les commandes natives ensuite — pas avant, elles se superposeraient
 * au bouton. Le clic sur la vidéo elle-même, une fois lancée, met en pause
 * comme partout ailleurs (comportement natif de `controls`).
 */
function GuidePlayer({ id, title, duration }: { id: GuideId; title: string; duration: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const start = () => {
    setStarted(true);
    void ref.current?.play().catch(() => {
      /* Lecture refusée (politique du navigateur) : les commandes natives
         restent visibles, le visiteur relance lui-même. */
    });
  };

  return (
    <figure className="aime-apple-window relative aspect-[16/10] w-full bg-black">
      <video
        ref={ref}
        data-testid={`landing-video-${id}-player`}
        className="absolute inset-0 h-full w-full object-cover"
        controls={started}
        muted
        playsInline
        preload="none"
        poster={guidePosterUrl(id)}
        aria-label={title}
        onPlay={() => setStarted(true)}
      >
        <source src={guideVideoUrl(id)} type="video/mp4" />
        {t("guides.unsupported")}
      </video>
      {!started && (
        <button
          type="button"
          onClick={start}
          data-testid={`landing-video-${id}-play`}
          aria-label={`${t("guides.play")} — ${title}`}
          className="group absolute inset-0 flex items-end justify-between p-4 text-left text-white outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-inset md:p-5"
        >
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" aria-hidden="true" />
          <span className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg transition group-hover:scale-105">
              <Play className="ml-0.5 h-5 w-5" aria-hidden="true" fill="currentColor" />
            </span>
            <span className="text-sm font-medium drop-shadow">{t("guides.play")}</span>
          </span>
          <span className="relative rounded-full bg-black/55 px-2.5 py-1 text-xs tabular-nums backdrop-blur">{duration}</span>
        </button>
      )}
    </figure>
  );
}

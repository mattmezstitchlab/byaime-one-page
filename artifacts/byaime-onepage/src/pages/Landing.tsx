import { useState } from "react";
import { Link } from "wouter";
import { AppearanceToggle } from "@/components/AppearanceToggle";
import { ArrowRight, ChevronDown, Compass } from "lucide-react";
import { LandingComposer } from "@/components/LandingComposer";
import { ImmersiveBackdrop } from "@/components/ImmersiveBackdrop";
import { useRouteMeta } from "@/lib/page-meta";
import { AIME_VISUALS, getAssetUrl } from "@/lib/assets";
import { AimeGuide } from "@/components/AimeGuide";
import { CenteredBlock } from "@/components/CenteredBlock";
import { GuidesExplorer } from "@/pages/Guides";
import { I18nProvider, useI18n, type I18nKey, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Sélection de guides montrés sur l'accueil — tout le catalogue est sur /guides. */
const LANDING_FEATURED_GUIDES = ["architecture", "intention", "ai-plus-me", "budget", "dayof", "memories"];

/**
 * L'accueil d'AIME — court, immersif. Le hero demande d'abord qui vous êtes
 * (couple ou professionnel), puis un seul onboarding en cinq questions dans
 * la langue et la devise du visiteur. Viennent les guides animés, une seule
 * section de repérage et un appel à créer. Le fond cosmique reste fixe.
 */
export function LandingPage({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <I18nProvider>
      <LandingContent signedIn={signedIn} />
    </I18nProvider>
  );
}

function LandingContent({ signedIn }: { signedIn: boolean }) {
  const { t, locale, setLocale } = useI18n();

  useRouteMeta({
    title: locale === "en"
      ? "AIME — Plan your wedding with peace of mind"
      : "AIME — Organisez votre mariage sereinement",
    description: locale === "en"
      ? "AIME brings your guests, budget, vendors and decisions together in one private space, from the first idea to the big day."
      : "AIME rassemble vos invités, votre budget, vos prestataires et vos décisions dans un espace privé, pour préparer votre mariage de la première idée au Jour J.",
  });

  return (
    <main data-testid="landing" className="min-h-[100dvh] text-foreground">
      {/* Le hero est un plan fixe plein écran : tout le contenu suivant glisse par-dessus. */}
      <ImmersiveBackdrop image={AIME_VISUALS.hero.backgroundImage} />

      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" aria-label="AIME — retour à l’accueil" className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <span className="font-display text-lg font-light tracking-[.3em] text-white">AIME</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LocaleToggle locale={locale} setLocale={setLocale} />
            <LandingGuideButton label={t("nav.howItWorks")} />
            <AppearanceToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
            {signedIn ? (
              <Link data-testid="landing-open-space" href="/user-portal" className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-white/90">
                {t("nav.openSpace")}
              </Link>
            ) : (
              <>
                <Link data-testid="landing-sign-in" href="/connexion" className="rounded-full border border-white/25 px-4 py-2 text-xs text-white/85 transition hover:bg-white/10 hover:text-white">
                  {t("nav.signIn")}
                </Link>
                <Link data-testid="landing-sign-up" href="/creation" className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-white/90">
                  {t("nav.signUp")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ——— Le hero : plein écran, immersif, l'onboarding unique au centre. ——— */}
      <section className="aime-cinematic-surface relative z-10 flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 md:px-10">
        <div className="aime-landing-copy relative flex w-full max-w-5xl flex-col items-center pb-24 pt-28 text-center md:pb-28 md:pt-32">
          <p className="text-[10px] uppercase tracking-[.35em] text-white/55">{t("hero.eyebrow")}</p>
          <h1 className="mt-7 font-display text-6xl font-light tracking-[.14em] text-white md:text-8xl">{t("hero.title")}</h1>
          <p className="mt-7 max-w-2xl text-base font-light leading-relaxed text-white/75 md:text-lg">
            {t("hero.subtitle")}
          </p>
          <div className="mt-12 w-full">
            <LandingComposer signedIn={signedIn} />
          </div>
          <p className="mt-9 text-[11px] uppercase tracking-[.18em] text-white/45">
            {t("hero.free")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => document.getElementById("landing-guides")?.scrollIntoView({ behavior: "smooth" })}
          aria-label={t("hero.scroll")}
          className="aime-landing-copy absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5 text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <span className="text-[9px] uppercase tracking-[.32em]">{t("hero.scroll")}</span>
          <ChevronDown aria-hidden className="h-4 w-4 animate-bounce motion-reduce:animate-none" />
        </button>
      </section>

      {/* ——— Les guides animés : la démonstration remplace les longs discours. ——— */}
      <section id="landing-guides" data-testid="landing-guides" className="relative z-10 overflow-hidden py-20 md:py-28">
        {/* Voile lisibilité local, le cosmos reste visible autour. */}
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(0,0,0,.72)_0%,rgba(0,0,0,.5)_55%,rgba(0,0,0,.72)_100%)]" />
        <div className="relative">
          <div className="aime-landing-copy mx-auto max-w-3xl px-6 text-center">
            <p className="text-[10px] uppercase tracking-[.35em] text-white/60">{t("guides.eyebrow")}</p>
            <h2 className="mt-6 font-display text-4xl font-light leading-tight text-white md:text-6xl">
              {t("guides.title")}
            </h2>
            <p className="mt-5 text-sm font-light leading-relaxed text-white/75 md:text-base">
              {t("guides.subtitle")}
            </p>
          </div>
          <div className="mt-12">
            <GuidesExplorer idPrefix="landing-guides" tone="onDark" featuredDemos={LANDING_FEATURED_GUIDES} />
          </div>
          <p className="mt-10 text-center">
            <Link href="/guides" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-xs text-white/80 transition hover:border-white/55 hover:bg-white/10 hover:text-white">
              {t("guides.all")}
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </section>

      {/* ——— Une seule section de repérage, dans le même univers visuel. ——— */}
      <section className="relative z-10 overflow-hidden border-y border-white/10">
        <img
          src={getAssetUrl(AIME_VISUALS.hero.guestsImage)}
          alt={t("spot.alt")}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,.85)_0%,rgba(0,0,0,.62)_45%,rgba(0,0,0,.25)_100%)]" />
        <div className="aime-landing-copy relative mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-32">
          <div className="max-w-xl">
            <p className="text-[10px] uppercase tracking-[.3em] text-white/55">{t("spot.eyebrow")}</p>
            <h2 className="mt-6 font-display text-4xl font-light leading-tight text-white md:text-5xl">
              {t("spot.title")}
            </h2>
            <ul className="mt-10 space-y-5">
              {([1, 2, 3] as const).map(index => (
                <li key={index} className="border-l border-white/25 pl-4">
                  <p className="font-display text-lg font-light text-white">{t(`spot.${index}.title` as I18nKey)}</p>
                  <p className="mt-1 text-sm font-light leading-relaxed text-white/65">{t(`spot.${index}.text` as I18nKey)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-11 flex flex-wrap gap-3">
              <Link data-testid="hero-sign-up" href="/creation" className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90">
                {t("spot.cta")}
              </Link>
              <Link data-testid="landing-guides-cta" href="/guides" className="rounded-full border border-white/30 px-7 py-3.5 text-sm text-white/85 transition hover:bg-white/10 hover:text-white">
                {t("spot.guides")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 px-6 py-12 md:px-10">
        <div className="aime-landing-copy mx-auto flex max-w-6xl flex-col gap-6 text-xs text-white/70 md:flex-row md:items-center md:justify-between">
          <p className="font-display tracking-[.28em] text-white/80">AIME</p>
          <nav aria-label="Pages du site" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/guides" className="transition hover:text-white">{t("footer.guides")}</Link>
            <Link href="/conditions" className="transition hover:text-white">{t("footer.terms")}</Link>
            <Link href="/confidentialite" className="transition hover:text-white">{t("footer.privacy")}</Link>
          </nav>
          <p className="max-w-md text-white/55">
            {t("footer.legal")}
          </p>
        </div>
      </footer>
    </main>
  );
}

/** FR / EN, discret : la langue choisie est mémorisée et reprise dans l'onboarding. */
function LocaleToggle({ locale, setLocale }: { locale: Locale; setLocale: (value: Locale) => void }) {
  return (
    <div
      role="group"
      aria-label="Language / Langue"
      data-testid="landing-locale"
      className="flex items-center rounded-full border border-white/20 p-0.5 text-[11px]"
    >
      {(["fr", "en"] as const).map(code => (
        <button
          key={code}
          type="button"
          data-testid={`landing-locale-${code}`}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
          className={cn(
            "rounded-full px-2.5 py-1 font-medium uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
            locale === code ? "bg-white text-black" : "text-white/70 hover:text-white",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

/**
 * L'aide est disponible avant même d'avoir un compte : la même connaissance de
 * l'architecture que dans l'espace privé, sans projet, sans saisie, sans envoi.
 */
function LandingGuideButton({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      data-testid="landing-guide-button"
      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-[11px] text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      <Compass aria-hidden className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
    {open && (
      <CenteredBlock
        eyebrow="AIME · guide"
        title="Accueil"
        description="Posez une question sur un écran, ou laissez AIME vous dire par où commencer."
        onClose={() => setOpen(false)}
        size="lg"
        testId="landing-guide"
        showGuideHint={false}
      >
        <AimeGuide project={null} fallbackScreen="home" onJumped={() => setOpen(false)} />
      </CenteredBlock>
    )}
  </>;
}

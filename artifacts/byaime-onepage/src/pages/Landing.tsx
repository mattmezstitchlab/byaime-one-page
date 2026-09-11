import { useState } from "react";
import { Link } from "wouter";
import { AppearanceToggle } from "@/components/AppearanceToggle";
import { ArrowRight, Compass } from "lucide-react";
import { LandingComposer } from "@/components/LandingComposer";
import { ShaderBackdrop } from "@/components/ShaderBackdrop";
import { useRouteMeta } from "@/lib/page-meta";
import { AimeGuide } from "@/components/AimeGuide";
import { CenteredBlock } from "@/components/CenteredBlock";
import { GuidesExplorer } from "@/pages/Guides";
import { I18nProvider, useI18n, type I18nKey, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Sélection de guides montrés sur l'accueil — tout le catalogue est sur /guides. */
const LANDING_FEATURED_GUIDES = ["architecture", "intention", "ai-plus-me", "budget", "dayof", "memories"];

/**
 * L'accueil d'AIME — court, immersif. Le hero tient sa promesse en une
 * phrase, puis l'onboarding : deux choix (Couple ou Wedding planner),
 * puis cinq questions, une par écran, dans la langue et la devise du
 * visiteur. Viennent les guides animés, une seule section de repérage et
 * un appel à créer. Le shader Mesh reste fixe :
 * aucun visuel photo, un seul fond animé continu.
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
      {/* Le shader est un plan fixe plein écran : tout le contenu suivant glisse par-dessus. */}
      <ShaderBackdrop />
      {/* Voile teinté bleu nuit, dans l'harmonie du shader : il garantit le
          contraste du texte blanc tout en laissant respirer le dégradé —
          soutenu en haut (titre) et en bas (pied de page), léger au milieu. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] bg-[linear-gradient(to_bottom,rgba(2,24,43,.6)_0%,rgba(2,24,43,.26)_28%,rgba(2,24,43,.16)_55%,rgba(2,24,43,.52)_100%)]"
      />

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

      {/* ——— Le hero : la promesse, puis l'onboarding — deux choix, puis
             une question par écran. ——— */}
      <section className="aime-cinematic-surface relative z-10 flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 md:px-10">
        <div className="aime-landing-copy relative flex w-full max-w-5xl flex-col items-center pb-24 pt-28 text-center md:pb-28 md:pt-32">
          <p className="text-[10px] uppercase tracking-[.35em] text-white/60">{t("hero.eyebrow")}</p>
          <h1 className="mt-7 max-w-3xl font-display text-4xl font-light leading-[1.12] text-white md:text-6xl">{t("hero.title")}</h1>
          <p className="mt-6 max-w-xl text-base font-light leading-relaxed text-white/75 md:text-lg">
            {t("hero.subtitle")}
          </p>
          <div className="mt-12 w-full">
            <LandingComposer signedIn={signedIn} />
          </div>
          <p className="mt-9 text-[11px] uppercase tracking-[.18em] text-white/55">
            {t("hero.reassurance")}
          </p>
        </div>
      </section>

      {/* ——— Les guides animés : la démonstration remplace les longs discours. ——— */}
      <section id="landing-guides" data-testid="landing-guides" className="relative z-10 overflow-hidden py-20 md:py-28">
        {/* Le voile global fixe assure la lisibilité ; pas de voile local ici. */}
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

      {/* ——— Une seule section de repérage, sur le shader continu. ——— */}
      <section className="relative z-10 overflow-hidden border-y border-white/10 bg-[rgba(2,20,36,.42)]">
        <div className="aime-landing-copy relative mx-auto max-w-3xl px-6 py-28 text-center md:px-10 md:py-36">
          <p className="text-[10px] uppercase tracking-[.3em] text-white/55">{t("spot.eyebrow")}</p>
          <h2 className="mt-6 font-display text-4xl font-light leading-tight text-white md:text-5xl">
            {t("spot.title")}
          </h2>
          <ul className="mx-auto mt-10 max-w-xl space-y-5">
            {([1, 2, 3] as const).map(index => (
              <li key={index} className="border-t border-white/20 pt-4">
                <p className="font-display text-lg font-light text-white">{t(`spot.${index}.title` as I18nKey)}</p>
                <p className="mt-1 text-sm font-light leading-relaxed text-white/70">{t(`spot.${index}.text` as I18nKey)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-11 flex flex-wrap justify-center gap-3">
            <Link data-testid="hero-sign-up" href="/creation" className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90">
              {t("spot.cta")}
            </Link>
            <Link data-testid="landing-guides-cta" href="/guides" className="rounded-full border border-white/30 px-7 py-3.5 text-sm text-white/85 transition hover:bg-white/10 hover:text-white">
              {t("spot.guides")}
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 bg-black px-6 py-12 md:px-10">
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

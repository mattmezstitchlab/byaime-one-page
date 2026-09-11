import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { AppearanceToggle } from "@/components/AppearanceToggle";
import { ArrowRight, Compass, Gift, Lock, Accessibility, Wifi } from "lucide-react";
import { LandingComposer } from "@/components/LandingComposer";
import { LandingShowcase } from "@/components/LandingShowcase";
import { ShaderBackdrop } from "@/components/ShaderBackdrop";
import { useRouteMeta } from "@/lib/page-meta";
import { AimeGuide } from "@/components/AimeGuide";
import { CenteredBlock } from "@/components/CenteredBlock";
import { I18nProvider, useI18n, type I18nKey, type Locale } from "@/lib/i18n";
import { AIME_VISUALS, getAssetUrl } from "@/lib/assets";
import { cn } from "@/lib/utils";

/**
 * L'accueil d'AIME, dans la direction « Apple du mariage » : un message par
 * écran, de l'espace, de grands visuels pleine page, de grands titres et une
 * hiérarchie minimale. Le hero tient sa promesse en une phrase, puis
 * l'onboarding (deux choix, cinq questions, une par écran). Viennent la
 * vitrine du Monde Mariage, les trois temps (Avant / Jour J / Après) en
 * visuels immersifs, les valeurs, un témoignage, un renvoi vers les guides et
 * un appel à créer. Les médias sont du contenu, jamais un thème : le texte des
 * visuels pleine page reste blanc dans les deux apparences.
 */
export function LandingPage({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <I18nProvider>
      <LandingContent signedIn={signedIn} />
    </I18nProvider>
  );
}

const VALUES: ReadonlyArray<{
  icon: typeof Lock;
  title: I18nKey;
  text: I18nKey;
}> = [
  { icon: Lock, title: "apple.values.1.title", text: "apple.values.1.text" },
  { icon: Gift, title: "apple.values.2.title", text: "apple.values.2.text" },
  { icon: Accessibility, title: "apple.values.3.title", text: "apple.values.3.text" },
  { icon: Wifi, title: "apple.values.4.title", text: "apple.values.4.text" },
];

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
    <main data-testid="landing" className="min-h-[100dvh] bg-background text-foreground">
      {/* Fond signature : plan fixe plein écran, base du site. Les visuels
          pleine page glissent par-dessus. */}
      <ShaderBackdrop />

      {/* ——— Navigation fine, façon Apple ——— */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            aria-label="AIME — retour à l’accueil"
            className="inline-flex items-center gap-2 rounded-lg font-display text-[15px] font-semibold tracking-[.28em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            AIME
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href="#landing-guides"
              className="hidden rounded-full px-3 py-2 text-[11px] text-white/75 transition hover:bg-white/10 hover:text-white md:inline"
            >
              {t("footer.guides")}
            </a>
            <LandingGuideButton label={t("nav.howItWorks")} />
            <LocaleToggle locale={locale} setLocale={setLocale} />
            <AppearanceToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
            {signedIn ? (
              <Link
                data-testid="landing-open-space"
                href="/user-portal"
                className="inline-flex h-8 items-center rounded-full bg-white px-4 text-xs font-semibold text-black transition hover:bg-white/90"
              >
                {t("nav.openSpace")}
              </Link>
            ) : (
              <>
                <Link
                  data-testid="landing-sign-in"
                  href="/connexion"
                  className="inline-flex h-8 items-center rounded-full border border-white/25 px-4 text-xs text-white/85 transition hover:bg-white/10 hover:text-white"
                >
                  {t("nav.signIn")}
                </Link>
                <Link
                  data-testid="landing-sign-up"
                  href="/creation"
                  className="inline-flex h-8 items-center rounded-full bg-white px-4 text-xs font-semibold text-black transition hover:bg-white/90"
                >
                  {t("nav.signUp")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ——— Hero : grand visuel immersif + promesse + onboarding ——— */}
      <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden">
        <div aria-hidden data-testid="landing-hero-photo" className="absolute inset-0">
          <img
            src={getAssetUrl(AIME_VISUALS.hero.backgroundImage)}
            alt=""
            className="aime-apple-kenburns h-full w-full object-cover"
          />
          {/* Tint vert-bleu du fond signature : le hero rejoint la teinte des
              sections suivantes, sans voile sombre écrasant. */}
          <div className="aime-apple-hero-tint absolute inset-0" />
        </div>

        <div className="aime-landing-copy relative z-10 flex w-full max-w-5xl flex-col items-center px-6 pb-24 pt-28 text-center md:pb-28 md:pt-32">
          <Reveal className="flex flex-col items-center">
            <p className="aime-apple-eyebrow text-white/60">{t("hero.eyebrow")}</p>
            <h1 className="aime-apple-title mt-6 max-w-3xl text-5xl text-white md:text-7xl">
              {t("hero.title")}
            </h1>
            <p className="aime-apple-lead mx-auto mt-6 max-w-xl text-lg text-white/75 md:text-xl">
              {t("hero.subtitle")}
            </p>
          </Reveal>
          <div className="mt-10 w-full">
            <LandingComposer signedIn={signedIn} />
          </div>
          <p className="aime-apple-confiance mt-8 text-white/55">{t("hero.reassurance")}</p>
        </div>
      </section>

      {/* ——— La vitrine : le Monde Mariage mis en scène ——— */}
      <section
        id="landing-product"
        data-testid="landing-product"
        className="aime-apple-surface relative z-10 bg-background border-t border-border/60 py-24 md:py-32"
      >
        <div className="mx-auto max-w-5xl px-6">
          <Reveal className="text-center">
            <p className="aime-apple-eyebrow">{t("apple.product.eyebrow")}</p>
            <h2 className="aime-apple-title mt-5 text-4xl md:text-6xl">{t("apple.product.title")}</h2>
            <p className="aime-apple-lead mx-auto mt-5 max-w-2xl text-base md:text-lg">
              {t("apple.product.subtitle")}
            </p>
          </Reveal>
          <Reveal className="mt-12">
            <LandingShowcase />
          </Reveal>
          <Reveal className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">{t("apple.product.caption")}</p>
          </Reveal>
        </div>
      </section>

      {/* ——— Les trois temps, en visuels immersifs ——— */}
      <ImmersiveSection
        id="landing-avant"
        image={AIME_VISUALS.timelineAmbientImages[2]}
        eyebrow={t("apple.avant.eyebrow")}
        title={t("apple.avant.title")}
        subtitle={t("apple.avant.subtitle")}
        link1={t("apple.avant.link1")}
        link2={t("apple.avant.link2")}
      />
      <ImmersiveSection
        id="landing-jourj"
        image={AIME_VISUALS.world.heroImage}
        eyebrow={t("apple.jourj.eyebrow")}
        title={t("apple.jourj.title")}
        subtitle={t("apple.jourj.subtitle")}
        link1={t("apple.jourj.link1")}
        link2={t("apple.jourj.link2")}
      />
      <ImmersiveSection
        id="landing-apres"
        image={AIME_VISUALS.concept.leftImage}
        eyebrow={t("apple.apres.eyebrow")}
        title={t("apple.apres.title")}
        subtitle={t("apple.apres.subtitle")}
        link1={t("apple.apres.link1")}
        link2={t("apple.apres.link2")}
      />

      {/* ——— Les valeurs ——— */}
      <section
        data-testid="landing-values"
        className="aime-apple-surface relative z-10 bg-background border-t border-border/60 py-24 md:py-32"
      >
        <div className="mx-auto max-w-5xl px-6">
          <Reveal className="text-center">
            <p className="aime-apple-eyebrow">{t("apple.values.eyebrow")}</p>
            <h2 className="aime-apple-title mt-5 text-4xl md:text-6xl">{t("apple.values.title")}</h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value, index) => {
              const Icon = value.icon;
              return (
                <Reveal key={value.title} className="text-left">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-foreground/5 text-foreground">
                    <Icon aria-hidden className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold tracking-tight text-foreground">
                    {t(value.title)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(value.text)}
                  </p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ——— Témoignage ——— */}
      <section
        data-testid="landing-quote"
        className="aime-apple-surface relative z-10 bg-background border-t border-border/60 py-28 md:py-36"
      >
        <Reveal className="mx-auto max-w-3xl px-6 text-center">
          <blockquote className="font-display text-2xl font-medium leading-snug tracking-tight text-foreground md:text-4xl">
            « {t("apple.quote.body")} »
          </blockquote>
          <p className="mt-8 text-sm text-muted-foreground">{t("apple.quote.who")}</p>
        </Reveal>
      </section>

      {/* ——— Les guides : des liens directs, pas une animation factice. ——— */}
      <section
        id="landing-guides"
        data-testid="landing-guides"
        className="aime-cinematic-surface relative z-10 overflow-hidden border-y border-white/10 py-20 md:py-28"
      >
        <div className="relative">
          <div className="aime-landing-copy mx-auto max-w-3xl px-6 text-center">
            <p className="aime-apple-eyebrow text-white/60">{t("guides.eyebrow")}</p>
            <h2 className="aime-apple-title mt-6 text-4xl text-white md:text-6xl">
              {t("guides.title")}
            </h2>
            <p className="aime-apple-lead mx-auto mt-5 max-w-2xl text-base text-white/75 md:text-lg">
              {t("guides.subtitle")}
            </p>
          </div>
          <div
            data-testid="landing-guides-links"
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link href="/guides" className="aime-apple-pill aime-apple-pill-glass">{t("spot.1.title")}</Link>
            <Link href="/guides" className="aime-apple-pill aime-apple-pill-glass">{t("spot.2.title")}</Link>
            <Link href="/guides" className="aime-apple-pill aime-apple-pill-glass">{t("spot.3.title")}</Link>
            <Link href="/guides" className="aime-apple-pill aime-apple-pill-primary">
              {t("guides.all")}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ——— Appel final ——— */}
      <section
        data-testid="landing-cta"
        className="aime-apple-surface relative z-10 bg-background border-t border-border/60 py-28 text-center md:py-36"
      >
        <Reveal className="mx-auto max-w-3xl px-6">
          <p className="aime-apple-eyebrow">{t("apple.cta.eyebrow")}</p>
          <h2 className="aime-apple-title mt-5 text-4xl md:text-6xl">{t("apple.cta.title")}</h2>
          <p className="aime-apple-lead mx-auto mt-5 max-w-2xl text-base md:text-lg">
            {t("apple.cta.subtitle")}
          </p>
          <div className="mt-9 flex justify-center">
            <Link
              href="/creation"
              data-testid="landing-cta-create"
              className="aime-apple-pill aime-apple-pill-accent px-8 text-base"
            >
              {t("apple.cta.button")}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
          <p className="aime-apple-confiance mt-7">{t("hero.reassurance")}</p>
        </Reveal>
      </section>

      <footer className="relative z-10 bg-black px-6 pb-10 pt-14 text-white md:px-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
            <div>
              <p className="font-display tracking-[.28em] text-white/85">AIME</p>
              <p className="mt-4 max-w-xs text-xs leading-relaxed text-white/55">{t("footer.tagline")}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-white/50">{t("footer.col.product")}</p>
              <ul className="mt-4 space-y-2.5 text-xs text-white/70">
                <li><a href="#landing-product" className="transition hover:text-white">{t("nav.howItWorks")}</a></li>
                <li><a href="#landing-values" className="transition hover:text-white">{t("apple.values.eyebrow")}</a></li>
                <li><Link href="/guides" className="transition hover:text-white">{t("footer.guides")}</Link></li>
              </ul>
            </div>
            <nav aria-label="Pages du site">
              <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-white/50">{t("footer.col.legal")}</p>
              <ul className="mt-4 space-y-2.5 text-xs text-white/70">
                <li><Link href="/conditions" className="transition hover:text-white">{t("footer.terms")}</Link></li>
                <li><Link href="/confidentialite" className="transition hover:text-white">{t("footer.privacy")}</Link></li>
              </ul>
            </nav>
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-[11px] leading-relaxed text-white/45 md:flex-row md:items-start md:justify-between md:gap-10">
            <p className="max-w-2xl">{t("footer.legal")}</p>
            <p className="whitespace-nowrap">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

/**
 * Une section photographique pleine page : un grand visuel, un titre, une
 * phrase et deux liens. Le texte reste blanc dans les deux apparences — la
 * photo est un média, jamais une surface de thème.
 */
function ImmersiveSection({
  id,
  image,
  eyebrow,
  title,
  subtitle,
  link1,
  link2,
}: {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  link1: string;
  link2: string;
}) {
  return (
    <section id={id} data-testid={id} className="relative flex min-h-[90vh] items-center justify-center overflow-hidden">
      <div aria-hidden className="absolute inset-0">
        <img src={getAssetUrl(image)} alt="" className="h-full w-full object-cover" />
        <div className="aime-apple-overlay absolute inset-0" />
      </div>
      <div className="aime-landing-copy relative z-10 flex w-full max-w-3xl flex-col items-center px-6 py-28 text-center">
        <Reveal className="flex flex-col items-center">
          <p className="aime-apple-eyebrow text-white/60">{eyebrow}</p>
          <h2 className="aime-apple-title mt-5 text-4xl text-white md:text-6xl">{title}</h2>
          <p className="aime-apple-lead mx-auto mt-5 max-w-xl text-base text-white/75 md:text-lg">{subtitle}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
            <Link href="/guides" className="transition hover:text-white">{link1}</Link>
            <span aria-hidden className="text-white/30">·</span>
            <Link href="/guides" className="transition hover:text-white">{link2}</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Révélation douce au défilement, coupée si le mouvement est réduit. */
function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(() => {
    if (typeof IntersectionObserver === "undefined") return true;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
    return false;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || shown || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out will-change-[opacity,transform] motion-reduce:transition-none",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      )}
    >
      {children}
    </div>
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

import { Link } from "wouter";
import { ArrowRight, Gift, Lock, Accessibility, Wifi } from "lucide-react";
import { LandingComposer } from "@/components/LandingComposer";
import { LandingShowcase } from "@/components/LandingShowcase";
import { LandingGuides } from "@/components/LandingGuides";
import { LandingJourney } from "@/components/LandingJourney";
import { Reveal } from "@/components/Reveal";
import { useRouteMeta } from "@/lib/page-meta";
import { I18nProvider, useI18n, type I18nKey, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * L'accueil d'AIME, dans la direction « Apple du mariage » : un message par
 * écran, de l'espace, de grands visuels pleine page, de grands titres et une
 * hiérarchie minimale. Le hero tient sa promesse en une phrase sur fond noir,
 * puis les trois vidéos-guides (`LandingGuides` : prestataire, mariée,
 * invité), la vitrine du Monde Mariage, la visite verticale du produit
 * (`LandingJourney`), les valeurs (« Pourquoi AIME »), un témoignage puis un
 * appel à créer.
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
      {/* ——— Navigation fine, façon Apple ——— */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            aria-label="AIME — accueil"
            className="inline-flex items-center gap-2 rounded-lg font-display text-[15px] font-semibold tracking-[.28em] text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
          >
            AIME
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* La Bande (`/monde`) a été retirée le 16/09/2026 : l'accueil est
                la page unique du site, il n'y a plus de seconde page publique à
                nommer dans cette barre. */}
            <LocaleToggle locale={locale} setLocale={setLocale} />
            {signedIn ? (
              <Link
                data-testid="landing-open-space"
                href="/user-portal"
                className="inline-flex h-8 items-center rounded-full bg-[var(--agency-ink)] px-4 text-xs font-semibold text-[var(--agency-paper)] transition hover:opacity-80"
              >
                {t("nav.openSpace")}
              </Link>
            ) : (
              <>
                <Link
                  data-testid="landing-sign-in"
                  href="/connexion"
                  className="inline-flex h-8 items-center rounded-full border border-[var(--agency-ink)]/25 px-4 text-xs text-[var(--agency-ink)]/80 transition hover:bg-[var(--agency-ink)]/10 hover:text-[var(--agency-ink)]"
                >
                  {t("nav.signIn")}
                </Link>
                <Link
                  data-testid="landing-sign-up"
                  href="/creation"
                  className="inline-flex h-8 items-center rounded-full bg-[var(--agency-ink)] px-4 text-xs font-semibold text-[var(--agency-paper)] transition hover:opacity-80"
                >
                  {t("nav.signUp")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ——— Hero : la promesse, sur fond noir comme le bas de page ——— */}
      <section data-testid="landing-hero" className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[var(--agency-paper)]" />
        <div className="aime-landing-copy relative z-10 flex w-full max-w-5xl flex-col items-center px-6 pb-24 pt-28 text-center md:pb-28 md:pt-32">
          <Reveal className="flex flex-col items-center">
            <p className="aime-apple-eyebrow text-[var(--agency-eyebrow)]">{t("hero.eyebrow")}</p>
            <h1 className="aime-apple-title mt-6 max-w-3xl text-5xl text-[var(--agency-ink)] md:text-7xl">
              {t("hero.title")}
            </h1>
            <p className="aime-apple-lead mx-auto mt-6 max-w-xl text-lg text-[var(--agency-body)] md:text-xl">
              {t("hero.subtitle")}
            </p>
          </Reveal>
          <div className="mt-10 w-full">
            <LandingComposer signedIn={signedIn} />
          </div>
          <p className="aime-apple-confiance mt-8 text-[var(--agency-eyebrow)]">{t("hero.reassurance")}</p>
        </div>
      </section>

      {/* ——— Les vidéos-guides : prestataire, mariée, invité — trois vrais
            parcours enregistrés dans le produit, juste sous le hero ——— */}
      <LandingGuides />

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

      {/* ——— La visite verticale du produit : concept, Timeline, agent,
            trois temps, Carte — chacun dans un iPhone ou un iPad ——— */}
      <LandingJourney />

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
            {VALUES.map((value) => {
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

      <footer className="relative z-10 border-t border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-6 pb-10 pt-14 text-[var(--agency-body)] md:px-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
            <div>
              <p className="font-display tracking-[.28em] text-[var(--agency-ink)]/80">AIME</p>
              <p className="mt-4 max-w-xs text-xs leading-relaxed text-[var(--agency-body)]">{t("footer.tagline")}</p>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--agency-eyebrow)]">{t("dispoo.footer.title")}</p>
              <ul className="mt-3 space-y-2.5 text-xs text-[var(--agency-body)]">
                <li>
                  <a
                    data-testid="footer-dispoo"
                    href="https://dispoo.app/?utm_source=byaime&utm_medium=footer&utm_campaign=mariage"
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:text-[var(--agency-ink)]"
                  >
                    {t("dispoo.footer.link")}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--agency-eyebrow)]">{t("footer.col.product")}</p>
              <ul className="mt-4 space-y-2.5 text-xs text-[var(--agency-body)]">
                <li><a href="#landing-product" className="transition hover:text-[var(--agency-ink)]">{t("nav.howItWorks")}</a></li>
                <li><a href="#landing-journey" className="transition hover:text-[var(--agency-ink)]">{t("journey.eyebrow")}</a></li>
                <li><a href="#landing-values" className="transition hover:text-[var(--agency-ink)]">{t("apple.values.eyebrow")}</a></li>
                <li><Link href="/creation" className="transition hover:text-[var(--agency-ink)]">{t("nav.signUp")}</Link></li>
              </ul>
            </div>
            <nav aria-label="Pages du site">
              <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--agency-eyebrow)]">{t("footer.col.legal")}</p>
              <ul className="mt-4 space-y-2.5 text-xs text-[var(--agency-body)]">
                <li><Link href="/conditions" className="transition hover:text-[var(--agency-ink)]">{t("footer.terms")}</Link></li>
                <li><Link href="/confidentialite" className="transition hover:text-[var(--agency-ink)]">{t("footer.privacy")}</Link></li>
                <li><Link href="/mentions-legales" data-testid="footer-mentions" className="transition hover:text-[var(--agency-ink)]">{t("footer.mentions")}</Link></li>
              </ul>
            </nav>
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-[var(--agency-hairline)] pt-6 text-[11px] leading-relaxed text-[var(--agency-eyebrow)] md:flex-row md:items-start md:justify-between md:gap-10">
            <p className="max-w-2xl">{t("footer.legal")}</p>
            <p className="whitespace-nowrap">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          </div>
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
      className="flex items-center rounded-full border border-[var(--agency-hairline)] p-0.5 text-[11px]"
    >
      {(["fr", "en"] as const).map(code => (
        <button
          key={code}
          type="button"
          data-testid={`landing-locale-${code}`}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
          className={cn(
            "rounded-full px-2.5 py-1 font-medium uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40",
            locale === code ? "bg-[var(--agency-ink)] text-[var(--agency-paper)]" : "text-[var(--agency-body)] hover:text-[var(--agency-ink)]",
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

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

/** Trois repères, pas davantage : les guides animés montrent le reste. */
const essentials = [
  { title: "Invités & RSVP", text: "Réponses, foyers, régimes et plans de table sans tableur." },
  { title: "Budget & prestataires", text: "Engagements, paiements, relances et documents reliés." },
  { title: "Jour J & souvenirs", text: "Le programme en direct, puis les photos et remerciements." },
];

/** Sélection de guides montrés sur l'accueil — tout le catalogue est sur /guides. */
const LANDING_FEATURED_GUIDES = ["architecture", "intention", "ai-plus-me", "budget", "dayof", "memories"];

/**
 * L'accueil d'AIME — court, immersif. Un seul onboarding (cinq questions) dans
 * le hero, puis les guides animés qui font la démonstration, puis une seule
 * section de repérage et un appel à créer. Le fond cosmique reste fixe pendant
 * que la page glisse par-dessus.
 */
export function LandingPage({ signedIn = false }: { signedIn?: boolean }) {
  useRouteMeta({
    title: "AIME — Organisez votre mariage sereinement",
    description:
      "AIME rassemble vos invités, votre budget, vos prestataires et vos décisions dans un espace privé, pour préparer votre mariage de la première idée au Jour J.",
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
            <LandingGuideButton />
            <AppearanceToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
            {signedIn ? (
              <Link data-testid="landing-open-space" href="/user-portal" className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-white/90">
                Accéder à mon espace
              </Link>
            ) : (
              <>
                <Link data-testid="landing-sign-in" href="/connexion" className="rounded-full border border-white/25 px-4 py-2 text-xs text-white/85 transition hover:bg-white/10 hover:text-white">
                  Se connecter
                </Link>
                <Link data-testid="landing-sign-up" href="/creation" className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-white/90">
                  Créer mon espace
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ——— Le hero : plein écran, immersif, l'onboarding unique au centre. ——— */}
      <section className="aime-cinematic-surface relative z-10 flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 md:px-10">
        <div className="aime-landing-copy relative flex w-full max-w-5xl flex-col items-center pb-24 pt-28 text-center md:pb-28 md:pt-32">
          <p className="text-[10px] uppercase tracking-[.35em] text-white/55">L’art de créer des liens</p>
          <h1 className="mt-7 font-display text-6xl font-light tracking-[.14em] text-white md:text-8xl">AIME</h1>
          <p className="mt-7 max-w-2xl text-base font-light leading-relaxed text-white/75 md:text-lg">
            Cinq questions pour ouvrir votre espace privé de mariage — de la première idée au Jour J.
          </p>
          <div className="mt-12 w-full">
            <LandingComposer signedIn={signedIn} />
          </div>
          <p className="mt-9 text-[11px] uppercase tracking-[.18em] text-white/45">
            Gratuit pour commencer. Aucun engagement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => document.getElementById("landing-guides")?.scrollIntoView({ behavior: "smooth" })}
          aria-label="Faire défiler vers la suite"
          className="aime-landing-copy absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5 text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <span className="text-[9px] uppercase tracking-[.32em]">Défiler</span>
          <ChevronDown aria-hidden className="h-4 w-4 animate-bounce motion-reduce:animate-none" />
        </button>
      </section>

      {/* ——— Les guides animés : la démonstration remplace les longs discours. ——— */}
      <section id="landing-guides" data-testid="landing-guides" className="relative z-10 overflow-hidden py-20 md:py-28">
        {/* Voile lisibilité local, le cosmos reste visible autour. */}
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(0,0,0,.72)_0%,rgba(0,0,0,.5)_55%,rgba(0,0,0,.72)_100%)]" />
        <div className="relative">
          <div className="aime-landing-copy mx-auto max-w-3xl px-6 text-center">
            <p className="text-[10px] uppercase tracking-[.35em] text-white/60">Guides</p>
            <h2 className="mt-6 font-display text-4xl font-light leading-tight text-white md:text-6xl">
              Comprendre avant de cliquer.
            </h2>
            <p className="mt-5 text-sm font-light leading-relaxed text-white/75 md:text-base">
              Six repères pour commencer, et une vingtaine de démonstrations animées sur la page Guides.
            </p>
          </div>
          <div className="mt-12">
            <GuidesExplorer idPrefix="landing-guides" tone="onDark" featuredDemos={LANDING_FEATURED_GUIDES} />
          </div>
          <p className="mt-10 text-center">
            <Link href="/guides" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-xs text-white/80 transition hover:border-white/55 hover:bg-white/10 hover:text-white">
              Tous les guides
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </section>

      {/* ——— Une seule section de repérage, dans le même univers visuel. ——— */}
      <section className="relative z-10 overflow-hidden border-y border-white/10">
        <img
          src={getAssetUrl(AIME_VISUALS.hero.guestsImage)}
          alt="Les invités du mariage, en astronautes, célèbrent avec les mariés dans une station spatiale"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,.85)_0%,rgba(0,0,0,.62)_45%,rgba(0,0,0,.25)_100%)]" />
        <div className="aime-landing-copy relative mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-32">
          <div className="max-w-xl">
            <p className="text-[10px] uppercase tracking-[.3em] text-white/55">Tout au même endroit</p>
            <h2 className="mt-6 font-display text-4xl font-light leading-tight text-white md:text-5xl">
              Votre mariage, enfin réuni.
            </h2>
            <ul className="mt-10 space-y-5">
              {essentials.map(item => (
                <li key={item.title} className="border-l border-white/25 pl-4">
                  <p className="font-display text-lg font-light text-white">{item.title}</p>
                  <p className="mt-1 text-sm font-light leading-relaxed text-white/65">{item.text}</p>
                </li>
              ))}
            </ul>
            <div className="mt-11 flex flex-wrap gap-3">
              <Link data-testid="hero-sign-up" href="/creation" className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90">
                Créer mon espace gratuitement
              </Link>
              <Link data-testid="landing-guides-cta" href="/guides" className="rounded-full border border-white/30 px-7 py-3.5 text-sm text-white/85 transition hover:bg-white/10 hover:text-white">
                Voir les guides
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 px-6 py-12 md:px-10">
        <div className="aime-landing-copy mx-auto flex max-w-6xl flex-col gap-6 text-xs text-white/70 md:flex-row md:items-center md:justify-between">
          <p className="font-display tracking-[.28em] text-white/80">AIME</p>
          <nav aria-label="Pages du site" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/guides" className="transition hover:text-white">Guides</Link>
            <Link href="/conditions" className="transition hover:text-white">Conditions d’utilisation</Link>
            <Link href="/confidentialite" className="transition hover:text-white">Confidentialité</Link>
          </nav>
          <p className="max-w-md text-white/55">
            En créant un espace, vous acceptez les conditions et la politique de confidentialité. Vos données restent les vôtres.
          </p>
        </div>
      </footer>
    </main>
  );
}

/**
 * L'aide est disponible avant même d'avoir un compte : la même connaissance de
 * l'architecture que dans l'espace privé, sans projet, sans saisie, sans envoi.
 */
function LandingGuideButton() {
  const [open, setOpen] = useState(false);
  return <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      data-testid="landing-guide-button"
      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-[11px] text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      <Compass aria-hidden className="h-3.5 w-3.5" />
      Comment ça marche
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

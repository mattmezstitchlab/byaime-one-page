import { useState } from "react";
import { Link } from "wouter";
import { AppearanceToggle } from "@/components/AppearanceToggle";
import { ChevronRight, Compass } from "lucide-react";
import { LandingComposer } from "@/components/LandingComposer";
import { useRouteMeta } from "@/lib/page-meta";
import { AIME_VISUALS, getAssetUrl } from "@/lib/assets";
import { AimeGuide } from "@/components/AimeGuide";
import { CenteredBlock } from "@/components/CenteredBlock";
import { GuidesExplorer } from "@/pages/Guides";

const promises = [
  { title: "Invités", text: "Les réponses RSVP, les foyers, les régimes et les besoins, au même endroit." },
  { title: "Budget", text: "Ce qui est engagé, ce qui est payé, ce qui reste — sans tableur à côté." },
  { title: "Prestataires", text: "Contacts, statuts, décisions et prochaines actions, avec la date de relance." },
  { title: "Jour J", text: "Le programme, les rôles de chacun et les informations utiles, en direct." },
  { title: "Partage", text: "Avancez à deux et avec vos proches, chacun ne voit que ce qui le regarde." },
];

const productLines = [
  { label: "Monde", text: "Timeline, tâches et décisions reliées." },
  { label: "Invités", text: "Réponses RSVP, tables et préférences." },
  { label: "Budget", text: "Dépenses, paiements et restant." },
  { label: "Jour J", text: "Régie, horaires et informations pratiques." },
];

const steps = [
  "Créez votre espace",
  "Invitez les personnes qui comptent",
  "Organisez votre mariage sereinement",
];

/**
 * Un fond photographique plein cadre, sans filtre noir superposé : les photos
 * gardent leurs couleurs. La lisibilité des titres est portée par une ombre de
 * texte légère (`.aime-landing-copy`), pas par un voile sur le visuel.
 */
function VisualBand({
  image,
  className = "",
}: {
  image: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${className}`}
      style={{ backgroundImage: `url(${getAssetUrl(image)})` }}
    />
  );
}

/** Sélection de guides montrés sur l'accueil — tout le catalogue est sur /guides. */
const LANDING_FEATURED_GUIDES = ["architecture", "intention", "ai-plus-me", "budget", "dayof", "memories"];

/**
 * L'accueil d'AIME — et son unique porte d'entrée : cliquer sur « AIME »
 * ramène toujours ici, connecté ou non. Le champ de saisie ouvre le hero,
 * parce que le premier geste utile vaut mieux qu'un argumentaire.
 */
export function LandingPage({ signedIn = false }: { signedIn?: boolean }) {
  useRouteMeta({
    title: "AIME — Organisez votre mariage sereinement",
    description:
      "AIME rassemble vos invités, votre budget, vos prestataires et vos décisions dans un espace privé, pour préparer votre mariage de la première idée au Jour J.",
  });

  return (
    <main data-testid="landing" className="min-h-[100dvh] bg-background text-foreground">
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

      {/* ——— Le hero : le champ de saisie, rien d'autre. ——— */}
      <section className="aime-cinematic-surface relative overflow-hidden border-b border-white/10">
        <VisualBand image={AIME_VISUALS.hero.backgroundImage} />
        <div className="aime-landing-copy relative mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-24 pt-32 text-center md:px-10 md:pb-32 md:pt-40">
          <p className="text-[10px] uppercase tracking-[.35em] text-white/55">L’art de créer des liens</p>
          <h1 className="mt-7 font-display text-6xl font-light tracking-[.14em] text-white md:text-8xl">AIME</h1>
          <p className="mt-7 max-w-2xl text-base font-light leading-relaxed text-white/75 md:text-lg">
            Un espace privé pour organiser votre mariage à plusieurs, de la première idée au Jour J.
          </p>
          <div className="mt-12 w-full">
            <LandingComposer signedIn={signedIn} />
          </div>
          <p className="mt-9 text-[11px] uppercase tracking-[.18em] text-white/45">
            Gratuit pour commencer. Aucun engagement.
          </p>
        </div>
      </section>

      {/* ——— Les guides, tout de suite sous le hero : une rangée par catégorie. ——— */}
      <section data-testid="landing-guides" className="relative overflow-hidden border-b border-white/10 bg-black py-20 md:py-28">
        <VisualBand image={AIME_VISUALS.universes.hotel} />
        <div className="relative">
          <div className="aime-landing-copy mx-auto max-w-3xl px-6 text-center">
            <p className="text-[10px] uppercase tracking-[.35em] text-white/60">Guides</p>
            <h2 className="mt-6 font-display text-4xl font-light leading-tight text-white md:text-6xl">
              Comprendre avant de cliquer.
            </h2>
            <p className="mt-5 text-sm font-light leading-relaxed text-white/75 md:text-base">
              Six repères pour commencer. Toutes les démonstrations animées — une vingtaine — vous attendent
              sur la page Guides, classées dans l&rsquo;ordre réel du mariage.
            </p>
          </div>
          <div className="mt-12">
            <GuidesExplorer idPrefix="landing-guides" tone="onDark" screens="panneaux" featuredDemos={LANDING_FEATURED_GUIDES} />
          </div>
          <p className="mt-10 text-center">
            <Link href="/guides" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-xs text-white/80 transition hover:border-white/55 hover:bg-white/10 hover:text-white">
              Tous les guides
              <ChevronRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </section>

      {/* ——— Le produit, sur un grand visuel. ——— */}
      <section className="relative overflow-hidden border-b border-white/10 bg-black">
        <VisualBand image={AIME_VISUALS.universes.event} />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-24 md:px-10 md:py-32 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div className="aime-landing-copy">
            <p className="text-[10px] uppercase tracking-[.3em] text-white/50">Tout votre mariage au même endroit</p>
            <h2 className="mt-7 font-display text-4xl font-light leading-tight text-white md:text-6xl">
              De la première idée au Jour J.
            </h2>
            <p className="mt-7 max-w-xl text-base font-light leading-relaxed text-white/70 md:text-lg">
              Centralisez vos invités, votre budget, vos prestataires, vos décisions et vos moments dans un
              espace privé, pensé pour avancer à plusieurs sans se marcher dessus.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link data-testid="hero-sign-up" href="/creation" className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90">
                Créer mon espace gratuitement
              </Link>
              <Link href="/guides" className="rounded-full border border-white/30 px-7 py-3.5 text-sm text-white/85 transition hover:bg-white/10 hover:text-white">
                Découvrir comment ça fonctionne
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/15 bg-black/45 p-6 backdrop-blur-sm md:p-8">
            <p className="text-[10px] uppercase tracking-[.28em] text-white/45">Aperçu produit</p>
            <dl className="mt-3 divide-y divide-white/10">
              {productLines.map(line => (
                <div key={line.label} className="flex items-baseline justify-between gap-6 py-4">
                  <dt className="font-display text-lg font-light text-white">{line.label}</dt>
                  <dd className="max-w-[16rem] text-right text-xs font-light leading-relaxed text-white/60">{line.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ——— Le propos, sans cartes. ——— */}
      <section className="border-b border-border px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-light leading-tight md:text-5xl">
            Organiser un mariage, ce n’est pas seulement choisir une date et une salle.
          </h2>
          <p className="mt-6 text-sm font-light leading-relaxed text-foreground/70 md:text-base">
            C’est coordonner des personnes, des décisions, des dépenses et des émotions. AIME les réunit au
            même endroit, au lieu de les disperser entre messages, fichiers, tableaux et conversations.
          </p>
        </div>
        <ul className="mx-auto mt-16 max-w-4xl divide-y divide-border/70 border-y border-border/70">
          {promises.map(item => (
            <li key={item.title} className="grid gap-1.5 py-6 sm:grid-cols-[11rem_1fr] sm:gap-8">
              <p className="font-display text-lg font-light">{item.title}</p>
              <p className="text-sm font-light leading-relaxed text-foreground/65">{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ——— Trois gestes, trois chiffres. ——— */}
      <section className="border-b border-border px-6 py-16 md:px-10 md:py-20">
        <p className="mx-auto max-w-5xl text-[10px] uppercase tracking-[.28em] text-foreground/50">Comment ça marche</p>
        <ol className="mx-auto mt-10 grid max-w-5xl gap-10 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step}>
              <p className="font-display text-5xl font-light text-foreground/25">{`0${index + 1}`}</p>
              <p className="mt-4 text-sm font-light leading-relaxed text-foreground/70">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ——— La sortie, sur un grand visuel. ——— */}
      <section className="relative overflow-hidden border-b border-white/10 bg-black px-6 py-28 text-center md:py-36">
        <VisualBand image={AIME_VISUALS.universes.music} />
        <div className="aime-landing-copy relative mx-auto max-w-3xl">
          <h2 className="font-display text-4xl font-light leading-tight text-white md:text-6xl">
            Prêts à organiser votre mariage autrement ?
          </h2>
          <p className="mt-7 text-sm font-light leading-relaxed text-white/65 md:text-base">
            AIME n’est pas un outil de gestion de plus : un espace commun pour décider, partager les
            responsabilités et garder la mémoire du jour même.
          </p>
          <Link data-testid="closing-sign-up" href="/creation" className="mt-11 inline-flex rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90">
            Créer mon espace
          </Link>
        </div>
      </section>

      <footer className="px-6 py-12 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 text-xs text-foreground/70 md:flex-row md:items-center md:justify-between">
          <p className="font-display tracking-[.28em] text-foreground/70">AIME</p>
          <nav aria-label="Pages du site" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/guides" className="transition hover:text-foreground">Guides</Link>
            <Link href="/conditions" className="transition hover:text-foreground">Conditions d’utilisation</Link>
            <Link href="/confidentialite" className="transition hover:text-foreground">Confidentialité</Link>
          </nav>
          <p className="max-w-md">
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

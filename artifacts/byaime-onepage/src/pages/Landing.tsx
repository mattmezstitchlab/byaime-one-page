import { Link } from "wouter";
import { AppearanceToggle } from "@/components/AppearanceToggle";
import { LandingComposer } from "@/components/LandingComposer";
import { useRouteMeta } from "@/lib/page-meta";
import { AIME_VISUALS, getAssetUrl } from "@/lib/assets";

const features = [
  { title: "Invités", text: "Suivez les réponses RSVP, les groupes, les régimes et les besoins importants." },
  { title: "Budget", text: "Gardez une vision claire des dépenses, des paiements et des engagements." },
  { title: "Prestataires", text: "Centralisez les contacts, les décisions et les prochaines actions." },
  { title: "Jour J", text: "Cadencez les horaires, les rôles et les informations utiles en direct." },
  { title: "Espace partagé", text: "Avancez à deux et avec vos proches, selon les rôles autorisés." },
];

const productPreview = [
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

      <section className="aime-cinematic-surface relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${getAssetUrl(AIME_VISUALS.hero.backgroundImage)})` }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/72 via-black/45 to-black/92" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-20 pt-28 text-center md:px-10 md:pb-28 md:pt-36">
          <p className="text-[10px] uppercase tracking-[.35em] text-white/55">L’art de créer des liens</p>
          <h1 className="mt-6 font-display text-6xl font-light tracking-[.14em] text-white md:text-8xl">AIME</h1>
          <p className="mt-6 max-w-2xl text-sm font-light leading-relaxed text-white/75 md:text-lg">
            Un espace privé pour organiser votre mariage à plusieurs, de la première idée au Jour J.
          </p>
          <div className="mt-10 w-full">
            <LandingComposer signedIn={signedIn} />
          </div>
          <p className="mt-8 text-[11px] uppercase tracking-[.18em] text-white/45">
            Gratuit pour commencer. Aucun engagement.
          </p>
        </div>
      </section>

      <section className="border-b border-border px-6 py-16 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[.3em] text-foreground/62">Tout votre mariage au même endroit</p>
            <h2 className="mt-6 font-display text-4xl font-light leading-tight md:text-6xl">
              AIME accompagne votre mariage, de la première idée au Jour J.
            </h2>
            <p className="mt-6 max-w-2xl text-base font-light leading-relaxed text-foreground/72 md:text-lg">
              Centralisez vos invités, votre budget, vos prestataires, vos décisions et vos moments importants dans un espace privé pensé pour avancer sereinement à plusieurs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link data-testid="hero-sign-up" href="/creation" className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:bg-foreground/85">
                Créer mon espace gratuitement
              </Link>
              <Link href="/guides" className="rounded-full border border-foreground/20 px-6 py-3 text-sm transition hover:bg-foreground/5">
                Découvrir comment ça fonctionne
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-foreground/10 bg-card p-5">
            <p className="text-[10px] uppercase tracking-[.24em] text-foreground/58">Aperçu produit</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {productPreview.map(item => (
                <div key={item.label} className="rounded-2xl border border-foreground/10 bg-foreground/[.03] p-3">
                  <p className="text-xs text-foreground/62">{item.label}</p>
                  <p className="mt-2 text-sm">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-light md:text-5xl">
            Organiser un mariage, ce n’est pas seulement choisir une date et une salle.
          </h2>
          <p className="mt-5 max-w-3xl text-sm font-light leading-relaxed text-foreground/72 md:text-base">
            C’est coordonner des personnes, des décisions, des dépenses et des émotions. AIME rassemble ces éléments dans un même espace, au lieu de les disperser entre messages, fichiers, tableaux et conversations.
          </p>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {features.map(feature => (
              <article key={feature.title} className="rounded-2xl border border-foreground/10 bg-card p-4">
                <h3 className="text-sm font-medium">{feature.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-foreground/60">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] uppercase tracking-[.24em] text-foreground/58">Comment ça marche</p>
          <ol className="mt-6 grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step} className="rounded-2xl border border-foreground/10 bg-card p-4">
                <p className="text-[10px] tracking-[.2em] text-foreground/62">{`0${index + 1}`}</p>
                <p className="mt-2 text-sm">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border px-6 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-light md:text-5xl">AIME n’est pas seulement un outil de gestion.</h2>
          <p className="mt-5 text-sm font-light leading-relaxed text-foreground/72 md:text-base">
            C’est un espace commun pour prendre des décisions, partager les responsabilités et garder une trace de ce qui compte.
          </p>
          <p className="mt-10 text-xl font-light md:text-2xl">Prêts à organiser votre mariage autrement ?</p>
          <Link data-testid="closing-sign-up" href="/creation" className="mt-6 inline-flex rounded-full bg-foreground px-7 py-3 text-sm font-semibold text-background transition hover:bg-foreground/85">
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

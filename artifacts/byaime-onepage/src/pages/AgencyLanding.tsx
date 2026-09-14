import { AGENCY_VISUALS, getAssetUrl } from "@/lib/assets";
import { AGENCY_IDENTITY } from "@/lib/agency-identity";
import { AGENCY_META, agencyJsonLdScript } from "@/lib/agency-seo";
import { useRouteMeta } from "@/lib/page-meta";
import { sitePath } from "@/lib/site-path";

/*
 * Vitrine « La cerise sur le gâteau — Wedding Architect ».
 *
 * Positionnement décidé avec les mariés hors champ : le logiciel est l'outil
 * interne du planner ; le couple ne reçoit que des livrables (la page verticale
 * du Jour J, le rapport présenté automatiquement). Cette page vend le planner,
 * pas le logiciel — aucune capture d'écran, aucun vocabulaire produit.
 *
 * Direction artistique : blanc new-yorkais, une seule encre charbon, une seule
 * serif de titrage, beaucoup de vide, zéro illustration de la métaphore
 * « cerise ». Copie française inline : c'est un site d'agence pour le marché
 * France, pas une vue de l'application.
 *
 * Trois sources uniques, plus rien de recopié ici :
 *  - l'identité (marque, rôle, villes, email)  → `lib/agency-identity.ts`
 *  - les couleurs et la serif                  → jetons `--agency-*` (index.css)
 *  - le titre, la description et le JSON-LD    → `lib/agency-seo.ts`
 * Les jetons remplacent des hexadécimaux codés en dur dont deux étaient sous le
 * seuil AA (2,25:1 et 3,76:1 sur blanc) : `agency-theme.test.ts` les mesure.
 */

const { brand, role, contactEmail, cities } = AGENCY_IDENTITY;

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.38em] text-[var(--agency-eyebrow)]">
      {children}
    </p>
  );
}

function MethodStep({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="border-t border-[var(--agency-hairline)] pt-6">
      <p className="text-[11px] tracking-[0.3em] text-[var(--agency-index)]">{index}</p>
      <h3 className="agency-serif mt-3 text-2xl text-[var(--agency-ink)]">
        {title}
      </h3>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--agency-body)]">{text}</p>
    </div>
  );
}

function ServiceRow({ index, text }: { index: string; text: string }) {
  return (
    <li className="flex items-baseline gap-6 border-t border-[var(--agency-hairline)] py-5">
      <span className="w-8 shrink-0 text-[11px] tracking-[0.3em] text-[var(--agency-index)]">{index}</span>
      <span className="agency-serif text-lg text-[var(--agency-ink)]">
        {text}
      </span>
    </li>
  );
}

export default function AgencyLanding() {
  /*
   * La vitrine porte enfin son propre titre, sa propre description et sa propre
   * URL canonique : jusque-là, `/agence` héritait du `<title>` d'AIME posé par
   * `index.html` et la balise canonical restait sur `/`.
   */
  useRouteMeta({ title: AGENCY_META.title, description: AGENCY_META.description });

  const hero = getAssetUrl(AGENCY_VISUALS.hero);
  const stationery = getAssetUrl(AGENCY_VISUALS.stationery);
  const ceremony = getAssetUrl(AGENCY_VISUALS.ceremony);

  return (
    <>
      {/* Données structurées : la page est un service professionnel, pas un
          article. Rendu hors du `<main>` et injecté tel quel — React échappe le
          texte d'un `<script>`, ce qui casserait le JSON. */}
      <script
        type="application/ld+json"
        data-testid="agency-jsonld"
        dangerouslySetInnerHTML={{ __html: agencyJsonLdScript() }}
      />

      <main data-testid="agency-landing" className="bg-[var(--agency-paper)] text-[var(--agency-ink)] antialiased">
        {/* ————— Barre haute ————— */}
        <header className="absolute inset-x-0 top-0 z-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
            <a href="#haut" className="agency-serif text-lg text-[var(--agency-ink)]">
              {brand}
            </a>
            <nav aria-label="Navigation de la vitrine" className="flex items-center gap-8">
              <a href="#methode" className="hidden text-[11px] uppercase tracking-[0.3em] text-[var(--agency-body)] hover:text-[var(--agency-ink)] sm:block">
                Méthode
              </a>
              <a href="#prestations" className="hidden text-[11px] uppercase tracking-[0.3em] text-[var(--agency-body)] hover:text-[var(--agency-ink)] sm:block">
                Prestations
              </a>
              <a
                href={sitePath("/mentions-legales")}
                data-testid="agency-mentions"
                className="hidden text-[11px] uppercase tracking-[0.3em] text-[var(--agency-body)] transition-colors hover:text-[var(--agency-ink)] sm:block"
              >
                Mentions légales
              </a>
              <a
                href={sitePath("/admin")}
                data-testid="agency-admin"
                className="text-[11px] uppercase tracking-[0.3em] text-[var(--agency-body)] transition-colors hover:text-[var(--agency-ink)]"
              >
                Admin
              </a>
              <a
                href={`mailto:${contactEmail}`}
                className="border border-[var(--agency-ink)] px-5 py-2.5 text-[11px] uppercase tracking-[0.3em] text-[var(--agency-ink)] transition-colors hover:bg-[var(--agency-ink)] hover:text-[var(--agency-paper)]"
              >
                Prendre rendez-vous
              </a>
            </nav>
          </div>
        </header>

        {/* ————— Héros ————— */}
        <section id="haut" data-testid="agency-hero" aria-label="Présentation" className="relative flex min-h-[92dvh] flex-col items-center justify-center px-6 text-center">
          <Eyebrow>{role}</Eyebrow>
          <h1 className="agency-serif mt-8 max-w-4xl text-5xl leading-[1.05] text-[var(--agency-ink)] sm:text-7xl">
            {brand}
          </h1>
          <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-[var(--agency-body)]">
            J&rsquo;architecture votre mariage de bout en bout — lieux, temps, budget,
            invités, prestataires. Vous ne gardez que le meilleur : une seule page,
            votre Jour J.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href={`mailto:${contactEmail}`}
              className="bg-[var(--agency-ink)] px-8 py-4 text-[11px] uppercase tracking-[0.3em] text-[var(--agency-paper)] transition-opacity hover:opacity-80"
            >
              Prendre rendez-vous
            </a>
            <a href="#methode" className="px-8 py-4 text-[11px] uppercase tracking-[0.3em] text-[var(--agency-body)] underline-offset-8 hover:underline">
              Découvrir la méthode
            </a>
          </div>
        </section>

        {/* ————— Image pleine largeur ————— */}
        <figure data-testid="agency-hero-image" className="relative">
          <img
            src={hero}
            alt="Longue table de réception en lin ivoire sous de hautes fenêtres, lumière naturelle"
            className="h-[68dvh] w-full object-cover"
          />
          <figcaption className="mx-auto flex max-w-6xl justify-between px-6 pt-3 text-[10px] uppercase tracking-[0.3em] text-[var(--agency-body)]">
            {cities.map(city => <span key={city}>{city}</span>)}
          </figcaption>
        </figure>

        {/* ————— Manifeste ————— */}
        <section data-testid="agency-manifesto" aria-label="Manifeste" className="mx-auto max-w-3xl px-6 py-28 text-center">
          <p className="agency-serif text-3xl leading-snug text-[var(--agency-ink)] sm:text-4xl">
            <em>Un mariage ne s&rsquo;improvise pas. Il s&rsquo;architecte.</em>
          </p>
          <p className="mt-8 text-[15px] leading-relaxed text-[var(--agency-body)]">
            Derrière chaque mariage qui paraît simple, il y a une structure invisible :
            un plan, des décisions tenues, un déroulé à la minute. Cette structure,
            c&rsquo;est mon métier. Vous, vous vivez le vôtre.
          </p>
        </section>

        {/* ————— Méthode ————— */}
        <section id="methode" data-testid="agency-method" aria-label="La méthode" className="border-t border-[var(--agency-hairline)]">
          <div className="mx-auto grid max-w-6xl gap-16 px-6 py-24 lg:grid-cols-[5fr_6fr] lg:gap-24">
            <div>
              <Eyebrow>La méthode</Eyebrow>
              <h2 className="agency-serif mt-6 text-4xl leading-tight text-[var(--agency-ink)]">
                Quatre temps, un seul plan
              </h2>
              <img
                src={stationery}
                alt="Papeterie ivoire gravée à sec, sceau de cire et plume sur pierre claire"
                className="mt-12 hidden w-full object-cover lg:block"
              />
            </div>
            <div className="grid gap-10">
              <MethodStep
                index="01"
                title="La conception"
                text="Une conversation, un plan. Votre histoire devient une architecture : lieux, temps, budget, invités. Rien n'est laissé à l'humeur."
              />
              <MethodStep
                index="02"
                title="L'architecture"
                text="Chaque décision trouve sa place : prestataires, contrats, paiements, documents. Rien ne se perd, rien ne se ressaisit."
              />
              <MethodStep
                index="03"
                title="L'orchestration"
                text="Les semaines défilent, les tâches avancent, les invités répondent. Je tiens le plan ; vous vivez l'attente."
              />
              <MethodStep
                index="04"
                title="Le Jour J"
                text="Le déroulé minute par minute, tenu à la seconde. Vous êtes présents, je suis derrière."
              />
            </div>
          </div>
        </section>

        {/* ————— Ce que vous recevez ————— */}
        <section data-testid="agency-deliverables" aria-label="Ce que vous recevez" className="border-t border-[var(--agency-hairline)] bg-[var(--agency-paper)]">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <Eyebrow>Ce que vous recevez</Eyebrow>
            <div className="mt-10 grid gap-16 lg:grid-cols-2">
              <div>
                <h2 className="agency-serif text-3xl leading-tight text-[var(--agency-ink)]">
                  Une page. Votre Jour J.
                </h2>
                <p className="mt-5 text-[15px] leading-relaxed text-[var(--agency-body)]">
                  Verticale, limpide, pensée pour le téléphone : horaires, lieux,
                  contacts, météo de repli. Une seule adresse à partager avec qui
                  vous voulez — vos invités n&rsquo;ont rien à installer, rien à apprendre.
                </p>
              </div>
              <div>
                <h2 className="agency-serif text-3xl leading-tight text-[var(--agency-ink)]">
                  Un rapport, présenté tout seul.
                </h2>
                <p className="mt-5 text-[15px] leading-relaxed text-[var(--agency-body)]">
                  Budget, invités confirmés, tâches closes, documents signés : tout ce
                  qui a été construit se présente automatiquement. Aucun tableur,
                  aucune donnée ressaisie, aucun compte à rendre à la main.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ————— Prestations ————— */}
        <section id="prestations" data-testid="agency-services" aria-label="Prestations" className="border-t border-[var(--agency-hairline)]">
          <div className="mx-auto max-w-3xl px-6 py-24">
            <Eyebrow>Prestations</Eyebrow>
            <ul className="mt-10">
              <ServiceRow index="01" text="Direction artistique & conception" />
              <ServiceRow index="02" text="Sélection et contrat des prestataires" />
              <ServiceRow index="03" text="Budget suivi au centime" />
              <ServiceRow index="04" text="Invités, RSVP et plan de table" />
              <ServiceRow index="05" text="Déroulé du Jour J et coordination le jour même" />
            </ul>
          </div>
        </section>

        {/* ————— Respiration image ————— */}
        <figure data-testid="agency-quote" className="relative">
          <img
            src={ceremony}
            alt="Cérémonie en plein air, rangées de chaises claires face à une arche de branches"
            className="h-[72dvh] w-full object-cover"
          />
          <figcaption className="absolute inset-0 flex items-center justify-center bg-[var(--agency-ink)]/25 px-6">
            <p className="agency-serif max-w-2xl text-center text-3xl leading-snug text-[var(--agency-paper)] sm:text-4xl">
              <em>Le luxe, c&rsquo;est de n&rsquo;avoir rien à gérer.</em>
            </p>
          </figcaption>
        </figure>

        {/* ————— Contact ————— */}
        <section id="contact" data-testid="agency-contact" aria-label="Contact" className="mx-auto max-w-3xl px-6 py-28 text-center">
          <Eyebrow>Contact</Eyebrow>
          <h2 className="agency-serif mt-6 text-4xl leading-tight text-[var(--agency-ink)] sm:text-5xl">
            Parlons de votre mariage.
          </h2>
          <p className="mt-6 text-[15px] leading-relaxed text-[var(--agency-body)]">
            Quelques dates par an, pas davantage. Écrivez-moi : je réponds
            personnellement, sous vingt-quatre heures.
          </p>
          <a
            href={`mailto:${contactEmail}`}
            className="mt-10 inline-block bg-[var(--agency-ink)] px-10 py-4 text-[11px] uppercase tracking-[0.3em] text-[var(--agency-paper)] transition-opacity hover:opacity-80"
          >
            {contactEmail}
          </a>
        </section>

        {/* ————— Pied de page ————— */}
        <footer data-testid="agency-footer" className="border-t border-[var(--agency-hairline)]">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-[10px] uppercase tracking-[0.3em] text-[var(--agency-body)] sm:flex-row">
            <span className="agency-serif text-sm normal-case tracking-normal text-[var(--agency-ink)]">
              {brand} — {role}
            </span>
            <span>{cities.join(" · ")}</span>
            <nav data-testid="agency-footer-links" aria-label="Pages du site" className="flex flex-wrap items-center justify-center gap-4">
              {/* La Bande : le produit lui-même, en démonstration publique et
                  sans session. En mode dégradé la vitrine est la seule porte
                  d'entrée du site — la démo doit y être joignable aussi. */}
              <a href={sitePath("/monde")} data-testid="agency-bande" className="hover:text-[var(--agency-ink)]">
                La Bande
              </a>
              <a href={sitePath("/mentions-legales")} className="hover:text-[var(--agency-ink)]">
                Mentions légales
              </a>
              <a href={sitePath("/confidentialite")} className="hover:text-[var(--agency-ink)]">
                Confidentialité
              </a>
              <a href={sitePath("/")} className="hover:text-[var(--agency-ink)]">
                Espace privé
              </a>
              <a href={sitePath("/admin")} className="hover:text-[var(--agency-ink)]">
                Admin
              </a>
            </nav>
          </div>
        </footer>
      </main>
    </>
  );
}

import { SiteFooter, SiteHeader, SiteHero, SitePanel } from "@/components/SiteChrome";
import { AGENCY_VISUALS, getAssetUrl } from "@/lib/assets";
import { AGENCY_IDENTITY } from "@/lib/agency-identity";
import { AGENCY_META, agencyJsonLdScript } from "@/lib/agency-seo";
import { useRouteMeta } from "@/lib/page-meta";
import { sitePath } from "@/lib/site-path";
import { BODY, CARD, EYEBROW, PILL_GHOST, PILL_INK, PILL_SMALL_INK, TITLE } from "@/lib/site-design";
import { cn } from "@/lib/utils";

/*
 * Vitrine « La cerise sur le gâteau — Wedding Architect ».
 *
 * Positionnement décidé avec les mariés hors champ : le logiciel est l'outil
 * interne du planner ; le couple ne reçoit que des livrables (la page verticale
 * du Jour J, le rapport présenté automatiquement). Cette page vend le planner,
 * pas le logiciel — aucune capture d'écran, aucun vocabulaire produit.
 *
 * Direction artistique reprise le 14/09 sur celle de l'accueil, à la demande de
 * la fondatrice (« ce serait bien tout le site comme ça ») : barre fixe fine et
 * floutée, hero plein écran, panneaux blancs séparés d'un filet, cartes
 * arrondies, boutons-pilules, entrées au défilement. Le dessin vient de
 * `lib/site-design.ts` et l'ossature de `components/SiteChrome.tsx` — plus rien
 * n'est recopié ici.
 *
 * Une décision de typographie accompagne cette reprise : le site parle en sans,
 * la police d'affichage de l'accueil. La serif `--agency-serif` ne reste que dans
 * le livrable d'un couple (`components/CoupleReport.tsx`), qui est un document à
 * lire et à imprimer, pas un écran. Revenir à la serif sur les pages publiques
 * tient en une ligne : `TITLE`, dans `lib/site-design.ts`.
 *
 * Trois sources uniques pour le contenu :
 *  - l'identité (marque, rôle, villes, email)  → `lib/agency-identity.ts`
 *  - les couleurs et les polices               → jetons `--agency-*` (index.css)
 *  - le titre, la description et le JSON-LD    → `lib/agency-seo.ts`
 * Les jetons remplacent des hexadécimaux codés en dur dont deux étaient sous le
 * seuil AA (2,25:1 et 3,76:1 sur blanc) : `agency-theme.test.ts` les mesure.
 */

const { brand, role, contactEmail, cities } = AGENCY_IDENTITY;

/** Une étape de la méthode : une carte, un numéro, un titre, trois lignes. */
function MethodStep({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className={cn(CARD, "p-6 md:p-8")}>
      <p className="text-[11px] font-medium tracking-[0.3em] text-[var(--agency-index)]">{index}</p>
      <h3 className={cn(TITLE, "mt-4 text-2xl")}>{title}</h3>
      <p className={cn(BODY, "mt-3")}>{text}</p>
    </div>
  );
}

/** Une prestation : une ligne de filet, pas une carte. La liste se lit d'un œil. */
function ServiceRow({ index, text }: { index: string; text: string }) {
  return (
    <li className="flex items-baseline gap-6 border-t border-[var(--agency-hairline)] py-5">
      <span className="w-8 shrink-0 text-[11px] font-medium tracking-[0.3em] text-[var(--agency-index)]">
        {index}
      </span>
      <span className="text-lg text-[var(--agency-ink)]">{text}</span>
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

      <SiteHeader
        current="/agence"
        actions={
          <>
            <a
              href={sitePath("/mentions-legales")}
              data-testid="agency-mentions"
              className="hidden h-8 items-center rounded-full px-3 text-xs text-[var(--agency-ink)]/75 motion-safe:transition hover:bg-[var(--agency-ink)]/10 hover:text-[var(--agency-ink)] md:inline-flex"
            >
              Mentions légales
            </a>
            <a
              href={sitePath("/admin")}
              data-testid="agency-admin"
              className="hidden h-8 items-center rounded-full px-3 text-xs text-[var(--agency-ink)]/75 motion-safe:transition hover:bg-[var(--agency-ink)]/10 hover:text-[var(--agency-ink)] sm:inline-flex"
            >
              Admin
            </a>
            <a href={`mailto:${contactEmail}`} className={PILL_SMALL_INK}>
              Prendre rendez-vous
            </a>
          </>
        }
      />

      <main
        data-testid="agency-landing"
        className="min-h-[100dvh] bg-[var(--agency-paper)] text-[var(--agency-ink)] antialiased"
      >
        {/* ————— Héros ————— */}
        <SiteHero
          id="haut"
          testId="agency-hero"
          eyebrow={role}
          title={brand}
          lead={
            <>
              J&rsquo;architecture votre mariage de bout en bout — lieux, temps,
              budget, invités, prestataires. Vous ne gardez que le meilleur : une
              seule page, votre Jour J.
            </>
          }
          className="min-h-[100dvh] pb-20"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href={`mailto:${contactEmail}`} className={PILL_INK}>
              Prendre rendez-vous
            </a>
            <a href="#methode" className={PILL_GHOST}>
              Découvrir la méthode
            </a>
          </div>
        </SiteHero>

        {/* ————— Image pleine largeur ————— */}
        <figure data-testid="agency-hero-image" className="relative border-t border-[var(--agency-hairline)]">
          <img
            src={hero}
            alt="Longue table de réception en lin ivoire sous de hautes fenêtres, lumière naturelle"
            className="h-[68dvh] w-full object-cover"
          />
          <figcaption className="mx-auto flex max-w-6xl justify-between px-6 pt-4">
            {cities.map(city => (
              <span key={city} className={cn(EYEBROW, "tracking-[0.3em]")}>
                {city}
              </span>
            ))}
          </figcaption>
        </figure>

        {/* ————— Manifeste ————— */}
        <SitePanel testId="agency-manifesto" className="py-24 md:py-32">
          <p className={cn(TITLE, "mx-auto max-w-3xl text-3xl leading-snug md:text-4xl")}>
            Un mariage ne s&rsquo;improvise pas. Il s&rsquo;architecte.
          </p>
          <p className={cn(BODY, "mx-auto mt-8 max-w-xl text-center")}>
            Derrière chaque mariage qui paraît simple, il y a une structure
            invisible : un plan, des décisions tenues, un déroulé à la minute.
            Cette structure, c&rsquo;est mon métier. Vous, vous vivez le vôtre.
          </p>
        </SitePanel>

        {/* ————— Méthode ————— */}
        <SitePanel
          id="methode"
          testId="agency-method"
          eyebrow="La méthode"
          title="Quatre temps, un seul plan"
          className="py-20 md:py-28"
        >
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
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
          <img
            src={stationery}
            alt="Papeterie ivoire gravée à sec, sceau de cire et plume sur pierre claire"
            className="mt-14 hidden w-full rounded-3xl object-cover lg:block"
          />
        </SitePanel>

        {/* ————— Ce que vous recevez ————— */}
        <SitePanel
          testId="agency-deliverables"
          eyebrow="Ce que vous recevez"
          lead="Deux documents, et rien à tenir vous-même."
          className="py-20 md:py-28"
        >
          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <div className={cn(CARD, "p-8 md:p-10")}>
              <h2 className={cn(TITLE, "text-2xl md:text-3xl")}>Une page. Votre Jour J.</h2>
              <p className={cn(BODY, "mt-5")}>
                Verticale, limpide, pensée pour le téléphone : horaires, lieux,
                contacts, météo de repli. Une seule adresse à partager avec qui vous
                voulez — vos invités n&rsquo;ont rien à installer, rien à apprendre.
              </p>
            </div>
            <div className={cn(CARD, "p-8 md:p-10")}>
              <h2 className={cn(TITLE, "text-2xl md:text-3xl")}>
                Un rapport, présenté tout seul.
              </h2>
              <p className={cn(BODY, "mt-5")}>
                Budget, invités confirmés, tâches closes, documents signés : tout ce
                qui a été construit se présente automatiquement. Aucun tableur,
                aucune donnée ressaisie, aucun compte à rendre à la main.
              </p>
            </div>
          </div>
        </SitePanel>

        {/* ————— Prestations ————— */}
        <SitePanel
          id="prestations"
          testId="agency-services"
          eyebrow="Prestations"
          title="Ce que je tiens pour vous"
          narrow
          className="py-20 md:py-28"
        >
          <ul className="mt-12 border-b border-[var(--agency-hairline)]">
            <ServiceRow index="01" text="Direction artistique & conception" />
            <ServiceRow index="02" text="Sélection et contrat des prestataires" />
            <ServiceRow index="03" text="Budget suivi au centime" />
            <ServiceRow index="04" text="Invités, RSVP et plan de table" />
            <ServiceRow index="05" text="Déroulé du Jour J et coordination le jour même" />
          </ul>
        </SitePanel>

        {/* ————— Respiration image ————— */}
        <figure data-testid="agency-quote" className="relative border-t border-[var(--agency-hairline)]">
          <img
            src={ceremony}
            alt="Cérémonie en plein air, rangées de chaises claires face à une arche de branches"
            className="h-[72dvh] w-full object-cover"
          />
          {/*
            Voile à 55 % d'encre, et non 25 % : une citation blanche posée sur une
            photographie n'a pas de contraste calculable, on tient donc l'opacité
            du voile. Sur la zone la plus claire possible (blanc), 55 % d'encre
            donne 3,98:1 — au-dessus des 3:1 exigés pour du grand texte (30 px et
            plus, graisse 600). À 25 % on tombait à 1,72:1 : la citation ne se
            lisait pas sur un ciel clair.
          */}
          <figcaption className="absolute inset-0 flex items-center justify-center bg-[var(--agency-ink)]/55 px-6">
            <p className={cn(TITLE, "max-w-2xl text-center text-3xl leading-snug text-[var(--agency-paper)] md:text-4xl")}>
              Le luxe, c&rsquo;est de n&rsquo;avoir rien à gérer.
            </p>
          </figcaption>
        </figure>

        {/* ————— Contact ————— */}
        <SitePanel
          id="contact"
          testId="agency-contact"
          eyebrow="Contact"
          title="Parlons de votre mariage."
          lead="Quelques dates par an, pas davantage. Écrivez-moi : je réponds personnellement, sous vingt-quatre heures."
          className="py-24 md:py-32"
        >
          <div className="mt-10 flex justify-center">
            <a href={`mailto:${contactEmail}`} className={PILL_INK}>
              {contactEmail}
            </a>
          </div>
        </SitePanel>
      </main>

      <SiteFooter />
    </>
  );
}

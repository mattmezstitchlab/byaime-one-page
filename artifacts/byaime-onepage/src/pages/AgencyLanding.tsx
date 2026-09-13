import { AGENCY_VISUALS, getAssetUrl } from "@/lib/assets";

/*
 * Vitrine « La cerise sur le gâteau — Wedding Architect ».
 *
 * Positionnement décidé avec les mariés hors champ : le logiciel est l'outil
 * interne du planner ; le couple ne reçoit que des livrables (la page verticale
 * du Jour J, le rapport présenté automatiquement). Cette page vend le planner,
 * pas le logiciel — aucune capture d'écran, aucun vocabulaire produit.
 *
 * Direction artistique : blanc new-yorkais, une seule encre charbon, une seule
 * serif de titrage (Didot / Bodoni selon la machine, Georgia en repli), beaucoup
 * de vide, zéro illustration de la métaphore « cerise ». Copie française inline :
 * c'est un site d'agence pour le marché France, pas une vue de l'application.
 *
 * Pour changer l'identité, tout est dans les deux constantes en tête de fichier.
 */

const BRAND = "La cerise sur le gâteau";
const ROLE = "Wedding Architect";
const CONTACT_EMAIL = "bonjour@lacerisesurlegateau.fr";

const serif = {
  fontFamily:
    "'Didot', 'Bodoni MT', 'Playfair Display', 'Cormorant Garamond', Georgia, 'Times New Roman', serif",
} as const;

const hairline = "border-[#E6E1D8]";
const muted = "text-[#6F6A61]";
const ink = "text-[#171410]";

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.38em] text-[#8A8375]">
      {children}
    </p>
  );
}

function MethodStep({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className={`border-t ${hairline} pt-6`}>
      <p className="text-[11px] tracking-[0.3em] text-[#B4AC9C]">{index}</p>
      <h3 className={`mt-3 text-2xl ${ink}`} style={serif}>
        {title}
      </h3>
      <p className={`mt-3 text-[15px] leading-relaxed ${muted}`}>{text}</p>
    </div>
  );
}

function ServiceRow({ index, text }: { index: string; text: string }) {
  return (
    <li className={`flex items-baseline gap-6 border-t ${hairline} py-5`}>
      <span className="w-8 shrink-0 text-[11px] tracking-[0.3em] text-[#B4AC9C]">{index}</span>
      <span className={`text-lg ${ink}`} style={serif}>
        {text}
      </span>
    </li>
  );
}

export default function AgencyLanding() {
  const hero = getAssetUrl(AGENCY_VISUALS.hero);
  const stationery = getAssetUrl(AGENCY_VISUALS.stationery);
  const ceremony = getAssetUrl(AGENCY_VISUALS.ceremony);

  return (
    <main data-testid="agency-landing" className="bg-[#FBFAF8] text-[#171410] antialiased">
      {/* ————— Barre haute ————— */}
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <a href="#haut" className={`text-lg ${ink}`} style={serif}>
            {BRAND}
          </a>
          <nav aria-label="Navigation de la vitrine" className="flex items-center gap-8">
            <a href="#methode" className={`hidden text-[11px] uppercase tracking-[0.3em] ${muted} hover:text-[#171410] sm:block`}>
              Méthode
            </a>
            <a href="#prestations" className={`hidden text-[11px] uppercase tracking-[0.3em] ${muted} hover:text-[#171410] sm:block`}>
              Prestations
            </a>
            <a
              href="/admin"
              data-testid="agency-admin"
              className="text-[11px] uppercase tracking-[0.3em] text-[#6F6A61] transition-colors hover:text-[#171410]"
            >
              Admin
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="border border-[#171410] px-5 py-2.5 text-[11px] uppercase tracking-[0.3em] text-[#171410] transition-colors hover:bg-[#171410] hover:text-[#FBFAF8]"
            >
              Prendre rendez-vous
            </a>
          </nav>
        </div>
      </header>

      {/* ————— Héros ————— */}
      <section id="haut" data-testid="agency-hero" aria-label="Présentation" className="relative flex min-h-[92dvh] flex-col items-center justify-center px-6 text-center">
        <Eyebrow>{ROLE}</Eyebrow>
        <h1 className={`mt-8 max-w-4xl text-5xl leading-[1.05] sm:text-7xl ${ink}`} style={serif}>
          {BRAND}
        </h1>
        <p className={`mt-8 max-w-xl text-[15px] leading-relaxed ${muted}`}>
          J&rsquo;architecture votre mariage de bout en bout — lieux, temps, budget,
          invités, prestataires. Vous ne gardez que le meilleur : une seule page,
          votre Jour J.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="bg-[#171410] px-8 py-4 text-[11px] uppercase tracking-[0.3em] text-[#FBFAF8] transition-opacity hover:opacity-80"
          >
            Prendre rendez-vous
          </a>
          <a href="#methode" className={`px-8 py-4 text-[11px] uppercase tracking-[0.3em] ${muted} underline-offset-8 hover:underline`}>
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
        <figcaption className={`mx-auto flex max-w-6xl justify-between px-6 pt-3 text-[10px] uppercase tracking-[0.3em] ${muted}`}>
          <span>Paris</span>
          <span>New York</span>
        </figcaption>
      </figure>

      {/* ————— Manifeste ————— */}
      <section data-testid="agency-manifesto" aria-label="Manifeste" className="mx-auto max-w-3xl px-6 py-28 text-center">
        <p className={`text-3xl leading-snug sm:text-4xl ${ink}`} style={serif}>
          <em>Un mariage ne s&rsquo;improvise pas. Il s&rsquo;architecte.</em>
        </p>
        <p className={`mt-8 text-[15px] leading-relaxed ${muted}`}>
          Derrière chaque mariage qui paraît simple, il y a une structure invisible :
          un plan, des décisions tenues, un déroulé à la minute. Cette structure,
          c&rsquo;est mon métier. Vous, vous vivez le vôtre.
        </p>
      </section>

      {/* ————— Méthode ————— */}
      <section id="methode" data-testid="agency-method" aria-label="La méthode" className="border-t border-[#E6E1D8]">
        <div className="mx-auto grid max-w-6xl gap-16 px-6 py-24 lg:grid-cols-[5fr_6fr] lg:gap-24">
          <div>
            <Eyebrow>La méthode</Eyebrow>
            <h2 className={`mt-6 text-4xl leading-tight ${ink}`} style={serif}>
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
      <section data-testid="agency-deliverables" aria-label="Ce que vous recevez" className="border-t border-[#E6E1D8] bg-[#F5F2EC]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Eyebrow>Ce que vous recevez</Eyebrow>
          <div className="mt-10 grid gap-16 lg:grid-cols-2">
            <div>
              <h2 className={`text-3xl leading-tight ${ink}`} style={serif}>
                Une page. Votre Jour J.
              </h2>
              <p className={`mt-5 text-[15px] leading-relaxed ${muted}`}>
                Verticale, limpide, pensée pour le téléphone : horaires, lieux,
                contacts, météo de repli. Une seule adresse à partager avec qui
                vous voulez — vos invités n&rsquo;ont rien à installer, rien à apprendre.
              </p>
            </div>
            <div>
              <h2 className={`text-3xl leading-tight ${ink}`} style={serif}>
                Un rapport, présenté tout seul.
              </h2>
              <p className={`mt-5 text-[15px] leading-relaxed ${muted}`}>
                Budget, invités confirmés, tâches closes, documents signés : tout ce
                qui a été construit se présente automatiquement. Aucun tableur,
                aucune donnée ressaisie, aucun compte à rendre à la main.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ————— Prestations ————— */}
      <section id="prestations" data-testid="agency-services" aria-label="Prestations" className="border-t border-[#E6E1D8]">
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
        <figcaption className="absolute inset-0 flex items-center justify-center bg-[#171410]/25 px-6">
          <p className="max-w-2xl text-center text-3xl leading-snug text-[#FBFAF8] sm:text-4xl" style={serif}>
            <em>Le luxe, c&rsquo;est de n&rsquo;avoir rien à gérer.</em>
          </p>
        </figcaption>
      </figure>

      {/* ————— Contact ————— */}
      <section id="contact" data-testid="agency-contact" aria-label="Contact" className="mx-auto max-w-3xl px-6 py-28 text-center">
        <Eyebrow>Contact</Eyebrow>
        <h2 className={`mt-6 text-4xl leading-tight sm:text-5xl ${ink}`} style={serif}>
          Parlons de votre mariage.
        </h2>
        <p className={`mt-6 text-[15px] leading-relaxed ${muted}`}>
          Quelques dates par an, pas davantage. Écrivez-moi : je réponds
          personnellement, sous vingt-quatre heures.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-10 inline-block bg-[#171410] px-10 py-4 text-[11px] uppercase tracking-[0.3em] text-[#FBFAF8] transition-opacity hover:opacity-80"
        >
          {CONTACT_EMAIL}
        </a>
      </section>

      {/* ————— Pied de page ————— */}
      <footer data-testid="agency-footer" className="border-t border-[#E6E1D8]">
        <div className={`mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-[10px] uppercase tracking-[0.3em] ${muted} sm:flex-row`}>
          <span style={serif} className="text-sm normal-case tracking-normal">
            {BRAND} — {ROLE}
          </span>
          <span>Paris · New York</span>
          <a href="/" className="hover:text-[#171410]">
            Espace privé
          </a>
          <a href="/admin" className="hover:text-[#171410]">
            Admin
          </a>
        </div>
      </footer>
    </main>
  );
}

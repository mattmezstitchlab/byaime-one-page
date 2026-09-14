import { SitePanel } from "@/components/SiteChrome";
import { AGENCY_VISUALS, getAssetUrl } from "@/lib/assets";
import { AGENCY_IDENTITY } from "@/lib/agency-identity";
import { BODY, PILL_INK, TITLE } from "@/lib/site-design";
import { cn } from "@/lib/utils";

/*
 * Les sections de la vitrine, réduites à l'essentiel (14/09).
 *
 * Après la démonstration, la page ne doit plus rien empiler : une seule
 * preuve, « une phrase → un plan → un contact ». La vitrine tient donc en
 * trois morceaux :
 *
 *  - une seule section immersive (photo pleine largeur, titre blanc) : la
 *    différence racontée en une phrase ;
 *  - trois lignes, pas quatre cartes : ce qui tient la promesse, sans jargon ;
 *  - un seul bloc contact : un bouton, une adresse.
 *
 * Tout ce qui faisait du bruit autour (accordéon en sept étapes, grille des
 * vingt-deux métiers, questions/réponses, dossiers, espaces, prestations,
 * citations et visuels répétés) est retiré : la Bande est la preuve, la
 * vitrine n'est plus qu'une poignée de lignes pour la conclure.
 *
 * Le dessin vient de `lib/site-design.ts`, l'ossature de
 * `components/SiteChrome.tsx` ; aucune couleur n'est recopiée (contrôlé par
 * `agency-theme.test.ts`). Le texte blanc sur photo passe par le jeton
 * `--agency-paper` : jamais un hexadécimal en dur.
 */

const { brand, role, contactEmail } = AGENCY_IDENTITY;

/* Titre blanc sur photographie : on n'empile pas deux utilitaires de couleur
   (l'ordre de génération des classes ne se présume pas) — on remplace la
   couleur de `aime-apple-title`, posée dans la couche `components`, par une
   utilité de la couche `utilities`, qui l'emporte. */
const IMMERSIVE_TITLE = "aime-apple-title text-[var(--agency-paper)]";
const IMMERSIVE_LEAD = "font-light text-[var(--agency-paper)]/85";
const IMMERSIVE_EYEBROW = "text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--agency-paper)]/85";

/** Une grande section immersive : photo pleine largeur, voile, titre blanc. */
function Immersive({
  id,
  testId,
  image,
  alt,
  eyebrow,
  title,
  lead,
}: {
  id?: string;
  testId?: string;
  image: string;
  alt: string;
  eyebrow?: string;
  title: string;
  lead?: string;
}) {
  return (
    <section
      id={id}
      data-testid={testId}
      className="relative flex min-h-[86dvh] items-center justify-center overflow-hidden border-t border-[var(--agency-hairline)]"
    >
      <img
        src={getAssetUrl(image)}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Voile d'encre à 60 % : au-dessus des 3:1 exigés pour du grand texte
          blanc, même sur la zone la plus claire de la photographie. */}
      <div aria-hidden="true" className="absolute inset-0 bg-[var(--agency-ink)]/60" />
      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-24 text-center">
        {eyebrow && <p className={IMMERSIVE_EYEBROW}>{eyebrow}</p>}
        <h2 className={cn(IMMERSIVE_TITLE, "mx-auto mt-6 max-w-4xl text-4xl md:text-6xl")}>{title}</h2>
        {lead && <p className={cn(IMMERSIVE_LEAD, "mx-auto mt-6 max-w-2xl text-base md:text-lg")}>{lead}</p>}
      </div>
    </section>
  );
}

/** Trois différences, en trois lignes — pas un mur, pas des cartes. */
const POURQUOI = [
  {
    title: "Une phrase, pas un tableur",
    text: "Vous décrivez votre mariage en une phrase : tout le reste se déduit tout seul.",
  },
  {
    title: "Une seule page, pour vos invités",
    text: "Horaires, lieux, contacts : rien à installer, rien à apprendre.",
  },
  {
    title: "La preuve, pas la promesse",
    text: "Budget tenu, invités confirmés, documents signés.",
  },
] as const;

/** La vitrine : une preuve, trois lignes, un contact. Rien de plus. */
export function VitrineSections() {
  return (
    <>
      {/* ————— Pourquoi AIME : la différence, en une phrase ————— */}
      <Immersive
        id="pourquoi"
        testId="vitrine-pourquoi"
        image={AGENCY_VISUALS.portrait}
        alt="Mariés enlacés sous une lumière douce"
        eyebrow="Pourquoi AIME"
        title="Vous organisez moins. Vous décidez mieux."
      />

      <SitePanel testId="vitrine-pourquoi-lignes" className="py-16 md:py-20">
        <ol className="mx-auto max-w-2xl space-y-7">
          {POURQUOI.map((point, index) => (
            <li key={point.title} className="flex items-baseline gap-5">
              <span className="w-8 shrink-0 text-[11px] font-medium tracking-[0.3em] text-[var(--agency-index)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className={cn(TITLE, "text-xl md:text-2xl")}>{point.title}</h3>
                <p className={cn(BODY, "mt-2")}>{point.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </SitePanel>

      {/* ————— Appel final : un bouton, une adresse ————— */}
      <SitePanel
        id="contact"
        testId="vitrine-contact"
        eyebrow={`${brand} · ${role}`}
        title="Parlons de votre mariage."
        lead="Quelques dates par an, pas davantage. Écrivez-moi : je réponds personnellement, sous vingt-quatre heures."
        className="py-24 md:py-28"
      >
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a href={`mailto:${contactEmail}`} className={PILL_INK}>
            Prendre rendez-vous
          </a>
        </div>
      </SitePanel>
    </>
  );
}

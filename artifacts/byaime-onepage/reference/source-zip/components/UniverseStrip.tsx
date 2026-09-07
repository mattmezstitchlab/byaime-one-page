import { UniverseVideoGrid } from "@/components/aime/UniverseVideoGrid";

/**
 * La bande des mondes, précédée d'un court texte qui explique le concept.
 * Elle vit sous le hero de l'accueil et sous la ligne de temps d'un projet.
 */
export function UniverseStrip({
  eyebrow = "Les univers",
  title = "Douze mondes, une seule ligne de temps",
  text = "Tout ce qui existe peut devenir une carte : une personne, un lieu, un métier, un objet. Chaque monde rassemble celles et ceux qui font vivre un moment, et tout ce que vous en gardez se pose au même endroit — votre ligne de temps.",
}: {
  eyebrow?: string;
  title?: string;
  text?: string;
}) {
  return (
    <section id="univers" className="mt-14 sm:mt-20">
      <div className="mx-auto max-w-5xl px-5">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-[26px] leading-tight font-semibold tracking-[-0.02em] sm:text-[32px]">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">{text}</p>
      </div>
      <UniverseVideoGrid />
    </section>
  );
}

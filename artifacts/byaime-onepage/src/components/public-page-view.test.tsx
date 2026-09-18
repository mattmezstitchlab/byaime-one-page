import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { PublicPageView } from "./PublicPageView";
import { createInitialProject, parseIntention } from "@/lib/parser";
import { publicPageOf, withBlockVisibility } from "@/lib/public-page";

/*
 * La vue de la page publique (pont AIME-COMPOSER, tranche 1), rendue en
 * statique comme les autres écrans du dépôt : ce qui compte ici, c'est
 * que la projection affiche les sources résolues, jamais les blocs privés,
 * et que le mode édition révèle les liaisons.
 */

const project = () => createInitialProject(parseIntention("Mariage le 14 août 2027 à Lille"), "Mariage le 14 août 2027 à Lille");

const render = (element: React.ReactElement) => renderToStaticMarkup(
  <I18nProvider>{element}</I18nProvider>,
);

describe("PublicPageView", () => {
  it("affiche le nom du Monde lu en direct", () => {
    const world = project();
    const markup = render(<PublicPageView project={world} />);
    expect(markup).toContain(world.title);
  });

  it("affiche les Moments publics, jamais les moments privés ou d'équipe", () => {
    const world = project();
    const withMoments = {
      ...world,
      timeline: [
        { ...world.timeline[0], id: "m-public", title: "Cérémonie laïque", time: 300, visibility: "audience" as const },
        { ...world.timeline[0], id: "m-equipe", title: "Brief photographe", time: 200, visibility: "equipe" as const },
        { ...world.timeline[0], id: "m-prive", title: "Bise au témoin", time: 100, visibility: "prive" as const },
      ],
    };
    const markup = render(<PublicPageView project={withMoments} />);
    expect(markup).toContain("Cérémonie laïque");
    expect(markup).not.toContain("Brief photographe");
    expect(markup).not.toContain("Bise au témoin");
  });

  it("un bloc privé disparaît de la page servie", () => {
    const world = project();
    const gated = { ...world, publicPage: withBlockVisibility(publicPageOf(world), "pp-title", "prive") };
    const markup = render(<PublicPageView project={gated} />);
    expect(markup).not.toContain(world.title);
  });

  it("le mode édition révèle les liaisons et la visibilité de chaque bloc", () => {
    const world = project();
    const onToggleVisibility = vi.fn();
    const markup = render(<PublicPageView project={world} onToggleVisibility={onToggleVisibility} />);
    expect(markup).toContain("Chaque bloc lit sa source en direct");
    expect(markup).toContain("Le nom du Monde");
    expect(markup).toContain("Le visuel du Monde");
    expect(markup).toContain("Public");
    /* En édition, le bloc héros sans visuel est annoncé manquant —
       jamais masqué, jamais simulé. */
    expect(markup).toContain("Source introuvable");
  });

  it("sans mode édition, une source manquante est silencieusement écartée", () => {
    const world = project();
    const markup = render(<PublicPageView project={world} />);
    expect(markup).not.toContain("Source introuvable");
    expect(markup).not.toContain("<video");
  });
});

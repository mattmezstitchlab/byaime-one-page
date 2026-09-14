import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PillChoice, SiteFooter, SiteHeader, SiteHero, SitePanel, SITE_NAV } from "@/components/SiteChrome";
import * as DESIGN from "@/lib/site-design";

const here = dirname(fileURLToPath(import.meta.url));
const src = (path: string) => resolve(here, path);

/*
 * Ce que ces contrôles verrouillent.
 *
 * Le dessin des pages publiques était recopié à la main dans chaque fichier :
 * 48 hexadécimaux en dur dans l'accueil, des gris sous AA, des pills de trois
 * hauteurs. Le 14/09 la fondatrice a demandé d'étendre la direction artistique
 * de l'accueil à tout le site public — le faire en recopiant aurait multiplié
 * les écarts au lieu de les corriger. Le dessin vit donc ici, une fois, et ces
 * tests tiennent trois choses : aucune couleur en dur, les cibles et contrastes
 * mesurés, et des pages qui consomment l'ossature au lieu de la redessiner.
 */

describe("le vocabulaire visuel est écrit une fois", () => {
  it("ne recopie aucune couleur en dur", () => {
    const source = readFileSync(src("./site-design.ts"), "utf8");
    const forbidden = [
      "#171410", "#FFFFFF", "#E6E1D8", "#8A8375", "#6F6A61", "#4c463d", "#736C5E", "#7A7365",
      "text-black", "bg-white", "border-white",
    ];
    for (const token of forbidden) {
      expect(source, `couleur recopiée dans le dessin : ${token}`).not.toContain(token);
    }
    // Toute couleur passe par un jeton mesuré AA (plan §3.8).
    expect(source).toContain("var(--agency-eyebrow)");
    expect(source).toContain("var(--agency-ink)");
    expect(source).toContain("var(--agency-hairline)");
  });

  it("pose l'œil-de-bœuf sur le jeton mesuré à 5,20:1", () => {
    /*
     * Décision de la fondatrice du 14/09 : les petites capitales étaient à
     * 3,76:1 (#8A8375) ou 3,97:1 (foreground/0.55), sous le seuil AA de 4,5:1.
     * Elles prennent le jeton du lot 1.8, mesuré à 5,20:1 sur blanc.
     */
    expect(DESIGN.EYEBROW).toContain("var(--agency-eyebrow)");
    expect(DESIGN.EYEBROW).not.toContain("#8A8375");
    expect(DESIGN.EYEBROW).not.toContain("/0.55");
  });

  it("garde des cibles de 44 px pour les appels et 36 px pour les choix", () => {
    expect(DESIGN.PILL_CALL).toContain("min-h-11"); // 44 px, AA 2.5.5
    expect(DESIGN.PILL_SMALL).toContain("h-9"); // 36 px : une barre d'outils, pas un appel
    // Les deux gardent un anneau de focus visible.
    for (const pill of [DESIGN.PILL_CALL, DESIGN.PILL_SMALL]) {
      expect(pill).toContain("focus-visible:ring-2");
    }
  });

  it("réserve l'accent de la marque à l'action qui engage", () => {
    expect(DESIGN.PILL_ACCENT).toContain("aime-apple-pill-accent");
  });
});

describe("la barre et le pied de page publics", () => {
  it("nomment les pages publiques, sans dépendre d'une session", () => {
    const markup = renderToStaticMarkup(<SiteHeader current="/monde" />);
    expect(markup).toContain('data-testid="site-wordmark"');
    expect(markup).toContain('href="/agence"');
    expect(markup).toContain('href="/monde"');
    expect(markup).toContain('aria-current="page"');
    expect(SITE_NAV.map(item => item.path)).toEqual(["/agence", "/monde"]);

    /*
     * Une page publique doit rester entière quand l'authentification n'est pas
     * configurée (`lib/public-shell.ts`) : la barre ne lit aucun compte.
     */
    const source = readFileSync(src("../components/SiteChrome.tsx"), "utf8");
    for (const forbidden of ["useAuth", "SignedIn", "SignedOut", "useSession"]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it("portent l'identité réelle de l'agence et les trois textes légaux", () => {
    const markup = renderToStaticMarkup(<SiteFooter />);
    expect(markup).toContain("La cerise sur le gâteau");
    expect(markup).toContain("Wedding Architect");
    expect(markup).toContain("mailto:bonjour@byaime.fr");
    expect(markup).toContain('href="/mentions-legales"');
    expect(markup).toContain('href="/confidentialite"');
    expect(markup).toContain('href="/conditions"');
    expect(markup).toContain(`© ${new Date().getFullYear()}`);
  });

  it("préfixent les liens comme le reste du site", () => {
    /*
     * `sitePath()` existe pour que le site puisse être servi sous un
     * sous-répertoire ; un lien écrit à la main casserait ce mode.
     */
    const source = readFileSync(src("../components/SiteChrome.tsx"), "utf8");
    const hrefs = source.match(/href="\/[^"]*"/g) ?? [];
    expect(hrefs, `liens sans sitePath() : ${hrefs.join(" ")}`).toEqual([]);
  });
});

describe("les blocs de page", () => {
  it("posent l'œil-de-bœuf, le titre et l'amorce de l'accueil", () => {
    const markup = renderToStaticMarkup(
      <SiteHero eyebrow="Information" title="Un titre" lead="Une amorce." />,
    );
    expect(markup).toContain("Un titre");
    expect(markup).toContain("aime-apple-title");
    expect(markup).toContain("aime-apple-lead");
    expect(markup).toContain("tracking-[0.24em]");
  });

  it("parlent en sans : la serif reste au livrable d'un couple", () => {
    const markup =
      renderToStaticMarkup(<SiteHero title="Un titre" />) +
      renderToStaticMarkup(<SitePanel title="Un panneau">Contenu</SitePanel>) +
      renderToStaticMarkup(<SiteFooter />);
    expect(markup).not.toContain("agency-serif");
    // La règle est écrite là où on la cherche : le module du dessin.
    const source = readFileSync(src("./site-design.ts"), "utf8");
    expect(source).toContain("CoupleReport");
  });

  it("rendent un choix répété comme un groupe de pilules accessible", () => {
    const markup = renderToStaticMarkup(
      <PillChoice
        groupLabel="Période"
        testId="choix-periode"
        value="jour"
        options={[
          { id: "jour", label: "Jour" },
          { id: "mois", label: "Mois" },
        ]}
        onChange={() => {}}
      />,
    );
    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Période"');
    expect(markup).toContain('data-testid="choix-periode-jour"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-pressed="false"');
  });

  it("s'animent au défilement, et s'en dispensent si l'utilisateur le demande", () => {
    /*
     * Reveal part caché (`translate-y-5`) puis se pose à l'entrée dans le champ ;
     * au rendu serveur il est déjà visible, sinon la page pré-rendue du lot 2
     * arriverait invisible. Les deux états portent `motion-reduce:` : personne
     * n'est obligé de voir le mouvement.
     */
    const reveal = readFileSync(src("../components/Reveal.tsx"), "utf8");
    expect(reveal).toContain("translate-y-6");
    expect(reveal).toContain("motion-reduce:transition-none");
    // Sans IntersectionObserver — donc au rendu serveur — le contenu est visible.
    expect(reveal).toContain('typeof IntersectionObserver === "undefined"');
    // Un panneau sans titre reste un panneau : le filet et le blanc sont là.
    const markup = renderToStaticMarkup(<SitePanel>Contenu</SitePanel>);
    expect(markup).toContain("border-[var(--agency-hairline)]");
    expect(markup).toContain("bg-[var(--agency-paper)]");
  });
});

describe("les pages publiques consomment l'ossature", () => {
  const pages: Array<[string, string]> = [
    ["la vitrine", "../pages/AgencyLanding.tsx"],
    ["les mentions légales", "../pages/Mentions.tsx"],
    ["la confidentialité et les conditions", "../pages/Legal.tsx"],
    ["le bilan partagé", "../pages/BilanPage.tsx"],
    ["la réponse d'un invité", "../App.tsx"],
    ["la Bande", "../pages/Bande.tsx"],
  ];

  it.each(pages)("%s assemble les blocs partagés au lieu de les redessiner", (_label, path) => {
    const full = src(path);
    expect(existsSync(full), `introuvable : ${path}`).toBe(true);
    const source = readFileSync(full, "utf8");
    expect(source, `${path} n'utilise pas l'ossature publique`).toContain("@/components/SiteChrome");
  });
});

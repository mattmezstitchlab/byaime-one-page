import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";

import { BANDE_META, BANDE_PATH, BandePage } from "./Bande";

/*
 * La Bande est un prototype, mais ses promesses sont contrôlées comme le reste :
 *
 *  - elle s'ouvre sur la forme du mariage, pas sur un formulaire ;
 *  - elle ne dépend ni de session, ni de réseau — le rendu ci-dessous réussit
 *    sans `ClerkProvider`, ce qui est la preuve, pas seulement l'intention ;
 *  - rien n'est écrit sans un second geste ;
 *  - les états sont écrits en toutes lettres, la couleur ne porte rien seule.
 *
 * Le rendu est statique (`renderToStaticMarkup`) comme partout dans ce dépôt :
 * les gestes eux-mêmes sont contrôlés côté moteur, dans `lib/bande.test.ts`.
 */

const source = readFileSync(fileURLToPath(new URL("./Bande.tsx", import.meta.url)), "utf8");

/* Routeur mémoire, comme dans `landing.test.tsx` : `wouter` lit `location`,
   qui n'existe pas dans l'environnement de test. */
function render() {
  return renderToStaticMarkup(
    <Router hook={() => ["/monde", () => {}] as const}>
      <BandePage />
    </Router>,
  );
}

describe("la Bande : un écran, trois échelles", () => {
  it("s'ouvre sur les mois, avec ses chapitres et ses Moments", () => {
    const html = render();
    expect(html).toContain('data-testid="bande-page"');
    expect(html).toContain('data-testid="bande-title"');
    expect(html).toMatch(/data-testid="bande-title"[^>]*>Les mois</);
    expect(html).toContain('data-testid="bande-chapter-0"');
    // `renderToStaticMarkup` échappe l'esperluette et l'apostrophe ASCII.
    expect(html).toContain("Idée &amp; La Vision");
    expect(html).toContain('data-testid="bande-moment-dj3"');
  });

  it("tient l'état du mariage en cinq nombres", () => {
    const html = render();
    for (const id of ["jours", "argent", "a-payer", "invites", "prestataires"]) {
      expect(html, `figure ${id} absente`).toContain(`data-testid="bande-regie-${id}"`);
    }
    expect(html).toContain("Jours restants");
    expect(html).toContain("Invités confirmés");
    expect(html).toContain("3 / 120");
  });

  it("propose les trois échelles et les quatre rôles, sans navigation", () => {
    const html = render();
    for (const id of ["mois", "engagements", "minutes"]) {
      expect(html).toContain(`data-testid="bande-resolution-${id}"`);
    }
    for (const id of ["owner", "planner", "family", "viewer"]) {
      expect(html).toContain(`data-testid="bande-role-${id}"`);
    }
    // Aucun lien vers un panneau ou une route privée : l'écran se suffit.
    expect(html).not.toContain('href="/user-portal"');
    expect(html).not.toContain('href="/admin"');
  });

  it("permet de voyager dans le temps pour voir les trois échelles", () => {
    const html = render();
    for (const id of ["maintenant", "dernier-mois", "veille", "ceremonie", "soiree"]) {
      expect(html).toContain(`data-testid="bande-now-${id}"`);
    }
    expect(html).toContain("échelle imposée par la date");
  });

  it("fait de la phrase le seul point d'entrée, et montre ce qu'elle a compris", () => {
    const html = render();
    expect(html).toContain('data-testid="bande-phrase"');
    expect(html).toContain('data-testid="bande-phrase-submit"');
    expect(html).toContain("Décrivez votre mariage en une phrase");
    expect(html).toContain("Ce qu&#x27;AIME a compris");
    for (const id of ["pivot", "city", "venue", "guestsCount", "budget"]) {
      expect(html, `fait ${id} absent`).toContain(`data-testid="bande-fact-${id}"`);
    }
    // Ce qui n'a pas été dit reste dit comme manquant, jamais inventé.
    expect(html).toContain("Manquant");
  });
});

describe("la Bande : aucune dépendance à l'authentification", () => {
  it("se rend sans ClerkProvider, sans store et sans réseau", () => {
    // Le rendu ci-dessus réussit hors de tout fournisseur : c'est la preuve.
    expect(render().length).toBeGreaterThan(20000);
    for (const forbidden of ["@clerk", "@/store/project-store", "useAuth", "useProject", "fetch(", "axios"]) {
      expect(source.includes(forbidden), `Bande.tsx importe encore ${forbidden}`).toBe(false);
    }
  });

  it("est annoncée comme page publique, y compris en mode dégradé", () => {
    expect(BANDE_PATH).toBe("/monde");
    const shell = readFileSync(fileURLToPath(new URL("../lib/public-shell.ts", import.meta.url)), "utf8");
    expect(shell).toContain('if (clean === "/monde") return { kind: "bande" };');
  });
});

describe("la Bande : rien n'est écrit sans un second geste", () => {
  it("n'affiche aucun plan de propagation au premier rendu", () => {
    const html = render();
    expect(html).not.toContain('data-testid="bande-plan"');
    expect(html).not.toContain('data-testid="bande-atelier"');
  });

  it("montre la conséquence avant d'appliquer", () => {
    expect(source).toContain("previewShift(project, selected.id, minutes)");
    expect(source).toContain("commitShift(project, plan.plan, plan.selected)");
    expect(source).toContain("Rien n'est écrit tant que vous n'avez pas appliqué");
    // L'aperçu est annoncé aux lecteurs d'écran, pas seulement affiché.
    expect(source).toContain('aria-live="polite"');
  });
});

describe("la Bande : lisibilité", () => {
  it("écrit les états en toutes lettres, la couleur ne porte rien seule", () => {
    for (const word of ["Terminé", "En cours", "En retard", "Ensuite", "À venir"]) {
      expect(source, `état « ${word} » non écrit`).toContain(word);
    }
    // Les pastilles de catégorie sont décoratives.
    expect(source).toContain('aria-hidden="true"');
  });

  it("dit ce qu'elle est et ce qu'elle n'est pas", () => {
    const html = render();
    expect(html).toContain("Prototype du lot 8");
    expect(html).toContain("aucune donnée n&#x27;est envoyée");
    expect(html).toContain("aucune connexion n&#x27;est demandée");
    expect(html).toContain("Le plan de table");
  });

  it("reste hors de l'index tant que c'est un prototype", () => {
    expect(BANDE_META.robots).toBe("noindex, nofollow");
    expect(BANDE_META.title.length).toBeLessThanOrEqual(60);
    expect(BANDE_META.description.length).toBeLessThanOrEqual(165);
  });
});

/*
 * La demande de la fondatrice (14/09) : « ce serait mieux dans le design du
 * site — la page d'accueil, ce serait bien tout le site comme ça ». Ce volet
 * verrouille la reprise de cette direction artistique, et l'écart assumé : les
 * classes de texte de l'accueil posées à `foreground / 0.55` (~3,9:1 sur blanc)
 * sont sous AA, donc la typographie est reprise mais pas ce contraste-là.
 */
describe("la Bande : la direction artistique de l'accueil", () => {
  it("ouvre sur un hero pleine hauteur, œil-de-bœuf, grand titre et amorce", () => {
    const html = render();
    expect(html).toContain('data-testid="bande-hero"');
    expect(html).toContain("min-h-[100dvh]");
    expect(html).toContain("aime-apple-title");
    expect(html).toContain("aime-apple-lead");
    expect(html).toContain("tracking-[0.24em]");
    expect(html).toContain("text-5xl");
    expect(html).toContain("md:text-7xl");
  });

  it("met la phrase dans la carte sombre arrondie de l'accueil", () => {
    const html = render();
    expect(html).toContain('data-testid="bande-composer"');
    expect(html).toContain("rounded-[2rem]");
    expect(html).toContain("bg-[var(--agency-ink)]");
  });

  it("reprend la barre fine, les panneaux bordés et les boutons-pilules", () => {
    const html = render();
    expect(html).toContain("h-12");
    expect(html).toContain("backdrop-blur-xl");
    expect(html).toContain("tracking-[.28em]");
    expect(html).toContain("border-t border-[var(--agency-hairline)]");
    expect(html).toContain("rounded-3xl border");
    expect(html).toContain("aime-apple-pill");
  });

  it("révèle au défilement, mais reste lisible sans JavaScript", () => {
    // `Reveal` rend son contenu visible côté serveur : pas de page blanche au
    // pré-rendu, et rien ne dépend de l'IntersectionObserver pour être lu.
    const html = render();
    expect(html).toContain("opacity-100 translate-y-0");
    expect(html).not.toContain("opacity-0 translate-y-6");
    expect(html).toContain("motion-reduce:transition-none");
  });

  it("reprend la typographie de l'accueil, pas ses contrastes sous AA", () => {
    // `aime-apple-eyebrow` et `aime-apple-confiance` posent du petit texte à
    // foreground/0.55, soit ~3,9:1 sur blanc : sous AA. La Bande reprend le
    // dessin (capitales, espacement) avec un jeton mesuré à 5,20:1.
    expect(source).not.toContain("aime-apple-eyebrow");
    expect(source).not.toContain("aime-apple-confiance");
    expect(source).toContain("var(--agency-eyebrow)");
  });

  it("ne monte pas le fond animé : il est invisible derrière les panneaux", () => {
    // Sur l'accueil, le dégradé maillé est recouvert par des panneaux opaques
    // (hero blanc, sections `bg-background`) : il coûte un contexte WebGL pour
    // rien. La Bande ne le reprend pas tant que ce n'est pas tranché.
    expect(source).not.toContain("ShaderBackdrop");
  });
});

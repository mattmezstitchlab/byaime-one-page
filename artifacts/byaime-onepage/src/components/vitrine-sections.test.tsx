import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VitrineSections } from "./VitrineSections";

/*
 * La vitrine, réduite à l'essentiel : une seule preuve — « une phrase → un
 * plan → un contact ». Après la démonstration de la Bande, elle ne doit plus
 * rien empiler : une section immersive, trois lignes, un contact.
 *
 * React échappe les apostrophes en `&#x27;` et les esperluettes en `&amp;`
 * dans le HTML statique. On relit donc le rendu comme le navigateur
 * l'affiche : les assertions portent sur le texte visible, jamais sur
 * l'encodage interne du balisage.
 */
const decodeHtml = (html: string) => html.replace(/&#x27;/g, "'").replace(/&amp;/g, "&");

const render = () => decodeHtml(renderToStaticMarkup(<VitrineSections />));

describe("la vitrine : une seule preuve", () => {
  it("pose la différence en blanc sur un visuel pleine largeur", () => {
    const html = render();
    expect(html).toContain('data-testid="vitrine-pourquoi"');
    expect(html).toContain("Pourquoi AIME");
    expect(html).toContain("Vous organisez moins. Vous décidez mieux.");
    // Titre blanc sur le jeton du papier, voile d'encre mesuré.
    expect(html).toContain("aime-apple-title");
    expect(html).toContain("text-[var(--agency-paper)]");
    expect(html).toContain("bg-[var(--agency-ink)]/60");
    // Le visuel vient du manifeste, versionné.
    expect(html).toContain("images/wedding/wedding-portrait.jpg?v=");
  });

  it("raconte la différence en trois lignes, sans jargon", () => {
    const html = render();
    for (const line of [
      "Une phrase, pas un tableur",
      "Une seule page, pour vos invités",
      "La preuve, pas la promesse",
    ]) {
      expect(html, `différence « ${line} » absente`).toContain(line);
    }
    // Le vocabulaire produit reste absent : on parle au futur marié.
    for (const forbidden of ["timeline", "panneau", "logiciel"]) {
      expect(html, `${forbidden} encore présent`).not.toContain(forbidden);
    }
  });

  it("termine sur un seul contact, sans couleur en dur", () => {
    const html = render();
    expect(html).toContain('data-testid="vitrine-contact"');
    expect(html).toContain("Parlons de votre mariage.");
    expect(html).toContain("Prendre rendez-vous");
    expect(html).toContain("bonjour@byaime.fr");
    for (const hex of ["#FFFFFF", "#171410", "#8A8375", "#B4AC9C", "#6F6A61"]) {
      expect(html.includes(hex), `${hex} encore présent en dur`).toBe(false);
    }
  });
});

describe("la vitrine : ce qui n'y est plus", () => {
  it("n'empile plus accordéon, grille de métiers ni questions", () => {
    const html = render();
    // La démonstration est la preuve : ces morceaux interactifs ont été retirés.
    expect(html).not.toContain("vitrine-method");
    expect(html).not.toContain("vitrine-metiers");
    expect(html).not.toContain("vitrine-faq");
    expect(html).not.toContain("vitrine-dossiers");
    expect(html).not.toContain("vitrine-spaces");
    // Plus aucun lien sortant vers la recherche dispoo.
    expect(html).not.toContain("dispoo.app/recherche");
  });
});

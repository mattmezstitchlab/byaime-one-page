import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * L'identité visuelle de la vitrine est mesurée, pas déclarée.
 *
 * Constat du plan (§2.7) : deux gris de la vitrine étaient sous le seuil AA sur
 * le blanc — `#B4AC9C` à 2,25:1 (les numéros d'étape et de prestation, 11 px) et
 * `#8A8375` à 3,76:1 (les eyebrows, 11 px majuscules). Ce test recalcule le
 * contraste de chaque jeton `--agency-*` à partir de `index.css`, et vérifie que
 * les pages de l'agence consomment bien ces jetons au lieu de recopier des
 * hexadécimaux — le défaut qui avait produit la divergence en premier lieu.
 *
 * Même patron que `visibility-graph.test.tsx` : la feuille de style est lue
 * comme source de vérité, pas l'intention d'un composant.
 */

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const css = read("../index.css");

/** Les jetons de l'agence, tels que déclarés dans `index.css`. */
function agencyTokens(): Record<string, string> {
  const block = /:root \{\s*(--agency-[\s\S]*?)\}/.exec(css);
  if (!block) throw new Error("Bloc :root des jetons --agency-* introuvable dans index.css");
  const tokens: Record<string, string> = {};
  for (const line of block[1].split(";")) {
    const match = /(--agency-[a-z]+)\s*:\s*(.+?)\s*$/.exec(line.trim());
    if (match) tokens[match[1]] = match[2];
  }
  return tokens;
}

const tokens = agencyTokens();

/** Luminance relative WCAG 2.1 d'un #RRGGBB. */
function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map(offset => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = channels.map(channel =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/** Les pages qui portent l'identité de l'agence : vitrine et livrables. */
const AGENCY_PAGES = [
  "../pages/Landing.tsx",
  "../pages/AgencyLanding.tsx",
  "../pages/BilanPage.tsx",
  "../pages/AdminSommaire.tsx",
  "../pages/Mentions.tsx",
  "../pages/Legal.tsx",
  "../pages/Bande.tsx",
  "../components/CoupleReport.tsx",
  // Le dessin partagé est lui-même contrôlé : c'est de là que les pages le tiennent.
  "../components/SiteChrome.tsx",
  "../lib/site-design.ts",
] as const;

describe("identité de l'agence — jetons", () => {
  it("définit le jeu complet de jetons dans index.css", () => {
    for (const token of [
      "--agency-paper",
      "--agency-ink",
      "--agency-body",
      "--agency-eyebrow",
      "--agency-index",
      "--agency-hairline",
      "--agency-serif",
    ]) {
      expect(tokens[token], `${token} manquant dans index.css`).toBeTruthy();
    }
  });

  it("pose le papier au blanc pur et l'encre au charbon", () => {
    expect(tokens["--agency-paper"].toUpperCase()).toBe("#FFFFFF");
    expect(tokens["--agency-ink"].toUpperCase()).toBe("#171410");
  });

  it("garantit AA (4,5:1) pour chaque gris de texte sur le papier", () => {
    const paper = tokens["--agency-paper"];
    for (const token of ["--agency-ink", "--agency-body", "--agency-eyebrow", "--agency-index"]) {
      const ratio = contrastRatio(tokens[token], paper);
      // Les deux valeurs d'origine étaient 2,25:1 (#B4AC9C) et 3,76:1 (#8A8375).
      expect(ratio, `${token} = ${tokens[token]} → ${ratio.toFixed(2)}:1, sous AA`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("définit une seule serif de titrage, exposée comme classe", () => {
    expect(tokens["--agency-serif"]).toContain("serif");
    expect(css).toMatch(/\.agency-serif \{ font-family: var\(--agency-serif\); \}/);
  });
});

describe("identité de l'agence — consommation", () => {
  const sources = AGENCY_PAGES.map(page => ({ page, source: read(page) }));

  it("n'écrit plus aucune couleur de la vitrine en dur", () => {
    const forbidden = ["#8A8375", "#B4AC9C", "#6F6A61", "#171410", "#E6E1D8", "#FFFFFF", "#4c463d"];
    for (const { page, source } of sources) {
      for (const hex of forbidden) {
        expect(source.includes(hex), `${page} contient encore ${hex} en dur`).toBe(false);
      }
    }
  });

  it("passe par les jetons et par la classe de titrage", () => {
    for (const { page, source } of sources) {
      expect(source, `${page} n'utilise aucun jeton --agency-*`).toContain("var(--agency-");
      // Plus aucune pile de serifs recopiée fichier par fichier.
      expect(source.includes("'Didot'"), `${page} recopie encore la pile de serifs`).toBe(false);
      expect(source.includes("style={serif}"), `${page} titre encore par style inline`).toBe(false);
    }
  });
});

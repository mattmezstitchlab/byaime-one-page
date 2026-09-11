import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AIME_VISUALS, AIME_VISUAL_PATHS, getAssetUrl } from "./assets";

const publicDir = new URL("../../public/", import.meta.url);

/*
 * Le manifeste est le seul endroit où les visuels sont nommés. Ces deux contrôles
 * empêchent un emplacement d'annoncer une image absente (écran noir) ou de repartir
 * chercher une photo hors du site.
 */
describe("manifeste des visuels du Monde Mariage", () => {
  it("ne pointe que sur des photos du dossier mariage", () => {
    expect(AIME_VISUAL_PATHS.length).toBeGreaterThan(0);
    for (const path of AIME_VISUAL_PATHS) {
      expect(path.startsWith("images/wedding/"), path).toBe(true);
      expect(/https?:|localhost|\.\.\//.test(path), `visuel externe : ${path}`).toBe(false);
    }
  });

  it("chaque visuel annoncé existe sur le disque, en JPEG compressé", () => {
    for (const path of AIME_VISUAL_PATHS) {
      const file = new URL(path, publicDir);
      expect(existsSync(file), `${path} introuvable`).toBe(true);
      const stat = statSync(file);
      expect(stat.size, `${path} vide`).toBeGreaterThan(20_000);
      expect(stat.size, `${path} trop lourd`).toBeLessThan(420_000);
    }
  });

  it("préfixe les chemins par la base déployée", () => {
    const [path] = AIME_VISUAL_PATHS;
    expect(getAssetUrl(path)).toContain("images/wedding/");
    expect(getAssetUrl(`/${path}`)).toBe(getAssetUrl(path));
  });

  it("couvre tous les usages annoncés par l'interface", () => {
    expect(Object.keys(AIME_VISUALS.universes)).toHaveLength(12);
    expect(AIME_VISUALS.timelineAmbientImages.length).toBeGreaterThanOrEqual(8);
    expect(AIME_VISUALS.guestPortraitImages.length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(AIME_VISUALS.providersByCategory).sort()).toEqual([
      "beaute", "fleuriste", "lieu", "musique", "photo", "tenue", "traiteur", "transport", "video",
    ]);
    // Pas de vidéo d'arrière-plan : le hero reste léger et lisible.
    expect(AIME_VISUALS.hero.backgroundVideo).toBeNull();
  });
});

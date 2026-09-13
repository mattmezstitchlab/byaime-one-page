/*
 * Apparence : l'app est blanche (décision du 2026-09-13, `index.css`).
 *
 * Ce module ne sert plus qu'à poser le thème clair au démarrage de la coque
 * privée — y compris pour un visiteur dont le `localStorage` contient encore
 * « dark » d'une version antérieure, valeur qui appliquait `color-scheme: dark`
 * (contrôles natifs et barre de défilement sombres) sur des pages 100 % blanches.
 *
 * La bascule sombre/clair a disparu de l'interface : le bouton du CommandBar a
 * été retiré et `components/AppearanceToggle.tsx` supprimé (0 import). Les blocs
 * `:root[data-aime-theme="light"|"dark"]` restent dans `index.css` : ils portent
 * les jetons de catégorie du graphe et sont verrouillés par
 * `visibility-graph.test.tsx`.
 */

export type AimeAppearance = "light";

const STORAGE_KEY = "aime-appearance";

/** Pose le thème clair, et normalise la valeur héritée d'une version antérieure. */
export function initAppearance(): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.aimeTheme = "light";
  }
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "light");
  } catch {
    // Un stockage indisponible (mode privé, quota) ne doit rien casser : le
    // thème clair est de toute façon posé sur le document et dans index.html.
  }
}

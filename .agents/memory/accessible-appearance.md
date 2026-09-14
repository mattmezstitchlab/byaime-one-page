---
name: Apparence inclusive
description: Règle produit pour une apparence lisible par tous — un thème blanc unique depuis le 13/09/2026, contrastes mesurés AA.
---

AIME est en **thème clair unique** : blanc pur, encre charbon, un seul accent. La bascule
Sombre/Clair a été retirée de l'interface le 13/09/2026 (bouton du `CommandBar` supprimé,
`components/AppearanceToggle.tsx` supprimé, `lib/appearance.ts` réduit à `initAppearance()`
qui pose le clair et normalise un `localStorage` hérité). L'exigence d'accessibilité qui
portait cette règle demeure, elle change de moyen.

**Why:** Le rendu cinématique sombre n'était pas confortable pour tout le monde, et les accents
clairs (rose, émeraude) y devenaient illisibles dès qu'on basculait en clair — les mesures
relevaient 1,40:1 et 1,74:1. Un seul thème supprime la divergence, pas l'exigence : ce qui
compte est que chacun puisse lire, pas de choisir sa décoration.

**How to apply:**
- Écrire les couleurs en **jetons** (`--agency-*` pour la vitrine et ses livrables, `--cat-*` pour
  les catégories du Monde), jamais en hexadécimaux recopiés par fichier : c'est la recopie qui
  avait produit des gris à 2,25:1 et 3,76:1.
- **Mesurer** le contraste du texte courant : ≥ 4,5:1 (AA) sur le fond réel. `agency-theme.test.ts`
  recalcule les jetons de la vitrine à chaque contrôle ; faire de même pour toute nouvelle famille.
- Garder `prefers-reduced-motion` honoré, la hiérarchie et l'information identiques partout, et
  `color-scheme` cohérent avec le thème posé avant la première peinture (`index.html`).
- Les blocs `:root[data-aime-theme="light"|"dark"]` restent dans `index.css` : ils portent les
  jetons de catégorie et sont verrouillés par `visibility-graph.test.tsx`. Ne pas les supprimer ;
  ne pas réintroduire de bascule dans l'UI sans décision explicite.

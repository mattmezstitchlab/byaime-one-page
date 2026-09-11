# Mode « Facile » — analyse de faisabilité

Date : 11 septembre 2026. Périmètre : `artifacts/byaime-onepage` (espace privé).

## 1. Constat : où vit la complexité « Pro » aujourd'hui

Inventaire de l'espace privé actuel (route `/user-portal`, composant `ProjectStage`) :

| Surface | Volume actuel |
|---|---|
| Panneaux (`WeddingPanelId`) | **18** : planning, guests, providers, dayof, sections + 13 modules (seating, budget, documents, ceremony, music, logistics, messages, team, memories, contributions, thanks, film, honeymoon) |
| Entrées du rail gauche | **8** : timeline, people, providers, tasks, finances, documents, team, music |
| Vues de la Timeline (`TimelineView`) | **10** : chronological, public-info, map, day-of, person, provider, music, logistics, collaborative, memories |
| Phases | **3** : avant / pendant / après, chacune avec sa navigation propre |
| Rôles (`WeddingCapabilities`) | **4** : owner, planner, family, viewer |
| Actions de création (`UniversalCreateActionId`) | **7** : person, place, moment, task, document-media, resource, relation |
| Hero du Monde | compte à rebours multi-cibles, calendrier pivot, anneau de complétion, suggestions, live Jour J, stats Après |
| Réglages (`PortalControls`) | ~1300 lignes : fichiers privés, liens RSVP, exports CSV, audit du graphe, sauvegardes… |

Un couple qui ouvre son espace découvre donc d'emblée un cockpit de wedding
planner. C'est assumé côté produit (« mode Professionnel poussé »), mais cela
justifie un mode d'accès simplifié.

## 2. Verdict : oui, c'est faisable — et à coût maîtrisé

Trois propriétés de l'architecture rendent l'opération simple :

1. **La navigation est un modèle de données, pas du JSX figé.**
   `getWeddingRailItems(phase, capabilities, locale)` et
   `getWeddingNavigation(phase, capabilities, locale)` construisent déjà les
   menus en filtrant par rôle via `isWeddingEntryAllowed`. Ajouter un mode
   d'affichage revient à ajouter **un prédicat de plus**, pas à réécrire des
   écrans.
2. **Les rôles prouvent que le filtrage existe déjà.** Un `viewer` voit
   aujourd'hui un sous-ensemble (timeline, people, music, memories…) : le
   mécanisme « même données, moins de surface » est déjà en production.
3. **Le mode d'apparence montre le patron de persistance.** `aime-appearance`
   (sombre/clair) est stocké en `localStorage`, appliqué via un attribut
   `data-*` sur `<html>`, et basculable depuis le rail. Un `aime-mode`
   (facile/pro) suivrait exactement le même chemin.

Règle d'or de la proposition : **le mode Facile est une lentille, pas un
fork.** Mêmes données (`WorldProject`), mêmes panneaux, mêmes API. On filtre
ce qui est visible, on ne duplique aucun composant métier. Bascule sans perte,
dans les deux sens, à tout moment.

## 3. Périmètre proposé pour l'« Essentiel »

Six essentiels couvrent 95 % du parcours d'un couple :

| Essentiel | Réutilise (existant) |
|---|---|
| 1. Date & lieu | hero + panneau `planning` (filtré) |
| 2. Invités & RSVP | panneau `guests` + liens RSVP |
| 3. Budget simple | panneau `budget` (vue résumée) |
| 4. Prestataires | panneau `providers` |
| 5. Jour J (déroulé) | panneau `dayof` + vue `day-of` |
| 6. Souvenirs | panneau `memories` |

Sont masqués en Facile (mais conservés en Pro) : seating, ceremony,
logistics, messages, team, contributions, thanks, film, honeymoon, documents
avancés, vues `map` / `collaborative` / `logistics` / `provider` / `person`,
graphe de visibilité, recherche globale, audit de la Timeline, exports CSV,
réglages avancés. La Timeline reste visible, en vue `chronological` unique.

## 4. Ce que je ferais concrètement

### Phase 1 — La lentille Facile (socle, sans nouveau composant métier)

- Nouveau réglage `aime-mode: "facile" | "pro"` persisté en `localStorage`,
  exposé par un mini-store (même patron que `useI18n` / apparence).
- Les fabriques de navigation acceptent `mode` et filtrent :
  `getWeddingRailItems(phase, capabilities, locale, mode)`,
  `getWeddingNavigation(...)`, `isWeddingEntryAllowed(...)`,
  `getWeddingPanelLabel` inchangé.
- `BottomDock` / `sections` n'énumèrent que les panneaux autorisés ; toute
  tentative d'ouverture d'un panneau Pro en Facile rebascule vers l'accueil
  du Monde (même garde que `openPanelSafely` + `isWeddingPanelAvailable`).
- Hero simplifié en Facile : titre, date/lieu, **« prochaine étape » unique**,
  bouton Jour J. Le compte à rebours multi-cibles et l'anneau de complétion
  restent Pro.
- `GlobalCreateCenter` réduit à 4 actions : person, moment, task,
  document-media.
- Bascule visible : interrupteur « Facile / Pro » dans le rail (à côté de
  l'apparence) + choix proposé à la fin de l'onboarding (`LandingComposer` /
  `PortalOnboarding`), mémorisé.
- Garde-fous : rôles `family` / `viewer` toujours filtrés au minimum de leur
  rôle ET du mode ; les `data-testid` existants restent stables pour les e2e.

### Phase 2 — Le parcours guidé (la vraie valeur « Facile »)

- Nouveau composant `NextSteps` (« Vos 3 prochaines étapes ») dérivé des
  données existantes : tâches non terminées triées par échéance + jalons
  manquants (`project.missing`) + RSVP en attente. Zéro nouveau modèle.
- L'`AimeGuide` (déjà contextuel via `setAimeScreenContext`) adapte ses
  réponses : en Facile, il explique le vocabulaire (RSVP, seating…) et propose
  l'étape suivante au lieu de décrire les panneaux masqués.
- Checklist de mise en route en 5 cases (date, lieu, invités, budget,
  prestataire n° 1), cochée automatiquement depuis les données.

### Phase 3 — Vues simplifiées (optionnel, plus tard)

- Si le panneau `budget` reste trop riche, lui ajouter une prop
  `variant="simple"` (total + enveloppes) plutôt qu'un second composant.
  Même principe pour `guests` (compteurs + RSVP d'abord, colonnes ensuite).
- Ne faire cette phase que sur mesure d'usage : la Phase 1 couvre déjà
  l'essentiel du besoin.

## 5. Effort estimé (ordres de grandeur)

| Phase | Contenu | Effort relatif |
|---|---|---|
| Phase 1 | store `aime-mode`, filtres de navigation, hero conditionnel, create center filtré, toggle + onboarding, i18n (~30 clés), tests unitaires | **S — quelques jours**, risque faible |
| Phase 2 | `NextSteps`, checklist, adaptation `AimeGuide` | **M — ~1 semaine**, risque faible |
| Phase 3 | variantes simplifiées de 1–2 panneaux | **M — au besoin**, après retours |

Aucune migration de données, aucun changement d'API, aucune régression
possible sur le mode Pro si les filtres sont additifs et testés
(`wedding-navigation.test.ts` existe déjà et couvre le patron à suivre).

## 6. Points d'attention et risques

- **Ne jamais forker les composants** : un `if (mode === "facile")` qui
  duplique un panneau est une dette ; préférer filtrer les entrées de
  navigation et conditionner des blocs.
- **Rôles × mode** : la matrice croisée doit rester lisible —
  `permissions(mode, role) = min(mode, role)`. Les tests doivent couvrir les
  8 combinaisons.
- **e2e** : les scénarios existants tournent en mode Pro par défaut ; ajouter
  un scénario Facile plutôt que convertir.
- **i18n** : chaque libellé du mode (toggle, étapes, checklist) en FR + EN dès
  le départ, comme le reste du dictionnaire.
- **Découverte** : prévoir un lien « Passer en Pro » visible depuis Facile
  (et inversement), sinon les utilisateurs croiront à des fonctions
  manquantes.

## 7. Questions ouvertes pour trancher avant de coder

1. **Défaut pour les nouveaux couples** : Facile par défaut, avec proposition
   du Pro à l'onboarding ? (recommandé)
2. **Défaut par persona** : l'onboarding distingue déjà couple / pro —
   faut-il mapper pro → Pro et couple → Facile automatiquement ?
3. Les rôles `family` / `viewer` doivent-ils être **verrouillés** en Facile,
   ou peuvent-ils activer le Pro ?
4. Faut-il une **checklist éditoriale fixe** (les « 5 cases » ci-dessus) ou
   entièrement dérivée des données ?
5. Le hero Facile garde-t-il le compte à rebours Jour J ? (recommandé : oui,
   version à une seule cible)

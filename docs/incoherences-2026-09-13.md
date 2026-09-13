# Incohérences relevées — 13 septembre 2026

> Périmètre : `artifacts/byaime-onepage` (front AIME), sur la branche `arena/01a09aa5-byaime-one-page`.
> Méthode : lecture du code + vérifications exécutées (`vitest`, `tsc`, `vite build`, `preview/smoke.mjs`,
> scripts d'audit ponctuels sur le dictionnaire i18n et les classes de couleur). Chaque constat cite le
> fichier et la ligne vérifiés.

## 0. Ce qui a été exécuté

| Contrôle | Résultat |
| --- | --- |
| `pnpm -r --filter ./artifacts/** test` (41 fichiers avant / 43 après) | **222 tests OK avant → 229 OK après** |
| `pnpm run typecheck` (libs, e2e, 4 paquets) | OK, aucune erreur |
| `vite build` (front) | OK, `--cat-*` présents dans le CSS de prod (2 jeux : sombre et clair) |
| `node preview/smoke.mjs` | **23 problèmes — identiques avant et après** cette passe (script périmé, voir §5) |

Les deux demandes de cette session sont traitées au §6.

---

## 1. Contradictions fonctionnelles (l'app contredit ce qu'elle annonce)

### 1.1 Trois définitions du même rôle, et deux politiques de droits opposées

Le quadruplet `owner | planner | family | viewer` est redéclaré trois fois, sans source unique :

- `src/lib/collaboration-roles.ts:1` → `CollaborationRole`
- `src/lib/timeline-graph.ts:246` → `RoleVisibility`
- `src/lib/wedding-navigation.ts:30` → `WeddingRole`

Et les droits annoncés ne sont pas ceux qui sont appliqués :

| Source | Ce que le Planificateur obtient |
| --- | --- |
| `collaboration-roles.ts:17` | `projection: "shared-without-finances"` |
| `collaboration-roles.ts:48` — texte d'invitation réellement affiché (`PortalControls.tsx:1160`) | « finances, publication et suppression **restent réservées au propriétaire** » |
| `timeline-graph.ts:270` | `payment` / `document` visibles si `role === "owner" || role === "planner"` → **le planificateur voit les finances** |
| `wedding-navigation.ts:42-43` | `seeFinances: true`, `managePrivateDocuments: true` → l'entrée « Finances » lui est ouverte |

Conséquence visible : le Graphe de visibilité et la barre du Monde donnent les finances au Planificateur,
alors que l'écran d'invitation promet l'inverse. À trancher dans un sens, puis à écrire une seule fois.

### 1.2 `COLLABORATION_ROLE_POLICY` est du code mort

`grep` : la constante n'est référencée que par `collaboration-roles.ts:4` (définition) et
`collaboration-roles.test.ts`. Seul `InvitationRole` / `INVITATION_ROLE_OPTIONS` sont consommés
(`PortalControls.tsx:32-33`). Le test vert donne donc l'illusion d'une politique appliquée.

### 1.3 Le rôle Invité : la navigation masque ce que le graphe affiche

- `wedding-navigation.ts:112-120` (`isWeddingEntryAllowed`, liste blanche ligne 119) : pour un invité, seules les entrées
  `timeline, people, public-info, music, contributions, thanks, memories, film, honeymoon` subsistent —
  **ni Prestataires, ni Tâches**.
- `timeline-graph.ts:270-272` (`roleCanSeeEntityKind`) : `provider` et `task` retombent sur `return true` ;
  un prestataire relié à un Moment public est donc rendu **visible** dans le graphe pour un invité.
- `collaboration-roles.ts:58` annonce pourtant « sans finances, documents, **prestataires ni tâches** ».

Trois réponses différentes à la même question.

---

## 2. Bilinguisme FR/EN à moitié fait

Le dictionnaire lui-même est sain : 477 clés, **parité FR/EN totale et vérifiée par les types**
(`en: Record<I18nKey, string>`), aucune valeur EN restée en français. Le problème est en amont :

- **~1 200 chaînes françaises codées en dur dans 47 fichiers** (hors tests et primitives `ui/`).
  Records : `lib/aime-architecture.ts` (381), `components/panels/WeddingModulesPanel.tsx` (148),
  `lib/seed-data.ts` (89), `components/PortalControls.tsx` (75).
- Conséquence concrète dans le **même panneau** : le titre du Graphe vient du dictionnaire
  (`world.graph.title` → « What is visible, role by role » en EN) alors que le sélecteur de rôle
  (`VisibilityGraph.tsx:9-14`), les indices de rôle (`:16-21`) et les catégories
  (`timeline-graph.ts:248`) restent en français.
- **Dates** : `ProjectStage.tsx:103` calcule correctement `dateLocale = locale === 'en' ? enUS : fr`,
  mais **10 appels `format(…, { locale: fr })`** (`UniversalTimeline`, `PlayMode`, `EntityEditor`,
  `FilTrack`, `WorldOverview`, `PublicProfile`…) et **6 `toLocale*String("fr-FR")`**
  (`PlayMode.tsx:114`, `PortalControls.tsx:515`, `GuestPanel.tsx:124`, `PlanningPanel.tsx:23`,
  `WeddingModulesPanel.tsx:685,1013,1146`) sont figés en français — alors que `DossierImport.tsx:99` et
  `LandingComposer.tsx:100`, eux, basculent bien sur `en-US`. En anglais, la timeline affiche
  « 14 août 2027 ».
- **Montants** : `money.ts:47` fige `Intl.NumberFormat("fr-FR")` alors que `budgetToken`,
  juste au-dessus (`money.ts:31`), accepte un paramètre `locale`. Le budget d'un mariage en USD
  s'affiche à la française.
- **8 clés du dictionnaire ne sont jamais appelées** : `nav.language`, `panel.explain`,
  `world.hero.nextStep.{eyebrow,tasks,dayof,memories}`, `assistant.doc.keptLocal`, `assistant.sources.more`.

---

## 3. Système de couleurs : l'« unification rouge » n'est pas finie

Le commit `09fb291` annonce l'unification sur le rouge, mais des accents concurrents subsistent
(classes Tailwind hors tokens du thème) :

| Famille | Occurrences (hors tests) | Détail |
| --- | --- | --- |
| `rose-*` | **57** | `text-rose-300` ×20, `border-rose-300` ×14, `text-rose-200` ×9, `bg-rose-300` ×8, `bg-rose-400` ×4, `border-rose-400` ×2 — surtout `WeddingModulesPanel.tsx` (24 lignes touchées), puis `ProfileFil`, `FilTrack`, `DocumentShare`, `DayRunTimeline`, `App.tsx`, `PlanningPanel`, `CommandBar`, `ApresOverview` |
| `emerald-*` | **10** | `App.tsx:64`, `CommandBar.tsx:220`, `DocumentShare.tsx:295,326`, `WeddingModulesPanel.tsx:1161` |
| `red-*` | **6** | `UniversalTimeline.tsx:503` (bouton de suppression) et `ui/toast.tsx:77` (variante destructive) |

Alors que `--destructive` et `--brand-accent` existent dans `index.css:301-314` et que
`text-destructive` est utilisé ailleurs (`App.tsx:301`).

**Et ces couleurs cassent en thème clair** (mesures WCAG, fond ivoire `hsl(36 24% 96%)` = `#f7f5f2`) :

| Couleur | Contraste thème clair | Contraste thème sombre |
| --- | --- | --- |
| `emerald-300` | **1,40:1** | 13,37:1 |
| `rose-300` | **1,74:1** | 10,78:1 |
| `red-400` | **2,54:1** | 7,37:1 |
| `brand-accent` `#db2554` | 4,38:1 | 4,27:1 |

AA demande 4,5:1 pour du texte courant : les messages de succès verts et les pastilles roses sont
**illisibles dès qu'on bascule en clair** (le bouton d'apparence existe : `AppearanceToggle`).
Note au passage : le rouge de marque lui-même est à 4,38:1 sur l'ivoire — correct pour des accents et du
texte large, juste sous la barre pour du petit texte.

---

## 4. Vestiges et code mort

- **Vue `map`** : `timeline-graph.ts:216` (type), `:220` (`return []`), `:222` (exclusion) et
  `ProjectStage.tsx:728` (`view !== "map"`) — aucun code ne produit plus `view: "map"`
  (0 occurrence). Reste de la « Carte universelle » supprimée.
- **`src/components/ParallaxImage.tsx`** : 0 import.
- **`src/components/ui/breadcrumb.tsx`** : 0 import (primitive shadcn, déjà orpheline avant cette passe).
- **Docs périmées** : `docs/audit-erreurs-site-2026-09-11.md:39` décrit le fil d'ariane comme une
  fonctionnalité livrée (retiré ce jour), et les lignes 18/32/44/46/78 décrivent une page `/guides`
  qui n'existe plus (`src/pages/` ne contient plus `Guides.tsx`).

---

## 5. `preview/smoke.mjs` ne contrôle plus l'app réelle

`node preview/smoke.mjs` remonte **23 problèmes** — exactement les mêmes avant et après mes modifications
(vérifié par `git stash`). Les attentes portent sur des éléments qui n'existent plus dans `src` :
`guides-page`, `guide-chapters-open`, « Mon compte », « Aide & guides », « World settings »,
« Open help », `landing-guide-button` (0 occurrence chacun). Un contrôle qui échoue en permanence
n'alerte plus personne : à réécrire sur les écrans actuels, ou à retirer.

---

## 6. Ce qui a été corrigé dans cette passe

### 6.1 Fil d'ariane retiré de tous les panneaux

- `CenteredBlock.tsx` : le bandeau sous l'en-tête ne rend plus que la navigation de la page d'origine,
  via `PanelChromeBar` (extrait pour être testable) ; il disparaît complètement quand la page n'a pas de
  navigation à proposer (plus de bande vide).
- `PanelChrome.tsx` : le type perd `breadcrumb` — plus aucune donnée morte à maintenir.
- Providers mis à jour : `ProjectStage.tsx`, `PublicProfile.tsx`, `PrivateLayout.tsx` (avec retrait des
  variables `basePath` / `activeItem` devenues inutiles).
- Clés `panel.nav.breadcrumb` supprimées du dictionnaire FR **et** EN.

Au passage, deux chemins absolus codés en dur (`"/"`, `"/user-portal"`) disparaissent du chrome : ils
ignoraient `BASE_PATH`, contrairement à `App.tsx:22` et `PortalControls.tsx:209`.

### 6.2 Graphe : les catégories reprennent des couleurs

- `VisibilityGraph.tsx:29-42` : `KIND_COLORS` typé `Record<VisibilityNode["kind"], string>` — 12 entrées
  exhaustives, **toutes distinctes** (avant : 12 fois la même couleur neutre).
- Jetons `--cat-*` dans `index.css` : jeu sombre dans `:root`, jeu assombri dans
  `:root[data-aime-theme="light"]` (les deux présents dans le CSS de production, vérifié).
- Les Moments gardent le rouge de la marque ; les éléments cliquables portent un halo
  `brand-accent` discret plutôt qu'un contour qui volait la couleur de catégorie.
- Légende (`data-testid="graph-legend"`) listant uniquement les catégories présentes dans le Monde.

### 6.3 Chemins encore ouverts (non corrigés, à prioriser)

1. §1.1 — décider si le Planificateur voit les finances, puis n'écrire la règle qu'une fois.
2. §3 — remplacer `emerald-*` / `rose-*` / `red-*` par les tokens du thème (contraste en clair).
3. §2 — passer dates et montants par la locale, puis traduire les panneaux par lots.
4. §4 / §5 — purger la vue `map`, `ParallaxImage`, et réécrire `preview/smoke.mjs`.

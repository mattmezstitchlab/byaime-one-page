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

---

# Passe 2 — 13 septembre 2026 (suite de session)

> Demande utilisateur : supprimer les restes de `/guides`, supprimer la vue `map`, retirer le bouton « + »
> du portail, visuels modernes pour les Moments, lister les boutons inutiles de la nav horizontale
> (AVANT / LE JOUR J), et statuer sur les boutons « Couple / Wedding planner » et la démo mariage.
> « Corrige tout » appliqué aux incohérences du relevé ci-dessus qui pouvaient l'être sans casse.

## 7. Fait dans cette passe

- **`/guides` supprimé partout** : la page n'existait déjà plus ; `preview/smoke.mjs` attendait encore
  `guides-page`, `guide-chapters-open`, « Comprendre avant de cliquer » — ces contrôles sont retirés et le
  script passe désormais (`CONTRÔLE LOCAL OK`, 0 problème, contre 23 avant).
- **Vue `map` supprimée** : retirée du type `TimelineView`, de `filterTimeline` et de la garde
  `ProjectStage.tsx` ; `aime-architecture.test.ts` mis à jour.
- **Bouton « + » du fil du portail supprimé** (`UniversalTimeline`) : la création d'un Moment reste possible
  via le « + » de la barre de commande (`GlobalCreateCenter`, événement `aime:new-moment`) et les boutons
  « Ajouter » de chaque panneau. La mention « Lecture seule » reste pour les rôles sans édition.
- **Rôles unifiés** : `RoleVisibility` et `WeddingRole` deviennent des alias de `CollaborationRole`
  (une seule définition). La contradiction planificateur/finances est tranchée dans le sens du comportement
  réel (le planificateur voit les finances, comme le font déjà le Graphe et la barre du Monde) : les copies
  d'invitation et `COLLABORATION_ROLE_POLICY` sont alignées, plus de promesse inverse.
- **Contraste / couleurs** : jeton `--success` ajouté (sombre `152 60% 52%`, clair `152 70% 26%`),
  `--destructive` rendu lisible (sombre `0 74% 60%`, clair `0 68% 40%`), et les classes hors thème
  (`emerald-*`, `rose-*`, `red-*` hors primitives `ui/`) remplacées par `success` / `brand-accent` /
  `destructive`. Le `ui/toast.tsx` (variante destructive shadcn) est laissé tel quel.
- **Code mort** : `ParallaxImage.tsx`, `ui/breadcrumb.tsx` et 8 clés i18n jamais appelées supprimés
  (parité FR/EN conservée : 468/468, aucune clé orpheline).
- **Visuels modernes** : 10 des 12 visuels de Moments régénérés dans une direction éditoriale lumineuse
  (cérémonie, table, invités, portrait, musique, préparatifs, fleurs, vidéo, transport, réception).

## 8. Réponses aux questions

### 8.1 « Deux fois les boutons Couple / Wedding planner » ?
Vérifié par rendu statique : sur la page d'accueil, le duo n'apparaît **qu'une seule fois**
(`landing-persona-couple` ×1, `landing-persona-pro` ×1). Le même composant `LandingComposer` est monté à
**deux endroits** : le hero de l'accueil (`Landing.tsx:119`) et l'onboarding de l'espace privé
(`PortalOnboarding.tsx:34`). La seconde instance ne se voit que si l'on arrive sans avoir choisi de persona
sur l'accueil (le choix est mémorisé et saute l'écran). → **Ne pas supprimer l'une des deux** : elles couvrent
deux portes d'entrée différentes. Si l'on veut une seule occurrence, garder celle de l'espace privé
(elle crée réellement le Monde) et transformer le hero de l'accueil en simple appel à l'action.

### 8.2 La démo mariage peut-elle être supprimée ?
Découverte importante : `createInitialProject` (`parser.ts`) **pré-remplit tout nouveau projet mariage**
avec les mêmes données de démo (Sophie Martin, Château de la Tour, paiements, etc.) — pas seulement le bouton
« Explorer un mariage complet ». Donc supprimer le bouton ne supprime pas les données factices : un vrai
couple qui crée son Monde reçoit aussi des invités/fournisseurs fictifs. Deux options propres :
1. **Garder le bouton** mais ne pré-remplir que la démo (les vrais projets démarrent vides) ;
2. **Tout retirer** (bouton + seed) et assumer des Mondes vides au départ.
→ À trancher ; rien n'a été supprimé ici (le bouton sert aussi aux tests e2e : `e2e/aime.spec.ts:95`).

### 8.3 Boutons inutiles de la nav horizontale
Lecture de `getWeddingNavigation` : la rangée est censée ne porter que ce qui est propre à la phase, mais
`ceremony`, `logistics`, `messages` figurent dans les **trois** phases (AVANT en primaire, JOUR J et APRÈS en
secondaire) → ce ne sont pas des entrées de phase, ce sont des catégories communes. → **À déplacer dans un
menu « Plus » (ou la barre latérale)** : économie de 3 boutons par phase.
- AVANT : reste `Plan de table` (+ Synthèse, Aperçu invité).
- JOUR J : reste `Jour J`, `Infos publiques`, `Plan de table`, `Cagnottes`.
- APRÈS : reste `Mercis`, `Photos`, `Film`, `Lune de miel`, `Cagnottes`, `Infos publiques`.
`seating`, `practical`, `contributions` (2 phases sur 3) peuvent rester visibles ; le vrai doublon est le
trio ceremony/logistics/messages. Proposition non appliquée : c'est un choix de design, à valider.

## 9. Restant ouvert (non fait cette passe, à prioriser)

- Régénérer les 2 derniers visuels (`wedding-patrimoine`, `wedding-attire`) : limite de génération atteinte.
- Traduire les ~1 200 chaînes FR codées en dur (dont le Graphe) ; dates/montants par locale ; `BASE_PATH`.
- Décision démo (8.2) et menu « Plus » de la nav (8.3).

---

# Passe 3 — 13 septembre 2026 (positionnement + allègement)

- **Infos publiques retirées de l'APRÈS** (`getWeddingNavigation`) : l'Après est la clôture
  (mercis, souvenirs, film, lune de miel, cagnottes). Elles restent le Jour J. Test mis à jour (25 OK).
- **12/12 visuels modernes** générés (`patrimoine`, `tenue` inclus ; tous dans la fenêtre 20–420 Ko).
- **Entrée Invité** : elle existe déjà mais est enfouie — publication du profil public + « Voir le profil » +
  « Copier le lien » dans les réglages du Monde (`PortalControls.tsx:1088-1108`, route `/profil/:id`).
  Proposition : la remonter en entrée de navigation « Invité » (Jour J) qui ouvre/copie le mini-site.
- **Allègement des panneaux** : les pilules `PanelChromeBar` répètent la barre latérale + la nav horizontale
  dans le Monde → on peut les masquer dans le Monde et ne les garder que sur le Profil (changeur de sections).
- **APRÈS = clôture définitive** : proposition d'une action « Clôturer le Monde » (archive, sort de la nav active).
- **Stratégie** : classement des forces ci-dessous (réponse en session), du plus fort au moins fort,
  mis en regard des rêves des futurs mariés puis des wedding planners.

## 10. Forces classées (lecture produit, fondée sur le code)

Futurs mariés, du plus fort au moins fort :
1. Un seul espace privé né d'une phrase (fini tableurs/fils éparpillés) — rêve n°1.
2. Jour J orchestré : conflits détectés, propagation, run sheet, mini-carte personne — le différenciant.
3. Qui voit quoi : rôles + graphe de visibilité — partager sans exposer budget/privé.
4. Mini-site invité + RSVP par lien — mais sous-exposé (réglages), d'où l'« entrée Invité » manquante.
5. Budget engagé/payé/à régler.
6. L'après-mémoire : souvenirs, film, mercis, anniversaires.
7. Assistant AIME (confort).
8. Local-first / sauvegarde (confiance, invisible).

Wedding planners, du plus fort au moins fort :
1. Multi-Mondes (catalogue + WorldSwitcher + persona pro) — la base du métier.
2. Rôles de collaboration (éditer, gérer les accès) — délégation propre.
3. Prestataires/tâches/budget par Monde — CRM léger.
4. Timeline/conflits — livrer un Jour J carré à chaque client.
Manque principal pro : pas de vue agrégée multi-clients (tableau de bord, échéances croisées), pas de
facturation structurée, démo/seed identique pour tous.

## Passe 4 — 2026-09-13 : mini-site invité complet + entrée Invité dans le Jour J

### Constat
La projection publique (`projectToPublicProfile`) ne renvoyait que l'identité et les Moments
`audience` : un invité ouvrant `/profil/:id` voyait un programme sans lieu, sans accès, sans
plan B. Ces informations existaient pourtant déjà côté serveur dans `participantProjection`
(portail RSVP) — deux projections divergentes pour le même public.

### Corrections
1. `lib/api-spec/openapi.yaml` : `PublicProfile.practical` (venue, parking, accessibility,
   weatherFallback) — codegen orval relancé, diff purement additif (30 insertions).
2. `artifacts/api-server/src/lib/publicProfile.ts` : projection des infos pratiques depuis
   `venue` + `logistics`, avec la même discipline que le reste : `privateContact`,
   `emergencyContacts`, invités, documents et chiffres ne sortent jamais.
3. `src/pages/PublicProfile.tsx` : bloc « Infos pratiques » rendu pour l'invité **et** dans
   l'aperçu du couple ; en aperçu, « Modifier ces infos » ouvre le panneau Logistique.
4. `src/components/panels/DayOfGuestEntry.tsx` : l'entrée Invité quitte les réglages du portail
   pour le déroulé du Jour J — état de publication, publication/masquage, lien, copie, rappel de
   ce qui est publié.

### Contrôles
typecheck racine OK · vitest : 44 fichiers / 235 tests (app) + 10 fichiers (api-server) OK ·
`vite build` OK · `preview/smoke.mjs` = CONTRÔLE LOCAL OK.

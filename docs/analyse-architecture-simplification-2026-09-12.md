# AIME — analyse d'architecture et plan de simplification

Date : 12 septembre 2026
Commit analysé : `ae6d1033` (« Landing & app : direction "Apple du mariage" », #20)
Branche : `arena/01a094fa-byaime-one-page`

> Tout ce qui suit est **mesuré sur le dépôt**, pas estimé. Les commandes de
> vérification sont en annexe. Aucun chiffre n'est avancé sans la ligne ou le
> compteur qui le produit.

**Baseline exécutée avant l'analyse**

| Commande | Résultat |
|---|---|
| `pnpm --filter @workspace/byaime-onepage run test` | 31 fichiers, **182 tests passants** |
| `pnpm --filter @workspace/api-server run test` | 9 fichiers, **32 tests passants** |
| `pnpm test` (racine, tous les paquets) | **236 tests passants** (182 + 32 + 22) |

---

## 1. Ce que l'application est réellement

### Déploiement réel (`vercel.json`)

- Build : `pnpm --filter @workspace/byaime-onepage run build` → `artifacts/byaime-onepage/dist/public`
- API : `api/index.js` + `api/[...path].js` → `artifacts/api-server` (Express 5)
- Cron : `/api/cron/scheduled-messages`
- **`artifacts/mockup-sandbox` n'est pas déployé** : il n'apparaît ni dans `buildCommand`, ni dans `expectedBundles` de `scripts/verify-vercel.mjs`.

### Forme du monorepo

3 artifacts (`api-server`, `byaime-onepage`, `mockup-sandbox`) + 5 libs
(`aime-domain`, `api-client-react`, `api-spec`, `api-zod`, `db`).

L'espace privé tient dans **un seul écran** : `ProjectStage.tsx` (909 lignes).
C'est le cœur : hero, rail, navigation horizontale, panneaux, Timeline.

### Le modèle mental

- **La Timeline est la source, les panneaux sont des projections.** Le plan
  `collections` (`timeline-graph.ts:13-16`) mappe 10 types d'entités vers leurs
  collections ; `PANEL_FOR_KIND` mappe un type vers le panneau qui l'édite.
- **La navigation est un modèle de données**, pas du JSX :
  `getWeddingRailItems(phase, capabilities, locale, mode)` et
  `getWeddingNavigation(...)` construisent les menus, filtrés par
  `isWeddingEntryAllowed(entry, capabilities, mode)`.
- **Contrats chiffrés** : 18 panneaux (`WEDDING_PANEL_IDS`), 10 vues de Timeline
  (`TimelineView`), 4 rôles, 2 modes, 3 phases.
- **`aime-architecture.ts`** : 42 entrées « pédagogiques », avec un test
  (`aime-architecture.test.ts`) qui échoue si un panneau apparaît dans le code
  sans entrée ici, ou si une entrée promet un saut vers un panneau inexistant.

---

## 2. Mon avis honnête

### 2.1 Trois décisions très solides — à ne surtout pas casser

1. **La navigation est une fonction, pas un arbre de composants.** C'est rare,
   et c'est précisément ce qui rend toute simplification possible à coût quasi
   nul. La preuve est déjà dans le dépôt : le mode Facile a été ajouté comme
   **un prédicat** (`FACILE_ENTRY_IDS` dans `wedding-navigation.ts`), sans fork
   de composant métier. 73 lignes (`lib/mode.tsx`) pour un mode entier.

2. **Timeline source / panneaux projections.** Pour un domaine aussi
   relationnel qu'un mariage (un invité → une table → un Moment → un
   prestataire → un paiement), c'est le bon choix. `analyzeEventImpact` +
   prévisualisation avant application (`DayOfPanel.tsx`) montrent que la
   propagation est traitée sérieusement et jamais silencieuse.

3. **Les contrats sont testés, pas seulement documentés.**
   `aime-architecture.test.ts` casse si le code et la doc divergent ;
   `wedding-navigation.test.ts` vérifie l'unicité des entrées sur 3 phases × 4
   rôles. C'est un vrai filet, et c'est ce qui rend le plan ci-dessous exécutable
   sans casser l'app en silence.

### 2.2 Le vrai diagnostic : ce n'est pas « APRÈS » qui rend l'app complexe

C'est **le produit des axes**. Un utilisateur peut se trouver dans :

```
3 phases × (8 rail + jusqu'à 7 nav horizontale + 18 sections) × 10 vues × 4 rôles × 2 modes
```

Chaque axe ajouté multiplie les cas à raisonner, à tester et à expliquer. Et le
code le montre à trois endroits précis :

- **`findPhaseForPanel()`** (`wedding-navigation.ts`) boucle sur les 3 phases et
  **reconstruit toute la navigation** à chaque itération, uniquement pour savoir
  dans quelle phase un panneau habite.
- **`openPanelSafely()`** (`ProjectStage.tsx:164-186`) n'existe que parce qu'un
  panneau peut être demandé dans une phase où il n'est pas affiché (« Souvenirs
  cliqué en mode Avant doit basculer en Après, pas se refermer en silence »).
  C'est un correctif d'axe, pas une fonctionnalité.
- **Les tests** doivent faire `it.each(phases.flatMap(phase => roles.map(...)))`
  — 12 combinaisons — pour un invariant simple (« les entrées sont uniques »).

### 2.3 Mesurer « APRÈS » change la priorité de la question

| Surface « Après » | Taille mesurée |
|---|---|
| 5 branches de panneau (`contributions`, `thanks`, `film`, `honeymoon`, `memories`) | **54 lignes / 9 896 octets** (`WeddingModulesPanel.tsx` : 911-926, 927-940, 941-951, 952-961, 964-966) |
| Hero « Après » (3 compteurs) | 7 lignes (`ProjectStage.tsx:689-695`) |
| Entrées `aime-architecture.ts` (`phase:apres` + 5 panneaux) | **77 lignes** |
| Clés i18n concernées | ~53 sur 886 |

Note de mesure : la plage brute `sed -n '911,966p'` fait 11 444 octets, mais elle
contient aussi la branche `team` (l. 962-963), qui appartient au rail commun et
pas à l'Après. Le chiffre ci-dessus exclut `team`.

Rapporté au front privé (**18 064 lignes**, hors tests et hors `ui/`) :
**moins de 1 %**.

> **Conclusion franche** : masquer APRÈS est une bonne décision *produit* (moins
> de menu, moins de bruit, moins de choses à expliquer). Ce n'est **pas** une
> simplification *d'architecture*. Si on s'arrête là, on aura retiré 4 items d'un
> menu de 18 et laissé le vrai multiplicateur intact.

### 2.4 Le point sur lequel je ne suis pas ton découpage

Tu proposes : AVANT = organiser, JOUR J = orchestrer, APRÈS = plus tard.
Je suis d'accord sur la **hiérarchie de valeur**. Je ne suis pas d'accord pour en
faire **trois états du même type**.

Les trois n'ont pas la même nature :

| | Nature | Usage réel | Ce qu'il faut |
|---|---|---|---|
| **AVANT** | espace de travail | des mois, tous les jours | CRUD riche, délégation, comparaison |
| **JOUR J** | console d'exécution | ~14 heures, une seule fois | lecture, « maintenant », qui fait quoi, zéro friction, public différent (prestataires, témoins) |
| **APRÈS** | boîte d'archives | 3 visites, on dépose | un seul endroit, presque pas d'édition |

Les mettre sur le même axe (`WorldPhase`) force le code à traiter trois objets
différents avec le même outil — un filtre de navigation. Résultat visible : le
Jour J hérite d'un hero de décompte et d'une nav horizontale de 4 items
(`day-of`, `public-info`, `seating`, `contributions`, cf. `wedding-navigation.ts`)
alors qu'il devrait être un plein écran sans chrome.

### 2.5 Ce que je ferais : deux états, pas trois

- **`avant` = l'application.** Le défaut, toujours. C'est là que vit le couple.
- **`jour-j` = un mode d'exécution, pas une phase.** Un écran dédié, plein écran,
  sans rail ni nav horizontale. Il orchestre : le déroulé en cours, le Moment
  actif mis en avant, les contacts d'urgence (déjà présents dans
  `logistics.emergencyContacts`), le responsable de chaque Moment, un bouton
  « prévenir » par Moment. Ouvert par un bouton explicite, auto-activé le jour du
  pivot.
- **`après` = une section, pas un état.** Un panneau « Après » dans le rail, qui
  regroupe en onglets les 5 modules actuels (souvenirs, remerciements,
  contributions, film, voyage). Plus de bascule de phase, plus de
  `findPhaseForPanel`, plus de hero conditionnel.

**Ce que ça rapporte concrètement au code :**

- `getInitialWorldPhase` ne renvoie plus que 2 valeurs (3 aujourd'hui,
  `wedding-navigation.ts:52-57`).
- `findPhaseForPanel` + `openPanelSafely` + `getPanelContextGroup` perdent une
  dimension entière.
- Les combinaisons testées passent de 3×4 à 2×4.
- La nav horizontale « apres » (6 items primaires + 3 secondaires) disparaît au
  profit d'un seul panneau.
- **Important** : l'Après reste un *contenu*. `TimelineEvent.phase`,
  `TaskPhase = "apres"` et la projection RSVP (`participantProjection.ts:90`,
  `afterContent`) **ne bougent pas**. On retire un état de navigation, pas des
  données.

---

## 3. La dette morte : supprimable cette semaine, sans risque produit

Tout est vérifié, commande par commande (annexe A).

| Élément | Taille | Preuve |
|---|---|---|
| **`lib/aime-domain`** (sound-policy 570, sound-authorization 680, sound-playback 434, sound-core 346, capabilities 332, types 195, sound-legacy 85) | **2 648 lignes de code** + 834 de tests | Déclaré dans `api-server/package.json:17` et `byaime-onepage/package.json:54`, référencé dans 2 `tsconfig.json` et dans `verify-vercel.mjs:39` — et **0 import dans tout le dépôt**. Le domaine son/musique n'est branché nulle part — mais ses **22 tests tournent quand même** à chaque `pnpm test` (sortie racine : `lib/aime-domain test: 22 passed`). |
| **`reference/source-zip`** | 916 K | Ancienne version de l'app (ProjectStage, HeroBar, MusicBox…). **0 import.** |
| **`artifacts/mockup-sandbox`** | 388 K | Non déployé (cf. §1), mais typechecké par `pnpm -r --filter "./artifacts/**"` dans `pnpm run typecheck`. Il ralentit le CI pour rien. |
| **43 fichiers `src/components/ui/` orphelins** | **5 067 lignes** sur les 5 713 du dossier `ui/` | Aucune importation. Échantillon contrôlé : `ui/card` → 0, `ui/sidebar` (726 l.) → 0, `ui/chart` (366 l.) → 0 ; alors que `ui/button` → 6, `ui/tooltip` → 2, `ui/dialog` → 1. La détection n'est donc pas un faux positif global. |
| `src/components/ParallaxImage.tsx` | 45 lignes | Aucune importation. |
| `attached_assets/` | 49 M | À externaliser ou nettoyer du dépôt. |

### Deux champs dupliqués dans le modèle — un piège silencieux

Dans `WorldProject` (`lib/types.ts:333-337`) :

```ts
memories: MemoryItem[];   // ← collection réelle
media: MemoryItem[];      // ← doublon
messageLogs: MessageLog[];// ← collection réelle
messages: MessageLog[];   // ← doublon
```

- **Ils ne sont jamais écrits.** `parser.ts:244-245` les initialise à `[]`, et il
  n'existe **aucun** `addEntity("media", …)` ni `addEntity("messages", …)` dans
  le code.
- Les vraies collections sont celles du plan `collections`
  (`timeline-graph.ts:13-16`) : `memories` et `messageLogs`.
- Ils ne sont **lus que** comme compteurs, dans le hero « Après » :
  `project.media.length` et `project.messages.length`
  (`ProjectStage.tsx:692-693`), et préservés par `project-migration.ts:44`.

→ **Deux des trois compteurs affichés à l'utilisateur affichent nécessairement 0.**
À supprimer avec le hero Après.

---

## 4. Plan en 4 vagues

### Vague 0 — Nettoyage (0 risque produit, ~1 journée)

Supprimer : `lib/aime-domain`, `reference/source-zip`, `mockup-sandbox`, les 43
`ui/` orphelins + `ParallaxImage`, et les 2 dépendances fantômes.

Ne pas oublier les références croisées : `tsconfig.json:16`,
`artifacts/api-server/tsconfig.json:13`, `scripts/verify-vercel.mjs:38-39`.

**Gain : ~10 000 lignes de moins à typechecker, un CI plus rapide, plus de faux
signal.**

### Vague 1 — Tuer la duplication du modèle (~½ journée)

Retirer `media` et `messages` de `WorldProject`, ajuster
`project-migration.ts:44`, corriger les 2 compteurs du hero. Filet :
`project-sync.test.ts`, `timeline-graph.test.ts`.

### Vague 2 — L'Après devient une section (~2 jours)

- Retirer `"apres"` de `WORLD_PHASE_IDS`, **garder** le type pour la donnée
  (`TimelineEvent.phase`, `TaskPhase`, `afterContent`).
- Un panneau `apres` regroupant les 5 modules en onglets.
- Supprimer `phase:apres` et les 5 entrées panneaux d'`aime-architecture.ts`
  (77 lignes) → **le test de contrat validera tout seul**.
- Tests à mettre à jour : `wedding-navigation.test.ts` (l'attente
  `getWeddingNavigation("apres", owner).primary` →
  `["thanks","memories","film","honeymoon","contributions","public-info"]`),
  `mode.test.ts`, `private-shell-i18n.test.tsx`.

### Vague 3 — Le Jour J devient un mode (~3-5 jours)

- Nouvel écran `/jour-j` : déroulé `phase === "pendant"` trié, Moment actif mis
  en avant, contacts d'urgence, responsable par Moment, « prévenir ».
- Auto-activation le jour du pivot ; sortie manuelle.
- Le tick à la seconde (`ProjectStage.tsx:126-129`) déménage ici — le reste du
  Monde peut rester à la minute.
- `DayOfPanel` (19 lignes aujourd'hui) devient le cœur de cet écran au lieu d'un
  panneau parmi 18.

---

## 5. Ce que je ne toucherais pas

- **JSONB versionné + `updatedAt` comme token de concurrence (HTTP 409).** C'est
  ce qui permet au domaine d'évoluer sans migration destructive. Garder.
- **Liens RSVP révocables** et re-vérification d'appartenance à chaque accès
  fichier. Garder.
- **Le mode Facile comme lentille** (`lib/mode.tsx`, 73 lignes). C'est exactement
  le bon patron. Ce que je propose en vagues 2 et 3, c'est d'appliquer ce patron
  à la phase elle-même.
- **`aime-architecture.ts` comme source unique de vérité pédagogique** + son test
  de contrat. Atout rare : chaque suppression de panneau doit passer par là.

---

## 6. Deux points qui méritent une décision séparée

1. **Le filet de sécurité n'est pas dans CI.** `.github/workflows/e2e.yml` est
   **le seul** workflow ; il ne lance que `pnpm run typecheck:e2e` puis
   Playwright. Les **236 tests unitaires** lancés par `pnpm test` (182 + 32 + 22) ne tournent qu'en local, et
   `pnpm run typecheck` (le complet) non plus. **Avant** de simplifier, je les
   mettrais dans CI — sinon on casse des contrats sans le savoir.
2. **Les guides pèsent 2 503 lignes pour 25 démos** (`Guides.tsx` 597 +
   `guides-fake-uis.tsx` 1 310 + `guides-demos.tsx` 596), dont des UI simulées
   qui peuvent diverger du vrai produit. À garder, mais à traiter comme une
   surface à part — et à réduire à chaque changement de panneau.

---

## Réponse courte à ta question

Ton instinct est bon sur la **hiérarchie** (Avant > Jour J > Après), mais il
vise la mauvaise variable. Retirer APRÈS fait gagner moins de 1 % du front. Ce
qui fera vraiment respirer l'app, c'est :

1. **passer de 3 phases à 2 états + 1 section** (Après = panneau, pas état),
2. **faire du Jour J un écran d'exécution** au lieu d'un filtre de menu,
3. **jeter ~10 000 lignes de code mort** qui ne servent à rien aujourd'hui.

---

## Annexe A — commandes de vérification

```bash
# Baseline tests
pnpm --filter @workspace/byaime-onepage run test   # 31 fichiers, 182 tests
pnpm --filter @workspace/api-server run test       #  9 fichiers,  32 tests

# aime-domain : déclaré mais jamais importé
grep -rn "aime-domain" --include="*.ts" --include="*.tsx" --include="*.json" . \
  | grep -v node_modules | grep -v pnpm-lock
# → 2 package.json (deps) + 2 tsconfig + verify-vercel.mjs. Aucun import.

# ui/ orphelins : fichiers jamais importés
for f in $(find src/components/ui -name "*.tsx"); do b=$(basename $f .tsx)
  n=$(grep -rlE "from ['\"][^'\"]*ui/$b['\"]" src --include="*.tsx" --include="*.ts" | wc -l)
  [ "$n" -eq 0 ] && echo "$f $(wc -l < $f)"; done
# → 43 fichiers, 5 067 lignes

# Doublons jamais écrits
grep -rn '"media"' src | grep -E 'addEntity|updateEntity|removeEntity'   # vide
grep -rn "media:\|messages:" src/lib/parser.ts                          # → [],[]
grep -rn "project.media.length\|project.messages.length" src            # → hero Après

# Surface Après : 54 lignes, 9 896 octets pour les 5 branches
# (la plage brute 911-966 = 11 444 octets, mais elle inclut la branche `team`)
python3 - <<'PY'
lines=open('src/components/panels/WeddingModulesPanel.tsx',encoding='utf-8').read().split('\n')
marks=[(911,926),(927,940),(941,951),(952,961),(964,966)]   # contributions/thanks/film/honeymoon/memories
print(sum(b-a+1 for a,b in marks), 'lignes,',
      sum(len('\n'.join(lines[a-1:b]).encode()) for a,b in marks), 'octets')
PY

# Volumes
find src -name "*.ts*" ! -name "*.test.*" ! -path "*/ui/*" -exec cat {} + | wc -l  # 18 064
find src/components/ui -name "*.tsx" -exec cat {} + | wc -l                        #  5 713
```

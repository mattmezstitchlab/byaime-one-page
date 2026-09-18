# Pont d'architecture — byaime ↔ AIME-COMPOSER

**Statut : proposition à valider (moi : l'agent ; toi : le décideur).**
**Pourquoi ce document existe :** deux dépôts prétendent décrire le même
produit. Tant qu'aucun pont officiel n'existe, chaque nouveau travail risque
de recréer le casse-tête que le produit est censé supprimer : deux vérités
canoniques parallèles, deux vocabulaires, un mariage conceptuel à refaire.

---

## 1. La règle canonique — qui décide quoi

| Domaine | Source de vérité | Rôle de l'autre dépôt |
|---|---|---|
| **Le produit exécuté** : code, données réelles, utilisateurs, tests métier, parcours | **byaime-one-page** (le chantier) | AIME-COMPOSER ne l'implémente jamais |
| **La constitution** : contrats d'architecture, modèle de composition, spécifications d'organes | **AIME-COMPOSER** (le parlement) | byaime implémente, jamais ne respecifie |
| **La langue visuelle** : tokens, familles QA, icônes, pont Tailwind | **AIME-COMPOSER** (`design-system/`) | byaime consomme le pont, ne fork pas |
| **Le juge** : diagnostic universel V2, `--baseline`, gates | **AIME-COMPOSER** (`diagnostic/`) | juge byaime comme tout projet externe |
| **Les formats d'échange** : `carte-aime.json`, brief agent, transports/patchs | spécifiés côté COMPOSER | byaime les lit et les émet, jamais de variante |

Règle de circulation : **un nouveau concept naît côté COMPOSER (spécification
avec statut), puis atterrit côté byaime (tranche verticale testée).** Jamais
l'inverse, jamais en parallèle. C'est la méthode `IMPLEMENTATION-CONTRACT-V1`
(vertical slices) appliquée à nos deux dépôts.

## 2. Table de correspondance — un concept, un mot par dépôt

| Concept | byaime (produit) | AIME-COMPOSER (constitution) |
|---|---|---|
| Le projet d'une vie/communauté | **Monde** (`WorldProject`) | Project / Project Memory |
| L'identité durable d'une personne | **Carte Universelle** (3 niveaux : carte / fonctionnement / association) | Universal Card · MEMORY.IDENTITY |
| Le fil temporel | **Timeline / Moments** (`timeline`, colonne vertébrale) | Universal Timeline · EVENT (temps opérationnel) |
| La composition assemblée | *(manquant — voir §4)* : la page publique du Monde | **Composition** (COMPOSITION-MODEL-V1) |
| Un bloc dans une page | *(manquant)* | **Placement / Clip** (Resource + position + contexte) |
| La médiathèque | **Galerie unifiée** (`documents`) | Universal Media Library · Resource |
| La porte de création | **Panneau AIME / l'orbe +** | Création universelle (7 primitives) |
| Avant / Le Jour J / Après | **Phases** (état temporel du Monde, déduit de la date pivot) | Temps opérationnel — *pas* des pages |
| Accueil / Médias / À propos | *(à venir)* : **Pages** de la Composition | Pages de la Composition — *pas* des phases |
| Le premier kit métier | **Kit Mariage** | Kit (contenu + règles métier, cœur inchangé) |
| Le parement visuel | design tokens `paper / ink / hairline` | 23 primitives · 21 rôles × 2 thèmes (pont Tailwind) |

**Les deux axes orthogonaux** (à ne jamais confondre, c'est la confusion qui
tuerait le produit) : les **Pages** disent *où* vit l'information dans la
composition publiée ; les **Phases** disent *ce que le Monde montre et fait à
l'instant T*. Une page peut projeter différemment selon la phase ; une phase
n'est jamais renommée en page.

## 3. Ce qui existe déjà des deux côtés (ne rien réinventer)

Côté byaime : store unique `WorldProject` (timeline = spine, 7 dossiers du
rail, Galerie + Organisation unifiées, 548 tests), Carte Universelle en base
(`aime_universal_cards` + profils + interventions), Oneboarding en 5 questions,
une seule page publique ( mémoire `single-public-page`), mémoire produit
`.agents/` (Ripple UI, monde éditable, grille des vivants).

Côté COMPOSER : `COMPOSITION-MODEL-V1` (Resource → Collection → Composition
→ Placement → Context → Version → Proposal → Decision), `INTEGRATION-MAP-V1`
(propriétaire canonique par donnée), design system V1 + **pont Tailwind**
(`design-system/bridge/`, couleurs = rôles `var(--aime-*)`, échelle fermée),
diagnostic universel V2 (juge React/Tailwind, `--baseline`), boucle NOEMA
(un routeur, deux hôtes, runtime publié).

## 4. La première tranche proposée — la Page du Monde en composition déclarative

Le plus petit pas qui prouve la boucle « **saisi une fois, propagé partout** »
sur un cas réel, sans nouveau backend (tout existe déjà dans le store et la
carte) :

1. Étendre `WorldProject` avec `publicPage: { blocks: Block[] }` —
   l'unique page publique du Monde devient une **composition déclarative**.
2. Trois types de blocs suffisent à prouver le modèle :
   - **Texte** — lié à une source canonique (`carte.firstName`, `world.title`,
     `moment.title`…) ;
   - **Visuel** — lié à `heroVisual` ou à un document de la Galerie ;
   - **Moments** — projection filtrée de la timeline (par phase, par visibilité).
3. Chaque bloc porte : `id`, `type`, `source` (la liaison), `visibility`
   (jamais public par héritage — filtrage côté serveur), `presentation`
   (la géométrie viendra plus tard, en calque séparé — loi 2.3).
4. Édition en un clic (mode Éditer → le bloc ouvre sa source dans le panneau),
   et **l'effet Ripple est vérifié par test** : changer `world.title` change
   le bloc lié, changer la carte change les projections de la carte.
5. Le kit Mariage livre une composition par défaut (hero visuel → texte de
   présentation → Moments pratiques) : l'utilisateur n'assemble rien,
   il ajuste.

Cette tranche implémente `COMPOSITION-MODEL-V1` dans byaime sans attendre
les organes complets : c'est la vertical slice exigée par leur contrat
d'implémentation, prouvée par des tests dans notre style (comme
`wedding-navigation.test.ts` verrouille la navigation).

## 5. Étapes suivantes, dans l'ordre

1. **Ce pont** (ce document) — validé (18/09).
2. **La tranche Page/blocs** (§4) — **faite** : modèle `publicPage` (liaisons
   seulement), projection en direct, vue `PublicPageView` branchée sur la vue
   « Informations pratiques », repli déterministe pour les Mondes légués,
   15 tests qui verrouillent le Ripple et la non-publication par héritage
   (563 tests verts au total).
3. **Le pont Tailwind — couche posée, baseline mesurée (18/09)** :
   `src/styles/aime-tokens.css` (vendored, provenance AIME-COMPOSER
   `90ad4c0`) est chargé dans `index.css` — additif, aucune variable
   existante changée, build vérifié. La couture des palettes historiques :

   | Rôle AIME (`--aime-*`) | Équivalent actuel de l'app | Statut |
   |---|---|---|
   | `color-surface` / `color-text` (thème clair) | `--agency-paper` #FFFFFF / `--agency-ink` #171410 | couture documentée — l'agence reste la vérité visuelle, contrastes verrouillés par `agency-theme.test.ts` |
   | `color-border-subtle` | `--agency-hairline` #E6E1D8 | idem |
   | `color-text-muted` | `--agency-body` #6F6A61 | idem |
   | shadcn HSL (`--background`…) | — | couche propre à l'app, hors périmètre de convergence |

   **Baseline mesurée** (diagnostic universel V2, voit le React) :
   19 écrans · 154 fragments · 294 écarts écrans (densité 15.5/écran) ·
   vocabulaire système 0/1159 classes. Chantiers dans l'ordre du juge :
   hiérarchie (16), focus (218), couleurs littérales (328), valeurs hors
   échelle (847), classes non résolues (1560 — cn()/clsx, à nommer ou
   passer par le pont). `lucide-react` nommée bibliothèque tierce, pas
   comptée en écarts. La convergence se suit désormais par mesures
   successives — jamais déclarée.
4. **Convergence n°1 — hiérarchie (18/09, mesurée)** : 16 → **12** écarts
   écran (densité 15.5 → 15.3). Vraies corrections : état d'erreur du profil
   public extrait en fragment (`ProfileAccessBlocked` — la page garde un
   seul h1 par fichier, le rendu est identique) ; saut h2→h4 du pied de
   page de `design/index.html` résolu (h4→h3) ; h1 masqué ajouté à la
   coquille `mockup-sandbox`. Les 12 restants sont des **angles morts du
   collecteur, pas des écarts du produit** — voir §7.
5. **La géométrie verrouillable** (ratio, `locked_to`) — en calque
   présentation, après la preuve, côté spec COMPOSER d'abord.
5. **Le wording universel** en dernier — quand le moteur existe, les mots
   suivent ; jamais l'inverse.

## 6. Anti-périmètre

- byaime ne devient pas un site builder libre (la valeur = rien à assembler,
  tout pré-rempli, tout propagé) ;
- COMPOSER ne devient pas une deuxième implémentation du produit ;
- aucune donnée dupliquée entre les deux dépôts — des formats d'échange
  versionnés, rien d'autre.

## 7. Retour du terrain au juge — angles morts mesurés (18/09)

Première passe de convergence exécutée côté byaime. Sur 16 écarts HIERARCHY
« écran », 4 étaient de vrais écarts (corrigés) et **12 sont des angles
morts du collecteur**, à publier comme tels plutôt qu'à facturer au projet :

1. **h1 composé invisible** : une route dont le titre vit dans un fragment
   importé (`SiteHero` rend le h1 de Legal/Mentions ; `ProjectStage` celui
   de l'écran app) compte « 0 h1 ». Le scan statique d'une route n'inlined
   pas ses imports locaux.
2. **Alias de composants non résolus** : `<motion.h1>` (framer-motion) n'est
   pas compté comme h1 — l'écran app en rend un vrai.
3. **Fichiers `*.test.*` comptés comme routes** : les tests de pages
   (`landing.test.tsx`, `assistant-folders.test.tsx`…) sont des écrans pour
   le collecteur ; leurs doubles rendus y comptent des « 2 h1 ».
4. **Coquilles SPA** : `index.html` du montage Vite n'a pas de h1 statique —
   il vit dans le rendu ; en ajouter un créerait un double h1 à l'exécution.

Proposition (dans la grammaire du système) : publier ces cas comme
`NON RÉSOLU — h1 composé/alias/coquille`, jamais comme écart ; exclure
`*.test.*` des routes ; compter `motion.h[1-6]` comme titres. La règle
« jamais deviner » reste : ce qui n'est pas résolu est nommé, pas inventé.

**✅ Boucle fermée le 18/09 au soir** — le juge a intégré les 4 angles
(PR AIME-COMPOSER #43, commit `be9cac3`, recetté indépendamment : résolveur
109/109, smokes 69/69, QA 12/12, DOM 34/34, loop 91+36, diagnostic 38/38).
Re-mesure byaime : **HIERARCHY 16 → 2 vrais écarts + 4 non-résolus nommés
écran par écran** (coquille SPA `index.html` ; `Home`→`ProjectStage` ;
`Legal`/`Mentions`→`SiteChrome`), écrans 19 → 13 (6 fichiers de test
exclus). La densité par écran monte mécaniquement (280/13 = 21.5) : effet
dénominateur, pas de régression. La boucle terrain → juge → re-mesure a
tourné complète une fois.

## 8. Deuxième retour du terrain — mesuré le 18/09 au soir

Re-mesure post-amélioration du juge : deux découvertes, dont une bloquante
pour l'histoire d'adoption.

### 8.1 🔴 La couche d'adoption est facturée comme dette (bloquant)

`src/styles/aime-tokens.css` — la couche vendée depuis AIME-COMPOSER
(étape 3 du pont) — contient exactement **150 littéraux couleur**, et le
diagnostic les compte : **COLOR 328 → 478** (3 → 4 feuilles), à attribution
constante par ailleurs (écrans 84 · fragments 132 inchangés).

C'est l'incitation perverse du pont : **un projet qui adopte la couche de
tokens voit ses écarts monter de 150 au lieu de descendre.** Le bridge
promet « zéro écart pour qui n'utilise que le pont » — la promesse est
fausse tant que le fichier de tokens lui-même est facturé.

Fix demandée (même principe que CONTRAST `REFERENCE_ONLY` — « on ne facture
pas un projet tiers pour nos dettes ») : reconnaître la couche de tokens
vendée — par marqueur de provenance en tête de fichier ou empreinte du
`tokens.css` officiel — comme **REFERENCE** : exclue de COLOR, et comptée
en **adoption** (« couche de tokens présente »). L'adoption doit être
visible dans le bon sens, jamais taxée.

### 8.2 🟠 Cinquième et sixième angles morts (hiérarchie)

- **h1 exclusifs par branche** : `App.tsx` porte 3 `<h1>` dans des branches
  mutuellement exclusives (invitation à collaborer / portail RSVP /
  connexion indisponible) — un seul rend à la fois, le scan statique
  compte 3. Traitement honnête : `NON RÉSOLU — h1 par branche`, jamais une
  interpolation de contrôle.
- **Bootstrap compté comme écran** : `main.tsx` (montage React, 0 h1)
  apparaît comme un écran « 0 h1 ». Un fichier de montage n'est pas un
  écran — même traitement que la coquille SPA.

Critère d'acceptation de la prochaine tranche juge : byaime passe à
**HIERARCHY 0 vrai écart + non-résolus nommés** (composé, coquille,
branche, bootstrap) et **COLOR ≤ 328 avec la couche reconnue en adoption**.

## 9. Troisième retour du terrain — FOCUS saturé de faux positifs (18/09, preuve par intervention)

Convergence n°2 (famille FOCUS, 218 écarts annoncés). Triage terrain :

- **133 faux positifs** : l'idiome canonique accessible
  `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
  (133 occurrences, 135 rings présents) — l'idiome standard shadcn/Tailwind,
  plus accessible que l'outline par défaut ;
- **58 vrais défauts corrigés dans le produit** : 53 `outline-none` nus
  (champs ne substituant qu'un changement de bordure au `focus:` — pointeur
  inclus, indicateur faible) → idiome canonique ; 5 `focus:outline-none`
  (suppression au pointeur ; 2 avaient déjà le ring, 3 substituaient par
  bordure) → `focus-visible:` ; `.field` CSS → outline UA conservé au
  clavier, supprimé au pointeur uniquement (motif exempté du juge).

**Preuve par intervention** : après ces 58 corrections réelles, la mesure
passe de **218 à 217** (le seul point gagné est le cas CSS). La famille ne
mesure plus l'accessibilité : elle mesure la présence du token
`outline-none`, quelle que soit sa substitution.

**Angle mort #7 (le plus massif à ce jour)** — règle demandée pour
l'extraction de classes, symétrique de l'exemption CSS existante
(`:focus:not(:focus-visible)`) :

1. `focus-visible:outline-none` **accompagné** de `focus-visible:ring-*`
   (ou `focus-visible:shadow-*`) dans le même attribut de classes =
   substitution valide → **pas un écart** ;
2. `focus:outline-none` (suppression au pointeur) sans substitution =
   écart ;
3. `outline-none` nu sans ring adjacent = écart ;
4. publier le compte des paires non appariées restantes, nommées.

Acceptance sur byaime : FOCUS tombe de 217 à **l'inventaire réel des
paires non appariées** (attendu proche de zéro), comptes exacts, fixtures
`focus-pairing` (paire valide / nu / pointeur / paire incomplète).

**✅ Boucle fermée le 18/09 (matin)** — le juge a intégré §8 et §9 (PR
AIME-COMPOSER #44 `1f9da76` : couche de tokens REFERENCE, h1 par branche,
bootstrap ; PR #45 `f49461e` : pairing FOCUS « la substitution, pas le
token », angle mort n°8 `font-display` compté `.t-display`). Re-mesure
byaime (diagnostic V2 sur `artifacts/byaime-onepage`, juge `20fabad`) :

| Famille | Avant (§8) | Après juge #44/#45 | Après convergence n°3 |
|---|---|---|---|
| HIERARCHY | 16 | **0 vrai** + 6 non-résolus nommés | 0 + 6 |
| COLOR | 478 | **127** (`tokens_layer: true`, 2 fichiers reconnus) | 127 |
| FOCUS | 217 | **6** (inventaire réel, chacun nommé) | **3** |

## 10. Convergence n°3 — les 6 FOCUS réels (18/09)

Les 6 écarts nommés par le juge se partagent en deux lots :

- **3 dans le produit, corrigés** : `FilTrack` (point RSVP sur le fil,
  `focus-visible:outline-none` sans anneau → `ring-2 ring-brand-accent/70`) ;
  `card-blocks` (champ de recherche des rôles, fond sombre → `ring-inset
  ring-white/60`) ; `PlanningPanel` (corbeille d'une étape sans nom
  accessible → `aria-label="Supprimer {titre}"` + anneau clavier). Au
  passage, `EntityEditor` : deux chaînes de classes (`inputClass`,
  `selectClass`) portaient le motif « outline retiré au clavier, seule la
  bordure change » — le même que les 53 corrigés en n°2 ; le juge ne les
  voyait pas (constantes, pas attributs `className` littéraux) — corrigées
  quand même, c'est l'accessibilité qui compte, pas la mesure.
- **3 dans `reference/source-zip/`** (`HeroBar.tsx` ×3) : une archive de
  référence commitée le 07/09, importée nulle part, hors `tsconfig`. Elle
  n'est pas le produit ; on ne la « corrige » pas pour flatter un chiffre.
  Elle reste comptée, nommée, et sera retirée du dépôt quand la décision
  d'archivage sera prise — pas par cette convergence.

**Angle mort #9, mineur, à remettre au juge** : les constantes de classes
(`const inputClass = "…"`) réutilisées dans plusieurs `className={inputClass}`
ne sont pas extraites — un défaut dans une constante est un défaut par
usage, invisible. Résolution honnête : les compter en « constructions
dynamiques » nommées, ou résoudre les identifiants locaux dont la valeur
est un littéral de chaîne dans le même fichier (aucune devinette : la valeur
est écrite en clair).

Résultat après n°3 : FOCUS **3** (tous hors produit, `reference/`),
563 tests verts, build ✓, `verify:vercel` ✓.

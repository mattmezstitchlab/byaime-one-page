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
3. **Le pont Tailwind** : adopter le preset du design system dans l'app
   (Tailwind v4, config CSS — aucun fichier de config à créer), brûler les
   couleurs littérales, mesurer la convergence avec
   `node diagnostic/diagnose.mjs --baseline` : la boucle d'alignement
   jusqu'à zéro écart, outillée par le juge des deux côtés.
4. **La géométrie verrouillable** (ratio, `locked_to`) — en calque
   présentation, après la preuve, côté spec COMPOSER d'abord.
5. **Le wording universel** en dernier — quand le moteur existe, les mots
   suivent ; jamais l'inverse.

## 6. Anti-périmètre

- byaime ne devient pas un site builder libre (la valeur = rien à assembler,
  tout pré-rempli, tout propagé) ;
- COMPOSER ne devient pas une deuxième implémentation du produit ;
- aucune donnée dupliquée entre les deux dépôts — des formats d'échange
  versionnés, rien d'autre.

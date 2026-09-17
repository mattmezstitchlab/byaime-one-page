# Plan — Le Panneau AIME : un seul panneau pour tout le site privé

**17/09/2026 — suite de l'audit `audit-simplification-site-2026-09-17.md`**

## Décision (utilisateur, 17/09)

> Le bouton **« + » (l'orbe) est l'unique porte d'entrée**. Dans ce panneau, on réunit
> **tout**, fusionné de manière architecturale **comme l'autre panneau** (la fenêtre
> `BottomDock` avec sa **colonne menu de gauche**) : **un seul panneau pour tout le
> site**. L'anglais et le français sont conservés.

Conséquence directe : tout ce qui est aujourd'hui une porte d'entrée séparée (menu du
haut, rangée du cockpit, icônes, pages /assistant, /dossiers, ME, création…) est **absorbé
par ce panneau**. L'écran reste du **contenu** ; la **navigation** vit dans le panneau.

---

## 1. État des lieux — tout ce qu'il y a à réunir

Dix surfaces de navigation existent aujourd'hui pour un seul produit :

| # | Surface d'aujourd'hui | Où | Contient |
|---|---|---|---|
| 1 | **Orbe « + » → CommandBar** | `components/CommandBar.tsx` (236 lg) | 7 dossiers, partager un fichier (DocumentShare), Créer (→ GlobalCreateCenter), Mon espace ME, Monde (rail : programme, organisation, documents, logistique, musique), Aller à (Monde), bascule FR/EN, Réglages du Monde |
| 2 | **Bouton « menu » du cockpit → WorldTopMenu** | `components/WorldTopMenu.tsx` (165 lg) | liste plate : vues + 7 dossiers + outils sans dossier |
| 3 | **Rangée du haut du cockpit** (P3) | `components/ProjectStage.tsx` | Le programme + 7 dossiers + Vue d'ensemble + Aperçu invité + Le mini-site + lecture |
| 4 | **Héro du Monde** | `ProjectStage.tsx` | Choisir un Monde (WorldSwitcher), périodes Avant/Le Jour J/Après, changer le visuel, compte à rebours, % des tâches, suggestion |
| 5 | **Icônes flottantes** | `ProjectStage.tsx` | Graphe de visibilité (œil), Recherche (WorldSearch) |
| 6 | **ME (PortalControls)** | `components/PortalControls.tsx` (1197 lg) | vue d'ensemble, profil, sécurité, confidentialité, préférences, mes Mondes, actions sensibles + réglages du Monde, éditeur, sync, invitation, suppressions |
| 7 | **Création globale** | `components/GlobalCreateCenter.tsx` (évt `aime:open-create`) | Créer une personne, un Moment, une tâche, un document |
| 8 | **Pages** | `/assistant`, `/dossiers`, `/ma-carte`, `/admin` | question + document / 7 dossiers / carte universelle / guide « Le rétroplanning » |
| 9 | **Fenêtre des panneaux (BottomDock)** | `components/BottomDock.tsx` (309 lg) | **colonne menu de gauche** (Vues, Le Monde, Outils du mode, progression) + zone de contenu (les 18 panneaux) |
| 10 | **Bandeau participants** | `WeddingCardParticipants.tsx` | qui est sur « ma carte » |

**Problème constaté** : les mêmes 7 dossiers apparaissent **4 fois** (orbe, menu,
rangée, /dossiers), ME est **2 fois** (bouton mobile + orbe), la recherche et le graphe
sont **cachés dans des icônes**, et « Créer » passe par un **troisième panneau** (
GlobalCreateCenter). D'où « on ne sait même pas où regarder ».

---

## 2. Le panneau — plan

### 2.1 Architecture (le squelette)

Même squelette que la fenêtre BottomDock actuelle (qui plaît), **sans pastilles Mac**
(éliminées au lot P2) :

```
┌──────────────────────────────────────────────────────────────────┐
│  Panneau AIME · <titre de la section active>     [FR/EN]  [×]    │  ← barre de titre simple
├───────────────────────┬──────────────────────────────────────────┤
│  🔍 Chercher…         │                                          │
│  (recherche + question)│          ZONE DE CONTENU                │
│                       │                                          │
│  MONDE                │   l'en-tête de la section                │
│   Le programme         │   (titre + phrase d'explication)        │
│   Invités & RSVP        │   puis le module existant              │
│   Budget & devis         │   (panneaux, assistant, ME, carte…)   │
│   Contrats               │                                          │
│   Prestataires           │                                          │
│   Programme Jour J        │                                          │
│   Photos & souvenirs      │                                          │
│   Messages                │                                          │
│                       │                                          │
│  OUTILS                 │                                          │
│   Tâches                 │                                          │
│   Cérémonie & réception   │                                          │
│   Logistique              │                                          │
│   Équipe                  │                                          │
│   Vue d'ensemble (Avant)   │                                          │
│   Musique                 │                                          │
│   Infos pratiques (Jour J) │                                          │
│   Ce que chacun voit       │                                          │
│   Aperçu invité            │                                          │
│   Le mini-site             │                                          │
│                       │                                          │
│  AIDE                   │                                          │
│   Poser une question      │                                          │
│   Partager un document     │                                          │
│   Créer (personne, Moment, │                                          │
│     tâche, document)        │                                          │
│   Le guide (rétroplanning)  │                                          │
│                       │                                          │
│  MON COMPTE             │                                          │
│   Mon profil              │                                          │
│   Ma carte                │                                          │
│   Mes Mondes              │                                          │
│   Réglages du Monde        │                                          │
│   Langue · Déconnexion      │                                          │
└───────────────────────┴──────────────────────────────────────────┘
```

- **Barre de titre** : « Panneau AIME » + le titre de ce qu'on regarde + bascule FR/EN
  (conservée, les deux langues restent) + fermer (Échap, clic extérieur — déjà le cas).
- **Colonne de gauche (232 px)** : le menu unique, 5 sections, ordre ci-dessus.
  Chaque entrée = **libellé clair + compteur** (les 7 dossiers gardent leur nombre
  d'éléments, comme dans l'orbe actuelle). Filtre par rôle : budget/contrats masqués
  pour famille et invité (règle existante `isFolderLocked`).
- **Zone de contenu** : rend le module choisi — **réutilise les composants existants
  tels quels** (WeddingModulesPanel, GuestPanel, DayOfPanel, MondePanel,
  WorldOverview, VisibilityGraph, AssistantChat, DocumentShare, UniversalCardForm,
  les sections ME de PortalControls). Zéro nouveau domaine de données.
- **Mobile** : le panneau prend tout l'écran ; la colonne devient une barre d'onglets
  horizontale en haut (Monde / Outils / Aide / Compte).

### 2.2 La recherche en haut de colonne

Un seul champ qui fait trois choses (remplace l'icône loupe + WorldSearch + la
question « flottante ») :
1. **Trouver** : personnes, Moments, fichiers, prestataires (la recherche existante).
2. **Demander** : si ce n'est pas une entité, la saisie est posée à AIME (assistant —
   le mode « connecté/local » reste affiché, jamais masqué).
3. **Aller** : suggestions directes (« budget », « invités ») qui ouvrent la section.

### 2.3 Comportements

- **Clic sur une entrée** → la zone de contenu charge le module ; l'entrée reste
  surlignée. Le Monde derrière reste intact (le panneau est un overlay, comme
  aujourd'hui) — le retour se fait par × / Échap.
- **« Le programme »** = la vue Timeline : on la ferme et on est dessus. Les périodes
  (Avant / Le Jour J / Après) restent **dans le héro** (elles changent le contenu, pas
  la navigation) et sont **miroitées en haut de la colonne** pour les ouvrir depuis le
  panneau.
- **Créer** : un bouton en tête de section AIDE (ou raccourci `C`) → les 4 actions
  existantes (personne, Moment, tâche, document). Le GlobalCreateCenter disparaît en
  tant que panneau séparé.
- **Profondeurs** : quand on ouvre un dossier depuis un Moment, le panneau mémorise
  l'origine (comme le fait déjà `momentId` dans BottomDock) et propose « Revenir au
  Moment ».
- **Liens profonds conservés** : `/assistant`, `/dossiers`, `/ma-carte`, `/admin`
  restent valides — ils ouvrent le panneau sur la bonne section (compatibilité anciens
  liens, emails, tests).

### 2.4 Ce qui disparaît (absorbé)

| Disparaît | Remplacé par |
|---|---|
| `CommandBar` (le panneau actuel de l'orbe) | le Panneau AIME (son contenu : dossiers, fichier, création, ME, réglages, langue — tout rentre dans les sections) |
| `WorldTopMenu` (bouton menu du cockpit) | la colonne MONDE + OUTILS |
| Rangée du haut du cockpit (P3) | idem |
| Icônes œil (graphe) + loupe (recherche) | section « Ce que chacun voit » + champ de recherche |
| Page `/assistant` | section AIDE → Poser une question / Partager un document |
| Page `/dossiers` | section MONDE (les 7 dossiers) |
| `GlobalCreateCenter` (3ᵉ panneau) | bouton Créer de la section AIDE |
| ME modale (`PortalControls`) en tant que panneau séparé | section MON COMPTE (profil, carte, Mondes, réglages, langue, déconnexion) |

### 2.5 Ce qui reste EN DEHORS du panneau (le contenu pur)

- **Le cockpit** : héro (Choisir un Monde, périodes, visuel), compte à rebours,
  Timeline, déroulé du Jour J en direct, accueil « Commencez par ici » des Mondes neufs.
  Plus **aucun** bouton de navigation.
- **Le bandeau participants** (« ma carte ») : reste au-dessus du contenu (information,
  pas de navigation) — ou passe en section MON COMPTE si trop lourd, à valider.
- **Les pages publiques** (invités) : `/profil/:id`, `/bilan/:id`, `/rsvp/:token`,
  `/invite/:token` — **inchangées**, elles ne dépendent pas de la session.
- **La landing publique** : site des visiteurs, pas de panneau (pas connecté). L'orbe
  n'apparaît que dans l'espace privé.

### 2.6 Rôles

- **owner / planner** : tout, y compris budget, contrats, actions sensibles, réglages.
- **family** : sans budget ni contrats (règle existante), sans réglages du Monde.
- **viewer (invité)** : MONDE (5 dossiers), OUTILS réduits (Musique, Aperçu,
  mini-site), AIDE (question, document), MON COMPTE (profil, carte, déconnexion).

---

## 3. Architecture code

- **Un composant** : `components/AimePanel.tsx` — remplace `CommandBar` + `BottomDock`
  (les deux squelettes fusionnés : la colonne de BottomDock devient le menu global,
  sa zone de contenu devient la zone du panneau).
- **Une source de vérité** : `lib/panel-navigation.ts` — construit le menu (5 sections)
  depuis les briques existantes : `getWorldRowItems` (programme + 7 dossiers),
  `buildWorldMenu` (outils sans dossier), les sections ME de `PortalControls`,
  `UNIVERSAL_CREATE_ACTIONS`, la langue. Un seul endroit où on ajoute une entrée.
- **Un registre de contenu** : `sectionId → module` (réutilise `normalizePanelId` pour
  les 18 panneaux + les sections spéciales `assistant`, `document`, `guide`, `me.*`,
  `settings`, `search`).
- **Un état** : `activeSection` (menu) + `activePanel`/`momentId` (contenu, déjà dans
  `world-nav-state`) — la navigation reste profonde et partageable (deep-link).
- **FR/EN** : tout le menu passe par le dictionnaire existant (les libellés sont déjà
  traduits — travail du lot P2).

Aucune nouvelle donnée, aucun nouvel endpoint.

---

## 4. Plan de mise en œuvre (3 phases, tests à chaque phase)

### Phase 1 — Le squelette unique (~2 j) — ✅ FAIT
1. `AimePanel.tsx` : fondre BottomDock (colonne + contenu) avec le contenu de
   CommandBar (dossiers, fichier, création, réglages, langue, ME) dans la colonne.
2. La colonne MONDE = Le programme + 7 dossiers (compteurs, rôle).
3. L'orbe ouvre ce panneau ; `CommandBar` supprimé.
4. Tests : convertir les suites `world-top-menu*`, `bottomdock`, `commandbar` →
   `aime-panel` (même niveau de couverture : chaque entrée ouvre son module).

**Fait (17/09) :**
- `src/components/AimePanel.tsx` : la fenêtre unique (colonne Monde/Outils/Aide +
  zone de contenu qui réutilise `MondePanel` et les modules existants). Remplace
  BottomDock (fenêtre du Monde) ET CommandBar (panneau d'orbe).
- `src/lib/panel-navigation.ts` : LA source unique du menu (Monde = programme +
  7 dossiers avec compteurs et filtre par rôle ; Outils ; Aide).
- `src/lib/aime-panel-events.ts` : `aime:show-panel` / file d'attente — le Monde
  (ProjectStage) décide, le panneau (monté dans PrivateLayout) exécute.
- Orbe = seule porte d'entrée : `CommandBar.tsx` et `BottomDock.tsx` supprimés.
- `MondePanel` : l'onglet initial de l'Organisation unifiée (Cérémonie/Logistique/
  Équipe) suit le panneau demandé.
- Tests : nouvelle suite `src/components/aime-panel.test.tsx` (8 tests : orbe →
  panneau, dossier dans la même fenêtre, FR/EN, Escape, miroir des périodes,
  recherche, création, retour au Moment) + `src/lib/panel-navigation.test.ts`
  (6 tests : structure, rôles, EN, identifiants historiques). Harnais de
  world-journey / moment-depth / day-of-orchestration montent le panneau.
- Bilan : 539 tests frontend verts (79 fichiers), typecheck et build OK.

### Phase 2 — Absorber la navigation (~1,5 j) — ✅ FAIT
5. Supprimer `WorldTopMenu` + la rangée du cockpit + les icônes œil/loupe.
6. `/assistant` et `/dossiers` → sections du panneau ; les routes deviennent des
   ouvertures de section (deep-links). (Idem `/admin` : page fine qui ouvre la
   section Le Monde.)
7. Recherche unifiée en tête de colonne (trouver / demander / aller).
8. Tests : `world-journey` (le parcours complet passe par le panneau), parcours
   famille/invité (sections masquées).

**Bilan Phase 2** : le cockpit ne contient plus que son contenu (héro + bandeau
participants + timeline) ; `WorldTopMenu.tsx`, `WorldSearch.tsx`,
`WeddingFolders.tsx`, `lib/admin-plan.ts` supprimés ; `Assistant.tsx` /
`Folders.tsx` / `AdminSommaire.tsx` sont des pages fines de deep-link qui
ouvrent le panneau à la section demandée ; le chat AIME s'ouvre dans la zone
de contenu du panneau (item « Poser une question ») ; la recherche unifiée en
tête de colonne croise Moments, éléments (→ panneaux) et la suggestion
« Demander à AIME » ; l'aperçu invité filtre la colonne. 5 tests réécrits
(world-journey, moment-depth, moment-context, assistant-folders + SSR) et 4
nouveaux (chat en panneau, recherche unifiée, curseur de recherche par
deep-link, filtre aperçu invité) : **526 tests frontend verts (75 fichiers)**,
typecheck et build OK.

### Phase 3 — ME, création, cockpit épuré (~1,5 j)
9. Section MON COMPTE : profil, ma carte, mes Mondes, réglages, langue, déconnexion
   (le contenu de PortalControls devient du contenu de panneau).
10. `GlobalCreateCenter` → bouton Créer de la section AIDE.
11. Cockpit = contenu seul (héro + timeline + périodes + accueil Monde neuf).
12. `PortalControls` réduit à son contenu (plus de modale propre) ; tests E2E mis à
    jour (onboarding → premier invité via le panneau).

**Total : ~5 jours.** Chaque phase laisse le site utilisable et les tests verts
(525 tests frontend actuels + ceux convertis).

---

## 5. Points à valider avant de coder

1. **Le panneau est un overlay** (fenêtre au-dessus du Monde, comme aujourd'hui) —
   confirmé par « comme l'autre panneau » ? (L'alternative serait une colonne
   permanente dans le cockpit, plus visible mais plus englobante.)
2. **Les périodes** (Avant / Le Jour J / Après) restent dans le héro + miroir en tête
   de colonne — OK ?
3. **Le bandeau participants** (« ma carte ») : il reste au-dessus du contenu, ou il
   entre aussi dans le panneau (section MON COMPTE) ?
4. **L'orbe reste en bas au centre** (visible, unique) — oui/cela aussi disparaît au
   profit d'un bouton nommé ? *(Recommandation : garder l'orbe, c'est la promesse.)*

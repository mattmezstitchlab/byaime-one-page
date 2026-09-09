# Audit AIME — architecture, navigation, pages et Timelines

Date: 2026-09-09  
Périmètre audité: `artifacts/byaime-onepage/src` (runtime actif)

## A. Inventaire des pages/routes

### Routes publiques

| Route | Page/composant | Rôle actuel | Données principales |
|---|---|---|---|
| `/` | `Landing` | Présentation produit + CTA création/connexion | statique |
| `/guides` | `GuidesPage` | Démonstrations pédagogiques scénarisées | statique (UI simulée) |
| `/concept` | `ConceptLanding` | Vision conceptuelle AIME + CTA | statique |
| `/conditions` | `LegalPage(kind="terms")` | Conditions pilote | statique |
| `/confidentialite` | `LegalPage(kind="privacy")` | Politique de confidentialité | statique |
| `/connexion` (+ alias `/sign-in`) | `AuthPage` + Clerk SignIn | Connexion | Clerk |
| `/creation` (+ alias `/sign-up`) | `AuthPage` + Clerk SignUp | Inscription | Clerk |
| `/invite/:token` | `InvitePage` | Acceptation d’invitation collaboration | `POST /api/invitations/:token/accept` |
| `/rsvp/:token` | `RsvpPage` | Portail invité (RSVP + jour J + partage + musique + après) | `GET/PUT /api/rsvp/:token` + endpoints médias/musique |
| `/profil/:projectId` | `PublicProfilePage` (public) | Profil publié en lecture | `useGetPublicProfile(projectId)` |
| `/le-monde-aime` | `LeMondeAimePage` | Timeline/Map monde simulé (démonstration) | `WorldEngine + DemoProvider` |

### Routes privées (authentifiées)

| Route | Page/composant | Rôle actuel | Données principales |
|---|---|---|---|
| `/app` et `/user-portal` | `Home` → `ProjectStage` si projet, sinon `ComposerHero` | Espace Monde central | `useProject` (WorldProject), API `/api/projects` |
| `/profile` | `ProfilePageWrapper` → `PublicProfilePage privatePreview` | Profil personnel + timeline/fil | `useProject` + `participantLinks` + éventuellement public profile cache |
| `/network` | `NetworkPage` | Carte universelle des sujets/mondes liés | `useListNetworkSubjects` |
| `/laboratoire` | `LaboratoryPage` | Retour produit contextualisé | `/api/projects/:id/laboratory-feedback` |

### Navigation principale actuelle

- Rail privé minimal: **Profil / Monde / Carte / Laboratoire** (`PRIVATE_PRIMARY_NAVIGATION`).
- Dans le Monde (`ProjectStage`), la plupart des fonctions sont des **vues/panneaux contextuels** (`BottomDock`, `WeddingNavigation`) et pas des routes dédiées.

---

## B. Audit de redondance et fragmentation

### Chevauchements fonctionnels observés

1. **Guides vs Landing vs Concept**
   - Les 3 pages expliquent AIME et ses principes, avec recouvrement fort des messages.

2. **Timeline de profil en 2 formes**
   - `PublicProfilePage` = timeline horizontale principale.
   - `ProfileFil` = vue fil éditoriale complémentaire.
   - `ProfileFeed` existe mais n’est pas branché dans le runtime (legacy non utilisée).

3. **Multiplicité des expériences “Monde”**
   - `ProjectStage + UniversalTimeline` (opérationnel produit).
   - `LeMondeAimePage + WorldMap + WorldEngine` (simulation/démo séparée).

4. **Composants legacy non raccordés**
   - `NavBar`, `BottomBar`, `HeroSection`, `ConceptSection`, `UniversesSection`, `TimelineSection` exportés mais non utilisés dans le routing actif.

### Pages pouvant sortir du statut “page autonome”

- `Guides`: forte candidate à intégration partielle (sections Landing + aides contextuelles).
- `Concept`: peut devenir section de Landing (ou bloc Guide) sans perdre le fond.
- `LeMondeAime`: conserver séparée si assumée comme expérience démo, sinon intégrer comme mode “démo” depuis Landing.

---

## C. Audit Timeline (toutes implémentations)

## 1) Socle commun (partagé)
- Modèle temporel commun: `TimelineEvent` + `TimelineRelation` (`lib/types.ts`).
- Graphe relationnel: `buildTimelineIndex`, `filterTimeline`, `auditTimelineConnections`, conflits/propagation (`lib/timeline-graph.ts`).

## 2) Timeline Monde privée (opérationnelle)
- Composant: `UniversalTimeline` dans `ProjectStage`.
- Capacités: tri/filtrage par phase & vue, édition d’événement, liaisons entités, logique de propagation, audit des liens (`TimelineAudit`), lecture (`TimelinePlayback`).
- Données: `project.timeline` + relations vers invités/prestataires/documents/paiements/musique/etc.

## 3) Timeline Profil (horizontale)
- Composant principal: `PublicProfilePage` (canvas horizontal).
- Capacités: zoom, navigation par sections, ouverture de détails/édition, positionnement temporel (`createTimelinePositioner`), projection RSVP (preview privé owner/planner).
- Données: timeline publique API (`useGetPublicProfile`) ou timeline du projet local (`useProject`) en mode privé.

## 4) Timeline “Fil” du profil
- Composant: `ProfileFil`.
- Capacités: lecture orientée “prochaines actions”, tri/priorisation, ouverture d’un moment vers la timeline horizontale.
- Données: endpoint profil fil (`GET /api/projects/:id/profile-fil`).

## 5) Timeline Monde simulée (démo)
- Page: `LeMondeAimePage`.
- Capacités: curseur temporel, scopes spatial/temporel, lecture temps réel simulé, clusters de synchronisation, map + modales.
- Données: provider de démonstration (pas de données réelles projet utilisateur).

## 6) Constat d’architecture Timeline
- **Il existe un socle partagé partiel**, mais aussi des logiques parallèles (profil, monde privé, monde simulé) avec des objectifs UX différents.
- Risque actuel: divergence progressive des comportements temporels si le socle commun n’est pas renforcé.

---

## D. Focus Profil — timeline horizontale

### Question: où en est la timeline horizontale du profil ?

- Présence dans l’interface: **oui** (`/profile` en preview privé, `/profil/:projectId` en public).
- Visibilité: **active** en mode `timeline` (toggle `Timeline / Le Fil`).
- Données réelles:
  - **oui** en privé: `project.timeline` filtrée selon rôle/visibilité.
  - **oui** en public: `useGetPublicProfile(projectId)`.
- Connexion modèle: **oui**, appuyée sur `TimelineEvent`/relations.
- Interactions réelles: **oui** (zoom, navigation sections, ouverture détails, édition en preview privé via `EntityEditor`, jump depuis `ProfileFil`).
- Points incomplets:
  - sections `SECTIONS` coordonnées fixes (sémantique partiellement statique) ;
  - placement “archives/réseau” radial basé sur heuristiques UI ;
  - coexistence avec `ProfileFil` + `ProfileFeed` (non utilisée) => cohérence à clarifier.
- Versions multiples: **oui** (horizontale active + fil actif + feed cinématique non branché).

### Verdict explicite

**TIMELINE HORIZONTALE PROFIL : PARTIELLE**  
Elle est **réellement en production et connectée aux données**, donc ce n’est ni un mock pur ni absente. Elle reste **partielle** car la couche de structuration (sections/positionnement contextuel) est encore mixte (données réelles + construction UI fixe) et coexiste avec d’autres représentations non unifiées.

---

## E. Proposition de navigation (actuelle vs recommandée)

### Tableau de décision

| Page actuelle | Fonction | Conserver | Fusionner | Nouvelle destination | Justification |
|---|---|---:|---:|---|---|
| `/` Landing | Présentation + acquisition | ✅ | ✅ (partielle) | Landing enrichie | Devenir porte d’entrée unique “présentation + compréhension + démos essentielles”. |
| `/guides` | Guide long + démos | ⚠️ | ✅ | Sections Landing + aides contextuelles | Contenu utile mais trop séparé du flux réel. |
| `/concept` | Narratif conceptuel | ⚠️ | ✅ | Section Landing (bloc concept) | Redondant avec Landing/Guides. |
| `/conditions` | Juridique | ✅ | ❌ | inchangé | Page légale autonome nécessaire. |
| `/confidentialite` | Juridique | ✅ | ❌ | inchangé | Page légale autonome nécessaire. |
| `/connexion` `/creation` | Auth | ✅ | ❌ | inchangé | Parcours dédié requis. |
| `/invite/:token` | Invitation collaboration | ✅ | ❌ | inchangé | Flux sécurisé dédié. |
| `/rsvp/:token` | Portail invité | ✅ | ❌ | inchangé (micro-navigation interne) | Flux externe autonome, sans compte, déjà sectionné en une seule page. |
| `/profil/:projectId` | Profil public | ✅ | ❌ | inchangé | URL partageable publique nécessaire. |
| `/profile` | Profil privé | ✅ | ❌ | inchangé (alignement UX avec public) | Espace identitaire structurant. |
| `/user-portal` | Monde opérationnel | ✅ | ❌ | inchangé (hub principal) | Cœur fonctionnel de l’application. |
| `/network` | Carte réseau | ✅ | ⚠️ (liaisons contextuelles) | route conservée + entrées contextuelles | Espace distinct utile, mais doit être mieux relié aux entités Monde/Profil. |
| `/laboratoire` | Feedback contextualisé | ✅ | ⚠️ | route conservée + points d’entrée in-app | Nécessaire, mais peut être davantage contextuel que destination principale systématique. |
| `/le-monde-aime` | Démo mondiale simulée | ⚠️ | ⚠️ | conserver en mode démo explicite | À garder si objectif vitrine; sinon intégrer depuis Landing. |

### Navigation cible recommandée

- **Navigation principale minimale privée**: `Monde` / `Profil` / `Carte` / `Laboratoire` (déjà bonne base).
- **Navigation contextuelle**: continuer via panneaux, drawers, modales, sections dans `ProjectStage` et `Profile`.
- **Public**: Landing enrichie devient la référence “comprendre AIME” + CTA.

---

## F. Audit spécifique Guide/Aide (Options A/B/C/D)

### Option A — Garder Guide indépendant
- Avantage: page dédiée, lisible éditorialement.
- Limite: renforce la fragmentation actuelle (Landing + Concept + Guides).

### Option B — Fusion totale Guide/Aide dans Landing
- Avantage: un seul point d’entrée public fort.
- Limite: risque d’une Landing trop longue si tout est déplacé sans hiérarchie.

### Option C — Guide en aides contextuelles in-app
- Avantage: apprentissage au moment d’usage (meilleure adoption produit).
- Limite: moins efficace seule pour découverte “avant inscription”.

### Option D — Hybride (recommandée)
- **Landing**: compréhension générale + démonstration synthétique.
- **Aide contextuelle**: directement dans Monde/Profil/Carte (AI + info contextuelle + panneaux).
- **Guide autonome massif**: non nécessaire à terme.

**Recommandation**: **Option D** (meilleur équilibre entre simplicité de navigation et richesse fonctionnelle).

---

## G. Risques techniques avant fusion

1. **Couplage rôle/visibilité**
   - Les accès Timeline et données diffèrent selon rôle (`owner/planner/family/viewer`) ; toute fusion doit préserver ces frontières.

2. **Multiplicité des sources de données profil**
   - Profil public (API) vs preview privé (store local + API annexes RSVP).

3. **Écart démo vs production**
   - `LeMondeAimePage` repose sur un moteur simulé différent du Monde utilisateur réel.

4. **Composants legacy présents**
   - Des composants non branchés peuvent brouiller les décisions (ne pas les fusionner sans confirmer l’usage runtime).

5. **Unification Timeline à faire par socle, pas par UI forcée**
   - Mutualiser règles (filtres, positionnement, relations, conflits) sans casser les représentations spécifiques (Monde vs Profil vs démo).

---

## Recommandation d’implémentation progressive (sans suppression massive)

1. **PR 1 — Audit & cartographie (ce rapport)**
   - Aucun changement fonctionnel majeur.
2. **PR 2 — Consolidation Landing / Guide / Concept (Option D)**
   - Rapatrier contenu redondant dans Landing + conserver aides contextuelles.
3. **PR 3 — Socle Timeline commun**
   - Extraire/renforcer primitives partagées (filtres, positioning, règles de visibilité, relations).
4. **PR 4 — Harmonisation navigation contextuelle**
   - Réduire les ruptures de navigation entre Profil/Monde/Carte.
5. **PR 5 — Nettoyage contrôlé**
   - Déprécier puis retirer routes/composants devenus réellement inutilisés après validation.

---

## Résumé exécutif

- 🔴 **Problèmes structurels prioritaires**
  1. Redondance éditoriale Landing/Guides/Concept.
  2. Multiples représentations Timeline non suffisamment gouvernées par un socle commun.
  3. Présence de composants legacy non branchés qui compliquent la lisibilité architecture.

- 🟠 **Éléments à arbitrer**
  1. Place finale de `/le-monde-aime` (démo séparée vs intégrée à la Landing).
  2. Niveau d’autonomie futur de `/guides`.

- 🟢 **Éléments déjà cohérents**
  1. Navigation privée primaire minimaliste (Profil/Monde/Carte/Laboratoire).
  2. Monde opérationnel concentré sur panneaux contextuels plutôt que multiplication des routes.
  3. Flux RSVP autonome bien regroupé dans une seule page multi-sections.

- 🔵 **Opportunités de fusion immédiates**
  1. Fusion éditoriale **Guides + Concept → Landing** (au moins partielle).
  2. Mise en cohérence des aides via points contextuels plutôt que page guide longue.

- 🟣 **État précis des Timelines**
  1. Monde privé (`UniversalTimeline`): opérationnelle, liée au modèle projet.
  2. Profil horizontale (`PublicProfilePage`): **PARTIELLE** (active + data réelle, mais structuration hybride et coexistence multi-vues).
  3. Fil profil (`ProfileFil`): opérationnel, complémentaire.
  4. Feed profil cinématique (`ProfileFeed`): présent mais non branché.
  5. Monde simulé (`LeMondeAimePage`): opérationnel en démo, non branché sur données projet réelles.

- ⭐ **Recommandation finale navigation**
  - Conserver la structure privée actuelle (4 entrées), réduire le public à une Landing enrichie, déplacer le “guide long” vers un modèle hybride (compréhension globale sur Landing + aide contextuelle in-app), puis unifier progressivement les primitives Timeline sans imposer une UI unique.

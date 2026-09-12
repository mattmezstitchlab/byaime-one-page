# Audit — La Timeline Profil comme vue interactive de l'écosystème

Date : 12 septembre 2026
Périmètre : `artifacts/byaime-onepage` — page Profil (`/profile`) et page publique (`/profil/:projectId`)
État : **audit seul, aucune modification de code**

> **État du workspace au moment de cet audit.** Le dépôt est à l'état du
> commit `ae6d103` + les deux commits de documentation. Un correctif du
> placement du fil (échelle élastique + répartition en lignes, validé par 17
> tests) avait été développé et vérifié dans un tour précédent, mais **il n'est
> pas présent dans ce workspace** : `timeline-layout.ts` et `FilTrack.tsx`
> n'existent pas, et `PublicProfile.tsx` utilise toujours
> `createTimelinePositioner`. Cet audit décrit donc le code **tel qu'il est
> ici**, et signale le bug de placement comme présent.

> Toutes les mesures ci-dessous ont été produites sur le dépôt, en exécutant le
> vrai code (`parseIntention` → `createInitialProject` → `buildTimelineIndex` →
> `auditTimelineConnections`) sur une intention réelle :
> *« Notre mariage le 14 août 2027, près de Lille, 120 invités, budget 30000 euros. »*
> Commandes en annexe.

---

## 1. Réponses aux sept questions

### Q1 — Quelle Timeline est utilisée sur la page Profil ?

**Une seule page, deux chemins de données, et déjà deux modes de lecture.**

| Route | Composant | Données |
|---|---|---|
| `/profile` (`App.tsx:349`) | `PublicProfilePage privatePreview` | projet local complet, **relations incluses** |
| `/profil/:projectId` (`App.tsx:356`) | `PublicProfilePage` | `GET /api/public/profiles/:id`, **relations absentes** |

À l'intérieur, un interrupteur `viewMode: "timeline" | "fil"` (`PublicProfile.tsx:205`) :
- **`timeline`** = le fil horizontal : un canvas figé à `5600 × zoom` px, repères placés par `createTimelinePositioner` (échelle **linéaire** 1100→2900, `PublicProfile.tsx:268-274`) ;
- **`fil`** = `ProfileFil`, une grille de cartes de recommandation (rien à voir avec le fil horizontal malgré le nom).

À noter : la Timeline **verticale** `UniversalTimeline` (496 lignes, scènes plein écran) vit sur `/user-portal` (`ProjectStage.tsx:755`), pas sur le Profil. **Il existe donc déjà deux rendus de la même Timeline.** C'est le point de vigilance n°1 de cet audit.

### Q2 — Quelles données sont déjà disponibles ?

Mesuré sur le projet réel créé ci-dessus :

| Donnée | Quantité |
|---|---|
| Moments | **51** |
| Invités / Prestataires / Équipe / Tables | 6 / 5 / 3 / 3 |
| Musiques / Souvenirs | 4 / 4 |
| Moments avec `durationMinutes` | **24 / 51** |
| Moments avec `endTime` | **0 / 51** |
| Moments avec `location` | **1 / 51** (un seul lieu distinct : « Domaine ») |
| Moments avec `visual` (média réel) | **0 / 51** |
| Musiques liées à un Moment | **2 / 4** |
| Moments `visibility: "audience"` | **0 / 51** |

Champs de `TimelineEvent` réellement exploitables : `time`, `endTime?`,
`durationMinutes?`, `kind`, `title`, `detail?`, `location?`, `responsible?`,
`vendor?`, `status`, `confidence`, `phase`, `relations?`, `resources?`,
`visibility?`, `visual?`, `audience?`.

### Q3 — Existe-t-il déjà des relations ?

**Oui, et la machinerie de graphe est déjà écrite.** C'est la bonne nouvelle de cet audit.

| Mécanisme | Fichier | Ce qu'il donne déjà |
|---|---|---|
| `buildTimelineIndex` | `timeline-graph.ts:19-41` | `entities`, `events`, **`reverse` : entité → ses Moments** |
| `auditTimelineConnections` | `timeline-graph.ts:212-222` | `connected`, `isolated`, `dangling` |
| `PANEL_FOR_KIND` | `wedding-navigation.ts` (fin) | entité → panneau qui l'édite |
| `ENTITY_KIND_LABELS` | `timeline-graph.ts:231-243` | les 11 libellés FR |
| `findTimelineConflicts` | `timeline-graph.ts:77-91` | **chevauchements** par personne / prestataire / ressource partagée |
| `MusicTrack.timelineEventIds` | `types.ts:154`, maintenu en propagation (`timeline-graph.ts:50,65`) | musique ↔ Moments, dans les deux sens |
| `participantLinks` | store + `guestArrivals` | vraies réponses RSVP horodatées, déjà sur le fil |

`TimelineRelation = { kind: TimelineEntityKind; id: string; role?: string }`,
avec 11 `kind` : guest, table, provider, task, payment, document, music, team,
message, logistics, memory.

**Mais le graphe est squelettique.** Mesure exacte :

```
Relations déclarées : 17
Moments avec ≥ 1 relation : 10 / 51   (20 %)
Entités résolues : 13
Relations dangling (id introuvable) : 0        ← intégrité saine
Entités ISOLÉES (aucun Moment) : 40
  par type : guest 5, task 9, logistics 9, memory 3, document 3,
             table 2, payment 2, music 2, team 2, message 2, provider 1
Relations par type : provider 7, guest 2, message 2, music 2,
                     task 1, team 1, table 1, memory 1
```

> **Il y a 2 relations « invité » pour 51 Moments.** Les vignettes
> `👤 👤 👤 👤 👤 👤 +42` de votre exemple ne peuvent pas être produites
> aujourd'hui à partir de données réelles — et vous avez explicitement interdit
> d'en inventer. C'est le cœur du sujet.

### Q4 — Que peut-on ajouter en réutilisant l'existant ?

Beaucoup, et sans nouvelle architecture :

| Votre demande | Déjà disponible |
|---|---|
| « Cliquer sur une personne → relire la Timeline à travers elle » | `buildTimelineIndex().reverse` donne **exactement** ça, gratuitement |
| « Filtrer par prestataire, voir son empreinte temporelle » | idem, `reverse` sur `kind: "provider"` |
| « Chevauchements éventuels » (§5) | `findTimelineConflicts` — **écrit, testé, jamais branché sur le fil** |
| « Signaler les données à confirmer » (§11) | `confidence` + `provenance`, déjà peuplés (`"suggere"` / `"suggested"` par défaut dans `seed-data.ts`) |
| « Aperçu réel d'un média » (§8) | `event.visual: WorldVisual { kind, url, overlay }` + `MusicTrack.external.{artworkUrl, previewUrl, trackUrl}` |
| Vignettes | `src/components/ui/avatar.tsx` (49 l., Radix, **orphelin**) |
| Carte légère au clic | `ContextPanel` — déjà le patron du tiroir de Moment |
| Filtrage par rôle | `canRoleSeeTimelineEvent` (`profile-visibility.ts`), `computeVisibilityModel` |
| Placement des repères | `createTimelinePositioner` (`profile-timeline-position.ts`, 3 tests) — **mais linéaire, donc à remplacer** : voir §Risques |

À noter : `filterTimeline` (`timeline-graph.ts:200-211`) possède déjà des vues
`person: ["guest","team"]` et `provider: ["provider"]`. **C'est votre §3 et §4 —
mais filtré par *type*, pas par *identité*, et implémenté comme une destination
plutôt que comme une lentille.**

### Q5 — Quelles données manquent réellement ?

Six manques, classés par gravité :

1. **La densité de relations.** 10 Moments sur 51. Rien d'autre ne compte tant
   que celui-là n'est pas traité : toute l'interface demandée s'appuie dessus.
2. **Aucune projection publique des relations.** `publicProfile.ts:3-18`
   définit une liste blanche de 14 champs — **`relations` n'y est pas**.
   Sur `/profil/:projectId`, il n'y a donc structurellement ni personne, ni
   prestataire, ni média à afficher.
3. **Le profil public est vide par défaut.** `publicEvent()` exige
   `visibility === "audience"`, or `baseEvent.visibility = "equipe"`
   (`seed-data.ts`) → **0 Moment éligible sur 51**. Publier son Monde affiche
   aujourd'hui une Timeline vide.
4. **Aucune entité « lieu ».** Le lieu n'existe que sous trois formes
   hétérogènes : texte libre `location` (1/51), `venue: Fact<string|null>`, et
   `ProviderCategory "lieu"`. « Cliquer sur un lieu → ses Moments » n'est pas
   possible en l'état.
5. **`endTime` jamais renseigné** (0/51). L'heure de fin doit être dérivée de
   `time + durationMinutes`, qui n'est présent que sur 24 Moments sur 51.
6. **Les médias ne connaissent pas leur Moment.** `MemoryItem` n'a ni date ni
   URL ; `StoredFile`/`ParticipantMedia` n'ont aucun lien vers un Moment. Seuls
   `event.visual` (0/51) et `MusicTrack.timelineEventIds` (2/4) existent.

À l'inverse, **ce qui ne manque pas** : aucune photo sur `Guest` ni `Provider`,
mais ce n'est pas un manque — les vignettes en initiales sont honnêtes et
suffisantes. Inventer des avatars violerait votre contrainte.

### Q6 — Qu'est-ce qui serait un doublon ?

| Risque | État |
|---|---|
| Un 3ᵉ rendu de Timeline | **Déjà 2** : le fil horizontal de `PublicProfile` et `UniversalTimeline` (vertical, `/user-portal`). Un troisième serait exactement l'échec que vous décrivez. |
| `ProfileFeed.tsx` | 386 lignes, **composant mort** — seul son type `ProfileTimelineEvent` est importé (`PublicProfile.tsx:18`). C'est un 3ᵉ rendu en attente. À supprimer ou à absorber. |
| Une « Timeline des invités / prestataires » | `filterTimeline` fait déjà `person` et `provider`. Créer des vues dédiées dupliquerait ce mécanisme. |
| Une zone statistiques | `ProjectStage` a déjà un hero avec compteurs (dont 2 qui affichent nécessairement 0, cf. audit du 12/09). Vos indicateurs doivent vivre **dans** le repère, pas à côté. |
| Un graphe de relations | `VisibilityGraph` (169 l.) calcule déjà `computeVisibilityModel`. Le fil doit *mettre en évidence*, pas redessiner un graphe. |

### Q7 — Comment intégrer sans architecture parallèle ?

**Un seul état ajouté, sur le fil existant.** Rien d'autre.

```ts
type FilFocus = { kind: TimelineEntityKind | "place" | "music"; id: string } | null;
```

- `null` → vue globale (état par défaut, retour instantané) ;
- non nul → le fil **reste le même**, seul le rendu change : les Moments liés
  passent au premier plan, les autres s'estompent. Aucune liste filtrée, aucune
  route, aucun composant parallèle.

Les moments liés viennent de `buildTimelineIndex().reverse` — déjà calculé.
Les indicateurs viennent des champs déjà présents. Le placement des repères
reste à refaire (voir §Risques) : l'échelle linéaire actuelle ne survivra pas à
l'ajout de contenu dans les repères.

---

## 2. EXISTANT / RÉUTILISABLE / MANQUANT / RISQUES

### EXISTANT — ce qui fonctionne déjà
- Un fil horizontal unique, avec zoom, défilement piloté et sections — mais un placement **linéaire** (voir §Risques).
- Un graphe entités ↔ Moments complet et **sain** (0 relation dangling).
- La détection de chevauchements (`findTimelineConflicts`), écrite et testée.
- Le système de confiance (`confidence`, `provenance`), peuplé par défaut.
- Le filtrage par rôle (`canRoleSeeTimelineEvent`).
- Les relations déjà *affichées* sur le fil : les pastilles `event.relations.map(...)` avec `title` natif.

### RÉUTILISABLE — à brancher, pas à réécrire
`buildTimelineIndex().reverse` · `findTimelineConflicts` · `confidence`/`provenance` ·
`event.visual` · `MusicTrack.external` + `timelineEventIds` · `participantLinks`
(vraies réponses RSVP horodatées, déjà sur le fil) · `ui/avatar.tsx` ·
`ContextPanel`.

### MANQUANT — les vrais trous
1. Densité de relations (10/51) — **bloquant**
2. `relations` absent de la projection publique — **décision de sécurité**
3. 0 Moment `audience` → profil public vide — **bug produit à part entière**
4. Pas d'entité « lieu »
5. `endTime` jamais renseigné
6. Médias non rattachés aux Moments

### RISQUES
- **Surcharge visuelle — et un bug de placement déjà présent.** Le fil place
  ses repères par une échelle **linéaire** sur 1 800 px (`createTimelinePositioner`).
  Mesuré sur le projet réel ci-dessus (51 Moments, dont 16 le Jour J) :

  | Mesure | Valeur |
  |---|---|
  | Écart minimal entre deux repères du Jour J | **0,03 px** |
  | Écart minimal sur toute la Timeline | **0,03 px** |
  | Paires de repères à moins de 56 px (largeur d'un bouton) | **43 / 50** |
  | Paires à moins de 192 px (largeur d'une étiquette) | **49 / 50** |

  Boutons et étiquettes s'empilent donc au même endroit. Les cartes RSVP de
  176 px (`top:-176px`) retombent en plus sur les étiquettes des Moments
  (−160 à −112), et les pastilles de section (`top-20`, +80 px) chevauchent les
  repères de la rangée basse (+68 à +124).
  **Ajouter des vignettes et des compteurs par-dessus ce placement aggraverait
  le problème au lieu de le résoudre.** Corriger l'échelle est donc un
  prérequis de la Phase 1, pas une option.
- **États vides majoritaires.** Avec 10 Moments liés sur 51, la plupart des
  repères n'auraient rien à montrer → une interface qui a l'air cassée.
- **Données de démonstration prises pour des vraies.** Les invités du seed sont
  `provenance: "suggested"`, `confidence: "suggere"`. Les afficher comme
  participants réels violerait votre contrainte n°11.
- **Troisième système de Timeline.** Le risque principal, et il est déjà à moitié réalisé.

---

## 3. PROPOSITION UX

### Le principe : une lentille, pas une vue

Un seul état `focus`. Le fil ne change jamais de nature, seulement de relief.

```
Vue globale ──clic sur une personne──> Fil recentré (mêmes repères, mêmes places)
     ^                                          │
     └────────── « Vue globale » ───────────────┘
```

Aucune route, aucun composant parallèle, retour instantané.

### Densité progressive — calée sur les données qui existent vraiment

**Niveau 1 — au repos.** Un repère n'affiche que ce qui est renseigné :

```
14:00 ─ 15:30   Cérémonie
                ⏱ 1 h 30 · 📍 Domaine · ⚠ chevauche « Cocktail »
```

- plage horaire dérivée de `time` + `durationMinutes` (sinon l'heure seule) ;
- `📍` seulement si `location` existe (1/51 aujourd'hui) ;
- `⚠` seulement si `findTimelineConflicts` remonte quelque chose ;
- un liseré discret si `confidence === "suggere"` → « à confirmer ».

**Aucun compteur à zéro.** C'est la règle qui évite l'effet tableau de bord.

**Niveau 2 — au survol.** Vignettes en initiales (max 5 + `+N`), prestataires,
médias. Chaque élément porte son `confidence`. Une entité `suggested` est
visuellement distinguée d'une entité confirmée.

**Niveau 3 — au clic.** La lentille se pose. Le fil s'estompe sauf les Moments
liés. Un bandeau unique : *« Camille Petit · 4 moments · Vue globale »*.

### Ce que je recommande de faire AVANT les vignettes

Votre §2 (les personnes dans les Moments) est la demande la plus visible et la
moins servie par les données : **2 relations invité pour 51 Moments**. La
construire maintenant, c'est construire une interface vide.

L'ordre que je propose inverse la logique — **rendre la densité visible avant
de la mettre en scène** :

- **Préalable — Corriger le placement du fil.** Tant que l'échelle est linéaire
  (écart minimal mesuré : 0,03 px), aucun contenu supplémentaire ne peut être
  ajouté aux repères : il s'empilerait. C'est un prérequis technique, pas une
  fonctionnalité. Deux mécanismes suffisent : une échelle à plancher (les grands
  écarts gardent leur proportion, les minuscules sont élargis) et une
  répartition en lignes (deux étiquettes d'une même ligne ne se chevauchent
  jamais). J'ai implémenté et testé cette correction dans un tour précédent
  (17 tests) ; elle n'est pas dans ce workspace et est à reprendre.
- **Phase 0 — Rendre le graphe lisible (le déblocage).** `auditTimelineConnections`
  calcule déjà `isolated` : 40 entités sans Moment. Exposer cette liste *depuis
  le fil* (« 40 éléments du Monde ne sont rattachés à aucun moment ») transforme
  le manque en parcours de saisie. Chaque rattachement enrichit immédiatement
  tous les niveaux. Aucune donnée inventée.
- **Phase 1 — Ce qui existe déjà à 100 %.** Plage horaire, durée, conflits,
  confiance, musiques liées (2/4), `event.visual`. Zéro dépendance aux relations.
- **Phase 2 — Les personnes et prestataires**, une fois la Phase 0 passée.
  Lentille par identité via `reverse`.
- **Phase 3 — Le lieu**, qui demande une vraie décision de modèle (voir ci-dessous).
- **Phase 4 — Le public**, qui demande la décision de sécurité sur `relations`
  **et** la correction du bug des 0 Moment `audience` : en l'état, publier son
  Monde affiche une Timeline vide.

### Deux décisions à trancher avant d'implémenter

1. **Le lieu.** Trois options : (a) promouvoir `location` en entité `place` avec
   sa collection dans `WorldProject` — propre, mais touche `types.ts`,
   `project-migration.ts`, `parser.ts`, `ENTITY_KIND_LABELS`, `PANEL_FOR_KIND` ;
   (b) regrouper par chaîne `location` identique — zéro migration, mais fragile ;
   (c) s'appuyer sur `ProviderCategory "lieu"` — réutilise l'existant, mais un
   lieu n'est pas un prestataire. **Ma recommandation : (b) pour tester, (a) si
   la lecture par lieu se révèle centrale.** Le contenu étant en JSONB, (a) ne
   demande aucune migration destructive.
2. **Les relations sur la page publique.** Ajouter `relations` à la liste
   blanche de `publicProfile.ts` exposerait des identifiants d'invités et de
   prestataires à tout visiteur du profil publié. **Ma recommandation : ne pas
   le faire.** Sur le public, afficher des *comptes* (« 126 participants ») et
   jamais d'identités, et traiter d'abord le bug des 0 Moment `audience`.

---

## Annexe — commandes de vérification

```bash
# Quel composant, quelles routes
grep -n "Route path=\"/profile\"\|Route path=\"/profil" artifacts/byaime-onepage/src/App.tsx

# La projection publique et sa liste blanche (relations absente)
sed -n '1,40p' artifacts/api-server/src/lib/publicProfile.ts

# Les primitives de graphe réutilisables
sed -n '19,41p;77,91p;200,222p' artifacts/byaime-onepage/src/lib/timeline-graph.ts

# Mesures sur un projet réel (parseIntention -> createInitialProject -> audit)
# exécuté via vitest, fichier temporaire supprimé après :
#   51 Moments · 17 relations · 10 Moments liés · 40 entités isolées · 0 dangling
#   24/51 durées · 0/51 endTime · 1/51 location · 0/51 visual · 2/4 musiques liées
#   0/51 visibility "audience"

# Placement réel du fil (createTimelinePositioner appliqué au même projet) :
#   16 Moments le Jour J · écart minimal 0,03 px · 43/50 paires < 56 px
#   49/50 paires < 192 px

# Le seed : visibilité et confiance par défaut
sed -n '/const baseEvent/,/};/p' artifacts/byaime-onepage/src/lib/seed-data.ts
```

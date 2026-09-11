# Audit des erreurs du site AIME — 11 septembre 2026

**Périmètre :** site en ligne `https://www.byaime.fr/` + dépôt `byaime-one-page` (frontend `artifacts/byaime-onepage`, API `artifacts/api-server`, spec OpenAPI, libs `aime-domain` / `api-client-react` / `api-zod`).

**Méthode :** lecture des pages publiques en ligne (rendu réel), analyse statique du code, puis vérification technique locale (typecheck, tests unitaires, builds). Les points marqués « à vérifier » nécessitent un accès authentifié ou un navigateur (console JS), indisponibles dans ce contexte.

---

## 1. Verdict

Le site tourne, l'authentification et la landing sont fonctionnelles, et **aucune erreur de compilation ni de test n'existe actuellement** (voir §4). En revanche, on relève plusieurs **copies de travail publiées en production**, des **incohérences de langues/métadonnées**, un **composant 404 d'atelier**, et du **code mort**. La suppression de la « map réseau » (demandée) est **terminée et validée**.

**Résumé des corrections déjà effectuées dans cette session :**
- Suppression complète de la « map réseau » (`/network` → « Carte universelle ») côté frontend, backend et contrats.
- Suppression des dépendances inutilisées `leaflet` / `@types/leaflet`.
- Mise à jour des copies publiques (`/guides`) qui référençaient encore la « Carte ».

**Deuxième passe de corrections (à la demande de l'utilisateur) :**
- ✅ Barre de navigation horizontale du Monde Mariage remontée **tout en haut** et rendue **sticky** (`ProjectStage.tsx` : `<nav>` déplacé avant le hero, `sticky top-0`).
- ✅ Copie de chantier du hero réécrite (« L’ancien esprit connexion » / « avant de retrouver toute la landing » retirés).
- ✅ `index.html` : `lang="fr"`, attribut `className` invalide retiré, titre + descriptions (meta/OG/Twitter) alignés sur le positionnement mariage.
- ✅ Double `<h1>` corrigé sur la landing (le second passe en `<h2>`).
- ✅ Page 404 refaite : français, thème sombre, lien de retour.
- ✅ Page Confidentialité : « stockage privé de Replit » → « stockage objet privé (Google Cloud Storage) ».

**Troisième passe de corrections (nettoyage code mort & robustesse) :**
- ✅ Suppression de la page orpheline `/le-monde-aime` (`LeMondeAime.tsx` + `WorldMap.tsx` + `lib/world-model/*`), ainsi que la dépendance `maplibre-gl` (bundle allégé : CSS 291→203 Ko, JS ~1 Mo→963 Ko, plus de chunk worker).
- ✅ Suppression de la route orpheline `/concept` et du composant `ConceptLanding` (ancienne landing alternative).
- ✅ Suppression du composant mort `BottomBar.tsx` (jamais importé).
- ✅ Dédoublonnage du DOM de `/guides` : le sélecteur de démos est désormais une liste unique responsive (plus de rendu double desktop/mobile).
- ✅ Retrait de `maximum-scale=1` du `viewport` (zoom utilisateur ré-autorisé, WCAG 1.4.4).
- ✅ Fusion `/app` → `/user-portal` : `/app` devient une redirection vers `/user-portal`, et `/` redirige les connectés directement vers `/user-portal`.
- ✅ Isolation des accès `document`/`localStorage`/`window` hors du niveau module (`App.tsx`), avec garde `typeof window !== "undefined"` (compatible pré-rendu/SSR).
- ✅ Dates légales centralisées en une constante `LEGAL_VERSION_DATE` (`Legal.tsx`).

---

## 2. Suppression de la map réseau — périmètre réalisé

| Élément | Action |
|---|---|
| `src/pages/Network.tsx` (page « Carte universelle ») | supprimé |
| `src/components/UniversalMap.tsx` (carte MapLibre) | supprimé |
| `src/components/UniversalPersonGrid.tsx` (code mort lié) | supprimé |
| `src/lib/universal/{map-subjects,network-navigation,people-grid}.ts` + tests | supprimés |
| Route `/network` + import dans `App.tsx` | supprimés |
| Entrée « Carte » de la navigation privée (`private-navigation.ts`) | supprimée |
| Références `network` dans `CommandBar`, `GlobalCreateCenter`, `PrivateLayout`, `LaboratoryCenter`, `PortalControls`, `laboratory.ts` | supprimées |
| Liens `/network` (ex-« Registre ») dans `ProjectStage.tsx` | remplacés par la vue « Personnes » interne / texte neutre |
| Copie `/guides` (« Profil, Monde et Carte » → « Profil, Monde et Laboratoire ») | mise à jour |
| Endpoint API `GET /network/subjects` (`aime.ts`) + `networkProjection.ts`/`.test.ts` | supprimés |
| Spec OpenAPI (`/network/subjects` + schémas `NetworkSubject`, `NetworkProjection`, …) | supprimés |
| Types domaine `MapSubject`, `AuthorizedMapSubject`, `NetworkProjection`, `LegacyTrace` (`aime-domain`) | supprimés |
| Clients générés (`api-client-react`, `api-zod`) | régénérés (orval) |
| Dépendances `leaflet` + `@types/leaflet` | retirées du `package.json` + lockfile |

**Conservé volontairement :**
- La section « Réseau » du **Profil** (`PublicProfile.tsx`, `x: 5000`) : c'est la constellation des invités sur la Timeline du profil (cercle social), **pas** une carte géographique — conservée car c'est une fonctionnalité (affichage des invités du Monde).
- Les niveaux de visibilité `network` du domaine (`types.ts`, `capabilities.ts`, `sound-policy.ts`) : concept de partage (visibilité « réseau »), indépendant de la carte.

---

## 3. Bugs constatés sur le site en ligne

### 3.1 Page d'accueil (`/`)
1. **Copie de travail publiée (P0).** ~~Le hero affichait encore « L’ancien esprit connexion » / « avant de retrouver toute la landing actuelle »~~ → **✅ corrigé** (copie réécrite dans `App.tsx`, composant `Landing`).
2. **Deux `<h1>` sur la même page** : « AIME » (hero d'entrée) puis « AIME accompagne votre mariage… » (section suivante). Mauvais pour le SEO et la hiérarchie sémantique.
3. **Deux hero empilés** : une « porte d'entrée » plein écran puis la landing mariage complète. Le parcours « entrée claire avant la landing » semble être un état transitoire non finalisé.
4. **Bouton dupliqué** : « Créer mon espace » / « Se connecter » apparaissent dans le header ET dans le hero (doublon d'action, mineur).

### 3.2 `/guides`
5. **Contenu dupliqué dans le DOM (P3).** Les 4 titres de démos (« Un seul système… », « Créer un Monde », « Les Rôles et Frontières », « AI · + · ME ») sont rendus **deux fois** : une fois par le sélecteur desktop (`hidden lg:block`) et une fois par le sélecteur mobile. Les deux sont présents dans le HTML (un est masqué en CSS) : doublon pour les robots et lecteurs d'écran.

### 3.3 `/conditions` et `/confidentialite`
6. **Date figée en dur (P2)** : « Version pilote · 8 septembre 2026 » — devra être maintenue manuellement, risque de péremption.
7. **Contradiction sur le stockage des fichiers (P1).** ~~La page Confidentialité indiquait « le stockage privé de Replit »~~ → **✅ corrigé** : remplacé par « un stockage objet privé (Google Cloud Storage) », conforme à `objectStorage.ts` (`@google-cloud/storage`).

### 3.4 `/le-monde-aime`
~~8. **Page orpheline (P2)** : aucune page ne pointe vers `/le-monde-aime`.~~ → **✅ corrigé** : la page, sa carte `WorldMap` et le module `world-model` (démo simulée) ont été supprimés, ainsi que la dépendance `maplibre-gl`.

---

## 4. État de validation technique (après modifications)

| Vérification | Résultat |
|---|---|
| Typecheck complet (`corepack pnpm run typecheck`) | ✅ réussi (libs + e2e + api-server + byaime-onepage + mockup-sandbox + scripts) |
| Tests `byaime-onepage` | ✅ 18 fichiers / **76 tests** |
| Tests `api-server` | ✅ 10 fichiers / **35 tests** |
| Build `api-server` (esbuild) | ✅ réussi |
| Build `byaime-onepage` (vite) | ✅ réussi (3111 modules) |

> Note d'outillage : le script `pnpm --filter @workspace/api-spec run codegen` exécute correctement orval, mais sa seconde étape `pnpm -w run typecheck:libs` échoue dans cet environnement (`pnpm` absent du PATH ; utiliser `corepack pnpm`). Le typecheck a été relancé manuellement avec succès.

---

## 5. Erreurs / défauts dans le code (analyse statique)

### 5.1 `index.html` (SEO / validité)
10. **`<html lang="en">` (P0)** : tout le contenu est en français → **✅ corrigé** (`lang="fr"`).
11. **Attribut invalide (P2)** : `<html className="dark bg-[#0a0a0a]">` — **✅ corrigé** (attribut retiré).
12. **Métadonnées obsolètes (P1)** : ~~« Douze mondes, une seule ligne de temps »~~ → **✅ corrigé** (titre + description/OG/Twitter alignés sur le mariage).
13. **Pas d'`og:image` ni de `canonical`**, `twitter:card = summary_large_image` sans image associée.

### 5.2 Page 404 (`src/pages/not-found.tsx`)
14. **Page d'atelier en production (P1)** : ~~« 404 Page Not Found » / « Did you forget to add the page to the router? »~~ → **✅ corrigé** (page 404 refaite en français, thème sombre, lien de retour à l'accueil).

### 5.3 Code mort / routes orphelines
15. ~~**`BottomBar.tsx` (P3)** : composant jamais importé~~ → **✅ supprimé**.
16. ~~**Route `/concept` + `ConceptLanding` (P2)** : ancienne landing alternative orpheline~~ → **✅ supprimés**.
17. ~~**Routes `/app` et `/user-portal` redondantes**~~ → **✅ fusionnées** : `/app` redirige vers `/user-portal`.
18. **Alias `/sign-in`, `/sign-up`** en plus de `/connexion`, `/creation` (deux jeux d'URL d'auth ; mineur, utile pour Clerk).

### 5.4 Robustesse
19. ~~**Accès `document`/`localStorage`/`window` au niveau module de `App.tsx` (P2)**~~ → **✅ isolés** derrière des gardes `typeof window !== "undefined"` (compatible pré-rendu/SSR).
20. **`InvitePage` / `RsvpPage` utilisent des `fetch('/api/…')` directs** au lieu du client généré OpenAPI — dérive de contrat déjà signalée dans `docs/blocages-actuels-et-personnalisation-visuels.md`.
21. ~~**`maplibre-gl` (~1 Mo + worker 484 Ko)** chargé uniquement pour la démo `/le-monde-aime`~~ → **✅ supprimé** avec la démo (bundle allégé).

---

## 6. SEO & accessibilité

- ~~`lang="en"` sur contenu français~~ → **✅ corrigé** (`lang="fr"`).
- ~~`viewport` avec `maximum-scale=1` empêche le zoom utilisateur (WCAG 1.4.4)~~ → **✅ corrigé** (`maximum-scale` retiré).
- ~~Double `<h1>` sur la landing~~ → **✅ corrigé**.
- `robots.txt` minimaliste (`Allow: /`), pas de référence de sitemap. `sitemap.xml` **à vérifier** (non testable depuis cet environnement).
- Icônes/boutons : les boutons interactifs ont des `aria-label` cohérents (ex. `ActionCenter`). Bon point général, mais vérifier les contrastes (`text-foreground/40` et `opacity-55` très faibles) sur les petits libellés.

---

## 7. Données, sécurité et conformité

- ~~**Confidentialité vs réalité de stockage** (Replit vs GCP App Storage)~~ → **✅ corrigé** (mention GCP alignée).
- L'endpoint `/network/subjects` (lecture de la projection multi-mondes) a été **supprimé** : réduction de surface d'exposition — cohérent avec le retrait de la carte.
- Rappel déjà documenté dans `docs/audit-fonctionnel-complet.md` : une partie des routes n'est pas décrite dans OpenAPI, et le frontend mêle client généré et `fetch` directs. Le `codegen` de cette session a resynchronisé les types `api-zod` manquants (`aimeLocal*`) — la dérive OpenAPI reste à réduire côté routes.

---

## 8. Priorisation et recommandations

| Priorité | Action |
|---|---|
| **✅ P0 (fait)** | `lang="fr"` · hero d'accueil réécrit · titre + meta description/OG corrigés. |
| **✅ P1 (fait)** | page 404 refondue · mention « stockage privé de Replit » → GCP · route `/concept` supprimée · date « Version pilote » centralisée en constante. |
| **✅ P2 (fait)** | `BottomBar.tsx` supprimé · `/le-monde-aime` + `maplibre-gl` supprimés · `<html className>` corrigé · accès `document`/`localStorage` isolés hors du module. |
| **✅ P3 (fait)** | sélecteurs de `/guides` dédoublonnés · `maximum-scale=1` retiré · `/app` et `/user-portal` fusionnés. |
| **Restant (décorrélé de la map)** | `robots.txt`/`sitemap` · `og:image`/`canonical` · dérive OpenAPI des `fetch` directs (`InvitePage`/`RsvpPage`) · contrastes des petits libellés · alias d'URL d'auth `/sign-in` `/sign-up`. |

---

## 9. Point d'attention pour la suite

La « map réseau » (`/network`), la page `/concept` et la démo `/le-monde-aime` (carte mondiale MapLibre) sont intégralement retirées. Restent deux éléments contenant le mot « réseau » qui ne sont **pas** la carte et ont été **conservés volontairement** :
- la section « Réseau » du Profil — constellation des invités du Monde sur la Timeline (`PublicProfile.tsx`, x=5000) : c'est une fonctionnalité d'affichage, pas une carte géographique ;
- les niveaux de visibilité « réseau » du domaine (`types.ts`, `capabilities.ts`, `sound-policy.ts`) — concept de partage.

Les points restants (voir tableau §8) sont indépendants de la carte : `og:image`/`canonical`, `sitemap`, dérive OpenAPI des `fetch` directs et contrastes de petits libellés.

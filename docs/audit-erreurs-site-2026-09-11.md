# Audit des erreurs du site AIME — 11 septembre 2026

> État au 11/09/2026, après dix passes de correction. §1 à §4 : constats et validation technique · §2 bis et §2 ter : les deux demandes de cette session (retrait du Laboratoire, accueil avec champ de saisie) · §5.5 : bugs relevés et corrigés · §8 : priorités et recommandations non appliquées.

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

**Quatrième passe (UX des panneaux + SEO) :**
- ✅ Chaque panneau (`CenteredBlock`) affiche désormais un **fil d'ariane** et la **navigation de la page** d'où il a été ouvert, via un contexte partagé `PanelChrome` : Monde Mariage (`ProjectStage`) expose ses sections, Profil (`PublicProfile`) expose Identité/Histoire/Archives/Réseau, et l'espace privé (`PrivateLayout`) expose la navigation globale Profil/Monde/Laboratoire en repli.
- ✅ `og:image`, `og:url`, `og:site_name`, `canonical` et `twitter:image` ajoutés à `index.html`.
- ✅ `public/sitemap.xml` créé (routes publiques uniquement) + référence `Sitemap:` dans `robots.txt`.

**Cinquième passe (page Guides enrichie) :**
- ✅ La page `/guides` passe de 4 à **18 tutoriels**, répartis en **4 thèmes** (Comprendre AIME · Organiser le mariage · Le Jour J · Après & vous).
- ✅ Même moteur d'animations (auto-lecture, transitions flou, curseur spring, progression) et même style visuel.
- ✅ Refactor : `FakeUI` déplacés dans `src/pages/guides-fake-uis.tsx`, données des tutoriels dans `src/pages/guides-demos.tsx`, page dans `Guides.tsx` avec sélecteur groupé par thème.
- ✅ Nouveaux tutoriels ancrés sur le comportement réel de l'app (phases Avant/Jour J/Après, rôles & capacités, statuts RSVP/musique, envoi après confirmation, AIME LOCAL, etc.).

**Sixième passe (finir le Monde Mariage — outils de pilotage) :**
- ✅ **Graphe de visibilité** (`VisibilityGraph.tsx` + `computeVisibilityModel` dans `timeline-graph.ts`) : le Monde en graphe SVG (Moments reliés aux entités), avec sélecteur de rôle (Propriétaire/Planificateur/Proche/Invité) qui masque ce qui dépasse les frontières de chaque rôle (finances/documents réservés, non relié à un Moment public pour l'invité). Accessible depuis la barre du Monde et depuis un Moment.
- ✅ **Synthèse du Monde** (`WorldOverview.tsx`) : budget engagé, progression, invités/RSVP, prestataires, souvenirs, prochains Moments et alertes de conflits (`findTimelineConflicts`), chaque carte ouvrant le panneau correspondant.
- ✅ **Aperçu invité** : bascule dans la barre du Monde qui rejoue la navigation et les contenus avec les capacités du rôle invité (finances et progression masquées).
- ✅ **Menu contextuel d'un Moment** (`UniversalTimeline` EventDrawer) : liste « Relié à ce Moment » avec saut vers le panneau correspondant (invités, budget, plan de table, musique…) + bouton « Graphe de visibilité ».
- ✅ Tests unitaires du modèle de visibilité (`visibility.test.ts`, 4 tests).

**Septième passe (polissage + page Guides complète) :**
- ✅ **Graphe de visibilité cliquable** : les éléments visibles s'ouvrent d'un clic dans leur panneau (mapping partagé `PANEL_FOR_KIND` dans `wedding-navigation.ts`).
- ✅ **Recherche transverse** (`WorldSearch.tsx`) : bouton « Rechercher » dans la barre du Monde, traverse personnes, prestataires, tâches, documents, musique, messages et Moments, chaque résultat s'ouvrant dans son panneau (ou son Moment).
- ✅ **Page Guides à jour** : 2 nouveaux tutoriels (« Le Graphe de visibilité », « La Synthèse du Monde ») → **20 tutoriels** au total, avec FakeUIs fidèles (tableau de bord + graphe rôle par rôle).

**Huitième passe (retrait complet du « Laboratoire ») :**
- ✅ Le Laboratoire est supprimé **de bout en bout** — page, écran central, brief guidé, routes, navigation, actions, API, schéma de base, tutoriel, docs, et le contrôle CI correspondant (voir §2 bis). Ce n'est pas un masquage : plus aucun écran du site ne propose ce parcours.
- ✅ Conséquence volontaire : l'espace privé (`PrivateLayout`), `PortalControls`, `TimelineAudit`, `WeddingModulesPanel`, `CommandBar`, `GlobalCreateCenter`, `WorldSearch` et la page d'erreur n'offrent plus d'échappatoire « Laboratoire » ; ils renvoient à l'accueil ou au Monde.
- ⚠️ En base, la définition de table a disparu du schéma mais **la table existe toujours** : un `DROP` manuel reste à faire (voir §8).

**Neuvième passe (un seul accueil + champ de saisie dans le hero) :**
- ✅ `/` sert **toujours** la landing qui présente le site, aux visiteurs comme aux membres : la redirection automatique « connecté → `/user-portal` » a été supprimée. Un membre voit simplement les CTA « Accéder à mon espace » / « Gérer mes Mondes ».
- ✅ Le logo/libellé « AIME » est un **lien vers `/` sur toutes les pages** : en-tête de la landing, en-têtes Guides et pages légales, logo de l'espace privé (`private-home-logo`), fil d'Ariane des panneaux, pied de page et écran d'erreur.
- ✅ Le **champ de saisie** demandé est dans le hero, **tout en haut**, avant les CTA : capsule « Choisir l’univers », sur-titre « L’univers d’abord, puis une information à la fois. », aide « Choisissez d’abord l’univers de votre projet. », progression `n/6` et lien « Raconter autrement, en une phrase » (nouveau composant `src/components/LandingComposer.tsx`, détail au §2 ter).
- ✅ L'îlot legacy de la page immersive capturée est supprimé : `HeroSection`, `ConceptSection`, `TimelineSection`, `UniversesSection`, `NavBar` et `store/use-app-store.ts` (compteur d'étapes statique mensonger, libellés d'univers dupliqués). `/user-portal`, accueil privé, est conservé : la capture visait l'ancienne page d'entrée, pas l'espace membre.
- ✅ Le brouillon saisi sur l'accueil est repris sur `/creation` (localStorage) ; envoyée par un membre, l'intention crée réellement son Monde (`createProjectFromIntention`) puis l'amène sur `/user-portal`.
- ✅ Les seuils de validation de l'intention, jusqu'ici différents selon l'écran (5, 10, 10 caractères), sont unifiés dans `MIN_INTENTION_LENGTH = 12` (`src/lib/intention-draft.ts`), partagé par la landing, l'ancienne entrée du premier écran et le store.
- ✅ Tests ajoutés : `src/components/landing-composer.test.tsx` (6 tests : rendu, phrase composée, normalisations lieu/budget/invités, seuils) et `src/pages/landing.test.tsx` (5 tests : position du champ dans le hero, unicité du `<h1>`, logo → `/`, CTA visiteur vs membre, absence de « Laboratoire », liens du pied de page).

**Dixième passe (robustesse, SEO technique, performance, accessibilité) :**
- ✅ Clé Clerk absente : un **`throw` au chargement du module** produisait une page blanche que l'`ErrorBoundary` ne pouvait pas capter → remplacé par un écran `MissingAuthKey` explicite, plus un `console.error` nommant la variable d'environnement manquante.
- ✅ `installAnalytics()` (`src/lib/analytics.ts`) : le script de mesure (umami) est réellement injecté si `VITE_UMAMI_SRC` **et** `VITE_UMAMI_WEBSITE_ID` sont fournis. Avant ce correctif, `trackEvent` empilait des événements dans le vide : **aucune mesure d'audience n'était chargée**.
- ✅ Bascule d'apparence (`AppearanceToggle`) ajoutée sur `/guides` et sur les pages légales : seules pages publiques sans choix de thème, alors que `localStorage.aime-appearance` pilote tout le site.
- ✅ Script inline **anti-flash** de thème + `background-color` sur `body` dans `index.html` ; polices Google en `preconnect` + feuille de style (plus de `@import` bloquant dans le CSS) : le premier rendu n'attend plus la typographie.
- ✅ `src/lib/page-meta.ts` : **titre, meta description et `<link rel="canonical">` par route** (accueil, Guides, Conditions, Confidentialité, 404). Le `canonical`/`og:url` figés sur `/` sont corrigés pour les pages secondaires.
- ✅ `robots.txt` : désindexation des routes privées (`/user-portal`, `/profile`, `/app`, `/invite/`, `/rsvp/`, `/profil/`, `/api`) + `Sitemap:` ; `sitemap.xml` restreint aux pages publiques indexables (`/creation` et `/connexion` retirés).
- ✅ `MotionConfig reducedMotion="user"` à la racine : le réglage système « animations réduites » est respecté par framer-motion (animations inline), plus seulement par le CSS (WCAG 2.3.3).
- ✅ `og:image` : une vraie image **1200×630** `/og-cover.jpg` (52 Ko) — titre, baseline, URL — avec `og:image:width/height/alt`, `og:locale`, `theme-color`. L'ancienne valeur pointait sur `icon-512.png`, un PNG 816×816 de **560 Ko** jamais référencé ailleurs (retiré du dépôt).
- ✅ Manifeste `/site.webmanifest` + jeu d'icônes (`/icons/icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png`) et `apple-touch-icon` : l'installation écran d'accueil n'existait pas, et la seule icône disponible était onze fois trop lourde.
- ✅ Page Guides : le chiffre « Vingt démonstrations » devient **dynamique** (`DEMOS.length` — 23 démos réellement en ligne) et le CTA « Commencer » pointe vers le chemin canonique `/creation` au lieu de l'alias `/sign-up`.
- ✅ Performance perçue : le tick d'1 s de `ProjectStage`, qui re-rendait **tout le Monde chaque seconde** pour un décompte affiché en jours, n'est à 1 s que pendant le Jour J (1 min sinon).
- ✅ Contrastes : les micro-libellés 10 px de la landing sur fond clair étaient sous le seuil AA (`text-foreground/40`, `/45`) → remontés à `/58`–`/62`, corps de texte `/65` → `/72`.
- ✅ Nettoyage induit par les suppressions : props et imports devenus morts (`EventDrawer.currentRole` dans `UniversalTimeline`, `Sparkles` dans `guides-fake-uis`, `useReducedMotion` non utilisé dans `ProjectStage`) et écriture redondante du thème au niveau module d'`App.tsx` (déjà faite, avec `try/catch`, par le script inline d'`index.html`).

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

## 2 bis. Suppression du Laboratoire — périmètre réalisé

| Élément | Action |
|---|---|
| `src/pages/Laboratory.tsx` (page dédiée) | supprimée |
| `src/components/LaboratoryCenter.tsx` (écran de test complet) | supprimé |
| `src/components/WeddingBrief.tsx` (brief guidé du Laboratoire) | supprimé |
| `src/lib/laboratory.ts` + `laboratory.test.ts` (front) | supprimés |
| `src/store/use-app-store.ts` (libellés d'univers + compteur d'étapes statique) | supprimé |
| Route `/laboratoire` dans `App.tsx` | supprimée |
| Entrée « Laboratoire » de la navigation privée (`private-navigation.ts`) | supprimée |
| CTA « Ouvrir le Laboratoire » de `ComposerHero`, `TimelineAudit`, `ProjectStage` | supprimés (renvoi accueil / Monde) |
| Action « Brief du Jour J » de `WeddingModulesPanel` | supprimée |
| Actions « Laboratoire » de `CommandBar`, `GlobalCreateCenter`, `WorldSearch`, `PortalControls` | supprimées |
| Renvoi « Laboratoire » de `error-boundary.tsx` | remplacé par « Retour à l’accueil » |
| Tutoriel « Le Laboratoire » de `/guides` + son faux écran | supprimés |
| `artifacts/api-server/src/lib/laboratory.ts` + `laboratory.test.ts` | supprimés |
| Routes `POST /laboratory/intentions`, `GET /laboratory/intentions/:id/feedback` (`routes/aime.ts`) | supprimées |
| Tables `aime_laboratory_intents` / `aime_laboratory_feedback` (`lib/db/src/schema/aime.ts`) | définitions retirées — **`DROP` réel à faire en base** (§8) |
| `docs/laboratoire-foundation.md` | supprimé |
| Contrôle « page Laboratoire » de `scripts/verify-vercel.mjs` | retiré (sinon la vérification échouerait définitivement) |

**Non touchés, faux positifs du mot :** tout ce qui contient « collaborat* » — `lib/aime-domain/src/sound-*`, `collaboration-roles.ts`, `timeline-graph.ts`, specs `e2e/*` — n'a aucun rapport. Le mot « Laboratoire » ne subsiste que dans les audits historiques (`docs/audit-fonctionnel-complet.md`, ce document, `artifacts/byaime-onepage/AUDIT_ARCHITECTURE_TIMELINE.md`).

---

## 2 ter. Accueil demandé — ce que fait la page aujourd'hui

**`/`, une seule page pour tout le monde.** En-tête translucide (logo « AIME » → `/`, bascule d'apparence, CTA selon la session), puis un hero sombre cinématographique qui contient, **dans cet ordre** : le sur-titre « Tout votre mariage au même endroit » ; **la capsule de saisie** ; les boutons « Créer un compte gratuit » / « Se connecter » (visiteur) ou « Accéder à mon espace » / « Gérer mes Mondes » (membre) ; la ligne de réassurance. Suivent « Aperçu produit » (Monde, Calendrier unifié, Invités & RSVP, Budget & prestataires), quatre atouts, les trois étapes, un bloc de relance, puis un pied de page sobre (`aria-label="Pages du site"`) vers `/guides`, `/conditions`, `/confidentialite`.

**La capsule (`LandingComposer`) :**

| Élément | Comportement |
|---|---|
| Sélecteur « Choisir l’univers » | Mariage · Naissance · Famille · Entreprise · Communauté · Voyage (chevron inclus) ; **Mariage** présélectionné, seul univers réellement outillé par l'app |
| Question courante | une seule information à la fois : date → lieu → nombre d'invités → budget → ambiance |
| Compteur | `n/6` (cinq questions + l'univers), recalculé à chaque réponse |
| Réponses | puces proposées ; les chips « déjà répondu » se rouvrent pour corriger |
| `AIME retient déjà : …` | ligne `role="status"` qui affiche la phrase en cours de composition |
| « Raconter autrement, en une phrase » | bascule vers une `textarea` libre ; l'envoi devient « Créer mon Monde » / « Continuez la préparation d’AIME » selon la session, avec retour « Continuer avec l’assistant » |
| Envoi | connecté → `createProjectFromIntention` puis `/user-portal` ; sinon brouillon `aime.onboarding-intention-draft` puis `/creation`, repris à l'hydratation du premier écran |

**Cohérence avec le moteur existant** : la phrase est produite dans le format que `parseIntention` sait relire — le texte n'est pas réécrit une seconde fois —, par exemple « Notre mariage le 14 août 2027, près de Lille, 120 invités, 20 000 €, ambiance champêtre. ». Rien n'est inventé : sans réponse, la phrase reste « Notre événement. ». Le lieu est normalisé en « près de Ville » (le parseur exige une majuscule après la préposition) et le budget est groupé avec des espaces ordinaires, jamais `toLocaleString` (voir §5.5).

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
| Typecheck racine (`corepack pnpm run typecheck` : libs, e2e, api-server, byaime-onepage, mockup-sandbox, scripts) | ✅ réussi |
| Tests `byaime-onepage` | ✅ 20 fichiers / **87 tests** |
| Tests `api-server` | ✅ 9 fichiers / **32 tests** |
| Tests `lib/aime-domain` | ✅ 2 fichiers / **22 tests** |
| Build racine (`corepack pnpm run build`) | ✅ réussi — `index-*.js` **1 017,47 kB** (gzip 291,05), `index-*.css` **198,66 kB** (gzip 27,89) |
| `corepack pnpm run verify:vercel` | ✅ réussi (front et API construits, route `/api` vérifiée) |
| Contrôle SSR supplémentaire (`renderToStaticMarkup` de l'`App` complète sur `/`, `/guides`, `/confidentialite`, `/creation`, et de la landing seule en visiteur comme en membre) | ✅ aucun échec de montage ; repères du champ de saisie présents ; zéro occurrence de « Laboratoire » |
| Aperçu local (Vite, port 4173, Clerk stubé) | ✅ `/`, `/guides`, `/confidentialite`, `/site.webmanifest`, `/og-cover.jpg`, `/icons/*`, `/robots.txt`, `/sitemap.xml` → 200 |
| Playwright e2e (`pnpm run e2e`) | ⚠️ non exécuté ici : les navigateurs Playwright ne s'installent pas dans cet environnement. Par assurance, `tsc -p e2e` passe et les specs n'ouvrent `/` qu'en session non connectée, sans utiliser les testids de la landing |

> Note d'outillage : les scripts se lancent via `corepack pnpm` (`pnpm` seul n'est pas dans le PATH). Un typecheck d'un seul workspace (`--filter @workspace/byaime-onepage run typecheck`) échoue si les libs n'ont pas été construites (`lib/api-client-react/dist` absent) : relancer `corepack pnpm run typecheck` à la racine, qui commence par `typecheck:libs`. Le dispositif d'aperçu local (`.preview/`, `vite.preview.mjs`) est volontairement hors dépôt (`.gitignore`) : il n'affecte ni le build ni les tests.

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

### 5.5 Nouveaux constats de cette passe

22. **Seuil de validation incohérent (P2)** — trois valeurs selon l'écran (5, 10, 10 caractères) : la même phrase était acceptée ici, refusée là. **✅ corrigé** : `MIN_INTENTION_LENGTH = 12`, partagé par les trois appelants.
23. **Compteur d'étapes mensonger (P2)** — l'ancienne capsule affichait un « 1/5 » statique issu de `use-app-store`, sans rapport avec la saisie réelle. **✅ corrigé** : la capsule compte réellement les six étapes (cinq questions + univers) et les puces ouvertes.
24. **Espace fine insécable dans le budget (P2)** — `toLocaleString('fr-FR')` produit U+202F, que `parseIntention` ne relit pas (il attend un espace ordinaire) : le budget ressortait vide à la reprise. **✅ corrigé** : groupement maison `groupThousands()`.
25. **Lieu reparsé à tort (P1)** — « près de nantes », en minuscules, ne satisfait pas le regex ville du parseur : le lieu était perdu entre la saisie et le Monde. **✅ corrigé** : préposition saisie retirée puis remise en « près de Nantes ».
26. **Accueil inatteignable pour les membres (P1)** — `/` redirigeait d'office vers `/user-portal`, donc le logo « AIME » du portail ramenait à… une redirection, et la page de présentation devenait invisible pour la personne la plus à même d'en parler autour d'elle. **✅ corrigé** : `/` sert la landing à tout le monde.
27. **Mesure d'audience morte (P2)** — `trackEvent` était appelé partout, aucun script n'était chargé, et `VITE_UMAMI_WEBSITE_ID` n'était lue nulle part. **✅ corrigé** : `installAnalytics()`, activé par variables d'environnement.
28. **`og:image` pointait sur une icône 816×816 de 560 Ko (P2)** — format hors du 1200×630 attendu par les réseaux, image onze fois plus lourde que nécessaire. **✅ corrigé** : `/og-cover.jpg` (1200×630, 52 Ko) avec dimensions et texte alternatif.
29. **Écriture au niveau module d'`App.tsx` (P3)** — accès `document.documentElement` gardé par `typeof window` seulement : tout rendu hors navigateur (pré-rendu, tests de montage) cassait, et le script inline d'`index.html` faisait déjà ce travail. **✅ corrigé** : bloc supprimé.
30. **Tick d'1 s sur tout le Monde (P3)** — re-rendu complet chaque seconde pour un décompte en jours. **✅ corrigé** : 1 s uniquement pendant le Jour J, 1 min sinon.
31. **Compteurs de copie périmés (P3)** — « Vingt démonstrations » alors que la page en contient 23. **✅ corrigé** : valeur dérivée de `DEMOS.length`.
32. **`soft-404` de l'hébergement (P1)** — non corrigé ici, correctif prêt à l'emploi au §8.
33. **Aucun `code-splitting` (P2)** — chunk unique de 1,02 Mo pour le site entier, écrans privés compris. Voir §8.

---

## 6. SEO & accessibilité

- ~~`lang="en"` sur contenu français~~ → **✅ corrigé** (`lang="fr"`).
- ~~`viewport` avec `maximum-scale=1` empêche le zoom utilisateur (WCAG 1.4.4)~~ → **✅ corrigé** (`maximum-scale` retiré).
- ~~Double `<h1>` sur la landing~~ → **✅ corrigé**.
- ~~Pas d'`og:image` ni de `canonical`~~ → **✅ corrigé** (`canonical`, `og:url`, `og:site_name`, `og:image` et `twitter:image` ajoutés dans `index.html`).
- ~~`robots.txt` minimaliste sans référence de sitemap~~ → **✅ corrigé** (`public/sitemap.xml` créé + référence `Sitemap:` dans `robots.txt`).
- Icônes/boutons : les boutons interactifs ont des `aria-label` cohérents (ex. `ActionCenter`). Bon point général, mais vérifier les contrastes (`text-foreground/40` et `opacity-55` très faibles) sur les petits libellés.

---

## 7. Données, sécurité et conformité

- ~~**Confidentialité vs réalité de stockage** (Replit vs GCP App Storage)~~ → **✅ corrigé** (mention GCP alignée).
- L'endpoint `/network/subjects` (lecture de la projection multi-mondes) a été **supprimé** : réduction de surface d'exposition — cohérent avec le retrait de la carte.
- **Dérive OpenAPI restante (précise)** : `InvitePage` et `RsvpPage` (`App.tsx`) appellent en `fetch` direct des endpoints **absents de la spec** : `POST /invitations/{token}/accept`, `POST /rsvp/{token}/song-requests`, `POST /rsvp/{token}/media/uploads/request-url`, `POST /rsvp/{token}/media`. Seuls `GET`/`PUT /rsvp/{token}` (`getPublicRsvp`/`submitPublicRsvp`) sont décrits. Résorber cette dérive implique : ajouter ces 4 opérations + schémas à `openapi.yaml`, régénérer les clients (orval), puis réécrire `InvitePage`/`RsvpPage` sur le client généré.
- Rappel déjà documenté dans `docs/audit-fonctionnel-complet.md` : une partie des routes n'est pas décrite dans OpenAPI, et le frontend mêle client généré et `fetch` directs. Le `codegen` de cette session a resynchronisé les types `api-zod` manquants (`aimeLocal*`) — la dérive OpenAPI reste à réduire côté routes.

---

## 8. Priorisation et recommandations

| Priorité | Action |
|---|---|
| **✅ P0 (fait)** | Laboratoire retiré de bout en bout · `/` = landing pour tous, logo « AIME » → accueil sur toutes les pages · champ de saisie dans le hero, branché sur le vrai parseur · écran explicite si clé Clerk absente (fin de la page blanche) · seuil d'intention unifié. |
| **✅ P1 (fait)** | analytics réellement branchées (optionnelles) · `og:image` 1200×630 + dimensions + alt · canonical et description par route · `robots.txt`/`sitemap.xml` assainis · reprise du brouillon sur `/creation` · suppression de l'îlot legacy (cinq composants et un store mort) · contrastes des micro-libellés · reduced-motion respecté par framer-motion. |
| **✅ P2 (fait)** | manifeste et icônes PWA, icône de 560 Ko non référencée retirée · polices non bloquantes et script anti-flash · tick du Monde conditionné au Jour J · bascule d'apparence sur Guides et les pages légales · nettoyage des props et imports morts induits par les suppressions. |
| **✅ P3 (fait)** | compteurs de copie rendus dynamiques · CTA des Guides sur `/creation` (chemin canonique) · `theme-color`, `og:locale`. |
| **⚠️ À faire hors dépôt** | `DROP TABLE` des tables du Laboratoire en base de production — recommandation 5 ci-dessous. |
| **Restant, à arbitrer (non appliqué volontairement)** | recommandations 1 à 8 ci-dessous : `soft-404` Vercel, `code-splitting`, variante `dark` inopérante, code mort `components/ui`, dérive OpenAPI, mention de mesure d'audience, alias d'URL d'authentification. |

### Recommandations non appliquées (et pourquoi)

1. **`soft-404` de l'hébergement (P1).** `artifacts/byaime-onepage/vercel.json` réécrit **tout** ce qui n'est ni `/api/…` ni un fichier avec extension vers `/index.html`, avec un statut **200**. Une URL inventée (`/lab`, `/mariage`, une faute dans un lien partagé) renvoie donc le contenu de la page 404 **en 200** : les robots conservent l'URL, et le statut réel est perdu. Correctif prêt à l'emploi, à coller dans `vercel.json` (les routes du front sont celles d'`App.tsx`) :

   ```json
   {
     "routes": [
       { "src": "^/api$", "dest": "/api/index.js" },
       { "src": "^/api/(.*)$", "dest": "/api/[...path].js" },
       { "src": "^/(?:guides|conditions|confidentialite|user-portal|app|profile|profil/[^/]+|rsvp/[^/]+|invite/[^/]+|creation(?:/.*)?|connexion(?:/.*)?|sign-in(?:/.*)?|sign-up(?:/.*)?)$", "dest": "/index.html" },
       { "src": "^/.*$", "dest": "/index.html", "status": 404 }
     ]
   }
   ```

   Non appliqué ici, volontairement : une liste blanche est **exhaustive par nature**. Le moindre oubli — les jetons `/rsvp/:token` et `/invite/:token` reçus par e-mail, une route ajoutée demain — casse un lien réel en production, ce qui est plus grave qu'un `soft-404`. À appliquer en contrôlant la liste, idéalement en la générant depuis le code des routes.
2. **Aucun `code-splitting` (P2).** Le bundle est un chunk unique de **1 017 kB** (gzip 291 kB) pour tout le site : le visiteur qui lit seulement la landing télécharge les écrans privés, le plan de table, framer-motion, react-query. Recommandation : `React.lazy` + `Suspense` sur `/user-portal`, `/profile`, `/guides` et les panneaux lourds (`VisibilityGraph`, `WorldSearch`, `UniversalTimeline`) ; gain attendu 35 à 50 % du JS initial de l'accueil. Non fait ici parce que le tracé des frontières de chunk se pilote avec une mesure réelle (Lighthouse sur le déploiement) et qu'un mauvais découpage ajoute des allers-retours au lieu d'en retirer.
3. **Variante `dark` inopérante (P3).** `src/index.css:7` déclare `@custom-variant dark (&:is(.dark *))`, mais le thème est piloté par `document.documentElement.dataset.aimeTheme` : **aucune classe `.dark` n'est jamais posée**, les dix utilitaires `dark:` du front sont donc morts. Deux issues propres : soit supprimer ces `dark:` (le système de variables suffit), soit poser `.dark` sur `<html>` **et** auditer chaque utilitaire. Non fait : réactiver dix styles jamais vus, sans navigateur pour les contrôler, est un risque visuel supérieur au gain.
4. **Code mort à purger à loisir (P3, sans coût runtime — le bundler l'élimine déjà).** `src/components/ui/*` n'est importé par **aucun** écran hors du dossier (sauf `toaster`, `tooltip`, `dialog`, `sheet`) ; la variante `glass` de `ui/button.tsx` applique au passage une classe `.glass-panel` **qui n'existe nulle part**. `ProviderPortrait` (`ProjectStage.tsx`) n'est jamais rendu. S'ajoutent `WEEK` et `MINUTE` (`lib/seed-data.ts`), la constante `lower` (`lib/parser.ts`), des types importés sans usage (`store/project-store.tsx`), `Button` dans `ui/alert-dialog.tsx`, `Lock`/`Globe2` dans `pages/PublicProfile.tsx`, `Eye`/`EyeOff` dans `pages/guides-fake-uis.tsx`, le type `PanelChrome` dans `PrivateLayout.tsx`, et `hooks/use-mobile.tsx` (utilisé par `ui/sidebar.tsx` seulement). Contrôle : `cd artifacts/byaime-onepage && ../../node_modules/.bin/tsc -p tsconfig.json --noEmit --noUnusedLocals --noUnusedParameters`.
5. **Base de données : `DROP` manuel (⚠️ restant).** Le schéma Drizzle ne décrit plus les tables du Laboratoire, ce qui arrête les écritures mais **ne supprime rien** en base. Sur la base de production : `DROP TABLE IF EXISTS "aime_laboratory_feedback"; DROP TABLE IF EXISTS "aime_laboratory_intents";` — ou, en environnement de développement uniquement, `corepack pnpm --filter @workspace/db run push-force` (destructeur par construction).
6. **Dérive OpenAPI (P2, déjà signalée au §7).** `InvitePage` et `RsvpPage` appellent en `fetch` direct quatre opérations absentes de `openapi.yaml`. Le traitement consiste à ajouter ces opérations et schémas, régénérer les clients (`corepack pnpm --filter @workspace/api-spec run codegen` puis `corepack pnpm run typecheck:libs`), puis réécrire les deux pages sur le client généré.
7. **Mesure d'audience et consentement (P3).** `umami` est cookieless, ce qui dispense normalement de bandeau ; mais `installAnalytics()` étant désormais réel, la page Confidentialité devrait le mentionner — elle ne dit rien de la mesure d'audience à ce jour.
8. **Alias d'authentification (P3).** `/connexion`–`/creation` **et** `/sign-in`–`/sign-up` servent les mêmes écrans : confortable pour Clerk, mais deux surfaces URL pour un contenu identique. Recommandation : redirection 301 des alias, ou `noindex` posé par `applyRouteMeta` sur ces quatre routes.

## 9. Point d'attention pour la suite

La « map réseau » (`/network`), la page `/concept` et la démo `/le-monde-aime` (carte mondiale MapLibre) sont intégralement retirées. Restent deux éléments contenant le mot « réseau » qui ne sont **pas** la carte et ont été **conservés volontairement** :
- la section « Réseau » du Profil — constellation des invités du Monde sur la Timeline (`PublicProfile.tsx`, x=5000) : c'est une fonctionnalité d'affichage, pas une carte géographique ;
- les niveaux de visibilité « réseau » du domaine (`types.ts`, `capabilities.ts`, `sound-policy.ts`) — concept de partage.

**Après la passe en cours :** le Laboratoire est intégralement retiré du site (il ne reste qu'à dropper sa table en base, §8.5) et l'accueil est unique, avec le champ de saisie dans le hero. Les points restants sont indépendants des deux demandes : `soft-404` de l'hébergement (§8.1), absence de découpage de code (§8.2), dix utilitaires `dark:` inopérants (§8.3), code mort de `components/ui` (§8.4), dérive OpenAPI des `fetch` directs (§8.6), mention de la mesure d'audience dans la page Confidentialité (§8.7) et alias d'URL d'authentification (§8.8).

**Repère pour la prochaine session :** `src/pages/landing.test.tsx` est le gardien des deux décisions produit (accueil marketing pour tous, absence de Laboratoire) ; la réintroduction d'un parcours annexe le fera échouer, et c'est voulu.

---

## 10. Récapitulatif de contrôle (état livré)

- `corepack pnpm run typecheck`, `corepack pnpm run test` (141 tests), `corepack pnpm run build` et `corepack pnpm run verify:vercel` : **tous verts**.
- Le mot « Laboratoire » a disparu de `artifacts/byaime-onepage/src`, `artifacts/api-server/src` et `lib/db/src` ; le test `pages/landing.test.tsx` le vérifie au rendu, donc il régresse si quelqu'un réintroduit le parcours.
- `/` rend la landing avec la capsule de saisie dans le hero, en visiteur comme en membre (contrôle SSR des deux états).
- Aperçu local : `corepack pnpm --filter @workspace/byaime-onepage exec vite -c vite.preview.mjs`, puis http://localhost:4173 (Clerk stubé, aucune base de données nécessaire).
- Deux ajouts de style à valider à l'œil sur le déploiement, faute de navigateur ici : les contrastes remontés de la landing (§1, dixième passe) et `/og-cover.jpg` dans un aperçu de lien.
- Incident d'aperçu local relevé par l'utilisatrice (« Une erreur est survenue · addListener is not a function ») : **casse de l'environnement de prévisualisation, pas du site**. Le stub Clerk maison (`artifacts/byaime-onepage/.preview/clerk-stub.tsx`) n'exposait pas `addListener`, que `CacheInvalidator` (`App.tsx`) appelle dans un `useEffect` — invisible en rendu SSR, donc non détecté par les contrôles automatiques. Corrigé : le stub expose toute l'API consommée par l'app, le contrôle local le vérifie, et l'abonnement Clerk est devenu tolérant (`typeof` garde) pour qu'une API absente ne puisse plus faire tomber toute l'application. Sur le site réel, `clerk.addListener` existe bien (c'est l'API interne de `@clerk/shared`) : rien n'était cassé en production.

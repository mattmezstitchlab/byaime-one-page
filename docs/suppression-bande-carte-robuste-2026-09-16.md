# Bande supprimée, accueil page unique, `/ma-carte` robuste — 16 septembre 2026

Deux demandes, une passe : supprimer la page `/monde` (la Bande) et ses dépendances, et corriger
l’erreur affichée par `/ma-carte`. Ni l’architecture du Monde privé, ni les API, ni les règles de
partage, ni la Timeline ne sont modifiées.

## 1. La Bande supprimée

### Décision

Le site public ne garde qu’une page : l’accueil (`/`). La Bande était un prototype public — un
mariage simulé projeté sur trois échelles (mois, engagements, minutes) — qui avait absorbé la
vitrine de l’agence. Elle doublonnait le message de l’accueil et ajoutait une surface publique à
entretenir (textes, contrastes mesurés, SEO, contrôles).

### Fichiers supprimés

| Fichier | Rôle |
| --- | --- |
| `src/pages/Bande.tsx` | la page `/monde` (924 lignes) |
| `src/lib/bande.ts` | son moteur : résolutions, chapitres, engagements, régie du Jour J, démo |
| `src/pages/bande.test.tsx`, `src/pages/bande-interaction.test.tsx`, `src/lib/bande.test.ts` | ses contrôles |
| `src/components/VitrineSections.tsx` + `vitrine-sections.test.tsx` | les sections « vitrine agence », rendues uniquement par la Bande |
| `groupByChapter` dans `src/lib/timeline-chapters.ts` | seul appelant : la Bande (`getSubchapter` reste, utilisé par `UniversalTimeline` et `world-visuals`) |
| `"bande"` dans `DispooPlacement` (`src/lib/partner-links.ts`) | emplacement de lien UTM devenu inutilisé |
| clés `nav.bande`, `footer.bande` (et `nav.agency`, `footer.agency`, déjà orphelines) dans `i18n-dictionary.ts` | libellés FR et EN |

Les visuels `AGENCY_VISUALS` (`src/lib/assets.ts`) sont conservés : `assets.test.ts` vérifie que
les fichiers existent et ils restent disponibles pour une section éditoriale de l’accueil ou d’un
livrable.

### Ce qui remplace

- **Routes** : `/monde` et `/agence` redirigent vers `/` (`App.tsx`). Aucun lien publié (QR code,
  réseau social, e-mail d’invitation) ne tombe sur un 404.
- **Mode dégradé** (pas de `VITE_CLERK_PUBLISHABLE_KEY`) : `resolveDegradedView` renvoie
  `{ kind: "landing" }` pour `/`, `/agence` et `/monde`, et `App.tsx` rend l’accueil directement —
  un `<Redirect>` ne rend rien côté serveur, la page la plus exposée du site serait blanche au
  pré-rendu.
- **Store sans Clerk** : l’accueil compose avec le store de projet (le compositeur d’intention).
  En mode dégradé il n’y a pas de `ClerkProvider`, donc `useAuth()` lèverait :
  `project-store.tsx` expose maintenant `LocalProjectProvider`, qui injecte une session absente
  (`{ isLoaded: true, isSignedIn: false, userId: null }`) — l’état exact d’un visiteur non
  connecté en mode nominal. `ProjectProvider` (Clerk) reste l’unique chemin en mode nominal.
- **Liens repliés sur l’accueil** : logo de l’espace privé (`PrivateHomeLink`), mentions légales
  (« Retour à l’accueil »), sommaire Admin (« Accueil du site »), écran « Connexion momentanément
  indisponible » (« Revenir à l’accueil », `data-testid="auth-key-missing-home"`), bouton
  « Découvrir » de la Carte universelle, logo et pied de page de l’accueil.
- **Barre publique** (`SiteChrome.tsx`) : `SITE_NAV` est vide. La liste est conservée pour qu’une
  future page publique n’ait qu’un endroit à modifier ; la barre ne nomme plus de page séparée et
  n’affiche plus d’`aria-current`.
- **SEO** : `AGENCY_PATH` (`src/lib/agency-seo.ts`) passe de `/agence` à `/` — déclarer une URL
  qui redirige ferait publier une canonical morte au pré-rendu — et `public/sitemap.xml` ne liste
  plus `/agence` (la Bande n’y a jamais figuré). `agency-seo.test.ts` verrouille les deux, et
  l’absence de `/monde` comme d’`/agence` dans le plan de site.
- **Textes visibles** : les panneaux du Monde privé ne disent plus « comme dans la Bande »
  (`DayOfPanel`, `PlanningPanel`, `ProviderPanel`, `GuestPanel`) ; les commentaires techniques qui
  citaient `/monde` comme raison d’être d’une lib (`Reveal`, `VisibilityGraph`, `FilTrack`,
  `PortalOnboarding`, `agency-identity`, `assets`, `category-colors`, `confidence`,
  `timeline-chapters`, `seed-data`) sont réécrits vers leur raison actuelle.

### Contrôles mis à jour

`public-shell.test.ts`, `site-design.test.tsx`, `agency-theme.test.ts`, `landing.test.tsx`,
`mentions.test.tsx`, `private-shell-ui.test.tsx`, `app-interaction.test.tsx` (remonté sur l’accueil
en mode dégradé : il ouvre le compositeur et tape réellement dans le champ), et
`preview/smoke.mjs`.

Trois contrôles de `preview/smoke.mjs` étaient déjà rouges avant cette passe — ils attendaient le
choix « Couple / Wedding planner », retiré de l’accueil antérieurement — et un quatrième attendait
qu’un brouillon ne saute pas la porte d’entrée, alors que `LandingComposer` la saute
explicitement. Les quatre sont réécrits sur le comportement réel ; le contrôle local repasse au
vert en entier.

## 2. `/ma-carte` : l’erreur corrigée

### Cause

`UniversalCardForm` lisait ses réponses avec `await response.json()`, sans garde. Quand
`/api/me/card` répond autre chose que du JSON, cette ligne lève une `SyntaxError` dont le texte
brut était recopié à l’écran, **à la place du formulaire entier** :

```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

C’est ce qui arrive quand : le serveur de développement tourne sans API (Vite répond `index.html`
sur `/api/*` faute de `AIME_API_URL`), une passerelle renvoie sa propre page d’erreur (502/504
HTML), ou la fonction serveur n’est pas déployée. Le store de projet, lui, protégeait déjà sa
lecture (`response.json().catch(() => ({}))`) : l’asymétrie venait de ce seul formulaire.

Reproduction verrouillée par `src/pages/ma-carte.test.tsx`, qui monte l’arbre réel du navigateur
(`App` → garde de session → `PrivateLayout` → `UniversalCardForm`) avec Clerk simulé en membre et
une réponse HTML sur `/api/me/card`.

### Règles appliquées

1. **Aucun texte technique à l’écran.** `src/lib/api-messages.ts` nomme chaque mode d’échec en
   français : réseau injoignable, corps non JSON, 401/403 (« Reconnectez-vous »), 404 (service non
   installé), 409 (carte changée ailleurs), 5xx, autre statut. Le message `error` du serveur prime
   toujours : c’est lui qui connaît la règle métier. `parseJsonBody` lit un corps sans jamais lever
   (un corps vide vaut `null`, « pas de carte » étant une réponse normale).
2. **Un seul endroit pour appeler le service.** `src/lib/api-call.ts` (`apiCall`, `jsonPut`) est
   utilisé par `UniversalCardForm`, `RsvpClaimPanel` et `ProfessionalProfileEditor`, qui
   recopiaient le même `response.json()` non gardé — les deux derniers sont atteignables depuis
   `/ma-carte` (« Rejoindre un mariage », « Configurer mon fonctionnement »).
3. **Une page jamais morte.** L’échec du chargement initial devient un avertissement non bloquant
   (`loadError`, `data-testid="card-load-error"`) affiché dans le formulaire, avec
   « Recharger ma carte ». Le formulaire est rendu quoi qu’il arrive (`setLoaded(true)` en
   `finally`) : la saisie reste possible, le brouillon de session est retrouvé, et rien n’est
   envoyé tant qu’un enregistrement n’a pas abouti (un `PUT` post-panne reçoit du serveur son 409
   explicite si la carte existait).
4. **Réessayer n’efface rien.** La réinitialisation de l’état n’a lieu qu’au premier chargement
   (`reloadToken === 0`) ; un réessai recharge sans toucher à la saisie — vérifié dans le test.
5. **Les compléments ne bloquent pas.** Les activités professionnelles sont chargées dans leur
   propre `try` : leur échec laisse la carte ouverte. L’annulation d’une recherche musicale en
   cours est déplacée sur le démontage, pour qu’un réessai de chargement ne la coupe plus.

## 3. Côté serveur : plus jamais de HTML en réponse d’erreur

Le contexte a été précisé ensuite : le message technique apparaît **sur Vercel**, en étant
connecté. La réponse HTML venait donc du service déployé. La cause est dans
`artifacts/api-server/src/app.ts` : le routeur était monté, mais **aucun gestionnaire d’erreur** ne
le suivait. Dès qu’une route lève — table absente faute de migration, base injoignable, corps
illisible — Express 5 transmet l’erreur à son gestionnaire par défaut, qui répond une page
`<!DOCTYPE html>… Internal Server Error`. Le navigateur, qui lit `response.json()`, échoue et
recopie son propre texte : exactement le « Unexpected token '<' » vu à l’écran. Le client était
donc la seconde moitié du problème, pas la seule.

Corrigé par :

1. `src/lib/apiFailure.ts` — dérivation pure de la réponse d’échec : un statut (celui que porte
   l’erreur quand il est reconnaissable, 500 sinon) et un corps `{ "error": "…" }` en français,
   libellé par état (400 corps illisible, 401, 403, 404, 409, 413, 422, 429, 5xx). **La cause
   réelle n’est jamais renvoyée** : ni SQL, ni nom de table, ni chaîne de connexion, ni pile. Elle
   part dans les journaux (`apiFailureLogFields`, avec `requestId`, méthode et chemin).
2. `src/middlewares/jsonErrorHandler.ts` — le gestionnaire Express (quatre arguments) qui écrit
   cette réponse ; si la réponse a déjà commencé, il rend la main à Express au lieu d’écrire
   par-dessus.
3. `app.ts` — `app.use(jsonErrorHandler)` en dernier, après `app.use("/api", router)`. L’entrée
   Vercel (`api/[...path].js`) exporte cette même application : la correction vaut en production.
4. `scripts/verify-vercel.mjs` — chaque route sondée sur un déploiement doit maintenant répondre
   `application/json` **et** un corps qui se parse, quel que soit son statut, et `/api/me/card`
   ainsi que `/api/me/professional-profiles` rejoignent les sondes. L’invariant qui a été violé
   devient un contrôle rouge.

Contrôles : `src/lib/apiFailure.test.ts` (8 tests) — JSON jamais HTML, aucune fuite technique
(table, SQL, chaîne de connexion), libellé par état, repli sur 500 pour toute valeur inattendue,
écriture réelle de la réponse, repli sur Express quand les en-têtes sont déjà partis, et montage en
dernier dans `app.ts`. Vérifié aussi en HTTP réel, sur le bundle construit (`dist/index.mjs`) :
une route qui lève, un rejet `async`, une route inconnue et un corps JSON invalide répondent tous
`application/json` avec le libellé français, pendant que le journal garde la cause réelle
(`Missing Clerk Secret Key`, `relation … does not exist`, `ECONNREFUSED …`). Une variable
d’environnement manquante sur un déploiement — qui produisait auparavant une page HTML sur
**toutes** les routes `/api/*` — donne désormais une phrase lisible.

Ce que ça change pour la personne : `/ma-carte` affiche « Le service n’a pas pu répondre.
Réessayez dans un instant. » dans un bandeau, avec le formulaire utilisable et « Recharger
ma carte » — plus un texte anglais à la place de la page.

## Ce qui n’a pas changé

Aucun schéma, aucune migration, aucune règle de visibilité ou de partage, aucune donnée. Les routes
de l’API gardent leurs chemins, leurs statuts et leurs corps de réponse en succès ; seule la
réponse d’une erreur **non rattrapée** change (page HTML → JSON). La Carte Universelle garde ses
trois niveaux (carte / profil métier / association) et son parcours en cinq étapes. L’espace privé,
la Timeline, le profil public et le portail invité ne sont pas touchés.

## Vérifications

- `pnpm run typecheck` (racine) : bibliothèques, frontend, serveur, E2E, scripts — réussis.
- `pnpm --filter @workspace/byaime-onepage run test` : **466 tests verts (72 fichiers)**. Le total
  précédent était 519 (74 fichiers) : 4 fichiers de contrôles supprimés avec la Bande et la
  vitrine (−66 tests), 2 fichiers ajoutés (`api-messages.test.ts`, `ma-carte.test.tsx`, +13).
- `pnpm --filter @workspace/api-server run test` : **86 tests verts**, dont
  `src/lib/apiFailure.test.ts` (8) — JSON jamais HTML, aucune fuite technique (table, SQL, chaîne
  de connexion), libellé par état, repli sur 500 pour toute valeur inattendue, écriture réelle de
  la réponse, repli sur Express quand les en-têtes sont déjà partis, et montage en dernier dans
  `app.ts`. Vérifié aussi en HTTP réel sur le bundle construit (`node ./build.mjs`, puis
  `dist/index.mjs`) : route qui lève, rejet `async`, route inconnue et corps JSON invalide
  répondent tous `application/json`.
- `pnpm test` (racine) : **585 tests verts** — 33 domaine, 86 serveur, 466 frontend.
- `vite build` : réussi. Le chunk `Bande-*.js` (38,08 kB, 10,79 kB gzip) n’est plus émis ; le
  bundle d’entrée ne grossit pas.
- `preview/smoke.mjs` : **CONTRÔLE LOCAL OK** — 32 vérifications, dont les routes retirées
  (rendu vide côté serveur, donc redirection), l’accueil en mode nominal et en mode dégradé sur
  `/`, `/agence` et `/monde`, et l’écran « Connexion momentanément indisponible » avec son lien
  « Revenir à l’accueil ». (Lancement dans cet environnement :
  `node ../../node_modules/.pnpm/tsx@4.23.4/node_modules/tsx/dist/cli.mjs preview/smoke.mjs` —
  Node seul ne résout pas les imports TypeScript sans extension de `preview/vite.preview.mjs`.)
- Navigateur : non exécuté ici (les binaires Chromium de Playwright ne sont pas téléchargeables
  dans cet environnement). `e2e/universal-card.preview.spec.ts` reste inchangé et à rejouer.

## À confirmer côté déploiement

- **Reste à faire sur Vercel.** Cette passe rend l’échec lisible et la page utilisable, mais elle
  ne lève pas la cause : une route qui lève continue de lever. Si `/ma-carte` affiche « Le service
  n’a pas pu répondre », la cause est côté base, à vérifier dans cet ordre :
  1. les trois migrations du 16/09/2026 sont appliquées sur le Postgres de production —
     `lib/db/migrations/20260916_universal_cards.sql` (crée `aime_universal_cards` : sans elle,
     `GET /api/me/card` lève `relation "aime_universal_cards" does not exist`),
     `20260916_professional_profiles.sql`, `20260916_verified_rsvp_claims.sql`. Elles sont
     idempotentes (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`) et leur comportement est vérifié
     hors production par `pnpm run test:card-migrations` ;
  2. `DATABASE_URL` est défini pour l’environnement Production (et Preview le cas échéant) — sans
     lui, le bundle lève au chargement et c’est Vercel qui répond sa propre page d’erreur, hors de
     portée du gestionnaire JSON ;
  3. les journaux de la fonction portent désormais la ligne « Erreur non rattrapée : réponse JSON
     d'échec renvoyée » avec `err`, `errorCode`, `requestId`, `method` et `path` : c’est là qu’on
     lit la table ou la connexion en défaut ;
  4. `pnpm run verify:vercel` avec `VERCEL_VERIFY_DEPLOYMENT_URL` pointé sur le déploiement : les
     sondes `/api/me/card` et `/api/me/professional-profiles` doivent répondre `application/json`
     (401 sans session), et plus aucune route sondée ne peut répondre HTML.
- Les liens publiés vers `/monde` redirigent désormais. `public/sitemap.xml` ne référençait pas la
  Bande ; il ne référence plus non plus `/agence`, qui redirige. Si un plan de site externe
  (Search Console, annuaire) déclare encore `/agence`, il est à mettre à jour vers `/`.

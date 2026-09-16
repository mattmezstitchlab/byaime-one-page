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

## Ce qui n’a pas changé

Aucune API, aucun schéma, aucune migration, aucune règle de visibilité ou de partage, aucune
donnée. La Carte Universelle garde ses trois niveaux (carte / profil métier / association) et son
parcours en cinq étapes. L’espace privé, la Timeline, le profil public et le portail invité ne sont
pas touchés.

## Vérifications

- `pnpm run typecheck` (racine) : bibliothèques, frontend, serveur, E2E, scripts — réussis.
- `pnpm --filter @workspace/byaime-onepage run test` : **466 tests verts (72 fichiers)**. Le total
  précédent était 519 (74 fichiers) : 4 fichiers de contrôles supprimés avec la Bande et la
  vitrine (−66 tests), 2 fichiers ajoutés (`api-messages.test.ts`, `ma-carte.test.tsx`, +13).
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

- Si l’erreur vue sur `/ma-carte` venait du **serveur** et non du client (par exemple un 500 parce
  que `lib/db/migrations/20260916_universal_cards.sql` n’a pas été appliquée sur la base de
  production), cette passe rend le message lisible et la page utilisable, mais la migration reste
  à appliquer : c’est elle qui fait exister `aime_universal_cards`.
- Les liens publiés vers `/monde` redirigent désormais. `public/sitemap.xml` ne référençait pas la
  Bande ; il ne référence plus non plus `/agence`, qui redirige. Si un plan de site externe
  (Search Console, annuaire) déclare encore `/agence`, il est à mettre à jour vers `/`.

---
name: Échec de service nommé, page jamais morte
description: Un service injoignable s’affiche en français à côté du formulaire ; aucun texte technique ne remplace l’écran.
---

Quand un appel au service AIME échoue, l’écran affiche un message français qui dit ce qui se
passe et ce que la personne peut faire, **à côté** du contenu — jamais à la place. Le texte brut
d’une exception technique (`Unexpected token '<', "<!DOCTYPE "... is not valid JSON`,
`Failed to fetch`, une pile d’appel) n’atteint jamais l’interface.

**Why:** `/ma-carte` a affiché le message du parseur JSON à la place de tout le formulaire dès
que `/api/me/card` a répondu autre chose que du JSON : serveur de développement lancé sans API
(Vite répond `index.html`), passerelle qui renvoie sa propre page d’erreur, fonction serveur
absente — et, en production sur Vercel, une erreur non rattrapée dans une route : Express répond
alors sa page HTML par défaut. La personne perdait à la fois la compréhension et sa saisie.

**How to apply:**
- Passer par `lib/api-call.ts` (`apiCall`, `jsonPut`) pour tout appel au service : il lit le
  corps sans lever (`parseJsonBody`) et traduit chaque mode d’échec via
  `lib/api-messages.ts` (`describeApiFailure`) — réseau coupé, corps non JSON, 401/403, 404,
  409, 5xx, autre statut. Le message `error` du serveur prime toujours : c’est lui qui connaît la
  règle métier.
- Distinguer l’échec **bloquant** (une action refusée : `error` dans le formulaire) de l’échec
  **non bloquant** (le chargement initial : `loadError` en avertissement avec « Recharger »). Un
  chargement qui échoue rend quand même le formulaire : la saisie locale et le brouillon de
  session restent utilisables.
- Réessayer ne doit rien effacer : le rechargement ne réinitialise l’état qu’au premier
  chargement, jamais sur un réessai.
- Les compléments (activités professionnelles, listes secondaires) sont chargés séparément : leur
  échec ne bloque pas l’ouverture de l’écran principal.
- Chaque message est contrôlé sans réseau (`lib/api-messages.test.ts`) et le comportement de la
  page l’est avec l’arbre réel (`pages/ma-carte.test.tsx`).

**Côté service, la même règle :** une API répond **toujours** JSON, échec compris. Un routeur
Express monté sans gestionnaire d’erreur répond du HTML dès qu’une route lève (table absente, base
injoignable, corps illisible) : monter un gestionnaire à quatre arguments en dernier
(`middlewares/jsonErrorHandler.ts`), qui dérive statut et message d’une fonction pure
(`lib/apiFailure.ts`) et rend la main à Express si la réponse a déjà commencé. Le libellé vient de
l’état, jamais de `error.message` : la cause réelle (SQL, nom de table, chaîne de connexion, pile)
part dans les journaux avec `requestId`, méthode et chemin. Faire contrôler l’invariant sur le
déploiement lui-même : `scripts/verify-vercel.mjs` exige `application/json` et un corps qui se
parse sur chaque route sondée.

**Diagnostiquer une base en défaut.** Quand toutes les routes qui lisent la base échouent alors
qu’une route sans base (`/api/healthz`) répond, le schéma ou la connexion est en cause :
`DATABASE_URL="postgres://…" corepack pnpm run check:db` (`scripts/src/check-db-schema.ts`) liste
chaque table et chaque colonne attendue comme présente ou absente, en lecture seule, sans jamais
afficher le mot de passe, et donne les commandes `psql` à appliquer. Une erreur non rattrapée
reste invisible dans la réponse : elle se lit dans les journaux, jamais à l’écran.

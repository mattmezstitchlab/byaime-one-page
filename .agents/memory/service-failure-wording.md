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
absente. La personne perdait à la fois la compréhension et sa saisie.

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

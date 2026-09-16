---
name: Une seule page publique
description: L’accueil est l’unique page publique du site ; la Bande (`/monde`) est retirée et ses URL redirigent.
---

Le site public d’AIME ne compte plus qu’une page : l’accueil (`/`). La Bande (`/monde`) — le
prototype public qui projetait un mariage simulé sur trois échelles, et qui avait absorbé la
vitrine de l’agence — a été supprimée le 16/09/2026, avec son moteur (`lib/bande.ts`), ses
contrôles et les sections de vitrine (`VitrineSections.tsx`) qu’elle seule rendait.

**Why:** Deux pages publiques racontaient deux histoires différentes du produit, et chacune
demandait son propre entretien (textes, contrastes, SEO, contrôles). La Bande était un
prototype de démonstration : elle montrait un mariage simulé là où l’accueil propose d’entrer
dans le sien. Garder les deux brouillait le message et doublait la surface à vérifier.

**How to apply:**
- Ne pas recréer de page publique parallèle « pour montrer le produit ». La démonstration passe
  par l’accueil (compositeur, vitrine du Monde Mariage) puis par l’espace privé réel.
- **Les URL retirées ne meurent jamais** : `/monde` et `/agence` redirigent vers `/` en mode
  nominal, et servent directement l’accueil en mode dégradé — un `<Redirect>` ne rend rien côté
  serveur, donc la page la plus exposée du site serait blanche au pré-rendu. La liste des chemins
  publics vit dans `lib/public-shell.ts`, contrôlée par `public-shell.test.ts` et
  `preview/smoke.mjs`.
- En mode dégradé (pas de `VITE_CLERK_PUBLISHABLE_KEY`), l’accueil est monté avec
  `LocalProjectProvider` : le store de projet reçoit une session absente au lieu d’appeler
  `useAuth()`, qui lèverait sans `ClerkProvider`. Toute page publique qui compose avec le store
  doit rester rendable sans authentification.
- Avant d’ajouter un lien public, vérifier qu’il pointe vers une page qui existe ; les liens
  vers la Bande ont tous été repliés sur l’accueil (logo de l’espace privé, mentions légales,
  sommaire Admin, écran « Connexion momentanément indisponible », bouton « Découvrir » de la
  Carte).

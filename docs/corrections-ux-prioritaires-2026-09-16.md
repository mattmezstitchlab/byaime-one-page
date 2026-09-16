# Corrections des trois priorités UX — 16 septembre 2026

> **Partiellement remplacé.** L'entrée de l'accueil a depuis été refondue en un
> Oneboarding unique : « Voir ma carte » et « Outils avancés » ont quitté la
> porte d'entrée, et l'entrée connectée est désormais « Ma carte ». La
> description de l'entrée ci-dessous (§2) est donc historique. Les constats sur
> les états de sauvegarde (§2) et la recherche musicale (§3) restent valables.
> Voir [ONEBOARDING_PARCOURS.md](../ONEBOARDING_PARCOURS.md).

Cette passe ne modifie ni l’architecture, ni les API, ni les règles de partage, ni la Timeline. Les rapports précédents restent des constats historiques avant correction.

## 1. Reconnaître chaque mariage

Le sélecteur et le bandeau utilisent un libellé temporaire calculé depuis la réponse de projet déjà autorisée : titre, noms des personnes explicitement associées comme Marié/Mariée lorsqu’ils sont disponibles, date, lieu et ville. Les noms ne sont jamais devinés depuis une liste d’invités ou une profession. Un titre personnalisé est conservé.

Exemple vérifié : deux titres « Notre Mariage » deviennent « Notre Mariage · 12 juin 2027 · Domaine des Pins · Paris » et « Notre Mariage · 19 juin 2027 · Lyon ».

Les informations absentes, invalides ou marquées manquantes sont omises. Aucun nom, lieu ou jour n’est inventé. Aucune nouvelle donnée source n’est persistée ; le libellé est reconstruit à la lecture du catalogue.

## 2. Brouillon et carte enregistrée

- Pendant la saisie : « En cours de création ». Sans compte, le bouton est « Préparer ma carte ».
- Avant enregistrement : « Mon brouillon est prêt » et « Brouillon · non enregistré ».
- Après connexion avec un brouillon complet mais sans carte : représentation du brouillon conservé, sans rouvrir les champs d’identité, puis « Enregistrer ma carte ». La sauvegarde reste explicite.
- Après sauvegarde : « Ma carte est prête » et « Carte enregistrée ».
- Au retour avec une carte existante : « Ma carte », « Modifier ma carte ». L’entrée connectée de l’accueil est « Voir ma carte ».

Aucun enregistrement implicite, aucune seconde identité. Un brouillon incomplet reste éditable afin de fournir les seules informations requises.

## 3. Recherche musicale

L’erreur de recherche est locale à la rubrique musicale et ne reproduit plus les erreurs techniques du réseau. Elle propose « Réessayer » et « Continuer sans musique ». Cette seconde action ferme l’erreur, laisse la carte sans morceau, informe que l’ajout reste possible plus tard et place le focus sur le bouton pour terminer la carte.

Une relance efface les anciens résultats. Les requêtes annulées ne remplacent pas une recherche plus récente. Après sélection, l’écran ne montre plus à tort un message d’absence de résultats.

## Vérifications

- Types et build : réussis.
- Suite générale : **630 tests réussis** (33 domaine, 78 serveur, 519 frontend).
- Navigateur : **8 tests réussis**, quatre scénarios sur desktop et mobile.
- Deux mariages homonymes : libellés distincts et bon bandeau après sélection ; absence de débordement horizontal.
- Brouillon → connexion simulée → enregistrement explicite → retour sur la carte existante, sans nouvelle saisie d’identité.
- Musique contrôlée : échec réseau → message français → Réessayer → sélection → lecture réelle d’un extrait de test ; lecteur observé en lecture (`paused=false`). Possibilité de continuer sans musique également vérifiée.
- Non-régressions : Photographe/DJ indépendants, invité sans activité imposée, mise à jour de la carte dans les vues mariage, RSVP existant.
- Les trois migrations antérieures ont été revérifiées sur PGlite ; aucune migration n’est ajoutée ou modifiée par cette passe.

## Blocage externe

Une recherche réelle « La vie en rose » sur iTunes/Apple, puis sa relance, ont échoué dans Chromium avec **`net::ERR_CONNECTION_CLOSED`**. Le nouveau message français et ses actions étaient visibles. Aucun extrait réel n’a pu être sélectionné : **PLAY avec le catalogue en direct reste à confirmer dans un environnement où le service est accessible**. La lecture contrôlée n’est pas présentée comme une validation de ce service.

L’authentification et l’API de l’aperçu sont simulées. Les migrations et la chaîne avec Clerk/PostgreSQL/stockage objet réels restent à valider en staging avant déploiement de l’ensemble de la branche.

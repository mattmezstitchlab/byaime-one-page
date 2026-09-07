---
name: Cartographie dans l’artifact web
description: Choix de moteur cartographique fiable pour les vues Carte d’AIME sur Replit.
---

Utiliser MapLibre avec le worker construit dans l’artifact et un style CARTO sans clé chargé directement dans la configuration. Conserver la Liste comme repli lorsque le fond cartographique est inaccessible.

**Why:** Le chargement d’un style vectoriel distant pouvait être déclaré prêt tout en restant visuellement vide. La configuration directe garde le rendu ivoire, le clustering et le worker local sans dépendre d’un manifeste distant.

**How to apply:** Construire le worker avec Vite, attendre explicitement `style.load`, afficher un état de chargement borné et ne cartographier que des localisations vérifiées. Ne jamais déduire la position d’une personne depuis la ville générale du Monde.

La Carte est une surface native de la Page AIME, pas une destination isolée. Une même géométrie reçoit des couches différentes selon le contexte : informations pratiques d’un Monde, réseau d’un Profil, proximité, entraide, missions ou livraison.

**Why:** Les usages changent mais reposent sur les mêmes personnes, lieux, Moments, droits et relations ; séparer les cartes fragmenterait le graphe et obligerait à reconstruire le contexte.

**How to apply:** Ouvrir la Carte depuis la navigation sous le hero, puis configurer les couches visibles selon la page, le Kit et les permissions. Toujours rendre le chargement ou l’échec lisible sur un fond clair avec une liste accessible en repli.
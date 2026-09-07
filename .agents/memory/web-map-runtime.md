---
name: Cartographie dans l’artifact web
description: Choix de moteur cartographique fiable pour les vues Carte d’AIME sur Replit.
---

Utiliser une carte raster Leaflet pour la projection cartographique actuelle. Ne réintroduire un moteur WebGL que si son worker et son événement de chargement sont validés dans l’aperçu Replit et dans le déploiement publié.

**Why:** MapLibre pouvait rester silencieusement bloqué avant son événement de chargement dans l’application publiée, malgré un build réussi, des ressources accessibles et aucun message utile dans la console.

**How to apply:** Pour les Cartes AIME sans rendu vectoriel indispensable, conserver Leaflet et un fallback Liste. Si le WebGL devient nécessaire, tester explicitement le worker, les tuiles et l’état de chargement dans les deux environnements avant bascule.
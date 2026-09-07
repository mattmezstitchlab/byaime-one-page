---
name: Cartographie dans l’artifact web
description: Choix de moteur cartographique fiable pour les vues Carte d’AIME sur Replit.
---

Utiliser MapLibre avec le worker construit dans l’artifact et le style vectoriel CARTO Positron sans clé. Conserver la Liste comme repli lorsque le fond cartographique est inaccessible.

**Why:** L’ancien fond raster a fini par afficher une demande de clé. L’implémentation MapLibre issue du prototype historique fournit le rendu ivoire, le clustering et un worker local ; son chargement, son build et ses ressources ont été validés dans l’aperçu.

**How to apply:** Construire le worker avec Vite, attendre explicitement `style.load`, afficher un état de chargement borné et ne cartographier que des localisations vérifiées. Ne jamais déduire la position d’une personne depuis la ville générale du Monde.
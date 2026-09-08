---
name: Sessions Clerk en E2E
description: Éviter les JWT expirés et l’invalidation croisée des fixtures Clerk dans les parcours multi-contextes.
---

Tout contexte Playwright chargé depuis un état Clerk sauvegardé doit ouvrir l’application et attendre l’authentification avant son premier appel API protégé. Un scénario qui appelle réellement la déconnexion doit utiliser un compte distinct de ceux dont les sessions sont partagées par les autres fixtures.

**Why:** Une requête API directe ne déclenche pas le rafraîchissement navigateur d’un JWT sauvegardé. De plus, une nouvelle connexion du même utilisateur peut réutiliser sa session Clerk, puis invalider le fixture principal lors de la déconnexion.

**How to apply:** Amorcer chaque contexte authentifié par la page avec le jeton de test Clerk, attendre une vue réservée aux membres, puis seulement utiliser son contexte de requête. Pour tester une bascule, créer un utilisateur temporaire indépendant et le nettoyer au teardown.
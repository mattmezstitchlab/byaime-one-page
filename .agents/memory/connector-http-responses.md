---
name: Réponses HTTP des connecteurs
description: Règle de validation des réponses fournies par les connecteurs Replit.
---

Toute opération effectuée par un connecteur doit vérifier explicitement que la réponse HTTP est réussie avant d’enregistrer ou d’annoncer un succès.

**Why:** Le proxy du connecteur peut retourner normalement une réponse HTTP 4xx ou 5xx au lieu de lever une exception. Se fier uniquement à `catch` peut donc transformer un refus fournisseur en faux succès métier.

**How to apply:** Après chaque appel fournisseur, contrôler la propriété de réussite de la réponse et faire suivre les refus vers le chemin d’échec durable avant toute confirmation visible.
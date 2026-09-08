---
name: Précision des versions temporelles
description: Préserver les verrous optimistes quand PostgreSQL et JavaScript n’exposent pas la même précision temporelle.
---

Les comparaisons atomiques de version fondées sur un timestamp doivent utiliser la même précision que la valeur envoyée au client.

**Why:** PostgreSQL peut conserver des microsecondes alors qu’un `Date` JavaScript sérialisé en ISO ne garde que les millisecondes. Une précondition peut sembler valide puis une mise à jour atomique stricte ne trouver aucune ligne.

**How to apply:** Pour tout verrou optimiste exposant un timestamp ISO, normaliser la comparaison en base à la précision publique du contrat, tout en gardant la vérification dans la clause atomique de mise à jour.
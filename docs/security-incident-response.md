# Procédure d’incident — AIME

Dernière révision : 8 septembre 2026

Cette procédure s’applique à toute suspicion d’accès non autorisé, fuite de document, abus de lien public, envoi massif, compromission de compte ou perte de données.

## 1. Détecter et ouvrir l’incident

- Noter l’heure, le service touché, le signal observé et les personnes potentiellement concernées.
- Conserver les journaux utiles sans copier de secret, de jeton de session ou de document privé dans un canal non protégé.
- Classer provisoirement l’incident :
  - **Critique** : accès actif à des données privées, secret compromis, suppression ou envoi massif.
  - **Élevé** : accès possible mais non confirmé, contournement de rôle, documents exposés.
  - **Modéré** : abus limité, tentative bloquée, indisponibilité sans perte de données.

## 2. Contenir

- Suspendre la route, le workflow ou la fonctionnalité concernée si l’exposition continue.
- Révoquer les sessions touchées et faire tourner les secrets compromis depuis les outils de Secrets Replit, sans jamais les copier dans le code ou les journaux.
- Désactiver les liens publics ou invitations concernés.
- Conserver un chemin de restauration avant toute suppression corrective.

## 3. Évaluer

- Identifier la première et la dernière heure possible d’exposition.
- Déterminer les Mondes, comptes, documents et champs concernés.
- Vérifier si les données ont seulement été accessibles ou réellement consultées, modifiées, envoyées ou supprimées.
- Documenter les preuves, hypothèses et zones d’incertitude.

## 4. Corriger et vérifier

- Corriger la cause racine, puis vérifier les droits, les limites, les journaux et le comportement depuis le proxy public.
- Rechercher le même défaut sur les routes équivalentes.
- Restaurer le service progressivement et surveiller toute récidive.

## 5. Informer

- Prévenir rapidement les personnes concernées avec des faits vérifiés, les données touchées, les mesures prises et les actions qu’elles doivent entreprendre.
- Si une violation de données personnelles présente un risque pour les personnes, préparer l’évaluation réglementaire et, lorsque la loi l’exige, la notification à l’autorité compétente dans le délai applicable.
- Ne pas minimiser, spéculer ou promettre une sécurité absolue.

## 6. Clore et apprendre

- Écrire une chronologie courte et factuelle.
- Ajouter une régression automatisée quand elle peut empêcher le même incident.
- Vérifier les sauvegardes, la rotation des secrets, les limites de débit et les responsabilités.
- Conserver uniquement les éléments nécessaires à l’analyse, selon les règles de confidentialité du projet.
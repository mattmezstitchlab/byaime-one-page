# Laboratoire — fondation minimale

## Distinction produit

- **À vérifier / Contrôle universel** : anomalies et décisions détectées par AIME.
- **Laboratoire** : retours volontaires envoyés par un humain pendant son expérience.

Les deux surfaces restent séparées.

## Retours Laboratoire

Types pris en charge :

- bug
- remarque
- suggestion
- idée
- question / incompréhension
- retour positif
- amélioration UX
- problème de contenu ou de données

Statuts minimaux :

- `nouveau`
- `en_cours`
- `a_verifier`
- `resolu`
- `archive`

Chaque retour reçoit un identifiant lisible au format `LAB-000001`.

## Contexte automatique léger

Quand le contexte existe déjà, AIME peut associer :

- `projectId`
- rôle utilisateur
- route privée courante
- vue
- phase
- panneau actif
- audit ciblé
- Moment concerné
- entité concernée
- narration légère

AIME ne stocke pas de replay de navigation ni de télémétrie intrusive.

## Entrées disponibles

- page privée `/laboratoire`
- ouverture globale depuis l’espace privé
- ouverture contextuelle depuis :
  - Contrôle universel
  - audit de Timeline
  - Timeline universelle
  - modules Documents, Musique, Messages et Contributions
  - fallback d’erreur

## Consultation

- un membre non gestionnaire voit ses propres retours
- un propriétaire ou planificateur peut :
  - lister les retours du Monde
  - filtrer par type
  - filtrer par statut
  - mettre à jour le statut
  - ouvrir le contexte associé

## API minimale

- `GET /projects/:id/laboratory-feedback`
- `POST /projects/:id/laboratory-feedback`
- `PATCH /projects/:id/laboratory-feedback/:feedbackId`

## Persistance

Table :

- `aime_laboratory_feedback`

Champs principaux :

- séquence lisible pour `LAB-xxxxxx`
- projet
- auteur
- type
- statut
- message
- contexte JSON léger
- dates de création et de mise à jour

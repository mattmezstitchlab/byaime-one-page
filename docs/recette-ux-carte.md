# Recette UX — une carte, sans répétition

Passe du 16 septembre 2026, exclusivement frontend. Aucun changement au modèle, aux tables, aux relations, aux API ou aux règles de visibilité validées.

## Livré

- Entrée « Créer ma carte » : identité BYAIME, une seule fois ; indication explicite qu’aucun mariage n’est créé. JSON reste dans les outils avancés. Une personne connectée dispose de « Ma carte / mon espace ».
- Formulaire réparti en Identité / Moi / Ma musique. Seuls prénom et nom sont obligatoires. Recherche et lecture du morceau restent dans la carte.
- Confirmation visuelle, repères en quatre temps, activités facultatives et choix du mariage.
- Activités séparées, paramètres pertinents, précisions et dates exceptionnelles repliées. Choisir un métier sur sa présentation ne configure toujours rien automatiquement.
- « Vous rejoignez : … », rôle, présence, puis réglages. Aucun champ d’identité dans ce parcours.
- Pour un mariage déjà renseigné : récapitulatif et actions Modifier, pas un nouveau formulaire. Les modifications abandonnées ne deviennent pas des réponses prétendument enregistrées.
- Un invité valide directement sa présence. Les horaires particuliers restent accessibles en option.
- « Utiliser mes réglages Photographe / DJ » reprend en un clic l’activité choisie et l’arrivée déjà connue. Les réglages habituels sont affichés ; seules les variations sont éditables. Aucune question sur la création d’événements.
- Les rappels de confidentialité distinguent présentation de la carte, présence au mariage et besoins personnels. Aucun nouveau partage public.

## Vérification automatisée

`e2e/universal-card.preview.spec.ts` couvre les six scénarios demandés, répartis en trois tests exécutés sur desktop et mobile :

1. Première visite depuis la landing : création minimale, aperçu de carte, pas de mariage imposé ; brouillon puis enregistrement avec compte explicites.
2. Retour sur Ma carte : carte existante, pas de saisie d’identité ; accès aux informations déjà connues.
3. Photographe + DJ : deux activités configurables séparément ; confirmation avant abandon d’une modification.
4. Mariage A comme photographe : identité non redemandée, réglages repris en un clic, installation et prestation calculées.
5. Mariage B comme invité : aucun fonctionnement professionnel imposé ; validation directe. Ajout ultérieur de DJ vérifié séparément.
6. Changement du nom sur la carte : les deux vues mariage et leurs événements dérivés reflètent le changement. Réponses contextuelles et activités demeurent identiques ; aucune personne copiée dans les invités.

Le test RSVP conserve les vérifications de validation/consentement et les réponses existantes en lecture seule. L’authentification et l’API de cet aperçu sont simulées : ce n’est pas une recette Clerk de production.

## Test humain à mener sans expliquer le modèle

Les tests automatisés ne démontrent pas la compréhension spontanée d’une personne. Aucun panel utilisateur réel n’a été réalisé dans cette session.

Donner à une personne découvrant BYAIME les seules consignes suivantes, une à une :

1. « Présentez-vous sur BYAIME. Ne créez pas de mariage. »
2. « Fermez puis revenez retrouver vos informations. »
3. « Vous êtes photographe et DJ. Préparez vos habitudes pour ces deux activités. »
4. « Vous photographiez le mariage A de 14 h à 23 h. Prévoyez 30 minutes d’installation. »
5. « Vous allez au mariage B comme invité. »
6. « Changez votre nom, puis retrouvez-le dans les deux mariages. »

Ne pas expliquer tables, profils, associations ou projections. Ne pas indiquer où cliquer. Noter les hésitations, retours arrière, demandes d’aide, saisies répétées et incompréhensions de confidentialité. Demander ensuite : « Qu’avez-vous créé ? Qu’avez-vous renseigné une seule fois ? Qui peut voir votre présence et vos besoins ? »

Critère humain : accomplissement sans aide ni nouvelle identité par mariage. Si un test échoue, corriger les libellés ou interactions en priorité, sans rouvrir l’architecture.

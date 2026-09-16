# BYAIME — rapport de compréhension UX

**16 septembre 2026 · Rapport pour validation · Aucun changement du code applicatif**

## Conclusion

**La séparation entre ma personne et ma participation devient claire une fois dans le parcours. Elle n’est pas encore suffisamment évidente à l’arrivée ni lors du choix entre deux mariages.**

Le point le plus concret concerne le second mariage : les deux mariages créés depuis l’interface étaient proposés sous le même nom **« Notre Mariage »**, sans date ni lieu. Le modèle peut les distinguer ; la personne devant l’écran, non.

Je recommande quelques corrections ciblées, pas une nouvelle conception du parcours.

## Méthode et limites

- Parcours réellement ouverts dans Chromium : accueil français, création d’une carte, recherche musicale, confirmation, connexion simulée, activité Photographe, consultation de Saxophoniste, écran de rattachement, création de deux mariages depuis les formulaires, participation comme Photographe puis Invité, récapitulatif et retour sur la carte. Inspection complémentaire de l’accueil sur une largeur mobile de 390 px.
- Navigation et captures instrumentées, **sans assertions de réussite ni remplacement des résultats musicaux par des réponses attendues**. Les observations ci-dessous ne sont pas les conclusions de la suite de tests automatisés.
- J’ai déjà connaissance de BYAIME : je ne peux pas prétendre être un utilisateur réellement naïf. Les libellés, états et obstacles sont observés ; les risques d’incompréhension sont une appréciation heuristique, pas des réactions recueillies auprès d’un panel.
- L’aperçu utilise un compte et un serveur en mémoire. Aucun vrai parcours Clerk ni rattachement d’une invitation réelle n’a été validé ici. Pour inspecter deux participations, les mariages ont été créés par l’interface ; cela ne prouve pas la compréhension complète d’un destinataire d’invitation externe.
- La recherche musicale a échoué dans cet environnement. **La sélection réelle et PLAY restent non validés dans cette recette**, indépendamment de leur validation automatisée antérieure.

## COMPRIS IMMÉDIATEMENT

### 1. L’action principale, une fois le bloc d’entrée repéré

« Créer ma carte » est le bouton le plus visible dans son bloc. « Vous ne créez pas encore un mariage » est explicite. L’import JSON reste replié dans les outils avancés : il ne concurrence plus le démarrage normal.

[Capture de l’accueil](recette-ux-preuves/accueil.png)

### 2. Ce qu’il faut saisir

Les rubriques **Identité / Moi / Ma musique** sont compréhensibles. Le texte indique que seuls prénom et nom sont nécessaires ; photo, pseudo et ville sont annoncés facultatifs. Il est possible d’avancer sans compléter une fiche exhaustive.

« Le morceau qui vous ressemble, directement sur votre carte » donne une raison compréhensible à la musique : une présentation personnelle, pas une tâche d’organisation du mariage.

### 3. La carte enregistrée et les activités facultatives

Le nom apparaît dans une représentation de carte. Le titre « Ma carte est prête » constitue un repère de fin visible. La mention « Facultatif » et « Invité, proche ou témoin ? Passez directement à votre mariage » lèvent explicitement l’obligation professionnelle — à condition de lire ce bloc.

[Capture après enregistrement](recette-ux-preuves/carte-prete.png)

### 4. Des paramètres différents selon l’activité

Photographe présente durée habituelle, installation et démontage ; Saxophoniste présente nombre de sets, durée, pauses, installation, démontage et soundcheck. Les champs propres au saxophoniste ne polluent pas la fiche photographe. Les précisions et exceptions sont repliées.

Les unités « minutes » sont explicites. Aucun nom de table n’est nécessaire pour utiliser ces écrans.

[Capture Saxophoniste](recette-ux-preuves/saxophoniste.png)

### 5. Une identité conservée dans les mariages

L’écran montre **« Vous rejoignez : … »** et **« Camille Martin · Votre carte est déjà renseignée »**. Il ne redemande ni identité, ni photo, ni ville, ni musique.

Dans le second mariage, Photographe n’est pas sélectionné automatiquement. Invité permet de valider sans passer par les réglages professionnels. Le récapitulatif propose bien **Modifier mon rôle** et **Modifier ma présence ou mes besoins**, plutôt qu’une nouvelle fiche d’identité.

[Capture du rôle dans le second mariage](recette-ux-preuves/role-second-mariage.png)

### 6. Les informations du mariage ne sont pas présentées comme publiques

Le rappel « Votre présence et vos besoins restent dans ce mariage, jamais sur votre fiche publique » est placé dans le contexte concerné. C’est un repère utile à conserver. Cela ne remplace pas un audit de permissions, hors de cette recette.

## HÉSITATIONS

### H1 — « Ce site est-il pour moi, ou seulement pour le couple ? »

**Observé :** le titre dominant de l’accueil dit « Tout votre mariage, dans un seul espace privé ». La navigation propose « Créer mon espace » ; le bloc inférieur dit « Créer ma carte ». Le reste de la page explique encore la création d’un mariage à partir d’une phrase.

**Risque estimé :** un invité ou un prestataire doit réconcilier ces messages avant de comprendre qu’il peut simplement se présenter. La finalité réutilisable de la carte reste moins visible que l’organisation du mariage.

### H2 — « Dois-je faire l’étape 02 avant l’étape 03 ? »

**Observé :** les repères sont numérotés ; la configuration professionnelle précède les mariages et bénéficie d’un bouton blanc très visible. « Rejoindre un mariage » est plus bas et visuellement secondaire.

**Risque estimé :** le mot « Facultatif » corrige le texte, mais pas complètement l’impression d’un ordre obligatoire. Un invité pressé peut commencer une activité inutilement.

### H3 — « Ma carte est-elle déjà sauvegardée ? »

**Observé :** sans compte, « Ma carte est prête » s’affiche avant « Votre brouillon est prêt sur cet appareil ». Après passage par la connexion simulée, le formulaire prérempli revient avec le bouton **« Créer ma carte »**.

**Risque estimé :** impression de créer deux fois la même chose, malgré l’absence de ressaisie. La transition réelle avec Clerk reste à confirmer en staging.

### H4 — « Où trouver le lien pour rejoindre ? »

**Observé :** l’écran de rattachement rappelle correctement que la carte existe déjà, puis demande un lien. Un long paragraphe expose ensuite les conditions de vérification.

**Risque estimé :** une personne sans lien ou avec une adresse différente ne sait pas immédiatement quelle action demander à l’organisateur. Le contrôle de sécurité doit rester ; son explication initiale peut être plus actionnable.

## AMBIGUÏTÉS

### A1 — Deux mariages impossibles à distinguer dans le sélecteur

Les mariages créés pour Paris le 12 juin et Lyon le 19 juin étaient tous deux libellés **« Notre Mariage »**. Le bandeau de participation n’ajoutait pas la date ou le lieu.

Pour poursuivre l’exploration, j’ai choisi les entrées par leur position. **Ce contournement n’est pas une réussite de compréhension spontanée.** C’est le principal obstacle à « la même personne, un autre mariage ».

### A2 — La portée d’une durée professionnelle

« Durée habituelle » ne précise pas immédiatement si elle comprend l’installation. Avec 480 minutes et 30 minutes d’installation, l’écran calcule 14 h–14 h 30 d’installation, puis 14 h 30–22 h 30 de photographie, malgré un départ renseigné à 23 h.

Ce résultat n’est pas signalé ici comme un défaut de calcul : les données expliquent le résultat. **C’est la définition du champ et la distinction prestation / présence qui méritent une phrase.** Pour Saxophoniste, « Durée des sets » devrait préciser « de chaque set » ; « Soundcheck » peut être accompagné de « balance sonore ».

### A3 — Disponibilité ne signifie pas réservation

« Disponibilités habituelles » situe correctement la notion d’habitude, mais l’écran professionnel n’énonce pas directement : **« Ces créneaux ne confirment votre présence à aucun mariage. »**

« Compatible avec vos disponibilités » est un constat de compatibilité, pas une réservation. La distinction dépend encore de l’interprétation de l’utilisateur.

### A4 — Que sait BYAIME après la validation ?

Dans le récapitulatif invité, l’interface pouvait afficher à la fois **« Tout est déjà là »**, **« Arrivée à préciser »** et l’annonce que BYAIME organise la Timeline. Le rôle et le RSVP sont connus ; tous les horaires ne le sont pas.

La formule rassurante est trop absolue. Une information non renseignée ne doit pas paraître déjà déduite.

### A5 — Quelques termes restent éloignés du langage courant

« Votre Carte Universelle », « AIME — Nouveau Monde », « RSVP » et « Retirer cette intervention » sont toujours visibles. Ils ne bloquent pas tous le parcours, mais multiplient les concepts alors que **Ma carte / Mon activité / Ce mariage / Ma présence** suffisent.

### A6 — Musique : une erreur qui ne dit pas quoi faire

La recherche « La vie en rose » a retourné **« Failed to fetch »**, en anglais, sur l’écran français. Le message ne distingue pas une indisponibilité du service d’une absence de résultat et n’indique pas clairement qu’on peut continuer sans musique.

L’échec réseau observé ici ne prouve pas une panne de production. En revanche, l’état d’erreur présenté est un problème de compréhension concret. Je ne conclus pas sur la compréhension du bouton PLAY, que ce parcours n’a pas permis d’atteindre.

## ACTIONS INUTILES

1. **Revenir à un formulaire intitulé « Créer ma carte » après avoir confirmé une carte prête.** L’enregistrement et le consentement restent nécessaires ; l’impression de recommencer ne l’est pas.
2. **Revoir un sélecteur « Quand commencez-vous ? » alors que l’arrivée connue vient d’être reprise.** Une valeur affichée avec « Modifier » suffirait dans ce cas ; la possibilité de choisir un autre début doit rester accessible.
3. **Exposer directement le fuseau `Europe/Paris` comme champ.** Il est déjà renseigné. L’afficher avec une possibilité de modification éviterait une question technique apparente.
4. **Rechercher son rôle dans toutes les catégories déployées.** Couple, famille, entourage et professionnels occupent un écran long. C’est une charge de lecture, pas une raison d’inférer automatiquement le rôle depuis la profession.

À l’inverse, **choisir son rôle dans un nouveau mariage n’est pas une action inutile**. Être photographe dans sa présentation ne permet pas de déduire pourquoi on est invité ailleurs. La confirmation de rattachement d’une invitation n’est pas non plus à supprimer.

## PROPOSITIONS — uniquement les corrections nécessaires

| Priorité | Modification proposée | Problème traité |
|---|---|---|
| **1** | Afficher titre **+ date + lieu disponibles** dans le choix du mariage et son bandeau. | Choisir le bon contexte sans deviner. |
| **1** | Distinguer clairement **brouillon prêt** et **carte enregistrée** ; après connexion, parler d’enregistrement de la carte existante, pas de création recommencée. | Incertitude sur la fin du parcours et la sauvegarde. |
| **1** | Remplacer l’erreur musicale brute par un message français, une action Réessayer et la possibilité explicite de continuer sans musique. Retester ensuite recherche, sélection et PLAY avec le service réel. | Échec sans issue compréhensible ; portion de recette non validée. |
| **2** | Harmoniser l’introduction et les entrées autour de la personne ; expliquer en une phrase que sa carte la suit dans ses différents mariages. | Collision « mon espace / mon mariage / ma carte ». |
| **2** | Présenter les deux suites **Mon activité — facultatif** et **Rejoindre un mariage** au même niveau de lecture. | Impression de devoir passer par le professionnel. |
| **2** | Ajouter de courtes définitions : durée de prestation hors installation, durée de chaque set, balance sonore ; préciser que les disponibilités ne sont pas des présences confirmées. | Ambiguïtés opérationnelles sans modifier les calculs. |
| **2** | Montrer les valeurs déjà connues en lecture avec Modifier ; nuancer « Tout est déjà là » si une information manque. | Répétition apparente et promesse excessive. |
| **3** | Remplacer les termes techniques résiduels et alléger le choix des rôles sans jamais présélectionner un rôle professionnel. | Charge de lecture évitable. |

**Aucune proposition ne nécessite de modifier les trois niveaux architecturaux.** Aucune n’a été appliquée.

## Points à isoler avant une recette humaine en staging

- L’écran de connexion utilisé est explicitement un simulateur et contient du texte technique de démonstration : je ne le compte pas comme un défaut du vrai formulaire Clerk.
- Après création de mariage avec seulement date et ville, l’espace d’aperçu affichait aussi des personnes, un budget engagé et des tâches non saisis pendant cette exploration. L’origine de ces valeurs n’a pas été diagnostiquée ici. Elles doivent être clairement distinguées des données confirmées avant d’évaluer la confiance dans « BYAIME connaît déjà le reste ». **Pas de conclusion sur la production à partir de cet aperçu.**
- Une session neuve ouverte en anglais montrait la page d’accueil anglaise avec le bloc carte en français. Le parcours français a ensuite été exploré séparément. Ce mélange doit être évité pour une recette anglophone.

## Décision proposée

Valider d’abord les corrections de priorité 1, puis les clarifications de priorité 2. Refaire ensuite une séance avec de vrais nouveaux utilisateurs, sans expliquer les concepts internes.

**Statut : rapport remis ; attente de validation avant toute modification du parcours.**

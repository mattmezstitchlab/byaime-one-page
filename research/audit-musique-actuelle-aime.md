# Audit de la musique actuelle d’AIME

**Date de rédaction :** 8 septembre 2026  
**Périmètre :** application active Byaime, API active et ancienne référence locale  
**Nature :** audit factuel du code ; aucune intégration musicale ni modification de l’interface

## Résumé exécutif

AIME possède aujourd’hui **un registre de morceaux éditable et relié partiellement à la Timeline**, mais pas encore un système de recherche, de lecture ou de collaboration musicale.

La partie réellement active permet d’ajouter un morceau sous forme de texte, de modifier son Moment, son titre, son artiste et son statut, puis de sauvegarder le Monde complet. Deux morceaux de démonstration sont reliés à des événements de la Timeline. La vue Musique sait filtrer les Moments portant une relation de type musique, et l’audit sait signaler les morceaux qui n’ont aucun service externe.

En revanche :

- aucune recherche de catalogue n’est branchée ;
- aucun fournisseur musical n’est appelé ;
- aucun identifiant externe n’existe dans les données actives de démonstration ;
- aucun fichier audio n’est accepté par l’endpoint actif de téléversement audité ;
- aucun son n’est lu par le « mode lecture » ;
- aucune file audio, transition, synchronisation ou reprise n’existe ;
- aucun droit, consentement ou territoire n’est associé à un morceau ;
- aucune proposition musicale, approbation ou collaboration propre à la musique n’est modélisée.

Le bouton présenté comme « Lire la Timeline musicale » ouvre en réalité un diaporama de Moments qui avance toutes les quatre secondes. Il ne lit ni les morceaux ni des médias audio. Cette distinction doit rester explicite jusqu’à ce que la lecture réelle existe.

L’ancienne référence contient des idées plus riches — programmation par jour et heure, proposition puis validation, lien ou fichier audio, dédicace, visibilité, projection de médias vers une file — mais elle n’est pas branchée à l’application active. Elle dépend d’une ancienne architecture Supabase, de modules absents et d’hypothèses de lecture trop risquées pour être transplantées. Sa valeur est surtout conceptuelle. Le constructeur de file `buildQueue.ts` constitue la meilleure base algorithmique réutilisable, après adaptation.

## 1. Méthode et légende

L’audit suit les chemins réellement importés par l’artifact actif, puis compare l’ancienne référence située sous `artifacts/byaime-onepage/reference/source-zip/`. Une capacité n’est dite réelle que si elle est :

1. présente dans l’application active ;
2. atteignable depuis l’interface active ;
3. reliée à un état effectif ;
4. sauvegardable lorsque l’utilisateur est authentifié et autorisé.

Les statuts utilisés sont :

- **Réelle** : active et fonctionnelle de bout en bout dans son périmètre déclaré.
- **Partielle** : une partie existe — type, affichage, état ou persistance — mais la capacité n’est pas complète.
- **Absente** : aucune implémentation active ne fournit le résultat attendu.
- **Réutilisable** : idée ou code de l’ancienne référence pertinent, mais non actif et à adapter.

## 2. Ce qui est réellement actif

### 2.1 Le modèle musical

Le type actif `MusicTrack` contient :

- un identifiant AIME ;
- un libellé de Moment ;
- un titre ;
- un artiste ;
- un statut « à choisir » ou « validé » ;
- des notes facultatives ;
- une liste facultative d’identifiants d’événements ;
- une provenance facultative ;
- une correspondance externe facultative composée d’un fournisseur, d’un identifiant et d’une date de vérification.

Il ne contient aucun URL de lecture, fichier, durée, version d’enregistrement, ISRC, MBID, territoire, disponibilité, titulaire, licence, consentement, audience, propriétaire ou historique d’édition. La correspondance externe ne peut représenter qu’un fournisseur à la fois et n’est utilisée nulle part dans un parcours actif.  
**Preuve :** `artifacts/byaime-onepage/src/lib/types.ts:121-131`.

La Timeline possède un modèle plus riche : relations typées, propriétaire, provenance, visibilité, audience, dépendances et ressources. « music » est un type de relation autorisé.  
**Preuve :** `artifacts/byaime-onepage/src/lib/types.ts:166-204`.

Le Monde stocke séparément `timeline`, `music` et `media`. Le champ `media` réutilise cependant le type de souvenir `MemoryItem` ; il ne représente pas un média sonore jouable.  
**Preuve :** `artifacts/byaime-onepage/src/lib/types.ts:206-240`.

### 2.2 Deux mécanismes de liaison coexistent

La musique active peut être reliée à la Timeline de deux manières :

1. le morceau contient `timelineEventIds` ;
2. l’événement contient une relation `{ kind: "music", id: ... }`.

Le graphe actif ne lit que les relations portées par les événements. Il indexe les morceaux comme entités, puis construit les relations inverses à partir de `TimelineEvent.relations`. Il n’utilise jamais `MusicTrack.timelineEventIds`.  
**Preuve :** `artifacts/byaime-onepage/src/lib/timeline-graph.ts:13-45`.

La vue Musique filtre elle aussi les événements selon la présence d’une relation de type `music`, et non selon `timelineEventIds`.  
**Preuve :** `artifacts/byaime-onepage/src/lib/timeline-graph.ts:125-135`.

La normalisation initialise `timelineEventIds` mais ne transforme pas ces IDs en relations, et ne réconcilie pas les deux directions.  
**Preuve :** `artifacts/byaime-onepage/src/lib/project-migration.ts:17-50`.

**Classification : Partielle.** Les liens de démonstration fonctionnent parce que les deux directions ont été saisies manuellement dans les données initiales. Rien ne garantit leur cohérence après une édition.

### 2.3 Les données initiales sont explicitement des données de démonstration

Un nouveau mariage reçoit quatre entrées :

- « Entrée des mariés » — à choisir ;
- « Cérémonie · sortie » — Home, Edward Sharpe & The Magnetic Zeros ;
- « Ouverture du bal » — à choisir ;
- « Fin de soirée » — playlist libre.

Les quatre entrées portent la provenance `demo`. Deux ont des `timelineEventIds`, les deux autres n’en ont pas. Aucun fournisseur ni identifiant externe n’est fourni.  
**Preuve :** `artifacts/byaime-onepage/src/lib/parser.ts:187-192`.

Les événements « L’engagement » et « L’ouverture du bal » portent effectivement des relations vers les morceaux `m2` et `m3`.  
**Preuve :** `artifacts/byaime-onepage/src/lib/seed-data.ts:107-121`.

**Classification : Réelle comme démonstration, pas comme catalogue.** L’application montre des métadonnées et des liens de graphe réels, mais elle ne démontre aucune résolution ni lecture musicale.

### 2.4 La persistance est réelle, mais générique

Le projet entier est enregistré dans un seul document JSONB. Il n’existe aucune table propre aux morceaux, correspondances fournisseurs, droits, lectures ou sessions.  
**Preuve :** `lib/db/src/schema/aime.ts:17-25`.

L’état est immédiatement écrit dans un cache local associé à l’utilisateur. Lorsqu’un utilisateur est authentifié, le Monde complet est enregistré après un délai de 900 ms. La mise à jour utilise un contrôle optimiste de version et peut répondre par un conflit.  
**Preuve :** `artifacts/byaime-onepage/src/store/project-store.tsx:136-176`.

Les fonctions génériques `addEntity`, `updateEntity` et `removeEntity` modifient les collections du Monde sans logique musicale spécifique.  
**Preuve :** `artifacts/byaime-onepage/src/store/project-store.tsx:222-261`.

Le serveur refuse les modifications d’un lecteur et vérifie la version du Monde avant d’écraser le JSON complet.  
**Preuve :** `artifacts/api-server/src/routes/aime.ts:243-265`.

**Classification : Réelle pour les métadonnées du Monde ; partielle pour un domaine musical.** La sauvegarde existe, mais il n’y a ni validation musicale, ni opération atomique par morceau, ni historique ou fusion de contributions concurrentes.

## 3. Interfaces actives et résultats réels

### 3.1 Destination Musique

La destination Musique est montée dans `ProjectStage`. Son introduction la présente comme une « projection sonore » et ouvre le panneau de gestion des morceaux. La Timeline est affichée sous cette introduction.  
**Preuve :** `artifacts/byaime-onepage/src/components/ProjectStage.tsx:494-507` et `:537-553`.

Le panneau permet :

- d’ajouter une entrée textuelle ;
- de changer son Moment ;
- de modifier titre et artiste ;
- de basculer entre « à choisir » et « validé » ;
- de supprimer l’entrée.

Il ne permet pas de choisir un événement existant, rechercher une œuvre, sélectionner une version, relier un fournisseur, écouter, téléverser un son, définir une audience ou documenter un droit.  
**Preuve :** `artifacts/byaime-onepage/src/components/panels/WeddingModulesPanel.tsx:162`.

**Classification : Réelle pour l’édition de métadonnées simples.**

### 3.2 Filtre musical de la Timeline

Le filtre musical renvoie uniquement les événements possédant une relation de type `music`. Les morceaux manuels non reliés sont donc absents de la projection, même s’ils existent dans la collection `music`.  
**Preuve :** `artifacts/byaime-onepage/src/lib/timeline-graph.ts:125-135`.

**Classification : Réelle mais étroite.** Elle projette les relations actives, pas toute la collection musicale.

### 3.3 Audit des liens

`TimelineAudit` calcule :

- les éléments reliés ;
- les éléments isolés ;
- les relations cassées ;
- les morceaux ajoutés à la main sans service externe.

Chaque compteur ouvre une liste de lecture seule. Le panneau ne répare pas une relation et ne lance aucune recherche fournisseur.  
**Preuve :** `artifacts/byaime-onepage/src/components/TimelineAudit.tsx:7-31` et `:33-83`.

L’audit considère tout morceau sans champ `external` comme manuel et signale qu’une intégration est requise.  
**Preuve :** `artifacts/byaime-onepage/src/lib/timeline-graph.ts:138-146`.

**Classification : Partielle.** Le diagnostic est réel ; la résolution ne l’est pas.

### 3.4 « Lire la Timeline musicale »

Le dock déclenche `PlayMode` avec les événements visibles. `PlayMode` trie ces événements, affiche leur date, titre et détail, puis passe au suivant toutes les quatre secondes. Les boutons précédent, pause et suivant ne modifient qu’un état local.  
**Preuve :** `artifacts/byaime-onepage/src/components/ProjectStage.tsx:543-553` et `artifacts/byaime-onepage/src/components/PlayMode.tsx:6-27,53-115`.

Il n’y a aucun élément `audio`, aucune URL média, aucune correspondance entre un événement et un morceau, aucune durée musicale et aucune file de lecture.

**Classification : Absente pour la lecture audio ; partielle comme lecture visuelle de la Timeline.**

Le libellé musical est donc en avance sur la fonction réelle. Tant qu’aucun son n’est lu, l’action devrait être comprise comme « parcourir les Moments musicaux », pas comme un lecteur.

### 3.5 Permissions actives

Le serveur possède de vraies permissions de Monde. Un lecteur ne peut pas enregistrer une mise à jour ; les autres rôles éditables le peuvent.  
**Preuve :** `artifacts/api-server/src/routes/aime.ts:243-255`.

L’interface de la Timeline utilise `canEdit` pour masquer ou désactiver les actions d’édition.  
**Preuve :** `artifacts/byaime-onepage/src/components/UniversalTimeline.tsx:182-193,219-246`.

Le panneau musical, lui, affiche ses boutons et champs sans vérifier `canEdit`. Un lecteur peut donc modifier son état local et provoquer une tentative de sauvegarde que le serveur refusera.  
**Preuve :** `artifacts/byaime-onepage/src/components/panels/WeddingModulesPanel.tsx:36-47,162` et `artifacts/byaime-onepage/src/store/project-store.tsx:262-276`.

**Classification : Partielle.** La sécurité serveur est réelle ; l’expérience et la prévention côté interface sont incohérentes.

### 3.6 Médias téléversés

L’endpoint actif de demande d’upload autorise PDF, JPEG, PNG, WebP et MP4 et refuse les autres MIME déclarés, dont l’audio.  
**Preuve :** `artifacts/api-server/src/routes/aime.ts:34,374-399`.

Les fichiers disposent d’un propriétaire, d’un chemin privé et de métadonnées génériques, mais aucun fichier n’est relié à un `MusicTrack`.  
**Preuve :** `lib/db/src/schema/aime.ts:48-57`.

Les rôles `owner` et `planner` peuvent téléverser et supprimer des fichiers. Tout membre du Monde peut lister et télécharger les fichiers, tandis que le rôle `family` peut modifier le JSON du Monde sans pouvoir téléverser. Cette asymétrie devra être décidée explicitement avant d’introduire des contributions audio.  
**Preuve :** `artifacts/api-server/src/routes/aime.ts:374-424`.

**Classification : Absente pour l’audio ; réelle pour les documents et médias génériques non sonores.**

## 4. Matrice complète des capacités

| Capacité | Statut | Ce qui fonctionne | Ce qui manque |
|---|---|---|---|
| Créer un morceau | **Réelle** | Ajout d’une entrée textuelle au Monde | Source, version, durée, propriétaire, événement choisi |
| Modifier titre, artiste et Moment | **Réelle** | Édition immédiate puis sauvegarde générique | Validation métier, historique, correction collaborative |
| Valider un morceau | **Réelle** | Bascule entre deux statuts | Approbateur, date, motif, proposition distincte |
| Supprimer un morceau | **Réelle** | Retrait de la collection JSON | Nettoyage garanti des relations inverses |
| Relier musique et Timeline | **Partielle** | Relations de démonstration fonctionnelles | Une seule source de vérité et un éditeur de relation |
| Filtrer la Timeline par musique | **Réelle** | Affiche les événements portant une relation `music` | Afficher ou traiter les morceaux non reliés |
| Auditer les morceaux manuels | **Partielle** | Détecte l’absence de `external` | Rechercher, réparer, confirmer ou ignorer |
| Rechercher un catalogue | **Absente** | Rien dans le client ou l’API | Fournisseur, requête, résultats, sélection, erreurs |
| Identifier une œuvre/enregistrement | **Partielle** | Champ externe générique dans le type | Plusieurs IDs, ISRC/MBID, version, provenance de résolution |
| Ouvrir un fournisseur | **Absente** | Aucun lien actif | Deep link conforme et disponibilité |
| Lire un morceau | **Absente** | Aucun son actif | Lecteur, compte, autorisation, état d’erreur |
| Lire la Timeline | **Partielle** | Diaporama visuel de quatre secondes par Moment | Média réel, durée, seek, reprise, erreurs |
| Construire une file sonore | **Absente** | Aucun ordonnanceur actif | Projection, préchargement, chevauchement, reprise |
| Gérer transitions/crossfade | **Absente** | Aucune transition audio | Descripteurs et moteur d’exécution |
| Téléverser un fichier audio | **Absente** | Stockage privé générique existant | MIME audio, modèle, droit, durée, suppression, lecture |
| Synchroniser son et image | **Absente** | Aucun binding temporel | Droits de synchronisation et segments temporels |
| Contribuer à plusieurs | **Partielle** | Membres du Monde et sauvegarde partagée | Proposition, commentaire, approbation par morceau |
| Gérer les conflits | **Partielle** | Conflit optimiste sur le JSON du Monde | Fusion ou opération atomique par contribution |
| Définir visibilité/audience | **Partielle** | Champs sur les événements | Visibilité et audience propres au son |
| Gérer droits et consentements | **Absente** | Aucun champ ni workflow | Usage, territoire, titulaire, audience, retrait |
| Publier la musique | **Absente** | La projection publique n’expose pas `music` | Politique de publication et média autorisé |
| Journaliser ce qui a joué | **Absente** | Aucun événement de lecture | Session, ordre réel, appareil, erreur, horodatage |

La projection publique active ne renvoie que les événements visibles par l’audience selon une liste de champs autorisés. Elle n’expose ni la collection `music`, ni les relations internes, ni les fichiers.  
**Preuve :** `artifacts/api-server/src/lib/publicProfile.ts:3-55`.

## 5. Écarts et risques prioritaires

### Risque 1 — Une promesse de lecture sans audio

Le parcours et le libellé peuvent faire croire qu’AIME lit une Timeline musicale alors qu’il joue un diaporama. Ce risque est fonctionnel et éditorial : une action visible semble produire un résultat différent de son intitulé.

### Risque 2 — Deux graphes peuvent diverger

`timelineEventIds` et `TimelineEvent.relations` expriment le même lien dans deux directions sans réconciliation. Ajouter, supprimer ou importer un morceau peut laisser une direction obsolète.

### Risque 3 — Les nouveaux morceaux utilisateur peuvent devenir « démo »

L’interface ajoute un morceau sans provenance. À la prochaine normalisation, tout morceau sans provenance reçoit `demo`. Une saisie réelle de l’utilisateur peut donc être reclassée comme donnée de démonstration.  
**Preuve :** `artifacts/byaime-onepage/src/components/panels/WeddingModulesPanel.tsx:162` et `artifacts/byaime-onepage/src/lib/project-migration.ts:44`.

### Risque 4 — Les lecteurs voient des commandes qu’ils ne peuvent pas sauvegarder

Le serveur protège les données, mais le panneau musical ne reflète pas cette permission. L’utilisateur peut croire qu’une modification a été acceptée avant de recevoir un échec de synchronisation.

### Risque 5 — Le modèle encourage encore la liste

Le champ `moment` est du texte libre et les entrées sont rendues comme une collection de lignes. Le langage de la page parle de Moments, mais l’outil n’oblige pas à choisir un vrai Moment. Le produit reste donc structurellement proche d’une liste de chansons.

### Risque 6 — La collaboration est celle du document entier

Les membres peuvent modifier le même Monde, mais il n’existe aucune proposition musicale autonome. Deux éditions concurrentes provoquent un conflit de version du document complet au lieu d’une résolution par contribution.

### Risque 7 — Le type fournisseur est trop faible pour devenir universel

Un seul couple `provider/externalId` ne permet ni plusieurs catalogues, ni plusieurs territoires, ni une version d’enregistrement, ni une confiance de rapprochement. Il ne doit pas devenir la clé durable du futur système.

## 6. Ancienne référence : ce qui existe et ce qui n’est pas actif

### 6.1 Preuve de séparation

Les implémentations de référence examinées — `MusicBox`, `buildQueue` et leurs dépendances — se trouvent sous `artifacts/byaime-onepage/reference/source-zip/`. Elles ne sont pas importées par `artifacts/byaime-onepage/src`. Aucune occurrence de `MusicBox`, `buildQueue` ou `reference/source-zip` n’existe dans les imports ou la configuration de l’artifact actif.

La référence dépend en outre de modules Supabase, d’un ancien hook d’authentification, d’un bus audio, d’un calendrier, d’un fournisseur Radio et de types absents du snapshot. Elle ne peut pas être compilée comme partie de l’application active.  
**Preuve :** `artifacts/byaime-onepage/reference/source-zip/components/MusicBox.tsx:1-23` et `artifacts/byaime-onepage/reference/source-zip/lib/buildQueue.ts:1-3`.

### 6.2 MusicBox

La MusicBox de référence propose :

- un calendrier et une programmation par jour et heure ;
- plusieurs types de contenu ;
- un lien externe ou un fichier audio ;
- une durée ;
- une dédicace ;
- une visibilité ;
- un statut « proposé » ou « validé » ;
- une approbation par un gestionnaire ;
- un indicateur « à l’antenne ».

**Preuve :** `artifacts/byaime-onepage/reference/source-zip/components/MusicBox.tsx:25-55,90-168,236-371,375-463`.

Cette richesse ne constitue pourtant pas une intégration fournisseur :

- un URL Spotify, YouTube ou SoundCloud est simplement saisi à la main ;
- un URL arbitraire peut être ouvert dans un nouvel onglet ;
- certains liens deviennent des iframes sans validation contractuelle ;
- le fichier est téléversé sans validation visible de taille ou de durée ;
- la lecture crée un nouvel élément `Audio` sans cycle de vie, reprise ou transition ;
- le composant ne possède aucune présence temps réel ou résolution de conflit ;
- supprimer l’entrée ne supprime pas explicitement le fichier stocké.

**Preuve :** `artifacts/byaime-onepage/reference/source-zip/components/MusicBox.tsx:115-196,298-333,418-462`.

L’application active ne possède même pas ce mécanisme de lien manuel : il appartient uniquement à la référence. L’absence active porte donc à la fois sur l’intégration fournisseur et sur l’ouverture d’un URL musical enregistré.

**Classification : Réutilisable comme concept de contribution et de programmation ; code non transplantable.**

### 6.3 Projection de morceaux et médias vers la Timeline

La référence définit des `WorldTrack` avec heure relative, titre, artiste, Moment, dédicace et confiance. Elle projette ensuite chaque morceau en repère audio de la Timeline, et les photos/vidéos en repères média reliés aux personnes.  
**Preuve :** `artifacts/byaime-onepage/reference/source-zip/lib/types.ts:114-134,160-200` et `artifacts/byaime-onepage/reference/source-zip/lib/derive.ts:173-209`.

Le concept est cohérent avec la direction actuelle : les médias doivent être projetés vers les Moments. Mais ces morceaux n’ont toujours ni URL, ni fournisseur, ni droit de lecture. La confiance ne constitue pas une licence.

**Classification : Réutilisable comme principe de projection ; modèle insuffisant pour la lecture.**

### 6.4 Constructeur de file

`buildQueue.ts` contient une fonction pure qui :

1. filtre les repères selon une portée ;
2. reconnaît photos, vidéos, audio, musique et texte ;
3. filtre selon le mode demandé ;
4. trie par heure ;
5. ajoute éventuellement de la narration ;
6. produit une file avec durée, priorité et transition.

**Preuve :** `artifacts/byaime-onepage/reference/source-zip/lib/buildQueue.ts:8-17,19-71,74-106,108-167`.

Cette séparation « Timeline → filtre → tri → enrichissement → file » est la meilleure pièce réutilisable. Elle reste incomplète :

- la durée d’un morceau est arbitrairement fixée à trois minutes ;
- les dates reposent sur le fuseau local ;
- les modes « film » et « narration » acceptent tout ;
- les transitions ne sont que des descripteurs ;
- aucun chevauchement, échec, préchargement, seek ou contrôleur n’est géré ;
- plusieurs dépendances importées sont absentes.

**Classification : Réutilisable avec adaptation et tests ; aucun moteur de lecture actif.**

## 7. Décision : ce qu’il faut conserver ou écarter

### Conserver de l’actif

1. **Le Moment comme point d’entrée de navigation.**
2. **Les relations typées portées par la Timeline**, après suppression de la double source de vérité.
3. **La provenance et la visibilité génériques**, à spécialiser pour le son.
4. **Le contrôle de version du Monde**, comme filet de sécurité transitoire.
5. **L’audit des relations**, à transformer en parcours de résolution.

### Réutiliser de la référence

1. **La séparation proposition / validation.**
2. **La programmation avec heure et durée.**
3. **La dédicace et le contexte relationnel.**
4. **La fonction pure de construction de file**, après remplacement de ses types et durées arbitraires.
5. **La projection des médias vers la Timeline**, mais à partir du modèle actif.

### Ne pas reprendre

1. L’accès direct à Supabase et son ancien modèle d’authentification.
2. Le collage d’un URL présenté comme une intégration fournisseur.
3. Les iframes arbitraires avec autoplay.
4. Un élément `Audio` créé à chaque clic.
5. La confiance côté interface comme unique contrôle de permission.
6. Les durées par défaut utilisées comme si elles étaient des métadonnées réelles.

## 8. Couverture des critères de l’audit

- [x] Les composants actifs, données, relations Timeline et permissions sont décrits.
- [x] L’application active est séparée explicitement du code de référence non branché.
- [x] Recherche, fournisseurs, lecture audio, contenus téléversés, collaboration et synchronisation sont évalués séparément.
- [x] Chaque capacité est classée comme réelle, partielle, absente ou réutilisable.
- [x] Les risques d’enfermement dans une liste et les migrations nécessaires sont identifiés.
- [x] Les recommandations distinguent le prochain parcours de recherche/lecture et l’architecture sonore universelle.

## 9. Conclusion et ordre de migration recommandé

L’état actuel n’est pas vide : AIME possède déjà les premières briques utiles — métadonnées, Moments, relations, provenance, visibilité, sauvegarde du Monde et audit des liens.

Mais ces briques ne forment pas encore une expérience musicale. La recherche, la résolution fournisseur, la lecture audio, les fichiers sonores, les propositions, les droits, la session et la synchronisation sont absents ou uniquement évoqués par des types et des libellés.

La migration correcte n’est donc pas « brancher Spotify dans la liste ». Elle doit conduire des métadonnées manuelles à une correspondance vérifiée, puis à une relation canonique au Moment, une lecture conditionnelle, une collaboration gouvernée, une session réelle et enfin une Timeline multimédia.

### Pour la tâche « Rechercher et écouter de vrais morceaux depuis la Timeline »

#### 1. Réparer les fondations avant le fournisseur

- Choisir une seule source de vérité pour le lien Moment ↔ musique.
- Migrer ou dériver `timelineEventIds` depuis les relations, puis empêcher toute divergence.
- Marquer les nouvelles entrées utilisateur comme `real`.
- appliquer `canEdit` au panneau musical avant toute intégration.

Sans ces corrections, une recherche réelle enregistrerait ses résultats dans un graphe ambigu et sous une provenance potentiellement fausse.

#### 2. Introduire un contrat d’adaptateur

La recherche ne doit pas retourner directement un `MusicTrack`. Elle doit produire une correspondance fournisseur explicite avec :

- fournisseur ;
- identifiant externe ;
- titre, artistes et version ;
- image et durée déclarées ;
- territoire ou storefront observé ;
- capacité disponible : lien, extrait ou lecture ;
- date et provenance de résolution.

Le modèle AIME garde son identifiant interne ; le fournisseur reste remplaçable.

#### 3. Livrer la recherche avant de promettre la lecture

Le premier parcours complet doit permettre :

1. d’ouvrir un Moment ;
2. de rechercher ;
3. de comparer des résultats ;
4. d’en choisir un ;
5. de sauvegarder la correspondance ;
6. d’afficher clairement sa provenance et sa disponibilité ;
7. d’ouvrir le fournisseur si la lecture intégrée n’est pas autorisée.

Un résultat sans lecture doit rester utile et honnête.

#### 4. Ajouter la lecture comme capacité séparée

Le bouton de lecture ne doit apparaître que si l’adaptateur confirme une capacité effective pour cet utilisateur et ce territoire. Les états chargement, authentification, abonnement requis, indisponibilité, révocation et erreur doivent être visibles.

Le « mode lecture » générique ne doit pas être utilisé comme preuve de lecture audio.

#### 5. Tester les échecs avant la file

Les critères minimaux sont :

- aucun faux bouton de lecture ;
- aucune perte du Moment si le fournisseur disparaît ;
- aucune sauvegarde par un lecteur ;
- aucune divergence de relation ;
- aucun morceau réel reclassé en démo ;
- un état explicite quand un résultat n’est pas lisible.

### Pour l’architecture sonore universelle

#### 6. Remplacer progressivement la ligne de playlist par quatre objets

- **Sound Item** : identité AIME du son ;
- **Provider Mapping** : correspondances externes multiples ;
- **Media Binding** : relation entre tout ou partie du son et un Moment ;
- **Rights & Consent Statement** : conditions d’usage, territoire, audience et retrait.

Cette recommandation prolonge la recherche mondiale détaillée dans `research/timeline-sonore-mondiale-aime.md`.

#### 7. Séparer Partition et Session

La préparation conserve propositions, réactions, objections et décisions. La session conserve l’ordre réel, l’hôte, l’appareil, les incidents et ce qui a effectivement été joué. Une playlist collaborative ne doit pas servir de journal d’exécution.

#### 8. Adapter ensuite le constructeur de file

Réutiliser la structure pure de `buildQueue.ts` seulement lorsque les médias possèdent :

- une durée fiable ;
- une capacité de lecture réelle ;
- un droit d’usage ;
- une audience ;
- un comportement en cas d’échec.

La file devient une projection de la Timeline, jamais une deuxième source de vérité.

#### 9. Ajouter les médias personnels après droits et consentements

Le stockage actif sait déjà protéger des fichiers privés, mais n’accepte pas l’audio et ne connaît pas les droits. Avant d’ouvrir le téléversement sonore, il faut modéliser propriétaire, personnes concernées, audience, consentement, retrait, durée de conservation et suppression de tous les dérivés.

#### 10. Construire la synchronisation multimédia en dernier

Son, image, vidéo, transcription et narration ne doivent être synchronisés que lorsque leurs droits et segments temporels sont connus. La synchronisation n’est pas une propriété décorative du lecteur ; c’est une relation durable entre médias et Moment.
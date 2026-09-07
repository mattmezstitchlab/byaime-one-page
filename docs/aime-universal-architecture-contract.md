# AIME — Contrat d’architecture du réseau universel

Statut : proposition de référence avant convergence du ZIP historique et de l’application Replit actuelle.

## 1. Vision

AIME est un réseau vivant dans lequel une intention, un contenu brut ou une rencontre peut devenir un Monde structuré.

Le produit relie :

- des identités ;
- des personnes et organisations représentées par des Cartes ;
- des Mondes / Projets ;
- des lieux ;
- des moments ;
- des ressources et besoins ;
- des documents et médias ;
- des relations ;
- des actions.

La Carte, la Timeline, le Fil, le LAB, le Bureau et Radio/TV sont des projections du même graphe. Ils ne possèdent pas de copies concurrentes des données métier.

## 2. Lois d’architecture

### 2.1 Une entité, une source canonique

Chaque donnée métier possède une seule source de vérité et un seul identifiant stable.

Une personne affichée dans :

- un pin ;
- une Carte contextuelle ;
- un projet ;
- un commentaire ;
- une équipe ;
- un LAB ;

reste la même entité. Les interfaces ne copient que son identifiant.

### 2.2 Une source, plusieurs projections

Les surfaces suivantes sont des lectures du graphe :

- Carte géographique ;
- Liste accessible ;
- Fil ;
- page Carte ;
- page Monde ;
- Timeline ;
- calendrier ;
- LAB ;
- Bureau ;
- Radio/TV ;
- notifications.

Une modification validée sur une projection met à jour l’entité canonique, puis toutes les projections se recalculent.

### 2.3 Géométrie et préférence ne sont pas des données métier

Les positions d’un objet dans le LAB, l’ordre d’un module ou l’état d’un panneau sont des préférences de présentation.

Supprimer un objet visuel du LAB ne supprime jamais automatiquement :

- la personne ;
- le document ;
- le projet ;
- le média ;
- la relation métier référencée.

### 2.4 L’intelligence propose, l’humain décide

Une sortie d’analyse devient toujours une proposition traçable avant de modifier le graphe.

Chaque proposition conserve :

- la source ;
- la valeur brute ;
- la valeur normalisée ;
- la confiance ;
- les raisons ;
- les objets concernés ;
- les conflits éventuels ;
- son auteur humain ou automatique ;
- son statut.

Statuts minimaux :

- proposée ;
- modifiée ;
- validée ;
- écartée ;
- appliquée ;
- en conflit.

### 2.5 Les permissions sont serveur

Masquer un bouton n’est pas une autorisation.

Toute lecture ou écriture sensible est vérifiée côté API selon :

- l’identité connectée ;
- sa relation avec l’objet ;
- son niveau d’accès dans le Monde ;
- la visibilité de l’entité ;
- la nature de l’action ;
- les éventuelles règles spécifiques du module.

### 2.6 Pas de double écriture

Pendant la convergence, une entité ne peut avoir qu’un seul système d’écriture canonique.

Les comparaisons temporaires peuvent faire une double lecture. Elles ne doivent jamais écrire simultanément dans le JSONB Replit et les tables Supabase historiques.

## 3. Vocabulaire canonique

### 3.1 Identity

Compte authentifié.

Une Identity peut posséder ou administrer plusieurs Cartes, selon les règles de délégation.

### 3.2 Card

Représentation sociale et contextuelle d’un sujet du réseau.

Types initiaux :

- personne ;
- organisation ;
- entreprise ;
- association ;
- artiste ;
- professionnel ;
- lieu ;
- service ;
- ressource.

Une Card possède notamment :

- une identité publique ;
- un type ;
- une présentation ;
- un média principal ;
- des compétences et thèmes ;
- une visibilité ;
- des coordonnées optionnelles ;
- des moyens de contact autorisés ;
- des propriétaires et administrateurs.

### 3.3 World

Contexte organisé : mariage, association, entreprise, voyage, festival, cause, chantier, œuvre ou projet personnel.

Un World possède :

- une intention ;
- un titre ;
- un type ou modèle ;
- un statut ;
- une visibilité ;
- des propriétaires ;
- des membres ;
- des lieux ;
- des moments ;
- des ressources ;
- des documents ;
- des relations ;
- des modules activés.

### 3.4 Place

Lieu physique, zone, adresse, salle, territoire ou espace virtuel.

Les coordonnées exactes peuvent être privées tandis qu’une ville ou zone approximative reste publique.

### 3.5 Moment

Objet temporel universel :

- événement ;
- étape ;
- tâche ;
- échéance ;
- réservation ;
- paiement ;
- publication ;
- souvenir ;
- diffusion ;
- disponibilité.

La Timeline et le calendrier sont deux projections des Moments.

### 3.6 Resource

Ce qui est disponible, recherché, proposé ou consommé :

- compétence ;
- service ;
- matériel ;
- budget ;
- financement ;
- billet ;
- hébergement ;
- transport ;
- disponibilité ;
- opportunité.

Une Resource peut exprimer une offre ou un besoin.

### 3.7 Document

Fichier métier et son analyse.

Un Document conserve :

- le fichier original ;
- son propriétaire ;
- ses droits ;
- son empreinte ;
- son type ;
- sa provenance ;
- ses extractions ;
- les entités proposées ;
- les liens validés avec le graphe.

### 3.8 Media

Image, audio ou vidéo avec :

- provenance ;
- propriétaire ;
- droits ;
- visibilité ;
- durée ;
- variantes ;
- poster ;
- relations avec Cards, Worlds, Places et Moments.

### 3.9 Relation

Lien typé entre deux entités :

- appartient à ;
- participe à ;
- organise ;
- se déroule à ;
- dépend de ;
- fournit ;
- recherche ;
- finance ;
- suit ;
- collabore avec ;
- mentionne ;
- documente ;
- remplace ;
- contredit.

Une Relation possède sa provenance, sa visibilité et éventuellement sa période de validité.

### 3.10 Membership

Participation d’une Card à un World.

Elle sépare :

- le niveau d’autorisation ;
- le rôle métier ;
- le statut d’invitation ;
- les dates de participation ;
- la visibilité dans l’équipe.

### 3.11 Activity

Journal append-only des actions importantes :

- création ;
- modification ;
- invitation ;
- validation ;
- publication ;
- import ;
- changement de permission ;
- paiement ;
- modération.

Activity alimente les notifications et l’historique, mais ne remplace pas les données métier.

### 3.12 Proposal

Modification candidate issue d’un humain, d’un import ou d’AIME.

Une Proposal contient un ensemble atomique d’opérations :

- créer ;
- mettre à jour ;
- relier ;
- fusionner ;
- détacher ;
- ignorer.

### 3.13 CommandJournal

Journal durable des commandes métier acceptées par l’API.

Une entrée contient :

- un identifiant global ordonnable ;
- le type et la version du schéma de commande ;
- l’identité et la Card agissante ;
- le contexte d’autorisation utilisé ;
- la ressource et sa version attendue ;
- la clé d’idempotence ;
- le payload normalisé ;
- la date d’acceptation ;
- le résultat ou l’erreur ;
- les événements métier produits ;
- la source canonique visée ;
- l’identifiant de corrélation de la transaction.

Le journal ne stocke pas de secret, d’URL signée ni de fichier brut.

La commande, les modifications canoniques et l’écriture dans l’outbox sont engagées dans une même transaction. Un worker publie ensuite les événements de l’outbox et marque leur livraison ; une nouvelle livraison ne recrée pas l’effet métier.

Activity reste un historique lisible par le produit. CommandJournal est une infrastructure d’intégrité, d’audit et de reprise.

## 4. Rôles

### 4.1 Relation sociale

- propriétaire ;
- administrateur de Carte ;
- abonné ;
- relation ;
- invité ;
- visiteur ;
- bloqué.

### 4.2 Niveau d’accès dans un World

- owner : contrôle complet et gouvernance ;
- admin : membres, modules et organisation ;
- editor : modification des données autorisées ;
- contributor : dépôts et propositions ;
- commenter : commentaires et réactions ;
- viewer : lecture uniquement.

### 4.3 Rôle métier

Libellé libre ou issu d’un modèle :

- photographe ;
- témoin ;
- bénévole ;
- trésorier ;
- musicien ;
- prestataire ;
- chef de projet.

Un rôle métier ne donne jamais implicitement une permission technique.

## 5. Registre des capacités

Les interfaces ne codent pas directement des listes d’actions différentes.

Elles demandent un registre de capacités :

`capabilities(viewer, subject, context)`

Exemples de capacités :

- card.view ;
- card.follow ;
- card.contact ;
- card.edit ;
- world.join.request ;
- world.invite ;
- world.manage_members ;
- world.edit ;
- world.publish ;
- moment.create ;
- moment.edit ;
- document.upload ;
- document.analyze ;
- proposal.validate ;
- resource.offer ;
- resource.request ;
- payment.manage ;
- media.broadcast.

La réponse fournit :

- autorisé ;
- interdit ;
- raison ;
- authentification requise ;
- confirmation requise ;
- action principale suggérée.

L’API applique ensuite la même règle lors de l’exécution.

## 6. Carte contextuelle universelle

### 6.1 Types de pins initiaux

- Card ;
- World ;
- Place ;
- Moment ;
- Resource.

Documents et médias ne deviennent des pins que s’ils possèdent une relation géographique explicite.

### 6.2 État d’interaction unique

1. idle ;
2. preview ;
3. pinned ;
4. detail ;
5. action.

Le survol, le focus clavier, le toucher, la liste et la recherche partagent le même objet sélectionné.

### 6.3 Carte contextuelle

Contenu commun :

- type ;
- titre ;
- média ;
- lieu ou zone ;
- statut ;
- relation avec moi ;
- personnes ou Monde associés ;
- action principale ;
- actions secondaires autorisées.

### 6.4 Desktop

- survol ou focus : preview ;
- clic : carte épinglée ;
- second clic ou action “ouvrir” : panneau détaillé.

### 6.5 Mobile

- toucher : feuille basse ;
- glissement : agrandissement du détail ;
- une seule feuille contextuelle à la fois.

### 6.6 Accessibilité

La Carte possède toujours une vue Liste équivalente.

La Liste :

- contient les objets sans coordonnées ;
- utilise les mêmes filtres ;
- partage la sélection ;
- expose les actions au clavier ;
- annonce les résultats et changements de sélection.

## 7. Page universelle d’un World

### 7.1 Noyau

Chaque page Monde possède :

- identité du Monde ;
- intention ;
- statut ;
- visibilité ;
- membres ;
- lieux ;
- Moments ;
- ressources ;
- documents ;
- activité ;
- modules.

### 7.2 Modules activables

Modules de base :

- Timeline ;
- calendrier ;
- personnes ;
- lieux ;
- documents ;
- médias ;
- tâches ;
- budget ;
- messages ;
- carte locale.

Modules spécialisés :

- invités et RSVP ;
- tables ;
- cérémonie ;
- bénévoles ;
- dons ;
- stock ;
- billetterie ;
- tournée ;
- chantier ;
- diffusion Radio/TV.

### 7.3 Templates

Un template :

- propose des modules ;
- propose des rôles métier ;
- propose des questions ;
- propose des Moments et dépendances ;
- propose des règles de visibilité.

Il ne crée pas un nouveau modèle de données.

La page Mariage est le premier template avancé.

## 8. LAB

Le LAB est :

- une antichambre avant création d’un World ;
- une vue collaborative d’un World existant ;
- une surface de validation d’import ;
- une projection géométrique du graphe.

Les objets LAB stockent :

- géométrie ;
- type visuel ;
- texte libre temporaire ;
- références vers les entités ;
- références vers les Proposals.

Ils ne stockent pas de copies de personnes, documents, événements ou ressources validés.

## 9. Bureau Documents et import intelligent

### 9.1 Pipeline

1. upload ;
2. empreinte et détection du type ;
3. extraction native ou OCR ;
4. segmentation ;
5. détection d’entités ;
6. normalisation ;
7. rapprochement avec l’existant ;
8. création d’une Proposal ;
9. validation humaine ;
10. écriture transactionnelle ;
11. recalcul des projections.

### 9.2 Provenance obligatoire

Toute valeur extraite conserve :

- document ;
- page ;
- zone ;
- texte source ;
- moteur et version ;
- date ;
- confiance ;
- correction humaine éventuelle.

### 9.3 Idempotence

Réimporter le même fichier ne duplique pas silencieusement :

- personnes ;
- événements ;
- prestataires ;
- montants ;
- documents.

Le système propose une fusion ou une mise à jour.

## 10. Radio / TV

Radio/TV est une projection de Media et Moment.

Elle peut présenter :

- artistes suivis ;
- projets publics ;
- événements en direct ;
- playlists de Worlds ;
- médias de communautés ;
- programmes éditoriaux AIME.

Avant une diffusion publique, AIME vérifie :

- le propriétaire ;
- les droits de diffusion ;
- la visibilité ;
- la modération ;
- la provenance ;
- la durée de conservation.

Radio/TV ne possède ni comptes, ni abonnements, ni commentaires parallèles au réseau principal.

## 11. Architecture technique cible

### 11.1 Cible Replit

- Clerk : identité ;
- API Server : authentification, autorisation et commandes ;
- PostgreSQL relationnel : graphe et données métier ;
- Object Storage : fichiers et médias ;
- React : projections ;
- traitements asynchrones : import, OCR, analyse et variantes média.

### 11.2 Frontière API

Le navigateur ne modifie pas directement les tables sensibles.

L’API expose :

- queries de lecture ;
- commands d’écriture ;
- vérification des capacités ;
- URLs signées ;
- journalisation ;
- idempotence ;
- contrôle de version.

### 11.3 Événements métier

Après une commande validée, le serveur produit un événement métier :

- world.member_added ;
- document.analysis_completed ;
- proposal.applied ;
- moment.updated ;
- media.published.

Ces événements alimentent :

- notifications ;
- index de recherche ;
- temps réel ;
- projections ;
- analytics.

Ils ne constituent pas une seconde source de vérité.

### 11.4 Journal de commandes et outbox

Toute commande modifiant une famille en cours de convergence passe par CommandJournal.

Garanties :

- une clé d’idempotence rejouée rend le premier résultat ;
- l’ordre est conservé à l’intérieur d’un même agrégat ;
- une commande périmée échoue sur la version attendue ;
- les événements sont écrits dans l’outbox dans la transaction métier ;
- la livraison de l’outbox est au moins une fois, avec consommateurs idempotents ;
- le payload est versionné et migrable ;
- la rétention couvre la fenêtre de rollback et les obligations d’audit ;
- les données personnelles suivent les règles de minimisation et d’effacement.

Lors d’un replay :

- l’autorisation historique est conservée pour l’audit ;
- l’écriture n’est rejouée que dans une procédure de migration autorisée ;
- les permissions et contraintes actuelles sont revalidées avant toute action externe ;
- emails, paiements, notifications et publications externes ne sont jamais réémis sans marqueur de replay explicitement autorisé ;
- les commandes non transposables sont placées en quarantaine, jamais ignorées.

## 12. Convergence ZIP → Replit

### 12.1 Matrice canonique obligatoire

Avant toute implémentation d’adaptateur, une matrice versionnée doit exister pour chaque famille d’entités :

| Famille | Source initiale | Identifiant conservé | Écriture pendant transition | Cible |
| --- | --- | --- | --- | --- |
| Identity | Clerk pour Replit, Supabase Auth pour le ZIP | table de correspondance immutable | système d’origine uniquement | Clerk |
| Card / graphe social | tables relationnelles du ZIP | UUID historique de Card | ZIP tant que la migration n’est pas certifiée | PostgreSQL relationnel derrière API |
| World générique | événements et modèle relationnel du ZIP | UUID historique de l’événement | ZIP jusqu’au cutover du domaine | PostgreSQL relationnel derrière API |
| Projet mariage Replit | JSONB `WorldProject` | ID projet Replit | API Replit uniquement | projection d’un World relationnel |
| Timeline mariage | JSONB Replit pendant transition | IDs d’événements Timeline existants | API Replit uniquement | Moments + Relations canoniques |
| LAB | tables LAB du ZIP | UUID board/object historiques | ZIP après correction RLS | PostgreSQL relationnel derrière API |
| Documents historiques | tables et storage du ZIP | ID document/média historique | ZIP | Document canonique + Object Storage |
| Fichiers Replit | Object Storage + métadonnées API | clé d’objet Replit | API Replit | Object Storage |
| Social, modération, notifications | tables relationnelles du ZIP | IDs historiques | ZIP | PostgreSQL relationnel derrière API |
| Radio/TV/MusicBox | tables et médias du ZIP | IDs média historiques | ZIP | Media canonique + projections |

Chaque ligne de cette matrice doit aussi définir :

- le mapping d’identifiants ;
- la priorité de lecture ;
- le propriétaire de l’écriture ;
- le script ou adaptateur de migration ;
- les contrôles de parité ;
- les critères de bascule ;
- le délai de rollback ;
- les conditions de retrait de l’ancienne source.

Une famille n’est jamais marquée “migrée” tant que :

1. les comptes correspondent ;
2. les volumes correspondent ;
3. les relations correspondent ;
4. les permissions produisent le même résultat ou un résultat plus restrictif ;
5. les fichiers restent accessibles aux mêmes audiences ;
6. les écritures idempotentes sont vérifiées ;
7. un retour à la source précédente a été testé.

### 12.2 Règle d’identité

Le mapping Identity historique → Clerk :

- est unique ;
- n’utilise jamais l’adresse email comme clé permanente ;
- conserve l’identité historique sans la réécrire ;
- exige une preuve de contrôle du compte ;
- journalise les fusions ;
- interdit la fusion automatique de deux comptes ambigus.

Une Card peut être administrée par plusieurs Identity via une délégation explicite. Posséder une Card ne donne aucun droit implicite sur les autres Cards ou Worlds auxquels elle participe.

### 12.3 Traduction temporaire des rôles

Pendant la transition, les rôles Replit sont traduits de manière restrictive :

| Rôle actuel | Niveau cible par défaut |
| --- | --- |
| owner | owner |
| planner | editor |
| family | contributor |
| viewer | viewer |

Cette traduction ne suffit pas pour les opérations sensibles.

Capacités réservées par défaut :

- gérer les membres et rôles : owner/admin ;
- supprimer ou transférer un World : owner ;
- exporter les données personnelles : owner/admin avec journalisation ;
- voir les coordonnées privées des invités : owner/admin et membres explicitement autorisés ;
- voir les informations alimentaires ou d’accessibilité : audience explicitement autorisée ;
- gérer paiements et documents financiers : owner/admin ou permission financière dédiée ;
- lire un document privé : permission Document explicite ou héritage World vérifié ;
- publier un média : propriétaire du média ou délégation de publication ;
- valider une Proposal : editor ou capacité spécialisée ;
- modifier les paramètres de localisation : propriétaire de la Card ou du World.

Les rôles métier n’ajoutent aucune de ces capacités.

### 12.4 Visibilité au niveau du champ

Une entité peut être visible sans que tous ses champs le soient.

Les réponses API appliquent une projection par audience :

- publique ;
- réseau autorisé ;
- membre du World ;
- équipe opérationnelle ;
- administration ;
- propriétaire.

Exemples :

- une Card publique peut montrer sa ville sans adresse ;
- un invité peut apparaître dans un plan de table sans exposer son email ;
- un prestataire peut voir son horaire sans voir le budget global ;
- un membre peut voir qu’un document existe sans recevoir son URL ;
- un paiement peut apparaître comme “réglé” sans exposer son montant à toute l’équipe.

Le masquage est effectué côté serveur avant sérialisation.

### 12.5 Contrat Document et Object Storage

Les enregistrements canoniques minimaux sont :

- `documents` : identité, propriétaire, type, statut et classification ;
- `document_versions` : fichier, empreinte, taille, type MIME et version ;
- `document_links` : relation avec World, Card, Moment, Resource ou Place ;
- `document_grants` : bénéficiaire, capacité, origine et expiration ;
- `extraction_runs` : moteur, version, statut, erreurs et dates ;
- `extracted_facts` : source précise, valeur brute, valeur normalisée et confiance ;
- `proposals` : opérations proposées et validation ;
- `object_audit` : téléchargements sensibles, partages, révocations et suppressions.

Règles :

- un upload est placé en quarantaine jusqu’à validation du type et de la taille ;
- le type MIME déclaré n’est jamais considéré comme preuve ;
- l’empreinte du fichier est calculée côté serveur ;
- les traitements sont rejouables et idempotents ;
- une URL signée est courte, liée à une opération et délivrée après autorisation ;
- révoquer un grant empêche la délivrance de nouvelles URLs ;
- l’accès hérité d’un World est recalculé à chaque demande ;
- supprimer un lien ne supprime pas le fichier s’il reste référencé ;
- la suppression définitive suit une politique de rétention explicite.

Identité canonique d’un fichier dans un même périmètre :

`storage_scope + file_hash`

Réimporter les mêmes octets :

- retrouve le même `document_version` ;
- peut créer un nouveau lien vers un autre World ;
- ne crée pas un nouveau Document silencieusement ;
- ne réapplique pas une extraction déjà validée.

Identité d’un traitement :

`document_version_id + engine + engine_version + extraction_profile`

Changer de moteur ou de version crée un nouvel `extraction_run` et éventuellement une nouvelle Proposal comparative. Cela ne crée ni nouveau fichier canonique, ni nouveau Document, ni réapplication automatique des faits.

L’application d’une Proposal exige également la version courante des entités concernées et sa propre clé d’idempotence. Un conflit ne fusionne jamais silencieusement.

### 12.6 Contrat de localisation

La précision est stockée séparément de l’audience.

Niveaux :

- aucune localisation ;
- pays ;
- région ;
- ville ;
- zone approximative ;
- coordonnées exactes.

Le serveur ne retourne que la précision autorisée. Le navigateur ne reçoit jamais des coordonnées exactes pour ensuite les masquer visuellement.

Une localisation personnelle exacte exige :

- consentement explicite ;
- finalité indiquée ;
- audience définie ;
- possibilité de révocation ;
- durée de conservation.

Pour les découvertes publiques, une position approximative ou le centroïde d’une ville est privilégié.

### 12.7 Critères de projection Carte/Liste

La Carte et la Liste consomment le même résultat autorisé.

Critères d’acceptation :

- tout résultat est atteignable au clavier dans la Liste ;
- le focus, le pin et la ligne partagent le même `activeSubject` ;
- le nombre de résultats est annoncé ;
- les changements de filtres et de sélection sont annoncés ;
- les actions de la Carte contextuelle sont exécutables au clavier ;
- la fermeture rend le focus à l’élément d’origine ;
- les objets sans coordonnées apparaissent dans “Hors carte” ;
- une erreur de fond cartographique n’empêche pas la consultation de la Liste ;
- aucune localisation plus précise que l’autorisation n’est présente dans la réponse réseau ;
- les actions visibles correspondent exactement aux capacités retournées par l’API.

### Étape 0 — Contrats et sécurité

- figer le présent document ;
- compléter et valider la matrice canonique réelle ;
- définir la matrice capacité × commande × ressource × champ ;
- nettoyer les migrations LAB dupliquées ;
- auditer les politiques RLS ;
- retirer les fichiers d’environnement des archives ;
- produire une matrice des entités et identifiants ;
- classifier les données par niveau de confidentialité.

### Étape 1 — Identité

- choisir Clerk comme autorité cible ;
- créer un mapping temporaire entre identité historique et identité Clerk ;
- préserver les propriétaires, membres, invitations et auteurs ;
- tester la matrice complète des permissions.

### Étape 2 — Lecture par adaptateurs

- exposer les Cards, Worlds, Places, Moments et Relations historiques via l’API ;
- les projeter dans l’interface Replit ;
- comparer les lectures ;
- ne pas activer de double écriture.

### Étape 3 — Carte universelle

- importer CardsMap et ses comportements ;
- créer le type de pin universel ;
- unifier preview, pin, détail et action ;
- ajouter la vue Liste ;
- calculer les capacités côté serveur.

### Étape 4 — World universel

- définir le noyau relationnel World ;
- adapter le mariage comme template ;
- transformer la Timeline actuelle en projection de Moments ;
- préserver son moteur de relations, impacts et conflits.

### Étape 5 — Documents

- unifier Document et Media ;
- migrer les références, pas les URLs en dur ;
- construire le pipeline devis/programme ;
- valider provenance, ACL et idempotence.

### Étape 6 — LAB

- conserver géométrie et références ;
- corriger les permissions ;
- connecter les Proposals au même pipeline de validation ;
- permettre la création contrôlée d’un World.

### Étape 7 — Social

- relier publications, Cards, Worlds, Places et Moments ;
- permettre “ouvrir sur la carte” et “ouvrir dans le Monde” ;
- conserver blocage, signalement et modération.

### Étape 8 — Radio / TV

- migrer le catalogue média ;
- formaliser les droits ;
- projeter les médias du graphe ;
- ouvrir progressivement la diffusion.

### 12.8 Procédure de cutover

Pour chaque famille d’entités :

1. sauvegarde et inventaire ;
2. mapping stable des IDs ;
3. migration dans un environnement isolé ;
4. double lecture comparative ;
5. correction des écarts ;
6. gel court des écritures de l’ancienne source ;
7. migration incrémentale finale ;
8. activation de l’unique writer cible ;
9. surveillance des erreurs et permissions ;
10. maintien de l’ancienne source en lecture seule pendant la fenêtre de rollback ;
11. retrait seulement après validation.

Le rollback réactive l’ancien writer à partir d’un point connu et rejoue les commandes journalisées. Il ne tente pas une fusion improvisée entre deux états divergents.

Le rollback n’est autorisé que si :

- toutes les écritures depuis le cutover sont présentes dans CommandJournal ;
- les adaptateurs de replay pour la source précédente ont réussi sur une copie isolée ;
- les commandes à effet externe sont neutralisées ;
- les écarts non transposables sont nuls ou explicitement acceptés ;
- un point de restauration vérifié existe.

## 13. Critères anti-régression

Une convergence est refusée si elle :

- crée une seconde identité utilisateur ;
- copie une entité métier dans le LAB ;
- écrit dans deux bases canoniques ;
- remplace les permissions serveur par des conditions d’interface ;
- perd la provenance d’un import ;
- expose une localisation précise sans consentement ;
- transforme une suggestion AIME en modification automatique ;
- recrée une Timeline indépendante ;
- crée un réseau social séparé pour Radio/TV ;
- supprime une fonction existante sans équivalence vérifiée.

## 14. Premier incrément produit

Le premier incrément doit démontrer :

1. une Carte plein écran ;
2. des pins Card, World, Place et Moment ;
3. une Liste accessible équivalente ;
4. une Carte contextuelle unique ;
5. des actions calculées selon le rôle ;
6. la création d’un World depuis une intention ;
7. l’ajout d’une Card depuis la Carte ;
8. un template Mariage utilisant la page actuelle ;
9. l’import d’un programme ou devis ;
10. une Proposal validable ;
11. la mise à jour cohérente de la page Monde et de sa Timeline.

Tout le reste peut attendre tant que cette boucle n’est pas fiable.
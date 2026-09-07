# Audit stratégique AIME · Monde Mariage

**Date de l’audit : 8 septembre 2026**  
**Périmètre :** produit web AIME, API, Monde Mariage, positionnement concurrentiel international et préparation au lancement grand public.  
**Nature du document :** photographie datée. Les offres, tarifs et produits concurrents peuvent évoluer.

---

## 1. Verdict exécutif

### Où se situe AIME aujourd’hui ?

AIME est actuellement un **prototype produit avancé avec plusieurs fondations de production réelles**, mais ce n’est pas encore un service de mariage suffisamment complet, fiable et explicite pour être ouvert sans accompagnement au grand public.

La différence est essentielle :

- AIME n’est plus une simple maquette : authentification, projets persistés, rôles, invitations, RSVP publics, emails réels, stockage privé, export et protection contre certains conflits existent côté serveur.
- Le Monde Mariage offre déjà une expérience cohérente : création à partir d’une intention, Timeline, invités, professionnels, budget, tables, cérémonie, logistique, Jour J, publication et souvenirs.
- Plusieurs écrans donnent cependant une impression de maturité supérieure à la réalité : certains modules restent des éditeurs de métadonnées locales, des démonstrations ou des projections sans parcours opérationnel complet.
- Les leaders du marché sont nettement devant sur les fonctions attendues : sites de mariage personnalisables, annuaires de prestataires, registres de cadeaux, communications invités, applications mobiles éprouvées, contenus, support et effets de réseau.
- AIME est potentiellement devant sur la **vision unifiée de la vie**, la continuité Profil–Monde–Moment, la Timeline comme graphe d’effets, le contrôle humain de la propagation et la représentation relationnelle par profondeur.

### Score global

| Axe | Score | Lecture |
|---|---:|---|
| Originalité conceptuelle | **82/100** | Vision forte, cohérente et inhabituelle |
| Couverture fonctionnelle du mariage | **54/100** | Bon socle, plusieurs parcours restent incomplets |
| Qualité de l’expérience actuelle | **61/100** | Identité visuelle et navigation différenciantes, densité encore exigeante |
| Maturité technique | **52/100** | Fondations sérieuses, validation et exploitation encore insuffisantes |
| Préparation au grand public | **39/100** | Pilote accompagné possible, lancement autonome prématuré |
| **Maturité pondérée du Monde Mariage** | **48/100** | **Alpha avancée / pré-bêta fermée** |

Le score de 48 % ne signifie pas que « la moitié du code » est écrite. Il mesure la distance vers une promesse précise : **un couple inconnu découvre AIME, crée son mariage, invite ses proches, collabore, prépare le Jour J, traverse un incident et conserve ses données sans assistance humaine de l’équipe AIME**.

### Recommandation immédiate

Ne pas lancer AIME comme « la plateforme qui remplace tous les outils de mariage ». Lancer d’abord un **pilote fermé de 10 à 20 couples**, avec une promesse plus étroite :

> « Le déroulé vivant de votre mariage, partagé avec les bonnes personnes, avant, pendant et après. »

Cette promesse exploite le point fort d’AIME — la continuité temporelle et relationnelle — sans prétendre battre immédiatement The Knot, Zola ou Mariages.net sur leurs marketplaces, catalogues et registres.

---

## 2. Méthode et niveaux de preuve

### Analyse interne

L’audit a examiné :

- les routes publiques et privées ;
- le modèle de projet et sa persistance ;
- l’authentification et les permissions ;
- les invitations et RSVP ;
- les emails et fichiers ;
- les modules du mariage ;
- la Timeline, le Jour J, le Profil et le Réseau ;
- les tests disponibles ;
- les tâches déjà proposées ou en cours.

### Recherche externe

La comparaison repose principalement sur :

- les pages officielles des produits ;
- les fiches App Store et Google Play ;
- les pages d’aide et de fonctionnalités ;
- des avis publics, utilisés uniquement comme signaux qualitatifs ;
- des recherches en français et en anglais.

### Classification des capacités AIME

| Niveau | Définition |
|---|---|
| **Prêt** | Parcours cohérent, persisté, protégé et exploitable sans manipulation |
| **Fonctionnel incomplet** | Le cœur fonctionne mais il manque des états, contrôles ou étapes |
| **Démonstratif** | L’interface démontre la vision sans fournir le résultat complet |
| **Simulé** | L’action est explicitement fictive ou seulement enregistrée localement |
| **Absent** | Aucun parcours utilisable trouvé |

### Prudence sur l’innovation

Il est impossible de prouver qu’une idée n’existe nulle part dans le monde. L’audit emploie donc :

- **Commune** : largement disponible ;
- **Différenciante** : combinaison ou expérience sensiblement meilleure ;
- **Rare** : peu de précédents identifiés ;
- **Potentiellement inédite** : aucun équivalent intégré identifié pendant cette recherche, sans prétention d’exhaustivité absolue.

---

## 3. Vérité produit : ce qui existe réellement

### Fondations prêtes ou proches de la production

1. **Authentification Clerk**
   - inscription et connexion ;
   - séparation des caches lors d’un changement d’utilisateur ;
   - routes privées protégées.

2. **Projets persistés**
   - création et chargement depuis l’API ;
   - plusieurs projets par utilisateur ;
   - cache local de secours ;
   - export JSON ;
   - suppression confirmée.

3. **Collaboration structurée**
   - rôles propriétaire, organisateur, famille et lecteur ;
   - invitations par email ;
   - vérification que l’adresse Clerk correspond à l’invitation ;
   - permissions d’édition appliquées côté serveur.

4. **RSVP public sécurisé par lien**
   - présence ou refus ;
   - participation aux différents temps ;
   - accompagnant, régime alimentaire et note ;
   - révocation du lien.

5. **Emails réels**
   - envoi via Resend ;
   - confirmation explicite avant envoi ;
   - journal serveur avec succès ou échec ;
   - limitation du nombre de destinataires.

6. **Fichiers privés côté serveur**
   - demande d’URL d’envoi ;
   - liste de types autorisés ;
   - taille maximale ;
   - métadonnées persistées ;
   - contrôle d’accès par appartenance au projet.

7. **Confidentialité de base**
   - publication contrôlée par le propriétaire ;
   - projection publique filtrée ;
   - export ;
   - durée de conservation configurable côté API.

### Capacités fonctionnelles mais incomplètes

| Domaine | État réel |
|---|---|
| Création du mariage | L’intention en langage naturel produit un projet initial, mais sans onboarding guidé ni contrôle complet des erreurs |
| Timeline | Événements, phases, relations, dépendances, filtres, audit et vues multiples existent |
| Invités | Fiches, RSVP, repas, tables et contacts existent, mais les foyers, groupes et communications segmentées restent limités |
| Prestataires | Suivi de catégorie, statut, contact et montant ; aucun annuaire ni cycle devis–contrat–paiement complet |
| Budget | Totaux, catégories, paiements et échéancier ; pas de pièces justificatives reliées, approbations ou rapprochement |
| Tables | Tables, capacités et affectations simples ; pas de plan spatial ni contraintes relationnelles |
| Cérémonie | Notes, déroulé, repas, boissons, gâteau, danse, lectures et vœux |
| Logistique | Parking, accessibilité, météo, listes, urgences, hébergements et navettes |
| Jour J | Déroulé chronologique et prévisualisation des impacts ; pas encore un centre opérationnel temps réel |
| Publication | Profil/Monde public et événements visibles ; pas un constructeur complet de site de mariage |
| Réseau | Grille des personnes et professionnels centrée sur le Profil ; relations encore principalement radiales |

### Capacités démonstratives ou simulées

- L’éditeur de documents du Monde indique encore « métadonnées locales, sans envoi de fichier », alors qu’une infrastructure de stockage existe séparément côté serveur.
- Le module de modèles de messages utilise « Simuler l’envoi » ; un autre parcours permet un email réel, mais les deux expériences ne sont pas unifiées.
- La musique accepte des titres manuels sans recherche ni écoute réelle.
- La propagation Ripple prévisualise les dépendances, mais l’application proposée modifie encore l’événement seul.
- Le Jour J ressemble à un mode direct, mais ne gère pas encore présence, alertes, accusés de réception ou parcours propres à chaque intervenant.
- Les souvenirs sont surtout des éléments de préparation, pas encore une mémoire multimédia collective.
- Le Monde AIME mondial repose sur un fournisseur de démonstration remplaçable, pas sur un flux mondial réel.

### Capacités absentes ou non reliées

- vrai constructeur de site de mariage personnalisable ;
- domaine personnalisé ;
- marketplace ou découverte de prestataires ;
- comparaison de devis, contrat et signature ;
- registre de cadeaux ou cagnotte réellement intégrée ;
- paiements ;
- communications automatiques segmentées ;
- portail autonome pour chaque invité et prestataire ;
- application mobile native ou expérience installable éprouvée ;
- import guidé depuis tableur ou carnet d’adresses ;
- centre d’aide, support et récupération utilisateur ;
- galerie après-mariage avec contributions des invités ;
- gestion du consentement photo ;
- suppression de compte et parcours RGPD complet ;
- console d’administration et traitement des abus ;
- supervision opérationnelle, alertes et objectifs de disponibilité ;
- tarification et modèle économique publics.

---

## 4. Paysage concurrentiel mondial

### Concurrents directs

#### The Knot

**Position :** suite gratuite de planification et marketplace à très grande échelle.  
**Forces vérifiées :**

- checklist personnalisée ;
- annuaire de prestataires avec avis ;
- liste d’invités et RSVP ;
- site de mariage ;
- budget ;
- registre de cadeaux ;
- application mobile gratuite.

The Knot déclare avoir aidé plus de 30 millions de couples et disposer de près de 175 000 prestataires et de millions d’avis. Son avantage est l’effet de réseau, pas une architecture de données particulièrement originale.

**Faiblesses signalées publiquement :** bugs ou lenteurs ponctuels, notifications commerciales jugées répétitives, friction autour de certains RSVP ou registres. Ces signaux ne doivent pas être généralisés à tous les utilisateurs.

#### Zola

**Position :** expérience intégrée centrée sur le site, le registre, les invitations et la planification.  
**Forces vérifiées :**

- site de mariage gratuit ;
- liste d’invités et RSVP ;
- messages SMS aux invités ;
- budget ;
- checklist ;
- papeterie et registre ;
- application gratuite.

Zola transforme plusieurs étapes en transactions — cadeaux, papeterie, recommandations — ce qui rend le service économiquement cohérent mais plus commercial.

#### Joy

**Position :** site, invitations, RSVP, voyage et registre avec une expérience moderne.  
**Forces observées :**

- forte qualité du site invité ;
- personnalisation ;
- collecte d’informations et RSVP ;
- voyage et registre ;
- communication avec les invités.

Joy est l’un des précédents les plus proches de la volonté d’AIME de conserver une continuité entre contenu, personnes et expérience, mais reste organisé autour de l’événement.

#### Bridebook

**Position :** planificateur de mariage mobile très présent au Royaume-Uni et en Europe.  
**Forces vérifiées :**

- checklist ;
- budget ;
- invités ;
- lieux et prestataires ;
- notes et organisation mobile ;
- forte adoption déclarée.

Bridebook est un concurrent direct particulièrement important pour une entrée européenne. Il rend les fonctions classiques faciles et rassurantes, sans porter une vision universelle du Profil et des Mondes.

#### Mariages.net / WeddingWire

**Position :** marketplace, contenus et outils de planification très implantés localement.  
**Forces :**

- annuaire massif de prestataires ;
- avis et contenu éditorial ;
- inspiration ;
- outils d’organisation ;
- acquisition organique très puissante ;
- connaissance du marché français.

Pour un utilisateur français qui cherche d’abord un lieu, un photographe ou un traiteur, Mariages.net est aujourd’hui plus immédiatement utile qu’AIME.

### Alternatives indirectes réelles

Les concurrents les plus dangereux ne sont pas seulement les plateformes de mariage :

- **Google Sheets / Excel** pour le budget, les invités et les tables ;
- **Notion** pour le wiki du mariage, les décisions et les documents ;
- **Trello / Asana** pour les tâches ;
- **WhatsApp** pour les groupes et les urgences ;
- **Google Calendar** pour les horaires ;
- **Google Drive / Dropbox** pour les documents et photos ;
- **Canva / Squarespace / Wix** pour le site ;
- **Partiful** pour les invitations, RSVP et communication événementielle ;
- **Pinterest / Instagram** pour l’inspiration ;
- un **wedding planner humain** pour le contexte, l’arbitrage et le Jour J.

Le vrai adversaire d’AIME est donc un assemblage gratuit ou déjà connu de six à dix outils.

---

## 5. Matrice concurrentielle

Notation : **3 = fort**, **2 = disponible mais limité**, **1 = faible**, **0 = absent**.  
La note AIME juge l’état actuel, pas la vision.

| Capacité | Poids | AIME | The Knot | Zola | Joy | Bridebook | Mariages.net | Outils assemblés |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Onboarding et confiance | 7 | 1 | 3 | 3 | 3 | 3 | 3 | 2 |
| Checklist et tâches | 7 | 2 | 3 | 3 | 2 | 3 | 2 | 3 |
| Invités et RSVP | 10 | 2 | 3 | 3 | 3 | 3 | 2 | 2 |
| Site invité | 8 | 1 | 3 | 3 | 3 | 2 | 2 | 2 |
| Budget | 8 | 2 | 3 | 3 | 1 | 3 | 2 | 3 |
| Prestataires | 9 | 1 | 3 | 2 | 1 | 3 | 3 | 2 |
| Collaboration du couple | 6 | 2 | 2 | 2 | 2 | 2 | 2 | 3 |
| Documents et contrats | 5 | 1 | 1 | 1 | 1 | 1 | 1 | 3 |
| Communications invités | 7 | 1 | 2 | 3 | 3 | 2 | 2 | 3 |
| Jour J opérationnel | 8 | 2 | 1 | 1 | 1 | 1 | 1 | 2 |
| Après-mariage | 5 | 1 | 2 | 2 | 2 | 1 | 2 | 3 |
| Mobile | 6 | 2 | 3 | 3 | 3 | 3 | 3 | 3 |
| Confidentialité et contrôle | 6 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| Contexte et intelligence | 4 | 2 | 1 | 1 | 1 | 1 | 1 | 2 |
| Continuité de vie | 4 | 3 | 0 | 0 | 0 | 0 | 0 | 1 |

### Lecture de la matrice

- AIME ne doit pas chercher à égaler immédiatement les marketplaces. Leur avantage dépend de volumes, d’avis et de relations commerciales accumulés pendant des années.
- AIME peut gagner sur le **travail de coordination** que les marketplaces traitent mal : qui doit savoir quoi, à quel moment, avec quel droit, et que faut-il réviser lorsque le programme change ?
- Les outils assemblés restent extrêmement puissants. AIME doit apporter une continuité et une réduction de charge mentale suffisamment fortes pour justifier un nouvel espace.

---

## 6. Audit des innovations AIME

### 6.1 Profil durable relié à plusieurs Mondes

**Classement : Rare**  
**Précédents proches :** réseaux sociaux, CRM personnels, espaces Notion, applications familiales.  
**Différence AIME :** une personne n’est pas recréée dans chaque projet ; son Profil peut traverser mariage, voyage, famille, association ou entreprise avec visibilité contrôlée.

**État actuel :** concept et interface avancés, modèle serveur encore centré sur le projet de mariage.  
**Défendabilité :** forte si l’identité, les relations et les droits deviennent réellement transversaux.

### 6.2 Monde comme unité vivante avant–pendant–après

**Classement : Différenciante**  
De nombreux outils couvrent l’événement avant et pendant ; quelques-uns conservent photos ou site après. Peu en font une unité de vie réutilisable avec son graphe, ses personnes et sa mémoire.

**État actuel :** les phases existent visuellement et dans les données. L’après reste faible.

### 6.3 Kit spécialisé sans enfermer les données

**Classement : Rare**  
**Précédents proches :** templates Notion, vertical SaaS, modules ERP.  
**Différence AIME :** le Kit devrait changer le langage et les outils, tandis que Profil, Moment, relation, document et droit restent universels.

**État actuel :** surtout conceptuel ; le mariage est encore fortement encodé dans le modèle et les composants.

### 6.4 AI · + · ME

**Classement : Différenciante, pas encore unique**  
Les assistants contextuels, boutons de création et espaces de contrôle existent séparément ailleurs. La grammaire permanente « comprendre / créer / contrôler » est distinctive.

**État actuel :**

- « + » crée plusieurs primitives ;
- « ME » ouvre identité, réglages et sauvegarde ;
- « AI » ouvre une expérience contextuelle, mais l’intelligence réelle et vérifiable reste limitée.

### 6.5 Bloc central universel

**Classement : Différenciante**  
Les modales, panneaux de commande et palettes existent partout. L’innovation réside dans la cohérence : toute personne, décision ou conséquence peut revenir au même centre sans quitter le contexte.

**Risque :** si trop d’actions hétérogènes utilisent le même bloc sans hiérarchie, la cohérence devient confusion.

### 6.6 Timeline comme graphe causal

**Classement : Rare**  
Les concurrents possèdent calendriers, checklists et timelines. AIME ajoute relations, dépendances, ressources, responsables, visibilité et analyse des impacts.

**État actuel :** le graphe et l’analyse existent ; la propagation réelle et les notifications restent à construire.

### 6.7 Ripple UI avec validation humaine et annulation

**Classement : Potentiellement inédite dans le mariage grand public**  
Les workflows professionnels savent propager des changements et les IA savent proposer des actions. Aucun concurrent de mariage grand public identifié ne combine clairement :

1. modification d’un Moment ;
2. visualisation des personnes, documents et horaires affectés ;
3. proposition d’actions ;
4. validation humaine ;
5. propagation ;
6. possibilité d’annuler l’ensemble.

**État actuel :** prévisualisation partielle seulement.  
**Innovation à protéger :** oui, par documentation, marque, langage produit, preuves d’usage et éventuellement analyse de brevetabilité avec un professionnel.

### 6.8 Grille universelle des vivants en X/Y/Z

**Classement : Potentiellement inédite comme interface relationnelle grand public**  
Les graphes de relations, CRM et visualisations de réseaux existent. La combinaison d’une broderie numérique stable, du Profil comme origine et de couches Z relationnelles dans un produit de vie n’a pas trouvé d’équivalent direct.

**État actuel :** grille interactive réelle, mais relations principalement radiales et profondeur fondée sur le type plutôt que sur un graphe universel.

### 6.9 Continuité entre mariage privé, journée personnelle et mémoire

**Classement : Rare**  
Si chaque intervenant reçoit uniquement sa journée, ses lieux, documents, responsabilités et changements, AIME peut devenir un système de coordination beaucoup plus précis qu’un site de mariage.

**État actuel :** direction validée et tâche en cours, pas encore disponible.

### Les cinq innovations les plus importantes

1. **Ripple UI contrôlée et annulable** ;
2. **Timeline causale partagée par toutes les vues** ;
3. **Profil durable comme origine des Mondes** ;
4. **Grille relationnelle X/Y/Z** ;
5. **Kit spécialisé sur des primitives universelles**.

La propriété défendable ne viendra pas du dessin visuel seul. Elle viendra du **modèle de relations, de permissions, de causalité et de propagation**, enrichi par les usages réels.

---

## 7. Maturité détaillée du Monde Mariage

| Domaine | Score | Diagnostic |
|---|---:|---|
| Découverte et acquisition | 30 % | Landing élégante mais preuve, cas d’usage, tarifs, FAQ et réassurance insuffisants |
| Inscription et connexion | 74 % | Parcours réel ; il manque récupération et validation opérationnelle complète |
| Création du mariage | 64 % | Intention naturelle très différenciante ; contrôle et onboarding à renforcer |
| Navigation et compréhension | 56 % | Cohérente pour l’équipe produit, encore dense pour un utilisateur novice |
| Collaboration | 58 % | Rôles et invitations réels ; activité, commentaires et granularité manquent |
| Invités et RSVP | 61 % | Socle réel ; segmentation, foyers et gestion avancée absents |
| Tables | 44 % | Affectation simple ; aucune optimisation ou représentation spatiale |
| Budget | 43 % | Vue utile ; pas un centre financier fiable |
| Prestataires | 36 % | Suivi local uniquement, pas de cycle commercial complet |
| Documents | 38 % | Infrastructure serveur réelle mais expérience produit non reliée |
| Communication | 45 % | Envoi réel disponible, mais templates et automatisation fragmentés |
| Timeline | 72 % | Cœur fonctionnel le plus mature et le plus différenciant |
| Jour J | 43 % | Très bonne direction ; pas encore opérationnel sur le terrain |
| Publication invitée | 39 % | Projection publique minimale, pas un site complet |
| Souvenirs et après | 24 % | Intention visible, usage réel presque absent |
| Confidentialité | 57 % | Permissions utiles ; droits fins et parcours RGPD incomplets |
| Accessibilité | 54 % | Efforts clavier et libellés ; audit WCAG réel encore nécessaire |
| Mobile | 56 % | Responsive, mais aucune preuve terrain sur appareils et réseaux dégradés |
| Fiabilité et tests | 44 % | Tests unitaires présents ; E2E authentifiés et concurrence restent incomplets |
| Exploitation et support | 22 % | Pas de dispositif public de support, administration ou incidents |

### Niveau actuel

**Alpha avancée / pré-bêta fermée.**

AIME peut être utilisé dès maintenant par :

- l’équipe fondatrice ;
- des démonstrateurs ;
- quelques couples accompagnés ;
- des utilisateurs tolérant les changements et les limites.

AIME ne doit pas encore être présenté comme prêt pour :

- une campagne grand public ;
- des centaines de mariages sans support direct ;
- des données critiques de Jour J sans solution de secours ;
- une offre payante avec engagement de service.

---

## 8. Les cinq plus grandes forces

1. **Une vision que les concurrents n’ont pas**  
   AIME ne réduit pas le mariage à une checklist ou une marketplace.

2. **Une excellente unité narrative : la Timeline**  
   Elle peut réunir tâches, personnes, lieux, documents et conséquences.

3. **Un contrôle humain explicite**  
   La promesse « l’IA conseille, l’humain décide » est adaptée à un événement sensible.

4. **De vraies fondations serveur**  
   Authentification, rôles, RSVP, emails, stockage et export réduisent fortement la distance vers un pilote réel.

5. **Une identité visuelle premium et mémorable**  
   AIME peut occuper un territoire émotionnel différent des plateformes catalogues.

---

## 9. Les cinq risques majeurs

1. **Écart entre la promesse visuelle et la réalité opérationnelle**  
   Un écran sophistiqué peut masquer une action locale, simulée ou sans retour.

2. **Surcharge cognitive**  
   Profil, Monde, Moment, Kit, Timeline, Ripple, AI, +, ME, couches et profondeurs forment un langage riche qui doit être appris progressivement.

3. **Manque d’un parcours invité irréprochable**  
   Le couple adoptera AIME seulement si les invités comprennent les liens sans compte, sans erreur et sur mobile.

4. **Données sensibles et responsabilité du Jour J**  
   Coordonnées, allergies, documents, horaires et relations exigent audit de sécurité, consentement et procédures d’incident.

5. **Dispersion stratégique**  
   Construire simultanément réseau universel, Monde mondial, marketplace, musique, IA et suite mariage retarderait la première preuve d’usage.

---

## 10. Ce qu’il faut faire avant le grand public

### P0 — Bloquants absolus

1. **Choisir la promesse du premier lancement**
   - cible précise ;
   - problème principal ;
   - première valeur obtenue en moins de dix minutes.

2. **Unifier les parcours réellement persistés**
   - documents de l’interface reliés au stockage ;
   - messages et templates reliés à l’envoi réel ;
   - états explicites de sauvegarde, erreur et conflit ;
   - aucune action visuellement active si elle est simulée.

3. **Rendre l’invité autonome**
   - lien personnel robuste ;
   - RSVP, programme, lieux, consignes et mises à jour ;
   - vue mobile extrêmement simple ;
   - révocation et expiration des accès.

4. **Sécuriser les données**
   - audit d’autorisation par route et par rôle ;
   - protection contre abus des liens publics ;
   - limitation de débit ;
   - validation et nettoyage des entrées ;
   - suppression de compte et données ;
   - consentement, politique de confidentialité et conditions ;
   - procédure d’incident.

5. **Établir la fiabilité**
   - E2E authentifiés non ignorés ;
   - tests multi-comptes, rôles, conflits et invitations ;
   - sauvegarde/restauration éprouvée ;
   - supervision, logs utiles et alertes ;
   - stratégie de secours pour le Jour J.

6. **Installer le support minimal**
   - centre d’aide ;
   - adresse de support ;
   - remontée d’erreur avec contexte non sensible ;
   - capacité à retrouver et aider un projet sans accéder abusivement aux données.

### P1 — Nécessaire à une bêta publique

- onboarding pas à pas ;
- import CSV des invités ;
- gestion des foyers et accompagnants ;
- segmentation des communications ;
- site invité personnalisable mais volontairement simple ;
- calendrier et fuseaux horaires robustes ;
- documents reliés aux prestataires et paiements ;
- vraie gestion des conflits de sauvegarde ;
- accessibilité WCAG 2.2 AA sur les parcours critiques ;
- tests Safari/iOS, Android et réseaux lents ;
- analytics du tunnel sans données personnelles excessives ;
- sauvegarde automatique et historique récupérable ;
- export lisible par le couple, pas seulement JSON technique.

### P2 — Nécessaire à un produit commercialisable

- tarification, facturation et droits associés ;
- délivrabilité email avec domaine AIME correctement configuré ;
- communication transactionnelle conforme ;
- système de support avec engagement clair ;
- statut du service ;
- administration des comptes, abus et remboursements ;
- galerie et mémoire après-mariage ;
- personnalisation de marque ;
- modèles de mariages et duplication ;
- preuves sociales et témoignages vérifiés.

### P3 — Vision universelle

- personnes et organisations réellement transversales aux Mondes ;
- relations entre personnes, au-delà des rayons vers le Profil ;
- Kits chargés sur un modèle universel stable ;
- Ripple complète avec validation et annulation ;
- graphe de droits ;
- Timeline inter-Mondes ;
- mémoire contextuelle contrôlée ;
- agents spécialisés interchangeables ;
- profondeur Z fondée sur les relations réelles ;
- Monde AIME alimenté par des données externes vérifiées.

---

## 11. Feuille de route recommandée

### Jalon 1 — Pilote fermé

**Objectif :** 10 à 20 couples accompagnés, mariage à plus de trois mois.

Critères :

- création et sauvegarde fiables ;
- couple collaborateur ;
- import ou ajout réaliste de 50 à 150 invités ;
- RSVP public ;
- emails ;
- programme invité ;
- export et restauration ;
- support humain direct ;
- aucun paiement demandé.

**Progression estimée actuelle vers ce jalon : 67 %.**

### Jalon 2 — Bêta publique

**Objectif :** utilisateurs inconnus acceptés progressivement.

Critères :

- onboarding autonome ;
- fonctions simulées supprimées ou clairement isolées ;
- sécurité et RGPD ;
- E2E critiques ;
- mobile réel ;
- support et alertes ;
- métriques d’activation, retour et erreurs ;
- au moins 30 couples ayant terminé les parcours principaux.

**Progression estimée actuelle : 45 %.**

### Jalon 3 — Produit commercialisable

**Objectif :** proposition payante ou modèle économique assumé.

Critères :

- valeur différenciante prouvée ;
- rétention ;
- emails et support industrialisés ;
- facturation ;
- engagements de service réalistes ;
- coût de support maîtrisé ;
- politique de données et d’IA compréhensible.

**Progression estimée actuelle : 30 %.**

### Jalon 4 — Plateforme universelle AIME

**Objectif :** Profil, Mondes et Kits au-delà du mariage.

Critères :

- modèle universel réellement séparé du Kit Mariage ;
- identité et réseau inter-Mondes ;
- Ripple complète ;
- permissions transversales ;
- preuve que les utilisateurs souhaitent conserver AIME après le mariage.

**Progression estimée actuelle : 22 %.**

---

## 12. Priorités produit recommandées

### À construire maintenant

1. parcours personnel de l’invité et du prestataire ;
2. notifications automatiques liées aux changements de Timeline ;
3. résolution fiable des conflits et E2E multi-utilisateurs ;
4. liaison complète des fichiers, messages et RSVP à l’expérience centrale ;
5. onboarding et import d’invités ;
6. sécurité, conformité et exploitation minimale ;
7. pilote fermé instrumenté.

Plusieurs de ces travaux existent déjà dans les tâches du projet : journée personnelle, notifications, tests de concurrence et isolation, sessions Clerk de test, musique réelle et élargissement du réseau. Ils ne doivent pas être recomptés comme de nouvelles idées.

### À différer

- marketplace complète de prestataires ;
- registre de cadeaux propriétaire ;
- banque ou rapprochement financier ;
- application native avant preuve d’usage web mobile ;
- flux mondial réel du Monde AIME ;
- multiplication de nouveaux Kits ;
- automatisation IA autonome sans contrôle humain.

### À ne probablement pas construire soi-même

- paiement par carte généraliste ;
- stockage objet ;
- visioconférence ;
- cartographie de base ;
- streaming musical ;
- signature électronique ;
- délivrabilité email.

Ces briques sont des commodités à intégrer. L’énergie différenciante doit rester sur le graphe, les droits, la Timeline et Ripple.

---

## 13. Indicateurs à suivre pendant le pilote

### Activation

- mariage créé ;
- deuxième membre invité ;
- 20 invités ajoutés ;
- premier RSVP reçu ;
- premier Moment du Jour J publié.

### Valeur

- nombre de retours hebdomadaires du couple ;
- pourcentage d’invités ouvrant leur lien ;
- temps gagné déclaré ;
- changements de Timeline compris et traités ;
- nombre d’informations dupliquées hors d’AIME.

### Fiabilité

- erreurs de sauvegarde ;
- conflits ;
- emails échoués ;
- liens RSVP invalides ;
- temps de réponse du support ;
- restaurations nécessaires.

### Signal stratégique principal

Demander chaque semaine :

> « Si AIME disparaissait demain, vers quels outils retourneriez-vous et quelle partie vous manquerait le plus ? »

Si les réponses citent seulement le design ou « tout au même endroit », l’avantage est faible. Si elles citent la journée personnelle, les conséquences d’un changement, la Timeline commune ou la continuité après le mariage, le noyau différenciant est validé.

---

## 14. Décisions recommandées

1. **Positionner le mariage comme premier Kit, pas comme identité définitive de l’entreprise.**
2. **Vendre d’abord la coordination vivante, pas la quantité de fonctionnalités.**
3. **Traiter Ripple comme le produit central, pas comme une animation.**
4. **Prouver le parcours invité avant d’étendre le réseau universel.**
5. **Assumer une bêta fermée et accompagnée avant toute campagne.**
6. **Documenter dès maintenant le modèle causal et relationnel.**
7. **Utiliser les leaders comme fournisseurs de commodités mentales : importer depuis eux ou coexister plutôt que les reproduire entièrement.**

---

## 15. Sources principales

Consultées le 8 septembre 2026.

1. The Knot, application et fonctions :  
   https://www.theknot.com/wedding-planning-app
2. The Knot, plateforme et marketplace :  
   https://www.theknot.com/
3. Zola, application et outils :  
   https://www.zola.com/wedding-planning/app
4. Zola, plateforme :  
   https://www.zola.com/
5. Joy, plateforme de mariage :  
   https://withjoy.com/
6. Bridebook, planificateur :  
   https://bridebook.com/uk
7. Bridebook, fiche App Store :  
   https://apps.apple.com/gb/app/bridebook-1-wedding-planner/id1200853011
8. Mariages.net :  
   https://www.mariages.net/
9. Partiful, invitations et RSVP événementiels :  
   https://partiful.com/
10. The Knot, avis App Store :  
    https://apps.apple.com/us/app/the-knot-wedding-planner/id457941553?platform=iphone&see-all=reviews
11. The Knot, fiche Google Play :  
    https://play.google.com/store/apps/details?id=com.xogrp.planner
12. Bridebook, avis Trustpilot :  
    https://www.trustpilot.com/review/bridebook.com
13. Connect The Dots, exemple de graphe relationnel professionnel :  
    https://ctd.ai/

### Limites des sources

- Les pages officielles décrivent les produits selon leur propre marketing.
- Les notes d’applications varient selon pays, date et plateforme.
- Les avis publics signalent des problèmes possibles mais ne mesurent pas leur fréquence réelle.
- Les prix et fonctions gratuites peuvent changer.
- L’absence d’un concurrent trouvé ne constitue pas une preuve absolue d’unicité.

---

## Conclusion

AIME possède déjà quelque chose de plus rare qu’une longue liste de fonctions : **une thèse produit cohérente**.

Cette thèse est que les événements importants ne devraient pas être gérés comme des tableaux séparés, mais comme un réseau de personnes, de Moments, de décisions et de conséquences dont l’humain conserve la maîtrise.

Le marché du mariage valide le besoin d’organisation, mais les leaders ont industrialisé les fonctions visibles — checklist, prestataires, site, RSVP et registre. AIME doit donc éviter une guerre frontale sur la quantité. Sa possibilité de devenir une innovation mondiale repose sur une autre question :

> Quand une chose change dans une vie collective, AIME peut-il comprendre qui et quoi sont affectés, proposer la bonne adaptation, laisser l’humain décider, puis propager et annuler proprement cette décision ?

Aujourd’hui, AIME sait déjà représenter une partie de cette promesse. Le prochain passage n’est plus principalement visuel : il est opérationnel, relationnel et humain. Le Monde Mariage sera prêt pour le grand public lorsque cette continuité fonctionnera de bout en bout pour de vrais couples, invités et prestataires, y compris lorsqu’une erreur, un retard ou un changement survient.
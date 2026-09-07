# Audit de connexion de la Timeline

## Fonctionnel et connecté

- Le projet JSONB utilise le schéma `schemaVersion: 2`; les anciens projets sont migrés de façon déterministe au chargement et à l’import.
- Les nouveaux mariages déroulent 49 scènes suggérées de la première intention au premier anniversaire. Les anciens projets issus de la courte démonstration sont enrichis sans remplacer leurs événements personnalisés ; les timelines déjà détaillées ne sont pas modifiées.
- La Timeline relie nativement invités, tables, prestataires, tâches, paiements, documents, musique, équipe, messages, logistique et souvenirs.
- Les index directs/inverses, conflits de ressources/personnes/prestataires, impacts et plans de propagation sont purs et testés.
- Les vues chronologique, Jour J, personnes, prestataires, musique, logistique, collaborative et souvenirs partagent le même graphe.
- Les changements structurants du Jour J affichent leur impact et demandent une confirmation. Aucune propagation dépendante n’est silencieuse.
- L’agent local accepte uniquement six familles de commandes documentées, analyse avant mutation et exige une confirmation.

## Isolé ou incomplet

- L’audit embarqué compte les entités isolées et liens cassés. Certaines données historiques peuvent rester isolées jusqu’à leur rattachement manuel.
- La visibilité et l’audience sont des métadonnées internes. Elles ne constituent pas un portail invité ou prestataire.
- Le rôle courant contrôle les affordances d’édition ; le serveur reste l’autorité et refuse aussi les écritures non autorisées.

## Démo et provenance

- Les événements générés sont marqués `suggested`; l’intention saisie est `real`.
- Les scènes alternent des photographies locales du projet et des ambiances animées en CSS. Aucune ambiance CSS n’est présentée comme une vidéo.
- Aucun fichier vidéo n’est actuellement livré avec l’application : il n’y a donc ni faux autoplay, ni faux lecteur, ni média distant inventé.
- Les morceaux initiaux sont `demo`/manuels tant qu’aucune métadonnée externe vérifiée n’existe.

## Expérience éditoriale

- La page active est une histoire verticale pleine largeur, découpée en 21 sous-chapitres temporels couvrant Avant, Jour J et Après.
- Les scènes restent des points d’entrée vers le drawer fonctionnel : horaires, durées, lieux, statuts, provenance, visibilité, dépendances, ressources et relations restent éditables selon le rôle.
- Les fonds utilisent uniquement les images locales déclarées via le chemin de base de l’artefact. Les animations respectent la préférence système de réduction des mouvements.
- Les étoiles ont été retirées de l’expérience Timeline active. Les icônes restantes servent uniquement à identifier une information ou une action.

## Intégrations requises

- Aucun connecteur musique autorisé n’a été fourni. La recherche, les pochettes, les extraits et la lecture ne sont donc ni affichés ni simulés.
- Une intégration musicale ne devra être proposée/configurée qu’après interaction explicite avec l’utilisateur.

## Prochaines priorités

1. Outil guidé de réparation des liens cassés et rattachement en masse.
2. Permissions serveur plus fines par événement/audience si un véritable portail est créé.
3. Propagation optionnelle aux dépendances avec sélection granulaire et journal d’annulation.
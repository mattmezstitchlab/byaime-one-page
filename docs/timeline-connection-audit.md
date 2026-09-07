# Audit de connexion de la Timeline

## Fonctionnel et connecté

- Le projet JSONB utilise le schéma `schemaVersion: 2`; les anciens projets sont migrés de façon déterministe au chargement et à l’import.
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
- Les morceaux initiaux sont `demo`/manuels tant qu’aucune métadonnée externe vérifiée n’existe.

## Intégrations requises

- Aucun connecteur musique autorisé n’a été fourni. La recherche, les pochettes, les extraits et la lecture ne sont donc ni affichés ni simulés.
- Une intégration musicale ne devra être proposée/configurée qu’après interaction explicite avec l’utilisateur.

## Prochaines priorités

1. Outil guidé de réparation des liens cassés et rattachement en masse.
2. Permissions serveur plus fines par événement/audience si un véritable portail est créé.
3. Propagation optionnelle aux dépendances avec sélection granulaire et journal d’annulation.
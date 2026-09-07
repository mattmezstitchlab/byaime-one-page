# Audit des actions universelles de création AIME

## But

Le bouton `+` ne doit pas reproduire les modules d’un mariage. Il doit exposer les mêmes primitives dans tout Monde AIME : mariage, soirée, sortie, conférence, voyage, association, projet professionnel ou création future.

La vue courante peut changer l’ordre et les exemples, mais pas inventer une nouvelle grammaire d’action.

## Conclusion de l’audit

Les entrées actuelles « À faire », « Invités », « Professionnels », « Jour J » et « Toutes les sections » sont des projections du Monde Mariage. Elles ne constituent pas le registre universel.

Le noyau universel recommandé est :

1. **PERSONNE OU ORGANISATION**
2. **LIEU**
3. **MOMENT**
4. **DOCUMENT OU MÉDIA**
5. **RESSOURCE OU BESOIN**
6. **RELATION**

Deux raccourcis restent utiles sans devenir de nouvelles entités :

- **TÂCHE**, projection simple d’un Moment à accomplir ;
- **CRÉER UN MONDE**, visible lorsqu’on agit au niveau du réseau plutôt qu’à l’intérieur d’un Monde.

## Matrice universelle

| Entrée visible | Ce qui est réellement créé | Exemples selon le Monde | Contexte minimal | Contrôle requis |
| --- | --- | --- | --- | --- |
| Personne ou organisation | Card + relation au Monde | invité, intervenant, ami, association, entreprise, artiste | Monde courant ou réseau | dédoublonnage, visibilité, droit d’ajout |
| Lieu | Place + relation | salle, restaurant, maison, scène, adresse virtuelle | Monde, Moment ou Card | précision choisie, consentement pour l’adresse exacte |
| Moment | Moment | dîner, cérémonie, trajet, conférence, rendez-vous, souvenir | Monde + date facultative | type, visibilité, dépendances éventuelles |
| Tâche | Moment spécialisé | appeler, réserver, préparer, relancer | Monde ou élément sélectionné | responsable et échéance facultatifs |
| Document ou média | Document/Media + relation | devis, billet, programme, photo, contrat | Monde ou élément sélectionné | provenance, droits, validation avant extraction |
| Ressource ou besoin | Resource `offer/request` | matériel, compétence, budget, transport, hébergement | Monde, Card, Place ou Moment | auteur, disponibilité, visibilité |
| Relation | UniversalRelation | participe à, organise, se déroule à, fournit, dépend de | deux éléments canoniques | type explicite, droit sur les éléments concernés |
| Créer un Monde | World + membership propriétaire | mariage, soirée, conférence, voyage | niveau réseau | identité authentifiée et intention initiale |

## Actions communes mais contextuelles

Ces actions ne doivent pas encombrer le premier niveau du `+`. Elles apparaissent lorsque le contexte les rend utiles :

| Action | Quand elle apparaît |
| --- | --- |
| Inviter quelqu’un | dans un Monde ou depuis une personne |
| Envoyer un message | avec une personne ou une audience sélectionnée |
| Réserver | depuis un lieu, une ressource ou un professionnel |
| Ajouter un paiement | depuis un budget, une réservation ou un professionnel |
| Ajouter une disponibilité | depuis une personne, un lieu ou une ressource |
| Importer un document | depuis Documents ou lorsqu’AIME attend une pièce |
| Relier à ce Moment | lorsqu’un Moment est sélectionné |
| Dupliquer ou déplacer | sur un élément existant, jamais comme création globale |

## Actions spécialisées par type de Monde

Elles restent accessibles dans leur projection métier mais écrivent les primitives universelles.

| Monde | Libellé métier | Écriture canonique visée |
| --- | --- | --- |
| Mariage | Ajouter un invité | Card + relation + réponse de présence |
| Mariage | Ajouter un professionnel | Card + Resource + relation de service |
| Mariage | Ajouter au Jour J | Moment |
| Mariage | Ajouter un paiement | Moment financier + Resource |
| Conférence | Ajouter un intervenant | Card + relation |
| Conférence | Ajouter une session | Moment + Place + Cards |
| Soirée | Ajouter un participant | Card + relation |
| Sortie | Ajouter une étape | Moment + Place |
| Voyage | Ajouter un trajet | Moment + Places + Resource transport |

## Ce qui ne doit pas être dans le `+`

- AI : comprendre, chercher, proposer et préparer une action ;
- ME : identité, responsabilités, préférences et éléments partagés ;
- confidentialité et conservation ;
- export JSON ou CSV ;
- impression ;
- déconnexion et suppression ;
- état de synchronisation ;
- filtres de vue ;
- audit technique.

## Problèmes observés

1. `Guest`, `Provider`, `Payment`, `Task` et plusieurs objets de Timeline sont encore des collections locales qui doublonnent les futures primitives universelles.
2. `Place` n’existe pas encore comme entité canonique complète : le lieu reste souvent un texte.
3. L’interface peut créer des éléments nommés « Nouveau… » immédiatement. À terme, le `+` doit ouvrir une saisie courte puis confirmer, plutôt que créer un placeholder.
4. La création d’une relation universelle n’a pas encore d’interface dédiée.
5. Les permissions de création doivent être évaluées côté serveur pour chaque action ; `canEdit` ne suffit pas comme contrat final.
6. Une tâche doit converger vers un type de Moment au lieu d’être écrite deux fois.

## Registre d’actions cible

Chaque action du `+` devra être déclarée une seule fois :

```ts
type CreateActionDefinition = {
  id: string;
  label: string;
  description: string;
  icon: string;
  creates: "world" | "card" | "place" | "moment" | "document" | "media" | "resource" | "relation";
  contexts: Array<"network" | "world" | "card" | "place" | "moment" | "document">;
  capability: string;
  requiresConfirmation: boolean;
  worldTypes?: string[];
};
```

Le centre `+` filtrera ce registre avec :

1. le contexte structuré de l’écran ;
2. les capacités de la personne ;
3. le type de Monde ;
4. les informations déjà présentes ;
5. les conséquences possibles.

## Premier écran recommandé du `+`

La présentation reste éditoriale et monochrome :

- pictogramme fin ;
- titre en majuscules ;
- phrase courte adaptée au contexte ;
- séparateur discret ;
- aucune grille de cartes ;
- aucun badge coloré.

Dans un Monde :

1. Personne ou organisation
2. Lieu
3. Moment
4. Tâche
5. Document ou média
6. Ressource ou besoin
7. Relier des éléments

Au niveau du réseau, **Créer un Monde** passe en première position.

## Ordre de construction

1. Valider les sept entrées et leurs mots.
2. Créer le registre d’actions typé.
3. Publier le contexte structuré de chaque vue.
4. Brancher Card, Place, Moment et World sur l’API canonique.
5. Faire converger Tâche, Invité et Professionnel vers ces primitives.
6. Ajouter Document/Media, Resource et Relation.
7. Ajouter les variantes par type de Monde sans modifier le noyau universel.
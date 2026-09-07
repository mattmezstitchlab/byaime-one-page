# AIME — Matrices de contrôle de la convergence

Complément opérationnel du contrat `aime-universal-architecture-contract.md`.

Statut : référence avant tout adaptateur d’écriture ou migration.

## 1. États de convergence

- **HISTORIQUE** : la donnée reste dans le ZIP/Supabase et n’est pas encore exposée à Replit.
- **ACTIVE** : la donnée est canonique dans l’application Replit actuelle.
- **LECTURE** : Replit peut lire une projection de la source historique, sans écrire.
- **MIGRATION** : comparaison et transfert contrôlé, ancien writer gelé au cutover.
- **CIBLE** : PostgreSQL relationnel derrière l’API Replit est l’unique writer.
- **RETIRÉE** : ancienne source en lecture seule puis archivée après la fenêtre de rollback.

## 2. Matrice des sources et identifiants

| Famille | Source canonique aujourd’hui | Writer autorisé aujourd’hui | Identifiant à préserver | Premier adaptateur | État initial | Condition de passage à CIBLE |
| --- | --- | --- | --- | --- | --- | --- |
| Identity Replit | Clerk | Clerk | `clerk_user_id` | aucun | ACTIVE | déjà cible pour les nouveaux comptes |
| Identity ZIP | Supabase Auth | application ZIP | `supabase_user_id` | mapping Identity | HISTORIQUE | preuve de contrôle + mapping unique Clerk |
| Card | tables `cards` du ZIP | application ZIP | `card_id` UUID | Card read adapter | HISTORIQUE | propriétaires, délégations, visibilité et médias à parité |
| Follows / relations sociales | tables sociales du ZIP | application ZIP | IDs historiques | SocialGraph read adapter | HISTORIQUE | blocages, modération et confidentialité à parité |
| World générique | `events` et tables projet du ZIP | application ZIP | `event_id` UUID | World read adapter | HISTORIQUE | membres, relations, modules et historique à parité |
| Mariage Replit | projet JSONB Replit | API Replit | `project.id` | WorldProject projection adapter | ACTIVE | conversion relationnelle sans perte et double lecture validée |
| Membership ZIP | participants/invitations/rôles du ZIP | application ZIP | IDs participants et invitations | Membership read adapter | HISTORIQUE | matrice de rôles restrictive validée |
| Collaborateurs Replit | membres API Replit | API Replit | `project_member.id` | Membership projection adapter | ACTIVE | mapping vers Membership avec permissions équivalentes ou plus strictes |
| Timeline ZIP | projection du World historique | application ZIP | IDs de Moments historiques | Moment read adapter | HISTORIQUE | relations, dates et provenance à parité |
| Timeline Replit | événements du JSONB | API Replit | `TimelineEvent.id` | Moment projection adapter | ACTIVE | Moments/Relations reconstruisent exactement la Timeline et ses conflits |
| LAB | tables LAB du ZIP | application ZIP après correction RLS | UUID board/object/member | Lab read adapter | HISTORIQUE | migrations nettoyées, RLS durci, références intactes |
| Documents ZIP | tables Bureau/media + Storage | application ZIP | IDs document/media | Document metadata adapter | HISTORIQUE | fichiers, grants, liens et provenance à parité |
| Documents Replit | JSONB + Object Storage | API Replit | ID document + clé objet | Document projection adapter | ACTIVE | enregistrements canoniques et grants explicites |
| Médias ZIP | `media_items`, MusicBox et Storage | application ZIP | IDs média | Media read adapter | HISTORIQUE | droits, variantes, provenance et URLs indirectes à parité |
| Médias Replit | Object Storage + références projet | API Replit | clé objet Replit | Media metadata adapter | ACTIVE | Media canonique référence toutes les variantes |
| Places / géolocalisation | Cards et données géographiques du ZIP | application ZIP | IDs Card/Place historiques | Place read adapter | HISTORIQUE | précision et audience filtrées côté serveur |
| Fil / publications | tables posts/commentaires/réactions du ZIP | application ZIP | IDs historiques | Feed read adapter | HISTORIQUE | modération, blocages, audience et pagination à parité |
| Messages | threads/messages du ZIP | application ZIP | IDs historiques | aucun au premier incrément | HISTORIQUE | chiffrement, audience et rétention explicités |
| Notifications | tables notifications du ZIP | application ZIP | IDs historiques | Activity projection adapter | HISTORIQUE | destinations contextuelles et préférences migrées |
| Paiements / devis | tables financières ZIP et données Replit | writer d’origine uniquement | IDs provider/quote/payment | Financial read adapter | HISTORIQUE/ACTIVE | aucun mouvement d’argent pendant comparaison ; parité certifiée |
| Radio / TV | MusicBox et composants ZIP | application ZIP | IDs média historiques | MediaChannel read adapter | HISTORIQUE | droits de diffusion et catalogue Media canoniques |
| Proposals | LAB ZIP pour l’existant | application ZIP | IDs propositions | Proposal read adapter | HISTORIQUE | CommandJournal et application transactionnelle disponibles |
| Activity | systèmes d’origine | writer d’origine | IDs historiques | Activity normalization adapter | HISTORIQUE/ACTIVE | schéma commun sans perte de provenance |
| CommandJournal | absent | aucun | futur UUID ordonnable | aucun | À CRÉER | transaction métier + outbox + replay validés |

## 3. Règles de mapping

### 3.1 Identités

Table cible de correspondance :

| Champ | Règle |
| --- | --- |
| `legacy_provider` | valeur fixe `supabase` pour le ZIP |
| `legacy_subject` | identifiant Supabase historique |
| `clerk_subject` | identifiant Clerk prouvé |
| `verified_at` | date de preuve |
| `verification_method` | méthode non secrète utilisée |
| `status` | pending, verified, conflicted, revoked |

Contraintes :

- unicité de `(legacy_provider, legacy_subject)` ;
- unicité de `clerk_subject` par mapping actif ;
- aucune fusion automatique par email ;
- aucune suppression de l’identifiant historique ;
- conflit traité manuellement.

### 3.2 Entités métier

Les UUID historiques sont préservés lorsqu’ils ne collisionnent pas.

En cas de collision :

- un identifiant cible distinct est créé ;
- une table de mapping permanente conserve source, type et identifiant historique ;
- toutes les relations sont migrées via le mapping ;
- l’ancien identifiant reste recherchable ;
- l’interface n’expose pas cette complexité.

### 3.3 Fichiers

Les URLs historiques ne deviennent jamais des identifiants.

Le mapping conserve :

- ID document ou média historique ;
- empreinte du contenu ;
- clé objet source ;
- clé objet cible ;
- statut de copie ;
- contrôle d’intégrité ;
- politique de rétention.

## 4. Matrice des niveaux de données

| Niveau | Exemples | Audience par défaut |
| --- | --- | --- |
| PUBLIC | nom de Card publique, ville, titre d’un World public, événement public | tout le monde |
| NETWORK | compétences, publications réseau, disponibilité générale | réseau autorisé |
| WORLD | planning général, membres visibles, documents communs | membres du World |
| OPERATIONS | téléphone opérationnel, allergies, accessibilité, horaires privés | équipe explicitement autorisée |
| FINANCIAL | devis, factures, montants, paiements, coordonnées bancaires indirectes | finance/administration |
| PRIVATE | email personnel, notes privées, documents d’identité | propriétaire et grants explicites |
| EXACT_LOCATION | domicile, position en temps réel, hébergement individuel | consentement et audience dédiée |
| MODERATION | signalements, décisions, preuves, blocages internes | modérateurs autorisés |

Une réponse API peut réduire la précision ou masquer un champ. Elle ne relève jamais silencieusement son audience.

## 5. Matrice des capacités par rôle World

Légende :

- **O** : autorisé par défaut ;
- **P** : permission spécialisée requise ;
- **S** : uniquement sur ses propres contributions ;
- **—** : interdit.

| Capacité | owner | admin | editor | contributor | commenter | viewer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Lire métadonnées World | O | O | O | O | O | O |
| Modifier métadonnées | O | O | O | — | — | — |
| Gérer modules | O | O | P | — | — | — |
| Inviter | O | O | P | — | — | — |
| Modifier les rôles techniques | O | O | — | — | — | — |
| Transférer la propriété | O | — | — | — | — | — |
| Supprimer/archiver | O | P | — | — | — | — |
| Créer un Moment | O | O | O | S | — | — |
| Modifier un Moment | O | O | O | S | — | — |
| Valider une Proposal | O | O | O | P | — | — |
| Déposer un document | O | O | O | O | — | — |
| Lire document WORLD | O | O | O | O | P | P |
| Lire document OPERATIONS | O | P | P | P | — | — |
| Lire document FINANCIAL | O | P | P | — | — | — |
| Gérer paiements | O | P | P | — | — | — |
| Exporter le World | O | P | P | — | — | — |
| Commenter | O | O | O | O | O | — |
| Voir Activity membre | O | O | O | P | — | — |
| Publier publiquement | O | O | P | — | — | — |

Un rôle ne suffit jamais à lire PRIVATE, EXACT_LOCATION ou MODERATION. Un grant ou une capacité spécialisée est obligatoire.

## 6. Capacités contextuelles des Cards

| Action | Propriétaire Card | Admin délégué | Relation autorisée | Visiteur |
| --- | ---: | ---: | ---: | ---: |
| Voir profil public | O | O | O | O |
| Modifier identité | O | O | — | — |
| Modifier localisation exacte | O | P | — | — |
| Suivre | — | — | O | O |
| Contacter | — | — | selon préférences | selon préférences |
| Ajouter à un World | O | O | avec consentement/invitation | invitation requise |
| Répondre à une demande | O | O | si destinataire | si autorisé |
| Publier au nom de la Card | O | P | — | — |
| Déléguer l’administration | O | — | — | — |

## 7. Décisions spécifiques au mariage

| Donnée | Niveau minimal | Règle |
| --- | --- | --- |
| Nom d’un invité | WORLD | visibilité configurable dans les espaces partagés |
| Email/téléphone invité | PRIVATE ou OPERATIONS | jamais inclus dans un export général par défaut |
| RSVP | WORLD | réponse personnelle visible aux organisateurs autorisés |
| Allergie/régime | OPERATIONS | uniquement organisateurs et prestataires concernés |
| Besoin d’accessibilité | OPERATIONS | finalité explicite et accès minimal |
| Table/placement | WORLD | peut être révélé progressivement |
| Budget global | FINANCIAL | non visible aux prestataires par défaut |
| Montant d’un prestataire | FINANCIAL | visible au propriétaire et rôle finance |
| Adresse d’hébergement | EXACT_LOCATION | visible uniquement aux personnes concernées |
| Document contractuel | FINANCIAL/PRIVATE | grant explicite |
| Photo souvenir | WORLD ou PUBLIC | audience choisie au moment de la publication |

## 8. Actions externes et replay

Les commandes suivantes ne sont jamais rejouées automatiquement :

- email ;
- SMS ;
- notification push ;
- paiement ;
- remboursement ;
- publication publique ;
- diffusion média ;
- invitation externe ;
- suppression définitive.

Un replay technique restaure l’état canonique puis place ces effets en revue. Leur exécution exige une nouvelle décision explicite ou une preuve d’idempotence du fournisseur.

## 9. Gates avant le premier code de migration

- migrations ZIP rejouables depuis une base vide ;
- politiques LAB corrigées ;
- mapping Identity testé sur fixtures anonymisées ;
- endpoints de capacités disponibles ;
- redaction serveur testée ;
- CommandJournal et outbox spécifiés dans le schéma ;
- adaptateur en lecture seule seulement ;
- comparaison de volumes et relations ;
- test Carte/Liste sans coordonnées ;
- test de non-exposition des coordonnées exactes ;
- aucun `.env` importé depuis le ZIP ;
- aucun secret historique copié.

## 10. Première tranche autorisée

La première tranche de code peut uniquement :

1. définir les contrats TypeScript universels ;
2. définir le registre de capacités pur et ses tests ;
3. créer une projection de démonstration en mémoire ;
4. afficher Carte/Liste à partir de données non sensibles existantes ;
5. ouvrir une Carte contextuelle commune ;
6. conserver toutes les écritures désactivées.

Elle ne peut pas :

- migrer des utilisateurs ;
- écrire dans Supabase ;
- importer des fichiers historiques ;
- déplacer des médias ;
- modifier la source canonique des projets ;
- activer une action financière ;
- exposer des coordonnées exactes.
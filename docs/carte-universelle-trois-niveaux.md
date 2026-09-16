# BYAIME — trois sources distinctes, une projection temporelle

**État du code après vérification et correction du 16 septembre 2026.**
Ce document remplace les descriptions du fonctionnement professionnel contenues dans l’audit de la première passe. Il ne décrit pas une nouvelle application.

## Conclusion de la vérification

La première passe ne satisfaisait pas entièrement cette distinction : `UniversalCard.professional` contenait des champs textuels, et la création de carte continuait directement vers les questions de mariage.

Ces deux points ont été corrigés :

1. **Créer une carte** enregistre l’identité uniquement et termine sur « Ma carte est prête ». Aucun mariage, rôle, RSVP ou profil professionnel n’est nécessaire.
2. **Enregistrer un fonctionnement** est une action indépendante, sans mariage. Les paramètres temporels ont des types, des unités et une validation ; les disponibilités ne sont pas du texte libre.
3. **Configurer une association** nécessite le choix explicite d’un mariage dont on est déjà membre. Les rôles, la présence, les informations sensibles et les dérogations appartiennent à ce contexte.

La finition du parcours est maintenant réalisée : **CRÉER MA CARTE → MA CARTE EST PRÊTE → CONFIGURER MON FONCTIONNEMENT → REJOINDRE / CRÉER UN MARIAGE**. Une carte déjà enregistrée ouvre directement son espace de gestion, sans refaire l’identité. Le socle fonctionnel est considéré comme stabilisé ; pas de nouvelle source ou architecture à ajouter sans nécessité.

## 1. Tables et entités réelles

| Table                           | Origine                                      | Fonction et données                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `aime_universal_cards`          | Première passe                               | Une carte par `user_id` Clerk, PK. `data` = identité ; `updated_at` = version de modification.                                                                                                                                                                                                                                                                                                                           |
| `aime_professional_profiles`    | **Nouvelle dans cette correction**           | `id`, `card_user_id`, `profession`, `data`, `updated_at`. Un fonctionnement par personne et métier. Aucun projet, RSVP ou donnée médicale.                                                                                                                                                                                                                                                                               |
| `aime_memberships`              | Table existante, étendue à la première passe | Association unique `(project_id, user_id)`. `card_user_id` référence la carte ; `participation` contient le contexte propre au mariage ; les réponses d’un RSVP lié sont lues depuis ce RSVP, sans copie. `role` conserve son sens historique de permission d’accès. `participant_only` restreint les nouvelles associations issues de RSVP, sans transformer une invitation personnelle en invitation de collaboration. |
| `aime_professional_assignments` | **Nouvelle dans cette correction**           | Interventions dépendantes d’une association : `id`, `membership_id`, `user_id`, `profile_id`, `data = {anchor, overrides}`. Ce n’est ni une personne, ni un second profil, ni une seconde Timeline.                                                                                                                                                                                                                      |
| `aime_projects`                 | Inchangée comme source de mariage            | Mariage et moments organisés déjà présents dans `data`.                                                                                                                                                                                                                                                                                                                                                                  |
| `aime_rsvps`                    | Table existante, étendue                     | Réponses historiques conservées. `claim_email` = destinataire confirmé explicitement ; `claimed_card_user_id` = référence à la carte ; `claimed_at` = horodatage du rattachement. Aucun rapprochement de noms.                                                                                                                                                                                                           |

**Total ajouté depuis le début du travail : trois tables** (carte, profils métier, interventions). Une seule table personne/carte. Les mariages et la Timeline existants sont conservés.

## 2. Relations et invariants

```text
Compte Clerk — userId (authentification externe)
    │ 1:1, PK user_id
    ▼
Carte Universelle
    ├── 1:N Profils métier
    │          └── 1:N Interventions professionnelles
    │                         ▲
    └── 1:N Adhésions / associations au mariage
                              │ 1:N
                              └── Interventions professionnelles
                  │ N:1
                  ▼
             Mariage existant
```

Contraintes PostgreSQL effectivement déclarées dans Drizzle et dans les migrations :

- Carte : PK `user_id`. L’API prend ce champ dans la session Clerk, jamais dans le formulaire.
- Profil : FK `card_user_id → aime_universal_cards.user_id` ; UNIQUE `(card_user_id, profession)`.
- Association : UNIQUE `(project_id, user_id)` existant ; FK `card_user_id → carte` nullable pour conserver les membres historiques ; CHECK `card_user_id IS NULL OR card_user_id = user_id`.
- Intervention : FK composite `(membership_id, user_id) → memberships(id, user_id)` et FK composite `(profile_id, user_id) → professional_profiles(id, card_user_id)`. **Une intervention ne peut pas relier l’association de Jean au profil de Paul.**
- La suppression d’une association supprime ses interventions, pas la personne ni son profil métier. La suppression du compte/de sa carte supprime les profils et interventions dépendants. Ces cascades sont testées avec PostgreSQL embarqué.

## 3. Source « Carte Universelle » — qui suis-je ?

`UniversalCard` ne contient plus `professional` :

```json
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "nickname": "jean",
  "photoUrl": "…",
  "city": "Paris",
  "profession": "Photographe",
  "interests": ["Photo", "Musique"],
  "music": {
    "provider": "apple_music",
    "externalId": "…",
    "title": "…",
    "artist": "…"
  }
}
```

Le métier affiché sur la carte est une **information de présentation uniquement**, distincte du métier identifiant chaque profil structuré. Il ne sélectionne, ne crée, ne renomme et ne modifie aucun profil métier, paramètre ou calendrier. L’éditeur de fonctionnement ne reçoit plus cette valeur comme sélection par défaut. Il **n’assigne jamais automatiquement un rôle** à un mariage. Il est possible d’avoir plusieurs profils d’activité sans multiplier les cartes.

La validation de carte rejette les clés contextuelles/professionnelles ajoutées au premier niveau (`professional`, `allergens`, etc.).

## 4. Source « Profil métier » — comment je fonctionne ?

Exemple de `ProfessionalProfile.data` pour un photographe :

```json
{
  "parameters": {
    "durationMinutes": 510,
    "setupMinutes": 30,
    "delivery": "Galerie privée"
  },
  "availability": {
    "timezone": "Europe/Paris",
    "weekly": [
      { "weekday": 6, "start": "13:00", "end": "23:30", "overnight": false }
    ],
    "windows": [],
    "unavailable": []
  },
  "coveredMoments": ["Cérémonie", "Cocktail", "Dîner"],
  "legacyNotes": {}
}
```

### Ce qui est réellement structuré et exploité

- `PROFESSIONAL_CONFIG` décrit des identifiants stables de champs, libellés, types (`text`, `minutes`, `integer`) et limites.
- Le formulaire, la validation des paramètres et le calcul temporel utilisent cette même configuration.
- Photographe / métiers à durée : `durationMinutes` produit la fin de l’intervention.
- Saxophoniste : durée = `setCount × setMinutes + (setCount − 1) × breakMinutes` ; sets vides/incomplets refusés lors de l’association.
- `setupMinutes`, `soundcheckMinutes`, `teardownMinutes` étendent la plage de travail et produisent les plages de préparation/démontage dans la Timeline existante.
- Disponibilités : créneaux hebdomadaires avec fuseau IANA, fenêtres datées et exclusions datées. Les exclusions priment. Les contrôles portent sur **toute l’intervention, installation comprise**.
- Fuseaux, passages de nuit, changements d’heure et limites à la seconde font l’objet de tests.
- Sans calendrier renseigné, le résultat est **« disponibilité à confirmer »**, pas « disponible ».
- `coveredMoments` décrit les moments habituellement couverts ; ce n’est ni une réservation, ni une interdiction absolue de participer à un autre moment. L’intervention choisie explicitement dans le mariage fait foi.
- Les textes libres sont réservés aux méthodes, livraisons et contraintes techniques. Ils ne sont pas interprétés comme des horaires.

Ajouter un métier ne nécessite aucune table ni formulaire dédié : inscription dans le catalogue des rôles si nécessaire, configuration de ses champs et choix de son mode de durée. Une nouvelle règle de calcul, si elle dépasse « durée » ou « sets », s’ajoute au résolveur partagé, pas à chaque module.

## 5. Source « Association au mariage » — qu’est-ce que je fais ici ?

`memberships.participation` :

- `roles[]` : rôles sociaux dans **ce mariage** ;
- `rsvp`, `companions`, `moments[]`, `arrival`, `departure` ;
- `allergens`, `dietary`, `needs`, `notes` ;
- `slots[]` : créneaux contextuels explicitement saisis, conservés pour compatibilité.

Les interventions professionnelles sont des lignes dépendantes dans `aime_professional_assignments` et non des copies de paramètres dans ce JSON :

```json
{
  "profileId": "identifiant-du-profil-photographe-de-Jean",
  "anchor": { "presence": "arrival" },
  "overrides": {}
}
```

Trois ancrages exclusifs sont possibles :

1. `{eventId: "cocktail-du-mariage"}` : utilise le début du moment déjà organisé ;
2. `{presence: "arrival"}` : installation à l’arrivée déjà renseignée, puis début de prestation après préparation ;
3. `{start: "2027-06-12T14:00:00+02:00"}` : début de prestation spécifique, si aucun horaire connu ne convient.

`overrides` contient **uniquement les valeurs différentes pour ce mariage**, avec les mêmes types et limites que le profil métier. Un champ absent continue de référencer le profil. Effacer une dérogation rétablit ce comportement sans recopier une valeur par défaut.

À l’écriture, le serveur vérifie l’appartenance des profils, leur correspondance aux rôles du mariage, les ancrages et la compatibilité temporelle. Une intervention incompatible est refusée avec une réponse 422. Une indisponibilité nouvellement constatée ne doit pas empêcher de déclarer ensuite son absence.

## 6. Timeline : une projection, pas une quatrième source

Chemin réel :

```text
GET /api/projects (ou brief / fil authentifié)
  → adhésions du mariage
  → jointure carte par card_user_id
  → interventions par membership_id
  → jointure profil par profile_id
  → paramètres effectifs = paramètres du profil + dérogations du mariage
  → résolution de l’ancrage et des durées
  → contrôle disponibilités + bornes de présence
  → événements dérivés card-presence:*
  → WorldProject.timeline existante
```

- `resolveProfessionalAssignment` est le calcul partagé ; `projectWithCards` construit la projection autorisée.
- Une plage de disponibilité n’émet **aucun événement à elle seule** : une intervention contextualisée doit exister.
- Un invité qui n’a sélectionné que cérémonie/cocktail utilise les horaires de ces moments déjà connus ; aucun horaire n’est inventé s’ils manquent.
- Les paramètres professionnels changés sont relus à la prochaine récupération du projet. Les dérogations restent propres au mariage. Le formulaire recharge le contexte actif après une sauvegarde professionnelle ; ce n’est pas un système de notifications temps réel entre tous les navigateurs.
- Un changement de profil rendant une intervention incompatible ne réécrit ni la présence ni les moments du mariage : la projection devient bloquée/à vérifier.
- Si le RSVP n’est pas confirmé ou la disponibilité est inconnue, la prestation n’est pas présentée comme confirmée.
- `stripCardProjection` exclut `cardParticipants` et les événements `card-presence:*` des écritures de projets. Le cache frontend peut contenir une vue, mais ce n’est pas une source de vérité éditable.
- L’éditeur et le store protègent les événements dérivés contre l’édition directe. Les données doivent être modifiées au niveau approprié.

**Exemple vérifié :** présence Jean 14h–23h, profil 510 minutes de prestation + 30 minutes d’installation, ancrage sur l’arrivée. Résultat : présence 14h–23h, installation 14h–14h30, prestation 14h30–23h. L’heure de fin n’est pas ressaisie dans l’intervention.

## 7. Rôles multiples, permissions inchangées

Jean peut être `Photographe` **et** `Témoin` dans A : un tableau `roles[]` sur la même association. Il peut rattacher plusieurs interventions à ses profils professionnels.

`memberships.role` reste `owner / planner / family / viewer`. Un rôle social comme « Wedding planner » **ne donne pas** la permission technique `planner`. Le choix métier n’est jamais une escalade de privilèges.

## 8. Une personne, plusieurs mariages

```text
Carte Jean — user_id = son identifiant Clerk
Profil Photographe — card_user_id = le même identifiant

Association A — (projet A, Jean)
  roles = [Photographe, Témoin]
  présence = 14h–23h
  intervention → profil Photographe, ancrage arrivée

Association B — (projet B, Jean)
  roles = [Invité]
  moments = [Cérémonie, Cocktail]
  aucune intervention professionnelle obligatoire
```

La création de B n’insère aucune autre carte et aucune copie de Jean dans `guests` ou `providers`. Les données de A ne préremplissent pas les allergies ou horaires de B. Le changement de contexte recharge les réponses propres au mariage choisi.

## RSVP anonymes : invitation → validation → association explicite

Aucune fusion par nom, pseudo ou métier. Aucun backfill depuis `Guest.contact` (modifiable dans le projet) : ce champ n’est pas une preuve d’identité. Les anciennes lignes restent anonymes et utilisables comme avant tant qu’elles ne sont pas explicitement rattachées.

### Procédure effectivement implémentée

1. L’organisateur **owner/planner** crée le lien RSVP existant, puis confirme une adresse personnelle unique via `PATCH /api/projects/:id/rsvp-links/:guestId/claim-recipient`, corps `{email, confirmed:true}`. Le panneau Invités propose ce formulaire ; une adresse préremplie ne vaut jamais confirmation.
2. La personne se connecte et possède sa carte. Depuis le portail RSVP ou « Rejoindre un mariage », elle ouvre la validation `GET /api/rsvp/:token/claim`. Le serveur récupère les adresses **vérifiées par Clerk** : aucune adresse fournie par le navigateur n’est une preuve.
3. Le serveur vérifie le jeton non révoqué, le mariage non clôturé, l’invité existant, le destinataire explicitement confirmé, l’absence d’ambiguïté et de revendication concurrente. Il refuse une autre invitation déjà liée à la même carte dans ce mariage. La prévisualisation n’écrit rien.
4. La personne confirme explicitement `{confirmed:true}` via `POST /api/rsvp/:token/claim`. La transaction recontrôle ces conditions sous verrou projet puis RSVP/association, conserve l’invité et ses réponses, et référence la carte. Un conflit avec des réponses contextuelles non vides est refusé, jamais écrasé silencieusement.
5. Une nouvelle membership est `viewer` **avec `participant_only=true`**. Elle permet uniquement son propre contexte et une projection reprenant le programme autorisé du portail d’invitation. Les routes de collaboration, fichiers privés et données des autres invités restent interdites. Une membership préexistante conserve ses permissions et ses rôles. Seule une véritable invitation de collaboration vérifiée peut retirer cette restriction.
6. Un rejeu par le même compte est idempotent. Un autre compte ne peut pas transférer le lien. L’horodatage et la référence de carte constituent la trace du rattachement ; ce n’est pas un journal exhaustif de sécurité.

### Protection et source canonique

- Après rattachement, le jeton seul ne suffit plus pour lire/modifier le RSVP, consulter ou finaliser des médias, demander un upload ou proposer une chanson : le compte associé est requis. Les mutations recontrôlent la propriété en transaction.
- `response`, `responded_at`, `guest_id`, médias et chansons historiques restent en place. Pas de nouvelle personne dans `guests`, pas de copie des réponses dans la carte ou la membership.
- `participationWithRsvp` projette les réponses existantes dans `my-participation` et la lecture Timeline. `withoutRsvpCopies` exclut les champs partagés de l’écriture de membership. Les champs correspondants sont en lecture seule dans l’éditeur de contexte, avec un lien vers le RSVP d’origine. Les autres moments sociaux, rôles, besoins et interventions restent indépendants.
- Une modification du RSVP pendant l’édition d’un contexte ne peut pas être écrasée par une copie périmée : l’écriture est refusée et demande un rechargement.
- UNIQUE `(project_id, claimed_card_user_id)` complète les verrous applicatifs. Les lignes historiques avec NULL ne sont pas fusionnées.
- Révoquer/réémettre un jeton ne change ni la propriété ni les réponses. Un destinataire déjà rattaché ne peut pas être remplacé via le formulaire de confirmation.
- La suppression de carte met la FK à NULL mais **conserve `claimed_at`** : le lien ne redevient pas anonyme. L’effacement de compte efface également l’adresse de rattachement ; le RSVP historique reste soumis à la conservation du mariage. Aucun transfert/réouverture automatique n’est proposé pour ces dossiers : traitement explicite avec l’organisateur nécessaire.

### Parcours terminé

L’espace « Ma carte est prête » présente la carte, sa photo et sa musique jouable, les profils métier indépendants, puis les mariages. « Modifier mon identité » est une action explicite, pas un onboarding rejoué. Les profils existants sont accessibles individuellement ; « Ajouter un profil métier » commence sans sélection dérivée du métier affiché. Abandonner des modifications professionnelles demande confirmation. Les contrôles sont désactivés pendant l’enregistrement.

« Rejoindre un mariage » accepte les liens RSVP ou les invitations de collaboration, en gardant leurs validations distinctes. « Créer un mariage » ouvre directement le compositeur existant, sans reconstruire l’identité. Invité ou proche peut ignorer la configuration professionnelle. Les états sans profil/sans mariage et les erreurs de validation sont explicites. Aucun JSON n’est requis dans ce parcours.

## Allergènes et besoins sensibles

- Jamais dans la Carte Universelle.
- Jamais copiés dans un profil métier ; les paramètres non configurés (`allergens`, etc.) sont refusés.
- Les nouveaux allergènes/besoins sont stockés dans la participation au mariage uniquement. Les réponses alimentaires des anciens RSVP restent dans leur source historique ; elles ne sont pas copiées dans la carte ni dans un profil métier.
- Lecture/écriture actuelle : auteur authentifié de cette association, via `my-participation` et son export personnel.
- Exclus de `cardParticipants`, du brief, du fil générique, des événements Timeline et du profil public.
- Les calendriers détaillés du profil métier et les anciennes notes ne sont pas exposés au mariage ; seulement les paramètres de l’intervention et le résultat du contrôle de disponibilité.
- Une future vue organisateur doit avoir un contrôle d’autorisation explicite et limité à ce mariage. Elle n’est pas remplacée ici par un accès global des membres aux réponses sensibles.

## Migrations et compatibilité

Ordre obligatoire :

1. `lib/db/migrations/20260916_universal_cards.sql` ;
2. `lib/db/migrations/20260916_professional_profiles.sql` ;
3. `lib/db/migrations/20260916_verified_rsvp_claims.sql` ;
4. déploiement du code serveur/frontend correspondant.

La troisième migration est additive et réexécutable : trois colonnes de rattachement sur les RSVP, une unicité, et le drapeau d’accès restreint sur les memberships. Aucun invité ni destinataire n’est inféré. Ce drapeau est nécessaire pour éviter une élévation de permissions depuis une invitation RSVP ; ce n’est ni un nouveau rôle social ni une nouvelle source de données.

La seconde migration crée les profils et interventions, extrait les anciennes réponses `card.professional` vers `profile.data.legacyNotes`, puis retire ce champ de la carte **dans la même transaction**. Les textes restent verbatim, les anciens noms de champs ne deviennent pas artificiellement des minutes. Les formes anciennes non reconnues font échouer la transaction pour révision manuelle, plutôt que d’être supprimées.

Routes conservées : carte, projets, imports, RSVP et profils publics existants. Nouvelle API indépendante : `GET/PUT /api/me/professional-profiles`. L’API `my-participation` restitue et accepte les interventions comme références, mais les stocke dans la table relationnelle dédiée.

## Vérifications reproductibles

- `corepack pnpm run typecheck` : types des bibliothèques, serveur, frontend et E2E.
- `corepack pnpm run test` : **627 tests** (33 domaine, 78 serveur, 516 frontend).
- `corepack pnpm run test:card-migrations` : PostgreSQL embarqué PGlite, exclusivement de test. Conservation historique, trois migrations réexécutables, extraction sans perte, unicités, références vers la même personne, cascades et RSVP anonyme inchangé. **Aucun autre moteur de données n’est introduit dans le produit.**
- `professionalProjection.test.ts` : une carte, profils Photographe/DJ, A Photographe + Témoin + Ami, B DJ + Invité + Frère ; changement de paramètres/calendrier dans chaque sens sans contamination de l’autre Timeline. Modifier le métier de présentation ne modifie pas le fonctionnement.
- `claimRsvp.test.ts` : la transaction utilisée par les routes s’exécute réellement sur PostgreSQL embarqué isolé. Validation sans mutation, conservation des anciennes réponses/médias/chansons, homonyme, email non vérifié/absent/ambigu, jeton révoqué, conflit, rejeu, unicité, suppression, permissions préexistantes et concurrence de requêtes sont contrôlés.
- `e2e/universal-card.preview.spec.ts` : **4 tests réussis**, desktop et mobile. Jean crée sa carte avec photo et lecture audio réelle, configure Photographe, rejoint A 14h–23h puis B comme invité, ajoute DJ avec un calendrier distinct, puis utilise DJ dans B avec plusieurs rôles sociaux. Les références, durées et informations des deux Timelines sont vérifiées. Le retour sur « Ma carte » ne montre pas un nouvel onboarding.
- Le second scénario navigateur contrôle invitation → validation → consentement → contexte déjà renseigné, avec champs RSVP non duplicables. Ses réponses API sont simulées ; la transaction et les refus sont testés séparément sur PGlite.
- L’aperçu utilise une authentification/API en mémoire pour les cartes et profils ; les endpoints de revendication non simulés y refusent explicitement l’opération. Aucun compte Clerk de production créé et aucune migration appliquée à votre base dans cette session.

**Limites de validation :** PGlite sérialise ses transactions ; les requêtes concurrentes et contraintes ont été vérifiées dans cet environnement, pas avec plusieurs connexions sur votre PostgreSQL déployé. La chaîne HTTP complète avec un vrai compte Clerk, les emails vérifiés, le stockage objet et une base déployée reste à valider en staging avant mise en production. La vue organisateur des nouveaux besoins médicaux personnels reste hors périmètre ; cela ne reporte ni les garanties structurelles ni la finition du parcours décrites ci-dessus.

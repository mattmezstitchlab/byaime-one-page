# AIME MUSIC / SOUND ENGINE — Architecture de la Timeline sonore universelle

**Statut :** architecture de référence  
**Date de rédaction :** 8 septembre 2026  
**Périmètre :** modèle universel, contrats partagés et trajectoire de migration  
**Hors périmètre :** moteur DJ complet, diffusion mondiale, synchronisation réelle multi-appareils et choix définitif d’un fournisseur

## Résumé de la décision

AIME MUSIC n’est pas une playlist de mariage et n’est pas un lecteur Spotify. C’est un **graphe sonore temporel et relationnel** capable de décrire :

- ce qu’est un son pour AIME ;
- à quels Moments, personnes, lieux, émotions et histoires il est relié ;
- comment il a été proposé, discuté, validé et rendu visible ;
- d’où son média peut être obtenu dans un contexte donné ;
- quels droits, consentements et règles de fournisseur ont été examinés ;
- comment une séquence pourrait être préparée puis exécutée ;
- ce qui a effectivement été joué lors d’une session.

Le moteur est organisé en trois plans séparés :

1. **Mémoire sonore** — identité AIME, médias, relations, provenance, droits et consentements.
2. **Partition** — bindings aux Moments, séquences, dossiers, tags, contributions et décisions.
3. **Session** — plan résolu, grants éphémères, régie, commandes et journal de lecture.

Le Mariage, la Radio, le Récit, le Podcast, l’Événement, l’Art et la Mémoire utilisent ces trois plans. Aucun de ces usages ne possède le moteur ni ne redéfinit son identité.

Les contrats TypeScript correspondants vivent dans :

- `lib/aime-domain/src/sound-core.ts`
- `lib/aime-domain/src/sound-policy.ts`
- `lib/aime-domain/src/sound-playback.ts`
- `lib/aime-domain/src/sound-legacy.ts`

Ils sont exportés par `@workspace/aime-domain` et n’importent aucun composant React, SDK fournisseur, stockage, authentification ou moteur audio.

---

## 1. Frontière du moteur universel

### Ce que le moteur possède

Le moteur possède les concepts stables :

- `SoundItem`
- `SoundMediaAsset`
- `SoundProviderMapping`
- `SoundMediaBinding`
- `SoundSequence` et `SoundSequenceEntry`
- `SoundFolder`, `SoundTag` et leurs appartenances
- relations sémantiques
- `SoundRightsStatement`
- `SoundConsentStatement`
- `SoundProviderPolicyObservation`
- `SoundUsageDecision`
- `SoundCollaborationSpace`
- contributions et décisions
- plans, sessions, commandes et événements de lecture

### Ce que les applications possèdent

Chaque application possède ses libellés, ses vues et ses politiques de contexte :

| Application | Projection du moteur | Ce qu’elle ne doit pas redéfinir |
|---|---|---|
| Mariage | entrées, cérémonie, repas, ouverture de bal, souvenirs | identité du son, fournisseur, droits et session |
| Radio | programmation, antenne, régie, archives | le `SoundItem` et les consentements |
| Récit | narration, ambiances, chapitres, souvenirs | le média source et les relations aux personnes |
| Podcast | épisodes, voix, chapitrage, montage déclaré | droits de publication et consentement |
| Événement | cues, séquences, régie, incidents | la licence du lieu ou le compte fournisseur |
| Art | installation, boucle, synchronisation média | le droit de synchronisation |
| Mémoire | archives, témoignages, embargo, transmission | autorité culturelle et retrait |

Une application peut fournir des **presets** de séquence, de rôle ou de politique. Elle ne crée pas un deuxième type de piste.

### Frontières techniques

Le domaine partagé définit des contrats. Les implémentations suivantes restent hors de la bibliothèque :

- OAuth et tokens ;
- appels de recherche ;
- URL signées ;
- stockage physique ;
- lecture audio ;
- règles juridiques par pays ;
- calcul concret d’abonnement ou de territoire ;
- empreintes, transcriptions et traitements ;
- modération opérationnelle ;
- suppression physique et rétention ;
- transport temps réel des commandes et observations.

---

## 2. Invariants non négociables

### I1 — Le Moment reste la source temporelle de vérité

Un son peut exister sans Moment, mais tout usage temporel dans un Monde passe par un `SoundMediaBinding` canonique vers un Moment. La Timeline ne stocke pas une deuxième liste inverse éditable.

La file de lecture est une projection de cette relation, jamais un deuxième graphe métier.

### I2 — L’identité AIME survit aux fournisseurs

L’ID d’un `SoundItem` ne dépend jamais d’un URL, d’un ISRC, d’un fichier, de Spotify, Apple Music, YouTube ou d’un autre catalogue.

Un item peut avoir zéro, une ou plusieurs correspondances fournisseurs. La disparition d’une correspondance ne supprime ni le Moment, ni le titre mémorisé, ni les relations, ni la décision.

### I3 — Une durée absente est une information

AIME ne fabrique jamais trois minutes pour une musique ou huit secondes pour un média inconnu. Une durée inconnue bloque les cues absolus et les crossfades calculés.

Le `silence` est la seule famille pour laquelle la durée est obligatoire dans le contrat.

### I4 — Recherche, identité, lecture, synchronisation et publication sont distinctes

Une recherche peut trouver un résultat que l’utilisateur ne peut pas lire. Une lecture privée n’autorise pas un événement. Une licence du lieu n’autorise pas une synchronisation avec une vidéo. Un embed autorisé ne permet pas une extraction audio.

Chaque capacité obtient son propre état.

### I5 — Les droits, consentements et contrats ne fusionnent pas

Le système ne possède aucun booléen global `authorized`.

Il conserve séparément :

1. droits d’auteur et droits voisins ;
2. licence ou autorité d’usage ;
3. contrat et capacités du fournisseur ;
4. licence ou cadre du lieu ;
5. données personnelles et consentement ;
6. protocoles culturels ou communautaires ;
7. décision contextuelle prise par AIME à un instant donné.

### I6 — Toute permission est contextuelle

`sound.play` ou une action de régie AIME ne constitue pas un entitlement fournisseur. La décision de lecture croise au minimum :

- acteur ;
- Monde et Moment ;
- audience ;
- lieu ;
- territoire et storefront ;
- média ou mapping ;
- capacité fournisseur observée ;
- droits ;
- consentements ;
- état de session.

Les actions `sound.*` sont intégrées au registre universel `Capability`. Leur évaluation utilise un rôle sonore propre à l’espace et reste indépendante du rôle métier affiché dans une application.

L’enforcement possède deux portes obligatoires :

1. un `SoundAuthorizationDirectory` serveur vérifie le principal d’authentification, le résout vers une Card et charge l’espace, l’adhésion, le contexte et les snapshots persistés ;
2. `evaluateCapability` vérifie l’autorisation universelle de cette Card ;
3. `evaluateSoundAction` vérifie ensuite son adhésion active et `actionsByRole` dans l’espace exact, ainsi que les règles de décision et de publication du mode.

Une permission globale ne contourne donc pas une politique locale désactivée.

L’API d’autorisation publique ne reçoit jamais de Card, rôle, membership, niveau de données, vote ou décision provenant directement du corps de requête. Elle reçoit un principal authentifié opaque et des références ; le répertoire serveur exécute `verifyAndResolvePrincipalCard`, résout le contexte de capacité et charge les données persistées. Cette frontière reste indépendante de Clerk ou de tout autre fournisseur d’identité.

Pour `sound.view`, l’adhésion active et le rôle dans l’espace constituent l’autorité de base : un membre d’une mémoire privée rattachée à une Card n’a pas besoin d’un rôle Monde artificiel. Les niveaux `operations` et `moderation` restent limités aux rôles sonores dédiés, tandis que les données financières ou de localisation exacte exigent toujours leur permission spécialisée.

### I7 — Les contributions ne sont pas des décisions

Un vote, une réaction, une majorité ou une suggestion d’AIME reste une contribution. Une décision possède une autorité, un motif éventuel, une politique figée et une révision de Partition.

### I8 — La Partition et la Session ne s’écrasent jamais

Un skip, une panne ou un changement de volume ne modifie pas la Partition. Une modification de Partition ne déplace pas silencieusement une session active.

### I9 — Aucun remplacement sonore silencieux

Si un média devient indisponible, AIME applique seulement un repli approuvé :

- demander à l’opérateur ;
- attendre ;
- passer au prochain élément déjà approuvé ;
- insérer un silence explicite.

AIME ne choisit jamais automatiquement « un morceau proche ».

### I10 — Les fragments sont bornés

Lorsque la durée est connue :

`0 ≤ startMs < endMs ≤ durationMs`

Un fragment source et une fenêtre dans le Moment sont deux dimensions différentes.

### I11 — La publication est une opération propre

Rendre visibles les métadonnées d’un Moment ne publie pas le son, la voix, le fichier, la transcription, les relations privées ou les preuves de droit.

Une projection publique exige un `SoundPublicationRecord` actif, une décision humaine approuvée et une `SoundUsageDecision` active. `evaluateSoundPublication` reçoit seulement les références et attentes du projecteur, charge les objets persistés complets par le répertoire de confiance, puis vérifie ensemble :

- sujet et espace ;
- révision de Partition ;
- fingerprint de la politique active ;
- décision approuvée et autorité qui l’a prise ;
- preuve correspondant à la stratégie de décision ;
- acteur, Monde et audience de la décision d’usage ;
- contexte validé, état actif et expiration.

Un rôle contenant `sound.publish` reste refusé sans ce dossier concordant. Le niveau `public` porté par un objet exprime une audience maximale souhaitée ; il ne constitue jamais à lui seul une publication.

### I12 — Les standards sont des projections

Web Annotation, Media Fragments, IIIF, EBUCore, PROV-O, ActivityStreams et WebVTT peuvent servir à importer, exporter ou présenter. Aucun ne devient le schéma transactionnel primaire.

Ces invariants prolongent la recherche mondiale dans `research/timeline-sonore-mondiale-aime.md` et les écarts observés dans `research/audit-musique-actuelle-aime.md`.

---

## 3. Carte du domaine

```text
Card ─────────────┐
Place ────────────┤
Emotion ──────────┤  relations sémantiques
World ────────────┤
SoundItem ────────┘
    │
    ├── 0..n SoundMediaAsset, chacun relié à cet item
    ├── 0..n SoundProviderMapping
    ├── 0..n SoundRightsStatement
    ├── 0..n SoundConsentStatement
    ├── 0..n SoundSemanticRelation
    └── 0..n SoundMediaBinding ─── 1 Moment

SoundFolder ── memberships ── SoundItem / SoundSequence / SoundFolder
SoundTag ───── tagged items ── SoundItem

SoundSequence ── ordered entries ── SoundItem + optional Binding
       │
       └── belongs to a versioned SoundPartition

SoundCollaborationSpace
    ├── members + scoped roles
    ├── contributions
    ├── decisions
    └── current Partition revision

Approved Partition
    └── generated SoundPlaybackPlan
            └── live SoundPlaybackSession
                    ├── ephemeral PlaybackGrants
                    ├── commands
                    └── append-only PlaybackEvents
```

---

## 4. Contrat commun des éléments sonores

Tous les types partagent `SoundItem` :

| Famille | Sens | Média requis | Durée |
|---|---|---:|---:|
| `music` | œuvre ou enregistrement musical identifié | non | inconnue autorisée |
| `voice` | parole enregistrée ou source vocale | non | inconnue autorisée |
| `message` | message sonore adressé ou narratif | non | inconnue autorisée |
| `ambience` | paysage, atmosphère ou texture sonore | non | inconnue autorisée |
| `silence` | silence intentionnel dans une relation ou séquence | non | obligatoire |
| `live` | performance ou source reçue en direct | non | inconnue autorisée |
| `archive` | document sonore patrimonial ou mémoriel | non | inconnue autorisée |

Le média n’est pas requis parce que l’item peut d’abord être :

- une intention ;
- une œuvre identifiée ;
- une proposition ;
- une archive encore non numérisée ;
- un direct futur ;
- un son devenu indisponible ;
- un silence.

Le contrat commun contient :

- identité AIME ;
- foyer `world` ou `card` ;
- titre et résumé ;
- visibilité ;
- cycle de vie ;
- langue ;
- identifiants externes qualifiés ;
- provenance ;
- dates et version ;
- durée seulement si elle est connue.

### Provenance

La provenance distingue :

- humain ;
- import ;
- intégration ;
- génération ;
- démonstration.

Elle précise qui affirme, d’où vient l’information, quand elle a été observée et avec quelle confiance. Elle ne constitue ni un droit ni un consentement.

### Identifiants

Les identifiants ISRC, ISWC, MBID, EAN ou UPC sont des attributs qualifiés. Chacun précise s’il identifie une œuvre, un enregistrement, une sortie, un épisode ou un flux.

Ils ne remplacent pas l’ID AIME et ne garantissent pas une disponibilité.

---

## 5. Temps, Moments et fragments

### Le binding canonique

`SoundMediaBinding` est l’unique relation temporelle éditable entre un son et un Moment.

Il porte :

- `soundItem`
- `moment`
- rôle narratif
- fragment du son
- ancre dans le Moment
- visibilité et audience
- état brouillon, actif ou retiré
- créateur, version et dates

Les rôles prévus incluent entrée, sortie, premier plan, fond sonore, narration, message, mémoire, ambiance, accessibilité et silence.

### Ancres temporelles

Quatre ancres couvrent les besoins sans inventer un moteur :

1. **début du Moment** avec décalage éventuel ;
2. **fin du Moment** avec décalage éventuel ;
3. **fenêtre interne au Moment** ;
4. **cue opérateur**, lorsque le temps humain prime.

Le Moment possède la date et l’heure du Monde. Le binding possède la position relative du son. La session résout ces deux informations vers son horloge.

### Fragments

Un fragment audio décrit `startMs` et éventuellement `endMs` dans la source. Il ne dit rien du droit de synchronisation ni de la durée pendant laquelle ce fragment sera rendu.

### Effet d’un changement de Moment

Un changement produit d’abord un `SoundPartitionImpact` :

- bindings concernés ;
- séquences concernées ;
- sessions futures ou actives concernées ;
- personnes à prévenir ;
- décisions d’usage invalidées ;
- avertissements ;
- confirmation requise.

La propagation actuelle de la Timeline, fondée sur un aperçu puis une confirmation, fournit une bonne grammaire d’interaction. Elle reste insuffisante pour modifier une session sonore.  
**Référence active :** `artifacts/byaime-onepage/src/lib/timeline-graph.ts:63-122`.

---

## 6. Séquences, dossiers, tags et ordre

### Séquence

Une `SoundSequence` est une Partition éditoriale réutilisable. Elle peut servir à :

- bande sonore ;
- programmation radio ;
- récit ;
- podcast ;
- cérémonie ;
- événement ;
- œuvre ;
- mémoire ;
- répétition.

Elle possède un statut brouillon, en revue, approuvé ou archivé.

### Entrée de séquence

Chaque `SoundSequenceEntry` référence :

- un `SoundItem` ;
- éventuellement son binding à un Moment ;
- une clé de position ;
- un fragment ;
- une transition souhaitée ;
- un gain souhaité ;
- un déclencheur ;
- une intention de synchronisation ;
- une politique d’échec.

Les entrées sont des objets séparés afin que deux contributions n’écrasent pas toute la séquence.

### Position concurrente

`positionKey` est une clé ordonnable et non un simple index entier. L’implémentation choisira une stratégie de fractional indexing ou une structure équivalente. Le contrat ne fige pas cet algorithme.

### Dossiers

Un dossier organise des items, séquences ou sous-dossiers. L’appartenance est un objet séparé :

- un son peut être dans plusieurs dossiers ;
- le déplacement ne modifie pas le son ;
- l’ordre et l’auteur de l’ajout sont conservés ;
- supprimer un dossier ne supprime pas ses sons.

### Tags

Les tags possèdent identité, namespace, alias, hiérarchie et visibilité. Les namespaces prévus couvrent genre, émotion, humeur, thème, activité, culture et technique.

Une émotion peut être :

- un tag léger dans un Monde ;
- une entité `emotion` référencée lorsque sa définition, sa gouvernance ou son histoire doivent être partagées.

### Relations sémantiques

Les relations d’un son peuvent exprimer :

- appartenance à un Monde ;
- présence, voix ou interprétation d’une personne ;
- dédicace ;
- lieu d’enregistrement ;
- émotion évoquée ;
- sujet ;
- création pour un Moment ou une personne ;
- dérivation ;
- citation.

Les relations ont leur propre visibilité et provenance. La relation au Moment reste un `SoundMediaBinding`, pas une relation générique concurrente.

---

## 7. Transitions, volume, déclenchements et synchronisation

Ces paramètres sont des **intentions déclaratives** dans la Partition. Seul un plan de lecture peut confirmer qu’ils sont réalisables.

### Transitions

Le contrat prévoit :

- `cut`
- `gap`
- `fade`
- `crossfade`
- `duck`
- extension personnalisée

Chaque transition peut déclarer durée, courbe et repli. Un crossfade demandé peut être dégradé en cut si les deux sources ou leurs contrats ne permettent pas un contrôle temporel suffisant.

### Matrice indicative

| Source sortante | Source entrante | Crossfade envisageable |
|---|---|---|
| asset local autorisé | asset local autorisé | oui, si durées et droits connus |
| asset local | silence | oui |
| silence | asset local | oui |
| fournisseur contrôlable | même fournisseur contrôlable | selon le contrat réel |
| deux fournisseurs | deux fournisseurs | généralement non |
| deep link externe | toute source | non |
| live | toute source | seulement sous contrôle de régie |

La transition n’est jamais déduite de l’image d’un bouton.

### Volume

Le gain se compose de :

1. intention de base du binding ou de l’entrée ;
2. override de session ;
3. ducking temporaire ;
4. limite de sécurité du moteur.

Les valeurs sont exprimées en dB, avec une cible LUFS facultative. Une mesure de loudness ne devient pas une vérité artistique et ne remplace pas l’opérateur.

### Déclenchements

Les triggers possibles sont :

- opérateur ;
- après l’entrée précédente ;
- horloge de session ;
- signal d’un Moment avec confirmation éventuelle.

Chaque commande future devra être idempotente, attribuée et autorisée. Un simple changement de Timeline ne démarre jamais automatiquement une musique commerciale.

### Niveaux de synchronisation

1. **none** — lien externe, aucune coordination.
2. **coordinated** — même entrée et offset demandés avec dérive tolérée.
3. **device_local** — un moteur local autorisé peut planifier précisément.
4. **media_bound** — son et image/vidéo sont liés seulement si médias, fragments et droits le permettent.

Le contrat décrit ces niveaux sans promettre une synchronisation sample-perfect entre appareils.

---

## 8. Médias, fournisseurs et capacité de lecture

### Média possédé ou contrôlé

`SoundMediaAsset` représente un fichier audio dont AIME connaît :

- Sound Item canonique auquel il appartient ;
- propriétaire ;
- origine ;
- référence de stockage non signée ;
- type MIME ;
- taille, durée et caractéristiques si connues ;
- checksum ;
- original et dérivés ;
- visibilité ;
- rétention.

Le contrat ne contient aucun URL signé ni token.

### Correspondance fournisseur

`SoundProviderMapping` représente une observation :

- fournisseur et identifiant externe ;
- type d’objet externe ;
- titre, contributeurs, version et durée observés ;
- identifiants disponibles ;
- territoire et storefront ;
- confiance ;
- disponibilité ;
- capacités déclarées ;
- date d’observation.

Plusieurs mappings peuvent coexister pour le même son.

### Adaptateur

`SoundProviderAdapter` normalise quatre opérations :

1. `search`
2. `resolve`
3. `assessPlayback`
4. `requestPlaybackGrant`, si le fournisseur le permet

Il ne normalise pas abusivement les politiques. Chaque résultat expose ses capacités effectives et ses raisons.

### Évaluation de lecture

Les états normalisés sont :

- jouable ;
- lien profond uniquement ;
- indisponible ;
- autorisation requise ;
- abonnement requis ;
- territoire inconnu ;
- revue de droits requise.

Une disponibilité observée peut expirer.

### Grant éphémère

Un `SoundPlaybackGrant` est lié à :

- mapping ;
- session ;
- acteur ;
- capacité ;
- appareil éventuel ;
- territoire ;
- émission et expiration ;
- état actif, expiré ou révoqué.

Il ne contient ni token OAuth, ni URL signée durable, ni secret. Ces données restent dans l’implémentation serveur ou le SDK du fournisseur.

---

## 9. Droits, consentements et décisions d’usage

### Rights Statement

Un `SoundRightsStatement` qualifie :

- sujet ;
- catégorie ;
- personne ou Card qui affirme ;
- titulaire éventuel ;
- base de l’affirmation ;
- usages ;
- territoires ;
- audience ;
- contexte ;
- état ;
- validité ;
- preuves ;
- déclaration remplacée.

Les catégories distinguent notamment copyright, droits voisins, performance, licence de lieu, synchronisation, accès aux archives et protocole culturel.

### Consent Statement

Un `SoundConsentStatement` qualifie :

- personne concernée ;
- autorité qui accorde ;
- type d’autorité ;
- usages consentis ;
- audience ;
- territoires ;
- contexte ;
- état ;
- date, expiration et preuve ;
- déclaration remplacée.

Les voix, mineurs, témoignages et traditions peuvent nécessiter une autorité déléguée, collective ou communautaire.

### Provider Policy Observation

Ce troisième objet décrit seulement les capacités et exigences observées d’une plateforme pour un usage donné. Il n’est ni une licence ni un consentement.

### Usage Decision

`SoundUsageDecision` est une conclusion contextuelle :

- sujet ;
- usage ;
- acteur, Monde, Moment, lieu, audience et territoire ;
- droits, consentements et politiques considérés ;
- résultat permis, refusé, inconnu ou à revoir ;
- raisons ;
- date et expiration ;
- état actif, expiré, retiré ou remplacé ;
- version, retrait et déclaration remplacée.

Cette décision est versionnée et révocable. L’interface doit afficher son contexte, jamais seulement « autorisé ».

Les validations utilisables transportent un fingerprint du contexte évalué. Pour une lecture, `SoundExecutionAuthorizer` applique deux contrôles :

1. **préparation du plan** — sujet, usage, acteur, Monde, Moment, lieu, audience, territoire et storefront doivent correspondre à une décision active, permise et non expirée ;
2. **exécution** — les mêmes éléments sont revérifiés avec la session, son état et sa révision.

Une autorisation de lecture n’accepte que `open_external`, `preview`, `play_private`, `play_event`, `broadcast`, `embed` ou `synchronize`. Elle ne peut pas être satisfaite par une décision limitée à `identify` ou `store`.

---

## 10. Quatre modes de collaboration

Les modes décrivent le cadre social. Ils ne modifient pas le contrat du `SoundItem`.

| Mode | Entrée | Contribution | Validation | Visibilité | Contrôle de lecture |
|---|---|---|---|---|---|
| **privé** | propriétaire uniquement | propriétaire ou délégation explicite | propriétaire | privée par défaut | propriétaire |
| **événement** | invitation ou rôle du Monde | participants autorisés | responsables/reviewers | Monde, participants ou audience définie | opérateur de session |
| **collaboratif** | membres approuvés ou demande | propositions, commentaires, réactions, votes, objections | règle déclarée et décision humaine | selon chaque objet | opérateur distinct des éditeurs |
| **mondial** | découverte publique, contribution selon politique | propositions publiques possibles | modération + autorité éditoriale | métadonnées publiées explicitement | lecture contextuelle par utilisateur |

Ces règles ne sont pas seulement documentaires : `SoundCollaborationSpace` est une union discriminée. Une politique privée ne peut pas déclarer une visibilité publique ou une entrée ouverte, et un espace mondial exige une publication modérée.

Un espace `event` possède obligatoirement un foyer `world` et un scope non vide de Moments. Il ne peut donc pas devenir un rôle d’événement global ou sans borne.

### Mode privé

- aucun partage implicite ;
- visibilité privée ;
- seule la personne `owner` contribue, même si une entrée `actionsByRole` erronée cite un autre rôle ;
- droits et consentements toujours requis pour publication ;
- une délégation n’accorde pas de pouvoir mondial.

### Mode événement

- espace borné à un Monde et à des Moments ;
- invités et prestataires n’obtiennent que les rôles nécessaires ;
- les propositions n’entrent pas directement dans la régie ;
- l’opérateur contrôle la session sans devenir propriétaire des sons ;
- une licence du lieu ne modifie pas les droits de synchronisation ou de publication.

### Mode collaboratif

- contributions attribuées et auditables ;
- le vote peut être consultatif ou décisionnel selon une politique figée ;
- une objection reste visible après décision ;
- le rejet peut exiger un motif ;
- le droit de commenter ne vaut pas droit de jouer ;
- le droit d’opérer ne vaut pas droit de publier.

Les cinq stratégies de décision possèdent une preuve vérifiable et persistée :

- `owner` — référence du membre propriétaire qui décide ;
- `reviewers` — référence du membre chargé de la revue ;
- `threshold_vote` — le serveur dérive les membres actifs éligibles depuis la politique et le snapshot de révision ; chaque vote persistant doit viser l’espace, la contribution et la révision exacts ; le décideur est lui-même éligible et le nombre d’approbations divisé par le nombre d’éligibles atteint le seuil entre 0 et 1 ;
- `consensus` — le serveur dérive les membres actifs éligibles ; chacun possède une réponse persistée sur le même espace, la même contribution et la même révision, tous approuvent et aucune objection ne subsiste ;
- `external_authority` — la Card qui décide correspond exactement à l’autorité configurée et fournit une référence de document, registre ou attestation.

`actionsByRole` est une borne supplémentaire, jamais un moyen de contourner `contribution`, `decision` ou `publication`.

Dans les politiques `explicit_decision` et `moderated`, l’action `sound.publish` exige le `SoundPublicationRecord`, la `SoundDecision`, le membre qui détenait l’autorité, la `SoundUsageDecision` et le contexte attendu. Ces éléments doivent viser le même sujet, le même espace, la même politique et la révision active.

Ils sont chargés par `SoundAuthorizationDirectory`. Une requête ne peut pas fournir elle-même un faux propriétaire, un vote, un membre éligible ou une décision déjà approuvée.

### Mode mondial

- seules les métadonnées explicitement publiées sont découvrables ;
- fichiers, relations privées, preuves, identités sensibles et états de droits restent protégés ;
- les contributions publiques passent par modération, recours et retrait ;
- la disponibilité et la lecture restent recalculées par utilisateur et territoire ;
- « mondial » ne signifie jamais « libre de droits ».

### Rôles scopés

Les rôles sonores sont :

- owner
- curator
- contributor
- commenter
- reviewer
- moderator
- operator
- viewer

Ils sont propres à un `SoundCollaborationSpace`. Un DJ ou modérateur ne reçoit donc pas de privilèges globaux sur le Monde.

### Cycle de contribution

```text
draft
  → submitted
  → under_review
  → accepted | rejected | withdrawn
  → superseded par une nouvelle contribution
```

Commentaires, réactions, votes, objections et corrections partagent l’attribution, mais pas nécessairement la même politique de décision.

La décision est un objet séparé avec :

- contribution concernée ;
- décideur ;
- résultat ;
- motif ;
- politique figée ;
- preuve d’autorité, de seuil, de consensus ou de mandat ;
- révision de Partition ;
- date.

---

## 11. De la Partition à la Session

### Partition durable

La `SoundPartition` regroupe pour une révision :

- items ;
- séquences ;
- bindings ;
- droits ;
- consentements ;
- décisions approuvées ;
- enregistrements de publication explicites.

Elle décrit ce qui est préparé et validé.

### Génération d’un plan

Le futur planificateur suit un pipeline pur :

```text
Partition approuvée
  → sélectionner une séquence et un contexte
  → résoudre bindings et fragments
  → résoudre les sources disponibles
  → évaluer droits, consentements et politiques
  → vérifier durées, triggers, transitions et replis
  → produire un SoundPlaybackPlan immuable
```

Toute source exécutable du plan porte une autorisation validée au stade `planning`. Les sources indisponibles restent représentables sans autorisation afin d’expliquer l’échec, mais elles ne peuvent pas démarrer.

Le `buildQueue.ts` de référence est réutilisable uniquement pour son idée de pipeline filtre → tri → enrichissement → file. Ses durées inventées et transitions descriptives ne sont pas reprises.  
**Référence :** `artifacts/byaime-onepage/reference/source-zip/lib/buildQueue.ts:74-106,144-167`.

### Plan de lecture

Chaque entrée du plan contient :

- item et binding ;
- source résolue ou raisons d’échec ;
- position ;
- durée fiable ou inconnue ;
- fragment ;
- transition ;
- gain ;
- trigger ;
- sync ;
- politique d’échec.

Le plan est lié à une révision de Partition et peut expirer.

### Session

La session contient :

- Monde, espace, séquence et plan ;
- révision de Partition appliquée ;
- éventuelle révision en attente ;
- hôte ;
- lease de contrôleur ;
- état ;
- audience ;
- horloge ;
- entrée courante ;
- révision de session ;
- dates.

Un lease possède un fencing token. Une commande obsolète ne peut donc pas reprendre le contrôle après expiration.

Avant de produire un grant ou d’exécuter `start`, `resume` ou `seek`, l’autorisation est validée à nouveau au stade `execution` avec référence, état et révision de session. Les autres commandes de régie ne peuvent pas réutiliser cette preuve pour une autre source ou un autre contexte.

### Commandes

Les commandes prévues sont préparer, démarrer, pause, reprendre, seek, passer, arrêter et appliquer une nouvelle révision.

Chaque commande possède :

- acteur ;
- appareil ;
- révision attendue ;
- fencing token ;
- clé d’idempotence ;
- date ;
- cible éventuelle.

### Journal append-only

Les `SoundPlaybackEvent` décrivent les faits réels :

- début, pause, reprise et fin de session ;
- résolution et file ;
- demande et début de lecture ;
- pause, reprise, arrêt, fin et skip ;
- cue ;
- transition et dégradation ;
- grant refusé, expiré ou révoqué ;
- erreur fournisseur ;
- appareil perdu ;
- dérive ;
- override opérateur.

Ils ne réécrivent jamais la Partition. Les vues « état courant », « durée jouée » ou « incidents » sont des projections.

### PlayMode actif

Le `PlayMode` actif reste un parcours visuel de Moments. Il trie les événements reçus et avance toutes les quatre secondes ; il ne reçoit aucun item sonore, source, plan ou session. Il ne doit pas devenir progressivement un moteur audio implicite.  
**Référence :** `artifacts/byaime-onepage/src/components/PlayMode.tsx:6-27`.

---

## 12. Échecs et dégradation

Chaque plan doit représenter explicitement :

- mapping retiré ;
- grant expiré ou révoqué ;
- connexion requise ;
- abonnement requis ;
- restriction territoriale ;
- droit expiré ou contesté ;
- consentement retiré ;
- fichier absent ou corrompu ;
- buffering ;
- rate limit ;
- perte du contrôleur ;
- révision de Partition différente ;
- durée inconnue ;
- transition impossible ;
- dérive trop importante.

### Règles

1. L’échec est visible.
2. L’échec produit un événement de lecture lorsqu’une session existe.
3. Le repli est choisi à l’avance ou par l’opérateur.
4. Un changement de média ne remplace pas le `SoundItem`.
5. Une transition impossible se dégrade selon son fallback.
6. Un retrait de consentement invalide les usages concernés, pas l’existence historique minimale de la décision de retrait.
7. Aucun incident live n’efface le récit ou la décision éditoriale.

---

## 13. Ripple et notifications

Le moteur ne doit pas envoyer lui-même toutes les notifications. Il produit des impacts et des intentions adressables.

### Impact de Partition

Une modification de Moment, binding, item ou séquence calcule :

- objets affectés ;
- sessions affectées ;
- personnes concernées ;
- décisions d’usage invalidées ;
- avertissements ;
- confirmation nécessaire.

### Session active

Si la Partition change pendant une session :

1. enregistrer une révision en attente ;
2. prévenir l’opérateur ;
3. proposer un point sûr ;
4. appliquer sur confirmation ou override ;
5. journaliser la décision.

### Notification Intent

Une intention contient :

- but ;
- destinataire ;
- niveau de données ;
- sujet ;
- codes de raison ;
- clé de déduplication ;
- date.

Les contenus sensibles, preuves, tokens et états privés de droits ne sont pas placés dans la notification.

La tâche existante consacrée aux notifications pourra consommer ces intentions sans imposer son transport au moteur sonore.

---

## 14. Interopérabilité

### Imports possibles

- playlists et catalogues externes ;
- CSV ;
- MusicBrainz et identifiants ouverts ;
- métadonnées d’archives ;
- WebVTT pour transcription et chapitres ;
- annotations ou fragments de médias.

### Exports possibles

- liste éditoriale ;
- cue sheet ;
- annotations de Moment ;
- transcription ;
- journal de session minimisé ;
- paquet d’archive avec provenance ;
- projection ActivityStreams pour une activité publique.

### Règle d’import

Tout import crée :

- une provenance ;
- des objets internes ;
- des mappings externes ;
- des erreurs ou éléments à vérifier.

Il ne copie pas silencieusement l’autorité, la visibilité ou les droits du système source.

---

## 15. Migration depuis la musique actuelle

Le modèle actif `MusicTrack` contient titre, artiste, Moment textuel, statut, notes, provenance, deux mécanismes de lien et un mapping externe unique facultatif.  
**Référence :** `artifacts/byaime-onepage/src/lib/types.ts:121-131`.

### Correspondance de migration

| Champ actuel | Cible universelle | Règle |
|---|---|---|
| `id` | `SoundItem.id` | conserver une table de correspondance déterministe |
| `title` | `SoundItem.title` | conserver même si aucun fournisseur ne répond |
| `artist` | relation ou métadonnée importée | ne pas inventer une Card sans résolution humaine |
| `moment` texte | contribution ou aide au rapprochement | ne pas en faire une deuxième relation |
| `status` | état importé + éventuelle décision | ne pas fabriquer un décideur historique |
| `notes` | résumé ou note de contribution | conserver la provenance |
| `provenance` | `SoundProvenance` | corriger les saisies utilisateur classées `demo` |
| `external` | `SoundProviderMapping` | disponibilité `unknown`, pas un grant |
| `timelineEventIds` | `SoundMediaBinding` | réconcilier avec les relations d’événement |
| relation Timeline `music` | `SoundMediaBinding` | source temporaire prioritaire du graphe actif |

### Réconciliation des deux liens

Pour chaque morceau :

1. collecter `timelineEventIds` ;
2. collecter les `TimelineEvent.relations` correspondantes ;
3. créer un binding lorsque les deux sont cohérents ;
4. créer un binding et une alerte lorsque seulement une direction existe ;
5. signaler tout conflit de cible ;
6. figer la migration ;
7. dériver temporairement la projection legacy depuis le binding ;
8. supprimer ensuite l’écriture legacy.

### Phases incrémentales

#### Phase 0 — Contrats

- types universels partagés ;
- contrat `SoundLegacyMusicCompatibility` à sens unique ;
- aucune modification de lecture ;
- aucune promesse fournisseur.

#### Phase 1 — Identité et recherche

- créer `SoundItem` pour les morceaux manipulés ;
- ajouter les mappings multiples ;
- ajouter recherche et résolution ;
- conserver une projection legacy en lecture pendant la transition.

#### Phase 2 — Bindings canoniques

- migrer les liens ;
- lire la vue Musique depuis les bindings ;
- supprimer la double écriture ;
- rendre les incohérences visibles.

#### Phase 3 — Collaboration

- espaces, rôles scopés ;
- propositions, commentaires et décisions ;
- révisions de Partition par objet.

#### Phase 4 — Médias privés

- assets ;
- droits, consentements et rétention ;
- dérivés et suppression ;
- lecture locale autorisée.

#### Phase 5 — Séquences et plans

- séquences ;
- planification pure ;
- évaluation de capacité ;
- transitions déclaratives et replis.

#### Phase 6 — Sessions

- régie ;
- grants ;
- journal append-only ;
- contrôle et observations d’appareil.

#### Phase 7 — Publication et interopérabilité

- publication modérée ;
- projections publiques ;
- imports et exports ;
- retraits et recours.

---

## 16. Frontière précise de la tâche « Rechercher et écouter de vrais morceaux depuis la Timeline »

Cette tâche peut livrer une valeur réelle sans créer un faux moteur.

### Elle peut implémenter

1. **`SoundItem` de type musique** avec ID AIME stable.
2. **`SoundProviderMapping` multiple** au lieu d’étendre le champ `external` legacy.
3. **Adaptateur serveur** pour recherche et résolution d’un premier fournisseur remplaçable.
4. **Parcours Moment → recherche → comparaison → sélection → sauvegarde du binding.**
5. **États de capacité visibles** : lien profond, extrait, jouable, connexion, abonnement, indisponibilité, territoire inconnu.
6. **Lien profond conforme** quand aucune lecture intégrée n’est disponible.
7. **Extrait ou lecture seulement si l’adaptateur l’autorise réellement.**
8. **Réconciliation du lien Moment ↔ musique** et suppression progressive de la double source.
9. **Permissions d’interface cohérentes avec le serveur.**
10. **Provenance `human`/réelle** pour les saisies utilisateur.
11. **Tests** de non-divergence, permission, indisponibilité, conflit et survie des métadonnées après disparition du mapping.
12. **Prévalidation contextuelle** des actions `open_external`, `preview` ou `play_private` réellement offertes.
13. **Résolution serveur du principal et des memberships** avant toute action sonore ; aucun rôle fournisseur ou AIME n’est accepté depuis le client.

La première étape d’implémentation utilise `SoundLegacyMusicCompatibility` :

- l’import transforme les deux formes de lien legacy en bindings et problèmes à revoir ;
- la projection de compatibilité legacy est marquée `readOnly: true` ;
- aucune écriture utilisateur ne repart du modèle legacy vers le nouveau domaine ;
- la vue existante peut lire cette projection pendant que les nouvelles écritures deviennent canoniques.

### Elle ne doit pas implémenter

- ID fournisseur comme identité du son ;
- URL arbitraire présenté comme lecteur ;
- iframe/autoplay générique ;
- token ou grant durable dans le projet ;
- `new Audio` comme architecture ;
- file live ;
- crossfade ;
- gain de régie ;
- synchronisation multi-appareils ;
- auto-trigger ;
- upload audio sans droits et consentements ;
- synchronisation image/son ;
- journal de session partiel ;
- réutilisation de `PlayMode` comme lecteur sonore ;
- transplantation directe de la MusicBox Supabase.

### Contrat de sortie attendu

À la fin de cette tranche, AIME sait dire honnêtement :

- « ce son est identifié » ;
- « il est lié à ce Moment » ;
- « voici ses sources connues » ;
- « dans ce contexte, vous pouvez l’ouvrir, écouter un extrait, le lire, ou pas ».

AIME ne prétend pas encore :

- orchestrer une cérémonie ;
- enchaîner plusieurs sources ;
- diffuser légalement dans un lieu ;
- synchroniser une vidéo ;
- piloter plusieurs appareils.

---

## 17. Décisions d’architecture enregistrées

| ID | Décision | Conséquence |
|---|---|---|
| SOUND-01 | Le Moment est l’ancre temporelle canonique | aucun `momentIds` inverse éditable |
| SOUND-02 | Le `SoundItem` est indépendant du fournisseur | mappings multiples et révocables |
| SOUND-03 | Média, mapping, droits et consentement sont séparés | aucun booléen global d’autorisation |
| SOUND-04 | Les applications utilisent le moteur sans le posséder | pas de modèle musical propre au Mariage |
| SOUND-05 | Partition et Session sont deux agrégats | l’exécution ne réécrit pas l’intention |
| SOUND-06 | Une file est une projection | pas de seconde vérité éditoriale |
| SOUND-07 | Les transitions sont déclaratives | le plan peut les dégrader explicitement |
| SOUND-08 | Les votes ne valent décision que si la politique le dit | autorité et révision enregistrées |
| SOUND-09 | Les grants sont éphémères | aucun token durable dans le World Model |
| SOUND-10 | La publication est explicite et modérée | la visibilité d’un Moment ne publie pas son audio |
| SOUND-11 | Les erreurs ne déclenchent aucun remplacement implicite | repli approuvé ou décision opérateur |
| SOUND-12 | Les standards ouverts servent aux projections | le domaine transactionnel reste AIME |
| SOUND-13 | Toute source exécutable référence une décision d’usage active | une capacité fournisseur seule ne rend jamais un média jouable |
| SOUND-14 | Les quatre modes sont discriminés dans le contrat | une politique privée ou mondiale contradictoire ne compile pas |
| SOUND-15 | La compatibilité legacy est une projection en lecture seule | aucune nouvelle double écriture avant la recherche fournisseur |
| SOUND-16 | La préparation et l’exécution valident séparément le contexte | une preuve pré-session ne commande jamais seule une session |
| SOUND-17 | L’autorisation sonore combine capacité et politique d’espace | un rôle global ne contourne pas `actionsByRole` |
| SOUND-18 | Un événement est borné à un Monde et à des Moments | aucun privilège événementiel sans scope |
| SOUND-19 | Un rôle de publication n’est jamais une preuve de publication | la projection vérifie décision, autorité, usage, sujet, espace, politique et révision |
| SOUND-20 | Les autorisations ne consomment que des identités et snapshots résolus côté serveur | une requête ne peut pas s’attribuer un rôle, un vote ou une décision |

---

## 18. Couverture des critères

- [x] Sound Item, séquences, dossiers, tags, relations et transitions sont définis.
- [x] Musique, voix, message, ambiance, silence, live et archive partagent un contrat extensible.
- [x] Temps, Moments, personnes, lieux, émotions et permissions du World Model sont reliés.
- [x] Les modes privé, événement, collaboratif et mondial ont des règles distinctes.
- [x] Lecture, crossfades, volumes, déclenchements et synchronisations futures sont décrits sans fournisseur unique.
- [x] La migration depuis `MusicTrack` et la frontière sans dette de la prochaine tranche sont explicites.

## Conclusion

La Timeline sonore universelle n’est pas un composant de lecture. C’est une mémoire sonore reliée au Monde, gouvernée par des décisions humaines et capable de produire des partitions puis des sessions sans confondre intention, source, droit et exécution.

L’ordre de construction est donc :

1. identité AIME ;
2. binding canonique au Moment ;
3. mappings fournisseurs ;
4. contribution et décision ;
5. droits et consentements ;
6. séquences ;
7. plans résolus ;
8. sessions et journal ;
9. publication et interopérabilité.

Le Mariage peut commencer à utiliser cette architecture dès la recherche de vrais morceaux, tout en restant un utilisateur du moteur — jamais son propriétaire.
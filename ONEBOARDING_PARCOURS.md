# Le Oneboarding BYAIME — les cinq parcours, étape par étape

Une seule porte, puis **« Question 1 sur 5 » … « Question 5 sur 5 »**, toujours.
Le nombre d'étapes ne change jamais : ce qui change, c'est *le contenu* des
étapes 3, 4 et 5, décidé à la fin de la question 2.

## Légende

| Marque | Sens |
|---|---|
| **NOUVEAU** | L'information n'existait nulle part : elle est demandée et écrite. |
| **DÉJÀ CONNU** | BYAIME la savait avant cette étape : affichée en lecture seule, avec « Modifier », puis validée par « Continuer ». |
| **DEMANDÉ** | Une question est posée à cette étape-ci. |
| **PRÉ-REMPLI** | La réponse est proposée, la personne n'a qu'à confirmer. |
| **CONTEXTUEL** | N'appartient qu'à ce mariage ; jamais reporté sur la carte ni sur les autres mariages. |

Les trois tunnels, dérivés par `resolveOneboardingPlan()`
(`src/lib/oneboarding-plan.ts`) :

| Profil déduit des rôles | Étapes |
|---|---|
| Couple (Marié, Mariée) | personne · rôle · **mariage** · **organisation** · confirmation |
| Professionnel / Wedding planner | personne · rôle · **fonctionnement** · **mariage** · confirmation |
| Invité, famille, entourage | personne · rôle · **mariage** · **présence** · confirmation |
| Aucun rôle dit (repli) | personne · rôle · **mariage** · **présence** · confirmation |

Le profil est **déduit**, jamais stocké. Un marié qui est aussi photographe de
son propre mariage reste d'abord un marié : c'est lui qui ouvre le Monde.

---

## La porte d'entrée — identique pour tout le monde

> **Votre carte BYAIME**
> Votre identité. Une seule fois.
>
> **[ Créer ma carte ]**  *(« Ma carte » si une carte existe déjà)*
> Vous avez déjà un fichier BYAIME ?

Une seule action principale. « Voir ma carte », « Créer un mariage » et « Outils
avancés » ont quitté la porte d'entrée.

---

## Deux règles de l'étape 2, vérifiées par test

**Le rôle n'est jamais imposé.** Une personne qui ne sait pas encore quoi
répondre continue quand même : le plan bascule sur le repli `unknown`
(mariage · présence · confirmation). Ne rien choisir n'écrit rien — l'étape
affiche un état neutre, jamais « Enregistré ». Le serveur l'accepte :
`participationSchema.roles` n'exige pas de longueur minimale.

**La porte du mariage est suggérée, pas imposée.** Le plan déduit de votre rôle
si vous ouvrez un Monde ou si vous en rejoignez un, et l'indique :

> Vu votre rôle, BYAIME s'attend plutôt à ce que vous **créiez un mariage**.
> Vous pouvez choisir l'autre option.

Les deux boutons restent présents et cliquables dans tous les cas.

---

## Parcours 1 — Marié(e)

*Tunnel : personne · rôle · mariage · organisation · confirmation.*

**Question 1 sur 5 — « Commençons par vous »**
Photo, prénom, nom, pseudo, ville, métier affiché, centres d'intérêt, musique.
→ **NOUVEAU** et **DEMANDÉ**. Écrit la carte, et **ne crée aucun mariage**.
La musique reste une expression personnelle et facultative : si la recherche est
inaccessible, « La recherche musicale est momentanément indisponible. » avec
`Réessayer` et `Continuer sans musique`.
En fin d'étape : **« Enregistré — Votre carte est enregistrée. »**

**Question 2 sur 5 — « Votre rôle »**
« Quel est votre rôle dans ce mariage ? » → **Mariée**. **NOUVEAU**, **DEMANDÉ**,
**CONTEXTUEL** — l'étape le dit explicitement : *« Ce choix concerne ce mariage,
pas votre carte. »*
Puis « Quelles activités exercez-vous ? » → rien : le couple n'exerce rien ici.

**Question 3 sur 5 — « Le mariage »**
« Que souhaitez-vous faire ? » → **[ Créer un mariage ]**. **NOUVEAU**,
**DEMANDÉ**. Les cinq questions existantes sont absorbées : date, lieu, invités,
budget (+ devise), ambiance.
Le bouton devient **« Créer ce mariage »** : les réponses structurées partent au
serveur, et l'étape n'avance qu'une fois la création confirmée. Aucune phrase à
reparser n'est utilisée comme transport de données.

**Question 4 sur 5 — « Mon organisation »**
Moments et horaires du couple. **NOUVEAU**, **DEMANDÉ**, **CONTEXTUEL**.
Ce sont les mêmes données que la présence d'un invité, présentées du point de
vue de qui organise.

**Question 5 sur 5 — « Ma Timeline est prête »**
Récapitulatif, puis **[ Ouvrir ma Timeline ]**. Rien n'y est redemandé.

---

## Parcours 2 — Invité

*Tunnel : personne · rôle · mariage · présence · confirmation.*

**Question 1 sur 5** — Identique au parcours 1. **NOUVEAU**, **DEMANDÉ**.
L'identité ne dépend d'aucun mariage : elle servira dans tous les suivants.

**Question 2 sur 5 — « Votre rôle »**
→ **Invité**. **NOUVEAU**, **DEMANDÉ**, **CONTEXTUEL**.
Aucune activité proposée : rien n'est pré-coché.

**Question 3 sur 5 — « Le mariage »**
« Que souhaitez-vous faire ? » → **[ Rejoindre un mariage ]**. **DEMANDÉ**.
Avec le lien reçu, ou parmi les mariages déjà ouverts.

**Question 4 sur 5 — « Ma présence »**
RSVP, moments, arrivée, départ, besoins. **NOUVEAU**, **DEMANDÉ**, **CONTEXTUEL**.
Rien de tout cela ne remonte sur la carte.

**Question 5 sur 5 — « Ma Timeline est prête »** → **[ Ouvrir ma Timeline ]**.

> L'invité n'a jamais vu « Mon fonctionnement » : il n'exerce aucune activité.
> Le repère, lui, est resté « sur 5 » tout du long.

---

## Parcours 3 — Photographe

*Tunnel : personne · rôle · fonctionnement · mariage · confirmation.*

**Question 1 sur 5 — « Commençons par vous »**
Identité. Le champ **« Métier »** affiche « Photographe » sur la carte.
**NOUVEAU**, **DEMANDÉ**. C'est une présentation, pas un réglage professionnel :
le métier affiché reste distinct du fonctionnement détaillé.

**Question 2 sur 5 — « Votre rôle »**
Deux choses distinctes, sur la même étape :
- « Quel est votre rôle dans ce mariage ? » → **Photographe**. **CONTEXTUEL**.
- « Quelles activités exercez-vous ? » → **Photographe**. **NOUVEAU**, écrit sur
  la **carte**, une seule fois, hors de tout mariage.

Cocher l'activité **pré-coche** le rôle et affiche :

> *Pour **ce mariage**, BYAIME vous propose : Photographe. C'est pré-coché pour
> vous éviter de le redire — confirmez, ou décochez.*

**PRÉ-REMPLI**, jamais imposé : une activité personnelle ne devient pas un rôle
permanent dans tous les mariages.

**Question 3 sur 5 — « Mon fonctionnement »**
Durée habituelle, installation, démontage, méthode, besoins techniques.
**NOUVEAU**, **DEMANDÉ**. Écrit sur la carte, réutilisé dans **chacun** des
mariages suivants. L'étape précise que ces réglages sont facultatifs.

**Question 4 sur 5 — « Le mariage »**
« Que souhaitez-vous faire ? » → **[ Rejoindre un mariage ]**. **DEMANDÉ**.
Le rôle choisi en question 2 **pré-remplit** la participation : il n'est jamais
redemandé. L'intervention devient alors disponible — la règle serveur
(une intervention exige que le métier figure parmi les rôles du mariage) reste
la source de vérité et n'a pas été modifiée : le Oneboarding évite seulement la
double saisie.

**Question 5 sur 5 — « Ma Timeline est prête »** → **[ Ouvrir ma Timeline ]**.

---

## Parcours 4 — Photographe + Saxophoniste

*Tunnel identique au parcours 3 — deux activités ne changent pas le parcours.*

**Question 1 sur 5** — Identité. **NOUVEAU**.

**Question 2 sur 5 — « Votre rôle »**
- Rôle **dans ce mariage** → **Photographe** seul. **CONTEXTUEL**.
- Activités **sur la carte** → **Photographe** *et* **Saxophoniste**. **NOUVEAU**.

L'étape le dit : *« Sur votre carte, une seule fois. Vous choisirez ensuite
laquelle vous concerne pour chaque mariage — un photographe peut aussi être
saxophoniste. »*

Les deux métiers étant des rôles du modèle, **les deux** sont proposés pour ce
mariage. La personne décoche Saxophoniste : c'est ce mariage où elle joue, pas
celui-ci. **PRÉ-REMPLI**, puis corrigé — jamais décrété.

**Question 3 sur 5 — « Mon fonctionnement »**
**Deux blocs de paramètres distincts**, un par métier. **NOUVEAU**, **DEMANDÉ**.
L'étape n'est marquée **DÉJÀ CONNUE** que lorsque **toutes** les activités
choisies sont déjà configurées : s'il en manque une seule, le formulaire
s'affiche pour celle-là. Un bloc déjà réglé lors d'un mariage précédent est
repris tel quel, avec « Modifier ».

**Question 4 sur 5 — « Le mariage »** → **[ Rejoindre un mariage ]**.
Seul **Photographe** est enregistré dans la participation : l'intervention
Saxophoniste n'est donc pas ouverte ici, et c'est voulu.

**Question 5 sur 5 — « Ma Timeline est prête »** → **[ Ouvrir ma Timeline ]**.

---

## Parcours 5 — Personne déjà inscrite, rejoignant un deuxième mariage

*Le même parcours, les mêmes cinq questions. Jamais un parcours raccourci.*

**La porte** affiche **[ Ma carte ]** et *« Bonjour Camille — nous ne vous
redemanderons pas qui vous êtes. »*

**Question 1 sur 5 — « Commençons par vous »**
**DÉJÀ CONNU.** Affichée en lecture seule — « Camille Martin · Lille ·
Photographe · jazz » — avec **[ Modifier ]**. Le champ Prénom n'est pas dans le
DOM tant que « Modifier » n'a pas été touché ; quand il l'est, il revient
**PRÉ-REMPLI** avec la valeur enregistrée.
**Le repère reste « Question 1 sur 5 ».** Rien n'est sauté, rien n'est recompté :
c'est la même traversée, pas un parcours reconstruit par connexion.

**Question 2 sur 5 — « Votre rôle »**
**DEMANDÉ**, **CONTEXTUEL.** Le rôle du premier mariage n'est pas reconduit :
il appartenait à ce mariage-là. Si Camille exerce déjà Photographe, l'activité
est **DÉJÀ CONNUE** sur sa carte et n'est pas redemandée ; le rôle, lui, est
posé à neuf — et pré-coché à partir de l'activité, à confirmer.

**Question 3 sur 5 — « Mon fonctionnement »**
**DÉJÀ CONNU** si chaque activité choisie est déjà configurée : récapitulatif en
lecture seule, « Modifier », puis « Continuer ». Sinon l'étape est **DEMANDÉE**
pour le métier qui manque. Les réglages sont réutilisés : c'est tout l'intérêt
de les avoir écrits sur la carte.

**Question 4 sur 5 — « Le mariage »**
**DEMANDÉ.** « Que souhaitez-vous faire ? » → **[ Rejoindre un mariage ]**, puis
le nouveau mariage — par le lien reçu, ou parmi ceux déjà ouverts.
C'est cette étape qui enregistre l'association à ce mariage, avec le rôle
confirmé en question 2.

**Question 5 sur 5 — « Ma Timeline est prête »**
Récapitulatif, puis **[ Ouvrir ma Timeline ]**.

> Le tunnel d'un professionnel est *personne · rôle · fonctionnement · mariage ·
> confirmation* : il n'y a **pas** d'étape « Ma présence », qui n'existe que dans
> le tunnel invité/famille/entourage. Les cinq questions restent les cinq
> questions ; c'est leur contenu qui suit le rôle.

Résultat : **une seule saisie d'identité**, **un seul fonctionnement**, et autant
de mariages que nécessaire — sans jamais repasser par « qui êtes-vous ? ».

Quand tout est déjà connu — carte enregistrée, rôle déjà associé à ce mariage,
activité configurée, mariage sélectionné — le plan marque les quatre premières
étapes comme connues (`person* role* functioning* wedding*`) : chacune s'affiche
en lecture seule avec « Modifier », et la cinquième ouvre la Timeline.

---

## Ce qui n'a pas bougé

- **Trois niveaux, jamais quatre** : Ma carte → Mon activité → Ce mariage.
- **Pas de second système de formulaire** : `UniversalCardForm`,
  `ProfessionalProfileEditor`, `RsvpClaimPanel`, les blocs présence/RSVP, la
  création du mariage, les interventions et la musique sont toujours les blocs
  métier ; l'Oneboarding les orchestre.
- **Pas de seconde Timeline.**
- **Un seul moteur, quelle que soit la porte d'entrée.** L'espace privé
  (`PortalOnboarding`) rend `LandingComposer`, qui rend `Oneboarding` : la chaîne
  est verrouillée par test, pour qu'aucun des deux maillons ne dérive un jour
  vers un second parcours.
- **Jamais de succès affiché sur une persistance en échec** : `Enregistré`,
  `Brouillon local` ou `Non enregistré` + `Réessayer`, la saisie conservée, et
  **aucune avancée** d'étape.
- **Aucun nom de concept technique** à l'écran — vérifié par test sur les quatre
  écrans traversés, pas seulement sur les titres d'étapes.

## Langue

Les titres d'étapes vivaient en dur en français dans le plan, alors que le cadre
(« Question 1 of 5 », « Continue ») suivait la locale : en anglais, on obtenait
*« Question 1 of 5 — Commençons par vous »*.

Le plan renvoie désormais des **clés** i18n (`oneboarding.step.*.title` /
`.description`, présentes en `fr` et en `en`) et c'est la vue qui traduit. Le
plan reste ainsi pur et sans dépendance de langue : il décide *quoi* demander et
dans quel ordre, pas *comment cela se lit*.

Un test verrouille la cohérence : en `en`, les cinq titres sont
`Let's start with you · Your role · How I work · The wedding · Your Timeline is
ready`.

**Où s'arrête la correction.** En `en`, l'écran donne maintenant :

> `Back · Question 1 of 5 · Let's start with you · Your BYAIME identity, once…`
> puis, dans le corps de l'étape : « Identité », « Prénom », « Nom », « Métier »…

Le corps de l'étape reste en français, et **c'est la convention existante du
dépôt**, pas une omission de ce chantier : le chrome est traduit, le corps métier
non. Mesuré sur les composants qui utilisent déjà `t()` :

| Composant | appels `t()` | chaînes FR en dur |
|---|---|---|
| `WeddingModulesPanel` | 3 | 43 |
| `UniversalTimeline` | 5 | 18 |
| `PortalControls` | 19 | 10 |
| `ProjectStage` | 85 | 4 |

Ce qui était cassé, c'était l'unité visuelle : « Question 1 **of** 5 » collé à
« Commençons par vous ». C'est corrigé. Internationaliser les libellés de champs
touche les blocs métier eux-mêmes (`UniversalCardForm`, et donc `/ma-carte`) —
vérifié par `grep` sur `git show HEAD:…/UniversalCardForm.tsx`, ils étaient déjà
en dur en français avant ce chantier. C'est un autre périmètre, à décider
séparément.

## Nettoyage fait en route

Trois sorties du plan étaient calculées mais jamais lues — le plan décidait des
choses que l'écran ignorait :

| Sortie | État | Correction |
|---|---|---|
| `suggestedRoles` | calculée, jamais lue | branchée : l'activité pré-coche le rôle, à confirmer |
| `weddingAction` | calculée, 4 tests unitaires, jamais lue | branchée : la porte attendue est signalée « Suggéré » |
| `remainingSteps` | morte partout, jamais testée | supprimée |

Deux autres corrections de la même famille :

- **`StepQuestion`** (70 lignes) était exportée sans aucun appel : supprimée.
- La règle « une activité qui est aussi un rôle peut être proposée » était
  **recopiée** dans le composant au lieu d'appeler `suggestRolesFromActivities`.
  La recopie finit toujours par diverger : le composant appelle maintenant le
  plan, seule source.
- La clé du brouillon de carte (`aime-personal-card-draft-v1`) était **déclarée
  deux fois**, dans `UniversalCardForm` et dans le Oneboarding. Les deux
  écrivaient bien le même brouillon — aucune donnée dupliquée — mais un
  littéral recopié peut dériver. La clé est désormais déclarée une seule fois
  dans `lib/intention-draft.ts`, à côté des autres clés de stockage, et les deux
  composants l'importent. Le test continue d'écrire le littéral en dur : c'est
  justement ce qui attrape une dérive.

Enfin, l'étape 2 **bloquait** qui ne choisissait aucun rôle, ce qui rendait la
branche `unknown` du plan inatteignable. Le blocage est retiré ; le repli
fonctionne et son récapitulatif n'affiche aucune ligne vide (vérifié par test).

## État de vérification

- `corepack pnpm run test` → **domaine 33, api-server 86, frontend 76 fichiers /
  514 tests**, tous verts.
- `typecheck:libs`, `typecheck` (artefact), `typecheck:e2e` → propres.
- `pnpm run build` → **réussit**.
- Les tests e2e Playwright ont été **réécrits** pour le nouveau parcours et
  passent le typecheck, mais **n'ont pas pu être exécutés ici** : aucun binaire
  navigateur n'est présent, `apt` est inaccessible (lock refusé) et le
  téléchargement depuis `cdn.playwright.dev` est bloqué. Trois voies tentées,
  aucune ouverte — à lancer chez vous avec `AIME_CARD_PREVIEW_TEST=1`.
- Rendu mobile : aucun contrôle de mise en page automatisé possible sans
  navigateur. Audit statique fait — aucune largeur fixe dangereuse, aucun
  `flex-row` non wrappé. Les trois cibles tactiles sous 44 px (Retour, Passer,
  devise) proviennent textuellement du `LandingComposer` d'origine et n'ont donc
  pas été restylées.

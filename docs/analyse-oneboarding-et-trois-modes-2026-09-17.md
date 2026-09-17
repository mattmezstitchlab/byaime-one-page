# BYAIME — le Oneboarding, le panneau « + » et les trois modes

**17 septembre 2026 · Analyse, puis corrections : les 7 points du § 6 sont appliqués**
(état vérifié : 74 fichiers de tests, 548 tests verts — voir § 7)

## Réponse courte

**Oui — le site est compris, et les trois gênes signalées sont réelles.** Elles ont été
reproduites en exécutant le vrai code (vrai store, vrais schémas du serveur, vraie
`ProjectStage`, vrai `AimePanel`), pas déduites à la lecture.

Les trois défauts ne sont pas trois bugs isolés : ils viennent d'un **même angle mort**.
Le site sait déjà beaucoup de choses (quel Monde est ouvert, quelle phase est active, quel
visuel appartient au Monde) mais il ne les **dit** ni au Oneboarding, ni au menu du
panneau. Chacun travaille sur une copie locale et vide de la vérité :

| Ce que BYAIME sait | Qui l'ignore aujourd'hui | Conséquence vue à l'écran |
|---|---|---|
| Le Monde actif, le rôle déjà enregistré dans ce mariage | le Oneboarding (`weddingRoles`, `projectId`, `hasSavedContext` restent vides) | à l'étape mariage, « Rejoindre » est suggéré au propriétaire de son propre mariage |
| La phase active (Avant / Jour J / Après) | `panel-navigation.ts` (`getAimePanelMenu` ne la reçoit pas) | la colonne du panneau est identique dans les trois modes |
| Le visuel est celui du Monde, pas d'un mode | l'écran (`heroVisual` unique, bouton identique) | « Choisir un visuel » en Avant change aussi le Jour J et l'Après |

Preuves d'exécution : voir **§ Preuves** en fin de document (les tests de reproduction
n'ont pas été committés — ils décrivent le comportement fautif et doivent devenir rouges
puis verts au moment de la correction).

**Corrections** : les sept points sont appliqués dans l'ordre du § 6, chacun verrouillé par
un test qui était rouge avant. Tableau de suivi en **§ 7**.

---

## 1. Ce que le site est (pour vérifier que la lecture est la bonne)

- **Trois niveaux, jamais quatre** : *Ma carte* (identité, une seule fois) → *Mon activité*
  (fonctionnement d'un métier, hors de tout mariage) → *Ce mariage* (le rôle, la présence,
  les horaires — contextuels, jamais recopiés sur la carte).
- **Un seul parcours d'entrée** : `Oneboarding` (`components/oneboarding/Oneboarding.tsx`),
  toujours **cinq questions**, avec trois tunnels dérivés par `resolveOneboardingPlan()`
  (`lib/oneboarding-plan.ts`) : couple = personne · rôle · **mariage** · organisation ·
  confirmation ; professionnel/planner = personne · rôle · fonctionnement · **mariage** ·
  confirmation ; invité/famille/rôle non dit = personne · rôle · **mariage** · présence ·
  confirmation. Le profil est **déduit des rôles**, jamais stocké.
- **Un seul Monde, trois modes** : Avant / Le Jour J / Après (`WORLD_PHASE_IDS`). Le mode
  décide de ce qu'on regarde : une tête de mode (`AvantOverview` — tâches, prestataires,
  argent ; `DayRunTimeline` — la régie horaire du Jour J ; `ApresOverview` — souvenirs,
  images, remerciements), les Moments filtrés, et le libellé du programme
  (« Le programme » / « Le direct » / « Le replay ») dans `getWeddingRailItems()`.
  Le mode est **déduit de la date pivot** (`getInitialWorldPhase`) : même jour → Jour J,
  futur → Avant, passé → Après.
- **Une seule porte privée** : l'orbe « + » ouvre le **Panneau AIME**
  (`components/AimePanel.tsx`) — une colonne (Le Monde, Les outils, Aide) et une zone de
  contenu qui réutilise les modules existants. Le menu vient d'une source unique,
  `lib/panel-navigation.ts`. Le cockpit (`ProjectStage`) ne garde que le contenu : héro,
  bandeau participants, Timeline.
- **Les rôles filtrent tout** (`getWeddingCapabilities`) : propriétaire/planner voient tout,
  famille sans budget ni contrats, invité (viewer) la Timeline, les personnes, le pilotage,
  la musique. Les sept dossiers (`lib/wedding-folders.ts`) restent les mêmes pour tout le
  monde, avec leur compteur honnête.
- **Rien n'est perdu** : local-first (l'aperçu marche sans serveur), FR/EN, et la règle
  « jamais de succès affiché sur une persistance en échec » tenue par `SaveNoticeBanner`.

C'est cette architecture que les trois gênes contredisent : elles font travailler une
partie de l'écran **sans** l'information dont l'autre partie dispose déjà.

---

## 2. Oneboarding — le choix d'un mariage

C'est le point le plus grave, et il se décompose en quatre défauts distincts. Les quatre
sont reproductibles ; deux ont été vus **rouges** dans la reproduction, deux sont des
comportements exacts mais incohérents avec le contrat écrit du parcours.

### 2.1 Le Oneboarding ne lit pas ce que BYAIME sait déjà (cause principale)

`Oneboarding` tient trois états locaux qu'il n'initialise jamais depuis le Monde actif :

| État (`Oneboarding.tsx`) | Initialisé à | Devrait refléter |
|---|---|---|
| `weddingRoles` (l. 144) | `[]` | le rôle déjà enregistré dans ce mariage |
| `projectId` (l. 155) | `""` | le Monde actif (`useProject().project`) |
| `hasSavedContext` (l. 157) | `false` | la participation déjà enregistrée |

Or `resolveOneboardingPlan()` déduit **tout** de ces valeurs
(`planContext`, l. 251) : `detectProfile(weddingRoles)`, donc le tunnel, donc
`weddingAction` (« créer » pour un couple, « rejoindre » sinon).

**Conséquence mesurée (propriétaire déjà installé, carte et participation enregistrées,
rôle « Mariée ») :**

```
étape 2 (rôle)      : « Quel est votre rôle dans ce mariage ? » — liste vide, rien de pré-rempli
étape 3 (mariage)   : « Que souhaitez-vous faire ?
                       Vu votre rôle, BYAIME s'attend plutôt à ce que vous REJOIGNIEZ un mariage. »
                       créer suggéré ? false | rejoindre suggéré ? true
```

Une mariée à qui BYAIME propose de **rejoindre** un mariage, alors qu'elle possède le sien,
et à qui la porte « Créer un mariage » est offerte au même niveau — donc le risque de créer
un **second mariage** en double. Le tunnel bascule aussi en tunnel invité : l'étape 4
devient « Ma présence » au lieu de « Mon organisation ».

Deux autres contrats écrits deviennent inatteignables pour la même raison :
« quand tout est déjà connu — carte enregistrée, rôle déjà associé à ce mariage, mariage
sélectionné — le plan marque les quatre premières étapes comme connues »
(`ONEBOARDING_PARCOURS.md`) : `participationSaved` n'est mis à `true` que par
`selectWedding()` (action de l'utilisateur) et `weddingRoles` que par le sélecteur de
l'étape 2 — donc une étape « déjà connue » ne peut jamais l'être au montage.

### 2.2 « Rejoindre avec une invitation » ne fait rien quand on n'est pas connecté

`if (joining && signedIn && version)` (l. 655) garde tout le panneau d'invitation derrière
**deux** conditions non dites : être connecté **et** avoir une carte enregistrée. Sur
l'accueil public (`signedIn` est faux pour un visiteur), le bouton
`oneboarding-wedding-invite` (l. 1286) met simplement `joining = true` : rien ne s'affiche,
aucun message, aucun changement. **Un bouton mort** — pour un visiteur qui a reçu un lien
d'invitation, c'est le seul chemin qui pourrait fonctionner.

### 2.3 Le panneau d'invitation remplace tout le parcours

Quand il s'ouvre (utilisateur connecté), `RsvpClaimPanel` est rendu **à la place** du
cadre `StepFlow` (même `return` anticipé, l. 655) : le repère « Question 3 sur 5 », le titre
de l'étape et le bouton « Continuer » disparaissent. Mesuré :
`repère encore là ? false | cadre StepFlow ? false`.

L'invitation est une **modalité de l'étape mariage**, pas une sixième page : la sortir du
cadre fait perdre à la personne où elle en est — exactement ce que le parcours à cinq
questions cherche à éviter.

### 2.4 La fin du parcours parle à contretemps

- Un invité qui rejoint le mariage de quelqu'un d'autre lit, au dernier bouton :
  **« Ouvrir mon mariage »** (l. 721, libellé unique pour toute la branche `confirm`).
- « Changer de mariage » (l. 1059) ne revient pas au **choix** mais aux **deux portes**
  (« Créer / Rejoindre ») : la personne doit recliquer « Rejoindre », puis rechoisir.

---

## 3. Le panneau « + » et les trois modes

### 3.1 La colonne est identique dans les trois modes (cause principale)

`getAimePanelMenu()` (`lib/panel-navigation.ts`, l. 87) prend `role`, `locale`, `project`,
`canEdit` — **pas la phase**. `AimePanel` la lui transmet telle quelle (l. 164). Résultat
mesuré : les trois colonnes (Avant, Jour J, Après) sont **identiques au caractère**.

Pendant ce temps, le modèle de navigation **sait déjà** faire la différence :
`getWeddingRailItems(phase)` renomme Le programme en « Le direct » (Jour J) et « Le replay »
(Après), `getWeddingNavigation(phase)` donne Régie + Infos pratiques en Jour J, Messages en
Avant, rien en Après, et `isWeddingPanelAvailable()` sait quels panneaux existent dans
quel mode. Le panneau n'utilise aucune de ces trois fonctions.

### 3.2 Changer de mode peut fermer toute la fenêtre

Si on ouvre un panneau qui n'existe que dans le mode quitté — « Programme Jour J »
(`dayof`) — puis qu'on choisit « Avant », alors :

1. `ProjectStage` constate que le panneau n'est plus disponible pour la phase courante
   (`ProjectStage.tsx`, l. 243) et appelle `closePresentedPanel()` ;
2. celui-ci émet `aime:close-world-panel` (l. 175) ;
3. `AimePanel` écoute cet événement et **ferme la fenêtre entière**
   (`AimePanel.tsx`, l. 130 → `close("external")`).

Mesuré : `apres retour en Avant — panneau encore ouvert ? false`. Autrement dit : on
demande à changer de mode **depuis le menu**, et on se fait sortir du menu.

### 3.3 Le menu ne dit pas à quel mode appartient une entrée — et change de mode en silence

Les entrées de tous les modes cohabitent : « Programme Jour J », « Infos pratiques »
(Jour J), « Vue d'ensemble » (Avant), « Musique », etc. Un clic sur « Programme Jour J »
alors qu'on est en Avant bascule **silencieusement** le Monde en Jour J (`openPanelSafely`
→ `findPhaseForPanel`). Mesuré :
`pastilles avant : AvantJourJAprès | après : AvantJourJAprès | active : world-phase-pendant
| régie visible ? true`.

Le voyage est correct techniquement ; il est incompréhensible pour qui regarde : rien dans
la colonne n'annonçait « cette entrée est du Jour J ».

---

## 4. Les visuels

### 4.1 Un seul visuel pour les trois modes

`WorldProject.heroVisual` (`lib/types.ts`, l. 342) est **unique**. Le héro
(`ProjectStage.tsx`, l. 545-562) ne change que son texte selon la phase
(`world.hero.avant.*`, `world.hero.pendant.*`, `world.hero.apres.*`) : le visuel, lui, est
le même dans les trois modes, et le bouton s'appelle « Choisir un visuel » /
« Changer le visuel » dans les trois. Mesuré :

```
visuel Avant : /images/wedding/wedding-ceremony.jpg
visuel Après : /images/wedding/wedding-ceremony.jpg
```

C'est la gêne exacte signalée : « sur chaque mode on a le bouton choisir visuel, mais il
reste sur les 3 modes ». Ce n'est pas un défaut d'implémentation (le comportement est
cohérent avec le modèle) mais **un défaut de contrat** : soit le visuel est celui du Monde
et le bouton doit le dire, soit on veut un visuel par mode et il manque la donnée.

### 4.2 Deux éditeurs pour la même donnée, deux capacités

| Écran | Composant | Vignettes du Monde (`choices`) |
|---|---|---|
| Héro → « Choisir le visuel » | `VisualImportControl` (`ProjectStage.tsx`, l. 851) | **oui** (`WORLD_VISUAL_CHOICES`) |
| Panneau → « Modifier l'ouverture » | `VisualImportControl` (`PortalContent.tsx`, l. 491) | oui |
| Tiroir d'un Moment → « Visuel du Moment » | `VisualImportControl` (`UniversalTimeline.tsx`, l. 450) | **non** |

Les deux premiers écrivent la **même** clé (`project.heroVisual`) depuis deux endroits
différents — l'un dans le cockpit, l'autre dans le panneau. Le troisième, celui qui règle
le visuel d'un Moment, n'offre pas les vignettes du Monde : trois entrées, deux
comportements, une seule donnée de Monde.

Et dans la Timeline verticale, chaque scène porte ses **actions contextuelles** par-dessus
le visuel (`MomentFacts` + `MomentActions`, `lib/moment-context.ts` : 21 gestes possibles
selon le Moment, la phase, le rôle) : ce sont ces boutons « sur les visuels ». Ils sont
légitimes — mais ils ne disent pas, eux non plus, à quel mode ils appartiennent quand ils
ouvrent un panneau d'un autre mode (même mécanique que § 3.3).

---

## 5. Ce qui manque : la clarification entre les trois modes

Aujourd'hui, les trois modes ne diffèrent que par quatre choses, toutes discrètes :
la pastille active, le texte du héro, les Moments affichés, la tête de mode. **Rien ne
dit ce que chaque mode sert, ni ce qui change quand on en change.** Ni sur l'accueil — où
les trois temps sont pourtant racontés — ni dans le Monde, ni dans le panneau.

Proposition (à valider avant de coder) :

**A. Nommer le mode et son intention, partout où on le choisit.**
`Mode Avant — vous préparez` · `Mode Le Jour J — vous exécutez` · `Mode Après — vous
rassemblez`. Une phrase par mode, en français simple, dans le héro **et** en tête de la
colonne du panneau. Les trois pastilles restent l'unique sélecteur.

**B. Faire suivre le menu, en réutilisant ce qui existe déjà.**
`getAimePanelMenu({ phase, ... })` s'appuie sur `getWeddingRailItems(phase)` et
`getWeddingNavigation(phase)` — déjà écrits, déjà testés. Le programme devient « Le direct »
/ « Le replay » selon le mode ; une entrée propre à un autre mode porte **sa pastille de
mode** (« Programme Jour J · Jour J ») et annonce la bascule au lieu de la faire en silence ;
le changement de mode ne ferme jamais la fenêtre (le panneau se vide ou suit vers
l'équivalent, il ne se referme pas).

**C. Trancher le visuel, une fois.**
*Option 1 (la plus simple)* : un visuel de Monde, assumé — le bouton s'appelle « Visuel du
Monde (les 3 modes) » et la phrase d'aide le dit. *Option 2* : un visuel par mode
(`heroVisuals: { avant, pendant, apres }`, repli sur `heroVisual` existant, migration
douce — aucune donnée cassée), et le bouton devient « Visuel du mode Avant ». Dans les deux
cas : **un seul éditeur** pour le héro, et les vignettes du Monde ajoutées au tiroir du
Moment.

**D. Vérifier par des tests qui échouent aujourd'hui** (les reproductions de ce rapport,
retournées en vert) : colonne différente selon le mode, bascule de mode qui ne ferme pas le
panneau, invitation accessible sans compte, suggestion de tunnel correcte pour un
propriétaire, bouton final qui dit « Rejoindre » quand on rejoint.

---

## 6. Plan de correction proposé (ordre d'impact)

| # | Correction | Fichiers | Risque |
|---|---|---|---|
| 1 | **Nourrir le Oneboarding avec le Monde actif** : rôle du mariage, mariage sélectionné et participation lus à l'ouverture (store + `cardParticipants`, comme `selectWedding` le fait déjà à la demande). Un propriétaire ne se voit plus proposer « Rejoindre », et ne peut plus créer un doublon par inadvertance. | `oneboarding/Oneboarding.tsx`, `store/project-store.tsx` | moyen (touche le plan) |
| 2 | **Invitation accessible** : ouvrir le panneau quel que soit l'état de connexion ; s'il faut un compte, le dire en une phrase et proposer la connexion (le `RsvpClaimPanel` sait déjà gérer ses erreurs). | `Oneboarding.tsx` l. 655 / 1286 | faible |
| 3 | **Garder le cadre des 5 questions** : rendu du panneau d'invitation **à l'intérieur** de l'étape mariage, repère et « Retour » conservés. | `Oneboarding.tsx` | faible |
| 4 | **Menu du panneau conscient du mode** (§ 5.B) et **bascule qui ne ferme pas la fenêtre** (l. 243 / 130). | `panel-navigation.ts`, `AimePanel.tsx`, `ProjectStage.tsx` | moyen |
| 5 | **Clarification des modes** (§ 5.A) : eyebrow + phrase par mode, dans le héro et la colonne ; FR/EN (dictionnaire existant). | `ProjectStage.tsx`, `AimePanel.tsx`, `i18n-dictionary.ts` | faible |
| 6 | **Visuel** (§ 5.C) : libellé honnête, un seul éditeur, vignettes dans le tiroir du Moment — ou visuel par mode si l'option 2 est retenue. | `ProjectStage.tsx`, `PortalContent.tsx`, `UniversalTimeline.tsx`, `types.ts` | faible (option 1) / moyen (option 2) |
| 7 | **Bouton final** : « Ouvrir ma Timeline » / « Rejoindre ce mariage » selon le cas ; « Changer de mariage » revient au **choix**, pas aux deux portes. | `Oneboarding.tsx` | faible |

Invariants à tenir : un seul parcours (cinq questions, toujours) ; un seul panneau ; Ma
carte → Mon activité → Ce mariage ; jamais de succès affiché sur une persistance en échec ;
FR/EN ; aucune donnée nouvelle côté serveur pour les points 1 à 5 et 7.

---

## Preuves

Reproductions exécutées avec `corepack pnpm vitest run` sur ce dépôt
(`artifacts/byaime-onepage`) : le vrai `ProjectProvider`, le vrai `ProjectStage`, le vrai
`AimePanel`, et une API simulée qui valide avec les **vrais schémas** du serveur
(`api-server/src/lib/universalCard`), comme `oneboarding-real-flow.test.tsx`. Ces deux
fichiers de reproduction ont été retirés du dépôt après mesure (ils décrivent le
comportement fautif).

```
REPRO 1 — non connecté, « Rejoindre avec une invitation »
  × devrait ouvrir le panneau d'invitation
    AssertionError: aucun panneau d'invitation après le clic: expected null not to be null

REPRO 4 — connecté, catalogue vide
  ✓ l'invitation s'ouvre (mais) :
    repère encore là ? false | cadre StepFlow ? false

REPRO 5 — la fin du parcours pour un invité
  × le bouton final et le récapitulatif doivent parler du mariage rejoint
    AssertionError: expected 'Ouvrir mon mariage' not to contain 'Ouvrir mon mariage'
    après « Changer de mariage » : autre écran

REPRO 6 — propriétaire déjà installé (carte + participation « Mariée » enregistrées)
  étape 2 (rôle) : « Quel est votre rôle dans ce mariage ? » — rien de pré-rempli
  étape 3 (mariage) : « ... BYAIME s'attend plutôt à ce que vous rejoigniez un mariage. »
  créer suggéré ? false | rejoindre suggéré ? true

REPRO — cohérence du menu avec les 3 modes
  × le menu devrait au moins DIRE dans quel mode on est
    AVANT / PENDANT / APRES : colonnes identiques mot pour mot
  × ouvrir un panneau du Jour J puis revenir en Avant
    apres retour en Avant — panneau encore ouvert ? false | contenu : false
  « Programme Jour J » cliqué en mode Avant :
    pastilles avant : AvantJourJAprès | après : AvantJourJAprès | active : world-phase-pendant
    régie visible ? true

REPRO — « Choisir un visuel » change-t-il selon le mode ?
  visuel Avant : /images/wedding/wedding-ceremony.jpg
  visuel Après : /images/wedding/wedding-ceremony.jpg   (le même)
```

**État de la suite avant analyse** : 530 tests frontend verts (74 fichiers) —
`corepack pnpm vitest run`. Aucun test existant ne couvre ces quatre situations :
c'est pour cela que les défauts ont pu vivre jusqu'ici.

**Ce qui n'a pas été vérifié ici** : une session Clerk réelle, le rendu navigateur (les
reproductions sont des montages jsdom, pas des captures), et le rattachement d'une vraie
invitation reçue par e-mail. Ces trois points doivent être confirmés sur le déploiement
avant de considérer les corrections comme terminées.

---

## 7. Corrections appliquées (17/09)

Les sept points du § 6, dans l'ordre. Chacun a été écrit **test d'abord** : le test qui
décrit la correction échoue sur l'ancien code, puis passe.

| # | Correction | Fichiers | Tests qui la verrouillent |
|---|---|---|---|
| 1 | **Le Oneboarding part du Monde actif** : identifiant, rôle et participation lus au montage (`seededWorldRef`), donc plus de « rejoindre » proposé au propriétaire, plus de doublon possible par inadvertance. | `oneboarding/Oneboarding.tsx` | `un propriétaire retrouve son mariage : ni « rejoindre », ni doublon` · `un invité déjà associé retrouve le mariage qu'il a rejoint` · `le mariage du compte est déjà choisi, et la participation part au serveur` |
| 2 | **Invitation accessible sans compte** : le panneau s'ouvre quand même, dit en une phrase qu'un compte est nécessaire et propose la connexion / la création. | `RsvpClaimPanel.tsx`, `Oneboarding.tsx` | `sans compte : le panneau s'ouvre et dit ce qu'il faut` |
| 3 | **Le cadre des cinq questions tient** : l'invitation s'affiche DANS l'étape mariage ; « Question X sur 5 », « Retour » et « Continuer » restent sous les yeux. | `Oneboarding.tsx` | `connecté : l'invitation s'ouvre DANS l'étape, repère et Continuer compris` · `une invitation valide rattache le mariage, sans quitter le parcours` |
| 4 | **Colonne consciente du mode** : `getAimePanelMenu({ phase })` réutilise `getWeddingRailItems` ; le programme devient « Le Jour J, en direct » / « en revue », les entrées propres à un autre mode sont rangées sous « Autres modes » avec leur pastille — et le changement de mode ne referme plus la fenêtre. | `lib/panel-navigation.ts`, `AimePanel.tsx`, `ProjectStage.tsx`, `lib/aime-panel-events.ts` | `la colonne suit le mode : le programme change de nom` · `une entrée d'un autre mode est rangée à part, avec sa pastille` · `ouvrir une entrée d'un autre mode l'annonce, sans fermer la fenêtre` · `changer de mode ne referme jamais la fenêtre` · unités : `le programme suit le mode, et chaque chose rentre chez elle` |
| 5 | **Les trois modes sont nommés et expliqués** : « Mode Avant — vous préparez », « Mode Jour J — vous exécutez », « Mode Après — vous rassemblez », avec une phrase chacun, dans le héro ET en tête de colonne, FR/EN. | `ProjectStage.tsx`, `AimePanel.tsx`, `lib/i18n-dictionary.ts` | `le mode est nommé et expliqué — dans le héro et dans la colonne` |
| 6 | **Un visuel par mode** (`heroVisuals { avant, pendant, apres }`, repli sur `heroVisual` existant) : le bouton devient « Visuel du mode Avant », les deux éditeurs écrivent la même case, et le tiroir d'un Moment propose les vignettes du Monde. | `lib/types.ts`, `lib/project-migration.ts`, `lib/world-visuals.ts`, `ProjectStage.tsx`, `PortalContent.tsx`, `UniversalTimeline.tsx` | `un visuel par mode : changer en Avant ne change pas le Jour J` · `un Monde d'avant garde son visuel dans les trois modes (repli)` · `« Modifier l'ouverture » règle le visuel du MODE courant, pas des trois` · `le tiroir d'un Moment propose les visuels du Monde, comme partout` |
| 7 | **La fin du parcours parle du mariage concerné** : « Rejoindre ce mariage » vs « Ouvrir ma Timeline », et « Changer de mariage » revient au choix (le mode est conservé), plus aux deux portes. | `Oneboarding.tsx` | `un invité qui rejoint lit « Rejoindre ce mariage »` · `un propriétaire lit « Ouvrir ma Timeline »` · `« Changer de mariage » revient au choix, pas aux deux portes` |

### Un défaut trouvé en corrigeant le point 3 (et corrigé)

Le panneau d'invitation posait son propre `<form>` **à l'intérieur** du formulaire de
l'étape. Un `<form>` imbriqué est invalide (React le signale à l'hydratation) et le
« submit » de « Vérifier mon invitation » **remontait au parcours** : au clic, la question
du mariage se déclenchait et affichait « Choisissez d'abord un mariage » — l'erreur vue à
cette étape. Le panneau est maintenant « embarqué » (`embedded`) : un bloc, un bouton, et
rien qui remonte. Verrouillé par l'assertion « aucun formulaire imbriqué » et « l'étape EST
le formulaire du parcours ».

### État vérifié

- `corepack pnpm vitest run` (depuis `artifacts/byaime-onepage`) : **74 fichiers, 548 tests
  verts** (530 avant l'analyse : 18 tests ajoutés, aucun supprimé).
- `corepack pnpm run typecheck` : erreurs **préexistantes et hors périmètre** — `FilTrack`,
  `ProfileFil`, `ProfileFeed`, `BilanPage`, `PublicProfile` et la lib `api-client-react` non
  construite (`TS6305`). Aucun fichier touché par ces corrections n'apparaît.

### Ce qui reste à confirmer sur le déploiement

Comme pour l'analyse : une session Clerk réelle, le rendu navigateur (les tests sont des
montages jsdom) et le rattachement d'une vraie invitation reçue par e-mail.

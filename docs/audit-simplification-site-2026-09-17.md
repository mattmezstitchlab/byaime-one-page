# Audit simplification du site — 17/09/2026

**Critère** : le site doit être compris par des enfants, des seniors et des jeunes mariés.
Pas de jargon, pas de métaphore de développeur, pas plus de 3 chemins de navigation.

**Méthode** : inventaire des 22 routes, détection de code mort par croisement des imports
(frontend 44 000 lignes, ~90 composants, 70 endpoints backend), lecture des écrans clés
(landing, onboarding, cockpit, panneaux, ME, pages publiques), balayage du dictionnaire
i18n (1 188 clés FR/EN) et des chaînes durcies dans les composants.

---

## 1. Ce qu'on peut SUPPRIMER — code mort, impact zéro pour l'utilisateur

### 1.1 Le kit UI shadcn : 53 fichiers sur 54 ne servent à rien (~5 600 lignes + 41 dépendances)

`src/components/ui/` contient le kit de composants shadcn standard. Croisement complet des
imports : **53 des 54 fichiers n'ont aucun importeur** — pas même entre eux dans l'usage.

- Le seul fichier réellement importé : `tooltip.tsx` — et uniquement pour le
  `<TooltipProvider>` de `App.tsx`. Aucun `<Tooltip>` n'existe dans toute l'app : le
  provider est une coquille vide.
- `toast.tsx` + `toaster.tsx` + `hooks/use-toast.ts` forment une chaîne : `App.tsx` monte
  `<Toaster/>`, mais **aucun `toast()` n'est appelé nulle part** → le toaster ne
  s'affichera jamais.
- Gain : ~5 570 lignes de code + **41 dépendances npm** supprimables :
  - 27 paquets `@radix-ui/react-*`, `class-variance-authority`, `cmdk`,
    `embla-carousel-react`, `input-otp`, `next-themes`, `react-day-picker`,
    `react-hook-form`, `react-resizable-panels`, **`recharts`** (le plus lourd),
    `sonner`, `vaul`, `@paper-design/shaders-react`, `@hookform/resolvers`,
    `@tailwindcss/typography` (plugin chargé dans `index.css` mais aucune classe
    `prose` utilisée).
- Risque : nul (vérifié par scan d'imports + les 519 tests frontend n'utilisent aucun de
  ces composants). Gain build/install : significatif.

### 1.2 `components/RoleChoice.tsx` (124 lignes)

Écran de choix du rôle de l'ancienne porte d'entrée, plus importé nulle part — remplacé
par l'étape « rôles » du Oneboarding (menu dépliant). Suppression directe.

### 1.3 Le sous-système backend « AIME local bridge » (~1 000 lignes)

Tout un mécanisme de pont avec une application de bureau qui n'existe pas dans ce dépôt :

- `api-server/src/routes/aime.ts` : ~670 lignes (pairing-token, bridge/pair, heartbeat,
  status, scan, scan-jobs, references, import-jobs, upload-url, finalize) ;
- `lib/db/src/schema/aime.ts` : 5 tables drizzle (~75 lignes, aucun fichier de migration) ;
- `lib/api-spec/openapi.yaml` : ~160 lignes ;
- `lib/api-client-react` (client généré) : ~135 lignes pour 9 endpoints.

**Le frontend web n'appelle aucun de ces endpoints** (scan exhaustif). Pire :
`TODO_FINAL.md` liste en P0 « suppression AIME LOCAL » — l'UI a été retirée, le backend
est resté derrière.
⚠️ Avant suppression : confirmer qu'aucune application de bureau dans un autre dépôt ne
consomme ces endpoints. Sinon : on supprime routes + tables + openapi + client généré.

### 1.4 Le bloc « onboarding 3 étapes » (P6) dans `ProjectStage`

Affiché dès qu'un projet est vide (pas de timeline, pas d'invité, pas de prestataire) —
donc **juste après le Oneboarding**, qui crée le projet sans timeline :

> « Bienvenue dans votre Monde · 3 étapes pour commencer »
> …
> « Tout est local-first : images en dataURL, export .byaime.json, PWA installable.
> Aucun serveur requis. »

- Deuxième onboarding par-dessus le premier (celui qu'on vient de faire, noir, soigné).
- Jargon de développeur (« local-first », « dataURL », « PWA installable ») visible par
  l'utilisateur final.
- Chaîne durcie en français hors i18n (invisible côté EN).
- Supprimer le bloc ; si on veut garder une aide au premier lancement, une seule phrase :
  « Ajoutez votre premier invité, puis votre programme ».

### 1.5 Le lien « Admin » dans la navigation publique de la landing

Visible par **tout visiteur non connecté** (redirige vers `/connexion?returnTo=%2Fadmin`).
La page `/admin` est une trame de repérage des fonctionnalités (rétroplanning) : utile en
interne, inintelligible pour un visiteur qui veut créer son mariage.
Recommandation : retirer de la nav publique ; laisser un accès discret dans le menu ME
(connecté uniquement).

### 1.6 À conserver (pas du code mort, mais des pièges fréquents)

- Les redirects `/agence` et `/monde` → `/` : liens anciens, coûteux zéro, à garder.
- `mockup-sandbox` : source de design, hors build production.
- `LandingShowcase` : maquette non interactive (marketing) — on peut la garder, elle est
  bien isolée (`role="img"`).

---

## 2. Ce qu'on peut NETTOYER — mots, ton, incohérences

### 2.1 La contradiction centrale

La landing promet :

> « Simple pour tous — Des mots clairs, compris par vos enfants comme par vos
> grands-parents. »

Pendant que l'app parle **Monde, Moments, Timeline, Pilotage, Régie, repères, Socle
commun, orbe, graphe, fil, scène**. Les chapitres de la timeline font preuve du contraire :
« 18 à 24 mois avant », « La dernière ligne droite », « Le réveil », « Les préparatifs »,
« La cérémonie », « L'héritage vivant » — c'est clair, c'est beau. C'est **ce** niveau de
langage qu'il faut étendre au reste du produit.

### 2.2 Tableau du jargon (libellés actuels → proposition)

| Aujourd'hui (visibles) | Problème | Propose clair |
|---|---|---|
| **Pilotage** | jargon de production (salle de pilotage) | « Vue d'ensemble » ou « L'organisation » |
| **Régie du Jour J** | jargon spectacle (la régie) | « Le Jour J » / « Jour J, heure par heure » |
| **Timeline / Timeline en direct / Timeline · Replay** | anglicismes | « Le programme », « Le Jour J en cours », « Le Jour J, vue complète » |
| **Socle commun** | abstrait, corporatiste | « Les essentiels » |
| **Graphe de visibilité / Graphe du Monde** (icône œil) | data-viz | « Ce que chacun voit » |
| **Vos repères** (page RSVP) | flou pour un invité | « Infos utiles » |
| **Orbe / « Ouvrir le panneau AIME »** | jargon IA, bouton flottant mystère | bouton « Nouveau » (ou menu nommé) |
| **Fenêtre à pastilles rouge/jaune/vert** (BottomDock) | esthétique Mac de développeur | simple en-tête : titre + description + fermer |
| **Synthèse** | discret mais correct | « Vue d'ensemble » |
| **« wedding architect »** (BilanPage, page publique) | anglais non traduit | « votre wedding planner » ou « votre organisateur » |
| **« local-first, dataURL, PWA »** (bloc P6) | jargon dev | supprimer (voir 1.4) |
| **Aperçu invité** | acceptable | « Voir comme un invité » |
| **Outils du mode** | « mode » = jargon gaming | « Outils de la période » |

Ces libellés vivent dans `lib/i18n-dictionary.ts` (1 188 clés FR/EN) : le nettoyage est
centralisé, un passage par le dictionnaire suffit, pas de chasse dans les composants
(à l'exception des chaînes durcies — 2.3).

### 2.3 Chaînes durcies hors i18n

- `ProjectStage.tsx` : tout le bloc P6 (voir 1.4).
- `BilanPage.tsx` : « Ouverture du bilan », « Ce bilan n'est pas partagé. », « Votre
  wedding architect n'a pas encore ouvert cette page. » — page **publique** en français
  durci alors que le reste est FR/EN. Soit intégrer au dictionnaire, soit trancher FR seul
  (2.4).
- `AdminSommaire.tsx` : entièrement durci FR (« Le rétroplanning », « Hors du Monde »…).

### 2.4 FR/EN : une décision à trancher

1 188 clés × 2 langues = 1 263 lignes de dictionnaire à maintenir pour chaque phrase.
Si la cible est française (jeunes mariés, familles, seniors), **l'EN double la charge
rédactionnelle de chaque futur nettoyage**.
- Option A (recommandée) : FR seul — retirer `en`, le toggle, et le doublon EN dans le
  dictionnaire. ~600 lignes en moins, plus aucune phrase à traduire.
- Option B : garder EN → alors chaque libellé du tableau 2.2 se traduit deux fois.

### 2.5 Liens et éléments externes

- **Footer : dispoo.app** (lien partenaire avec paramètres UTM) — pour un senior qui
  clique : « un autre site, pourquoi ? ». Si le partenariat est voulu : le garder mais
  sous un libellé explicite (« Nos partenaires ») ou le retirer de la landing.
- L'onglet `FR / EN` de la landing : disparaît avec l'option A.

---

## 3. Ce qu'on peut SIMPLIFIER — structure, le vrai sujet de compréhension

### 3.1 L'orbe flottante cache TOUTES les actions (priorité n°1)

Dans le cockpit, l'écran montre un hero + la timeline. **Toutes les actions** — ajouter
une personne, un Moment, un fichier, ouvrir les 7 dossiers, ME, réglages — passent par
**un orbe de 64 px flottante** en bas au centre, ou le raccourci clavier Cmd+K.
Pour un senior : non découvrable, non rassurant, pas de label visible.
Recommandation : un menu **visible et nommé** (les 7 dossiers en constituent la base
naturelle) ; l'orbe reste en bonus (« posez une question »), plus comme seule porte
d'entrée.

### 3.2 Trois modèles de navigation superposés pour les mêmes choses

- (a) **7 « dossiers »** : Invités, Budget, Contrats, Prestataires, Programme, Souvenirs,
  Messages — affichés sur /dossiers, /assistant et dans l'orbe ;
- (b) **items du Monde** par phase — Timeline, Pilotage, Personnes, Prestataires, Tâches,
  Documents, Finances, Musique, Plan de table, Contributions, Remerciements, Souvenirs,
  Film, Lune de miel, Cérémonie, Logistique, Messages, Équipe… (43 libellés dans le
  dictionnaire) ;
- (c) le **« rail »** (Socle commun) + « Outils du mode » dans la sidebar des panneaux.

Trois vocabulaires pour les mêmes panneaux : *Invités* (dossier) = *Personnes* (item) =
*guests* (panneau) = *Pilotage* (rail)… Chaque couche a été ajoutée comme «
simplification » (les commentaires datent des lots P2/P3 du 14/09) mais la superposition
reste.
Recommandation : **un seul modèle** — la liste des 7 dossiers nommés comme navigation
principale visible ; le reste replié sous « Plus » ou par phase.

### 3.3 Boutons de navigation en 9 px

La rangée d'entrées de la phase (top du cockpit) est en `text-[9px] uppercase` :
illisible sur téléphone à distance de bras, hors d'atteinte pour un senior.
Recommandation : 12 px minimum, casse normale (pas de MAJUSCULES).

### 3.4 Deux onboardings, deux écrans « accueil »

Oneboarding (noir, menu dépliant, correct — verrouillé par les tests) → `ProjectStage` →
bloc P6 « 3 étapes » (voir 1.4). Conserver **un seul** ; dans le Monde, remplacer P6 par
une suggestion contextuelle unique (cf. le « world.hero.suggestion » existant, bien
faisé).

### 3.5 Trois écrans qui se ressemblent

- `/assistant` : chat + 7 dossiers + partage de document ;
- `/dossiers` : 7 dossiers ;
- l'orbe (`CommandBar`) : 7 dossiers + partage + ME + réglages + navigation.

Trois réponses à la même question « que faire ? ».
Recommandation : `/assistant` = la **question** (chat seul), `/dossiers` = la
**navigation** (liste nominale), l'orbe = la **recherche intelligente** (pas un menu).

### 3.6 La page `/admin` est la clé de la simplification

Elle fait exactement ce qu'un non-initié a besoin : **une liste plate de tout le produit,
une ligne par fonction, libellé + phrase d'explication, zéro icône, zéro jargon**
(« Rien n'est caché, tout est expliqué. »).
Recommandation : ce layout devient la **navigation par défaut** des nouveaux mariés ;
le Monde visuel (hero, timeline, panneaux) reste l'expérience riche derrière.

### 3.7 « Ma carte » (/ma-carte)

Formulaire de 905 lignes (carte universelle 3 niveaux : identité, présence, profils pro)
posé en route de premier niveau. Le concept « carte » est bon, la longueur est le
problème.
Recommandation : accessible depuis ME (« Modifier ma carte ») et depuis l'import de
carte du Oneboarding — pas en entrée de premier niveau.

### 3.8 Le panneau « Mécanique de fenêtre Mac » (BottomDock)

Pastilles rouge/jaune/vert, « AIME — Le Monde », sidebar 232 px : un écran d'ordinateur
de pro dans une app de mariage. Remplacer par un en-tête simple (titre, description,
fermer, contenu) — le test `data-panel` reste, le dessin change.

---

## 4. Plan d'action recommandé — état d'avancement

### P1 — Suppressions — ✅ FAIT (commit `816d684`, 9 561 lignes supprimées)

1. ✅ 54 fichiers `components/ui/*` + `hooks/use-toast.ts` + `hooks/use-mobile.tsx` +
   `<Toaster/>`/`<TooltipProvider>` dans `App.tsx` + 41 dépendances (`pnpm remove`) +
   la ligne `@plugin "@tailwindcss/typography";` de `src/index.css`.
2. ✅ `components/RoleChoice.tsx`.
3. ✅ Bloc P6 « 3 étapes » dans `ProjectStage.tsx`.
4. ✅ Lien « Admin » retiré de la nav publique — accès « Le guide : tout le site expliqué »
   ajouté dans le menu ME (vue d'ensemble).
5. ✅ AIME local bridge : routes (~850 lignes avec helpers et schémas zod), 5 tables
   `lib/db`, openapi (~300 lignes), client régénéré par orval, `aimeLocalScan.ts` + test,
   `scripts/src/aime-local-bridge.ts`, entrée du script et tables dans `check-db-schema.ts`.
   Confirmation du 17/09 : aucune app de bureau ne l'utilise.

### P2 — Nettoyage — ✅ FAIT (commit `3fc72c8`), deux points en attente de décision

6. ✅ Tableau du jargon 2.2 dans le dictionnaire FR **et** EN + chaînes durcies des
   composants (`DayRunTimeline`, `PlayMode`, `UniversalTimeline`, `VisibilityGraph`) et
   du registry `lib/aime-architecture.ts`. Choix appliqués : *Pilotage → « L'organisation »*,
   *Régie du Jour J → « Le déroulé du Jour J »* (distinct de la phase « Le Jour J »),
   *Timeline → « Le programme »*, *Timeline en direct → « Le Jour J, en direct »*,
   *Timeline · Replay → « Le Jour J, en revue »*, *Socle commun → « Les essentiels »*,
   *Outils du mode → « Outils de la période »*, *Graphe de visibilité → « Ce que chacun voit »*,
   *Synthèse → « Vue d'ensemble »*, *Vos repères → « Infos utiles »*,
   *Ouvrir le panneau AIME → « Ouvrir le menu AIME »*, *Régie & retards → « Horaires & retards »*,
   *Ma Timeline est prête → « Votre mariage est prêt »*.
7. ✅ « wedding architect » → « votre organisateur » (BilanPage, page publique).
   ⏳ `AdminSommaire.tsx` reste en français durci (page privée, à intégrer au dictionnaire
   seulement si l'EN est conservé).
8. ⏳ **Décision FR/EN en attente** — le nettoyage a été fait dans les deux langues pour
   ne rien casser ; si la décision est « FR seul », on retire `en` + toggle dans un
   prochain passage (~600 lignes en moins).
9. ✅ Boutons de navigation 9 px MAJUSCULES → 12 px casse normale : rangée du cockpit
   (`ProjectStage`), sélecteur de période et boutons du hero, page publique invités
   (`ProfileFeed`, `ProfileFil`). Les micro-légendes décoratives (unités du compte à
   rebours, initiales de calendrier) restent en 9 px.
10. ✅ Pastilles Mac → en-tête simple des panneaux (`BottomDock`) : titre du panneau +
    groupe + fermer.
11. ✅ Fait avec 6.

### P3 — Simplification structurelle — ✅ FAIT (commit `c58177d`)

12. ✅ **Un seul modèle de navigation** : la rangée permanente du cockpit (`ProjectStage`)
    affiche désormais **le programme + les sept dossiers nommés** (`getWorldRowItems`),
    dans toutes les périodes et tous les rôles — plus la liste d'items de phase quasi
    vide d'avant. Le menu du haut (`buildWorldMenu`) est aligné : vues + sept dossiers +
    outils sans dossier, avec dédoublonnage par fenêtre+onglet
    (`normalizePanelId` + `pilotageTabFor`) : « L'organisation », « Documents » et
    « Messages » ne reviennent plus sous d'autres noms que leurs dossiers.
    Filtrage par rôle conservé : budget et contrats cachés à famille/invité.
    Verrouillé par `admin-plan.test.ts` (3 tests) et `world-journey.test.tsx` (2 tests).
13. ✅ **L'orbe n'est plus la seule porte d'entrée** : tout l'essentiel est visible et
    nommé dans la rangée ; l'orbe reste en bonus (recherche/commands, Cmd+K).
14. ✅ **Rôle propre à chaque écran** : `/assistant` ne garde que « poser une question »
    + « partager un document » (la grille de dossiers y est retirée, avec une sortie
    nominale vers `/dossiers`) ; `/dossiers` = la navigation ; l'orbe = la recherche.
15. ✅ **Accueil des nouveaux mariés** : un Monde tout juste créé (ni timeline, ni
    invité, ni prestataire) affiche « Commencez par ici » — quatre lignes dans le style
    de la page « Le rétroplanning » (libellé + phrase d'explication, pas d'icône, pas
    de jargon) : Ajoutez vos invités / Posez votre budget / Programmez le Jour J /
    Choisissez vos prestataires. Chacune ouvre le bon dossier. Budget caché aux rôles
    non autorisés. Verrouillé par `world-journey.test.tsx` (dont l'absence de
    « local-first / dataURL / PWA »).

**Bilan des commits** : `816d684` (P1, 97 fichiers, −9 561 lignes), `3fc72c8` (P2,
23 fichiers) et `c58177d` (P3, 8 fichiers). Tests : 33 (domaine) + 80 (api-server) +
**525** (frontend, dont 6 nouveaux sur la navigation et l'accueil) verts, typecheck et
build OK après chaque lot.

### P4 — Le Panneau AIME unique — ✅ FAIT, 3/3 phases (plan `plan-panneau-unique-2026-09-17.md`)

16. 🔁 **Retour au principe d'origine (décision utilisateur, 17/09)** : l'orbe « + »
    est **l'unique porte d'entrée** de l'espace privé. P3 avait au contraire retiré
    cette exclusivité ; l'expérience a montré que le cumul (orbe + menu + rangée +
    icônes = 10 surfaces) rendait la navigation illisible (« on ne sait même pas où
    regarder »). Un seul panneau pour tout le site, fusionné architecturalement
    comme la fenêtre BottomDock (colonne menu de gauche + zone de contenu).
17. ✅ **Phase 1 (squelette unique)** : `AimePanel.tsx` remplace **à la fois**
    `CommandBar` (panneau d'orbe) et `BottomDock` (fenêtre du Monde) ; colonne =
    Le Monde (programme + 7 dossiers, compteurs, filtre par rôle) + Les outils
    (tâches, cérémonie, logistique, équipe, vue d'ensemble, musique, infos
    pratiques, ce que chacun voit, aperçu invité, mini-site) + Aide (question,
    document, créer, mon espace, réglages) ; FR/EN en place ; recherche de colonne ;
    miroir des périodes. `CommandBar.tsx` et `BottomDock.tsx` supprimés. La source
    unique du menu : `lib/panel-navigation.ts` ; le Monde décide, le panneau
    exécute (`lib/aime-panel-events.ts`). 14 tests nouveaux
    (`aime-panel.test.tsx`, `panel-navigation.test.ts`) : **539 tests frontend verts**.
18. ✅ **Phase 2 (navigation absorbée)** : `WorldTopMenu.tsx`, `WorldSearch.tsx`,
    `WeddingFolders.tsx`, `lib/admin-plan.ts` supprimés — le cockpit ne contient
    plus que son contenu (héro, bandeau participants, timeline). `/assistant`,
    `/dossiers` et `/admin` deviennent des pages fines de deep-link qui ouvrent le
    panneau à la section demandée (le chat AIME s'ouvre dans la zone de contenu
    du panneau, item « Poser une question »). Recherche unifiée en tête de
    colonne : **trouver** (Moments → la Timeline), **demander** (AIME), **aller**
    (colonne filtrée) ; l'aperçu invité filtre la colonne. **526 tests frontend
    verts (75 fichiers)**, typecheck et build OK.
19. ✅ **Phase 3 (ME, création, cockpit épuré)** : `PortalControls.tsx`
    (1 198 lg) et `GlobalCreateCenter.tsx` supprimés — leur contenu devient du
    **contenu de panneau** via `PortalContent.tsx` (quatre modes : Créer, Mon
    espace, Réglages du Monde, Modifier l'ouverture). « Mon espace » = profil,
    Ma carte (plus de lien dans l'en-tête), Mes Mondes, préférences (apparence,
    langue), déconnexion et suppression de compte confirmée. « Créer » = les
    gestes dans le panneau, le choix referme sur le cockpit. « Modifier
    l'ouverture » (ex bouton « Éditer » de l'en-tête, si rôle éditant) =
    formulaire héro dans le panneau. L'en-tête mobile ne garde que le logo ;
    les actions de l'assistant (« réglages », « inviter ») ouvrent le panneau
    sur le bon contenu. E2E `aime.spec.ts` réécrite sur le flux orbe →
    panneau. **529 tests frontend verts (74 fichiers)**, typecheck et build OK.
    Dette assumée : le contenu « Mon espace » reste en français durci (à
    traduire en P5).

---

## 5. Ce qu'il ne faut PAS toucher

- Les **chapitres de la timeline** (« La dernière ligne droite », « Le réveil »…) : le
  meilleur français clair du produit.
- Le **Oneboarding** noir avec menus dépliants : verrouillé par 18 tests de flux + 519
  tests frontend au total.
- Le **parcours invité** (RSVP, profil public, bilan) : pages publiques simples,
  autonomes, déjà propres.
- La **PWA** (sw.js + manifest), l'export/import `.byaime.json` : fonctionnel réel, pas
  du jargon affiché (sauf le bloc P6, retiré).
- `mockup-sandbox` : référence de design, hors production.
- Les redirects `/agence`, `/monde` : liens historiques, coût zéro.

---

## Chiffres clés

| Poste | Quantité (vérifiée au moment de la suppression) |
|---|---|
| Fichiers UI morts (`components/ui/*`) | 54 / 54 supprimés (~5 600 lignes) |
| Dépendances npm supprimées | 41 (27 `@radix-ui/*` inclus) |
| Composant mort hors UI | 1 supprimé (`RoleChoice.tsx`, 124 lignes) |
| Backend « AIME local bridge » | ~1 000 lignes supprimées (routes + helpers + zod + db + spec + client + scripts) |
| Bloc P6 (onboarding dupliqué) | ~26 lignes supprimées (jargon dev) |
| Libellés de jargon retravaillés | ~20 familles de clés i18n (FR + EN) + 5 composants durcis + registry |
| Chaînes durcies FR hors i18n restantes | AdminSommaire (privé), BilanPage nettoyée |
| Modèles de navigation superposés | 3 (dossiers / items de phase / rail) — P3 |
| Surfaces de navigation absorbées (P4) | Phase 1 : `CommandBar.tsx` (236 lg) + `BottomDock.tsx` (309 lg). Phase 2 : `WorldTopMenu.tsx` + `WorldSearch.tsx` + `WeddingFolders.tsx` + `admin-plan.ts` (top menu, rangée, loupe). Phase 3 : `PortalControls.tsx` (1 198 lg) + `GlobalCreateCenter.tsx` (90 lg) → le tout dans `AimePanel.tsx` unique |
| Portes d'entrée vers les mêmes 7 dossiers | 3 écrans + l'orbe — P3 |

Voir la section P3 pour le bilan complet des trois lots.

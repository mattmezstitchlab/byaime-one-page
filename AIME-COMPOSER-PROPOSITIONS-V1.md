# AIME-COMPOSER — PROPOSITIONS V1
## Neuf fonctions, trois axes, une seule règle

**Statut** : proposition à faire valider — NOEMA propose, l'humain valide.
**Ancrage** : chaque idée part de ce qui existe déjà dans le dépôt (mesuré ou
spécifié), jamais d'un effet d'annonce. Références : médiathèque transversale
(366 médias, 119 doublons, couverture publiée), diagnostic universel V2
(fusionné : profile.mjs, extract.mjs, pont Tailwind, --baseline), design system
(12 familles QA, contraste forcé au build), boucle NOEMA (36 tests API, un
routeur deux hôtes), `ARCHITECTURE/NOEMA-ACCESSIBILITY-ENGINE-EAA-V1.md`.

---

## AXE A — L'Atelier d'entrée universel

### 1. L'Importeur de chantiers (P1)

Importer un dossier exporté d'ailleurs — Arena, Base44, Manus, v0, bolt,
export Figma, ou un zip quelconque — et produire le **Rapport de chantier** :

- **Profil** : quel moteur, quels écrans, quels fragments (réutilise
  `profile.mjs` et `extract.mjs` du diagnostic V2 — la détection existe déjà) ;
- **Inventaire** : fichiers, médias (empreintes sha → rapprochement
  médiathèque : « cette image existe déjà dans byaime, doublon ×2 »),
  dépendances ;
- **Ce qui manque pour être livrable** : README, .gitignore, scripts de build,
  chemins relatifs, appels localhost, index.html, fonction pour les /api ;
- **Écarts design** : densité par écran, mêmes 12 familles que le système.

Le rapport est un **contrat de couverture** (P1-2 de la doc innovation) :
ce qui a été reçu, ce qui n'a pas été compris, ce qui manque — nommé, jamais
deviné. L'original n'est jamais modifié : l'atelier est une surface d'entrée,
pas une base (le contrat du Bureau universel, déjà appliqué au mode LOCAL de
la médiathèque).

### 2. La Recomposition — préparer pour GitHub et Vercel (P1)

La suite de l'import : écrire dans un dossier `prepared/` **à côté** de
l'original (jamais destructeur) :

- normaliser la structure (assets, pages, functions) ;
- générer les fichiers manquants nommés par le rapport ;
- proposer le branchement du pont Tailwind (les couleurs littérales →
  mapping vers les rôles, accepté par lot — réparation comme proposition,
  jamais automatique) ;
- finir par la **gate post-déploiement** (le smoke qu'on vient de construire
  pour la boucle : écran servi, assets 200, règles qui tiennent sur l'hôte
  réel). « Livrer, c'est prouver. »

### 3. La Navette — le transport entre agents (P1, vécue le 18/09)

Formaliser ce qui vient d'être fait entre deux sessions Arena : tout artefact
de l'atelier peut être **empaqueté en transport vérifiable** (patch +
provenance + URL durable) et récupéré par une autre session, avec un journal
des transferts. Extension naturelle du brief-agent (P1-3) : le brief suit la
pièce, de dépôt en dépôt, de la médiathèque au chantier. La traçabilité des
copies est aussi une exigence RGPD.

---

## AXE B — Accessibilité EAA (le business d'actualité)

### 4. Implémenter le moteur EAA (P1 — la spec existe, statut PROPOSED)

`NOEMA-ACCESSIBILITY-ENGINE-EAA-V1.md` spécifie déjà la bonne architecture :
commencer par l'**applicabilité** (le périmètre EAA, pas un badge simpliste),
séparer applicabilité légale / référence technique / défauts observés,
distinguer preuve automatique et test humain, re-scanner après correction,
garder l'historique. Implémenter par tranches :

1. applicabilité + familles statiques (contraste — déjà forcé au build du
   design system —, FOCUS, HIERARCHY, ICONOGRAPHY) ;
2. **mode rendu** (voir n° 9) pour ALIGNMENT / RESPONSIVE / OVERFLOW ;
3. chemins clavier et sémantique AT : tests déclarés humains, jamais simulés.

### 5. Le rapport EAA lisible (P2)

Chaque écart expliqué en langage clair — pour qui ça compte, pourquoi, par
où commencer (l'ordre de réparation par coût existe déjà dans le diagnostic).
Le concept pédagogique universel appliqué à la conformité : un patron de PME
comprend « un client au clavier ne peut pas passer commande » sans savoir ce
qu'est WCAG.

### 6. La déclaration d'accessibilité (P2, livrable concret)

L'EAA impose une **déclaration publiée** — en France, son absence coûte
25 000 €/an. Presque aucune PME ne sait la produire. L'atelier la génère
**en brouillon** à partir du mesuré (état de conformité, limites connues,
moyens de contact, date, méthode) ; l'humain valide et publie. Jamais de
certification légale automatique — la règle est déjà dans la spec.

### Le contexte, mesuré (2026)

- EAA en vigueur depuis le **28 juin 2025** ; conformité présumée via
  EN 301 549 ⊃ **WCAG 2.1 AA** (passage 2.2 attendu en 2026).
- **Premières actions en justice** : novembre 2025, Tribunal judiciaire de
  Paris — Auchan, Carrefour, E.Leclerc, Picard visés par des associations
  (référé, en cours au 2026-04). En Allemagne, lettres de mise en demeure
  privées dès l'été 2025. L'application est portée par la société civile,
  pas seulement les régulateurs.
- Amendes : France 7 500 €/infraction (15 000 € récidive) + 25 000 €/an sans
  déclaration ; Allemagne jusqu'à 100 000 € ; Espagne/Suède jusqu'à 1 M€.
- Périmètre : toute entreprise vendant à des consommateurs UE, **même hors
  UE**. Seules les microentreprises (< 10 salariés, < 2 M€ CA) sont exemptées
  — le marché, ce sont les PME et les agences qui les servent.

Sources : wayf.ai (2026-07), auditsu.com (2026-04), accessibility.works
(2026-02), equalweb.com (2026-06).

---

## AXE C — Diffusion et pédagogie

### 7. Le diagnostic en CI (P2)

`--baseline` existe : chaque PR peut afficher « 3 nouveaux écarts, 12
corrigés » comme un check GitHub. Gate optionnelle (bloquer ou constater).
C'est le canal de distribution gratuit — chaque dépôt du compte en a besoin,
et les dépôts des autres aussi.

### 8. Le mode « Pourquoi ? » (P2)

Chaque mesure devient cliquable : la règle expliquée en clair, la famille,
l'exemple avant/après. « La technologie disparaît derrière la clarté »
appliqué à l'apprentissage — le design system devient l'école de ceux qui
l'utilisent.

### 9. Le mode rendu (précondition de l'axe B, P1)

Headless browser opt-in (le diagnostic V2 l'a laissé en tranche 2) : mesurer
ALIGNMENT / RESPONSIVE / OVERFLOW sur le vrai DOM, pas seulement le texte.
Sans lui, aucune prétention accessibilité crédible — la limite jsdom est
déjà assumée dans le README.

---

## Anti-périmètre (ce que l'atelier ne devient jamais)

- **Pas un clone de site builder** — l'atelier prépare et répare, il ne
  concurrence pas Wix ; la valeur est la clarté, pas la liberté totale.
- **Jamais de réparation sans validation humaine** — chaque transformation
  est une proposition acceptée, jamais un fait accompli.
- **Jamais de badge « conforme EAA » automatique** — un scan n'est pas une
  certification ; l'atelier mesure et nomme, l'humain (ou l'auditeur
  habilité) décide et signe.
- **Jamais de valeur devinée** — les classes dynamiques non résolues sont
  comptées et publiées (règle déjà gravée dans le diagnostic V2).

## Modèle (à discuter)

Le juge est gratuit (diagnostic, rapport de chantier) ; l'atelier et les
livrables réglementaires sont payants (import/recomposition, rapport EAA
argumenté, déclaration d'accessibilité, historique d'audit) ; la CI pour
équipes est l'abonnement. L'urgence règlementaire ouvre la porte ; la clarté
est le produit qui la fait rester.

## Ordre proposé

1 → 9 → 4 (l'importeur prouve le concept pédagogique ; le mode rendu
débloque l'EAA ; le moteur EAA ouvre le business) ; puis 2, 6, 7, 5, 3, 8.

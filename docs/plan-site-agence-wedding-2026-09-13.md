# Plan de finition — le site de l'agence wedding

> Date : 13 septembre 2026 · Branche : `arena/01a09cad-byaime-one-page` · Commit de référence : `a0b9b20`
> Périmètre : la vitrine `/agence` (« La cerise sur le gâteau — Wedding Architect ») et tout ce qui
> l'entoure pour qu'elle devienne **le site commercial de l'agence** : découverte, SEO, conversion,
> conformité, contenu, mesure.
> Méthode : lecture du code + contrôles réellement exécutés dans ce clone. Chaque constat cite le
> fichier et la ligne.

---

## 0. Ce qui a été exécuté pour cet état des lieux

| Contrôle | Commande | Résultat |
| --- | --- | --- |
| Installation | `corepack pnpm install --frozen-lockfile` | OK (578 paquets) |
| Tests unitaires du front | `pnpm --filter @workspace/byaime-onepage run test` | **50 fichiers / 265 tests OK** (dont `agency-landing.test.tsx`, 5 tests) |
| Typecheck complet | `pnpm run typecheck` | OK (libs, e2e, 4 paquets) |
| Build de production | `pnpm exec vite build` | OK — `AgencyLanding` = **9,15 Ko (2,93 Ko gzip)** |
| Rendu réel de `/agence` | `curl http://localhost:4173/agence` | Renvoie `index.html` : `<title>` = « AIME — Organisez votre mariage sereinement », OG = AIME, **zéro contenu agence dans le HTML** |
| Poids chargé pour la vitrine | lecture du manifeste de build | entrée `index-*.js` 307 Ko (88,8 gzip) + `vendor-react` 186 Ko (58,8) + `vendor-clerk` 93 Ko (23,2) + CSS 180 Ko (26,2) ≈ **170 Ko gzip de JS pour une page marketing** |
| E2E | `e2e/aime.spec.ts`, `playwright.config.ts` | 1 seul scénario, **aucune couverture `/agence`** ; navigateurs Playwright absents de ce clone ; CI conditionnée aux secrets Clerk |
| Documentation | `grep -rn "agence\|cerise" docs/` | **0 occurrence** : la vitrine n'a ni spec, ni roadmap, ni critères d'acceptation écrits |
| Visuels | `identify public/images/agency/*.jpg` | 3 fichiers, **1408 × 768 px**, 163–243 Ko, JPEG seuls |
| Contrastes (WCAG) | calcul `#RRGGBB` sur `#FFFFFF` | voir §2.8 |

**Verdict global** : la base technique est saine (tout est vert), la vitrine existe et son ADN
éditorial est juste. Mais ce n'est aujourd'hui **qu'une page** : elle n'est pas trouvable, pas
indexable, ne capture aucun lead, n'a pas de contenu qui prouve, pas de mentions légales, et son
identité typographique n'est pas réellement chargée. Il manque environ **9,5 jours de travail** pour la partie technique
(**11 à 14 jours** avec le lot 5, qui dépend des éléments à fournir par la fondatrice) pour en faire
un site d'agence terminé. Feuille de route retenue au §6, décisions actées au §5 bis.

---

## 1. Le constat stratégique : deux portes d'entrée qui vendent deux choses

Le commit `a0b9b20` tranche le positionnement : *« le logiciel est l'outil interne du planner ; le
couple ne reçoit que des livrables »*. Le code ne suit pas encore cette décision :

| | Ce qui est en ligne | Ce que dit la décision |
| --- | --- | --- |
| `/` (accueil) | Landing **produit AIME** : compositeur d'intention, `Créer mon espace`, inscription couple (`src/pages/Landing.tsx:59`, `:204-205` CTA `/creation`) | Le couple n'achète pas un logiciel, il achète un planner |
| `/agence` | Vitrine de l'agence (280 lignes, 8 sections) | C'est elle, la porte d'entrée commerciale |
| Lien entre les deux | Le **seul** lien vers la vitrine est le wordmark « AIME » (`Landing.tsx:59`, `PrivateLayout.tsx:26`, `AdminSommaire.tsx:87`). Le pied de page de l'accueil (`Landing.tsx:216-252`) ne contient **aucun** lien « Agence » | La vitrine doit être la page la plus visible du site |
| Sitemap | `public/sitemap.xml` liste `/`, `/conditions`, `/confidentialite` — **pas `/agence`** | Google ne découvre pas la vitrine |

**Conséquence** : un visiteur arrive sur `/`, on lui propose de créer un compte pour un logiciel, et il
n'a quasiment aucune chance de trouver l'agence. Toute la suite du plan dépend de cette décision
(§5, décision D1).

---

## 2. Diagnostic détaillé (13 constats, classés)

### 2.1 La vitrine est introuvable — P0
Preuves : §1. Aucun lien texte, aucune entrée de pied de page, aucune entrée sitemap.

### 2.2 `/agence` n'existe pas pour les moteurs et les réseaux sociaux — P0
- Application mono-page : un seul `index.html` (`artifacts/byaime-onepage/index.html`), servi pour
  toutes les routes (`vercel.json:18-21`).
- `AgencyLanding.tsx` n'appelle **jamais** `useRouteMeta` (aucune occurrence dans le fichier) : le
  `<title>`, la `meta description` et le `canonical` restent ceux d'AIME. Pire, `page-meta.ts:34-38`
  réécrit le canonical vers `/` pour les autres routes — la vitrine n'a donc aucune URL canonique propre.
- Pas de données structurées (`LocalBusiness` / `ProfessionalService` / `FAQPage`) : aucune chance
  d'apparaître en résultat enrichi, ni d'être comprise comme un commerce local.
- `public/og-cover.jpg` est l'image d'AIME : un partage WhatsApp/Instagram de `/agence` montre la
  mauvaise marque, le mauvais titre.
- La vitrine affiche « Paris · New York » (`AgencyLanding.tsx:141-145`) mais il n'existe **aucune**
  version anglaise (le dictionnaire i18n n'est pas utilisé sur cette page : copie française en dur,
  assumée par le commentaire `AgencyLanding.tsx:12-13`).

### 2.3 Zéro conversion mesurable : la vitrine ne capture rien — P0
- Les 3 appels à l'action sont des `mailto:` (`AgencyLanding.tsx:91-95`, `:113-117`, `:256-260`).
  Aucun formulaire, aucun choix de créneau, aucun numéro de téléphone.
- Côté serveur : `grep -rn "lead|contact|agency" artifacts/api-server/src` → **0 route**.
  `lib/api-spec/openapi.yaml` → aucune route publique de contact. `lib/db/src/schema/aime.ts` →
  13 tables, **aucune** pour les demandes entrantes.
- `trackEvent` (`src/lib/analytics.ts:31`) n'est appelé nulle part dans la vitrine : on ne saura
  jamais combien de personnes l'ont vue, scrollée, ou ont cliqué « Prendre rendez-vous ».

Un `mailto:` sur mobile ouvre une appli mail que beaucoup de futurs mariés n'ont pas configurée :
c'est le point de fuite principal du tunnel.

### 2.4 L'identité typographique n'est pas chargée — P1
`AgencyLanding.tsx:23-27` demande `'Didot', 'Bodoni MT', 'Playfair Display', 'Cormorant Garamond',
Georgia, 'Times New Roman'`. Or `index.html:31-34` ne charge que **Plus Jakarta Sans** et **Inter**,
et `--app-font-display` vaut `'Plus Jakarta Sans'` (`index.css:345`). Aucune de ces quatre serifs
n'est installée par défaut hors macOS (Didot) et Windows Office (Bodoni MT).
→ Sur Android, iPhone sans Didot, Windows et Linux, **tous les titres de la vitrine tombent en
Georgia ou Times**. Le « Didot new-yorkais » qui porte toute la direction artistique n'est vu que
par une minorité de visiteurs. Même problème dupliqué dans `BilanPage.tsx:16-20`,
`AdminSommaire.tsx:20-24`, `CoupleReport.tsx`.

### 2.5 Images : qualité, poids et preuve — P1
- 3 JPEG 1408 × 768, affichés en `h-[68dvh] w-full object-cover` (`AgencyLanding.tsx:125-131`) et
  `h-[72dvh]` (`:232-238`) : au-delà de ~1400 px de large (écrans 2K/4K, très courant), l'image est
  **étirée** → floue sur le hero, exactement là où se joue la première impression.
- Aucun `width`/`height` → saut de mise en page (CLS) ; aucun `loading="lazy"` sur la papeterie et
  la cérémonie (sous la ligne de flottaison) ; pas de `srcset`/`sizes`, pas de WebP/AVIF.
- Surtout : ce sont des **visuels générés**, pas des mariages réels. Une vitrine de wedding planner
  vend une preuve ; sans photo de prestation réelle, la page reste un moodboard.

### 2.6 Mobile : plus de navigation du tout — P1
`AgencyLanding.tsx:76-86` : les liens « Méthode » et « Prestations » portent `hidden … sm:block`.
Sous 640 px, l'en-tête ne contient que la marque et « Prendre rendez-vous » — **aucun moyen d'aller
à une section**, et aucun menu. De plus l'en-tête est `absolute` (`:71`) : il disparaît dès le
premier scroll, donc aucun CTA persistant pendant toute la lecture (la page fait ~7 écrans).
Le trafic d'une vitrine de mariage est majoritairement mobile (Instagram → téléphone).

### 2.7 Contrastes sous AA sur le petit texte — P1 (mesuré)
| Élément | Couleur | Contraste sur `#FFFFFF` | AA (4,5:1) |
| --- | --- | --- | --- |
| Numéros d'étape / de prestation (11 px) | `#B4AC9C` (`AgencyLanding.tsx:43`, `:55`) | **2,25:1** | ❌ |
| Eyebrows (11 px majuscules) | `#8A8375` (`:34`) | **3,76:1** | ❌ |
| Texte courant (15 px) | `#6F6A61` (`:29`) | 5,37:1 | ✅ |
| Titres | `#171410` | 18,36:1 | ✅ |

C'est exactement le défaut déjà corrigé ailleurs dans l'app (`docs/incoherences-2026-09-13.md` §3,
règle mémoire `accessible-appearance`). Les deux gris clairs doivent descendre d'un cran.

### 2.8 Une page publique dépend de Clerk — P1
`App.tsx:24-27` puis le garde `if (clerkKeyMissing) return <MissingAuthKey />` (`App.tsx:393-395`) :
**sans `VITE_CLERK_PUBLISHABLE_KEY`, `/agence` affiche « Connexion momentanément indisponible »**.
Une vitrine commerciale ne doit pas pouvoir tomber à cause d'un fournisseur d'authentification.
Au passage, la vitrine charge `vendor-clerk` (93 Ko / 23 Ko gzip) et monte un `ClerkProvider`
(appels réseau tiers) pour une page qui n'a besoin de rien d'autre que de HTML.

### 2.9 Thème par défaut incohérent avec l'app blanche — P2
Décision du 13/09 : « l'app est blanche » (`index.css:349-353`, tokens `:root` en blanc pur). Mais
`index.html:38-43` pose `data-aime-theme="dark"` par défaut au premier chargement, et
`index.css:439-441` applique alors `color-scheme: dark` → contrôles de formulaire natifs, barre de
défilement et sélections système en sombre sur une page 100 % blanche. À basculer sur `light`.

### 2.10 Conformité légale française : le site n'est pas publiable en l'état — P0
- **Pas de mentions légales.** Un site professionnel doit publier (LCEN art. 6 III-1) : raison
  sociale, forme juridique, capital, adresse, téléphone, RCS/SIREN, directeur de publication,
  **hébergeur** (Vercel Inc.). Rien de tel : `src/pages/Legal.tsx` ne contient que
  `/confidentialite` et `/conditions`, rédigés pour **le pilote du logiciel AIME**
  (« Objet du pilote », `Legal.tsx:18`), pas pour une prestation de service de wedding planning.
- **Pas de base RGPD pour un futur formulaire** : finalité, durée de conservation, responsable de
  traitement, consentement — à écrire avant de collecter des demandes (lot 4).
- **Incohérence de marque/domaine** : l'email de contact est `bonjour@lacerisesurlegateau.fr`
  (`AgencyLanding.tsx:19`) alors que le domaine, le canonical et le sitemap sont
  `https://www.byaime.fr` (`index.html:9`, `public/sitemap.xml`, `public/robots.txt:12`). Un des
  deux doit céder (décision D2).
- **Le livrable privé des mariés est indexable** : `public/robots.txt:4-10` interdit `/user-portal`,
  `/profile`, `/invite/`, `/rsvp/`, `/profil/`, `/api` — mais **pas `/bilan/`**, qui est la page
  publique du rapport d'un couple réel (`src/pages/BilanPage.tsx:5-12`, servie par
  `GET /public/reports/:id` quand `publicProfile.shareReport` est posé). Ces URLs doivent être en
  `noindex` par défaut : le partage est un lien, pas une publication.

### 2.11 Le contenu qui fait vendre est absent — P0 (métier)
La page actuelle tient en 8 sections courtes. Il manque tout ce qui décide un couple :
réalisations/portfolio, témoignages vérifiables, formules et ordre de prix, « à propos » (qui est
derrière la marque), zone desservie et disponibilités, FAQ, presse/partenaires, Instagram, journal
(indispensable au SEO local « wedding planner Paris / destination »).

### 2.12 Aucun filet de test sur la vitrine — P2
`src/pages/agency-landing.test.tsx` verrouille 5 chaînes de contenu (marque, méthode, livrables,
prestations, visuels versionnés). Rien sur : le `<title>`/canonical, la navigation mobile,
l'accessibilité, les contrastes, le formulaire (à venir), ni aucun scénario E2E
(`e2e/aime.spec.ts` = 1 test, sans `/agence`). `preview/smoke.mjs` ne couvre pas `/agence`
(grep : 0 occurrence).

### 2.13 Documentation muette — P2
Aucun fichier de `docs/` ne mentionne l'agence. Le présent plan devient la spec de référence ; il
faudra le maintenir à jour comme les autres audits du dépôt.

---

## 3. La cible : architecture du site d'agence

Une arborescence courte, éditoriale, orientée preuve et prise de rendez-vous. Tout reste dans le
même paquet `@workspace/byaime-onepage` (règle du dépôt : « regrouper les fonctions dans une seule
interface »), mais la vitrine devient **pré-rendue** pour exister sans JavaScript.

```
/                      → vitrine agence (si D1 = « l'agence d'abord ») ou landing AIME (statu quo)
/agence                → la vitrine, pré-rendue, canonique, complète
/agence/realisations   → 3 à 6 mariages racontés (lieu, saison, invités, ce qui a été tenu)
/agence/formules       → 3 formules + « à partir de » + ce qui est inclus
/agence/a-propos       → portrait, parcours, méthode, ce qui n'est pas négociable
/agence/faq            → 8 à 12 questions (+ JSON-LD FAQPage)
/agence/contact        → formulaire de demande + créneaux de RDV + coordonnées
/agence/merci          → confirmation après envoi (événement analytics, jamais indexée)
/mentions-legales      → LCEN (éditeur, SIREN, hébergeur, directeur de publication)
/confidentialite       → RGPD : logiciel AIME **et** demandes de contact agence
/conditions            → CGV/CGU du pilote AIME (existant)

/bilan/:projectId      → livrable du couple (existant) · noindex par défaut
/profil/:projectId     → mini-site invités (existant) · déjà disallow
/user-portal, /admin   → l'outil interne du planner (existant) · déjà disallow
```

Trois règles de finition qui découlent du diagnostic :
1. **La vitrine ne dépend de rien** : ni Clerk, ni base, ni API. Du HTML + du CSS + une webfont.
2. **Un seul point d'identité** : couleurs, serifs, espacements et visuels de l'agence centralisés
   dans un manifeste (`AGENCY_VISUALS` existe déjà, `src/lib/assets.ts:44-53`) étendu en
   `AGENCY_THEME` + `AGENCY_CONTENT` — comme le dépôt le fait déjà pour `AIME_VISUALS`.
3. **Chaque section vend une preuve**, pas une promesse : photo réelle, chiffre, témoignage nommé.

---

## 4. Le plan en 7 lots

Estimations en jours de travail effectif (1 j ≈ 6 h de production dans ce dépôt, contrôles compris).
« DoD » = définition de terminé, vérifiable par commande.

### Lot 0 — Décisions à trancher (0,5 j) — bloquant pour les lots 1 et 5
Voir §5. Sans D1 et D2, on risque de construire la mauvaise porte d'entrée.

### Lot 1 — Fondations : statut public, légal, thème (1,5 j)
| # | Tâche | Fichiers |
| --- | --- | --- |
| 1.1 | Sortir la vitrine de la dépendance Clerk : rendre `/agence` (et ses futures sous-pages) accessibles sans clé publique — garde `clerkKeyMissing` limitée aux routes authentifiées | `src/App.tsx:24-27`, `:393-395` |
| 1.2 | Métadonnées par page : `useRouteMeta` sur la vitrine + title/description propres, canonical correct | `src/pages/AgencyLanding.tsx`, `src/lib/page-meta.ts:34-38` |
| 1.3 | Page **Mentions légales** (éditeur, forme juridique, capital, RCS, adresse, téléphone, directeur de publication, hébergeur Vercel, crédits visuels) | nouveau `src/pages/Legal.tsx` (`kind="mentions"`) ou `Mentions.tsx`, route `/mentions-legales` |
| 1.4 | Confidentialité étendue aux demandes de contact (finalité, base légale, durée, destinataires, droits CNIL) | `src/pages/Legal.tsx:8-25` |
| 1.5 | `robots.txt` : `Disallow: /bilan/`, `Disallow: /agence/merci` + `noindex` côté page | `public/robots.txt:4-10`, `BilanPage.tsx` |
| 1.6 | `sitemap.xml` : ajouter `/agence` et ses sous-pages, retirer ce qui est privé | `public/sitemap.xml` |
| 1.7 | Thème par défaut clair (fin du `color-scheme: dark` au premier chargement) | `index.html:38-43`, `index.css:439-441` |
| 1.8 | Contrastes AA : les deux gris clairs de la vitrine descendent d'un cran (`#B4AC9C` → ≥ 4,5:1, `#8A8375` → ≥ 4,5:1), jetons nommés au lieu de couleurs en dur | `src/pages/AgencyLanding.tsx:28-34` |

**DoD** : `curl /agence` renvoie un HTML avec le bon `<title>` ; la vitrine s'affiche avec une clé
Clerk absente ; `/mentions-legales` en ligne ; `pnpm test` et `typecheck` verts ; nouveau test
unitaire sur le title/canonical de la vitrine.

### Lot 2 — Pré-rendu et SEO : exister sans JavaScript (1,5 j)
| # | Tâche | Fichiers |
| --- | --- | --- |
| 2.1 | Pré-rendre la vitrine au build (second point d'entrée Vite `agence.html` + rendu statique du composant, ou plugin de prerender) : le contenu, le title et l'OG sont dans le HTML servi | `vite.config.ts:57-84`, nouveau `agence.html`, `src/agency-entry.tsx` |
| 2.2 | Route Vercel : `^/agence$` → `/agence.html` avant le repli SPA | `vercel.json:12-22`, `artifacts/byaime-onepage/vercel.json` |
| 2.3 | Mettre à jour le vérificateur de déploiement (bundle attendu + contrôle de routage `/agence`) | `scripts/verify-vercel.mjs:25-32`, `:46-53` |
| 2.4 | Données structurées : `ProfessionalService` (nom, zone, email, prix indicatif) + `FAQPage` + `BreadcrumbList` en JSON-LD | nouveau `src/lib/agency-seo.ts` + tests |
| 2.5 | Image de partage agence 1200 × 630 (marque, serif, une photo) + `og:*`/`twitter:*` propres | `public/og-agency.jpg`, `index.html`/`agence.html` |
| 2.6 | Si D3 = bilingue : basculer la copie de la vitrine dans le dictionnaire i18n + `hreflang` FR/EN | `src/lib/i18n-dictionary.ts`, `AgencyLanding.tsx` |

**DoD** : `curl /agence` contient le texte des sections (pas seulement `<div id="root">`) ;
`node scripts/verify-vercel.mjs` OK ; test unitaire sur le JSON-LD ; Lighthouse SEO ≥ 95.

### Lot 3 — Identité et qualité visuelle (2 j)
| # | Tâche | Fichiers |
| --- | --- | --- |
| 3.1 | **Webfont serif auto-hébergée** sous licence libre (Playfair Display, Cormorant Garamond ou Marcellus), formats woff2, `font-display: swap`, préchargement ; la pile `Didot/Bodoni` devient le repli, plus la source | `index.html`, `src/index.css`, nouveau `public/fonts/`, `src/lib/agency-theme.ts` |
| 3.2 | Manifeste d'identité agence (encres, hairline, serifs, pas typographiques, espaces) utilisé par la vitrine, le bilan, l'admin et le rapport — fin des 4 copies de la constante `serif` | nouveau `src/lib/agency-theme.ts` ; `AgencyLanding.tsx:23-30`, `BilanPage.tsx:16-20`, `AdminSommaire.tsx:20-24`, `CoupleReport.tsx` |
| 3.3 | Images : variantes responsives (1x/2x, WebP + AVIF), `width`/`height`, `srcset`/`sizes`, `loading="lazy"` hors hero, `fetchpriority="high"` sur le hero ; résolution native ≥ 2560 px pour le plein écran | `src/lib/assets.ts:44-53`, `AgencyLanding.tsx:125-146`, `:232-244` |
| 3.4 | **Menu mobile** + en-tête collant avec CTA « Prendre rendez-vous » toujours visible après le premier écran | `AgencyLanding.tsx:71-105` |
| 3.5 | Rythme éditorial : grille, respirations, une respiration visuelle par section, animations réduites respectant `prefers-reduced-motion` (règle mémoire `ripple-ui` / `accessible-appearance`) | `AgencyLanding.tsx`, `src/index.css` |

**DoD** : aucun titre rendu en Georgia/Times sur un Android et un Windows de test (capture),
CLS ≈ 0 et LCP < 2,5 s en 4G simulée, navigation mobile complète (test Playwright viewport 390 px),
contrastes ≥ 4,5:1 vérifiés par test.

### Lot 4 — Conversion : formulaire de demande et pipeline de leads (3 j)
| # | Tâche | Fichiers |
| --- | --- | --- |
| 4.1 | **OpenAPI d'abord** (règle du dépôt) : `POST /agency/leads` public, schéma de demande/réponse, puis codegen Orval | `lib/api-spec/openapi.yaml`, `pnpm --filter @workspace/api-spec run codegen` |
| 4.2 | Table `aime_agency_leads` (nom, email, téléphone, date du mariage, lieu, invités, budget, formule visée, message, consentement, source/UTM, statut, horodatage) ; `drizzle push` en dev uniquement | `lib/db/src/schema/aime.ts` |
| 4.3 | Route serveur : validation Zod, honeypot + vérification de jeton anti-rejeu, limite de débit par IP, aucune donnée renvoyée au-delà de « reçu » | `artifacts/api-server/src/routes/aime.ts`, nouveau `src/lib/agencyLead.ts` + tests |
| 4.4 | Notification : email Resend à la fondatrice (récapitulatif lisible) + accusé de réception au couple, **avec journalisation des échecs fournisseur** (règle du dépôt sur Resend) | `artifacts/api-server/src/lib/resend.ts` |
| 4.5 | Formulaire de la vitrine : champs courts (une question à la fois si possible), état d'envoi, erreur lisible, page `/agence/merci`, repli `mailto:` et téléphone si l'API échoue | nouveau `src/components/AgencyContactForm.tsx` + `src/pages/AgencyThanks.tsx` |
| 4.6 | Prise de rendez-vous : soit créneaux internes, soit lien Cal.com/Calendly — à trancher (D4) | `AgencyLanding.tsx:246-262` |
| 4.7 | Suivi des demandes dans le back-office existant (une section « Demandes » du rétroplanning) | `src/pages/AdminSommaire.tsx`, `src/lib/admin-plan.ts` |

**DoD** : une demande envoyée depuis la vitrine arrive en base **et** par email ; un doublon/robot
est rejeté ; le test E2E couvre l'envoi ; `verify-vercel` OK ; aucune donnée personnelle dans les
logs (contrôle `logger.ts`).

### Lot 5 — Contenu qui prouve (2 à 4 j de développement, contenu fourni par la fondatrice)
| # | Section | Ce qu'il faut | Blocage éventuel |
| --- | --- | --- | --- |
| 5.1 | Réalisations | 3 à 6 mariages : lieu, saison, nombre d'invités, une difficulté tenue, 3 à 6 photos réelles | photos réelles + droit à l'image |
| 5.2 | Témoignages | 2 à 4 citations avec prénoms (et accord écrit) | accord des couples |
| 5.3 | Formules | 3 offres, inclusions, « à partir de » | décision tarifaire (D5) |
| 5.4 | À propos | portrait, parcours, pourquoi « architecte », ce qui n'est pas négociable | photo portrait |
| 5.5 | FAQ | 8 à 12 questions réelles (délais, zones, budget minimum, prestataires imposés, annulation) | validation métier |
| 5.6 | Zones & disponibilités | Paris / Île-de-France / destinations ; calendrier de saison (ex. « 6 dates en 2027 ») | décision métier |
| 5.7 | Réseaux & presse | Instagram, partenariats lieux/traiteurs, retombées presse | comptes existants |
| 5.8 | Journal (optionnel, SEO) | 3 articles longs (« choisir son lieu », « budget 120 invités à Paris ») | temps éditorial |

**DoD** : chaque section est servie par un composant testé, alimentée par un fichier de contenu
(`src/lib/agency-content.ts`) modifiable sans toucher au JSX ; aucune section vide ou « à venir »
en ligne.

### Lot 6 — Mesure, tests, mise en ligne (1,5 j)
| # | Tâche | Fichiers |
| --- | --- | --- |
| 6.1 | Événements analytics de la vitrine : `agency_view`, `agency_section_seen`, `agency_cta_click`, `agency_lead_sent`, `agency_lead_error` (Umami, cookieless — déjà en place) | `src/lib/analytics.ts:31`, `AgencyLanding.tsx` |
| 6.2 | E2E Playwright : vitrine desktop + mobile 390 px, navigation par ancres, envoi du formulaire, mentions légales, `noindex` du bilan | `e2e/aime.spec.ts` ou nouveau `e2e/agency.spec.ts`, `.github/workflows/e2e.yml` |
| 6.3 | Tests unitaires étendus : contenu, méta, menu mobile, JSON-LD, contrastes | `src/pages/agency-landing.test.tsx` |
| 6.4 | Réécrire `preview/smoke.mjs` sur les écrans actuels (il contient des attentes périmées, cf. `docs/incoherences-2026-09-13.md` §5) et y inclure la vitrine | `preview/smoke.mjs` |
| 6.5 | Lighthouse (perf, a11y, SEO, best practices) ≥ 95 sur `/agence`, relevé archivé | `screenshots/` |
| 6.6 | Mise en ligne : domaine (D2), redirections si la racine change, Search Console + sitemap, fiche Google Business Profile, vérification `node scripts/verify-vercel.mjs` | `vercel.json`, `docs/vercel-deployment.md` |

**DoD** : CI verte, un scénario E2E agence rejouable, relevé Lighthouse daté, Search Console
propriétaire avec la vitrine indexée.

---

## 5. Les 5 décisions à trancher (recommandations — **les choix actés sont au §5 bis**)

| # | Question | Options | Recommandation |
| --- | --- | --- | --- |
| **D1** | Quelle est la page d'accueil ? | (a) `/` = vitrine agence, l'outil AIME passe derrière `/admin` et `/user-portal` ; (b) statu quo (`/` = landing logiciel, `/agence` = vitrine) ; (c) `/` = vitrine, `/logiciel` = page AIME pour les planners partenaires | **(a)** : cohérent avec la décision du commit `a0b9b20` (« le couple ne reçoit que des livrables »). La landing produit actuelle devient une page interne ou une page « AIME pour les planners » (option c) si un canal B2B est visé |
| **D2** | Quelle marque et quel domaine portent le site ? | (a) `lacerisesurlegateau.fr` (l'email de contact l'utilise déjà) ; (b) `byaime.fr` (canonical, sitemap, robots actuels) ; (c) les deux, l'un redirigeant vers l'autre | **(a)** pour le site commercial, `byaime.fr` conservé pour l'outil/livrables. Sinon, changer l'email de contact en `@byaime.fr`. **Il faut un seul nom partout** |
| **D3** | Site bilingue ? | (a) FR seul ; (b) FR + EN (la vitrine affiche déjà « Paris · New York ») | **(a) maintenant**, architecture prête pour (b) : la copie dans un fichier de contenu, pas en dur dans le JSX. L'EN viendra avec le marché destination |
| **D4** | Comment prend-on rendez-vous ? | (a) formulaire + email (simple, maîtrisé) ; (b) formulaire + créneaux Cal.com/Calendly ; (c) téléphone en plus | **(a) + (c)** : le formulaire alimente la base et le back-office ; le téléphone rassure. (b) en lot suivant si l'agenda devient volumineux |
| **D5** | Affiche-t-on des prix ? | (a) « à partir de » par formule ; (b) aucun prix, sur devis ; (c) fourchette par formule | **(a)** : une ancre de prix qualifie les demandes et réduit les échanges stériles. À défaut (c) |

Éléments que **seule la fondatrice** peut fournir : photos de mariages réels + droits à l'image,
témoignages signés, identité légale (SIREN, adresse, téléphone), tarifs, zones et disponibilités,
compte Instagram, nom de domaine définitif.

---

## 5 bis. Décisions actées le 13/09/2026 (avec la fondatrice)

| # | Décision retenue | Conséquences sur le plan |
| --- | --- | --- |
| **D1** | **`/` = la vitrine de l'agence.** L'outil AIME passe derrière `/admin` et `/user-portal` | Nouveau **lot 1 bis** (inversion des portes d'entrée, 2 j) : la vitrine devient la racine et la page pré-rendue principale ; la landing produit AIME est déplacée ou retirée ; redirections + tests mis à jour. C'est le plus gros chantier du plan, et il conditionne le lot 2 (le pré-rendu se fait sur `index.html` lui-même) |
| **D2** | **`byaime.fr` partout.** L'email de contact devient `@byaime.fr` | `AgencyLanding.tsx:21` → `bonjour@byaime.fr` ; canonical, sitemap, robots restent sur `www.byaime.fr` (déjà le cas). Le nom d'enseigne affiché (« La cerise sur le gâteau — Wedding Architect ») reste à confirmer : soit il est conservé comme nom commercial sur `byaime.fr`, soit la marque affichée devient AIME. **À valider avant le lot 3** (la webfont et l'OG image portent le nom) |
| **D3** | FR seul pour l'instant (recommandation retenue) | La copie quitte le JSX pour un fichier de contenu (`agency-content.ts`) afin que l'EN reste un ajout, pas une réécriture |
| **D4** | **Formulaire + base + email** (pas de Calendly, pas de téléphone affiché pour l'instant) | Lot 4 confirmé tel quel : OpenAPI → `aime_agency_leads` → `POST /agency/leads` → Resend → suivi dans `/admin`. Les trois `mailto:` de la vitrine (`:91`, `:113`, `:256`) pointent vers `/agence/contact` |
| **D5** | Prix : **non tranché** | Le lot 5.3 (formules) reste en attente ; la section « Prestations » actuelle (`AgencyLanding.tsx:200-215`) est conservée telle quelle jusque-là |
| **Contenus** | **Rien de disponible aujourd'hui** | Les lots **1, 1 bis, 2, 3, 4 et 6** (technique) passent devant ; le lot 5 (réalisations, témoignages, à propos, FAQ) est **reporté** et aucune section vide ou « à venir » ne sera mise en ligne : on n'ajoute une section que quand son contenu existe |

### Lot 1 bis — Inversion des portes d'entrée (2 j) — décidé par D1

| # | Tâche | Fichiers |
| --- | --- | --- |
| 1b.1 | La vitrine devient la racine : `/` sert `AgencyLanding`, `/agence` reste actif et **redirige (301) vers `/`** pour ne casser aucun lien déjà partagé | `src/App.tsx:337-345`, `vercel.json`, nouveau `agence.html`/`index.html` au lot 2 |
| 1b.2 | L'ancienne landing produit AIME : soit retirée, soit déplacée vers une page interne (`/logiciel`) hors sitemap et en `noindex` — **à trancher avec la fondatrice** (le compositeur d'intention `LandingComposer` et le CTA `/creation` n'ont plus de raison d'être publics si le couple n'ouvre plus de compte seul) | `src/pages/Landing.tsx`, `src/components/LandingComposer.tsx`, `src/pages/landing.test.tsx` |
| 1b.3 | Les entrées authentifiées restent stables : `/connexion`, `/creation`, `/user-portal`, `/admin`, `/profile`, `/assistant`, `/dossiers`, `/bilan/:id`, `/profil/:id` | `src/App.tsx:337-352` |
| 1b.4 | Cohérence des liens croisés : le mot « AIME » ne renvoie plus « de la landing vers la vitrine » (il est déjà **dans** la vitrine) ; l'espace privé et `/admin` gardent un retour vers `/` | `src/components/PrivateLayout.tsx:26`, `src/pages/AdminSommaire.tsx:87-90` |
| 1b.5 | Tests mis à jour : `landing.test.tsx` (7 assertions sur la landing actuelle), `private-shell-ui.test.tsx:54`, `e2e/aime.spec.ts` (le scénario démarre sur `/`), `preview/smoke.mjs` | idem |
| 1b.6 | Le pied de page de la vitrine porte les liens légaux et l'entrée « Espace privé » (déjà présent) — plus rien d'autre à découvrir ailleurs | `AgencyLanding.tsx:270-284` |

**DoD** : `curl /` renvoie la vitrine (pré-rendue au lot 2) ; `/agence` redirige ; aucun test ne
référence une route disparue ; `pnpm test`, `typecheck`, `build`, `verify-vercel` verts.

**Risque** : c'est le seul lot qui casse des tests existants en nombre. Il se fait **après** le lot 1
(méta, légal, Clerk) et **avant** le lot 2 (pré-rendu), pour que le pré-rendu porte directement sur
la bonne racine.

---

## 6. Feuille de route retenue (décisions D1/D2/D4 actées, contenus indisponibles)

Le contenu métier (lot 5) étant absent, on livre d'abord **tout ce qui est technique et
vérifiable**, dans l'ordre qui évite les retours en arrière. Total : **~9,5 j** hors lot 5.

| Sprint | Durée | Contenu | Bloqué par |
| --- | --- | --- | --- |
| **S1 — Fondations** | 1,5 j | Lot 1 complet : vitrine indépendante de Clerk (1.1), `useRouteMeta` + canonical (1.2), **mentions légales** (1.3), confidentialité étendue au futur formulaire (1.4), `robots.txt` `/bilan/` + `sitemap.xml` (1.5-1.6), thème clair par défaut (1.7), contrastes AA (1.8) ; email → `bonjour@byaime.fr` (D2) | rien |
| **S2 — Identité** | 2 j | Lot 3 : webfont serif auto-hébergée (3.1), manifeste `AGENCY_THEME` unique — fin des 4 copies de `serif` (3.2), images responsives WebP/AVIF + `width`/`height` + lazy (3.3), en-tête collant + **menu mobile** (3.4), rythme éditorial (3.5) | confirmation du nom d'enseigne affiché (D2) |
| **S3 — Inversion** | 2 j | Lot 1 bis : `/` = vitrine, `/agence` → 301, sort de l'ancienne landing produit (retirée ou `/logiciel` en `noindex`), liens croisés, tests et E2E mis à jour | décision 1b.2 |
| **S4 — SEO** | 1,5 j | Lot 2 : pré-rendu de la racine au build (2.1-2.3), JSON-LD `ProfessionalService` + `BreadcrumbList` (2.4), image de partage 1200 × 630 (2.5) | S3 (le pré-rendu porte sur la bonne racine) |
| **S5 — Conversion** | 3 j | Lot 4 : OpenAPI d'abord → codegen (4.1), table `aime_agency_leads` (4.2), `POST /agency/leads` validé + honeypot + débit (4.3), Resend + accusé + journal des échecs (4.4), formulaire `/agence/contact` + `/agence/merci` (4.5), section « Demandes » dans `/admin` (4.7) | S1 (texte RGPD) |
| **S6 — Mesure & mise en ligne** | 1,5 j | Lot 6 : analytics vitrine (6.1), E2E desktop + 390 px (6.2), tests unitaires étendus (6.3), `smoke.mjs` réécrit (6.4), Lighthouse ≥ 95 (6.5), déploiement + Search Console + fiche Google Business Profile (6.6) | S4, S5 |
| **S7 — Contenu** | 2 à 4 j | Lot 5 : réalisations, témoignages, formules (après D5), à propos, FAQ, zones & disponibilités, réseaux — **au fil des éléments fournis**, aucune section vide mise en ligne | photos réelles, droits à l'image, témoignages signés, identité légale, tarifs |

### Ce qui peut démarrer tout de suite, sans rien attendre
S1 intégralement (1,5 j) : méta + canonical de la vitrine, découplage Clerk, mentions légales,
robots/sitemap, thème clair, contrastes AA, email `@byaime.fr` — chaque point verrouillé par un test.

### Ce qu'il me faut de toi, et quand
| Élément | Pour le sprint | Sans lui |
| --- | --- | --- |
| Nom d'enseigne affiché sur `byaime.fr` (« La cerise sur le gâteau » ou « AIME ») | S2 | la webfont et l'OG image portent le mauvais nom |
| Sort de l'ancienne landing produit : retirée ou conservée en `/logiciel` `noindex` | S3 | je propose « retirée » par défaut, conformément à D1 |
| Identité légale : raison sociale, forme juridique, capital, SIREN/RCS, adresse, téléphone, directeur de publication | S1 | la page mentions légales reste un modèle à trous **non publiable** |
| Photos de mariages réels + droits à l'image, témoignages signés, tarifs, zones, Instagram | S7 | la vitrine reste un moodboard : elle présente la méthode, sans preuve |

---

## 7. Garde-fous du dépôt à respecter pendant les travaux

Règles déjà établies dans `replit.md`, `.agents/memory/*` et les audits de `docs/` :
- **OpenAPI d'abord**, puis `pnpm --filter @workspace/api-spec run codegen`, puis typecheck.
- **Aucun DDL en production** : `pnpm --filter @workspace/db run push` uniquement en développement.
- **Sobriété premium conservée** même quand on ajoute des sections (préférence utilisateur explicite).
- **Une seule interface** plutôt qu'une multiplication de pages : l'arborescence §3 reste courte,
  chaque page est une respiration, pas un écran de plus.
- **Langage intergénérationnel** (`inclusive-language.md`) : la copie de la vitrine reste lisible
  par tous, sans jargon de wedding planner — et sans vocabulaire produit (déjà verrouillé par
  `agency-landing.test.tsx:31-38`).
- **Apparence accessible** (`accessible-appearance.md`) : contrastes AA, `prefers-reduced-motion`.
- **Resend** : tout échec fournisseur est persisté et remonté, jamais avalé.
- Chaque lot se termine par : `pnpm run typecheck` · `pnpm test` · `vite build` · smoke · (et E2E
  quand les secrets Clerk sont disponibles).

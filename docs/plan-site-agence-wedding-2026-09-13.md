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
| **S1 — Fondations** ✅ livré le 13/09 (§8) | 1,5 j | Lot 1 complet : vitrine indépendante de Clerk (1.1), `useRouteMeta` + canonical (1.2), **mentions légales** (1.3), confidentialité étendue au futur formulaire (1.4), `robots.txt` `/bilan/` + `sitemap.xml` (1.5-1.6), thème clair par défaut (1.7), contrastes AA (1.8) ; email → `bonjour@byaime.fr` (D2) | rien |
| **S2 — Identité** | 2 j | Lot 3 : webfont serif auto-hébergée (3.1), manifeste `AGENCY_THEME` unique — fin des 4 copies de `serif` (3.2), images responsives WebP/AVIF + `width`/`height` + lazy (3.3), en-tête collant + **menu mobile** (3.4), rythme éditorial (3.5) | confirmation du nom d'enseigne affiché (D2) |
| **S3 — Inversion** | 2 j | Lot 1 bis : `/` = vitrine, `/agence` → 301, sort de l'ancienne landing produit (retirée ou `/logiciel` en `noindex`), liens croisés, tests et E2E mis à jour | décision 1b.2 |
| **S4 — SEO** | 1,5 j | Lot 2 : pré-rendu de la racine au build (2.1-2.3), JSON-LD `ProfessionalService` + `BreadcrumbList` (2.4), image de partage 1200 × 630 (2.5) | S3 (le pré-rendu porte sur la bonne racine) |
| **S5 — Conversion** | 3 j | Lot 4 : OpenAPI d'abord → codegen (4.1), table `aime_agency_leads` (4.2), `POST /agency/leads` validé + honeypot + débit (4.3), Resend + accusé + journal des échecs (4.4), formulaire `/agence/contact` + `/agence/merci` (4.5), section « Demandes » dans `/admin` (4.7) | S1 (texte RGPD) |
| **S6 — Mesure & mise en ligne** | 1,5 j | Lot 6 : analytics vitrine (6.1), E2E desktop + 390 px (6.2), tests unitaires étendus (6.3), `smoke.mjs` réécrit (6.4), Lighthouse ≥ 95 (6.5), déploiement + Search Console + fiche Google Business Profile (6.6) | S4, S5 |
| **S8 — La Bande** 🧪 prototype livré le 14/09 (§8 bis) | 3 j faits, ~5 j restants | Un écran, trois échelles : le graphe projeté sur le temps. Prototype public `/monde`, sans session, sur les moteurs existants (`timeline-graph`, `day-run`, `parser`) | décision de le substituer au Monde privé actuel |
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

---

## 8. Suivi d'exécution

### S1 — Fondations : livré le 13 septembre 2026

#### Contrôles exécutés

| Contrôle | Avant S1 | Après S1 |
| --- | --- | --- |
| `pnpm run typecheck` (racine, 4 paquets + libs + e2e) | OK | **OK** |
| `pnpm --filter @workspace/byaime-onepage run test` | 50 fichiers / 265 tests | **54 fichiers / 308 tests OK** |
| `pnpm exec vite build` | OK | **OK** (toutes les classes `var(--agency-*)` générées, y compris le modificateur d'opacité via `color-mix`) |
| `node preview/smoke.mjs` | CONTRÔLE LOCAL OK | **CONTRÔLE LOCAL OK**, 8 contrôles ajoutés (2 pages publiques en mode nominal, 6 en mode dégradé) |
| Rendu navigateur réel | — | **non vérifié ici** : le téléchargement de Chromium Playwright échoue dans cet environnement ; l'effet visuel des jetons et le mode dégradé sont à confirmer à l'œil sur l'aperçu |

#### Ce qui a été livré

**1.1 — La vitrine ne dépend plus de l'authentification.** Et, au passage, une découverte qui
changeait le diagnostic : `publishableKeyFromHost("byaime.fr", undefined)` **fabrique** une clé
(`pk_live_Y2xlcmsuYnlhaW1lLmZyJA`). Le garde `clerkKeyMissing = !clerkPubKey` ne pouvait donc
**jamais** se déclencher dans un navigateur : sans variable d'environnement, l'app montait un
`ClerkProvider` pointé sur une instance inexistante au lieu d'afficher l'écran explicatif promis par
`docs/vercel-deployment.md`. C'est désormais la variable qui fait foi, la résolution est protégée
par un `try`, et un mode dégradé sert les pages qui n'ont jamais eu besoin de session :
`/`, `/agence`, `/mentions-legales`, `/confidentialite`, `/conditions`, `/bilan/:id` **et
`/rsvp/:token`** — le portail d'un invité, ajouté en cours de route parce qu'il ne consomme aucune
API Clerk (`App.tsx:243`) et qu'un invité répondant la veille du Jour J n'a pas à subir un défaut de
configuration. La racine sert la vitrine directement, sans `<Redirect>` (qui ne rend rien côté
serveur et aurait blanchi la page la plus exposée au pré-rendu du lot 2).
`lib/public-shell.ts` porte la décision (dérivation pure, 9 tests) ; `App.tsx` ne fait que l'exécuter.
**Limite assumée, tâche ajoutée au lot 1 bis** : `/profil/:projectId` (le mini-site d'un couple pour
ses invités) reste indisponible en mode dégradé, parce que `PublicProfile.tsx:6,10` consomme
`useUser`, `useClerk` et `useProject` — le même composant sert l'aperçu privé et la page publique.
Le découpler est nécessaire pour que les invités ne dépendent jamais de l'authentification.

**1.2 — La vitrine porte son identité documentaire.** `useRouteMeta` posé sur la page
(`lib/page-meta.ts` étendu d'une directive `robots`, réécrite à chaque changement de route pour
qu'un `noindex` ne déborde jamais sur la page suivante) ; titre de 51 caractères et description de
162 caractères dans `lib/agency-seo.ts`, au-delà les moteurs tronquent ; canonical enfin propre ;
données structurées `ProfessionalService` injectées dans la page (JSON-LD, `<` échappé, champs
inconnus **omis** plutôt que publiés vides — pas d'adresse, pas de téléphone, pas de fourchette de
prix tant que D5 n'est pas tranché).

**1.3 — Mentions légales.** `/mentions-legales` (LCEN art. 6 III-1) : éditeur, hébergeur (Vercel
Inc.), données personnelles, propriété intellectuelle, renvoi vers la confidentialité. Toute
l'identité vient de `lib/agency-identity.ts` ; les 7 champs légaux non fournis sont affichés comme
manquants, avec une alerte « Page non publiable en l'état » — rien n'est inventé, aucun faux SIREN.
La page est liée depuis la vitrine (en-tête **et** pied de page), l'accueil et les pages légales.

**1.4 — Confidentialité étendue** aux demandes adressées à l'agence (finalité, base légale, absence
de revente et de démarchage, droits, CNIL), dans les deux langues par le dictionnaire existant.

**1.5 — Le livrable d'un couple n'est plus indexable** : `Disallow: /bilan/` dans `robots.txt` **et**
`noindex, nofollow` sur la page (un robots.txt seul n'empêche pas une URL d'apparaître dans l'index
si elle est liée ailleurs). `BilanPage` reçoit aussi son titre et sa description.

**1.6 — Sitemap** : `/agence` et `/mentions-legales` ajoutés ; rien de privé n'y entre (contrôlé par
test).

**1.7 — Le site est peint en clair dès la première peinture**, et une seconde découverte : le
`CommandBar` proposait encore un bouton « Mode sombre » qui appliquait `color-scheme: dark` — le
sombre était donc toujours reachable, contrairement à ce qu'annonçait le commentaire d'`index.css`.
Bouton retiré, `AppearanceToggle.tsx` supprimé (0 import), `lib/appearance.ts` réduit à
`initAppearance()` qui pose le clair et normalise un `localStorage` hérité d'une version antérieure.
`index.html`, `theme-color` et `site.webmanifest` passent au blanc. Les blocs
`:root[data-aime-theme=…]` restent dans `index.css` : ils portent les jetons de catégorie du graphe
et sont verrouillés par `visibility-graph.test.tsx`. La règle mémoire
`.agents/memory/accessible-appearance.md` est réécrite : l'exigence d'accessibilité demeure, son
moyen change (un thème unique + des contrastes mesurés).

**1.8 — Couleurs mesurées, plus recopiées.** Jetons `--agency-*` dans `index.css`, consommés par les
5 fichiers de l'agence (vitrine, bilan, rapport, back-office, mentions) : fin des 4 copies de la pile
de serifs (`style={serif}` → classe `.agency-serif`) et fin des hexadécimaux en dur. Les deux gris
sous AA sont corrigés : eyebrow `#8A8375` 3,76:1 → `#736C5E` **5,20:1** ; index `#B4AC9C` 2,25:1 →
`#7A7365` **4,70:1**. `lib/agency-theme.test.ts` **recalcule** ces contrastes à partir de la feuille
de style et vérifie qu'aucun des 5 fichiers ne recopie une couleur : la mesure est un contrôle, pas
une intention.

**Décision D2 appliquée** : l'email de contact passe en `bonjour@byaime.fr` (il était en
`@lacerisesurlegateau.fr`, domaine que ni le canonical, ni le sitemap, ni robots.txt ne connaissent).

**§2.1 entamé (la vitrine était introuvable)** : en attendant l'inversion du lot 1 bis, l'accueil
mène à la vitrine en toutes lettres — lien « L'agence » en en-tête et « La vitrine de l'agence » en
pied de page, avec les clés i18n FR/EN (`nav.agency`, `footer.agency`, `footer.mentions`, parité
garantie par les types).

#### Fichiers

- **Nouveaux** : `src/lib/agency-identity.ts`, `src/lib/agency-seo.ts`, `src/lib/public-shell.ts`,
  `src/lib/site-path.ts`, `src/pages/Mentions.tsx`, et leurs tests
  (`agency-theme.test.ts`, `agency-seo.test.ts`, `public-shell.test.ts`, `mentions.test.tsx`).
- **Modifiés** : `src/App.tsx`, `src/index.css`, `index.html`, `src/lib/page-meta.ts`,
  `src/lib/appearance.ts`, `src/components/CommandBar.tsx`, `src/pages/AgencyLanding.tsx`,
  `src/pages/BilanPage.tsx`, `src/pages/AdminSommaire.tsx`, `src/pages/Legal.tsx`,
  `src/pages/Landing.tsx`, `src/components/CoupleReport.tsx`, `src/lib/i18n-dictionary.ts`,
  `public/robots.txt`, `public/sitemap.xml`, `public/site.webmanifest`, `preview/smoke.mjs`,
  tests existants étendus (`agency-landing.test.tsx` +6, `landing.test.tsx` +3),
  `docs/vercel-deployment.md`, `.agents/memory/accessible-appearance.md`.
- **Supprimés** : `src/components/AppearanceToggle.tsx`.

#### Suite

S2 (identité : webfont serif auto-hébergée, images responsives, en-tête collant + menu mobile),
puis S3 (inversion des portes d'entrée, avec le découplage Clerk de `PublicProfile` ajouté à son
périmètre). **Attendu de la fondatrice pour S2** : confirmation du nom d'enseigne affiché sur
`byaime.fr`. **Attendu pour S1 déjà livré, mais bloquant la mise en ligne** : les 7 champs
d'identité légale.

---

## 8 bis. Lot 8 — La Bande : prototype livré le 14 septembre 2026

Demande de la fondatrice : « est-ce que le graphe peut à lui seul suffire pour organiser un mariage,
et quelle serait la solution révolutionnaire pour tout résoudre en un écran ingénieux ? », puis
« fais-moi ça sur une page accessible depuis l'accueil ».

#### La réponse tenue par le code

Le graphe suffit comme **modèle** et comme **moteur** — conflits, propagation, visibilité par rôle,
régie du Jour J — mais pas comme **interface** : 42 identifiants d'écran (`AimeScreenId`) et
9 projections du même fil exposaient en parallèle ce qui ne se regarde qu'à une échelle à la fois.
La Bande projette donc le graphe sur sa colonne vertébrale temporelle, à la résolution que la date
impose : **les mois** (la forme du mariage, chapitre par chapitre), **les engagements** (le dernier
mois : ce qui doit être vrai avant samedi), **les minutes** (la régie du Jour J, retard qui cascade).
Même objet, trois échelles, aucune navigation : les panneaux deviennent des tiroirs.

Le second geste est **la phrase** : une intention écrite en langage naturel construit un Monde
entier (`parser.ts`, déjà utilisé par l'onboarding) et affiche ce qu'elle a compris avec son niveau
de confiance — confirmé, déduit, suggéré, à confirmer, manquant. Ce qui n'a pas été dit reste dit
comme manquant, jamais inventé.

#### Ce qui est livré

- `/monde` — page publique, **sans session, sans store, sans appel réseau**. Servie en mode nominal
  comme en mode dégradé (`public-shell.ts` : `{ kind: "bande" }`). Joignable depuis l'accueil
  (en-tête `landing-bande` et pied de page `footer-bande`, clés i18n FR/EN) et depuis la vitrine
  (`agency-bande`) — en mode dégradé la vitrine est la seule porte d'entrée du site.
- `lib/bande.ts` — toutes les dérivations, pures : `resolutionFor`, `buildRegie`, `buildChapters`,
  `buildDayBande`, `listEngagements`, `settleEngagement`, `previewShift`/`commitShift`,
  `declareDayDelay`, `markMomentDone`, `understoodFacts`, `buildBandeState`, `demoWorld`.
- La régie en cinq nombres dérivés : jours restants, argent engagé, à payer avant le Jour J,
  invités confirmés, prestataires verrouillés — avec alerte écrite (« à traiter ») seulement quand
  une action est réellement attendue.
- Les engagements **dérivés**, jamais ressaisis : acomptes dus, prestataires non verrouillés,
  réponses en attente, tâches ouvertes, informations manquantes. Régler une ligne change le nombre
  en haut de l'écran, parce que c'est la même donnée.
- Le geste de décalage en deux temps : l'aperçu liste les Moments qui suivraient et les conflits
  créés (`planEventPropagation`), avec cases à cocher par dépendant ; rien n'est écrit avant
  « Appliquer ». En régie, `+10/+20/+45 min` cascade sur la suite (`applyDayDelay`).
- Le voyage dans le temps : aujourd'hui, le dernier mois, la veille, le Jour J à 16 h 30 et à 22 h —
  les trois échelles se voient sans attendre dix mois, et l'échelle imposée par la date est nommée.
- La projection par rôle : les mariés, l'agence, un proche, un invité (`roleCanSeeEvent`,
  `roleCanSeeEntityKind`). Un Moment masqué reste visible comme masqué, avec sa raison — un proche
  doit savoir qu'on lui cache quelque chose.

#### Deux extractions, pour ne rien recopier

- `lib/timeline-chapters.ts` — `getSubchapter` sort de `UniversalTimeline.tsx` : la même découpe en
  chapitres sert le Monde privé et la Bande publique.
- `lib/category-colors.ts` — `KIND_COLORS` sort de `VisibilityGraph.tsx`. Ce n'est pas cosmétique :
  ce composant importe `useProject`, donc Clerk ; laisser la table des couleurs là aurait traîné
  l'authentification dans une page qui promet de s'en passer. `VisibilityGraph` la ré-exporte,
  l'import historique reste valable.
- `lib/confidence.ts` — les libellés de confiance sortent de `FilTrack.tsx`, pour la même raison.

#### Contrôles

| Contrôle | Résultat |
| --- | --- |
| `pnpm run typecheck` (racine) | **OK** |
| `pnpm --filter @workspace/byaime-onepage run test` | **56 fichiers / 358 tests OK** (avant ce lot : 54 / 308) — dont `lib/bande.test.ts` (35) et `pages/bande.test.tsx` (12) |
| `pnpm exec vite build` | **OK**, toutes les classes `var(--agency-*)` générées, modificateurs d'opacité en `color-mix` avec repli |
| `node preview/smoke.mjs` | **CONTRÔLE LOCAL OK** — `/monde` rendu en mode nominal (84 776 octets) et en mode dégradé (84 516 octets) |
| `pages/Bande.tsx` dans `agency-theme.test.ts` | aucun hexadécimal recopié, jetons `--agency-*` et `.agency-serif` |
| Rendu navigateur réel | **non vérifié** (Chromium Playwright indisponible ici) : à confirmer à l'œil sur l'aperçu, port 4173 |

#### Ce qui n'est pas fait, volontairement

- **Le plan de table** : contrainte en deux dimensions, pas une ligne de temps. Il garde son atelier.
- **Le budget détaillé** et **les médias** : idem — la Bande porte le déroulé.
- **La persistance** : rien n'est enregistré, tout vit dans le navigateur. La substitution au Monde
  privé (store, API, synchronisation) est le vrai lot, ~5 jours une fois la décision prise.
- **L'indexation** : `noindex, nofollow` tant que c'est un prototype. Le pré-rendu (lot 2) et
  l'ouverture au référencement se feront ensemble.
- **La virtualisation** : le germe fait ~60 Moments ; au-delà de ~300 il faudra virtualiser la liste.

#### Reprise de la direction artistique de l'accueil (14/09, demande de la fondatrice)

Demande : « pas mal, mais ce serait mieux dans le design du site — si tu regardes la page
d'accueil, ce serait bien tout le site comme ça ».

La Bande reprend donc la mise en scène de `Landing.tsx` : hero pleine hauteur (œil-de-bœuf en
petites capitales espacées, titre `aime-apple-title` en 5xl→7xl, amorce `aime-apple-lead`), la
phrase dans la **carte sombre arrondie** du compositeur de l'accueil, panneaux blancs bordés d'un
filet, cartes `rounded-3xl`, icônes posées dans des carrés `rounded-xl`, boutons-pilules
(`aime-apple-pill`, accent rose pour appliquer un décalage), révélations au défilement.
`Reveal` est extrait de `Landing.tsx` vers `components/Reveal.tsx` — quatrième extraction pour la
même raison que les trois autres : une seule implémentation, deux écrans.

Deux écarts assumés :

1. **Les petites capitales de l'accueil sont sous AA.** `.aime-apple-eyebrow` et
   `.aime-apple-confiance` posent du texte à `foreground / 0.55`, soit ~**3,97:1** sur blanc
   (mesure recalculée depuis `--foreground: 30 12% 9%`). La Bande reprend leur dessin — capitales,
   espacement 0,24 em — avec `--agency-eyebrow`, mesuré à **5,20:1**. **À trancher pour le site
   entier** : corriger ces deux classes (`0.55` → `0.72`, soit ~7:1) ou accepter 3,97:1 sur les
   yeux-de-bœuf de l'accueil. La règle mémoire « apparence inclusive » demande AA.
2. **Le rythme est plus serré** (`py-16`/`py-24` au lieu de `py-24`/`py-36`) : l'accueil est une
   vitrine qui se regarde, la Bande est un écran qui s'emploie. Même langage, pas même respiration.

**Découverte : le dégradé maillé de l'accueil est invisible.** `ShaderBackdrop` est
`fixed inset-0 z-0`, mais le hero pose un voile blanc `absolute inset-0` et toutes les sections
sont des panneaux opaques `bg-background`, pied de page compris. Le site paie donc un contexte
WebGL animé en continu — et la dépendance `@paper-design/shaders-react` — pour un rendu que
personne ne voit. La Bande ne le reprend pas tant que ce n'est pas tranché. Deux issues : le rendre
visible (retirer le voile blanc du hero, à vérifier en contraste — le dégradé est saturé) ou le
retirer. Le commentaire de `ShaderBackdrop.tsx` annonce d'ailleurs une « palette rose/magenta »
que le test de l'accueil décrit comme un « fond bleu-vert signature » : la documentation et le
contrôle ne décrivent plus le même objet.

Contrôles après refonte : typecheck racine OK · **56 fichiers / 364 tests OK** (6 nouveaux sur la
direction artistique, dont l'interdiction des classes sous AA et l'absence du fond animé) · build OK
(classes générées vérifiées : `rounded-[2rem]`, `accent-[var(--agency-ink)]`, opacité 4 % en
`color-mix`) · smoke **31 contrôles OK**, `/monde` rendu en nominal (102 710 octets) et en dégradé
(102 450 octets).

#### Décision attendue

Faut-il substituer la Bande au Monde privé actuel (42 écrans → un écran + tiroirs) ? Si oui, le lot
devient S3 bis et passe **avant** S5, parce qu'il change ce que la vitrine promet et ce que
l'espace privé montre. Sinon elle reste une démonstration publique, et c'est déjà un argument
commercial : `/monde` montre le produit sans demander de compte.

---

## 8 ter. Le dessin de l'accueil étendu au site public — livré le 14 septembre 2026

### La demande

Sur le prototype de la Bande : « pas mal mais ce serait mieux dans le design du site en fait si tu
regarde la demo page d'accueil ce serait bien tout le site comme ça ». Trois choix ont ensuite été
tranchés explicitement :

| Question | Choix |
| --- | --- |
| Portée de la reprise | **tout le site public** — vitrine, mentions légales, confidentialité, conditions, réponse d'un invité, bilan partagé |
| Le fond animé de l'accueil | **retiré** (composant, dépendance et chunk) |
| Les petites capitales sous AA | **corrigées maintenant** |

L'espace privé (les 42 écrans derrière `/user-portal` et `/admin`) n'est pas dans cette portée : il
reste dans le dessin du logiciel.

### Ce qui est écrit une fois, désormais

Deux fichiers portent le dessin, et les pages composent avec :

- **`lib/site-design.ts`** — le vocabulaire : `EYEBROW`, `TITLE`, `LEAD`, `BODY`, `HAIRLINE`,
  `SITE_BAR`, `WORDMARK`, `PANEL` / `PANEL_INNER` / `PANEL_SPACING`, `CARD`, `CARD_INK`,
  `PILL_CALL` / `PILL_INK` / `PILL_GHOST` / `PILL_ACCENT`, `PILL_SMALL*`, `FIELD`, `LINK_QUIET`.
  Aucune couleur en dur : tout passe par les jetons `--agency-*` mesurés au lot 1.8.
- **`components/SiteChrome.tsx`** — l'ossature : `SiteHeader` (barre fixe fine et floutée,
  `aria-current` sur la page courante, emplacement `actions` pour l'appel propre à la page),
  `SiteFooter` (identité de l'agence, pages du site, trois textes légaux, année), `SiteHero`,
  `SitePanel`, `SiteSection`, `PillChoice` (`role="group"` + `aria-pressed`, l'état ne repose pas sur
  la couleur).

Deux contraintes expliquent des choix qui peuvent surprendre :

- **les liens sont des `<a href={sitePath(...)}>`, pas le routeur** : les pages publiques sont
  rendues dans les tests hors de tout `Router`, et le pré-rendu du lot 2 les servira comme des
  documents. `sitePath()` pose le préfixe si le site est servi sous un sous-répertoire ;
- **la barre ne lit aucune session** (contrôlé par test : ni `useAuth`, ni `SignedIn`) : une page
  publique reste entière quand l'authentification n'est pas configurée, comme le veut
  `lib/public-shell.ts`.

### Les pages reprises

| Page | Avant | Après |
| --- | --- | --- |
| `/` accueil | 48 hexadécimaux en dur, fond animé invisible, gris à 3,76:1 | jetons `--agency-*`, plus de fond animé, œil-de-bœuf à 7,08:1 |
| `/agence` vitrine | en-tête absolu, hero 92 dvh, titres serif, étapes en filets, voile de citation à 25 % | barre fixe partagée, hero plein écran, panneaux bordés, quatre cartes `rounded-3xl`, pilules 44 px, voile à 55 % |
| `/mentions-legales` | page de texte à part, liens carrés | barre + hero + panneaux + `SiteSection`, encadré « à compléter » en carte, pilules |
| `/confidentialite`, `/conditions` | dessin du logiciel (`foreground/35`, `/48`), routeur | même ossature que les mentions, texte courant sur jeton mesuré |
| `/rsvp/:token` | gris à `/50`, `/55`, `/60` (3,9 à 4,7:1), cartes `bg-card` | œil-de-bœuf partagé, titres en `TITLE`, cartes `CARD`, champs `FIELD`, pilules, pied de page public |
| `/bilan/:projectId` | titre serif, aucun pied de page | états vide et chargement en `TITLE`/`EYEBROW`, pied de page public (pas de barre : le bilan s'ouvre depuis un lien envoyé aux mariés) |
| `/monde` la Bande | sa propre copie de la barre, du pied de page et de l'œil-de-bœuf | `SiteHeader` + `SiteFooter`, constantes `EYEBROW`/`PANEL`/`CARD` — 5 panneaux et 4 cartes ne recopient plus leurs valeurs |

### Les trois corrections, chiffrées

1. **AA sur les petites capitales.** `.aime-apple-eyebrow` et `.aime-apple-confiance` posaient du
   texte à `foreground / 0.55`, soit **3,98:1** sur blanc (mesure recalculée depuis
   `--foreground: 30 12% 9%`) — sous le seuil AA de 4,5:1. Passées à `0.72`, soit **7,08:1**. Ces
   deux classes servent l'accueil, l'assistant et les dossiers : la correction porte partout d'un
   coup. L'accueil aggravait le cas en recopiant `#8A8375` (**3,76:1**) six fois par-dessus la
   classe, et la réponse d'un invité utilisait `foreground/50`, `/55` et `/60` : tout est passé aux
   jetons (`--agency-eyebrow` 5,20:1, `--agency-body` 5,37:1).
2. **Le fond animé retiré.** `ShaderBackdrop` était `fixed inset-0 z-0`, donc recouvert par le voile
   blanc du hero et par des sections toutes opaques, pied de page compris : un contexte WebGL animé
   en continu que personne ne voyait. Composant supprimé, dépendance
   `@paper-design/shaders-react` retirée du paquet et du lockfile, chunk `vendor-shaders` supprimé de
   la configuration Vite. Le test de l'accueil interdit son retour sans décision de le rendre
   visible. Au passage : le commentaire du composant annonçait une palette rose/magenta, le test un
   « fond bleu-vert signature » — les deux ne décrivaient plus le même objet.
3. **Le voile de la citation de la vitrine**, de 25 % à 55 % d'encre : sur une photographie le
   contraste n'est pas calculable, on tient donc l'opacité. À 55 %, le blanc donne **3,98:1** sur la
   zone la plus claire possible, au-dessus des 3:1 exigés pour du grand texte (30 px et plus,
   graisse 600) ; à 25 % on tombait à **1,72:1**.

### La décision de typographie — **à confirmer**

« Tout le site comme l'accueil » a une conséquence que je n'ai pas voulu trancher seul : l'accueil
titre en **sans** (la police d'affichage du logiciel), la vitrine titrait en **serif**
(`--agency-serif`, pile Didot/Bodoni), et c'était l'identité éditoriale posée au lot 1.8. J'ai suivi
la demande littéralement :

- **le site public parle en sans** — accueil, vitrine, mentions, textes légaux, réponse d'un invité,
  bilan, Bande ;
- **la serif ne reste qu'au livrable d'un couple** (`components/CoupleReport.tsx`), qui est un
  document à lire et à imprimer, pas un écran — et à l'atelier admin (`AdminSommaire.tsx`), hors
  portée publique.

Le test de la vitrine verrouillait la serif (`toContain("agency-serif")`) ; il verrouille désormais
la sans et l'absence de serif. **Le retour arrière tient en une ligne** : remplacer `TITLE` dans
`lib/site-design.ts` par `agency-serif text-[var(--agency-ink)]`, puis rétablir les deux assertions
du test. À confirmer ou à infirmer : c'est la seule perte d'identité de ce lot.

Deux points secondaires, signalés pour décision :

- le pied de page partagé est **en français**, y compris au bas de la page bilingue d'un invité
  (identité de l'agence et textes légaux publiés en français). Les deux titres de colonne (« Le
  site », « Informations légales ») peuvent être traduits au lot 3 si tu le souhaites ;
- la vitrine a gagné deux phrases qui n'existaient pas : une amorce au panneau des livrables
  (« Deux documents, et rien à tenir vous-même. ») et un titre au panneau des prestations
  (« Ce que je tiens pour vous »). Copie de travail, à réécrire si elle ne te convient pas.

### Contrôles après reprise

Typecheck racine OK · **57 fichiers / 382 tests OK** (18 nouveaux : `lib/site-design.test.tsx`
verrouille l'absence de couleur en dur, l'œil-de-bœuf AA, les cibles de 44 px, l'anneau de focus,
l'absence de session dans la barre, les liens passés par `sitePath()`, et surtout que **les six
pages publiques consomment l'ossature** au lieu de la redessiner) · build OK · smoke **31 contrôles
OK**, en nominal et en dégradé : `/agence` 17 534 octets, `/mentions-legales` 14 562,
`/confidentialite` 10 699, `/monde` 104 491, réponse d'un invité 11 846 en français et 11 806 en
anglais.

`agency-theme.test.ts` contrôle maintenant aussi `Legal.tsx`, `SiteChrome.tsx` et `site-design.ts` :
le vocabulaire lui-même ne peut pas recopier une couleur.

### Ce que cela débloque

- le **lot 2** (pré-rendu et SEO) n'aura qu'une ossature à pré-rendre, et non six ;
- le **lot 4** (formulaire de demande) réutilisera `FIELD`, `PILL_INK` et `SitePanel` : le
  formulaire de contact arrivera dans le dessin du site sans nouvelle décision visuelle ;
- le **lot 3** (identité et qualité visuelle) se réduit aux photographies et à la copie réelle,
  puisque les blocs, les rythmes et les contrastes sont posés et mesurés.

---

## 8 quater. La vitrine réorganisée sur le plan de dispoo.app — livré le 14 septembre 2026

Demande de la fondatrice : « fais le même site que dispoo.app, en le remettant en ordre avec le
projet du repo ».

La vitrine `/agence` reprend désormais l'ordre exact de la page d'accueil de dispoo.app, section
par section, au service du positionnement de ce dépôt (l'agence vend le planner, le couple reçoit
des livrables, dispoo reste le partenaire de la recherche de professionnels) :

- **hero** « Votre mariage, tout simplement. » puis les métiers en accès rapide (« Service · Où »,
  recherche dispoo) et les huit domaines en filet ;
- **le Jour J** : le déroulé que le couple reçoit sur sa page, les deux livrables (« Une page. Votre
  Jour J. », « Un rapport, présenté tout seul. »), avec la Bande `/monde` en démonstration ;
- **le Bureau** : six dossiers tenus pour le couple, « tout arrive au bon endroit » ;
- **la méthode en sept étapes** (Imaginer → Trouver → Composer → Orchestrer → Valider → Partager →
  Raconter), comme la visite « en 45 secondes » de dispoo ;
- **les prestations** (inchangées : les cinq annoncées par les données structurées) ;
- **tous les métiers** : les 22 domaines, chacun avec sa propre recherche dispoo ;
- **chacun a sa place** : les quatre points de vue sur le même mariage ;
- **l'appel final** « Votre mariage, tout simplement. ».

Le pont byaime ↔ dispoo gagne un placement `vitrine` (`lib/partner-links.ts`) pour mesurer les
clics sortants de la vitrine. Le **magazine n'est pas mis en ligne** : pas de contenu réel (règle
« aucune section vide ou à venir »). La citation sur photographie garde son voile à 55 % d'encre.

### Contrôles après réorganisation

Typecheck racine OK · **57 fichiers / 383 tests OK** (agency-landing réécrit : 14 tests — marque,
promesse, déroulé, sept étapes dans l'ordre, UTM dispoo `utm_medium=vitrine`, absence de
vocabulaire produit) · build OK (chunk `AgencyLanding` 17,26 Ko / 5,63 gzip) · smoke **CONTRÔLE
LOCAL OK** (vitrine 69 522 octets, en nominal comme en dégradé).

### Fichiers

- **Modifiés** : `src/pages/AgencyLanding.tsx` (réécrit sur le plan de dispoo, données en constantes
  au-dessus du composant), `src/pages/agency-landing.test.tsx`, `src/lib/partner-links.ts`
  (placement `vitrine`), `preview/smoke.mjs` (aiguilles `/agence` mises à jour).

---

## 8 quinquies. Fusion : la Bande devient la page unique — livré le 14 septembre 2026

Demande de la fondatrice : « fusionne tout en une seule page sur la page La bande ».

La Bande (`/monde`) devient **la page unique du site public** : la démonstration du produit et
toutes les sections de la vitrine (réorganisées sur le plan de dispoo.app au lot 8 quater) y sont
désormais assemblées sur une seule page. L'ancienne vitrine `/agence` redirige vers `/monde`, et la
racine `/` (l'accueil) mène à la Bande.

### Ce qui est écrit une fois

- **`components/VitrineSections.tsx`** (nouveau) : les sections de la vitrine, extraites de
  `AgencyLanding.tsx` — image pleine largeur, métiers en accès rapide, domaines, Jour J (déroulé +
  les deux livrables), Bureau, citation, méthode en sept étapes, prestations, tous les métiers
  (recherche dispoo), chacun a sa place, appel final. Le placement des liens dispoo est un paramètre
  (`"bande"` sur la Bande), pour que chaque clic sortant reste mesurable.
- **`pages/Bande.tsx`** assemble : hero → démonstration (phrase, faits, régie, échelles, la Bande,
  tiroir) → note de périmètre → `VitrineSections` → pied de page. La section « La Bande » porte
  l'ancre `#bande`, cible du lien « Revoir la démonstration » du panneau Jour J.

### Ce qui a bougé autour

- **`lib/public-shell.ts`** : `resolveDegradedView` sert la Bande sur `/`, `/agence` et `/monde`
  (une page, trois chemins d'entrée) ; le type `DegradedView` perd la vue `agency`.
- **`App.tsx`** : `/agence` redirige vers `/monde` ; `AgencyLanding` supprimée (son JSON-LD
  `ProfessionalService` n'est plus injecté tant que la page est un prototype `noindex` — il revient
  avec le pré-rendu du lot 2).
- **Liens croisés** : `Landing`, `PrivateLayout`, `AdminSommaire`, `Mentions`, `SiteChrome`
  (`SITE_NAV` = la Bande seule) pointent vers `/monde` ; plus aucun lien vers `/agence`.
- **Supprimés** : `src/pages/AgencyLanding.tsx` et `src/pages/agency-landing.test.tsx` ; les
  contrôles de thème et d'ossature couvrent désormais `VitrineSections.tsx`.

### Contrôles après fusion

Typecheck racine OK · **56 fichiers / 368 tests OK** (agency-landing supprimé −14, un test
public-shell fusionné −1 ; bande.test, landing.test, public-shell.test, site-design.test,
mentions.test et private-shell-ui.test réécrits sur la nouvelle réalité) · build OK (chunk `Bande`
49,21 Ko / 13,86 gzip, la vitrine incluse) · smoke **CONTRÔLE LOCAL OK** — `/monde` rend la page
unique (165 672 octets, nominal et dégradé), `/agence` redirige (rendu vide, 277 octets).

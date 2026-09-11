# Proposition de design — Landing AIME

> Direction retenue avec la fondatrice : **« l'Apple du mariage »** — un site universel,
> accessible à tous, avec beaucoup d'espace, de grands visuels immersifs de qualité,
> de grands titres et un texte bien structuré. Référence : apple.com/fr.
> Statut : **implémentée sur la landing** (`src/pages/Landing.tsx`), maquette `design/index.html` mise à jour.

---

## 1. Analyse de la landing actuelle

### Forces (à conserver)

- **Fond signature animé** : `ShaderBackdrop` (MeshGradient Paper, `#00BBCD → #00BAE7 →
  #71EBA8 → #005DB8`) + voile bleu nuit. Identité « cinématique » cohérente avec
  « L'art de créer des liens ».
- **Typographie premium** : Plus Jakarta Sans + Inter, wordmark espacé, eyebrows espacées.
- **Discipline colorielle** : monochrome + **un seul accent** (rose `348 83% 47%`).
- **Onboarding intégré au hero** (`LandingComposer`, « l'univers d'abord, puis une
  information à la fois ») : différenciant fort, conversion sans friction.
- **Accessibilité** : toggle clair/sombre, `prefers-reduced-motion`, langage intergénérationnel.

### Faiblesses (points de friction)

1. **Le produit n'est jamais montré dans le hero** : 100 % texte + formulaire.
2. **Narration inversée pour un produit neuf** : promesse → formulaire → (plus bas) preuves.
3. **Zéro preuve sociale** (témoignages, presse, nombre de couples).
4. **Mode clair inopérant sur la landing** (tout est `text-white` sur fond sombre constant).
5. **Page « plate »** : un seul fond continu, pas de visuel par bénéfice — alors que
   `public/images/wedding/*` (astronautes + argentique charbon/ivoire/champagne) existe.
6. **Performance** : bundle unique ~1 Mo (gzip 291 Ko), pas de code-splitting.

### Diagnostic

L'ADN visuel est bon ; ce qui manque, c'est **l'espace, le rythme, les grands visuels et
la preuve** — exactement ce qu'apporte la grammaire Apple.

---

## 2. La direction « Apple du mariage »

On garde l'essence AIME (onboarding, guides, palette rose, ton chaleureux) et on adopte la
**grammaire visuelle Apple** :

- **Un message par écran.** Une section = un grand titre + une phrase + un ou deux liens.
- **De l'espace partout.** Sections très hautes (~90–100vh), marges généreuses, densité minimale.
- **De grands visuels immersifs pleine page.** La photographie remplace le fond shader
  comme vecteur principal ; le shader ne sert plus qu'en touche d'ambiance.
- **De grands titres** (48–96 px), graisse semi-bold, interlignage serré.
- **Une navigation minimale et discrète** (barre fine, floue, qui s'efface au défilement).
- **Un produit « mis en scène »** comme Apple montre l'iPhone : le Monde Mariage
  affiché en grand, plein écran, comme un objet désirable.

### Structure section par section

1. **Nav fine** (48 px, flou saturé, fond noir translucide) : logo AIME · « Comment ça
   marche » · « Guides » · FR/EN · thème · « Se connecter » · CTA pilule « Créer mon espace ».
2. **Hero plein écran** : eyebrow, titre géant « Tout votre mariage. Un seul espace. »,
   une phrase, deux actions (CTA pilule + « Voir comment ça marche › »), ligne de
   confiance. Visuel plein écran (`landing-hero-astronauts.jpg`) avec lent mouvement,
   **teinté du vert-bleu du fond signature** (voile léger, sans ombre écrasante).
3. **Le produit** : « Un espace né d'une simple phrase. » + **fenêtre du Monde Mariage**
   en grand (sidebar, anneau de progression rose, statistiques, timeline Avant/Jour J/Après),
   **sobre** : pastilles neutres, ombre discrète.
   C'est ici que vit l'onboarding/démo vivante.
4. **Trois temps pleine page** (Avant / Jour J / Après) : un visuel immersif chacun
   (`wedding-guests.jpg`, `wedding-reception.jpg`, `wedding-portrait.jpg`), titre, phrase,
   deux liens en texte simple (voile léger, plus sobre).
5. **Pourquoi AIME** : 4 valeurs (Privé · Gratuit · Simple pour tous · Disponible partout),
   icônes fines, beaucoup d'espace, sans cartes criardes.
6. **Témoignage** : une grande citation, typo display.
7. **CTA final** : titre géant + bouton rose unique (« Créer mon espace gratuitement »).
8. **Footer type Apple** : fine print, colonnes Produit / AIME, mentions légales.

### Tokens de design

| Élément | Valeur |
| --- | --- |
| Fond | noir `#000`, surface `#0b0b0d`, texte `#f5f5f7`, secondaire `#a1a1a6`, tertiaire `#86868b` |
| Accent | rose `hsl(348 83% 55%)` — CTA principal + progression uniquement |
| Titres | Plus Jakarta Sans, semi-bold (600), 48–96 px, `letter-spacing -0.02em`, interligne 1.03–1.06 |
| Corps | Inter, 17–21 px, interligne 1.5, max 660 px |
| Eyebrows | 12 px, majuscules, `letter-spacing .22em`, gris |
| Boutons | pilules (`border-radius 980px`) : blanc sur noir + un seul rose (CTA final) |
| Liens | texte accent + chevron « › », souligné au survol |
| Espace | sections 150 px vertical, sections immersives ~92vh |
| Visuels | bibliothèque `public/images/wedding/*`, pleine page, voile dégradé noir pour le contraste |
| Motion | Ken Burns lent sur le hero, scroll-reveal doux, tout coupé par `prefers-reduced-motion` |

### Ce que je change par rapport à l'existant

- Le **fond shader** cède la place à la **photographie pleine page** (le shader peut rester
  en halo d'ambiance derrière le hero, mais n'est plus le support principal).
- Les titres passent de light à **semi-bold**, plus « Apple », plus lisibles.
- L'**onboarding** sort du hero pour devenir la **section produit** (la démo vivante).
- Le **mode clair** devient réel : en clair, le site passe sur fond clair (blanc/ivoire),
  mêmes médias, mêmes fonctions (règle `accessible-appearance`).
- Ajout de la **preuve sociale** et du **témoignage**.
- L'**animation de guides** quitte l'accueil : la landing propose des **liens directs** vers
  `/guides` (l'animation factice n'est pas représentative de l'app) ; les démos animées
  restent sur la page Guides.
- **Code-splitting** (`React.lazy` sur `/user-portal`, `/profile`, `/profil/:id` + chunks
  fournisseurs) pour un accueil léger (−68 % de JS initial).

### Ce que je garde

L'onboarding « une information à la fois », les guides animés, la palette rose unique, le
langage intergénérationnel, l'accessibilité, et l'idée d'un espace privé chaleureux.

---

## 3. Maquette

`design/index.html` est une **maquette statique autonome** de cette direction (HTML/CSS seul,
aucune dépendance). Servie en aperçu live, elle montre le rythme, l'espace, la typo et les
visuels pleine page. Les images sont des copies de la bibliothèque existante
(`design/assets/`). La maquette est jetable : elle ne touche ni l'app ni les tests.
Les pictogrammes sont des **icônes fines en SVG** (pas d'emojis), comme demandé.

---

## 4. État de mise en œuvre (dans l'app)

**Fait — la landing** (`artifacts/byaime-onepage`) :

- `src/pages/Landing.tsx` : réécrit sur la direction Apple (nav fine fixe, hero plein écran
  sur photo, vitrine produit, trois temps immersifs, valeurs, témoignage, CTA final, footer).
- `src/components/LandingShowcase.tsx` (nouveau) : fenêtre « Monde Mariage » en grand —
  sidebar, anneau de progression rose, statistiques, Timeline Avant / Jour J / Après —
  avec **icônes fines lucide** (LayoutDashboard, Users, Coins, Briefcase, CalendarDays,
  Camera, MapPin, Utensils, Mail, Flower2, Check) : aucun emoji.
- `src/index.css` : tokens `aime-apple-*` (surface clair/sombre, overlay photo, ken burns,
  typo, boutons-pilules, fenêtre produit).
- `src/lib/i18n-dictionary.ts` : clés FR/EN de la nouvelle narration + vitrine.
- `src/pages/landing.test.tsx` : mis à jour (9 tests) ; la suite complète est verte.
- Le mode clair est **réel** sur les sections produit/valeurs/témoignage/CTA ; les sections
  photographiques gardent un texte blanc sur voile noir (les médias ne sont jamais un thème).
- L'onboarding (`LandingComposer`), les guides animés et le fond shader sont conservés.

**Restant — le reste de l'application** (prochaine étape, mêmes principes) :

1. `/guides` — page Guides sur la même grammaire (grands titres, espace). ✅ **fait**
2. `/creation` + `/connexion` — écrans d'authentification habillés (hero photo, cartes sobres). ✅ **fait**
3. `/user-portal` + Monde Mariage (`ProjectStage`) — appliquer les pilules, la typo et les
   icônes fines (remplacer les éventuels emojis par lucide) sans toucher à la mécanique. ✅ **fait** :
   titres passés de light à **semi-bold** sur le Monde (hero, Musique, Personnes, Timeline),
   les panneaux (`CenteredBlock`, Jour J), le profil public, le Fil, la page légale, le 404
   et le sélecteur de Monde ; l'onboarding privé aligné sur l'accueil ; icônes lucide déjà en
   place partout (aucun emoji décoratif dans `src/`).
4. **Footer complet type Apple** — colonnes (Marque / Produit / Légal) + fine print légal et
   copyright, sur la landing. ✅ **fait**
5. **Code-splitting** — découpage des dépendances en chunks stables (`vite.config.ts`,
   `manualChunks`) : l'entrée applicative passe de **1 235 kB → 607 kB** (gzip 357 → 161 kB),
   les bibliothèques lourdes (react, clerk, framer-motion, react-query, date-fns, recharts,
   shaders, icônes) sont chargées en parallèle et restent en cache d'un déploiement à l'autre.
   Aucun composant modifié : rendu serveur et contrôles intacts. ✅ **fait**
6. **Code-splitting par route** — `React.lazy` + `Suspense` sur `/user-portal`, `/profile` et
   `/profil/:id` : l'espace privé (Monde Mariage, panneaux, Timeline) et le profil public ne
   sont plus téléchargés par le visiteur de l'accueil. Entrée applicative **607 kB → 400 kB**
   (gzip 161 → 113 kB), `Home` (165 kB) et `PublicProfile` (47 kB) chargés à la demande et
   non préchargés sur l'accueil. Le contrôle SSR (`preview/smoke.mjs`) rend désormais en flux
   (`renderToPipeableStream`) pour vérifier le contenu réel des routes différées. ✅ **fait**

---

## 5. Priorités de mise en œuvre (dans l'app)

1. **Hero plein écran + photographie** (remplace le shader en support principal).
2. **Section produit** : fenêtre du Monde Mariage en grand (l'équivalent de l'iPhone chez Apple).
3. **Trois sections immersives** Avant / Jour J / Après avec les visuels existants.
4. **Preuve sociale + témoignage + footer enrichi.**
5. **Mode clair réel** sur la landing.
6. **Code-splitting.**

Le tout **sans casser** l'onboarding, les guides ni les tests existants (`landing.test.tsx`
reste le gardien des décisions produit ; il faudra le mettre à jour en cohérence avec la
nouvelle structure).

---

## 6. Références dans le code

| Élément | Fichier |
| --- | --- |
| Structure de la landing | `artifacts/byaime-onepage/src/pages/Landing.tsx` |
| Capsule d'onboarding | `artifacts/byaime-onepage/src/components/LandingComposer.tsx` |
| Fond shader | `artifacts/byaime-onepage/src/components/ShaderBackdrop.tsx` |
| Tokens (palette, typo) | `artifacts/byaime-onepage/src/index.css` |
| Manifeste photos | `artifacts/byaime-onepage/src/lib/assets.ts` |
| Toggle apparence | `artifacts/byaime-onepage/src/components/AppearanceToggle.tsx` |
| Copie (FR/EN) | `artifacts/byaime-onepage/src/lib/i18n-dictionary.ts` |
| Maquette | `design/index.html` |
| Règles produit | `.agents/memory/accessible-appearance.md`, `interaction-density.md` |
| Audit (perf, mode clair) | `docs/audit-erreurs-site-2026-09-11.md` |

# Carte AIME — format v1

*Statut : implémenté et testé côté AIME (import). Gelé tant que v2 n'est pas décidée ensemble.*

La Carte AIME est le **transport** entre le premier site et AIME — pas une base
de données. Le fichier (ou le même JSON copié-collé) décrit ce que le couple a
déjà renseigné ailleurs ; AIME le lit, montre ce qu'il a compris, et **rien ne
s'applique sans confirmation**. Après confirmation, le WorldProject devient la
seule source de vérité : la carte n'est jamais stockée à côté.

Un mariage = un fichier. Deux transports, zéro système parallèle :

- **Option A — fichier** : `carte-aime.json` téléchargé depuis le premier site, déposé dans AIME ;
- **Option B — code collé** : le même JSON, copié-collé dans le même champ.

## Le schéma (15 clés, flat)

```json
{
  "kind": "carte-aime",
  "version": 1,
  "name": "Camille Dupont & Léo Martin",
  "headline": "Notre mariage, le 14 août 2027 à Lyon",
  "bio": "Deux rencontres, une histoire…",
  "image_url": "https://premier-site.fr/photo.jpg",
  "category": "couple",
  "skills": [],
  "city": "Lyon",
  "wedding_date": "2027-08-14",
  "venue": "Domaine du Bois",
  "guests": 120,
  "budget": 20000,
  "currency": "EUR",
  "music": { "title": "Sign of the Times", "artist": "Harry Styles", "url": "https://…" }
}
```

| Clé | Type | Requis | Destination dans AIME |
| --- | --- | --- | --- |
| `kind` | `"carte-aime"` | oui* | enveloppe — ignorée proprement |
| `version` | `1` | oui* | enveloppe — ignorée proprement |
| `name` | texte | **requis** | titre du Monde |
| `headline` | texte | non | sous-titre du Monde (avant `bio`) |
| `bio` | texte | non | sous-titre du Monde (si pas de `headline`) |
| `image_url` | URL | non | visuel de couverture du Monde |
| `category` | texte | non | aucun (contexte v1 — destination agence plus tard) |
| `skills` | texte[] | non | aucun (contexte v1 — destination agence plus tard) |
| `city` | texte | non | ville |
| `wedding_date` | `AAAA-MM-JJ` (ou ISO, `JJ/MM/AAAA`) | **requis** | date pivot du Monde |
| `venue` | texte | non | lieu |
| `guests` | nombre | non | nombre d'invités |
| `budget` | nombre (unités majeures : `20000` = 20 000 €) | non | budget total |
| `currency` | code ISO (`EUR`…) | non | devise, si absente du Monde |
| `music` | `{ title?, artist?, url? }` | non | une piste de musique (voir plus bas) |

\* L'enveloppe `kind`/`version` est tolérée absente pour un import, mais le
premier site doit toujours l'émettre : c'est ce qui permettra de faire évoluer
le format sans casser les anciennes cartes.

### Règles de lecture

- **`wedding_date` est obligatoire** : sans date lisible, l'import est refusé
  (`ok: false`) — mieux vaut un refus clair qu'une date inventée.
- Le nom vient de `name` uniquement. Une accroche, un sous-titre ou une date ne
  peuvent jamais prendre sa place (les pièges « su**btitle** », « **wedding**date »
  sont filtrés par des tests).
- Correspondance **exacte** pour les champs de contexte ; le reste est ignoré,
  jamais inventé.
- L'import accepte aussi, au-delà de la carte, le **Dossier Jour J**
  (`kind: "dispoo/dossier-jour-j"`, voir `src/lib/dispoo-dossier.ts`) et tout
  JSON de site de mariage reconnu par l'import universel — la carte en est le
  cas le plus simple.

## Ce qui se passe côté AIME

1. **Porte d'entrée** : le héros propose « Importer ma carte » (principal) ou
   « Commencer sans carte » (alternative). Jamais de question déjà connue.
2. **Lecture** : `parseCarteText` — une seule lecture pour fichier, code collé
   et reprise de brouillon.
3. **« Voici ce que nous avons compris »** : le plan montre tout ce qui sera
   créé ou complété (titre, ville, lieu, invités, budget, sous-titre, visuel,
   musique…). Rien ne s'applique en silence ; les doublons sont signalés.
4. **Confirmation** :
   - connecté : le Monde est créé ou complété immédiatement (les blancs sont
     remplis, jamais l'inverse — les textes du couple sont conservés) ;
   - **visiteur non connecté** : la carte confirmée attend en local
     (`aime-carte-pending`), le même cycle de vie que la phrase d'intention —
     consommée **une fois** à l'hydratation qui suit la création du compte,
     puis supprimée.
5. **Rôle** : « Qui êtes-vous dans ce mariage ? » — routage pur vers les
   mécanismes existants (mariés → Monde, invité → lien RSVP, prestataire → lien
   pro, planner → espace agence).

### La musique de la carte

`music` devient **une** piste tracée `intégration` :

- `artist` connu → piste `valide` ;
- `artist` absent → piste `à choisir` : le parcours iTunes existant du panneau
  Musique prend le relais (aucune recherche bloquante à l'import) ;
- `url` → conservée telle quelle en note de la piste ;
- doublon (même titre, casse et accents ignorés) → aucune piste de plus.

## Évolution du format (v2 et au-delà)

- Une nouvelle clé = une nouvelle destination dans AIME, décidée ensemble —
  jamais « au cas où ». Les clés inconnues sont ignorées sans erreur : les
  anciens lecteurs tolèrent les cartes plus riches.
- Ne jamais renommer une clé ; en ajouter une et garder l'ancienne si besoin.
- `version` sert à négocier : un lecteur qui ne connaît pas une version refuse
  proprement au lieu de deviner.

## Implémentation (côté AIME)

- Lecture et mappings : `src/lib/universal-import.ts` (`parseCarteText`, jeux de clés `*_KEYS`) ;
- Schéma dossier + propagation + assemblage : `src/lib/dispoo-dossier.ts`
  (`dossierToProjectDraft`, `buildProjectFromDossier`, `planDossierPropagation`) ;
- Écrans : `src/components/CarteImport.tsx` (porte), `DossierImport.tsx`
  (« compris »), `RoleChoice.tsx` (rôle) ;
- Brouillon visiteur : `src/lib/intention-draft.ts` (`*PendingCarte`), consommé
  dans `src/store/project-store.tsx` (hydratation).

## Export côté premier site (gelé)

**L'export ne doit pas être implémenté tant que ce contrat d'import n'est pas
en place et testé.** Il l'est désormais (cette spécification + 515 tests) : le
premier site peut produire exactement ce JSON — depuis ses tables existantes
(`cards`, `musicbox_entries`) — et les deux produits restent indépendants.

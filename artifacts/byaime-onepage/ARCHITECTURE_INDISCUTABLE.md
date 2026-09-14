# Architecture indiscutable — byaime one-page

> **Thèse** : Un mariage est un projet temporel avec des personnes, des prestataires, des tâches, des documents, une organisation et de la musique. Tout le reste est du bruit. L'architecture qui gagne est celle qui supprime le bruit sans perdre la réalité.

Date: 2026-09-14 — après P0/P1/P2 (377 tests verts)

---

## 1. Principes non négociables

1. **Local-first, offline, privé** : le Monde est un fichier. `project` tient dans `localStorage` + `IndexedDB` pour les blobs. Pas de S3 obligatoire. DataURL ≤8Mo. Tout suit la sauvegarde du navigateur.
2. **Single source of truth** : `WorldProject` dans `project-store.ts`. Pas de duplication entre `guests`/`seating`, `providers`/`budget`, etc. Une entité = un tableau.
3. **Timeline = colonne vertébrale** : chaque moment a `time`, `phase` (avant/pendant/après), `visibility`, `relations`. Tout le reste s'y accroche (prestataire, musique, document).
4. **Navigation = modèle, pas UI** : `wedding-navigation.ts` est une fabrique pure testée. Pas de texte figé, traduite à la source via `i18n-dictionary`.
5. **Design tokens** : `paper`, `ink`, `hairline`, `eyebrow`, `body`. Pas de `#171410` hardcodé. Fond blanc par défaut, visuel optionnel.
6. **API optionnelle, pas requise** : `apiAvailable` flag. Si fetch échoue, on masque RSVP, on simule messages en local, on n'explose pas.

Ces 6 règles rendent l'archi indiscutable : si tu les violes, tu casses offline ou tu dupliques.

---

## 2. Modèle de données canonique

```
WorldProject {
  id, title, pivot (date mariage), universe,
  heroVisual: WorldVisual | null, // image dataURL ou URL video + overlay 0-100
  timeline: TimelineEvent[],       // colonne vertébrale
  guests: Guest[], tables: Table[], // Personnes inclut plan de table
  providers: Provider[], payments: Payment[], // Prestataires inclut budget
  tasks: Task[],
  documents: Document[], // Galerie unifiée: images dataURL, videos dataURL, pdfs
  memoryChecklist: ChecklistItem[], // ex-Memories
  ceremony: Ceremony, // menu, drinks, cake, firstDance, structure, readings, vows
  logistics: Logistics, // parking, accessibility, weather, packing, emergencyContacts
  team: TeamRole[], // rôles jour J
  music: MusicTrack[], // liaison timeline
  messageTemplates: MessageTemplate[], // modèles locaux + copy
}
WorldVisual { kind: "image"|"video", url: dataURL|https, name?, overlay: 0-100 }
```

Règle : **un tableau = un concept métier**. Pas de `seating` séparé (c'est `guests.tableId`), pas de `budget` séparé (c'est `providers.budget` + `payments`).

---

## 3. Navigation — pourquoi rail + mode est indiscutable

### Invariant d'unicité
`rail + primary + secondary` doit avoir des `id` uniques. Testé dans `wedding-navigation.test.ts`. Ça empêche le doublon mental : si "Logistique" est dans le rail, elle ne peut pas être aussi en horizontal.

### Rail = socle commun (7 items, identique avant/pendant/après)
- `timeline` (Avant / Live / Replay selon phase)
- `people` → `guests` (inclut seating)
- `providers` → `providers` (inclut budget)
- `tasks` → `planning`
- `documents` → Galerie unifiée (documents+memories+film+contributions+thanks)
- `logistics` → Organisation unifiée (ceremony+logistics+team)
- `music`

Pourquoi 7 et pas 12 ? Loi de Miller + réalité terrain : un couple ne veut pas 12 entrées. 7 = max mémorisable. Finances et Team étaient des doublons cognitifs, supprimés.

### Horizontal = outils du mode (période)
- **Avant** : `[messages]` — seul outil vraiment temporel (préparer les envois). Logistique est déjà dans rail.
- **Pendant** : `[dayof, public-info, messages]` — déroulé, infos invités, messages jour J
- **Après** : `[]` — vit dans projet séparé (choix assumé)

Si demain tu veux ajouter "Lune de miel", tu l'ajoutes en `secondary` de `pendant` OU en rail si c'est un socle. Mais tu ne dupliques jamais.

### Filtrage par rôle
`getWeddingCapabilities(role)` → `isWeddingEntryAllowed(entry, caps)` : family/viewer ne voient pas finances/documents/film. Testé.

### Normalisation legacy
`normalizePanelId(panel)` :
- seating→guests, budget→providers
- memories/film/contributions/thanks→documents
- ceremony/team→logistics

Utilisé partout : `ProjectStage.openPanelSafely`, `setActivePanelNormalized`, `findPhaseForPanel`, `getPanelContextGroup`, `isWeddingPanelAvailable`, `PANEL_FOR_KIND`. Résultat : un vieux deep-link `/panel=seating` ne casse pas, il atterrit dans Personnes.

---

## 4. Panels — fusion P2 expliquée

### Documents → Galerie unifiée
Avant : 4 panels qui faisaient la même chose (afficher des fichiers) avec 4 implémentations API différentes (S3, participant-media, film approved, memories approved). Maintenant : 1 composant, 1 source (`project.documents` dataURL), 4 filtres.

UI :
- Tabs All / Images / Vidéos / Docs
- Grid images + lightbox `z-[100]` `bg-black/80`
- Grid vidéos `<video controls>`
- Docs list + download
- Checklist souvenirs intégrée
- Note offline : "Contributions invités → importez par mail ici"

Code : `WeddingModulesPanel.tsx` module `documents` — hooks au top, pas dans `if`.

### Logistique → Organisation unifiée
Avant : 3 panels pour le même jour (Cérémonie, Logistique, Équipe). Maintenant : 1 panel avec 3 onglets internes.

- Cérémonie : notes, menu, drinks, cake, firstDance, structure éditable, readings, vows
- Logistique : parking, access, weather, packing checklist, emergencyContacts
- Équipe : `<details>` accordéon, CRUD rôle/person/tasks

### Personnes + Prestataires
Déjà P1 :
- Personnes : liste invités + plan de table + assignation `tableId`
- Prestataires : 4 KPIs (estimé/engagé/payé/restant) + répartition par catégorie + échéancier payments CRUD

---

## 5. Visuels — hero + moments

`VisualImportControl` : FileReader → dataURL (≤6Mo image) ou URL https (image/video). Stocke `WorldVisual` avec overlay 0-100.

- `ProjectStage` : si `heroVisual.url` → `img/video` absolute + overlay `heroVisualOverlayCss(visual)` + texte blanc, sinon fond `paper` + texte ink.
- `UniversalTimeline` : `AmbientBackground` rendait `bg-[#FFFFFF]` fixe → corrigé pour rendre `event.visual` + `momentVisualOverlayAlpha`.

Résultat : éditeur visuel fond + importateur visuel timeline fonctionnent vraiment local-first.

---

## 6. Store & persistance

- `useProject()` → Zustand + `persist` localStorage + IndexedDB pour blobs >5Mo si besoin
- `syncStatus: "saved"|"saving"|"error"`, `syncError`
- `apiAvailable` détecté par try/catch sur `/api/projects/:id/rsvp-links` — si 404/offline, masque boutons RSVP
- Pas de `putStorageFile` XMLHttpRequest, plus de `AIME LOCAL` bridge (supprimé P0)

---

## 7. Frontières API (ce qu'on garde, ce qu'on jette)

| Fonction | Avant (cassé) | Maintenant (indiscutable) |
|---|---|---|
| Documents upload | S3 `request-url` + `putFile` | dataURL local 8Mo max |
| Memories/Film galerie | `/storage/files` approved | documents locaux |
| Contributions | `/participant-media` | import mail → documents |
| Messages envoi | `/messages` Resend | modèles locaux + bouton Copier |
| RSVP links | `/rsvp-links` | masqué si api absent |
| Music | iTunes search | gardé (client-side) + manuel, song-requests supprimé |
| AIME LOCAL | bridge Node+S3 | supprimé |

Règle : si ça nécessite backend pour fonctionner, soit on le masque, soit on le remplace par local. On ne laisse jamais un bouton 404.

---

## 8. Organisation des fichiers

```
src/lib/wedding-navigation.ts   # modèle navigation pur + normalize
src/lib/types.ts                # WorldProject, WorldVisual, overlay helpers
src/store/project-store.ts      # Zustand + persistence
src/components/ProjectStage.tsx # header blanc, heroVisual, openPanelSafely normalize
src/components/CommandBar.tsx   # WORLD_ICONS = rail icons (Settings pour logistics)
src/components/VisualImportControl.tsx # import image dataURL + URL video + overlay
src/components/UniversalTimeline.tsx # AmbientBackground visuel + overlay
src/components/panels/
  GuestPanel.tsx                # personnes + plan table
  ProviderPanel.tsx             # prestataires + budget
  WeddingModulesPanel.tsx       # documents galerie + organisation + legacy redirects
  DayOfPanel, PracticalPanel...
src/lib/i18n-dictionary.ts      # traduction à la source
```

---

## 9. Tests qui verrouillent l'indiscutable

- `wedding-navigation.test.ts` : Timeline first, rail+nav unique, rail = [Timeline, Personnes, Prestataires, Tâches, Documents, Logistique, Musique], avant=[Messages], pendant=[dayof, public-info, messages]
- `private-i18n.test.ts` : EN rail = [Timeline, People, Vendors, Tasks, Documents, Logistics, Music]
- `admin-plan.test.ts` : concevoir contient timeline, providers, documents, logistics, messages (plus ceremony séparé)
- `apres-modules.test.ts` : thanks/memories/film fusionnés → Galerie
- 377 tests verts = archi verrouillée

---

## 10. Roadmap pour rester indiscutable

- **PWA** : `vite-plugin-pwa` + export `.byaime` (JSON + dataURLs) + import
- **Perf** : virtualisation timeline si >200 events, compression images via canvas avant dataURL
- **Accessibilité** : lightbox focus trap, `aria-label` déjà présent
- **Pas de retour en arrière** : ne jamais recréer `seating`, `budget`, `ceremony`, `team`, `memories`, `film`, `contributions` comme panels séparés. Si besoin, ajouter un onglet dans Galerie ou Organisation.

---

## TL;DR

- 1 fichier = 1 mariage
- Timeline = spine
- Rail 7 = socle mémorisable, horizontal = temporel, unique IDs
- Galerie unifiée + Organisation unifiée = 0 doublon
- Local-first dataURL, API optionnelle
- Design tokens blanc/paper/hairline, pas de jaune
- 377 tests qui empêchent de revenir en arrière

C'est indiscutable parce que chaque décision supprime une classe de bugs : offline cassé, doublon cognitif, bouton 404, deep-link mort, texte illisible sur visuel sombre.

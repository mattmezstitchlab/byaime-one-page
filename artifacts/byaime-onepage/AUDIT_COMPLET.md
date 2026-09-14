# Audit complet — byaime one-page — header blanc + visuels + boutons

Date: 2026-09-14
Branche: arena/01a09e0c-byaime-one-page

## Ce qui a été corrigé

### 1) Header jaunâtre → blanc
- **Cause**: `ProjectStage.tsx` nav `bg-card/95` où `bg-card = hsl 36 22% 93%` = beige jaunâtre. `WorldTopMenu.tsx` dropdown `bg-[#FFFFFF] border #E6E1D8` + parent jaunâtre = impression jaune.
- **Fix**:
  - `ProjectStage nav`: `bg-[var(--agency-paper)]/95 border-[var(--agency-hairline)]`
  - `WorldTopMenu`: tout en `bg-[var(--agency-paper)]`, `border-[var(--agency-hairline)]`, `text-[var(--agency-body)]`, hover ink
  - `PrivateLayout header`: `bg-[var(--agency-paper)]/95 border-[var(--agency-hairline)]`
  - `PortalBackdrop`, `ProjectStage hero`, `UniversalTimeline AmbientBackground`: fond `var(--agency-paper)` par défaut

### 2) Éditeur visuel fond (heroVisual) ne fonctionnait pas
- **Cause**: `VisualImportControl` sauvegardait bien `project.heroVisual` via `updateProject`, mais `ProjectStage header` n'affichait jamais `project.heroVisual` — il avait `<div bg-[#FFFFFF]>` fixe.
- **Fix**: header affiche maintenant:
  - si `heroVisual.url` image → `<img>`
  - si video → `<video autoPlay muted loop>`
  - overlay via `heroVisualOverlayCss(heroVisual)` (dégradé noir selon réglage)
  - texte passe en blanc quand visuel présent, sinon ink
- Test manuel: importer image dans `PortalControls` (Visuel du Monde) → hero change instantanément.

### 3) Importateur visuel dans panneaux (timeline visual) ne fonctionnait pas
- **Cause**: `UniversalTimeline AmbientBackground` ignorait `event.visual`, retournait toujours blanc. `EventScene` n'utilisait pas `momentVisualOverlayAlpha`.
- **Fix**:
  - `AmbientBackground` rend maintenant `event.visual` (image/video + overlay noir `momentVisualOverlayAlpha`)
  - `EventScene` adapte couleurs: si visuel → texte blanc sur voile noir, sinon ink sur papier
  - `VisualImportControl` restylé en agency-paper/hairline/ink + overlay noir corrigé (était blanc à 0.75 opacity par erreur)
- Test: ouvrir tiroir Moment → Visuel du Moment → importer → scène timeline montre l'image.

---

## Audit fonctionnel — ce qui marche vraiment

### Local-first = OK sans backend (376 tests pass)

| Panneau | Actions | Statut |
|---|---|---|
| **PortalOnboarding** choix couple/pro | `persona`, création monde | ✅ local |
| **WorldTopMenu** | navigation phases | ✅ |
| **ProjectStage** hero | titre, pivot date, city/venue, guestsCount | ✅ via `updateProject` |
| **UniversalTimeline** | créer jalon, éditer title/detail/time/location/status, lier relations, dépendances, visual | ✅ `addEntity/updateEntity` |
| **EventDrawer** | onde de changement preview | ✅ local |
| **PlanningPanel** (tâches) | add/toggle/edit/delete, phases 12m+..apres | ✅ |
| **GuestPanel** | add/edit/delete guests, search, dietary, table assignment | ✅ |
| **ProviderPanel** | add/edit/delete providers, status, nextAction | ✅ |
| **Seating** (dans WeddingModulesPanel) | tables add/delete, assign guests, unassigned warning | ✅ |
| **Budget** | payments add/toggle/delete/edit, répartition catégories | ✅ |
| **Ceremony** | notes, menu, drinks, cake, firstDance, structure, readings/vows | ✅ `updateProject ceremony` |
| **Logistics** | parking, accessibility, weatherFallback, packing checklist, emergency contacts, accommodations/shuttles display | ✅ |
| **DayOfPanel** | déroulé Jour J add/edit/delete, time picker, status, guests/providers fiches | ✅ |
| **Team** | add/edit/delete team roles | ✅ |
| **Memories checklist** | shot list etc | ✅ |
| **Messages templates** (local) | add/edit/delete templates | ✅ |
| **Music** (local) | add tracks manuellement, toggle status, lier aux Moments timeline | ✅ |
| **DayOfGuestEntry** | publish mini-site, copy link | ✅ local (publicProfile.published) |
| **VisualImportControl** | file → dataURL (6Mo max) + URL image/video + overlay slider | ✅ local |

### API-dépendant = cassé en one-page sans api-server

| Feature | Endpoint | Symptôme | Recommandation |
|---|---|---|---|
| **GuestPanel RSVP links** create/copy/revoke | `POST /api/projects/:id/rsvp-links/:guestId`, `DELETE`, `GET /rsvp-links` | notice "Liens RSVP indisponibles" | **Supprimer ou dégrader**: garder gestion invités locale, masquer boutons RSVP si `fetch` échoue, afficher "Mode hors-ligne". |
| **Documents** upload/list/delete | `POST /storage/uploads/request-url`, `PUT uploadURL`, `POST /storage/files`, `GET /projects/:id/files` | `RemoteError` | **Réunifier avec Memories**: remplacer par galerie locale dataURL comme visual (6Mo), pas besoin S3. |
| **AIME LOCAL bridge** | `/aime-local/bridge/status`, `/pairing-token`, `/projects/:id/aime-local/*` | nécessite process Node séparé + pnpm bridge | **Supprimer** dans one-page: trop complexe, remplacé par "Choisir dossier" navigateur qui doit aussi utiliser API → donc supprimer tout le bloc AIME LOCAL. |
| **Messages delivery** | `POST /projects/:id/messages` (Resend) | "Envoi impossible" | **Supprimer**: garder templates locaux, retirer envoi. Ou mock local qui log dans `messageLogs` avec status simule. |
| **Contributions** participant-media moderation | `GET /projects/:id/participant-media`, PATCH moderation | vide | **Supprimer** si pas de backend invités. |
| **Film** playlist | `files` + `participantMedia` videos | "Aucun film réel" | **Réunifier** avec Documents → une seule galerie vidéo locale. |
| **Memories galerie invités** | `participantMedia` images approved | vide | **Réunifier** avec Documents. |
| **Song requests** | `GET /song-requests` | vide | **Supprimer** ou garder local seulement (requests simulées). |
| **Thanks** remerciements | dépend messages + song-requests + participantMedia | partiel | **Supprimer** ou local. |
| **Honeymoon** posts | timeline apres audience | ✅ local en fait (pas API) | Garder mais renommer "Après". |
| **Music search** Apple Music | `https://itunes.apple.com/search` | marche si online, sinon échec | **Garder** mais dégrader: si offline, message + saisie manuelle. |
| **DispooBanner** | lien externe dispoo | ✅ (lien) | Garder. |

### Boutons qui ne marchent pas — liste précise

- `GuestPanel: [data-testid=participant-invite-xxx]` → fetch 404 sans api-server → **à masquer en offline**
- `GuestPanel: participant-copy / revoke` idem
- `WeddingModulesPanel documents: pick-local-folder` → appelle `putStorageFile` qui fetch `/storage/uploads/request-url` → échec → affiche `RemoteError` mais ne sauvegarde pas → **à remplacer par FileReader dataURL**
- `WeddingModulesPanel documents: Ajouter des fichiers` idem
- `WeddingModulesPanel documents: AIME LOCAL Connecter mon ordinateur / Enregistrer dossiers / Lancer scan` → nécessite api + bridge → **à supprimer**
- `WeddingModulesPanel messages: Confirmer et envoyer` → fetch messages → échec
- `WeddingModulesPanel contributions: Valider/Refuser` → fetch participant-media → échec
- `WeddingModulesPanel film: Télécharger` → href `/api/storage/files/:id` → 404
- `WeddingModulesPanel memories galerie` → src `/api/storage/files/:id` → 404

---

## Proposition de réunification pour vraie app qui marche bien

### Principes
- Garder portal choix couple/wedding (déjà fait)
- Design écran démo appliqué partout: `var(--agency-paper)` blanc, `var(--agency-hairline)` #E6E1D8, `var(--agency-ink)` #171410, rounded-3xl, etc. (fait pour Guest/Provider/Planning/Budget/Seating)
- Tout doit marcher offline local-first, pas de fetch obligatoire

### Plan de suppression / réunification

1. **Guest + Seating → un seul panneau "Invités"**
   - On a déjà `GuestPanel` (liste + search + RSVP) et `seating` (tables). Les deux manipulent `guests` et `tables`.
   - **Action**: fusionner: dans GuestPanel ajouter section Tables en bas (ou onglet). Supprimer module `seating` séparé de la nav.

2. **Provider + Budget → "Prestataires & Budget"**
   - Providers ont `amountCents`, payments ont `providerId`. Budget affiche déjà répartition par catégorie prestataires.
   - **Action**: un seul panneau avec 2 onglets: Prestataires / Échéancier. Supprimer nav budget séparée.

3. **Documents + Memories + Contributions + Film → "Galerie" unique locale**
   - Actuellement 4 modules séparés qui tous veulent afficher des fichiers.
   - **Action**:
     - Supprimer tout le code AIME LOCAL ( ~300 lignes dans WeddingModulesPanel)
     - Remplacer `files`, `participantMedia` API par `project.documents` + `project.media` + `project.memories` locaux qui stockent dataURL (comme visual)
     - Un seul composant `LocalGallery` avec filtres image/video/pdf, import via FileReader, pas de S3
     - Garder `MemoryChecklist` dedans

4. **Messages + Thanks → supprimer envoi, garder modèles locaux**
   - **Action**: `messages` devient "Modèles de messages" (CRUD local). Retirer `deliverMessage`, `reschedule`, `cancelScheduled`, `sendThankYou`. Si besoin, bouton "Copier" pour coller dans email client.
   - Supprimer `thanks` ou le transformer en "Mots doux" local (éditable, pas de fetch).

5. **Music → garder mais simplifier**
   - Garder recherche iTunes (client-side) + saisie manuelle + liaison timeline
   - Supprimer `songRequests` (dépend API)
   - Afficher "Source: Apple Music" mais pas de moderation

6. **Logistics + Ceremony + Team → "Organisation Jour J"**
   - 3 modules séparés pour même phase.
   - **Action**: un seul panneau avec sections accordéon: Cérémonie / Logistique / Équipe / À emporter / Contacts urgence

7. **DayOfPanel déjà bien** — garder, mais retirer `DayOfGuestEntry` publish qui est OK local.

8. **Supprimer définitivement**:
   - `AIME LOCAL` bridge entier
   - `putFile` XMLHttpRequest + `uploadURL` flow
   - `api()` calls vers `/storage/*`, `/messages`, `/participant-media`, `/song-requests`, `/rsvp-links` dans les panneaux (garder seulement si on détecte api-server dispo, sinon fallback local)
   - `DispooBanner` ? Garder, c'est juste un lien.

### Ordre de priorité pour dev

1. ✅ Fait: header blanc + visuels
2. **P0**: Réparer Documents en local-first (FileReader dataURL) → débloque galerie
3. **P0**: Masquer RSVP links si API absent (détecter fetch failure → hide buttons)
4. **P1**: Fusion Guest+Seating, Provider+Budget (réduit nav de 8 à 5 entrées)
5. **P1**: Supprimer AIME LOCAL UI
6. **P2**: Fusion Documents/Memories/Film/Contributions → Galerie
7. **P2**: Simplifier Messages → modèles locaux + copy

### Ce qui marche vraiment aujourd'hui (après fix header/visuels)

- Timeline complète avec visuels custom ✅
- Hero Monde avec visuel custom ✅
- Toutes les entités locales (tâches, invités, prestataires, tables, paiements, cérémonie, logistique, team, souvenirs, musique manuelle) ✅
- Navigation phases Avant/Pendant/Après ✅
- Portal choix couple/wedding ✅
- Design démo appliqué aux panneaux principaux ✅
- Tests 376 pass ✅

### Ce qui reste cassé si on ne fait rien

- Documents upload → 404
- Messages envoi → 404
- RSVP links → 404
- Contributions/Film/Memories galerie → 404
- AIME LOCAL → nécessite bridge Node

---

## Fichiers modifiés dans cette passe

- `ProjectStage.tsx`: nav blanc, heroVisual rendu, textes conditionnels, agency tokens
- `WorldTopMenu.tsx`: blanc, hairline, ink
- `VisualImportControl.tsx`: agency design, overlay noir corrigé
- `UniversalTimeline.tsx`: AmbientBackground rend visual + overlay, EventScene couleurs adaptatives
- `PrivateLayout.tsx`: header blanc
- `PortalBackdrop.tsx`: blanc
- `WeddingModulesPanel.tsx`: derniers hardcoded #171410/#FFFFFF → tokens (partiel)

## Prochaine étape recommandée

Implémenter `LocalGallery` qui remplace Documents: utiliser `FileReader.readAsDataURL` comme `VisualImportControl` fait déjà, stocker dans `project.documents` local avec `url: dataURL`. Retirer tout `api()` storage. Puis masquer RSVP si pas d'API (try/catch + state `apiAvailable`).

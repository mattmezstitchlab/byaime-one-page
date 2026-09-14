# Il reste à faire quoi pour terminer byaime one-page ?

État actuel : P0/P1/P2 livrés, 377 tests verts, archi indiscutable posée, nav 7 rail + 3 mode, galerie + orga unifiées, local-first dataURL, header blanc, visuels réparés.

Il reste ~15% pour passer de "vraie app qui marche bien" à "produit fini indiscutable".

---

## P3 — Hardening local-first final (1 jour)

**Pourquoi** : il reste 1 fichier avec des `api()` qui pètent en offline : `PortalControls.tsx`

- [ ] `PortalControls.tsx` lignes 276,314,337,347,358,878,1040,1096,1158 : 
  - files = `project.documents` local, pas `/projects/:id/files`
  - invitations = local array `project.invitations` (nouveau champ) + masquer si api absent
  - storage upload = dataURL comme Documents (déjà fait ailleurs)
  - privacy = `project.privacy` local
  - account = localStorage
  - → ajouter `apiAvailable` flag comme dans GuestPanel, try/catch, fallback UI
- [ ] Supprimer `participantMedia` et `songRequests` state inutilisés dans `WeddingModulesPanel.tsx` (lignes 244-245)
- [ ] Vérifier `GuestPanel.tsx` ligne 105 : DELETE rsvp-link déjà sous `apiAvailable`, OK mais ajouter try/catch
- [ ] Remplacer `putStorageFile` restant si trouvé

**Critère** : plus aucun bouton qui fait 404 en offline. Tout clique → soit action locale, soit message "Nécessite backend".

---

## P4 — Export / Import / PWA (1 jour)

- [ ] **Export** : bouton dans CommandBar ou PortalControls "Exporter .byaime" → JSON.stringify(project) + download. Inclut dataURLs (images/vidéos)
- [ ] **Import** : input file .json → `updateProject(JSON.parse)`
- [ ] **PWA** : `vite-plugin-pwa` déjà dans deps ? Ajouter `public/manifest.json`, `serviceWorker`, icônes. Permet install + offline cache
- [ ] **Sauvegarde auto** : afficher "Dernière sauvegarde : il y a X min" + bouton "Sauvegarder maintenant"

---

## P5 — Polish design + empty states (0.5 jour)

- [ ] Remplacer derniers `#171410`/`#FFFFFF` hardcodés dans `ProjectStage`, `WeddingModulesPanel`, `ProviderPanel`, `GuestPanel` par `var(--agency-ink/paper/hairline)` — déjà 90% fait, reste 10%
- [ ] Empty states : chaque panel a déjà `<Empty>` mais ajouter CTA contextuel :
  - Documents vide → "Importer votre première photo"
  - Personnes vide → "Ajouter un invité"
  - Prestataires vide → "Ajouter un prestataire"
  - Organisation vide → "Remplir la cérémonie"
- [ ] Lightbox galerie : focus trap + ESC pour fermer (déjà click outside, ajouter keydown)
- [ ] Timeline : vérifier `momentVisualOverlayAlpha` lisible sur toutes les images

---

## P6 — Onboarding + Portal (0.5 jour)

- [ ] Portal choix couple/wedding : garder mais simplifier — 2 grosses cartes blanches, pas de jaune, CTA clair
- [ ] Onboarding first-time : si `project.timeline.length === 0` → afficher 3 étapes "Ajoutez votre date → Invités → Premier prestataire"
- [ ] Landing : garder telle quelle (macOS dots ok, ce sont des démos), mais s'assurer que CTA "Créer mon Monde" → /user-portal fonctionne

---

## P7 — Docs + Release (0.5 jour)

- [ ] Mettre à jour `README.md` avec archi indiscutable TL;DR + screenshot galerie + orga
- [ ] `AUDIT_COMPLET.md` déjà à jour P2, ajouter P3/P4 quand fait
- [ ] Tag release `v1.0-local-first` + deploy Vercel (vite build déjà OK)
- [ ] Vérifier `pnpm build` passe sans erreur typecheck

---

## Estimation

- P3 : 1j
- P4 : 1j
- P5 : 0.5j
- P6 : 0.5j
- P7 : 0.5j
**Total : ~3.5 jours pour terminer vraiment**

---

## Ce qui est déjà indiscutable et ne doit plus bouger

- Modèle `WorldProject` + `WorldVisual`
- Navigation rail 7 + mode 3, invariant unicité, `normalizePanelId`
- Galerie unifiée + Organisation unifiée
- Store Zustand local-first + VisualImportControl dataURL
- 377 tests qui verrouillent

Ne jamais recréer seating/budget/ceremony/team/memories/film/contributions/thanks comme panels séparés.

---

## Prochain commit recommandé

Commencer par P3 PortalControls → le dernier endroit où un bouton fait encore 404.

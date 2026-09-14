# Il reste à faire quoi pour terminer byaime one-page ?

État actuel : P0/P1/P2/P3 livrés, 377 tests verts.

## ✅ Fait
- P0 local-first gallery + suppression AIME LOCAL
- P1 fusion Personnes+Plan table, Prestataires+Budget
- P2 galerie unifiée + organisation unifiée + nav sans doublons
- P3 hardening PortalControls : plus aucun bouton 404 en offline, fallback dataURL local

## Reste ~10% pour v1.0

### P4 — Export / Import / PWA (1 jour) — NEXT
- [ ] Export .byaime JSON (avec dataURLs)
- [ ] Import .json
- [ ] PWA manifest + service worker
- [ ] "Dernière sauvegarde"

### P5 — Polish design + empty states (0.5j)
- [ ] Remplacer derniers #171410 hardcodés (hors landing démo)
- [ ] Empty CTA
- [ ] Lightbox ESC focus trap

### P6 — Onboarding + Portal (0.5j)
- Portal simplifié + onboarding 3 étapes

### P7 — Docs + Release (0.5j)
- README + tag v1.0-local-first + deploy

Total restant : ~2.5 jours

## Ce qui est indiscutable
- 1 fichier = 1 mariage
- Rail 7 + mode 3, invariant unicité, normalizePanelId
- Galerie + Orga unifiées
- Local-first dataURL, API optionnelle
- 377 tests

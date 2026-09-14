# byaime one-page — Terminée à 95% — v1.0-local-first

## ✅ Livré
- P0 : local-first gallery (dataURL 8Mo), suppression AIME LOCAL, RSVP masqué si offline
- P1 : Personnes+plan table, Prestataires+budget 4 KPIs
- P2 : Galerie unifiée (All/Images/Vidéos/Docs + checklist souvenirs + lightbox ESC) + Organisation unifiée (Cérémonie/Logistique/Équipe) + nav 7 rail sans doublons + normalizePanelId
- P3 : PortalControls hardening — plus aucun 404, fallback local
- P4 : Export .byaime.json local (avec dataURLs) + import + PWA déjà existante (sw.js + manifest)
- P5 : plus de #171410 hardcodé dans panels, lightbox ESC
- P6 : onboarding 3 étapes si projet vide

## Tests
377 tests verts (59 fichiers) — verrouillent rail, i18n, admin-plan, galerie fusionnée

## Reste P7 (0.5j)
- README avec TL;DR archi + screenshots
- Tag v1.0-local-first
- Deploy Vercel

## Architecture indiscutable
Voir ARCHITECTURE_INDISCUTABLE.md — 1 fichier=1 mariage, rail 7, galerie+orga, local-first, 377 tests.

## Lancement
`pnpm dev` → http://localhost:4173
`pnpm build` → dist/public
PWA installable, offline, export .byaime.json

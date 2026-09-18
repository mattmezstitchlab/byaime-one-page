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

## P7 — clôture (18/09)
- ✅ README racine avec TL;DR archi + screenshots (`README.md`)
- ✅ Deploy Vercel — prod réparée le 18/09 (lockfile gelé, PR #37), gate `verify:vercel` + CI sans secrets (`docs/ci/`)
- ⏳ Tag `v1.0-local-first` — à poser sur `main` une fois #37 fusionnée et le déploiement Production vert (`git tag -a v1.0-local-first -m "…" && git push origin v1.0-local-first`)

## Architecture indiscutable
Voir ARCHITECTURE_INDISCUTABLE.md — 1 fichier=1 mariage, rail 7, galerie+orga, local-first, 377 tests.

## Lancement
`pnpm dev` → http://localhost:4173
`pnpm build` → dist/public
PWA installable, offline, export .byaime.json

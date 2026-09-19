# La visite guidée — sources de l’enregistrement

Ce dossier ne contient que des **sources** : la voix off, chapitre par chapitre.
Les MP4 et les affiches qu’ils produisent sont livrés à côté, sous
`public/videos/tour-*.mp4` et `tour-*.jpg`, et servis tels quels par le site.

| Fichier | Chapitre tourné |
| --- | --- |
| `audio/concept.mp3` | 01 · Ce qu’est AIME |
| `audio/inscription.mp3` | 02 · Créer son espace, puis sa carte |
| `audio/monde.mp3` | 03 · Ouvrir un Monde Mariage |
| `audio/ouverture.mp3` | 04 · Le nom, la date, le lieu |
| `audio/timeline.mp3` | 05 · La Timeline |
| `audio/invites.mp3` | 06 · Un lien RSVP par invité |
| `audio/prestataires.mp3` | 07 · Prestataires, budget, assistant |
| `audio/partage.mp3` | 08 · La page publique et le bilan |

## Refaire une prise

Depuis `artifacts/byaime-onepage` :

```bash
node scripts/record-tour.mjs --voice   # imprime le texte dicté, chapitre par chapitre
node scripts/record-tour.mjs --dry     # joue la scène sans encoder (contrôle des gestes)
corepack pnpm run record:tour          # tourne, encode et recolle les huit chapitres
```

Le script démarre son propre serveur d’aperçu (`vite build --config
preview/vite.preview.mjs` puis `vite preview`) : l’API de l’aperçu garde le
Monde en mémoire, donc une instance déjà lancée ne montrerait jamais l’écran
d’accueil vide. Un chapitre qui manque de voix est un chapitre qui n’est pas
joué — la prise refuse de démarrer tant qu’un `audio/<chapitre>.mp3` manque.

Outils attendus hors dépôt, via l’environnement : `CHROMIUM` (Chrome headless
shell + `LD_LIBRARY_PATH`), `FFMPEG`, et `FONTSOURCE_DIR` pour servir les
polices de l’application sans réseau. Les variables et options sont listées en
tête de `scripts/record-tour.mjs`.

## Ce que la voix dit, et dans quelle langue

La voix off est **en français** (`fr-FR`, une seule piste, pas de version
anglaise). Les sous-titres affichés à l’écran reprennent mot à mot la phrase
dite : c’est ce qui permet de retoucher une scène sans re-enregistrer le son
d’un autre chapitre.

L’interface de l’accueil reste bilingue : les libellés du carrousel
(`tour.*`) existent en français et en anglais, seule la bande-son ne change pas.
Un visiteur anglophone voit donc la visite en français sous-titrée de la
narration française — c’est un choix assumé, pas un oubli de traduction.

## Le rendu filmé

La vidéo montre l’application, pas une maquette : elle prend donc ses
couleurs. Celles-ci sont blanches (`--card: 0 0% 100%` depuis le
2026-09-19) — une surface se sépare d’une autre au filet, jamais à la teinte,
et il n’y a plus d’encadré ambré dans le Monde ni dans le panneau du +. Une
reprise de style dans l’application impose donc de relancer la prise : sans
ça, la visite montrerait une interface que plus personne ne voit.

## Le scénario

`scripts/tour-script.mjs` : huit chapitres, chaque étape porte sa phrase
(`text`) et le geste correspondant (`act`). Les gestes ciblent les
`data-testid` réels de l’application — si un contrôle change de nom, la prise
le signale (`⚠ n étape(s) hors cible`) au lieu de mimer un clic dans le vide.

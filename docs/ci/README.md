# CI — la gate sans secrets et le workflow E2E réparé

**Statut : à appliquer par un humain** — le jeton GitHub de l'agent Arena n'a
pas la permission `workflows`, GitHub refuse donc toute modification de
`.github/workflows/` depuis cette session (`refusing to allow a GitHub App to
create or update workflow … without workflows permission`). Les deux fichiers
sont livrés ici sous forme de patch, prêts et validés localement.

## Les deux faits mesurés

1. **Le workflow E2E est invalide depuis le 11/09/2026** : 100 runs sur 100 en
   « failure » en 0 seconde, « This run likely failed because of a workflow
   file issue ». La cause : `secrets.*` dans `jobs.<id>.if`, ce que GitHub
   n'autorise pas (le contexte `secrets` n'existe pas à cet endroit). Aucun
   job n'a jamais démarré.
2. **Son premier step réel était `pnpm install --frozen-lockfile`** : s'il
   avait tourné, la PR #36 aurait été rouge *avant* le merge, et la production
   Vercel ne serait pas tombée le 18/09 (voir `docs/vercel-deployment.md`,
   section « Lockfile »).

## Ce que le patch contient

- **`.github/workflows/ci.yml` (nouveau)** — sur chaque PR et push `main`,
  sans aucun secret (forks compris) :
  1. `corepack pnpm install --frozen-lockfile` — l'invariant Vercel ;
  2. `corepack pnpm run typecheck` — racine, tous packages (vert depuis
     `998afc3`) ;
  3. `corepack pnpm test` — 563 + 85 + 33 tests ;
  4. `corepack pnpm run verify:vercel` — build Vercel, configs, entrypoints,
     lockfile gelé, recette de l'Ignored Build Step (`test:vercel-ignore`).

  pnpm est épinglé par corepack sur `packageManager` (10.14.0) — pas de
  version flottante qui régénérerait le lockfile autrement que Vercel.

- **`.github/workflows/e2e.yml` (réparé)** — un job `gate` lit les secrets
  dans l'`env` d'un step (seul endroit autorisé) et expose `run-e2e` en
  output ; `playwright` dépend de cette sortie. L'E2E est **skippé
  proprement** quand Clerk manque, plus jamais un faux échec.

## Appliquer

Depuis un poste avec les droits d'écriture sur le dépôt :

```bash
git checkout arena/01a0b31a-byaime-one-page   # ou main après merge de #37
git apply docs/ci/workflows-2026-09-18.patch
git add .github/workflows
git commit -m "CI : gate sans secrets + workflow E2E réparé"
git push
```

Puis, dans Settings → Branches → règle de protection de `main`, exiger le
check **« Lockfile · typecheck · tests · build Vercel »** avant merge. C'est
cette exigence qui rend l'incident du 18/09 impossible à reproduire.

## Vérifications faites localement (18/09)

- YAML des deux fichiers parsé ; aucun `secrets.*` dans un `if` de job.
- Chaque étape du job `verify` exécutée à la main sur la branche : install
  gelé ✓ · typecheck racine ✓ · tests ✓ · verify:vercel ✓.

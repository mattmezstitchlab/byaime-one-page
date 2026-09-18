#!/bin/sh
# Ignored Build Step de Vercel (vercel.json → "ignoreCommand").
#
# Contrat Vercel : exit 0 = ignorer le build, exit 1 = construire. Tout autre
# code est ambigu — on le normalise en 1 : dans le doute, on construit. Le
# 18/09/2026, le projet a été mis en « Deployment rate limited — retry in
# 24 hours » alors que la prod était à réparer ; une partie du quota avait
# été consommée par des commits qui ne pouvaient pas changer le site.
#
# Base de comparaison : VERCEL_GIT_PREVIOUS_SHA (dernier déploiement réussi
# de la branche), jamais HEAD^ — Vercel ne déploie que la tête d'un push,
# comparer à HEAD^ sauterait le build d'un push qui finit par un commit de
# docs et laisserait le code d'avant nulle part. Sans SHA précédent (premier
# déploiement d'une branche, variable absente) : on construit.
#
# Chemins qui ne peuvent pas changer ce que Vercel sert (vérifié : aucun
# import de *.md ni de docs/ dans le build ; attached_assets/ est aliasé
# `@assets` par vite.config.ts et N'EST PAS exclu) :
set -u

# Toujours comparer depuis la racine du dépôt : avec Root Directory =
# artifacts/byaime-onepage, un `git diff -- .` relatif ne verrait pas lib/,
# api-server/ ni pnpm-lock.yaml — et sauterait un build nécessaire.
toplevel="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "ignore-build: pas un dépôt git → build"
  exit 1
}
cd "$toplevel" || exit 1

base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$base" ]; then
  echo "ignore-build: pas de déploiement précédent connu → build"
  exit 1
fi
if ! git cat-file -e "$base^{commit}" 2>/dev/null; then
  echo "ignore-build: base $base introuvable (clone superficiel ?) → build"
  exit 1
fi

git diff --quiet "$base" HEAD -- . \
  ':(exclude)docs' \
  ':(exclude)research' \
  ':(exclude)screenshots' \
  ':(exclude).agents' \
  ':(exclude).github' \
  ':(exclude)*.md' \
  ':(exclude)*.patch'
status=$?

case "$status" in
  0)
    echo "ignore-build: seuls docs/, research/, screenshots/, .agents/, .github/, *.md, *.patch ont changé depuis $base → build ignoré"
    exit 0
    ;;
  1)
    echo "ignore-build: des fichiers pouvant changer le site ont changé depuis $base → build"
    exit 1
    ;;
  *)
    echo "ignore-build: git diff a renvoyé $status (ambigu) → build"
    exit 1
    ;;
esac

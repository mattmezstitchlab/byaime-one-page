# AIME E2E

Cette suite est volontairement désactivée par défaut : elle utilise de vraies
sessions Clerk et les services configurés (PostgreSQL, App Storage et Resend).
Elle ne lit aucune clé ni aucun mot de passe dans le dépôt.

Dans GitHub Actions, PostgreSQL est éphémère et les transports App Storage et
Resend sont remplacés par des fournisseurs locaux strictement réservés au mode
`AIME_E2E_RUN=1` hors production. Les deux utilisateurs Clerk vérifiés sont
créés au début du run, leurs sessions sont écrites dans le répertoire temporaire
du runner, puis les utilisateurs sont supprimés par le teardown Playwright.
Seuls `CLERK_SECRET_KEY` et `CLERK_PUBLISHABLE_KEY` doivent être configurés dans
les secrets GitHub du dépôt.

## Préparer une exécution live

1. Créer ou utiliser deux comptes de test Clerk vérifiés et exporter leurs
   sessions Playwright dans deux fichiers JSON :
   `AIME_E2E_OWNER_STATE` et `AIME_E2E_COLLABORATOR_STATE`.
2. Démarrer les workflows API et web avec la base de données et App Storage
   de développement disponibles. Le workflow API doit aussi recevoir
   `AIME_E2E_RUN=1` pour activer l'échec fournisseur déterministe, uniquement
   protégé en dehors de la production.
3. Installer le navigateur une fois avec `pnpm exec playwright install chromium`.
4. Lancer :

```sh
AIME_E2E_RUN=1 \
AIME_E2E_OWNER_STATE=/chemin/owner.json \
AIME_E2E_COLLABORATOR_STATE=/chemin/collaborator.json \
AIME_E2E_COLLABORATOR_EMAIL=collaborator@example.com \
pnpm run e2e
```

`AIME_E2E_BASE_URL` permet de cibler une URL de preview différente. La suite
exécute le même parcours sur Chromium desktop et sur l’émulation Pixel 7.
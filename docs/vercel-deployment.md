# Vercel deployment

Two setups are supported and both are checked by `pnpm run verify:vercel`:

1. **Root Directory unset (repository root)** — uses `/vercel.json` plus the
   serverless entrypoints in `/api/*.js`.
2. **Root Directory = `artifacts/byaime-onepage`** — uses
   `artifacts/byaime-onepage/vercel.json` plus the entrypoints in
   `artifacts/byaime-onepage/api/*.js`.

In both cases the build compiles the API bundle in
`artifacts/api-server/dist` before producing the frontend bundle in
`artifacts/byaime-onepage/dist/public`, and the Vercel API entrypoints only
import the compiled `dist/app.mjs` bundle (never TypeScript sources).

## Vercel dashboard settings

Build settings are pinned in git (`installCommand`, `buildCommand`,
`outputDirectory`). In the Vercel dashboard, under
Settings → General → Build and Deployment Settings, make sure no override
conflicts with them:

- Framework Preset: `Vite` (or leave the `vercel.json` value)
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm --filter @workspace/byaime-onepage run build`
  (repository root) or `pnpm run build` (when Root Directory is
  `artifacts/byaime-onepage`)
- Output Directory: `artifacts/byaime-onepage/dist/public` (repository root)
  or `dist/public` (when Root Directory is `artifacts/byaime-onepage`)

If the dashboard shows an override for one of these values, either clear it
or set it to the value above.

## Runtime environment

Set these variables in Settings → Environment Variables (Production,
Preview, Development as needed):

- `DATABASE_URL` — required at runtime for the API server.
- `APP_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `RESEND_API_KEY`,
  `SESSION_SECRET`, `OBJECT_STORAGE_BUCKET`, `GCP_CLIENT_EMAIL`,
  `GCP_PRIVATE_KEY` (plus `GCP_PROJECT_ID` when needed), as listed in
  `replit.md`.
- `VITE_CLERK_PUBLISHABLE_KEY` — same value as `CLERK_PUBLISHABLE_KEY`;
  without it the site shows a "Connexion momentanément indisponible" screen
  instead of the app.

The build itself can complete without `DATABASE_URL`, but any runtime that
loads the API bundle without this variable will fail with the explicit error
`DATABASE_URL must be set. Did you forget to provision a database?`.

## Clean rebuild checks

Run the following from a clean workspace:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run typecheck
corepack pnpm test
corepack pnpm run build
corepack pnpm run verify:vercel
```

`verify:vercel` removes generated outputs, rebuilds `artifacts/byaime-onepage`,
checks that the frontend bundle and required API bundles are regenerated,
verifies that both Vercel configs pin the pnpm install/build/output settings
and route `/api` correctly, verifies that the Vercel entrypoints still point
only to `dist/app.mjs`, and fails if forbidden generated artifacts are tracked
by Git.

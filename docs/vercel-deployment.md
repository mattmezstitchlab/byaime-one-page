# Vercel deployment

`artifacts/byaime-onepage` is the Vercel app entrypoint. Its build now compiles the API bundle in `artifacts/api-server/dist` before producing the frontend bundle, and the Vercel API entrypoints keep importing `../../api-server/dist/app.mjs`.

## Runtime environment

- `DATABASE_URL` is required at runtime for the API server.
- The build itself can complete without `DATABASE_URL`, but any runtime that loads the API bundle without this variable will fail with the explicit error `DATABASE_URL must be set. Did you forget to provision a database?`.

## Clean rebuild checks

Run the following from a clean workspace:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run typecheck
corepack pnpm test
corepack pnpm run build
corepack pnpm run verify:vercel
```

`verify:vercel` removes generated outputs, rebuilds `artifacts/byaime-onepage`, checks that the frontend bundle and required API bundles are regenerated, verifies that the Vercel entrypoints still point only to `dist/app.mjs`, and fails if forbidden generated artifacts are tracked by Git.

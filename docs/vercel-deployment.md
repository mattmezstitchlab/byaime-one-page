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
- `VITE_CLERK_PUBLISHABLE_KEY` — same value as `CLERK_PUBLISHABLE_KEY`.
  Without it the app runs in **degraded mode**: public pages stay served (the
  home page `/` — also served on the retired URLs `/agence` and `/monde`,
  `/mentions-legales`, `/confidentialite`, `/conditions`, a couple's report
  `/bilan/:id`, a guest portal `/rsvp/:token`) and any route that needs a
  session shows the "Connexion momentanément indisponible" screen with a link
  back to the home page, instead of mounting a `ClerkProvider` pointed at a
  non-existent instance. The home page composes with the project store, so
  degraded mode mounts it through `LocalProjectProvider` (an absent session
  injected into the store) rather than `ProjectProvider`, whose `useAuth()`
  would throw without a `ClerkProvider`.

  Note: the environment variable is the only reliable signal. Clerk's
  `publishableKeyFromHost(host, key)` fabricates a key from the hostname when
  `key` is missing (`publishableKeyFromHost("byaime.fr", undefined)` returns
  `pk_live_Y2xlcmsuYnlhaW1lLmZyJA`), so it never reports an unconfigured
  deployment — `App.tsx` therefore tests the variable, not the helper's result.
  Both behaviours are checked by `preview/smoke.mjs` (nominal mode and degraded
  mode, the latter with its own Vite server).
- `AIME_CHAT_API_KEY` — optional. Without it the assistant (`/assistant`,
  `POST /api/projects/:id/aime/chat`) answers in local mode from the
  authorized wedding brief. With it, answers are drafted by an
  OpenAI-compatible chat model, still grounded on the same brief.
- `AIME_CHAT_API_URL` — optional, defaults to
  `https://api.openai.com/v1/chat/completions`. Any OpenAI-compatible
  endpoint works (proxy, self-hosted gateway).
- `AIME_CHAT_MODEL` — optional, defaults to `gpt-4o-mini`.

The build itself can complete without `DATABASE_URL`, but any runtime that
loads the API bundle without this variable will fail with the explicit error
`DATABASE_URL must be set. Did you forget to provision a database?`. Because
that happens at module load, Vercel answers its own error page and the JSON
error handler below never runs: this is the one failure the application cannot
convert into a readable message. A quick way to tell the two apart on a live
deployment: `GET /api/healthz` answers `{"status":"ok"}` without touching the
database, so a deployment where it succeeds while every database-backed route
fails has a reachable application and a broken schema or connection.

## Database schema

Schema changes ship as idempotent SQL in `lib/db/migrations/` and are **not**
applied by the deployment: run them against the target Postgres before (or
immediately after) the deploy that needs them.

```bash
psql "$DATABASE_URL" -f lib/db/migrations/20260916_universal_cards.sql
psql "$DATABASE_URL" -f lib/db/migrations/20260916_professional_profiles.sql
psql "$DATABASE_URL" -f lib/db/migrations/20260916_verified_rsvp_claims.sql
```

To find out what a given database actually has, run the read-only diagnostic:

```bash
DATABASE_URL="postgres://…" corepack pnpm run check:db
```

`scripts/src/check-db-schema.ts` connects, lists every expected table and every
column added by the 2026-09-16 migrations as present or missing, prints the
exact `psql` commands to apply, and exits 0 (complete), 1 (incomplete or
unreachable) or 2 (no `DATABASE_URL`). It never prints the password and changes
nothing.

`20260916_universal_cards.sql` creates `aime_universal_cards`, the table behind
`/ma-carte`; without it `GET /api/me/card` raises
`relation "aime_universal_cards" does not exist` and answers a 500. All three
files are safe to re-run (`CREATE TABLE IF NOT EXISTS`,
`ADD COLUMN IF NOT EXISTS`, guarded constraints). Their behaviour — uniqueness
of a verified claim, closed tombstones, lossless profile extraction, ownership
foreign keys — is checked against an in-memory Postgres by
`pnpm run test:card-migrations`. `lib/db` also exposes `pnpm --filter @workspace/db run push`
(drizzle-kit) for a database you manage that way.

## API error contract

Every `/api/*` answer is JSON, failures included. `app.ts` mounts
`jsonErrorHandler` last, so an error no route caught becomes
`{ "error": "<phrase française>" }` with the right status instead of Express's
default HTML page — the HTML page is what made a browser print
`Unexpected token '<', "<!DOCTYPE "... is not valid JSON` in place of the
`/ma-carte` form on 2026-09-16.

- `artifacts/api-server/src/lib/apiFailure.ts` derives the status and the
  message: pure, no Express, no logging, covered by `apiFailure.test.ts`.
- The real cause is logged, never returned: no SQL, no table name, no
  connection string, no stack reaches the client. Look for the log line
  `Erreur non rattrapée : réponse JSON d'échec renvoyée` in the function logs,
  with `err`, `errorCode`, `requestId`, `method`, `path`.
- If the response has already started, the handler hands control back to
  Express instead of writing over it.
- The client side matches: `src/lib/api-messages.ts` and `src/lib/api-call.ts`
  turn any failure (unreachable network, non-JSON body, 401/403/404/409/5xx)
  into a French sentence, and `/ma-carte` keeps its form usable with a
  non-blocking retry banner.

## Lockfile — the invariant Vercel checks first

`installCommand` is `pnpm install --frozen-lockfile`, so the very first thing
a deployment does is compare `pnpm-lock.yaml` with `pnpm-workspace.yaml`
(`overrides`, `catalog`, settings) and every `package.json` specifier. Any
drift fails the deployment **before a single file is compiled**, with
`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` (workspace config) or
`ERR_PNPM_OUTDATED_LOCKFILE` (specifier).

That is what broke production on 2026-09-18: PR #36 regenerated the lockfile
in a sandbox whose pnpm ignored the `overrides` section of
`pnpm-workspace.yaml`, so the committed lockfile lost its 86 overrides
(`esbuild: 0.28.1`, the `'-'` platform-binary exclusions, …) and gained the
platform binaries they exclude. Every deployment from `bb761de` onwards
failed at install time; the last good one was `86617b0` (PR #35). No code
change was at fault — the build, the 563 tests and the typecheck all passed
locally with the previous lockfile.

Rules:

- Regenerate the lockfile only with `corepack pnpm install` from the
  repository root, on the pinned `pnpm@10.14.0`, and check that
  `pnpm-lock.yaml` still contains an `overrides:` block matching
  `pnpm-workspace.yaml` before committing.
- `corepack pnpm run verify:vercel` now runs
  `pnpm install --frozen-lockfile --lockfile-only` first — the same
  verification Vercel performs, without touching `node_modules` — and fails
  with an explicit message when the lockfile would not install frozen.
- Read the Vercel failure line rather than the build logs: a lockfile error
  is reported by pnpm during *Install*, never during *Build*.

## Ignored Build Step — ne pas dépenser le quota sur des commits de docs

`ignoreCommand` (both `vercel.json` files) runs `scripts/vercel-ignore-build.sh`.
On 2026-09-18 the project hit « Deployment rate limited — retry in 24 hours »
(Hobby plan) while production still had to be repaired; part of the quota had
been spent on commits that could not change the site.

Contract: exit 0 = skip, exit 1 = build, anything else normalised to 1 (when
in doubt, build). The comparison base is `VERCEL_GIT_PREVIOUS_SHA` (last
successful deployment of the branch), never `HEAD^`: Vercel deploys only the
head of a push, so `HEAD^` would skip a push that ends on a docs commit and
leave the code before it deployed nowhere. No previous SHA, unknown SHA
(shallow clone), not a git repo → build. The script always `cd`s to the
repository top level, so it behaves the same with Root Directory unset or set
to `artifacts/byaime-onepage`.

Paths that cannot change what Vercel serves (verified: nothing in the build
imports `*.md` or `docs/`; `attached_assets/` **is** aliased `@assets` by
`vite.config.ts` and is therefore *not* excluded): `docs/`, `research/`,
`screenshots/`, `.agents/`, `.github/`, `*.md`, `*.patch`.

`corepack pnpm run test:vercel-ignore` (also run by `verify:vercel`) replays
the real script against throwaway repositories: docs-only → 0, code → 1,
mixed push ending on docs → 1, `attached_assets` → 1, lockfile → 1, missing
or unknown base → 1, run from the artifact directory with a change in `lib/`
→ 1, no change → 0.

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

When `VERCEL_VERIFY_DEPLOYMENT_URL` (or `VERCEL_DEPLOYMENT_URL` / `VERCEL_URL`)
is set, it also probes the live deployment: `/api/healthz`, `/api/projects`,
`/api/projects/:id`, `/api/cron/scheduled-messages`, `/api/me/card` and
`/api/me/professional-profiles` must return the expected status **and**
`application/json` with a body that parses. A route answering HTML fails the
check — that is the invariant whose breach produced the `/ma-carte` parse error.

```bash
VERCEL_VERIFY_DEPLOYMENT_URL=https://www.byaime.fr corepack pnpm run verify:vercel
```

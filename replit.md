# AIME — The Art of Connection

Une interface one-page qui transforme une intention libre en projet, puis rassemble sa ligne de temps, ses personnes, son budget, ses documents et ses souvenirs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` is the API contract; regenerate clients after changes.
- `lib/db/src/schema/aime.ts` owns projects, memberships, invitations, private-file metadata, delivery logs and RSVP tokens.
- `artifacts/api-server/src/routes/aime.ts` enforces project roles and integrates Clerk, App Storage and Resend.
- `artifacts/byaime-onepage/src/store/project-store.tsx` owns local-first project hydration and optimistic-version synchronization.

## Architecture decisions

- Browser authentication is Clerk cookie-based; browser API calls never attach bearer tokens.
- Project content is stored as versioned JSONB so the existing rich one-page domain can evolve without destructive relational migrations; collaboration and security-sensitive records are relational.
- `updatedAt` is the optimistic concurrency token. A stale write returns HTTP 409 and is never silently overwritten.
- Private object bytes live in App Storage; PostgreSQL stores metadata and project ownership. Every serve/delete request re-checks membership.
- Public RSVP links are random, independently revocable bearer tokens and expose only the wedding title and that guest's response.

## Product

- Composition d'une intention en langage naturel et extraction locale des faits utiles.
- Ligne de temps universelle avec phases, couches, actions, participants, budget, documents, messages, musique et souvenirs.
- Mode local hors connexion avec synchronisation PostgreSQL dès que la session et le réseau sont disponibles.

## User preferences

- Conserver la sobriété visuelle premium du site AIME, même lors de l'ajout de nombreuses fonctionnalités.
- Regrouper les fonctions dans une seule interface plutôt que multiplier les pages.

## Gotchas

- Change OpenAPI first, run codegen, then typecheck.
- Schema changes use `pnpm --filter @workspace/db run push` in development only; production startup never runs DDL.
- Resend calls must use the Replit connector proxy and must persist/report provider failures.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

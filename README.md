# GOS — Store Management System

Store back office built on the **Next.js App Router** as a single full-stack codebase:
React (TypeScript) on the front, typed route handlers on the back calling
validation → service → repository layers, with PostgreSQL behind Prisma.

**Stack:** Next.js 16 (App Router, `src/` dir) · TypeScript · Tailwind CSS v4 · shadcn/ui · Zod · Prisma 7 · PostgreSQL 17

## Getting started

```bash
npm install

cp .env.example .env   # once — Prisma CLI reads .env
npm run db:up          # starts local PostgreSQL 17 on port 5432 (keep running)
npm run db:setup       # applies migrations + seeds demo data (once)

npm run dev
```

Open <http://localhost:3000>. Useful endpoints:

| Endpoint | Response |
| --- | --- |
| `GET /api/health` | `{ ok: true, data: { status: "healthy", ... } }` |
| `GET /api/products?q=pen&page=1` | paginated catalogue |
| `GET /api/products/BEV-001` | single product (404 envelope if missing) |
| `POST /api/products` | create (422 on validation error, 409 on duplicate SKU) |
| `GET /api/dev/database` | development-only database diagnostics (404 in production) |
| `/dev/database` | development-only database status screen (404 in production) |

## Database

PostgreSQL stores the catalogue. The `database` repository mode is the default; the
`memory` mode remains a zero-infra fallback for environments without a database.

- **Schema:** `prisma/schema.prisma` (`Product` → `products` table).
- **Migrations:** `prisma/migrations/` — applied with `npm run db:migrate` (dev) or
  `npm run db:deploy` (CI/production).
- **Seed:** `prisma/seed.ts` — idempotent upserts, run with `npm run db:seed`.
- **Client:** Prisma 7 uses the WASM query compiler plus `@prisma/adapter-pg`, so no
  native query-engine binary is required. The shared client lives in
  `src/server/db/prisma.ts` and is created lazily — `memory` mode never opens a pool.

### Local PostgreSQL

`npm run db:up` starts a **real PostgreSQL 17 server** using the `embedded-postgres`
package (`scripts/db-dev.mjs`). The binaries are downloaded from npm, so no admin
rights, Windows service install or Docker are needed. Data is stored in `.pgdata/`
(git-ignored); the database is `gos_dev` with user/password `postgres`/`postgres`.

```bash
npm run db:up       # start the server (creates the cluster + gos_dev on first run)
npm run db:stop     # stop it
```

The same setup works with any external PostgreSQL 17+ instance — point
`DATABASE_URL` at it and skip `db:up`. In CI, `.github/workflows/ci.yml` uses the
official `postgres:17` service container and runs `migrate deploy` + `db seed`.

> This machine cannot download the official EDB installer (HTTP 403) and has no
> Docker, so the local dev cluster comes from `embedded-postgres`. It is the same
> PostgreSQL server and wire protocol, only distributed differently.

### Migrations

```bash
npm run db:migrate -- --name add_customers   # create + apply a migration (dev)
npm run db:status                            # is the schema up to date?
npm run db:seed                              # seed (also runs after migrate dev)
npm run db:studio                            # browse data
```

## Architecture

```
prisma/
  schema.prisma             models + datasource
  migrations/               generated SQL, committed
  seed.ts                   idempotent demo data
scripts/
  db-dev.mjs                start local PostgreSQL (embedded-postgres)
  db-stop.mjs               stop it
src/
  app/                      routing + API (thin)
    api/health/route.ts
    api/products/route.ts
    api/products/[id]/route.ts
    api/dev/database/route.ts   dev-only JSON diagnostics
    dev/database/page.tsx       dev-only status screen
    page.tsx                    server component — calls services directly
    globals.css                 Tailwind v4 + shadcn theme tokens
  components/ui/            shadcn/ui primitives
  generated/prisma/         generated Prisma client (git-ignored)
  lib/                      shared, client-safe code
    api.ts                  response envelope types
    env.ts                  zod-validated environment config (failure = boot error)
    errors.ts               AppError + typed error codes
    types.ts                domain types
  server/                   server-only code, wired top-down
    db/prisma.ts            shared, lazily-created Prisma client
    validation/             zod schemas for every input (body, query, params)
    services/               business rules; may throw AppError; no HTTP access
    repositories/           data access behind an interface (in-memory + Prisma)
    http/                   request → handler mapping and the error envelope
```

**Data flow:**

```
route handler (src/app/api/**)
  → validation schema parse  (422 envelope on failure)
  → service                  (business rules, AppError)
  → repository               (storage detail lives here only)
← { ok: true, data } | { ok: false, error: { code, message, details? } }
```

Server components may call services directly and skip the HTTP hop — the home page
does exactly that.

## Conventions

- **Errors:** services throw `AppError` (`src/lib/errors.ts`). Route handlers are wrapped
  with `createApiHandler`, which turns `ZodError` → 422, `AppError` → its status,
  anything else → 500 with a generic message (unexpected errors are never leaked).
- **Responses:** always `{ ok: true, data }` or `{ ok: false, error }`.
- **Validation:** every input crosses a zod schema in `src/server/validation` first.
- **Storage:** repositories implement an interface. `REPOSITORY_MODE=database` (default)
  uses Prisma; `REPOSITORY_MODE=memory` keeps demo data in process memory.
- **Rendering:** Cache Components (`cacheComponents: true`) is on, so there is no
  `export const dynamic`. Request-time data (catalogue, database status) is read inside
  `<Suspense>` boundaries and calls `connection()`; the rest prerenders.

## Environment variables

Copy `.env.example` → `.env` and adjust. `.env*` files are git-ignored
(`.env.example` is the committed template), so secrets never reach Git. `lib/env.ts`
validates env at boot — bad config fails startup, not a request.

| Variable | Default | Notes |
| --- | --- | --- |
| `APP_NAME` | `GOS Store` | Display name |
| `NEXT_PUBLIC_APP_URL` | — | Absolute deployment URL |
| `REPOSITORY_MODE` | `database` | `database` or `memory` |
| `DATABASE_URL` | — | Required when `REPOSITORY_MODE=database` |

> Next.js also loads `.env.local`, which overrides `.env`. Make sure it does not pin
> `REPOSITORY_MODE=memory` if you want the database. Prisma CLI reads `.env`
> (see `prisma.config.ts`).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (webpack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run db:up` | Start local PostgreSQL 17 |
| `npm run db:stop` | Stop local PostgreSQL |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:migrate` | Create + apply a migration (dev) |
| `npm run db:deploy` | Apply pending migrations (CI/production) |
| `npm run db:seed` | Insert demo data |
| `npm run db:setup` | `migrate deploy` + `seed` (first run) |
| `npm run db:status` | Migration status |
| `npm run db:studio` | Prisma Studio |

## Windows note

This project pins `--webpack` in `dev`/`build` scripts: machines running Windows
Application Control (WDAC) cannot execute the native Turbopack/SWC bindings, and Next
falls back to WASM, which Turbopack does not support. On other platforms you can remove
the flag and use Turbopack normally. Prisma 7's WASM query compiler also avoids the
native-binary restriction.

## CI

`.github/workflows/ci.yml` runs on every push/PR with Node 22 and a `postgres:17`
service: install → `prisma migrate deploy` → `prisma db seed` → lint → build.

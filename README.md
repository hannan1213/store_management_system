# GOS — Store Management System

Store back office built on the **Next.js App Router** as a single full-stack codebase:
React (TypeScript) on the front, typed route handlers on the back calling
validation → service → repository layers.

**Stack:** Next.js 16 (App Router, `src/` dir) · TypeScript · Tailwind CSS v4 · shadcn/ui · Zod

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Useful endpoints:

| Endpoint | Response |
| --- | --- |
| `GET /api/health` | `{ ok: true, data: { status: "healthy", ... } }` |
| `GET /api/products?q=pen&page=1` | paginated catalogue |
| `GET /api/products/BEV-001` | single product (404 envelope if missing) |
| `POST /api/products` | create (422 on validation error, 409 on duplicate SKU) |

## Architecture

```
src/
  app/                      routing + API (thin)
    api/health/route.ts
    api/products/route.ts
    api/products/[id]/route.ts
    page.tsx                server component — calls services directly
    globals.css             Tailwind v4 + shadcn theme tokens
  components/ui/            shadcn/ui primitives
  lib/                      shared, client-safe code
    api.ts                  response envelope types
    env.ts                  zod-validated environment config (failure = boot error)
    errors.ts               AppError + typed error codes
    types.ts                domain types
  server/                   server-only code, wired top-down
    validation/             zod schemas for every input (body, query, params)
    services/               business rules; may throw AppError; no HTTP access
    repositories/           data access behind an interface (in-memory today)
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
- **Storage:** repositories implement an interface; `REPOSITORY_MODE=memory` keeps the
  template infra-free, `database` is reserved for the real storage layer.

## Environment variables

Copy `.env.example` → `.env.local` and adjust. `.env*` files are git-ignored
(`.env.example` is the committed template), so secrets never reach Git. `lib/env.ts`
validates env at boot — bad config fails startup, not a request.

| Variable | Default | Notes |
| --- | --- | --- |
| `APP_NAME` | `GOS Store` | Display name |
| `NEXT_PUBLIC_APP_URL` | — | Absolute deployment URL |
| `REPOSITORY_MODE` | `memory` | `memory` or `database` |
| `DATABASE_URL` | — | Required when `REPOSITORY_MODE=database` |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (webpack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Windows note

This project pins `--webpack` in `dev`/`build` scripts: machines running Windows
Application Control (WDAC) cannot execute the native Turbopack/SWC bindings, and Next
falls back to WASM, which Turbopack does not support. On other platforms you can remove
the flag and use Turbopack normally.

## CI

`.github/workflows/ci.yml` runs lint + build on every push/PR (needs Node 22).

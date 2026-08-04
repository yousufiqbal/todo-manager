# Todo Manager

A single-user todo manager built with SvelteKit and Turso. Todos live in lists and are
grouped into per-date cards. All mutations are optimistic — the UI updates immediately and
reconciles (or rolls back) once the request settles.

## Stack

- SvelteKit 2 + Svelte 5 (runes)
- Turso / libSQL via `@libsql/client`
- `adapter-vercel` (configured inline in `vite.config.js` — there is no `svelte.config.js`)
- Plain CSS, no component library

## Setup

```sh
npm install
cp .env.example .env   # then fill in the values below
npm run db:init        # creates tables and applies pending migrations
npm run dev
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` | libSQL connection URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `ADMIN_EMAIL` | The only account that can sign in |
| `ADMIN_PASSWORD` | Compared in constant time; stored as plain text by design |
| `SESSION_SECRET` | HMAC key for the session cookie — use a long random string |

Set the same five variables in the Vercel project settings before deploying. Do not escape
special characters in them: Vercel treats env values literally, whereas local `.env` files
go through Vite's `dotenv-expand`, so a value that needs escaping locally will break in
production.

## Auth

One hardcoded admin, no users table. Login compares `ADMIN_EMAIL` / `ADMIN_PASSWORD` in
constant time, then sets an httpOnly, `Secure`, `SameSite=Lax` cookie containing an
HMAC-signed payload with an embedded expiry (30 days). `src/hooks.server.ts` verifies it on
every request, redirecting page loads to `/login` and returning 401 JSON for `/api/*`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run check` | `svelte-check` typecheck |
| `npm run db:init` | Create tables + run idempotent migrations |

`db:init` is safe to re-run; it checks the existing schema with `PRAGMA table_info` before
adding or dropping columns.

## Notes

- `npm run build` fails locally on Windows with `EPERM: operation not permitted, symlink`
  unless Developer Mode is enabled. This affects an `adapter-vercel` step only; the build
  succeeds on Vercel's Linux builders.
- Dates are handled in local time via `src/lib/date.ts`. Avoid `toISOString()` for
  date-only values — it shifts the day for timezones ahead of UTC.

# Relay

Team task board: auth, projects, tasks, comments, attachments.
See `README.md` for setup, environment variables, and how to run everything.

## Layout

- `server/` - Express 5 API (TypeScript, ESM) plus a background worker (`src/worker.ts`)
- `client/` - React 19 + Vite single-page app
- `db/init/` - SQL schema, applied on first Postgres boot only
- `postman/` - importable API collection
- `docker-compose.yml` - Postgres 18 and Redis 8

## Commands

Run from `server/` or `client/`; there is no root package.json.

```bash
docker compose up -d          # Postgres + Redis (from the repo root)

cd server && npm run dev      # API, tsx watch
cd server && npm run worker   # notification queue worker
cd server && npm run typecheck

cd client && npm run dev
cd client && npm run typecheck
```

There is no test suite and no linter. `npm run typecheck` in both packages is the check to run after changes.

## Conventions

- ESM with TypeScript: relative imports inside `server/` must carry the `.js` extension (`../lib/errors.js`), even though the source file is `.ts`.
- `server/src/config/env.js` must be imported first in any entry point, before anything that reads `process.env`.
- Raw SQL through `pg` only - no ORM. Always use parameterised queries (`$1`, `$2`), never string interpolation.
- Routes live in `server/src/routes/` and are thin: validate input, check access, query, respond. Shared logic belongs in `server/src/lib/`.
- Validation helpers (`parseId`, `parseDueDate`, `isTaskStatus`) live in `lib/validate.ts`; access checks (`isProjectMember`, `getTaskAccess`) in `lib/access.ts`. Reuse them rather than re-implementing.
- Error shape is always `{ error: string }` with an explicit status: 400 invalid input, 401 missing/bad token, 403 not a member, 404 not found, 500 unexpected.
- Catch blocks log with `console.error('[scope] what failed:', errMessage(err))` and return a generic 500 message. Never leak a raw error to the client.
- Auth is JWT via the `requireAuth` middleware, mounted at the router level in `index.ts`. Inside protected routes `req.user!.id` is safe.
- Redis is used for the project-list cache, login rate limiting, and the task-assignment queue. Invalidate the cache on writes that change a user's project list.
- Attachments are stored on local disk under `server/uploads/` (gitignored) and are downloadable only by project members.
- Comments explain *why*, in sentence case, above the code they describe. Match the existing density - do not narrate obvious lines.

## Guardrails

- Never commit `.env`; `.env.example` documents the required variables.
- `db/init/` runs only on an empty volume. A schema change means either a new migration path or `docker compose down -v` (which destroys local data - ask first).

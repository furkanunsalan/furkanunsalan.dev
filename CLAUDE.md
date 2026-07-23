# Working in this repo

Personal site. **Astro 4 SSR** (React islands, Node standalone adapter, shipped as a distroless container) + a small Go SSH terminal twin under `terminal/`. Content lives in a Postgres database; the site reads and writes it through `lib/db.ts` (Drizzle ORM over postgres-js). A custom admin under `/admin/*` (iron-session + argon2) is the only way to edit content.

The React components under `components/*` are reused from the previous Next.js app — they render as Astro islands (`client:load` / `client:idle` / `client:only`). The handful of `next/*` APIs they relied on are shimmed by `components/_compat.tsx` (`Link`, `Image`, `useRouter`, `usePathname`, `useSearchParams`). There is no Next.js left in the build.

For a layout overview see [`CODEMAP.md`](CODEMAP.md).

## What to know before editing

- **Source of truth is Postgres.** Pages call `lib/content.ts` which queries via Drizzle (`lib/db.ts`). Schema lives in `db/schema.ts`. Adding a new field means editing both the schema (then `npm run db:generate && npm run db:migrate`) AND the reader function in `lib/content.ts`. Forgetting one is the typical bug.
- **SSR everywhere; DB-backed routes set `export const prerender = false`.** The site is `output: "server"` (`astro.config.mjs`), so routes render at request time. The build env has no DB access, so any page/endpoint that reads Postgres explicitly opts out of prerender with `export const prerender = false`. Adding a new content route → mirror that.
- **Reads are cached in-memory; admin writes bust tags via `lib/revalidate.ts`.** `lib/cache.ts` is a single-process tagged cache (`cachedReader(keyParts, tags, fn, fallback)`, 1h TTL) that replaces Next's `unstable_cache`. Every mutating route handler calls `revalidateCollection("posts", slug)` — a central `collection → tags` map that calls `bustTag(...)`. When adding a new collection, extend that map; don't reach into `lib/cache.ts` directly. (Single-process assumption: if this ever runs multi-instance, swap the Map store for Valkey/Redis behind the same interface.)
- **Admin sits behind iron-session.** `src/middleware.ts` (`defineMiddleware`) gates `/admin/*` + `/api/admin/*`, with `/admin/login` + `/api/admin/login` as the only public exceptions, and sets security headers on every response. Sessions are sealed/unsealed over Astro cookies in `lib/session.ts` (`getSession`/`saveSession`/`clearSession`). `ADMIN_SESSION_SECRET` (≥32 chars) is mandatory at module-load; `lib/auth.ts` throws if missing.
- **Uploads land outside the server bundle.** `UPLOADS_DIR` defaults to `<repo>/.uploads` in dev; in the container it's the `/uploads` named volume. `/api/img/[...path]` streams from there with a path-traversal-safe resolver.

## Conventions

- **`.astro` renders on the server; interactivity is a React island.** Author pages/layouts in `.astro`; anything interactive is a React component in `components/*` mounted with a `client:*` directive (`client:load`, `client:idle`, or `client:only="react"` for browser-only libs like Leaflet/react-pdf). Reach for `_compat.tsx` instead of importing `next/*`.
- **DB-backed pages/endpoints are dynamic.** Always `export const prerender = false` on anything that reads the DB. Reserve prerender for truly static routes.
- **Fail soft on DB reads.** Every reader in `lib/content.ts` returns `[]` / `null` / safe defaults on query failure (logs to `console.error`). A Postgres blip should not 500 the whole site.
- **`friendlyDbError(e, resource)` on every catch.** PostgresError messages contain SQL + params — never let them surface raw. Wrap every POST/PATCH/DELETE:
  ```ts
  } catch (e) {
    const f = friendlyDbError(e, "tool");
    return new Response(JSON.stringify({ error: f.error }), {
      status: f.status,
      headers: { "content-type": "application/json" },
    });
  }
  ```
- **Validate request bodies with `readJson`.** `lib/validate.ts` → `readJson(request, ZodSchema)` returns `{ data }` or `{ response }` (a `400` naming the first bad field) that the handler returns directly.
- **Centralized helpers.** Slug generation → `lib/slugify.ts` (`slugifyAscii`, `cleanUserSlug`). Excerpts → `lib/excerpt.ts`. Validation cleaners → `lib/validators.ts`. Add to these rather than re-implementing.
- **AMOLED palette is in `tailwind.config.ts`.** Use `bg-zinc-950`/`bg-black` and the named tokens (`dark-*`, `light-*`, `accent-primary`) rather than ad-hoc hex.
- **No comments unless the WHY is non-obvious.** Names should carry meaning. Existing files reflect this — keep that bar.
- **Commit style is Conventional Commits.** Pre-commit hook runs `npm run format && npm run build` (prettier + `astro build`) — don't bypass with `--no-verify`; fix the type/lint error. (`npm run typecheck` = `astro check` if you want types without a full build.)

## Local dev

```bash
npm install
npm run dev          # http://localhost:3000
```

`npm run dev` is `node --env-file=.env.local ./node_modules/astro/astro.js dev`. It first runs a `predev` step (`scripts/dev-tunnel.mjs`) that opens an SSH tunnel from `127.0.0.1:$DB_TUNNEL_PORT` (default `3333`) to the VPS Postgres if it isn't already open. The script is idempotent — if the port is already listening it reuses the existing tunnel.

Because dev loads env via node's `--env-file`, everything the app needs at request time must be in **`.env.local`**: at least `DATABASE_URL`, `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD_HASH` (for admin login), `VPS_SSH_TARGET` (e.g. `root@your-vps`), and optionally `DB_TUNNEL_PORT` (default `3333`). Rotate the admin hash with `npm run admin:set-password -- "new password"` — it writes the argon2id hash straight into `.env.local` as a **plain** PHC string. Do not hand-escape the `$` signs to `\$`: node's `--env-file` does no variable expansion and passes the backslashes through verbatim, so `argon2.verify` then rejects the malformed hash and login fails with "invalid password".

Admin UI is at `/admin` (login → dashboard → per-collection lists/forms). Single-password auth; the hash is in env.

For the terminal twin: `cd terminal && make run` (`ssh -p 2222 localhost`).

### Run the whole stack in containers

```bash
docker compose up --build   # app on 127.0.0.1:3010 + its own Postgres
```

`compose.yml` brings up `app` (the distroless image) + `db` (`postgres:17-alpine`, healthchecked; the app waits for it). Uploads and DB data are named volumes (`uploads`, `pgdata`). The app is published only on `127.0.0.1:3010` for a host reverse-proxy (Caddy) to front. Secrets come from a sibling **`.env`** file — see `.env.example`; never commit it.

### Env vars (web)

| Var                    | Used for                                                                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Postgres connection. Dev points at the SSH tunnel (`:3333` by default); in compose it's the `db` service (`postgres://furkan:...@db:5432/furkanunsalan`).                                                                                                                 |
| `VPS_SSH_TARGET`       | Dev-only. SSH target for the auto-tunnel (e.g. `root@45.143.4.115`).                                                                                                                                                                                                      |
| `DB_TUNNEL_PORT`       | Dev-only. Local port for the SSH tunnel (default `3333`).                                                                                                                                                                                                                 |
| `ADMIN_SESSION_SECRET` | iron-session cookie secret (≥32 chars; module-load throws if missing).                                                                                                                                                                                                    |
| `ADMIN_PASSWORD_HASH`  | argon2id PHC hash. Dev: in `.env.local`. Container: a compose env var (from the sibling `.env`).                                                                                                                                                                          |
| `UPLOADS_DIR`          | Absolute path for image uploads (outside the server bundle; `/uploads` volume in the container).                                                                                                                                                                          |
| `UPLOAD_REMOTE`        | Dev-only. `user@host:/abs/dir` — when set, `saveUpload` streams the file over `ssh` instead of writing to local `UPLOADS_DIR`. Use to push uploads straight to prod while developing.                                                                                     |
| `UPLOAD_PROXY_URL`     | Dev-only. e.g. `https://furkanunsalan.dev` — when `/api/img` can't find a file locally it fetches from this origin so prod-uploaded images preview on `localhost`.                                                                                                        |
| `GITHUB_TOKEN`         | Repo list, contribution graph (personal account), READMEs. For private contributions to count in the graph, this must be the personal account's own PAT with `repo` scope.                                                                                                |
| `GITHUB_TOKEN_WORK`    | (Optional) Work account's own PAT — overlays a second contribution graph. Private contributions only count when it's the work account's own token with `repo` scope. Absent → the work account is queried with `GITHUB_TOKEN` and only its **public** contributions show. |
| `GITHUB_USERNAME_WORK` | (Optional) Work GitHub login for the overlaid graph. Defaults to `furkanunsalan-teachfluence`.                                                                                                                                                                            |
| `KARAKEEP_API_KEY`     | Karakeep bookmarks page.                                                                                                                                                                                                                                                  |
| `RAINDROP_TOKEN`       | (Optional, legacy) Raindrop bookmarks page.                                                                                                                                                                                                                               |
| `UNSPLASH_ACCESS_KEY`  | Photos page.                                                                                                                                                                                                                                                              |
| `NEXT_PUBLIC_SITE_URL` | Absolute URLs in OG/RSS. (Name kept from the Next era for continuity — it's a plain env var now, read via `process.env`.)                                                                                                                                                 |

## Containers & deploy

- **Image (`Dockerfile`).** Multi-stage. Builder is `node:22-bookworm-slim` (glibc — matches the runtime so the `sharp`/`argon2` prebuilds are ABI-compatible); it runs `npm ci`, `astro build`, then `npm prune --omit=dev`. Runtime is `gcr.io/distroless/nodejs22-debian12` (no shell, no package manager) and copies only `dist/`, `node_modules/`, `public/`. Entry: `node dist/server/entry.mjs`. Build-time `ADMIN_SESSION_SECRET`/`DATABASE_URL` are placeholders — never baked into the bundle.
- **Stack (`compose.yml`).** `app` + `db` as described above. Distroless has no shell, so there's no container `healthcheck:` on `app` — point uptime monitoring at `http://127.0.0.1:3010/api/health` (returns `{ status, checks: { db, uploads } }`).
- **Deploy (`deploy.yml`).** Push to `main` → GitHub Actions rsyncs the build context to the VPS and runs `docker compose up -d --build` there (image built on the VPS — no registry), then health-checks `http://127.0.0.1:3010/api/health`. Prerequisites on the VPS: a compose `.env` with the runtime secrets (see `.env.example`) and, on first cutover only, a one-time restore of the current data into the `db` volume (see the header of `compose.yml`). The Go terminal twin still ships separately via `deploy-terminal.yml`. (The old PM2 descriptor `ecosystem.config.cjs` has been removed; `.env.pm2.secrets` is no longer read by any tooling.)

## DB ops

- **Postgres** is the `db` service in `compose.yml` (`postgres:17-alpine`), data on the `pgdata` named volume. (The pre-container setup ran a standalone `furkanunsalan-pg` container on the VPS bound to `127.0.0.1:5432`.)
- **Backups.** Take a periodic `pg_dump -Fc` of the `db` service (e.g. `docker compose exec -T db pg_dump -Fc -U furkan furkanunsalan > dump`). The old host-pg had a `furkanunsalan-pg-backup.timer` systemd job → `/root/backups/` with 14-day retention; port that to the compose service as part of the deploy migration.
- **Schema changes:** edit `db/schema.ts` → `npm run db:generate` (creates `db/migrations/NNNN_*.sql`) → open the tunnel (or expose the compose `db` port) → `npm run db:migrate`.

## Common tasks

- **Add a new page route** — drop it under `src/pages/<route>.astro` (or `<route>/index.astro`). If it reads the DB, add `export const prerender = false`. Reusable React UI goes in `components/*` and is mounted with a `client:*` directive.
- **Add a content collection** — extend `db/schema.ts`, generate + apply migration, add a reader in `lib/content.ts`, add admin API endpoints under `src/pages/api/admin/<col>/` (POST/PATCH/DELETE wrapped in `friendlyDbError`, bodies validated with `readJson`), add admin pages under `src/pages/admin/<col>/` (list + form + new + edit), and wire the collection name into `lib/revalidate.ts`.
- **Update OG images** — `lib/og.ts` builds the card as an SVG string and rasterizes it with `@resvg/resvg-js` using the self-hosted Inter woff2 (no browser, no external service). The endpoints `src/pages/og/*.png.ts` call `renderOgImage(...)`; `og:image`/`twitter:*`/`canonical` meta is set in `src/layouts/Layout.astro` (default `/og/default.png`), with per-page images passed by the `writing/[slug]` and `projects/[slug]` pages.
- **Add a place via Maps URL** — `/admin/places/new`, paste the URL into the resolver panel. It follows short-link redirects, parses lat/lng, reverse-geocodes via OSM Nominatim. Detects existing-slug collisions and offers a jump-to-edit link.
- **Sync GitHub repo visibility** — `/admin/projects` (scroll to the GitHub repos section), click "Sync from GitHub". Reconciles via 1–3 bulk SQL statements in a transaction.

# Working in this repo

Personal site. Next.js 14 App Router + a small Go SSH terminal twin under `terminal/`. Content lives in a Postgres database on the VPS; the site reads and writes it through `lib/db.ts` (Drizzle ORM over postgres-js). A custom admin under `/admin/*` (iron-session + argon2) is the only way to edit content.

For a layout overview see [`CODEMAP.md`](CODEMAP.md).

## What to know before editing

- **Source of truth is Postgres.** Pages call `lib/content.ts` which queries via Drizzle (`lib/db.ts`). Schema lives in `db/schema.ts`. Adding a new field means editing both the schema (then `npm run db:generate && npm run db:migrate`) AND the reader function in `lib/content.ts`. Forgetting one is the typical bug.
- **All DB-backed public pages are `force-dynamic`.** The CI runner has no access to the VPS Postgres (bound to `127.0.0.1`), so prerender-at-build would fail. Each public page that reads from the DB has `export const dynamic = "force-dynamic"`. Adding a new content route → mirror that.
- **Admin writes invalidate public caches via `lib/revalidate.ts`.** Every mutating route handler calls `revalidateCollection("posts", slug)` or similar — there's a central map of `collection → paths to revalidate`. When adding a new collection, extend that map; don't sprinkle `revalidatePath()` calls.
- **Admin sits behind iron-session.** `middleware.ts` gates `/admin/*` + `/api/admin/*`, with `/admin/login` + `/api/admin/login` as the only public exceptions. `ADMIN_SESSION_SECRET` (≥32 chars) is mandatory at module-load; `lib/auth.ts` throws if missing.
- **Uploads land outside the standalone bundle.** `UPLOADS_DIR` defaults to `<repo>/.uploads` in dev and `/root/furkanunsalan-uploads` in prod — never inside the rsync target so files survive deploys. `/api/img/[...path]` streams from there with a path-traversal-safe resolver.

## Conventions

- **Server components by default.** Mark client components explicitly with `"use client"`.
- **Public pages are dynamic.** Always `export const dynamic = "force-dynamic"` on pages/route handlers that read DB. Reserve ISR (`revalidate = N`) for routes that pull from external APIs you trust to throttle yourself.
- **Fail soft on DB reads.** Every reader in `lib/content.ts` returns `[]` / `null` / safe defaults on query failure (logs to `console.error`). A Postgres blip should not 500 the whole site.
- **`friendlyDbError(e, resource)` on every catch.** PostgresError messages contain SQL + params — never let them surface raw. Wrap every POST/PATCH/DELETE in `try { ... } catch (e) { const f = friendlyDbError(e, "..."); return NextResponse.json({ error: f.error }, { status: f.status }); }`.
- **Centralized helpers.** Slug generation → `lib/slugify.ts` (`slugifyAscii`, `cleanUserSlug`). Excerpts → `lib/excerpt.ts`. Validation cleaners → `lib/validators.ts`. Add to these rather than re-implementing.
- **AMOLED palette is in `tailwind.config.ts`.** Use `bg-zinc-950`/`bg-black` and the named tokens (`dark-*`, `light-*`, `accent-primary`) rather than ad-hoc hex.
- **No comments unless the WHY is non-obvious.** Names should carry meaning. Existing files reflect this — keep that bar.
- **Commit style is Conventional Commits.** Pre-commit hook runs `prettier --write && next build` — don't bypass with `--no-verify`; fix the type/lint error.

## Local dev

```bash
npm install
npm run dev          # http://localhost:3000
```

`npm run dev` runs a `predev` step (`scripts/dev-tunnel.mjs`) that opens an SSH tunnel from `127.0.0.1:$DB_TUNNEL_PORT` (default `3333`) to the VPS Postgres if it isn't already open. The script is idempotent — if the port is already listening it reuses the existing tunnel.

`.env.local` must contain at least `DATABASE_URL`, `ADMIN_SESSION_SECRET`, `VPS_SSH_TARGET` (e.g. `root@your-vps`), and optionally `DB_TUNNEL_PORT` (default `3333`). `ADMIN_PASSWORD_HASH` lives in `.env.pm2.secrets` (sidecar file PM2's `ecosystem.config.cjs` loads but Next's `@next/env` does NOT — its dotenv-expand silently drops every `$` in the argon2 PHC hash from any auto-loaded `.env.*`, which clobbers the value at request time). To rotate: `npm run admin:set-password -- "new password"` writes to `.env.pm2.secrets`. For prod, `scp .env.pm2.secrets <vps>:/root/furkanunsalan.dev/` then `pm2 restart furkanunsalan --update-env`.

Admin UI is at `/admin` (login → dashboard → per-collection lists/forms). Single-password auth; the hash is in env.

For the terminal twin: `cd terminal && make run` (`ssh -p 2222 localhost`).

### Env vars (web)

| Var                    | Used for                                                                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Postgres connection. Dev points at the SSH tunnel (`:3333` by default); prod at `127.0.0.1:5432`.                                                                                                                                                                         |
| `VPS_SSH_TARGET`       | Dev-only. SSH target for the auto-tunnel (e.g. `root@45.143.4.115`).                                                                                                                                                                                                      |
| `DB_TUNNEL_PORT`       | Dev-only. Local port for the SSH tunnel (default `3333`).                                                                                                                                                                                                                 |
| `ADMIN_SESSION_SECRET` | iron-session cookie secret (≥32 chars; module-load throws if missing).                                                                                                                                                                                                    |
| `ADMIN_PASSWORD_HASH`  | argon2id PHC hash; lives in `.env.pm2.secrets` only (NOT `.env.local`/`.env.production`).                                                                                                                                                                                 |
| `UPLOADS_DIR`          | Absolute path for image uploads (outside the rsync target).                                                                                                                                                                                                               |
| `UPLOAD_REMOTE`        | Dev-only. `user@host:/abs/dir` — when set, `saveUpload` streams the file over `ssh` instead of writing to local `UPLOADS_DIR`. Use to push uploads straight to prod while developing.                                                                                     |
| `UPLOAD_PROXY_URL`     | Dev-only. e.g. `https://furkanunsalan.dev` — when `/api/img` can't find a file locally it fetches from this origin so prod-uploaded images preview on `localhost`.                                                                                                        |
| `GITHUB_TOKEN`         | Repo list, contribution graph (personal account), READMEs. For private contributions to count in the graph, this must be the personal account's own PAT with `repo` scope.                                                                                                |
| `GITHUB_TOKEN_WORK`    | (Optional) Work account's own PAT — overlays a second contribution graph. Private contributions only count when it's the work account's own token with `repo` scope. Absent → the work account is queried with `GITHUB_TOKEN` and only its **public** contributions show. |
| `GITHUB_USERNAME_WORK` | (Optional) Work GitHub login for the overlaid graph. Defaults to `furkanunsalan-teachfluence`.                                                                                                                                                                            |
| `RAINDROP_TOKEN`       | (Optional, legacy) Raindrop bookmarks page.                                                                                                                                                                                                                               |
| `KARAKEEP_API_KEY`     | Karakeep bookmarks page.                                                                                                                                                                                                                                                  |
| `UNSPLASH_ACCESS_KEY`  | Photos page.                                                                                                                                                                                                                                                              |
| `NEXT_PUBLIC_SITE_URL` | Absolute URLs in OG/RSS.                                                                                                                                                                                                                                                  |

## Deploy

Push to `main` → GitHub Actions builds and rsyncs to the VPS. `deploy.yml` for the Next.js side, `deploy-terminal.yml` for the Go binary.

`.env.production` and `.env.pm2.secrets` on the VPS are excluded from rsync. After a deploy, PM2 reloads with `--update-env` and re-reads both via `ecosystem.config.cjs`.

## DB ops

- **Postgres** runs in a Docker container on the VPS (`furkanunsalan-pg`, `postgres:17-alpine`, bound to `127.0.0.1:5432`). Named volume `furkanunsalan-pg-data` survives container restarts.
- **Daily backup** at 03:30 UTC via the systemd timer `furkanunsalan-pg-backup.timer` → `pg_dump -Fc -Z 6` → `/root/backups/furkanunsalan-pg/` with 14-day retention.
- **Schema changes:** edit `db/schema.ts` → `npm run db:generate` (creates `db/migrations/NNNN_*.sql`) → open the tunnel → `npm run db:migrate`. Both dev and prod hit the same DB, so this updates both at once.

## Common tasks

- **Add a new page route** — drop it under `app/(pages)/<route>/page.tsx`. The route group `(pages)` does not affect the URL. If it reads DB, add `export const dynamic = "force-dynamic"`.
- **Add a content collection** — extend `db/schema.ts`, generate + apply migration, add a reader in `lib/content.ts`, add admin routes under `app/api/admin/<col>/` (POST/PATCH/DELETE wrapped in `friendlyDbError`), add an admin page under `app/admin/<col>/` (list + form + new + edit), wire the collection name into `lib/revalidate.ts`.
- **Update OG image style** — `lib/og.tsx` is the single template; route-specific images (`opengraph-image.tsx`) call `renderOgImage(...)` with custom props.
- **Add a place via Maps URL** — `/admin/places/new`, paste the URL into the resolver panel. It follows short-link redirects, parses lat/lng, reverse-geocodes via OSM Nominatim. Detects existing-slug collisions and offers a jump-to-edit link.
- **Sync GitHub repo visibility** — `/admin/projects` (scroll to the GitHub repos section), click "Sync from GitHub". Reconciles via 1–3 bulk SQL statements in a transaction.

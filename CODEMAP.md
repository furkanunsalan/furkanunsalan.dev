# Codemap

Where things live and what they're for. Pair with [`CLAUDE.md`](CLAUDE.md) for conventions.

## Top level

| Path                 | What                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `src/`               | Astro app: `pages/` (routes + API + OG), `layouts/`, `middleware.ts`, `styles/`.                 |
| `components/`        | React islands (mounted from `.astro` with `client:*`). `admin/` holds admin form widgets.        |
| `lib/`               | Server-side helpers: DB client, auth/session, content readers, cache, uploads, OG, slug/excerpt. |
| `db/`                | Drizzle schema (`schema.ts`) + generated migrations.                                             |
| `public/`            | Static assets (banners, photos, OG fallbacks, pdf.js worker).                                    |
| `data/`              | Small static assets (e.g. `asciiPortrait.ts` — the home ASCII portrait).                         |
| `types/`             | Shared TypeScript types.                                                                         |
| `terminal/`          | Go + Charm Wish SSH twin. Standalone module, own deploy (`deploy-terminal.yml`).                 |
| `scripts/`           | `db-migrate.mjs`, `admin-set-password.mjs`, `dev-tunnel.mjs`.                                    |
| `.github/workflows/` | `ci.yml`, `deploy.yml` (web, compose), `deploy-terminal.yml` (Go binary).                        |
| `astro.config.mjs`   | SSR (`output: "server"`) + Node standalone adapter; React + Tailwind integrations; `@` alias.    |
| `Dockerfile`         | Multi-stage build → distroless runtime (`node dist/server/entry.mjs`).                           |
| `compose.yml`        | App (distroless) + Postgres `db` service; `uploads`/`pgdata` volumes; app on `127.0.0.1:3010`.   |
| `drizzle.config.ts`  | Drizzle Kit config (schema path, migrations out dir, reads `DATABASE_URL`).                      |
| `tailwind.config.ts` | AMOLED palette tokens (`dark-*`, `light-*`, `accent-primary`).                                   |

## `src/`

`.astro` files render on the server; anything interactive is a React island in `components/*` mounted with a `client:*` directive. The few `next/*` APIs the ported components use are shimmed by `components/_compat.tsx`. Every DB-backed route sets `export const prerender = false`.

```
src/
├── middleware.ts            # iron-session gate for /admin/* + /api/admin/* + security headers
├── env.d.ts                 # Astro ambient types
├── styles/globals.css       # base styles, page-enter, image shimmer
├── layouts/
│   ├── Layout.astro         # <html>/<head>, fonts, OG/Twitter/canonical meta, CommandPalette + FaviconAnimator islands
│   ├── PageLayout.astro     # Layout + SiteNav; forwards head/OG props
│   └── AdminLayout.astro     # admin chrome (nav / logout / view-link islands)
│
└── pages/
    ├── index.astro          # home: info card + AsciiPortrait + Time + GithubCommitHistory + latest thought
    ├── writing/index.astro + writing/[slug].astro     # list + post (PostBody island renders Markdoc client-side)
    ├── projects/index.astro + projects/[slug].astro   # list (ProjectsExplorer) + project (ProjectBody / showcases)
    ├── experience.astro · photos.astro · places.astro · bookmarks.astro · gadgets.astro · resume.astro
    ├── search.astro         # global search page (SSR results, noindex)
    ├── 404.astro            # glitch 404 + did-you-mean suggestions via search
    ├── rss.xml.ts · sitemap.xml.ts · robots.txt.ts · pdf-worker.ts
    │
    ├── og/                  # PNG OG cards rendered by lib/og.ts (@resvg/resvg-js)
    │   ├── default.png.ts · writing/[slug].png.ts · projects/[slug].png.ts
    │
    ├── admin/               # iron-session-gated CMS (one .astro per screen)
    │   ├── index.astro      # dashboard (counts + recent login audit)
    │   ├── login.astro      # only admin path that's public
    │   ├── posts/ · projects/ · experiences/ · tools/ · thoughts/ · places/   # index + new + [slug|id|name]
    │   ├── photos.astro · cv.astro · settings/home.astro
    │   └── activity.astro · logins.astro · trash.astro · uploads.astro · rename.astro · db.astro · backup.astro
    │
    └── api/
        ├── health.ts                    # { status, checks: { db, uploads } } — used by the deploy health check
        ├── github/contributions.ts      # GraphQL contribution calendar (personal + work overlay)
        ├── tools.ts · search/index.ts (→ /api/search) · karakeep/…
        ├── img/[...path].ts             # public stream from UPLOADS_DIR (traversal-safe)
        ├── cv.ts · pdf-worker
        └── admin/                       # all gated by middleware
            ├── login.ts                 # argon2.verify + saveSession (rate-limited, audited)
            ├── logout.ts · upload.ts · rename.ts · cv.ts
            ├── posts.ts + posts/[slug].ts   (same shape: projects, experiences, tools, thoughts, places, photos)
            ├── place-lists.ts + [name].ts · places/bulk.ts · places/resolve-url.ts
            ├── settings/home.ts · settings/github.ts + github/sync.ts
            ├── trash.ts + purge/restore · uploads/{list,file,usage,sweep}
            └── db/{tables,rows,schema,migrations} · backup/{export,import}
```

## `db/`

```
db/
├── schema.ts          # All Drizzle table defs + pgEnums. Single source of truth.
└── migrations/        # Generated by drizzle-kit. Apply with `npm run db:migrate`.
```

Tables: `posts`, `projects`, `experiences`, `tools`, `places`, `place_lists`, `photos`, `thoughts`, `home_settings`, `cv_settings`, `github_project_visibility`, `admin_logins`, `audit_events`.

Six of those (`posts`, `projects`, `experiences`, `tools`, `places`, `thoughts`) also carry a generated `search_vector` tsvector + GIN index from migration `0011`, which global search queries. They're intentionally absent from `schema.ts` — see the note there.
Enums: `place_status`, `tool_category`, `home_social_icon`, `experience_kind`.

## `components/`

React islands. Key ones:

| File                                                                     | Role                                                                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `_compat.tsx`                                                            | Drop-in shims for `next/*` (`Link`, `Image` (forwardRef), `useRouter`, …).                     |
| `SiteNav.tsx` / `MainNavbar.tsx`                                         | Top nav + cmd-shortcut badges.                                                                 |
| `CommandPalette.tsx`                                                     | ⌘K palette — debounced queries against `/api/search`, ⌘⏎ opens `/search`.                      |
| `SearchResults.tsx` / `search-ui.tsx`                                    | `/search` page (SSR first paint, kind filters) + shared kind labels/highlighting.              |
| `HomeIntro.tsx` / `HomeSocialLink.tsx` / `Time.tsx`                      | Home bio block, socials, Istanbul clock.                                                       |
| `AsciiPortrait.tsx`                                                      | Home ASCII portrait (data in `data/asciiPortrait.ts`).                                         |
| `GithubCommitHistory.tsx` / `ContributionContainer.tsx`                  | Contribution heatmap + stats.                                                                  |
| `PostBody.tsx` / `ProjectBody.tsx`                                       | Client-side Markdoc render (Mermaid, bento images, TOC) for post/project bodies.               |
| `TableOfContents.tsx` / `PostBentoImages.tsx` / `Mermaid.tsx`            | Post-body building blocks.                                                                     |
| `ProjectsExplorer.tsx` / `ProjectContainer.tsx`                          | Projects list + card.                                                                          |
| `InfraShowcase.tsx` / `TeachfluenceStudioShowcase.tsx`                   | Bespoke project showcases.                                                                     |
| `CompanyExperienceGroup.tsx` / `ExperienceContainer.tsx`                 | Experience grouping + role card.                                                               |
| `Photos.tsx` · `PlacesMap*.tsx` / `PlacesList.tsx` / `PlacesSection.tsx` | Photos masonry; Leaflet/CARTO map + list.                                                      |
| `KarakeepBookmarks.tsx` / `BookmarkGraph.tsx`                            | Bookmarks list + tag graph.                                                                    |
| `GadgetsBlueprint.tsx` / `GadgetGlyph.tsx`                               | Gadgets page (blueprint layout, hover-tint icons).                                             |
| `ThoughtImageGallery.tsx`                                                | Thought lightbox with swipeable image carousel.                                                |
| `SmartImage.tsx`                                                         | Lazy, load-gated image with shimmer + cross-fade.                                              |
| `ResumePdfPages.tsx`                                                     | react-pdf viewer for `/resume` (worker served by `pdf-worker`).                                |
| `FaviconAnimator.tsx` / `TopProgressBar.tsx` / `ScrambleText.tsx`        | Favicon animation, route progress, text scramble.                                              |
| `admin/*`                                                                | Admin form widgets (`PostForm`, `ProjectForm`, `ToolForm`, `PlaceForm`, shared `form.tsx`, …). |
| `ui/`                                                                    | shadcn-style Radix wrappers (dropdown-menu, select, tabs, breadcrumb).                         |

## `lib/`

| File                                                                                                                                           | Exports                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `db.ts`                                                                                                                                        | `db` (Drizzle over postgres-js) + `schema` re-export.                                                                                                                                                                        |
| `auth.ts`                                                                                                                                      | iron-session `sessionOptions`. Throws at module-load if `ADMIN_SESSION_SECRET` missing/<32 chars.                                                                                                                            |
| `session.ts`                                                                                                                                   | `getSession` / `saveSession` / `clearSession` over Astro cookies (sealData/unsealData).                                                                                                                                      |
| `content.ts`                                                                                                                                   | DB readers (`getPosts`, `getPostContentBySlug`, `getCustomProjects`, `getExperiences`, `getTools`, `getPlaces`, `getThoughts`, `getPhotos`, …). All fail soft. Cached ones go through `cachedReader`.                        |
| `cache.ts`                                                                                                                                     | In-memory tagged cache (`cachedReader`, `bustTag`) — replaces Next `unstable_cache`.                                                                                                                                         |
| `revalidate.ts`                                                                                                                                | `revalidateCollection(...)` → `bustTag(...)`. Central collection → tags map.                                                                                                                                                 |
| `search.ts`                                                                                                                                    | `search(q, {limit, kinds})` — weighted tsvector union across the six searchable tables, with a pg_trgm typo-tolerant fallback tier. Fails soft. Also `getRelatedPosts` (shared-tag + text similarity, two relevance floors). |
| `search-query.ts`                                                                                                                              | Pure half of search: `parseQuery` (phrases, -exclusions, as-you-type prefix), `makeSnippet`, `hrefFor`, kind types. No DB import — safe for client islands.                                                                  |
| `headings.ts`                                                                                                                                  | `slugifyHeading` / `splitSections` — the single definition of heading anchor ids, shared by `PostBody`/`ProjectBody` and search deep-links.                                                                                  |
| `validate.ts`                                                                                                                                  | `readJson(req, schema)` — zod body validation returning `{ data }` or a `400` `Response`.                                                                                                                                    |
| `db-errors.ts`                                                                                                                                 | `friendlyDbError(e, resource)` — maps PG error codes to clean `{ error, status }`, strips SQL.                                                                                                                               |
| `og.ts`                                                                                                                                        | `renderOgImage(...)` — hand-built SVG rasterized by `@resvg/resvg-js` with self-hosted Inter.                                                                                                                                |
| `uploads.ts`                                                                                                                                   | `saveUpload`, `resolveServePath`, `mimeFor`, `UPLOADS_DIR` (traversal-hardened).                                                                                                                                             |
| `github.ts`                                                                                                                                    | `getGithubRepos`, `getGithubRepo`, `getGithubReadme`, `getContributionCalendar`.                                                                                                                                             |
| `karakeep.ts`                                                                                                                                  | Karakeep bookmarks API wrapper.                                                                                                                                                                                              |
| `slugify.ts` / `excerpt.ts` / `validators.ts`                                                                                                  | Slug generation, card excerpts, admin input cleaners.                                                                                                                                                                        |
| `place-resolve.ts` / `place-list-icons.ts`                                                                                                     | Maps-URL resolver (SSRF-hardened) + icon registry.                                                                                                                                                                           |
| `health.ts` · `audit.ts` · `image-compress.ts` · `photoImport.ts` · `backup-collections.ts` · `db-tables.ts` · `uploadRefs.ts` · `cv/build.ts` | Health check, audit log, image processing, photo EXIF import, backup/restore, DB console, upload GC, CV PDF build.                                                                                                           |

## `terminal/`

Go + Charm Wish SSH twin (`ssh -p 2222 furkanunsalan.dev`). Independent module, separate deploy via `deploy-terminal.yml`, runs as the `furkanunsalan-term` systemd unit on the VPS host.

```
terminal/
├── cmd/server/main.go                # SSH + Bubble Tea bootstrap, .env loader
├── internal/tui/                     # views, styles, root model
└── internal/data/                    # db.go (pgxpool), loaders.go, github.go, raindrop.go, dotenv.go
```

It runs on the host (not in compose) and reaches Postgres at `127.0.0.1:5432`, so the compose `db` service is published there (localhost-only) and `term.env`'s `DATABASE_URL` mirrors the web app's credentials.

## Scripts & workflows

| Path                                    | What                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `scripts/db-migrate.mjs`                | Applies Drizzle migrations against `DATABASE_URL`.                             |
| `scripts/admin-set-password.mjs`        | Hashes a password with argon2id and writes the plain PHC hash to `.env.local`. |
| `scripts/dev-tunnel.mjs`                | Idempotent SSH tunnel to the VPS Postgres for local dev (`predev`).            |
| `.github/workflows/ci.yml`              | Typecheck (`astro check`) + unit tests + build on PRs and `main`.              |
| `.github/workflows/deploy.yml`          | rsync build context to VPS → `docker compose up -d --build` → health check.    |
| `.github/workflows/deploy-terminal.yml` | Cross-compile Go binary → ship to VPS → restart systemd unit.                  |

## Routes at a glance

| URL                                                                           | Source                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| `/`                                                                           | `src/pages/index.astro`                                |
| `/writing` · `/writing/<slug>`                                                | `src/pages/writing/index.astro` · `[slug].astro`       |
| `/projects` · `/projects/<slug>`                                              | `src/pages/projects/index.astro` · `[slug].astro`      |
| `/experience` · `/photos` · `/places` · `/bookmarks` · `/gadgets` · `/resume` | `src/pages/<name>.astro`                               |
| `/admin` · `/admin/login`                                                     | `src/pages/admin/index.astro` · `login.astro` (public) |
| `/admin/<collection>/…`                                                       | List + new + edit per collection.                      |
| `/api/admin/<col>(/[id])`                                                     | CRUD + upload + resolve. All gated by middleware.      |
| `/api/img/[...path]`                                                          | Public image stream from `UPLOADS_DIR`.                |
| `/api/health`                                                                 | Liveness + DB/uploads checks.                          |
| `/rss.xml` · `/sitemap.xml` · `/robots.txt`                                   | `src/pages/*.ts`                                       |
| `/og/default.png` · `/og/writing/<slug>.png` · `/og/projects/<slug>.png`      | `src/pages/og/*` via `lib/og.ts`                       |

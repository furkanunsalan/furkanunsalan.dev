# Working in this repo

Personal site. Next.js 14 App Router + a small Go SSH terminal twin under `terminal/`. Both surfaces read the same `content/` directory (Markdoc + JSON, edited through Keystatic).

For a layout overview see [`CODEMAP.md`](CODEMAP.md).

## What to know before editing

- **Source of truth is `content/`.** Pages don't fetch from a DB — they call `lib/content.ts` which wraps `@keystatic/core/reader`. Adding a new field means editing both `keystatic.config.ts` (the schema) AND `lib/content.ts` (the reader function that returns it to pages). Forgetting one is the typical bug.
- **Standalone runtime FS is fragile.** Deploy ships `content/` to the VPS alongside `.next/standalone/`. Dynamic `[slug]` pages that rely on Keystatic at runtime can 404 in prod even when listing works. The cure is `generateStaticParams` — see `app/(pages)/writing/[slug]/page.tsx` and `projects/[slug]/page.tsx`. Mirror that pattern for any new content collection with detail pages.
- **Keystatic prod storage is GitHub.** Edits in `/keystatic` commit straight to `main`, which triggers `deploy.yml`. So content changes go through a real build — no "update without redeploy" path.
- **`createReader` is local-FS only.** It doesn't honor the `storage: github` config — it always reads from disk relative to `process.cwd()`. That's why the deploy workflow `cp -r content release/content` step exists.

## Conventions

- **Server components by default.** Mark client components explicitly with `"use client"` (see `components/ProjectContainer.tsx`).
- **ISR over fully dynamic.** Use `export const revalidate = 3600` plus `generateStaticParams` where slugs are known. Reserve `force-dynamic` for routes that genuinely need request-time data.
- **Fail soft on third-party fetches in pages.** The home page wraps each call in a `safe()` helper so one dead upstream doesn't kill the route. Match that pattern when adding new providers.
- **AMOLED palette is in `tailwind.config.ts`.** Use `bg-zinc-950`/`bg-black` and the named tokens (`dark-*`, `light-*`, `accent-primary`) rather than ad-hoc hex.
- **No comments unless the WHY is non-obvious.** Names should carry meaning. Existing files reflect this — keep that bar.
- **Commit style is Conventional Commits.** Pre-commit hook runs `prettier --write && next build` — don't bypass with `--no-verify`; fix the type/lint error.

## Local dev

```bash
npm install
npm run dev          # http://localhost:3000
```

Keystatic admin is at `/keystatic` (redirected from `/admin`). In dev, storage is local-filesystem, no auth.

For the terminal twin: `cd terminal && make run` (`ssh -p 2222 localhost`).

### Env vars (web)

`.env.local` for development:

| Var                                     | Used for                               |
| --------------------------------------- | -------------------------------------- |
| `GITHUB_TOKEN`                          | Repo list, contribution graph, READMEs |
| `RAINDROP_TOKEN`                        | Bookmarks page                         |
| `UNSPLASH_ACCESS_KEY`                   | Photos page                            |
| `KEYSTATIC_GITHUB_CLIENT_ID`            | Admin OAuth (prod only)                |
| `KEYSTATIC_GITHUB_CLIENT_SECRET`        | Admin OAuth (prod only)                |
| `KEYSTATIC_SECRET`                      | Session signing (prod only)            |
| `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | Admin OAuth (prod only)                |
| `NEXT_PUBLIC_SITE_URL`                  | Absolute URLs in OG/RSS                |

## Deploy

Push to `main` → GitHub Actions builds and rsyncs to the VPS. `deploy.yml` for the Next.js side, `deploy-terminal.yml` for the Go binary. Both watch `main`; either runs concurrently per its own concurrency group.

## Common tasks

- **Add a new page route** — drop it under `app/(pages)/<route>/page.tsx`. The route group `(pages)` does not affect the URL.
- **Add a content collection** — extend `keystatic.config.ts`, write a reader in `lib/content.ts`, scaffold an `app/(pages)/<thing>/[slug]/page.tsx` with `generateStaticParams` + `revalidate`.
- **Update OG image style** — `lib/og.tsx` is the single template; route-specific images (`opengraph-image.tsx`) call `renderOgImage(...)` with custom props.
- **Regenerate the README** — `node scripts/build-readme.mjs` rewrites `README.md` + SVG charts from `content/`.
- **Sync GitHub repos into Keystatic visibility singleton** — `npm run sync:github-projects` (preserves existing toggles).
- **Bulk-import places from Google Takeout** — `npm run import:places -- <Takeout-path>`. Walks for `Saved Places.json` / `Labelled places.json` (GeoJSON) and `Saved/*.csv` lists; idempotent unless `--force`. CSV rows lose coordinates in Takeout — fix those in `/keystatic` or via the single-URL importer.
- **Import a shared Google Maps list** — Takeout fallback for when the export fails. Open the public list URL in a browser → DevTools → Network → find the request whose response contains your list ID → save the response to a file → `npm run import:placelist -- <response-file>`. Strips the XSSI prefix, parses the nested array, writes one JSON per place. Idempotent unless `--force`.
- **Import a single place from a Google Maps URL** — `npm run add:place -- "<google-maps-url>"`. Resolves short links, parses lat/lng + name, reverse-geocodes via OSM Nominatim (no API key). Writes a Keystatic JSON for review.

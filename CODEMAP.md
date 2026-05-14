# Codemap

Where things live and what they're for. Pair with [`CLAUDE.md`](CLAUDE.md) for conventions.

## Top level

| Path                   | What                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `app/`                 | Next.js App Router — pages, API routes, layout, OG/RSS.                                     |
| `components/`          | Server + client React components. `ui/` holds shadcn/Radix primitives.                      |
| `content/`             | Source of truth: Markdoc posts/projects, JSON for experiences/tools.                        |
| `lib/`                 | Server-side helpers: Keystatic reader, GitHub/Raindrop/Unsplash, OG.                        |
| `public/`              | Static assets (banners, photos, OG fallbacks, resume.pdf).                                  |
| `types/`               | Shared TypeScript types.                                                                    |
| `data/`                | Small static constants (`constants.ts`).                                                    |
| `docs/`                | Generated SVG charts for the README.                                                        |
| `terminal/`            | Go + Charm Wish SSH twin. Standalone module, own deploy.                                    |
| `scripts/`             | Maintenance scripts (`build-readme.mjs`, `sync-github-projects.mjs`).                       |
| `.github/workflows/`   | `deploy.yml` (web), `deploy-terminal.yml` (Go binary).                                      |
| `keystatic.config.ts`  | Collection + singleton schema, storage mode (local in dev, GitHub prod).                    |
| `next.config.mjs`      | Standalone output, image remotePatterns, `/admin → /keystatic` redirect, `trustHostHeader`. |
| `tailwind.config.ts`   | AMOLED palette tokens (`dark-*`, `light-*`, `accent-primary`).                              |
| `ecosystem.config.cjs` | PM2 process descriptor (port 3010, fork mode, 512M ceiling).                                |

## `app/`

```
app/
├── layout.tsx              # html/body, Inter font, Umami script
├── globals.css             # base styles, page-enter, image skeleton
├── opengraph-image.tsx     # site-wide OG fallback
├── not-found.tsx           # 404 with chromatic-split glitch title
├── icon.png                # favicon
├── rss.xml/route.ts        # RSS feed generated from posts
│
├── (pages)/                # route group — no URL prefix
│   ├── layout.tsx          # site chrome: MainNavbar, Footer, TopProgressBar
│   ├── loading.tsx
│   ├── page.tsx            # home: HomeIntro + LatestSection + heatmap + HomeTools
│   ├── writing/
│   │   ├── page.tsx        # hero CTA + inline rows, RSS in search, tag filter
│   │   └── [slug]/
│   │       ├── page.tsx    # Markdoc render, TOC sidebar, image bento collapse
│   │       └── opengraph-image.tsx
│   ├── projects/
│   │   ├── page.tsx        # GithubCommitHistory + custom + GitHub repo cards
│   │   └── [slug]/
│   │       ├── page.tsx    # custom project (Markdoc) OR GitHub README fallback
│   │       └── opengraph-image.tsx
│   ├── experience/page.tsx # CompanyExperienceGroup list
│   ├── photos/page.tsx     # Unsplash gallery (masonry)
│   └── bookmarks/page.tsx  # Raindrop list with stats
│
├── api/
│   ├── github/contributions/route.ts   # GraphQL contribution calendar
│   ├── raindrop/route.ts               # paginated bookmarks
│   ├── raindrop/stats/route.ts         # collection counts
│   ├── tools/route.ts                  # tools JSON for client filtering
│   └── keystatic/[...params]/route.ts  # OAuth handler for the admin
│
└── keystatic/
    ├── [[...params]]/page.tsx    # admin UI mount
    ├── layout.tsx                # bare layout (no site chrome)
    ├── keystatic.tsx             # Keystatic root component
    └── keystatic.css             # AMOLED theme override for the admin
```

## `components/`

| File                         | Role                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `MainNavbar.tsx`             | Top nav with cmd-modifier shortcut badges.                                    |
| `Footer.tsx`                 | Static footer.                                                                |
| `TopProgressBar.tsx`         | Route-transition progress bar.                                                |
| `HomeIntro.tsx`              | Bio block, socials, clock — driven by Keystatic singleton.                    |
| `HomeSocialLink.tsx`         | Single icon-link renderer for the socials list.                               |
| `HomeTools.tsx`              | Tools section on the home page.                                               |
| `ToolTabs.tsx` / `Tool.tsx`  | Tools tabs UI + single-tool card.                                             |
| `LatestSection.tsx`          | "Latest from each surface" home card.                                         |
| `GithubCommitHistory.tsx`    | Contribution heatmap with custom tooltip.                                     |
| `ContributionContainer.tsx`  | Stats panel under the heatmap.                                                |
| `BlogPosts.tsx`              | Writing list grid + tag select + RSS link.                                    |
| `TableOfContents.tsx`        | Right-rail TOC on post pages, scroll-spy.                                     |
| `PostBentoImages.tsx`        | Bento grid built from image-only paragraph runs.                              |
| `ProjectContainer.tsx`       | Single project card on `/projects` (client).                                  |
| `CompanyExperienceGroup.tsx` | Group of roles per company on `/experience`.                                  |
| `ExperienceContainer.tsx`    | Single role card.                                                             |
| `Photos.tsx` / `Photos.css`  | Unsplash masonry gallery.                                                     |
| `RaindropBookmarks.tsx`      | Bookmark list with filters.                                                   |
| `StatsCard.tsx`              | Reusable stat block.                                                          |
| `TagSelect.tsx`              | Portaled Radix Select for tag filtering.                                      |
| `BreadcrumpNavigator.tsx`    | Breadcrumbs (sic).                                                            |
| `Time.tsx`                   | Istanbul clock with timezone label.                                           |
| `Loading.tsx`                | Shared skeleton.                                                              |
| `ui/`                        | shadcn-style Radix wrappers: `breadcrumb`, `dropdown-menu`, `select`, `tabs`. |

## `content/`

```
content/
├── posts/<slug>/index.mdoc           # Markdoc + frontmatter (title, date, tags, banner)
├── projects/<slug>/index.mdoc        # Markdoc + frontmatter (name, description, metric, link, language, image)
├── experiences/<slug>/index.json     # role JSON (organization, title, dates, links, images)
├── tools/<slug>/index.json           # tool JSON (brand, what, category, comment, favorite, link)
└── settings/
    ├── home/index.json               # singleton: intro, timezone, socials, PGP id
    └── github-projects/index.json    # singleton: per-repo visible/pinned toggles
```

Every collection path matches a block in `keystatic.config.ts`. Image fields write into `public/<collection>/...` and the reader normalizes the URL prefix.

## `lib/`

| File                | Exports                                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content.ts`        | `reader` + `getPosts`, `getPostBySlug`, `getCustomProjects`, `getCustomProjectBySlug`, `getExperiences`, `getTools`, `getHomeSettings`, `getGithubProjectVisibility`. |
| `github.ts`         | `getGithubRepos`, `getGithubRepo`, `getGithubReadme`, `getContributionCalendar`.                                                                                      |
| `raindrop.ts`       | `getRaindropBookmarks`, `getRaindropCollections`, `getRaindropLatest`.                                                                                                |
| `unsplash.ts`       | Default-export class wrapping the Unsplash user API.                                                                                                                  |
| `og.tsx`            | `OG_SIZE`, `OG_CONTENT_TYPE`, `renderOgImage(...)` — shared OG template (AMOLED, indigo glows).                                                                       |
| `slugify.ts`        | Normalize headings/titles to URL-safe slugs.                                                                                                                          |
| `project-finder.ts` | Thin wrapper over `getGithubRepo`.                                                                                                                                    |
| `utils.ts`          | `cn` (clsx + tailwind-merge).                                                                                                                                         |

## `terminal/`

```
terminal/
├── Makefile                     # tidy / run / build-linux targets
├── go.mod / go.sum
├── cmd/server/main.go           # SSH + Bubble Tea bootstrap, dotenv loader
└── internal/
    ├── tui/                     # views, styles, root model
    └── data/
        ├── loaders.go           # reads ../content/{posts,experiences,tools,projects}
        ├── github.go            # GitHub repos via REST
        ├── raindrop.go          # Raindrop bookmarks via REST
        └── dotenv.go            # tiny KEY=value loader (no extra dep)
```

Shares env-var names with the web app (`GITHUB_TOKEN`, `RAINDROP_TOKEN`). Listens on `:2222` by default; key persisted at `.ssh/term_ed25519`.

## Scripts & workflows

| Path                                    | What                                                                 |
| --------------------------------------- | -------------------------------------------------------------------- |
| `scripts/build-readme.mjs`              | Regenerates `README.md` + SVG charts from `content/`.                |
| `scripts/sync-github-projects.mjs`      | Fetches repos from GitHub, merges into the visibility singleton.     |
| `.github/workflows/deploy.yml`          | Build Next.js → rsync `release/` to VPS → reload PM2 → health check. |
| `.github/workflows/deploy-terminal.yml` | Cross-compile Go binary → ship to VPS → restart systemd unit.        |

## Routes at a glance

| URL                          | Source                                                                    |
| ---------------------------- | ------------------------------------------------------------------------- |
| `/`                          | `app/(pages)/page.tsx`                                                    |
| `/writing`                   | `app/(pages)/writing/page.tsx`                                            |
| `/writing/<slug>`            | `app/(pages)/writing/[slug]/page.tsx` (SSG + ISR)                         |
| `/projects`                  | `app/(pages)/projects/page.tsx`                                           |
| `/projects/<slug>`           | `app/(pages)/projects/[slug]/page.tsx` (custom: SSG, GitHub: dynamic ISR) |
| `/experience`                | `app/(pages)/experience/page.tsx`                                         |
| `/photos`                    | `app/(pages)/photos/page.tsx`                                             |
| `/bookmarks`                 | `app/(pages)/bookmarks/page.tsx`                                          |
| `/keystatic`, `/admin`       | Admin UI (`/admin` redirects to `/keystatic`)                             |
| `/rss.xml`                   | `app/rss.xml/route.ts`                                                    |
| `/opengraph-image`           | Site-wide OG fallback                                                     |
| `/<route>/opengraph-image-*` | Per-route OG via `lib/og.tsx`                                             |

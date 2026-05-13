![screenshot](public/photos/preview/image.png)

# furkanunsalan.dev

My personal site — an AMOLED-dark Next.js app paired with a terminal SSH twin
that reads the same content directory. Built around a tiny custom CMS
(Keystatic) that commits straight back to this repo.

> Two ways in:
>
> - Web — [furkanunsalan.dev](https://furkanunsalan.dev)
> - Terminal — `ssh -p 2222 furkanunsalan.dev`

## At a glance

| Posts | Experiences |  Tools | Custom projects |
| ----: | ----------: | -----: | --------------: |
| **5** |       **9** | **11** |           **0** |

_Auto-generated on 2026-05-13 from `content/`._

## Posts per year

![posts per year](docs/readme/posts-by-year.svg)

## Top tags

![top tags](docs/readme/top-tags.svg)

## Recent writing

- **Contentful ile Blog Sistemi Yönetmek** — 2025-05-18
- **Clean Code 101: Neden ve Nasıl Temiz Kod Yazmalıyız** — 2025-05-11
- **Gezilecek Yerler** — 2025-04-25
- **My Takeaways from Ali Abdaal's Feel Good Productivity** — 2025-02-05
- **Connect Your Docker Apps to a Domain** — 2024-10-22

## Architecture

```
  ┌───────────────────────────────────────────────┐
  │  Next.js 14 App Router  +  Tailwind  +  TypeScript │
  └───────────────────────────────────────────────┘
        │                            │
        │ Reads content/ via Keystatic reader
        ▼                            ▼
  Web (this app)               Terminal (Go + Charm Wish)
        │
        └── GitHub OAuth Keystatic admin at /admin
```

The web app and the terminal app are both clients of one source of truth:
the `content/` directory in this repo. Anything edited through `/admin`
commits straight back to GitHub, so both surfaces stay in sync.

## What it talks to

- **GitHub** — repo list, contribution graph, READMEs.
- **Raindrop** — bookmarks.
- **Unsplash** — photos.
- **Keystatic** — content editing (mounted at `/keystatic`, reachable via `/admin`).

## Deploys

Self-hosted on a VPS, two GitHub Actions workflows:

- `deploy.yml` — builds Next.js, rsyncs, reloads PM2.
- `deploy-terminal.yml` — cross-compiles the Go binary, syncs the content
  folder, idempotently sets up the systemd unit, restarts.

## Regenerating this README

```bash
node scripts/build-readme.mjs
```

## License & contact

GNU — see [LICENSE](LICENSE). Reach me at `me@furkanunsalan.dev`.

# furkanunsalan.dev

> My corner of the internet, and the little machine that runs it.

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)

Hi, I'm Furkan. This is my personal site: my writing and stray thoughts, the
projects I've built, the experience I've gathered, the gear I use, the photos
I've taken, and the places I've been. It's also a small self-hosted machine I
enjoy tending. Have a look around at [furkanunsalan.dev](https://furkanunsalan.dev).

The whole thing runs off a single VPS with no third-party CMS, no analytics,
and no tracking. Content lives in Postgres and is edited through a custom admin
I built. Even the images are self-hosted.

## What's inside

- **Writing.** Essays and short thoughts, written in Markdoc with a table of
  contents, reading time, and inline [Mermaid](https://mermaid.js.org) diagrams.
- **Projects.** Hand-curated builds plus my public GitHub repos, with commit
  sparklines and a couple of bespoke project pages.
- **Experience.** Roles and communities, grouped by organization.
- **Gadgets.** The gear I use, drawn from a small blueprint-style SVG sketch
  library that I pick from in the admin.
- **Photos.** Self-hosted photography with the EXIF shot data behind each frame.
- **Places.** A self-owned map (Leaflet + Carto) with no Google dependency at
  runtime.
- **Bookmarks.** An Obsidian-style force graph of my saved links and their tags,
  fed from my own [Karakeep](https://karakeep.app) instance.
- **Résumé.** A PDF rendered in-browser, generated from the same database.
- **A terminal twin.** The same content over SSH. Try `ssh -p 2222 furkanunsalan.dev`.

## Architecture

```mermaid
flowchart LR
  visitor([Visitor]) --> caddy["Caddy · auto-HTTPS"]
  admin([Admin]) -->|iron-session + argon2| caddy
  caddy --> web["Next.js 14 · App Router<br/>PM2 on the VPS"]
  web --> pg[("PostgreSQL 17<br/>Drizzle ORM")]
  web --> img["/api/img<br/>self-hosted photos & uploads"]
  ssh([SSH client]) --> twin["Terminal twin · Go"]
  twin --> pg
  gh["GitHub Actions"] -->|build · rsync| web
```

One box, one Caddy in front, everything else on `localhost`. The site is a
Next.js standalone build managed by PM2 (not in a container, on purpose), and it
shares its Postgres with the Go terminal twin, so there is one source of truth
and no second copy to keep in sync. There's a
[full write-up of the self-hosting stack](https://furkanunsalan.dev/writing/self-hosting-on-one-vps)
on the site.

## Under the hood

- **Postgres is the source of truth.** Pages read through `lib/content.ts`
  (Drizzle over postgres-js); the schema lives in `db/schema.ts`.
- **Custom admin CMS** under `/admin/*`, gated by iron-session with an argon2id
  password hash and a rate-limited login.
- **Cached, always-fresh reads.** DB readers are wrapped in Next's data cache
  with per-collection tags; every admin edit busts the right tag, so pages serve
  from cache without hitting Postgres on each view while staying instantly fresh.
- **Fail-soft everywhere.** Every reader degrades to a safe default on a query
  error, so a database blip never takes the whole site down.
- **Self-hosted images.** Uploads are resized to WebP and EXIF-parsed server-side
  with `sharp` + `exifr`, then streamed from outside the deploy target so they
  survive every release.
- **Sane security defaults.** Security headers, a path-traversal-safe image
  server, sanitized DB errors, and no user-uploaded SVGs.
- **Tested and gated.** Vitest unit tests cover the security-critical helpers,
  and CI runs typecheck, lint, tests, and build on every push.

## Tech stack

| Area       | Choice                                     |
| ---------- | ------------------------------------------ |
| Framework  | Next.js 14 (App Router, standalone output) |
| Language   | TypeScript (strict)                        |
| Data       | PostgreSQL 17 + Drizzle ORM (postgres-js)  |
| Styling    | Tailwind CSS (AMOLED palette)              |
| Content    | Markdoc + Mermaid                          |
| Auth       | iron-session + argon2id                    |
| Images     | sharp + exifr, served from `/api/img`      |
| Validation | zod at the API boundary                    |
| Maps       | Leaflet + Carto                            |
| Terminal   | Go + Charm Wish / Bubble Tea               |
| Testing    | Vitest + GitHub Actions CI                 |
| Hosting    | Single VPS, Caddy, PM2, Postgres in Docker |

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

`npm run dev` opens an SSH tunnel to the VPS Postgres before starting (the
`predev` step is idempotent). Create a `.env.local` with at least:

```
DATABASE_URL=...            # points at the tunnel in dev
ADMIN_SESSION_SECRET=...    # >= 32 chars
VPS_SSH_TARGET=root@...     # dev-only, for the auto-tunnel
```

See [`CLAUDE.md`](CLAUDE.md) for the full environment-variable reference and the
conventions this repo follows.

## Testing & CI

```bash
npm test           # vitest
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

`.github/workflows/ci.yml` runs all of the above plus a production build on every
pull request and push.

## Project layout

[`CODEMAP.md`](CODEMAP.md) is the map of where things live;
[`CLAUDE.md`](CLAUDE.md) documents the conventions, environment, and ops
(backups, migrations, deploys). At a glance:

```
app/         Next.js routes, admin UI, API handlers
components/  React components (admin widgets under admin/)
db/          Drizzle schema + generated migrations
lib/         Server helpers: db client, auth, content readers, uploads, cache
terminal/    Go SSH twin (its own module and deploy)
```

## Deploy

Push to `main`. GitHub Actions builds the Next.js standalone bundle and rsyncs
it to the VPS, where PM2 reloads with zero downtime. The Go terminal twin ships
from its own workflow to a systemd unit. Uploads and secrets live outside the
rsync target, so deploys never touch them.

## License

[GPL-3.0](LICENSE).

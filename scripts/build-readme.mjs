#!/usr/bin/env node
/**
 * Regenerates README.md from the live content/ directory and package.json.
 * The README is for a university assignment, so it's expected to stay short
 * but actually reflect the current state — counts, tags, recent posts, and a
 * tiny SVG histogram of posts-per-year all come from the source of truth.
 *
 * Run with: `node scripts/build-readme.mjs`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content");

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function readFrontmatter(filepath) {
  if (!fs.existsSync(filepath)) return null;
  const text = fs.readFileSync(filepath, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const lines = m[1].split("\n");
  const fm = {};
  let current = null;
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (/^\s*-\s+/.test(line) && current) {
      const v = line.replace(/^\s*-\s+/, "").trim().replace(/^['"]|['"]$/g, "");
      (fm[current] ||= []).push(v);
      continue;
    }
    const km = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!km) continue;
    const key = km[1];
    let val = km[2].trim();
    if (val === "") {
      current = key;
      fm[key] ||= [];
      continue;
    }
    current = null;
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    else if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    fm[key] = val;
  }
  return fm;
}

function readJSON(filepath) {
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
  } catch {
    return null;
  }
}

const posts = listDirs(path.join(contentDir, "posts"))
  .map((slug) => ({
    slug,
    ...(readFrontmatter(path.join(contentDir, "posts", slug, "index.mdoc")) ||
      {}),
  }))
  .filter((p) => p.title && p.date)
  .sort((a, b) => new Date(b.date) - new Date(a.date));

const experiences = listDirs(path.join(contentDir, "experiences"))
  .map((slug) =>
    readJSON(path.join(contentDir, "experiences", slug, "index.json")),
  )
  .filter(Boolean);

const tools = listDirs(path.join(contentDir, "tools"))
  .map((slug) => readJSON(path.join(contentDir, "tools", slug, "index.json")))
  .filter(Boolean);

const customProjects = listDirs(path.join(contentDir, "projects"))
  .map((slug) => ({
    slug,
    ...(readFrontmatter(
      path.join(contentDir, "projects", slug, "index.mdoc"),
    ) || {}),
  }))
  .filter((p) => p.name);

// Tag tally
const tagCount = new Map();
for (const p of posts) {
  for (const t of p.tags || []) tagCount.set(t, (tagCount.get(t) || 0) + 1);
}
const topTags = [...tagCount.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6);

// Year histogram
const yearCount = new Map();
for (const p of posts) {
  const y = String(p.date).slice(0, 4);
  yearCount.set(y, (yearCount.get(y) || 0) + 1);
}
const years = [...yearCount.entries()].sort(([a], [b]) =>
  a < b ? -1 : a > b ? 1 : 0,
);

// Inline SVG bar chart — AMOLED palette to match the site
function buildChartSvg(data) {
  if (data.length === 0) return "";
  const W = 640;
  const H = 200;
  const pad = { t: 16, r: 16, b: 32, l: 32 };
  const max = Math.max(...data.map(([, v]) => v));
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const barW = (innerW / data.length) * 0.6;
  const step = innerW / data.length;

  const bars = data
    .map(([label, value], i) => {
      const h = max === 0 ? 0 : Math.round((value / max) * innerH);
      const x = pad.l + i * step + (step - barW) / 2;
      const y = pad.t + innerH - h;
      return `
    <g>
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="#6366f1" />
      <text x="${x + barW / 2}" y="${y - 6}" fill="#a5a8ff" font-size="11" text-anchor="middle" font-family="ui-sans-serif,system-ui">${value}</text>
      <text x="${x + barW / 2}" y="${H - 10}" fill="#71717a" font-size="11" text-anchor="middle" font-family="ui-sans-serif,system-ui">${label}</text>
    </g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Posts per year">
    <rect width="${W}" height="${H}" fill="#000000" rx="12" />
    <line x1="${pad.l}" y1="${H - pad.b}" x2="${W - pad.r}" y2="${H - pad.b}" stroke="rgba(255,255,255,0.08)" />
    ${bars}
  </svg>`;
}

function buildTagBarSvg(data) {
  if (data.length === 0) return "";
  const W = 640;
  const rowH = 26;
  const H = data.length * rowH + 16;
  const labelW = 140;
  const max = Math.max(...data.map(([, v]) => v));

  const rows = data
    .map(([label, value], i) => {
      const y = 8 + i * rowH;
      const w = Math.round(((W - labelW - 60) * value) / max);
      return `
    <g>
      <text x="${labelW - 8}" y="${y + rowH / 2 + 4}" fill="#d4d4d4" font-size="12" text-anchor="end" font-family="ui-sans-serif,system-ui">${label}</text>
      <rect x="${labelW}" y="${y + 6}" width="${w}" height="${rowH - 12}" rx="4" fill="#6366f1" />
      <text x="${labelW + w + 8}" y="${y + rowH / 2 + 4}" fill="#a5a8ff" font-size="12" font-family="ui-sans-serif,system-ui">${value}</text>
    </g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Top tags">
    <rect width="${W}" height="${H}" fill="#000000" rx="12" />
    ${rows}
  </svg>`;
}

// Persist charts as plain SVG files so GitHub renders them inline.
const docsDir = path.join(root, "docs", "readme");
fs.mkdirSync(docsDir, { recursive: true });
const yearChart = buildChartSvg(years);
const tagChart = buildTagBarSvg(topTags);
if (yearChart) fs.writeFileSync(path.join(docsDir, "posts-by-year.svg"), yearChart);
if (tagChart) fs.writeFileSync(path.join(docsDir, "top-tags.svg"), tagChart);

// Build the README
const recent = posts.slice(0, 5);
const stamp = new Date().toISOString().slice(0, 10);

const md = `![screenshot](public/photos/preview/image.png)

# furkanunsalan.dev

My personal site — an AMOLED-dark Next.js app paired with a terminal SSH twin
that reads the same content directory. Built around a tiny custom CMS
(Keystatic) that commits straight back to this repo.

> Two ways in:
> - Web — [furkanunsalan.dev](https://furkanunsalan.dev)
> - Terminal — \`ssh -p 2222 furkanunsalan.dev\`

## At a glance

| Posts | Experiences | Tools | Custom projects |
| ---: | ---: | ---: | ---: |
| **${posts.length}** | **${experiences.length}** | **${tools.length}** | **${customProjects.length}** |

_Auto-generated on ${stamp} from \`content/\`._

## Posts per year

![posts per year](docs/readme/posts-by-year.svg)

## Top tags

![top tags](docs/readme/top-tags.svg)

## Recent writing

${recent.map((p) => `- **${p.title}** — ${p.date}`).join("\n")}

## Architecture

\`\`\`
  ┌───────────────────────────────────────────────┐
  │  Next.js 14 App Router  +  Tailwind  +  TypeScript │
  └───────────────────────────────────────────────┘
        │                            │
        │ Reads content/ via Keystatic reader
        ▼                            ▼
  Web (this app)               Terminal (Go + Charm Wish)
        │
        └── GitHub OAuth Keystatic admin at /admin
\`\`\`

The web app and the terminal app are both clients of one source of truth:
the \`content/\` directory in this repo. Anything edited through \`/admin\`
commits straight back to GitHub, so both surfaces stay in sync.

## Technical stack

**Frontend.** Next.js 14.2 App Router with the route group \`app/(pages)\`
holding all user-facing routes (home, \`writing\`, \`projects\`, \`photos\`,
\`experience\`, \`bookmarks\`) and \`[slug]\` segments for posts and projects.
React 18, TypeScript strict, Tailwind CSS 3.4 with a custom AMOLED palette
(\`dark-primary: #000\`, accent indigo-500) and \`@tailwindcss/typography\` for
post bodies. Component primitives come from Radix UI dropdowns, selects, and
tabs wrapped in shadcn-style files under \`components/ui/\`. Icons are
\`lucide-react\`; date formatting uses \`date-fns\` + \`date-fns-tz\` for the
Istanbul clock on the home page.

**Content & CMS.** Markdoc (\`@markdoc/markdoc\`) is the authoring format —
post and project bodies live in \`content/<collection>/<slug>/index.mdoc\`
with YAML frontmatter; experiences and tools are JSON. Keystatic
(\`@keystatic/core\` + \`@keystatic/next\`) provides a typed schema, the
\`/keystatic\` admin UI, and the \`createReader\` API in \`lib/content.ts\` that
the pages read at build/runtime. Storage is filesystem-local in dev and
GitHub-backed in production (the admin OAuths against GitHub and commits
back to \`main\`, triggering the deploy workflow). The two surfaces share
the same schema definition in \`keystatic.config.ts\`.

**Rendering & data.** Mostly server components with ISR — \`export const
revalidate = 3600\` on the heavy pages and \`generateStaticParams\` on
\`[slug]\` routes so posts and custom projects are baked into the build.
Pages fetch in parallel with \`Promise.all\` and a \`safe()\` wrapper that
swallows third-party failures so the home page can render even if Unsplash
or GitHub are down. Markdoc transforms run server-side in
\`writing/[slug]/page.tsx\` with a custom config that (1) dedupes heading
ids to drive the right-rail \`TableOfContents\` and (2) collapses runs of
image-only paragraphs into a \`PostBentoImages\` bento grid. Open Graph
images are generated dynamically per route via \`next/og\` from a shared
template in \`lib/og.tsx\` (AMOLED background, indigo glows, title
auto-shrink). An RSS feed is served from \`app/rss.xml/route.ts\`.

**Backend integrations.** Wrapped per provider under \`lib/\`:
\`github.ts\` (REST repos + GraphQL contribution calendar),
\`raindrop.ts\` (bookmarks + collection stats),
\`unsplash.ts\` (user photos),
plus the Keystatic reader.
API routes under \`app/api/\` proxy a few of these to the client where
needed (\`/api/github/contributions\`, \`/api/raindrop\`, \`/api/raindrop/stats\`,
\`/api/tools\`, and the Keystatic OAuth handler at \`/api/keystatic/[...params]\`).

**Terminal twin.** \`terminal/\` is a Go SSH server built on Charm Wish,
Bubble Tea, Lipgloss, and Glamour. It reads the same \`content/\` directory
and exposes posts, experiences, tools, projects, and bookmarks as a TUI.
Same env vars (\`GITHUB_TOKEN\`, \`RAINDROP_TOKEN\`) as the web app. Listens
on :2222.

**Build & deploy.** \`output: "standalone"\` so Next.js produces a
self-contained server bundle. Husky pre-commit runs \`prettier --write\` +
\`next build\` to catch type errors before they hit CI. Two GitHub Actions
pipelines: \`deploy.yml\` builds the Next.js bundle, rsyncs the standalone
output + \`public/\` + \`content/\` to the VPS, and reloads PM2;
\`deploy-terminal.yml\` cross-compiles the Go binary for Linux and updates
the systemd unit. Nginx fronts both processes on the VPS — \`trustHostHeader\`
is enabled in \`next.config.mjs\` so Keystatic's OAuth redirect URI builds
against the public hostname instead of the bind address.

**Analytics & SEO.** Umami pageview script in the root layout, Open Graph
image route per slug, JSON-LD-free metadata via the \`Metadata\` API, RSS
auto-discovery link, and \`robots.txt\` defaults to index+follow.

## What it talks to

- **GitHub** — repo list, contribution graph, READMEs.
- **Raindrop** — bookmarks.
- **Unsplash** — photos.
- **Keystatic** — content editing (mounted at \`/keystatic\`, reachable via \`/admin\`).

## Deploys

Self-hosted on a VPS, two GitHub Actions workflows:

- \`deploy.yml\` — builds Next.js, rsyncs, reloads PM2.
- \`deploy-terminal.yml\` — cross-compiles the Go binary, syncs the content
  folder, idempotently sets up the systemd unit, restarts.

## Regenerating this README

\`\`\`bash
node scripts/build-readme.mjs
\`\`\`

## License & contact

GNU — see [LICENSE](LICENSE). Reach me at \`me@furkanunsalan.dev\`.
`;

fs.writeFileSync(path.join(root, "README.md"), md);
console.log(
  `README.md regenerated · posts=${posts.length} experiences=${experiences.length} tools=${tools.length} projects=${customProjects.length}`,
);

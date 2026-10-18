#!/usr/bin/env node
/**
 * Transfer-size / cache-header / compression budget check.
 *
 * Hits the live routes over raw HTTP (no auto-decompression) so the reported
 * transfer sizes are real wire bytes, walks the client module graph to measure
 * the JS actually needed to render each route, and fails loudly when a budget
 * regresses — e.g. Caddy's `encode` directive disappearing, cache headers
 * vanishing, or a post page shipping without its article body in the HTML.
 *
 *   node scripts/perf-check.mjs                       # → https://furkanunsalan.dev
 *   node scripts/perf-check.mjs --base http://127.0.0.1:3013
 *
 * Exit code is non-zero when any budget fails, so CI or a cron can gate on it.
 */
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";

const base = (
  process.argv[process.argv.indexOf("--base") + 1] ||
  process.env.PERF_BASE ||
  "https://furkanunsalan.dev"
).replace(/\/$/, "");

const ROUTES = [
  { path: "/", label: "home" },
  { path: "/writing", label: "feed" },
  { path: "/projects", label: "projects" },
  { path: "/writing/self-hosting-on-one-vps", label: "post (mermaid)" },
  { path: "/writing/contentful-blog", label: "post (long, no diagram)" },
];

// Budgets in bytes: generous headroom over the measured values so ordinary
// content growth doesn't trip them, tight enough that dropping compression,
// a cache header, or re-adding a heavy client bundle does.
const BUDGET = {
  "/": { raw: 40 * 1024, gzip: 12 * 1024 },
  "/writing": { raw: 70 * 1024, gzip: 22 * 1024 },
  "/projects": { raw: 60 * 1024, gzip: 20 * 1024 },
  "/writing/self-hosting-on-one-vps": { raw: 45 * 1024, gzip: 15 * 1024 },
  "/writing/contentful-blog": { raw: 60 * 1024, gzip: 18 * 1024 },
};
// JS/CSS that must load before hydration is possible (static import closure).
const EAGER_GZIP_BUDGET = 130 * 1024;
// Everything that may still be pulled in lazily (mermaid's diagram renderers +
// cytoscape on a diagram page — ~944 KB gzip today). Lazy bytes only load when
// the diagram scrolls into view, so this is a size cap, not a load-path budget.
const LAZY_GZIP_BUDGET = 1100 * 1024;
const POST_MIN_TEXT = 1000;

function request(url, headers) {
  const mod = url.startsWith("https:") ? https : http;
  return new Promise((resolve, reject) => {
    const req = mod.request(url, { headers }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          wire: Buffer.concat(chunks),
        }),
      );
    });
    req.on("error", reject);
    req.setTimeout(30_000, () => req.destroy(new Error("timeout")));
    req.end();
  });
}

const AGENT = { "user-agent": "perf-check" };

function decode(res) {
  const enc = (res.headers["content-encoding"] || "").toLowerCase();
  if (enc === "gzip") return zlib.gunzipSync(res.wire);
  if (enc === "br") return zlib.brotliDecompressSync(res.wire);
  return res.wire;
}

const fetchText = async (path) => {
  const r = await request(base + path, { "accept-encoding": "gzip", ...AGENT });
  const body = decode(r);
  return { status: r.status, headers: r.headers, wire: r.wire.length, body };
};

const fetchAsset = async (path) => {
  const r = await fetchText(path);
  return {
    path,
    raw: r.body.length,
    gzip: zlib.gzipSync(r.body, { level: 9 }).length,
    code: path.endsWith(".js") ? r.body.toString("utf8") : "",
  };
};

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const ok = (c) => (c ? "ok  " : "FAIL");

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---- client module graph ------------------------------------------------
const specifiers = (code) => {
  const dynamic = new Set();
  for (const m of code.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) {
    dynamic.add(m[1]);
  }
  const stat = new Set();
  const withoutDynamic = code.replace(/import\s*\(\s*["'][^"']+["']\s*\)/g, "");
  for (const m of withoutDynamic.matchAll(
    /(?:from|import)\s*["']([^"']+)["']/g,
  )) {
    stat.add(m[1]);
  }
  return { stat: [...stat], dynamic: [...dynamic] };
};

const resolveSpec = (from, spec) => {
  if (
    !spec.startsWith("./") &&
    !spec.startsWith("../") &&
    !spec.startsWith("/")
  )
    return null; // bare specifier — bundled, not a served asset
  try {
    return new URL(spec, new URL(from, base)).pathname;
  } catch {
    return null;
  }
};

async function crawl(seeds) {
  const eager = new Map();
  const lazy = new Map();

  const load = async (path, into) => {
    if (eager.has(path) || lazy.has(path)) return;
    into.set(path, "pending");
    const a = await fetchAsset(path).catch(() => null);
    if (a) into.set(path, a);
    else into.delete(path);
  };

  const seedsArr = [...new Set(seeds)];
  await Promise.all(seedsArr.map((s) => load(s, eager)));

  // Static closure — code that must be present before any island can hydrate.
  let frontier = seedsArr.filter((s) => eager.has(s));
  const done = new Set();
  while (frontier.length) {
    const path = frontier.pop();
    if (done.has(path)) continue;
    done.add(path);
    const asset = eager.get(path);
    if (!asset?.code) continue;
    for (const spec of specifiers(asset.code).stat) {
      const next = resolveSpec(path, spec);
      if (!next || eager.has(next) || lazy.has(next)) continue;
      await load(next, eager);
      frontier.push(next);
    }
  }

  // Lazy closure — reachable only through dynamic import() (e.g. mermaid).
  const lazyFrontier = [];
  for (const [path, asset] of eager) {
    if (!asset?.code) continue;
    for (const spec of [
      ...specifiers(asset.code).stat,
      ...specifiers(asset.code).dynamic,
    ]) {
      const next = resolveSpec(path, spec);
      if (next && !eager.has(next)) lazyFrontier.push(next);
    }
  }
  const lazyDone = new Set();
  while (lazyFrontier.length) {
    const path = lazyFrontier.pop();
    if (lazyDone.has(path) || eager.has(path)) continue;
    lazyDone.add(path);
    await load(path, lazy);
    const asset = lazy.get(path);
    if (!asset?.code) continue;
    const { stat, dynamic } = specifiers(asset.code);
    for (const spec of [...stat, ...dynamic]) {
      const next = resolveSpec(path, spec);
      if (next && !eager.has(next) && !lazy.has(next)) lazyFrontier.push(next);
    }
  }

  const sum = (map, key) =>
    [...map.values()].reduce((n, a) => n + (a?.[key] ?? 0), 0);
  return {
    count: eager.size,
    raw: sum(eager, "raw"),
    gzip: sum(eager, "gzip"),
    lazyCount: lazy.size,
    lazyGzip: sum(lazy, "gzip"),
  };
}

const failures = [];
const check = (label, cond, detail) => {
  if (!cond) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  return ok(cond);
};

async function main() {
  console.log(`perf-check → ${base}\n`);
  const rows = [];

  for (const route of ROUTES) {
    // Compressed request for decode + header checks; identity for true raw size.
    const [compressed, identity] = await Promise.all([
      fetchText(route.path),
      request(base + route.path, { "accept-encoding": "identity", ...AGENT }),
    ]);
    const html = compressed.body.toString("utf8");
    const rawBytes = identity.wire.length;
    const gzipBytes = zlib.gzipSync(identity.wire, { level: 9 }).length;
    const encoding = compressed.headers["content-encoding"] || "(none)";
    const cacheControl = compressed.headers["cache-control"] || "(none)";
    const etag = compressed.headers.etag || "(none)";
    const budget = BUDGET[route.path] ?? { raw: Infinity, gzip: Infinity };

    const seeds = [
      ...[...html.matchAll(/(?:src|href)="(\/_astro\/[^"]+)"/g)].map(
        (m) => m[1],
      ),
      ...[
        ...html.matchAll(/(?:component-url|renderer-url)="(\/_astro\/[^"]+)"/g),
      ].map((m) => m[1]),
    ];
    const assets = await crawl(seeds);

    const textLen = visibleText(html).length;
    const hasProse = html.includes('class="prose');
    const isPost = route.path.startsWith("/writing/");

    rows.push({
      route: route.path,
      raw: rawBytes,
      gzip: gzipBytes,
      encoding,
      cacheControl,
      assets,
      checks: [
        check(`${route.path} html compressed`, encoding !== "(none)"),
        check(`${route.path} cache-control`, cacheControl !== "(none)"),
        check(`${route.path} etag`, etag !== "(none)"),
        check(
          `${route.path} html raw <= ${kb(budget.raw)}`,
          rawBytes <= budget.raw,
          `actual ${kb(rawBytes)}`,
        ),
        check(
          `${route.path} html gzip <= ${kb(budget.gzip)}`,
          gzipBytes <= budget.gzip,
          `actual ${kb(gzipBytes)}`,
        ),
        check(
          `${route.path} eager js gzip <= ${kb(EAGER_GZIP_BUDGET)}`,
          assets.gzip <= EAGER_GZIP_BUDGET,
          `actual ${kb(assets.gzip)}`,
        ),
        check(
          `${route.path} lazy js gzip <= ${kb(LAZY_GZIP_BUDGET)}`,
          assets.lazyGzip <= LAZY_GZIP_BUDGET,
          `actual ${kb(assets.lazyGzip)}`,
        ),
        isPost
          ? check(
              `${route.path} article text in SSR html`,
              hasProse && textLen >= POST_MIN_TEXT,
              `prose=${hasProse} text=${textLen}`,
            )
          : "n/a   ",
      ],
    });
  }

  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  console.log(
    `${pad("route", 36)} ${pad("html raw", 10)} ${pad("html gz", 9)} ${pad("enc", 7)} ${pad("eager js", 16)} ${pad("lazy js", 10)} checks`,
  );
  for (const r of rows) {
    console.log(
      `${pad(r.route, 36)} ${pad(kb(r.raw), 10)} ${pad(kb(r.gzip), 9)} ${pad(r.encoding, 7)} ${pad(`${kb(r.assets.raw)}/${kb(r.assets.gzip)}`, 16)} ${pad(kb(r.assets.lazyGzip), 10)} ${r.checks.join("")}`,
    );
  }
  console.log(
    `\nhtml raw/gz = measured (identity body) and gzip -9 estimate · enc = what the server actually sent.`,
  );
  console.log(
    `eager js    = raw/gzip of the static import closure (must load to hydrate).`,
  );
  console.log(
    `lazy js     = bytes only reachable via dynamic import() (mermaid).`,
  );

  if (failures.length) {
    console.error(`\n${failures.length} budget failure(s):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log("\nall budgets ok.");
}

main().catch((e) => {
  console.error("perf-check failed to run:", e);
  process.exit(2);
});

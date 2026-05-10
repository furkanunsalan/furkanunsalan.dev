#!/usr/bin/env node
/**
 * Sync the Keystatic GitHub project visibility singleton with the live list
 * of public GitHub repos.
 *
 * - Adds any repo that exists on GitHub but isn't in the singleton yet (with
 *   visible: true, pinned: false).
 * - Preserves every existing toggle for repos still present on GitHub.
 * - Drops entries that no longer exist on GitHub.
 *
 * Reads GITHUB_USERNAME (defaults to furkanunsalan) and GITHUB_TOKEN from env.
 * Run with: `npm run sync:github-projects`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const singletonDir = path.join(root, "content", "settings", "github-projects");
const singletonFile = path.join(singletonDir, "index.json");

// Auto-load .env.local / .env so the user doesn't have to remember to source
// it before invoking the script. KEY=VALUE pairs, # comments, quotes stripped.
function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  const text = fs.readFileSync(filepath, "utf8");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue; // shell env wins
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const user = process.env.GITHUB_USERNAME || "furkanunsalan";
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error(
    "GITHUB_TOKEN is not set.\n" +
      "Add it to .env.local (GITHUB_TOKEN=ghp_...) or export it in your shell, then rerun:\n" +
      "  npm run sync:github-projects",
  );
  process.exit(1);
}

async function fetchRepos() {
  const res = await fetch(
    `https://api.github.com/users/${user}/repos?per_page=100&type=owner&sort=updated`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!res.ok) {
    throw new Error(`GitHub repos fetch failed: ${res.status} ${res.statusText}`);
  }
  const raw = await res.json();
  return raw
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .map((r) => r.name);
}

function readExisting() {
  if (!fs.existsSync(singletonFile)) return { repos: [] };
  try {
    return JSON.parse(fs.readFileSync(singletonFile, "utf8")) || { repos: [] };
  } catch {
    return { repos: [] };
  }
}

const liveNames = await fetchRepos();
const existing = readExisting();

// Lookup existing toggles by lowercase name.
const prev = new Map();
for (const r of existing.repos || []) {
  if (r && r.name) prev.set(r.name.toLowerCase(), r);
}

// Build the new repos array: pinned first (in their existing order), then
// the rest of the live list (preserving GitHub's star-desc ordering).
const pinned = [];
const rest = [];
for (const name of liveNames) {
  const existingRow = prev.get(name.toLowerCase());
  const row = {
    name,
    visible: existingRow ? existingRow.visible !== false : true,
    pinned: existingRow ? !!existingRow.pinned : false,
  };
  if (row.pinned) pinned.push(row);
  else rest.push(row);
}

// Sort pinned by the order they had in the existing file so the user's
// arrangement is preserved across syncs.
const prevPinnedOrder = (existing.repos || [])
  .filter((r) => r && r.pinned)
  .map((r, i) => [r.name.toLowerCase(), i]);
const pinnedOrderMap = new Map(prevPinnedOrder);
pinned.sort((a, b) => {
  const ai = pinnedOrderMap.has(a.name.toLowerCase())
    ? pinnedOrderMap.get(a.name.toLowerCase())
    : Number.MAX_SAFE_INTEGER;
  const bi = pinnedOrderMap.has(b.name.toLowerCase())
    ? pinnedOrderMap.get(b.name.toLowerCase())
    : Number.MAX_SAFE_INTEGER;
  return ai - bi;
});

const next = { repos: [...pinned, ...rest] };

fs.mkdirSync(singletonDir, { recursive: true });
fs.writeFileSync(singletonFile, JSON.stringify(next, null, 2) + "\n");

const added = next.repos.filter((r) => !prev.has(r.name.toLowerCase()));
const removed = (existing.repos || []).filter(
  (r) => r && r.name && !liveNames.some((n) => n.toLowerCase() === r.name.toLowerCase()),
);

console.log(
  `Synced ${next.repos.length} repos · +${added.length} added · -${removed.length} removed`,
);
if (added.length) console.log("  added:", added.map((r) => r.name).join(", "));
if (removed.length)
  console.log("  removed:", removed.map((r) => r.name).join(", "));

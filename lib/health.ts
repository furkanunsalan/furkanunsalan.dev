import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { sql, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { UPLOADS_DIR, parseUploadRemote, sshRun } from "@/lib/uploads";

export type CheckResult = {
  label: string;
  status: "ok" | "warn" | "error" | "unknown";
  value: string;
  href?: string;
};

const BACKUP_DIR = "/root/backups/furkanunsalan-pg";
const DEPLOY_DIR = "/root/furkanunsalan.dev";
const CHECK_TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function relativeFromMs(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const fixed = v >= 100 ? v.toFixed(0) : v.toFixed(1);
  return `${fixed} ${units[i]}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function checkLastBackup(): Promise<CheckResult> {
  const label = "Last DB backup";
  const remote = parseUploadRemote();
  try {
    let mtimeMs: number | null = null;
    let filename: string | null = null;

    if (remote) {
      const latest = (
        await withTimeout(
          sshRun(remote, `ls -t ${BACKUP_DIR} 2>/dev/null | head -1`),
          CHECK_TIMEOUT_MS,
          "ssh ls",
        )
      ).trim();
      if (!latest) {
        return { label, status: "error", value: "missing" };
      }
      filename = latest;
      const epoch = (
        await withTimeout(
          sshRun(remote, `stat -c '%Y' ${BACKUP_DIR}/${latest}`),
          CHECK_TIMEOUT_MS,
          "ssh stat",
        )
      ).trim();
      const n = Number(epoch);
      if (!Number.isFinite(n)) {
        return { label, status: "error", value: "stat parse failed" };
      }
      mtimeMs = n * 1000;
    } else {
      // Prod runtime — read local fs directly.
      let entries: string[];
      try {
        entries = await fs.readdir(BACKUP_DIR);
      } catch {
        return { label, status: "unknown", value: "no backup dir" };
      }
      if (entries.length === 0) {
        return { label, status: "error", value: "missing" };
      }
      const stats = await Promise.all(
        entries.map(async (name) => {
          const s = await fs.stat(path.join(BACKUP_DIR, name));
          return { name, mtimeMs: s.mtimeMs };
        }),
      );
      stats.sort((a, b) => b.mtimeMs - a.mtimeMs);
      filename = stats[0].name;
      mtimeMs = stats[0].mtimeMs;
    }

    if (mtimeMs == null) {
      return { label, status: "unknown", value: "no mtime" };
    }
    const age = Date.now() - mtimeMs;
    const ok = age < 36 * 3600 * 1000;
    const warn = age < 7 * 24 * 3600 * 1000;
    const status: CheckResult["status"] = ok ? "ok" : warn ? "warn" : "error";
    return {
      label,
      status,
      value: `${relativeFromMs(age)}${filename ? ` · ${filename}` : ""}`,
    };
  } catch (e) {
    return {
      label,
      status: "error",
      value: (e as Error).message.slice(0, 80),
    };
  }
}

async function checkGithubToken(): Promise<CheckResult> {
  const label = "GitHub token";
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { label, status: "warn", value: "no token" };
  }
  try {
    const res = await fetchWithTimeout(
      "https://api.github.com/user",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "furkanunsalan.dev-admin",
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      },
      3000,
    );
    if (res.status === 200) {
      const j = (await res.json()) as { login?: string };
      return {
        label,
        status: "ok",
        value: j.login ? `@${j.login}` : "authenticated",
      };
    }
    if (res.status === 401 || res.status === 403) {
      return { label, status: "warn", value: "unauthorized" };
    }
    return { label, status: "error", value: `HTTP ${res.status}` };
  } catch (e) {
    return {
      label,
      status: "error",
      value: (e as Error).message.slice(0, 80),
    };
  }
}

async function checkKarakeep(): Promise<CheckResult> {
  const label = "Karakeep API";
  const key = process.env.KARAKEEP_API_KEY;
  if (!key) {
    return { label, status: "unknown", value: "not configured" };
  }
  const host =
    process.env.KARAKEEP_API_URL || "https://bookmarks.furkanunsalan.dev";
  try {
    const res = await fetchWithTimeout(
      `${host}/api/v1/bookmarks?limit=1&includeContent=false`,
      {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      },
      3000,
    );
    if (res.ok) {
      return { label, status: "ok", value: "reachable", href: host };
    }
    if (res.status === 401 || res.status === 403) {
      return { label, status: "warn", value: "unauthorized" };
    }
    return { label, status: "error", value: `HTTP ${res.status}` };
  } catch (e) {
    return {
      label,
      status: "error",
      value: (e as Error).message.slice(0, 80),
    };
  }
}

async function walkDirSize(
  root: string,
): Promise<{ bytes: number; files: number }> {
  let bytes = 0;
  let files = 0;
  async function walk(dir: string) {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if (e.isFile()) {
        try {
          const s = await fs.stat(p);
          bytes += s.size;
          files += 1;
        } catch {
          // skip
        }
      }
    }
  }
  await walk(root);
  return { bytes, files };
}

async function checkUploads(): Promise<CheckResult> {
  const label = "Uploads disk";
  const remote = parseUploadRemote();
  try {
    if (remote) {
      const out = await withTimeout(
        sshRun(
          remote,
          `du -sh ${remote.dir} 2>/dev/null; find ${remote.dir} -type f 2>/dev/null | wc -l`,
        ),
        CHECK_TIMEOUT_MS,
        "ssh du",
      );
      const lines = out
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const sizeLine = lines[0] ?? "";
      const countLine = lines[1] ?? "0";
      const size = sizeLine.split(/\s+/)[0] ?? "?";
      const count = Number(countLine) || 0;
      return {
        label,
        status: "ok",
        value: `${size} across ${count} file${count === 1 ? "" : "s"}`,
      };
    }
    const { bytes, files } = await walkDirSize(UPLOADS_DIR);
    return {
      label,
      status: "ok",
      value: `${humanBytes(bytes)} across ${files} file${files === 1 ? "" : "s"}`,
    };
  } catch (e) {
    return {
      label,
      status: "error",
      value: (e as Error).message.slice(0, 80),
    };
  }
}

async function checkLastDeploy(): Promise<CheckResult> {
  const label = "Last deploy";
  const remote = parseUploadRemote();
  try {
    if (remote) {
      const out = (
        await withTimeout(
          sshRun(
            remote,
            `stat -c '%Y' ${DEPLOY_DIR}/.next/BUILD_ID 2>/dev/null || stat -c '%Y' ${DEPLOY_DIR}/server.js 2>/dev/null || echo`,
          ),
          CHECK_TIMEOUT_MS,
          "ssh stat",
        )
      ).trim();
      if (!out) {
        return { label, status: "unknown", value: "no build artifact" };
      }
      const n = Number(out);
      if (!Number.isFinite(n)) {
        return { label, status: "unknown", value: "stat parse failed" };
      }
      return {
        label,
        status: "ok",
        value: relativeFromMs(Date.now() - n * 1000),
      };
    }
    // Local — try the same paths against the prod-style locations as a last
    // resort, otherwise unknown.
    for (const candidate of [
      path.join(DEPLOY_DIR, ".next/BUILD_ID"),
      path.join(DEPLOY_DIR, "server.js"),
    ]) {
      try {
        const s = await fs.stat(candidate);
        return {
          label,
          status: "ok",
          value: relativeFromMs(Date.now() - s.mtimeMs),
        };
      } catch {
        // try next
      }
    }
    return { label, status: "unknown", value: "local dev" };
  } catch (e) {
    return {
      label,
      status: "error",
      value: (e as Error).message.slice(0, 80),
    };
  }
}

async function checkPostgres(): Promise<CheckResult> {
  const label = "Postgres";
  try {
    const rows = await db.execute<{ size: string }>(
      sql`select pg_size_pretty(pg_database_size(current_database())) as size`,
    );
    const first = (rows as unknown as { size: string }[])[0];
    const size = first?.size ?? "?";
    return { label, status: "ok", value: `DB size: ${size}` };
  } catch (e) {
    return {
      label,
      status: "error",
      value: (e as Error).message.slice(0, 80),
    };
  }
}

async function checkLastLogin(): Promise<CheckResult> {
  const label = "Last admin login";
  try {
    const rows = await db
      .select()
      .from(schema.adminLogins)
      .where(eq(schema.adminLogins.ok, true))
      .orderBy(desc(schema.adminLogins.at))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return { label, status: "ok", value: "never" };
    }
    const age = Date.now() - new Date(row.at).getTime();
    return {
      label,
      status: "ok",
      value: `${relativeFromMs(age)} from ${row.ip ?? "—"}`,
      href: "/admin/logins",
    };
  } catch (e) {
    return {
      label,
      status: "error",
      value: (e as Error).message.slice(0, 80),
    };
  }
}

async function safe(
  label: string,
  fn: () => Promise<CheckResult>,
): Promise<CheckResult> {
  try {
    return await withTimeout(fn(), CHECK_TIMEOUT_MS + 1000, label);
  } catch (e) {
    return {
      label,
      status: "error",
      value: (e as Error).message.slice(0, 80),
    };
  }
}

export async function runHealthChecks(): Promise<CheckResult[]> {
  return Promise.all([
    safe("Last DB backup", checkLastBackup),
    safe("Postgres", checkPostgres),
    safe("Last deploy", checkLastDeploy),
    safe("GitHub token", checkGithubToken),
    safe("Karakeep API", checkKarakeep),
    safe("Uploads disk", checkUploads),
    safe("Last admin login", checkLastLogin),
  ]);
}

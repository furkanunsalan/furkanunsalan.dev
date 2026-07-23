import type { APIRoute } from "astro";
import { promises as fs } from "fs";
import path from "path";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const GET: APIRoute = async () => {
  try {
    const dir = path.join(process.cwd(), "db", "migrations");
    let files: string[] = [];
    try {
      const entries = await fs.readdir(dir);
      files = entries.filter((f) => f.endsWith(".sql")).sort();
    } catch {
      files = [];
    }

    let applied: Array<{ id: number; hash: string; createdAt: string | null }> =
      [];
    try {
      const rows = (await db.execute(sql`
        select id, hash, created_at
        from drizzle.__drizzle_migrations
        order by id asc
      `)) as unknown as Array<{
        id: number;
        hash: string;
        created_at: string | number | Date | null;
      }>;
      applied = rows.map((r) => ({
        id: r.id,
        hash: r.hash,
        createdAt:
          r.created_at === null || r.created_at === undefined
            ? null
            : typeof r.created_at === "object" && r.created_at instanceof Date
              ? r.created_at.toISOString()
              : String(r.created_at),
      }));
    } catch {
      // Older deployments / fresh DBs may keep the table in `public` instead
      // of the `drizzle` schema. Fall back gracefully.
      try {
        const rows = (await db.execute(sql`
          select id, hash, created_at
          from __drizzle_migrations
          order by id asc
        `)) as unknown as Array<{
          id: number;
          hash: string;
          created_at: string | number | Date | null;
        }>;
        applied = rows.map((r) => ({
          id: r.id,
          hash: r.hash,
          createdAt:
            r.created_at === null || r.created_at === undefined
              ? null
              : typeof r.created_at === "object" && r.created_at instanceof Date
                ? r.created_at.toISOString()
                : String(r.created_at),
        }));
      } catch {
        applied = [];
      }
    }

    return json({ ok: true, files, applied });
  } catch (e) {
    const f = friendlyDbError(e, "migrations");
    return json({ ok: false, error: f.error }, f.status);
  }
};

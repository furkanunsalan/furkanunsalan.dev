import type { APIRoute } from "astro";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";
import { getKnownTable, primaryKeyColumns } from "@/lib/db-tables";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const PAGE_SIZE = 50;

// Postgres text-ish types that are safe to ILIKE against. Other types
// (uuid, jsonb, timestamps) are skipped to avoid 22P02 errors mid-query.
const SEARCHABLE_TYPES = new Set([
  "text",
  "character varying",
  "varchar",
  "character",
  "char",
  "citext",
  "name",
]);

// Postgres table name → revalidate collection key, so a manual override in the
// DB browser flushes the same public caches a normal admin edit would.
const TABLE_TO_COLLECTION: Record<
  string,
  Parameters<typeof revalidateCollection>[0]
> = {
  posts: "posts",
  thoughts: "thoughts",
  projects: "projects",
  experiences: "experiences",
  tools: "tools",
  places: "places",
  place_lists: "placeLists",
  home_settings: "home",
  github_project_visibility: "github",
};

type ColumnMeta = {
  name: string;
  type: string;
  nullable: boolean;
  pk: boolean;
};

async function columnMeta(
  table: string,
  known: ReturnType<typeof getKnownTable>,
): Promise<ColumnMeta[]> {
  const colRows = (await db.execute(sql`
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = ${table}
    order by ordinal_position
  `)) as unknown as Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
  }>;
  const pk = new Set(known ? primaryKeyColumns(known) : []);
  return colRows.map((c) => ({
    name: c.column_name,
    type: c.data_type,
    nullable: c.is_nullable === "YES",
    pk: pk.has(c.column_name),
  }));
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const table = url.searchParams.get("table") || "";
    const pageRaw = Number(url.searchParams.get("page") || "1");
    const page =
      Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const q = (url.searchParams.get("q") || "").trim();

    const known = getKnownTable(table);
    if (!known) {
      return json({ error: `unknown table: ${table}` }, 400);
    }

    const columns = await columnMeta(table, known);

    if (columns.length === 0) {
      return json({
        columns: [],
        rows: [],
        total: 0,
        page,
        pageSize: PAGE_SIZE,
      });
    }

    const pk = primaryKeyColumns(known);
    const orderCol = pk[0] || columns[0].name;

    const searchable = columns
      .filter((c) => SEARCHABLE_TYPES.has(c.type))
      .map((c) => c.name);

    const tableIdent = sql.identifier(table);

    // Build the optional WHERE clause for search. We embed identifiers via
    // sql.identifier (escaped) and the user value via the parameter ${pattern}.
    let whereSql = sql``;
    if (q && searchable.length > 0) {
      const pattern = `%${q}%`;
      const predicates = searchable.map(
        (col) => sql`${sql.identifier(col)} ilike ${pattern}`,
      );
      let combined = predicates[0];
      for (let i = 1; i < predicates.length; i++) {
        combined = sql`${combined} or ${predicates[i]}`;
      }
      whereSql = sql` where ${combined}`;
    }

    const totalRows = (await db.execute(
      sql`select count(*)::int as n from ${tableIdent}${whereSql}`,
    )) as unknown as Array<{ n: number }>;
    const total = totalRows[0]?.n ?? 0;

    const offset = (page - 1) * PAGE_SIZE;
    const orderIdent = sql.identifier(orderCol);
    const rows = (await db.execute(
      sql`select * from ${tableIdent}${whereSql} order by ${orderIdent} asc limit ${PAGE_SIZE} offset ${offset}`,
    )) as unknown as Array<Record<string, unknown>>;

    return json({
      columns,
      rows,
      total,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (e) {
    const f = friendlyDbError(e, "rows");
    return json({ error: f.error }, f.status);
  }
};

// Coerce a string (or null) coming from the editor UI into a value postgres-js
// can bind for the given Postgres data_type. Throws a plain Error on bad
// input — the caller turns that into a 400.
function coerceValue(raw: string | null, dataType: string): unknown {
  if (raw === null) return null;
  const t = dataType.toLowerCase();

  if (t === "boolean") {
    const s = raw.trim().toLowerCase();
    if (["true", "t", "1", "yes"].includes(s)) return true;
    if (["false", "f", "0", "no"].includes(s)) return false;
    throw new Error(`invalid boolean "${raw}"`);
  }

  if (["integer", "bigint", "smallint"].includes(t)) {
    if (raw.trim() === "") throw new Error("empty integer");
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`invalid number "${raw}"`);
    return Math.trunc(n);
  }

  if (["numeric", "double precision", "real", "decimal"].includes(t)) {
    if (raw.trim() === "") throw new Error("empty number");
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`invalid number "${raw}"`);
    return n;
  }

  if (t === "array") {
    const s = raw.trim();
    if (s === "") return [];
    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        if (!Array.isArray(parsed)) throw new Error("not an array");
        return parsed;
      } catch {
        throw new Error(`invalid JSON array "${raw}"`);
      }
    }
    // Fall back to newline-separated entries.
    return s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  if (t === "jsonb" || t === "json") {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`invalid JSON "${raw}"`);
    }
  }

  // text, varchar, char, uuid, date, timestamp* — let Postgres cast the string.
  return raw;
}

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => null)) as {
      table?: string;
      pk?: Record<string, string | null>;
      patch?: Record<string, string | null>;
    } | null;
    if (!body || typeof body !== "object") {
      return json({ error: "bad json" }, 400);
    }

    const table = body.table || "";
    const known = getKnownTable(table);
    if (!known) {
      return json({ error: `unknown table: ${table}` }, 400);
    }

    const pkCols = primaryKeyColumns(known);
    if (pkCols.length === 0) {
      return json(
        { error: "table has no primary key — cannot target a row safely" },
        400,
      );
    }

    const pkValues = body.pk || {};
    for (const col of pkCols) {
      if (!(col in pkValues)) {
        return json({ error: `missing primary key value for "${col}"` }, 400);
      }
    }

    const patch = body.patch || {};
    const columns = await columnMeta(table, known);
    const typeByName = new Map(columns.map((c) => [c.name, c.type]));
    const valid = new Set(columns.map((c) => c.name));
    const hasUpdatedAt = valid.has("updated_at");

    const assignments = [];
    for (const [col, raw] of Object.entries(patch)) {
      if (!valid.has(col)) continue; // ignore unknown columns
      if (pkCols.includes(col)) continue; // never reassign the primary key
      if (col === "updated_at") continue; // managed below
      const type = (typeByName.get(col) || "text").toLowerCase();

      // jsonb/json: bind the raw text and cast in SQL so postgres-js doesn't
      // mistake a JSON array for a Postgres array. Validate the JSON first.
      if (type === "jsonb" || type === "json") {
        if (raw === null) {
          assignments.push(sql`${sql.identifier(col)} = ${null}`);
          continue;
        }
        try {
          JSON.parse(raw);
        } catch {
          return json({ error: `${col}: invalid JSON` }, 400);
        }
        const cast = type === "jsonb" ? sql`::jsonb` : sql`::json`;
        assignments.push(sql`${sql.identifier(col)} = ${raw}${cast}`);
        continue;
      }

      let value: unknown;
      try {
        value = coerceValue(raw, type);
      } catch (err) {
        return json({ error: `${col}: ${(err as Error).message}` }, 400);
      }
      assignments.push(sql`${sql.identifier(col)} = ${value}`);
    }

    if (assignments.length === 0) {
      return json({ error: "no editable changes" }, 400);
    }
    if (hasUpdatedAt)
      assignments.push(sql`${sql.identifier("updated_at")} = now()`);

    // WHERE matching every primary-key column.
    const wherePredicates = pkCols.map((col) => {
      const value = coerceValue(pkValues[col], typeByName.get(col) || "text");
      return sql`${sql.identifier(col)} = ${value}`;
    });
    let whereCombined = wherePredicates[0];
    for (let i = 1; i < wherePredicates.length; i++) {
      whereCombined = sql`${whereCombined} and ${wherePredicates[i]}`;
    }

    let setCombined = assignments[0];
    for (let i = 1; i < assignments.length; i++) {
      setCombined = sql`${setCombined}, ${assignments[i]}`;
    }

    const tableIdent = sql.identifier(table);

    const beforeRows = (await db.execute(
      sql`select * from ${tableIdent} where ${whereCombined} limit 1`,
    )) as unknown as Array<Record<string, unknown>>;
    if (beforeRows.length === 0) {
      return json({ error: "row not found" }, 404);
    }

    const updated = (await db.execute(
      sql`update ${tableIdent} set ${setCombined} where ${whereCombined} returning *`,
    )) as unknown as Array<Record<string, unknown>>;

    const collection = TABLE_TO_COLLECTION[table];
    if (collection) revalidateCollection(collection);

    await recordAudit({
      req: request,
      action: "update",
      resource: `db:${table}`,
      rowId: pkCols.map((c) => String(pkValues[c])).join("/"),
      before: beforeRows[0],
      after: updated[0],
    });

    return json({ row: updated[0] });
  } catch (e) {
    const f = friendlyDbError(e, "row");
    return json({ error: f.error }, f.status);
  }
};

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { getKnownTable, primaryKeyColumns } from "../_tables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const table = url.searchParams.get("table") || "";
    const pageRaw = Number(url.searchParams.get("page") || "1");
    const page =
      Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const q = (url.searchParams.get("q") || "").trim();

    const known = getKnownTable(table);
    if (!known) {
      return NextResponse.json(
        { error: `unknown table: ${table}` },
        { status: 400 },
      );
    }

    // Pull column metadata first so we can build a typed render + a safe
    // search predicate.
    const colRows = (await db.execute(sql`
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public' and table_name = ${table}
      order by ordinal_position
    `)) as unknown as Array<{ column_name: string; data_type: string }>;

    const columns = colRows.map((c) => ({
      name: c.column_name,
      type: c.data_type,
    }));

    if (columns.length === 0) {
      return NextResponse.json({
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

    return NextResponse.json({
      columns,
      rows,
      total,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (e) {
    const f = friendlyDbError(e, "rows");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

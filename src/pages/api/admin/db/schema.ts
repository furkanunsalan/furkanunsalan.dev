import type { APIRoute } from "astro";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { knownTables } from "@/lib/db-tables";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

type ColumnRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
};

type PkRow = { table_name: string; column_name: string };
type IndexRow = { tablename: string; indexname: string; indexdef: string };
type FkRow = {
  src_table: string;
  src_column: string;
  tgt_table: string;
  tgt_column: string;
};

export const GET: APIRoute = async () => {
  try {
    const tables = knownTables().map((t) => t.name);
    if (tables.length === 0) {
      return json({ ok: true, tables: [] });
    }

    // postgres-js binds JS arrays unevenly for `ANY($1)` against
    // information_schema — depending on driver version the value lands as
    // `text` not `text[]`, producing "op ANY/ALL (array) requires array on
    // right side". Use a parameterized IN list via sql.join instead, which
    // emits one bind per table name and is bulletproof across drivers.
    const tableList = sql.join(
      tables.map((t) => sql`${t}`),
      sql`, `,
    );

    const cols = (await db.execute(sql`
      select table_name, column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public' and table_name in (${tableList})
      order by table_name, ordinal_position
    `)) as unknown as ColumnRow[];

    const pks = (await db.execute(sql`
      select kcu.table_name, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = tc.constraint_name
       and kcu.table_schema = tc.table_schema
      where tc.table_schema = 'public'
        and tc.constraint_type = 'PRIMARY KEY'
        and tc.table_name in (${tableList})
    `)) as unknown as PkRow[];

    const indexes = (await db.execute(sql`
      select tablename, indexname, indexdef
      from pg_indexes
      where schemaname = 'public' and tablename in (${tableList})
      order by tablename, indexname
    `)) as unknown as IndexRow[];

    const counts = (await db.execute(sql`
      select relname as table_name, n_live_tup::int as n
      from pg_stat_user_tables
      where schemaname = 'public' and relname in (${tableList})
    `)) as unknown as Array<{ table_name: string; n: number }>;

    const realFks = (await db.execute(sql`
      select
        tc.table_name as src_table,
        kcu.column_name as src_column,
        ccu.table_name as tgt_table,
        ccu.column_name as tgt_column
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu
        on tc.constraint_name = ccu.constraint_name
       and tc.table_schema = ccu.table_schema
      where tc.table_schema = 'public'
        and tc.constraint_type = 'FOREIGN KEY'
        and tc.table_name in (${tableList})
    `)) as unknown as FkRow[];

    // Logical references not modeled as actual FK constraints in this schema.
    // Add to this list as new soft relationships appear.
    const SOFT_FKS: FkRow[] = [
      {
        src_table: "places",
        src_column: "list",
        tgt_table: "place_lists",
        tgt_column: "name",
      },
    ].filter(
      (s) => tables.includes(s.src_table) && tables.includes(s.tgt_table),
    );

    const fks = [
      ...realFks.map((f) => ({ ...f, soft: false })),
      ...SOFT_FKS.map((f) => ({ ...f, soft: true })),
    ];

    const pkSet = new Set(pks.map((p) => `${p.table_name}.${p.column_name}`));
    const indexByTable = new Map<string, IndexRow[]>();
    for (const i of indexes) {
      const list = indexByTable.get(i.tablename) || [];
      list.push(i);
      indexByTable.set(i.tablename, list);
    }
    const countByTable = new Map<string, number>(
      counts.map((c) => [c.table_name, c.n]),
    );
    const colsByTable = new Map<string, ColumnRow[]>();
    for (const c of cols) {
      const list = colsByTable.get(c.table_name) || [];
      list.push(c);
      colsByTable.set(c.table_name, list);
    }

    const out = tables
      .map((name) => {
        const tableCols = colsByTable.get(name) || [];
        return {
          name,
          rowCount: countByTable.get(name) ?? 0,
          columns: tableCols.map((c) => ({
            name: c.column_name,
            type: c.data_type,
            nullable: c.is_nullable === "YES",
            default: c.column_default,
            isPrimary: pkSet.has(`${name}.${c.column_name}`),
          })),
          indexes: (indexByTable.get(name) || []).map((i) => ({
            name: i.indexname,
            def: i.indexdef,
          })),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return json({ ok: true, tables: out, foreignKeys: fks });
  } catch (e) {
    const f = friendlyDbError(e, "schema");
    return json({ ok: false, error: f.error }, f.status);
  }
};

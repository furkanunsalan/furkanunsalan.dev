import "server-only";
import { getTableName, getTableColumns, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { schema } from "@/lib/db";

// The schema module re-exports both tables and enums. Use Drizzle's `is`
// helper at runtime to keep just the tables. The cast is needed because
// `Object.values(schema)` is a union of enums + tables in the type system.
export function knownTables(): { name: string; table: PgTable }[] {
  const out: { name: string; table: PgTable }[] = [];
  for (const v of Object.values(schema) as unknown[]) {
    if (is(v as PgTable, PgTable)) {
      const t = v as PgTable;
      out.push({ name: getTableName(t), table: t });
    }
  }
  return out;
}

export function getKnownTable(name: string): PgTable | null {
  const entry = knownTables().find((t) => t.name === name);
  return entry?.table ?? null;
}

// Best-effort primary key column inference from the Drizzle schema. Falls
// back to the first column when no column is marked primary.
export function primaryKeyColumns(table: PgTable): string[] {
  const cols = getTableColumns(table) as Record<
    string,
    { name: string; primary?: boolean }
  >;
  const pk: string[] = [];
  for (const key of Object.keys(cols)) {
    const c = cols[key];
    if (c.primary) pk.push(c.name);
  }
  return pk;
}

import { NextResponse } from "next/server";
import { eq, getTableColumns, type Column } from "drizzle-orm";
import { db } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import {
  getCollection,
  type CollectionSpec,
} from "@/app/admin/backup/lib/collections";
import { revalidateCollection } from "@/lib/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportBody = {
  collection?: string;
  rows?: unknown[];
  dryRun?: boolean;
  mode?: "upsert" | "replace";
};

type RowError = { rowIndex: number; error: string };

type Summary = {
  inserts: number;
  updates: number;
  deletes: number;
  errors: RowError[];
};

function isTimestampColumn(col: Column): boolean {
  const t = (col as unknown as { columnType?: string }).columnType ?? "";
  return t === "PgTimestamp" || t === "PgTimestampString";
}

function isDateColumn(col: Column): boolean {
  const t = (col as unknown as { columnType?: string }).columnType ?? "";
  return t === "PgDate" || t === "PgDateString";
}

function coerceRow(
  raw: unknown,
  cols: Record<string, Column>,
): { value: Record<string, unknown> } | { error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "row is not an object" };
  }
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(cols)) {
    if (!(key in src)) continue;
    const v = src[key];
    if (v === null || v === undefined) {
      out[key] = null;
      continue;
    }
    if (isTimestampColumn(col)) {
      if (typeof v === "string") {
        const d = new Date(v);
        if (isNaN(d.getTime())) return { error: `invalid date for ${key}` };
        out[key] = d;
      } else if (v instanceof Date) {
        out[key] = v;
      } else {
        return { error: `invalid date for ${key}` };
      }
      continue;
    }
    if (isDateColumn(col)) {
      if (typeof v === "string") {
        out[key] = v.slice(0, 10);
      } else if (v instanceof Date) {
        out[key] = v.toISOString().slice(0, 10);
      } else {
        return { error: `invalid date for ${key}` };
      }
      continue;
    }
    out[key] = v;
  }

  for (const [key, col] of Object.entries(cols)) {
    const meta = col as unknown as {
      notNull?: boolean;
      hasDefault?: boolean;
      hasRuntimeDefault?: boolean;
    };
    if (meta.notNull && !meta.hasDefault && !meta.hasRuntimeDefault) {
      if (!(key in out) || out[key] === null || out[key] === undefined) {
        return { error: `missing required column "${key}"` };
      }
    }
  }
  return { value: out };
}

function pkColumn(spec: CollectionSpec): Column {
  const cols = getTableColumns(spec.table) as Record<string, Column>;
  const col = cols[spec.pk];
  if (!col)
    throw new Error(`primary key ${spec.pk} not found on ${spec.short}`);
  return col;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ImportBody | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const spec = getCollection(body.collection ?? "");
  if (!spec) {
    return NextResponse.json({ error: "unknown collection" }, { status: 400 });
  }
  if (!Array.isArray(body.rows)) {
    return NextResponse.json(
      { error: "rows must be an array" },
      { status: 400 },
    );
  }
  const mode = body.mode === "replace" ? "replace" : "upsert";
  const dryRun = !!body.dryRun;

  const cols = getTableColumns(spec.table) as Record<string, Column>;
  const pkCol = pkColumn(spec);

  const coerced: Record<string, unknown>[] = [];
  const errors: RowError[] = [];
  for (let i = 0; i < body.rows.length; i++) {
    const r = coerceRow(body.rows[i], cols);
    if ("error" in r) {
      errors.push({ rowIndex: i, error: r.error });
    } else {
      coerced.push(r.value);
    }
  }

  try {
    const existingRows = (await db
      .select({ pk: pkCol as never })
      .from(spec.table)) as { pk: unknown }[];
    const existingSet = new Set(existingRows.map((r) => String(r.pk)));

    let inserts = 0;
    let updates = 0;
    let deletes = 0;

    if (mode === "replace") {
      deletes = existingSet.size;
      inserts = coerced.length;
      updates = 0;
    } else {
      for (const row of coerced) {
        const key = row[spec.pk];
        if (key === undefined || key === null) {
          continue;
        }
        if (existingSet.has(String(key))) updates++;
        else inserts++;
      }
    }

    const summary: Summary = { inserts, updates, deletes, errors };

    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, mode, summary });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          dryRun: false,
          mode,
          summary,
          error: "fix row errors before apply",
        },
        { status: 400 },
      );
    }

    await db.transaction(async (tx) => {
      if (mode === "replace") {
        await tx.delete(spec.table);
        if (coerced.length > 0) {
          await tx.insert(spec.table).values(coerced as never);
        }
        return;
      }
      for (const row of coerced) {
        const key = row[spec.pk];
        if (key === undefined || key === null) continue;
        if (existingSet.has(String(key))) {
          const update: Record<string, unknown> = { ...row };
          delete update[spec.pk];
          if (Object.keys(update).length === 0) continue;
          await tx
            .update(spec.table)
            .set(update as never)
            .where(eq(pkCol, key as never));
        } else {
          await tx.insert(spec.table).values(row as never);
        }
      }
    });

    if (spec.revalidateKey) {
      revalidateCollection(spec.revalidateKey as never);
    }

    return NextResponse.json({ ok: true, dryRun: false, mode, summary });
  } catch (e) {
    const f = friendlyDbError(e, spec.short);
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

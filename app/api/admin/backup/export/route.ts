import { NextResponse } from "next/server";
import { getTableColumns } from "drizzle-orm";
import { db } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { getCollection } from "@/app/admin/backup/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeValue(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(serializeValue);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = serializeValue(val);
    }
    return out;
  }
  return v;
}

function csvField(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s: string;
  if (v instanceof Date) s = v.toISOString();
  else if (typeof v === "object") s = JSON.stringify(serializeValue(v));
  else s = String(v);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const short = url.searchParams.get("collection") || "";
  const format = (url.searchParams.get("format") || "json").toLowerCase();
  const spec = getCollection(short);
  if (!spec) {
    return NextResponse.json({ error: "unknown collection" }, { status: 400 });
  }
  if (format !== "json" && format !== "csv") {
    return NextResponse.json(
      { error: "format must be json or csv" },
      { status: 400 },
    );
  }

  try {
    const rows = await db.select().from(spec.table);
    const cols = Object.keys(getTableColumns(spec.table));
    const filename = `${short}-${todayStamp()}.${format}`;
    const disposition = `attachment; filename="${filename}"`;

    if (format === "json") {
      const body = JSON.stringify(rows.map((r) => serializeValue(r)));
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": disposition,
          "Cache-Control": "no-store",
        },
      });
    }

    const lines: string[] = [];
    lines.push(cols.map(csvField).join(","));
    for (const row of rows as Record<string, unknown>[]) {
      lines.push(cols.map((c) => csvField(row[c])).join(","));
    }
    const body = lines.join("\r\n");
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const f = friendlyDbError(e, short);
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

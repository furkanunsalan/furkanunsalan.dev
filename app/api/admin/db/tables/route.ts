import { NextResponse } from "next/server";
import { friendlyDbError } from "@/lib/db-errors";
import { knownTables } from "../_tables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tables = knownTables()
      .map((t) => t.name)
      .sort();
    return NextResponse.json({ ok: true, tables });
  } catch (e) {
    const f = friendlyDbError(e, "tables");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

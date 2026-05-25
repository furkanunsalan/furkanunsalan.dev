import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { ICON_KEYS } from "@/lib/place-list-icons";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const ICON_SET = new Set<string>(ICON_KEYS);

export async function GET() {
  const rows = await db
    .select()
    .from(schema.placeLists)
    .orderBy(asc(schema.placeLists.position), asc(schema.placeLists.name));
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const name = String(body.name || "").trim();
  if (!name)
    return NextResponse.json({ error: "name required" }, { status: 400 });
  const icon = ICON_SET.has(body.icon) ? String(body.icon) : "map-pin";
  const position = typeof body.position === "number" ? body.position : 100;
  try {
    const [row] = await db
      .insert(schema.placeLists)
      .values({ name, icon, position })
      .returning();
    revalidateCollection("placeLists");
    await recordAudit({
      req,
      action: "create",
      resource: "placeList",
      rowId: name,
      after: row as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ row }, { status: 201 });
  } catch (e) {
    const f = friendlyDbError(e, "list");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

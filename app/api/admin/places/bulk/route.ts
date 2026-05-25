import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const STATUSES = new Set<string>(schema.placeStatusEnum.enumValues);
type BulkAction =
  | "delete"
  | "set-category"
  | "set-list"
  | "set-status"
  | "clear-list";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const slugs: string[] = Array.isArray(body.slugs)
    ? body.slugs.filter((s: unknown) => typeof s === "string" && s.length > 0)
    : [];
  const action = body.action as BulkAction;
  if (slugs.length === 0) {
    return NextResponse.json({ error: "no slugs" }, { status: 400 });
  }
  if (slugs.length > 500) {
    return NextResponse.json({ error: "too many rows" }, { status: 400 });
  }

  try {
    let affected = 0;
    let affectedSlugs: string[] = [];
    let afterPatch: Record<string, unknown> = {};
    if (action === "delete") {
      const rows = await db
        .update(schema.places)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(inArray(schema.places.slug, slugs))
        .returning({ slug: schema.places.slug });
      affected = rows.length;
      affectedSlugs = rows.map((r) => r.slug);
    } else if (action === "set-category") {
      const value = typeof body.value === "string" ? body.value.trim() : "";
      const rows = await db
        .update(schema.places)
        .set({ category: value, updatedAt: new Date() })
        .where(inArray(schema.places.slug, slugs))
        .returning({ slug: schema.places.slug });
      affected = rows.length;
      affectedSlugs = rows.map((r) => r.slug);
      afterPatch = { category: value };
    } else if (action === "set-list" || action === "clear-list") {
      const value =
        action === "clear-list"
          ? ""
          : typeof body.value === "string"
            ? body.value.trim()
            : "";
      const rows = await db
        .update(schema.places)
        .set({ list: value, updatedAt: new Date() })
        .where(inArray(schema.places.slug, slugs))
        .returning({ slug: schema.places.slug });
      affected = rows.length;
      affectedSlugs = rows.map((r) => r.slug);
      afterPatch = { list: value };
    } else if (action === "set-status") {
      const value = typeof body.value === "string" ? body.value : "";
      if (!STATUSES.has(value)) {
        return NextResponse.json({ error: "bad status" }, { status: 400 });
      }
      const rows = await db
        .update(schema.places)
        .set({
          status: value as (typeof schema.placeStatusEnum.enumValues)[number],
          updatedAt: new Date(),
        })
        .where(inArray(schema.places.slug, slugs))
        .returning({ slug: schema.places.slug });
      affected = rows.length;
      affectedSlugs = rows.map((r) => r.slug);
      afterPatch = { status: value };
    } else {
      return NextResponse.json({ error: "bad action" }, { status: 400 });
    }

    revalidateCollection("places");
    if (action === "delete") {
      await recordAudit({
        req,
        action: "bulk-delete",
        resource: "place",
        rowId: `(${affected} items)`,
        before: { slugs: affectedSlugs },
      });
    } else {
      for (const slug of affectedSlugs) {
        await recordAudit({
          req,
          action: "update",
          resource: "place",
          rowId: slug,
          after: { ...afterPatch, _bulk: action },
        });
      }
    }
    return NextResponse.json({ ok: true, affected });
  } catch (e) {
    const f = friendlyDbError(e, "place");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

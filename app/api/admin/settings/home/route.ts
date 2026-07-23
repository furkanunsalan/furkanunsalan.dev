import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

type IconKey = (typeof schema.homeSocialIconEnum.enumValues)[number];
const ICONS = new Set<string>(schema.homeSocialIconEnum.enumValues);

function cleanSocials(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is { name?: string; url?: string; icon?: string } =>
        !!s && typeof s === "object",
    )
    .filter((s) => s.name && s.url)
    .map((s) => ({
      name: String(s.name),
      url: String(s.url),
      icon: (ICONS.has(s.icon || "") ? s.icon : "globe") as IconKey,
    }));
}

export async function GET() {
  const [row] = await db
    .select()
    .from(schema.homeSettings)
    .where(eq(schema.homeSettings.id, 1))
    .limit(1);
  return NextResponse.json({ row: row || null });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const values = {
    id: 1,
    intro: body.intro ?? "",
    location: body.location ?? "",
    focus: body.focus ?? "",
    watching: body.watching ?? "",
    timezone: body.timezone ?? "Europe/Istanbul",
    timezoneLabel: body.timezoneLabel ?? "IST",
    pgpId: body.pgpId ?? "",
    socials: cleanSocials(body.socials),
    updatedAt: new Date(),
  };
  try {
    const [before] = await db
      .select()
      .from(schema.homeSettings)
      .where(eq(schema.homeSettings.id, 1))
      .limit(1);
    await db
      .insert(schema.homeSettings)
      .values(values)
      .onConflictDoUpdate({ target: schema.homeSettings.id, set: values });
    revalidateCollection("home");
    await recordAudit({
      req,
      action: "update",
      resource: "home",
      rowId: "1",
      before: before as unknown as Record<string, unknown> | null,
      after: values as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "home settings");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

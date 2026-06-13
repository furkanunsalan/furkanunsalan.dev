import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strArr = (v: unknown) =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string").map(String) : [];
const objs = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v)
    ? v.filter(
        (x): x is Record<string, unknown> => !!x && typeof x === "object",
      )
    : [];

export async function GET() {
  const [row] = await db
    .select()
    .from(schema.cvSettings)
    .where(eq(schema.cvSettings.id, 1))
    .limit(1);
  return NextResponse.json({ row: row || null });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const header = {
    name: str(body.header?.name),
    role: str(body.header?.role),
  };
  const contact = {
    address: str(body.contact?.address),
    phone: str(body.contact?.phone),
    web: str(body.contact?.web),
  };
  const certifications = objs(body.certifications)
    .map((x) => ({ name: str(x.name), date: str(x.date) }))
    .filter((x) => x.name);
  const languages = objs(body.languages)
    .map((x) => ({ name: str(x.name), level: str(x.level) }))
    .filter((x) => x.name);
  const education = objs(body.education)
    .map((e) => ({
      degree: str(e.degree),
      dates: str(e.dates),
      line: str(e.line),
      bullets: strArr(e.bullets),
    }))
    .filter((e) => e.degree);
  const projects = objs(body.projects)
    .map((p) => ({
      slug: str(p.slug),
      techStack: str(p.techStack),
      inShort: !!p.inShort,
    }))
    .filter((p) => p.slug);
  const experiences = objs(body.experiences)
    .map((e) => ({ id: str(e.id), inShort: !!e.inShort }))
    .filter((e) => e.id);

  const values = {
    id: 1,
    header,
    contact,
    summary: str(body.summary),
    skills: strArr(body.skills),
    certifications,
    languages,
    education,
    projects,
    experiences,
    updatedAt: new Date(),
  };

  try {
    await db
      .insert(schema.cvSettings)
      .values(values)
      .onConflictDoUpdate({ target: schema.cvSettings.id, set: values });
    revalidateCollection("cv");
    await recordAudit({
      req,
      action: "update",
      resource: "cv",
      rowId: 1,
      after: values as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const f = friendlyDbError(e, "cv settings");
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
}

import type { APIRoute } from "astro";
import { desc, asc, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { friendlyDbError } from "@/lib/db-errors";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";
import { processPhoto } from "@/lib/photoImport";
import { writePhotoVariant } from "@/lib/uploads";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const ACCEPTED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/heic",
  "image/heif",
]);
const MAX_BYTES = 30 * 1024 * 1024; // 30 MB — raw camera JPEGs run large

export const GET: APIRoute = async () => {
  const rows = await db
    .select()
    .from(schema.photos)
    .where(isNull(schema.photos.deletedAt))
    .orderBy(desc(schema.photos.takenAt), asc(schema.photos.order));
  return json({ rows });
};

export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "expected multipart/form-data" }, 400);
  }
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return json({ error: "no files" }, 400);
  }

  const created: (typeof schema.photos.$inferSelect)[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (!ACCEPTED.has(file.type)) {
      errors.push(`${file.name}: unsupported type "${file.type}"`);
      continue;
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      errors.push(`${file.name}: size ${file.size} out of range`);
      continue;
    }
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const p = await processPhoto(buf, file.name);
      await Promise.all([
        writePhotoVariant(p.display, "display", `${p.id}.webp`),
        writePhotoVariant(p.thumb, "thumb", `${p.id}.webp`),
      ]);
      const [row] = await db
        .insert(schema.photos)
        .values({
          id: p.id,
          width: p.width,
          height: p.height,
          color: p.color,
          alt: "",
          caption: "",
          takenAt: p.exif.takenAt,
          cameraMake: p.exif.cameraMake,
          cameraModel: p.exif.cameraModel,
          focalLength: p.exif.focalLength,
          aperture: p.exif.aperture,
          shutter: p.exif.shutter,
          iso: p.exif.iso,
          tags: [],
        })
        .returning();
      created.push(row);
      await recordAudit({
        req: request,
        action: "create",
        resource: "photo",
        rowId: p.id,
        after: row as unknown as Record<string, unknown>,
      });
    } catch (e) {
      errors.push(`${file.name}: ${friendlyDbError(e, "photo").error}`);
    }
  }

  if (created.length === 0) {
    return json({ error: errors.join("; ") || "no photos processed" }, 422);
  }
  revalidateCollection("photos");
  return json({ rows: created, errors }, 201);
};

import { desc, asc, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import PhotosAdmin from "@/components/admin/PhotosAdmin";

export const dynamic = "force-dynamic";

export default async function AdminPhotosList() {
  const rows = await db
    .select()
    .from(schema.photos)
    .where(isNull(schema.photos.deletedAt))
    .orderBy(desc(schema.photos.takenAt), asc(schema.photos.order));

  const photos = rows.map((r) => ({
    id: r.id,
    order: r.order,
    width: r.width,
    height: r.height,
    color: r.color,
    alt: r.alt,
    caption: r.caption,
    takenAt: r.takenAt ? new Date(r.takenAt).toISOString() : null,
    cameraMake: r.cameraMake,
    cameraModel: r.cameraModel,
    focalLength: r.focalLength,
    aperture: r.aperture,
    shutter: r.shutter,
    iso: r.iso,
    tags: r.tags ?? [],
  }));

  return <PhotosAdmin initial={photos} />;
}

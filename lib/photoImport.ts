import "server-only";
import sharp from "sharp";
import exifr from "exifr";
import { randomBytes } from "node:crypto";
import { slugifyAscii } from "@/lib/slugify";

// Long-edge caps for the two served variants (webp). display drives the
// lightbox; thumb drives the masonry grid.
const DISPLAY_MAX = 1800;
const THUMB_MAX = 720;

export type PhotoExif = {
  cameraMake: string | null;
  cameraModel: string | null;
  focalLength: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: number | null;
  takenAt: Date | null;
};

export type ProcessedPhoto = {
  id: string;
  width: number;
  height: number;
  color: string;
  display: Buffer;
  thumb: Buffer;
  exif: PhotoExif;
};

const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

// exifr returns ExposureTime as seconds; store the familiar fraction form
// ("1/500") to match the rows migrated from Unsplash.
function fmtShutter(t: unknown): string | null {
  const n = Number(t);
  if (!isFinite(n) || n <= 0) return null;
  if (n >= 1) return String(Math.round(n * 10) / 10).replace(/\.0$/, "");
  return `1/${Math.round(1 / n)}`;
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

async function readExif(buf: Buffer): Promise<PhotoExif> {
  const empty: PhotoExif = {
    cameraMake: null,
    cameraModel: null,
    focalLength: null,
    aperture: null,
    shutter: null,
    iso: null,
    takenAt: null,
  };
  let ex: Record<string, unknown> | null = null;
  try {
    ex = await exifr.parse(buf, [
      "Make",
      "Model",
      "FocalLength",
      "FNumber",
      "ExposureTime",
      "ISO",
      "ISOSpeedRatings",
      "DateTimeOriginal",
      "CreateDate",
      "DateTimeDigitized",
    ]);
  } catch {
    return empty;
  }
  if (!ex) return empty;

  const focal = Number(ex.FocalLength);
  const fnum = Number(ex.FNumber);
  const iso = Number(ex.ISO ?? ex.ISOSpeedRatings);
  const taken = ex.DateTimeOriginal ?? ex.CreateDate ?? ex.DateTimeDigitized;

  return {
    cameraMake: str(ex.Make),
    cameraModel: str(ex.Model),
    focalLength: isFinite(focal) && focal > 0 ? one(focal) : null,
    aperture: isFinite(fnum) && fnum > 0 ? one(fnum) : null,
    shutter: fmtShutter(ex.ExposureTime),
    iso: isFinite(iso) && iso > 0 ? Math.round(iso) : null,
    takenAt: taken instanceof Date && !isNaN(taken.getTime()) ? taken : null,
  };
}

function makeId(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const slug = slugifyAscii(base, "photo").slice(0, 48);
  return `${slug}-${randomBytes(3).toString("hex")}`;
}

// Decode once, then fan out to the two variants + stats. Auto-orients via
// EXIF so portrait shots aren't stored sideways.
export async function processPhoto(
  input: Buffer,
  filename: string,
): Promise<ProcessedPhoto> {
  const meta = await sharp(input, { failOn: "none" }).metadata();
  const swap = (meta.orientation ?? 1) >= 5; // 5–8 = 90°/270° rotations
  const width = (swap ? meta.height : meta.width) ?? 0;
  const height = (swap ? meta.width : meta.height) ?? 0;

  const oriented = () => sharp(input, { failOn: "none" }).rotate();

  const [display, thumb, stats, exif] = await Promise.all([
    oriented()
      .resize({
        width: DISPLAY_MAX,
        height: DISPLAY_MAX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer(),
    oriented()
      .resize({
        width: THUMB_MAX,
        height: THUMB_MAX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 72 })
      .toBuffer(),
    sharp(input, { failOn: "none" }).stats(),
    readExif(input),
  ]);

  const { r, g, b } = stats.dominant;
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  const color = `#${hex(r)}${hex(g)}${hex(b)}`;

  return {
    id: makeId(filename),
    width,
    height,
    color,
    display,
    thumb,
    exif,
  };
}

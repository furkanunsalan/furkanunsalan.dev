// Client-side image compression. Runs in the browser before a file is POSTed
// to /api/admin/upload, so uploads are downscaled + re-encoded to WebP without
// reintroducing the server-side image optimizer (deliberately disabled in
// next.config.mjs for SSRF reasons). Reduces both stored bytes and upload
// bandwidth. Returns the original file untouched when compression wouldn't
// help (animated GIFs, decode failures, or when the result isn't smaller).

export type CompressOptions = {
  // Longest edge in px. Images larger than this are scaled down preserving
  // aspect ratio; smaller images keep their dimensions.
  maxEdge?: number;
  // WebP quality, 0..1.
  quality?: number;
};

const DEFAULTS: Required<CompressOptions> = {
  maxEdge: 2200,
  quality: 0.82,
};

// MIME types we re-encode. GIFs are skipped so animation survives.
const COMPRESSIBLE = new Set(["image/png", "image/jpeg", "image/webp"]);

function loadBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function swapExt(name: string, ext: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${ext}`;
}

export async function compressImageFile(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!COMPRESSIBLE.has(file.type)) return file;

  const { maxEdge, quality } = { ...DEFAULTS, ...options };

  let img: HTMLImageElement;
  try {
    img = await loadBitmap(file);
  } catch {
    return file;
  }

  const { naturalWidth: w, naturalHeight: h } = img;
  if (!w || !h) return file;

  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, targetW, targetH);

  let blob = await canvasToBlob(canvas, "image/webp", quality);
  // Some older Safari versions don't encode WebP from canvas — fall back to
  // JPEG, except when the source had transparency (PNG) where JPEG would
  // flatten the alpha to black.
  if (!blob && file.type !== "image/png") {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }
  if (!blob) return file;

  // Only keep the re-encoded version when it's actually smaller (a tiny PNG
  // icon can grow when forced through WebP). When we only downscaled, keep it
  // regardless since the dimensions changed.
  if (scale === 1 && blob.size >= file.size) return file;

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], swapExt(file.name || "image", ext), {
    type: blob.type,
    lastModified: file.lastModified,
  });
}

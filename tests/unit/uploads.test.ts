import { describe, it, expect } from "vitest";
import path from "node:path";
import { resolveServePath, mimeFor, UPLOADS_DIR } from "@/lib/uploads";

describe("resolveServePath (path-traversal guard)", () => {
  it("resolves a normal nested path inside UPLOADS_DIR", () => {
    const p = resolveServePath(["photos", "display", "abc.webp"]);
    expect(p).toBe(path.resolve(UPLOADS_DIR, "photos", "display", "abc.webp"));
  });

  it("rejects an empty or non-array input", () => {
    expect(resolveServePath([])).toBeNull();
    // @ts-expect-error deliberately wrong type
    expect(resolveServePath("photos")).toBeNull();
    // @ts-expect-error deliberately wrong type
    expect(resolveServePath(null)).toBeNull();
  });

  it("rejects '..' segments (directory traversal)", () => {
    expect(resolveServePath(["..", "etc", "passwd"])).toBeNull();
    expect(resolveServePath(["photos", "..", "..", "..", "etc"])).toBeNull();
  });

  it("rejects segments containing path separators", () => {
    expect(resolveServePath(["foo/bar"])).toBeNull();
    expect(resolveServePath(["foo\\bar"])).toBeNull();
  });

  it("rejects dotfile / hidden segments", () => {
    expect(resolveServePath([".env"])).toBeNull();
    expect(resolveServePath(["photos", ".ssh"])).toBeNull();
  });

  it("every accepted path stays inside UPLOADS_DIR", () => {
    const p = resolveServePath(["a", "b", "c.png"]);
    expect(p).not.toBeNull();
    expect(p!.startsWith(path.resolve(UPLOADS_DIR) + path.sep)).toBe(true);
  });
});

describe("mimeFor", () => {
  it("maps known extensions", () => {
    expect(mimeFor("x.png")).toBe("image/png");
    expect(mimeFor("x.webp")).toBe("image/webp");
    expect(mimeFor("x.JPG")).toBe("image/jpeg");
  });
  it("falls back to octet-stream for unknown", () => {
    expect(mimeFor("x.txt")).toBe("application/octet-stream");
    expect(mimeFor("noext")).toBe("application/octet-stream");
  });
});

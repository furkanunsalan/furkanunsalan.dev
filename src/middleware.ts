import { defineMiddleware } from "astro:middleware";
import { createHash } from "node:crypto";
import { getSession } from "@/lib/session";

// Reachable without a session.
const PUBLIC_ADMIN = new Set<string>(["/admin/login", "/api/admin/login"]);

// Public HTML caching policy. The pages are DB-backed and admin-editable, so the
// window is deliberately short: 60 s of freshness means a repeat navigation is
// instant and an edit is visible within a minute without any manual purge.
// stale-while-revalidate=300 lets the browser keep serving the cached copy while
// it revalidates in the background, so a revalidation never blocks the reader.
// s-maxage mirrors max-age — there is no shared cache in front of the origin
// today (single Caddy), but it makes the intent explicit if a CDN is ever added.
const HTML_CACHE =
  "public, max-age=60, s-maxage=60, stale-while-revalidate=300";

// Weak ETag + 304 for HTML so revalidation is a round-trip of headers, not body.
// Only HTML is buffered — API/image responses stream through untouched, so this
// never hashes a streamed body.
async function withHtmlCache(
  request: Request,
  res: Response,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return res;
  if (res.status !== 200) return res;
  // A response that sets cookies is session-dependent; never store it.
  if (res.headers.has("set-cookie")) return res;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return res;

  const body = await res.text();
  const etag = `W/"${createHash("sha1").update(body).digest("base64url")}"`;

  const headers = new Headers(res.headers);
  // The body is re-created below; a stale length/encoding header would be wrong.
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.set("cache-control", HTML_CACHE);
  headers.set("etag", etag);

  const inm = request.headers.get("if-none-match");
  if (inm && inm.split(",").some((t) => t.trim() === etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(request.method === "HEAD" ? null : body, {
    status: 200,
    headers,
  });
}

// Site-wide security headers (replaces the old next.config headers()).
function baseHeaders(res: Response): Response {
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return res;
}

// Tighter headers for the admin surface (no framing, no indexing, no caching).
function adminHeaders(res: Response): Response {
  baseHeaders(res);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isAdmin =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (!isAdmin) {
    return baseHeaders(await withHtmlCache(context.request, await next()));
  }
  if (PUBLIC_ADMIN.has(pathname)) return adminHeaders(await next());

  const session = await getSession(context.cookies);
  if (!session.isAuthed) {
    if (pathname.startsWith("/api/")) {
      return adminHeaders(
        new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      );
    }
    const search =
      pathname !== "/admin" ? `?next=${encodeURIComponent(pathname)}` : "";
    return adminHeaders(context.redirect(`/admin/login${search}`));
  }
  return adminHeaders(await next());
});

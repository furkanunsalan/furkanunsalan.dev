import { defineMiddleware } from "astro:middleware";
import { createHash } from "node:crypto";
import { getSession } from "@/lib/session";

// Reachable without a session.
const PUBLIC_ADMIN = new Set<string>(["/admin/login", "/api/admin/login"]);

// Public HTML caching policy. The pages are DB-backed and admin-editable, and a
// freshness window turned out to be the wrong trade for content that is edited
// live: a 60 s window means the owner flips a toggle, reloads, and sees the old
// page. So the browser revalidates on every navigation instead — which is cheap,
// because the weak ETag below turns it into a header-only 304 rather than a
// re-download. No stale-while-revalidate either: it only pays off with a
// freshness window, and `must-revalidate` is what makes the 304 unconditional.
const HTML_CACHE = "public, max-age=0, must-revalidate";

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

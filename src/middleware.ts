import { defineMiddleware } from "astro:middleware";
import { getSession } from "@/lib/session";

// Reachable without a session.
const PUBLIC_ADMIN = new Set<string>(["/admin/login", "/api/admin/login"]);

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

// Tighter headers for the admin surface (no framing, no indexing).
function adminHeaders(res: Response): Response {
  baseHeaders(res);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isAdmin =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (!isAdmin) return baseHeaders(await next());
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

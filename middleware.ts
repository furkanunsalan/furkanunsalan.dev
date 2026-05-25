import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type AdminSession } from "@/lib/auth";

// Paths under /admin or /api/admin that are reachable without a session.
const PUBLIC_ADMIN = new Set<string>(["/admin/login", "/api/admin/login"]);

// Defence-in-depth headers for every admin response — keeps the admin out of
// iframes (clickjack of delete/logout buttons) and tells search engines not
// to index any of it.
function withAdminSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

// Next 14 dropped `experimental.trustHostHeader`, so `req.nextUrl` reflects
// the PM2 bind address (127.0.0.1:3010) rather than the public host that
// Caddy/nginx terminated. Build redirect URLs from the X-Forwarded-* headers
// the reverse proxy sets so the browser doesn't follow us to localhost.
function publicUrl(req: NextRequest, pathname: string): URL {
  const proto =
    req.headers.get("x-forwarded-proto") ||
    req.nextUrl.protocol.replace(":", "") ||
    "https";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.host;
  return new URL(`${proto}://${host}${pathname}`);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_ADMIN.has(pathname)) {
    return withAdminSecurityHeaders(NextResponse.next());
  }

  const res = NextResponse.next();
  const session = await getIronSession<AdminSession>(req, res, sessionOptions);

  if (!session.isAuthed) {
    if (pathname.startsWith("/api/")) {
      return withAdminSecurityHeaders(
        NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      );
    }
    const url = publicUrl(req, "/admin/login");
    if (pathname !== "/admin") url.searchParams.set("next", pathname);
    return withAdminSecurityHeaders(NextResponse.redirect(url));
  }
  return withAdminSecurityHeaders(res);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

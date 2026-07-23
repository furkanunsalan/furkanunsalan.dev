import type { APIRoute } from "astro";

export const prerender = false;

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://furkanunsalan.dev";

export const GET: APIRoute = async () => {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Host: ${BASE}
Sitemap: ${BASE}/sitemap.xml
`;

  return new Response(body, {
    headers: { "content-type": "text/plain" },
  });
};

import type { APIRoute } from "astro";
import { getMergedContributions } from "@/lib/github";
import type { MergedContributions } from "@/lib/github";

export const prerender = false;

// The Next route relied on ISR (`revalidate = 3600`); Astro has no build-time
// cache, so a small module-level TTL keeps the same "refresh at most hourly"
// intent without hammering GitHub's GraphQL API on every page load. Only
// successes are cached — a failure falls through to a 500 (never cached).
const TTL_MS = 3600 * 1000;
let cached: { value: MergedContributions; expires: number } | null = null;

export const GET: APIRoute = async () => {
  try {
    if (!cached || cached.expires <= Date.now()) {
      const value = await getMergedContributions();
      cached = { value, expires: Date.now() + TTL_MS };
    }
    return new Response(JSON.stringify(cached.value), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error in /api/github/contributions:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch contributions" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
};

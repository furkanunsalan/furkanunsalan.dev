import type { APIRoute } from "astro";
import { getKarakeepBookmarks } from "@/lib/karakeep";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const searchParams = new URL(request.url).searchParams;
    const listId = searchParams.get("listId");
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!listId) {
      return new Response(JSON.stringify({ error: "listId is required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const { items, nextCursor } = await getKarakeepBookmarks(
      listId,
      cursor,
      limit,
    );

    return new Response(
      JSON.stringify({
        items,
        nextCursor,
        hasMore: Boolean(nextCursor),
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("Error in /api/karakeep:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch bookmarks" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
};

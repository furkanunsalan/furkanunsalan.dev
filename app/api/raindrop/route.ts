import { NextRequest } from "next/server";
import { getRaindropBookmarks } from "@/lib/raindrop";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const collectionId = searchParams.get("collectionId");

    if (!collectionId) {
      return new Response(
        JSON.stringify({ error: "Collection ID is required" }),
        {
          status: 400,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    const bookmarks = await getRaindropBookmarks(collectionId);

    return new Response(JSON.stringify(bookmarks), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("Error in /api/raindrop:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch bookmarks" }),
      {
        status: 500,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }
}

import { NextRequest } from "next/server";
import { getKarakeepLast24hCount, getKarakeepListCount } from "@/lib/karakeep";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ids = (req.nextUrl.searchParams.get("listIds") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const [counts, last24h] = await Promise.all([
      Promise.all(
        ids.map(async (id) => [id, await getKarakeepListCount(id)] as const),
      ),
      getKarakeepLast24hCount(),
    ]);

    return new Response(
      JSON.stringify({
        counts: Object.fromEntries(counts),
        last24h,
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Error in /api/karakeep/stats:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch stats" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

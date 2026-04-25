import { getContributionCalendar } from "@/lib/github";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  try {
    const calendar = await getContributionCalendar();
    return new Response(JSON.stringify(calendar), {
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
}

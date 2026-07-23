import type { APIRoute } from "astro";
import { getTools } from "@/lib/content";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const tools = await getTools();
    return new Response(JSON.stringify({ tools }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error fetching tools:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch tools" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
};

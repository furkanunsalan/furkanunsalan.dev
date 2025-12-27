import { NextResponse } from "next/server";
import { getContentfulTools } from "@/lib/contentful";

// Force dynamic rendering to prevent caching
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tools = await getContentfulTools();
    return NextResponse.json({ tools });
  } catch (error: any) {
    console.error("Error fetching tools:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tools" },
      { status: 500 },
    );
  }
}

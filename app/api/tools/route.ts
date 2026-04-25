import { NextResponse } from "next/server";
import { getTools } from "@/lib/content";

export const dynamic = "force-static";

export async function GET() {
  try {
    const tools = await getTools();
    return NextResponse.json({ tools });
  } catch (error: any) {
    console.error("Error fetching tools:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tools" },
      { status: 500 },
    );
  }
}

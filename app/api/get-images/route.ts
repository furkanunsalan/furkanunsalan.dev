// app/api/get-images/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dirPath = searchParams.get("path");
  
  if (!dirPath) {
    return NextResponse.json({ error: "Path parameter is required" }, { status: 400 });
  }
  
  // Construct the full path to the directory
  const fullPath = path.join(process.cwd(), "public", dirPath);
  
  try {
    // Check if directory exists
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ images: [] });
    }
    
    // Get all files from the directory
    const files = fs.readdirSync(fullPath);
    
    // Filter to only include image files (webp in this case)
    const imageFiles = files.filter(file => file.endsWith('.webp'));
    
    return NextResponse.json({ images: imageFiles });
  } catch (error) {
    console.error("Error reading directory:", error);
    return NextResponse.json({ error: "Failed to read directory" }, { status: 500 });
  }
}
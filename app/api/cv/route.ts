import { NextResponse } from "next/server";
import { buildCvModel } from "@/lib/cv/build";
import { renderCvPdf } from "@/lib/cv/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const variant = searchParams.get("variant") === "short" ? "short" : "full";
  const asDownload = searchParams.has("download");

  try {
    const pdf = await renderCvPdf(await buildCvModel(variant));
    const filename =
      variant === "short"
        ? "Furkan-Unsalan-Resume.pdf"
        : "Furkan-Unsalan-CV.pdf";
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${asDownload ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[/api/cv] render failed:", e);
    return NextResponse.json({ error: "Failed to render CV" }, { status: 500 });
  }
}

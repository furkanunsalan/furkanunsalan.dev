import type { APIRoute } from "astro";
import { buildCvModel } from "@/lib/cv/build";
import { renderCvPdf } from "@/lib/cv/render";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const variant = searchParams.get("variant") === "short" ? "short" : "full";
  const asDownload = searchParams.has("download");

  try {
    const pdf = await renderCvPdf(await buildCvModel(variant));
    const filename =
      variant === "short"
        ? "Furkan-Unsalan-Resume.pdf"
        : "Furkan-Unsalan-CV.pdf";
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${asDownload ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[/api/cv] render failed:", e);
    return new Response(JSON.stringify({ error: "Failed to render CV" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

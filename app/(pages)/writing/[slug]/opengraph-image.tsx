import { getPostMetaBySlug } from "@/lib/content";
import { OG_SIZE, OG_CONTENT_TYPE, renderOgImage } from "@/lib/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Furkan Ünsalan — Writing";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OG({ params }: { params: { slug: string } }) {
  const post = await getPostMetaBySlug(params.slug);
  const title = post?.title ?? "Writing";
  const date = post?.date
    ? new Date(post.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : undefined;
  return renderOgImage({
    eyebrow: "Writing · furkanunsalan.dev",
    title,
    subtitle: date,
    footer: "furkanunsalan.dev/writing",
  });
}

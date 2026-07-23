import type { APIRoute } from "astro";
import { getPostMetaBySlug } from "@/lib/content";
import { renderOgImage } from "@/lib/og";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const post = await getPostMetaBySlug(params.slug!);
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
};

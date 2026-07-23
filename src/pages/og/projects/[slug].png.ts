import type { APIRoute } from "astro";
import { getCustomProjectBySlug } from "@/lib/content";
import { renderOgImage } from "@/lib/og";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const project = await getCustomProjectBySlug(params.slug!);
  return renderOgImage({
    eyebrow: "Projects · furkanunsalan.dev",
    title: project?.name ?? params.slug ?? "Project",
    subtitle: project?.description ?? undefined,
    footer: "furkanunsalan.dev/projects",
  });
};

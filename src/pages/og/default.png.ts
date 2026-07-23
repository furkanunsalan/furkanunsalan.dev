import type { APIRoute } from "astro";
import { renderOgImage } from "@/lib/og";

export const prerender = false;

export const GET: APIRoute = async () =>
  renderOgImage({
    eyebrow: "furkanunsalan.dev",
    title: "Furkan Ünsalan",
    subtitle: "Software Developer · Photography · @Istanbul",
    footer: "furkanunsalan.dev",
  });

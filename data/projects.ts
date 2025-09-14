import type { Project } from "@/types";

export const projects: Project[] = [
  {
    id: 1,
    slug: "travel-map",
    title: "Travel Map",
    repo: "TravelMap",
    owner: "furkanunsalan",
    branch: "prod",
    update: "2025/02/23",
    short_description:
      "A personal project for tracking and visualizing travel destinations using an interactive map, with features for bookmarking and rating places.",
    private: false,
  },
  {
    id: 2,
    slug: "yatirim-bot",
    title: "Yatırım Bot | @yatirimhaberi",
    repo: "yatirimbot",
    owner: "Descite-Co",
    branch: "v2",
    update: "2024/11/12",
    short_description:
      "Yatırım Bot is a Python-based project designed to automate the sharing of financial updates and trading signals on X.",
    private: false,
  },
  {
    id: 3,
    slug: "portfolio-site",
    title: "Portfolio Website",
    repo: "furkanunsalan.dev",
    owner: "furkanunsalan",
    branch: "main",
    update: "2024/11/15",
    short_description:
      "My personal website built using Next.js, Tailwind CSS, shadcn/ui, Unsplash and deployed on Vercel.",
    private: false,
  },
  {
    id: 4,
    slug: "cekilis-arkadasi",
    title: "DMG Çekiliş Arkadaşın",
    repo: "cekilis-arkadasi",
    owner: "Developer-MultiGroup",
    branch: "main",
    update: "2024/12/17",
    short_description:
      "A web application for managing and organizing team giveaways, promoting engagement and fun within teams!",
    private: false,
  },
  {
    id: 5,
    slug: "genai-bootcamp-site",
    title: "DMG GenAI Bootcamp Website",
    repo: "genai-fundamentals-website",
    owner: "Developer-MultiGroup",
    branch: "main",
    update: "2025/03/08",
    short_description:
      "Generative AI Fundamentals with Gemini Bootcamp Page! If you want to learn more about AI, let us welcome you to our site.",
    private: false,
  },
  {
    id: 6,
    slug: "android-blast-off",
    title: "DMG Android Blast Off Website",
    repo: "android-blast-off-website",
    owner: "Developer-MultiGroup",
    branch: "main",
    update: "2025/05/13",
    short_description:
      "If you want to become an Android developer with Jetpack Compose, start strong with the latest curriculum and innovations!",
    private: false,
  },
  {
    id: 7,
    slug: "multigroup-event-page",
    title: "DMG Event Page",
    repo: "multigroup-event-page",
    owner: "Developer-MultiGroup",
    branch: "main",
    update: "2025/06/07",
    short_description:
      "Official event page of Developer MultiGroup where you can discover and attend insightful events every month!",
    private: false,
  },
  {
    id: 8,
    slug: "multigroup-hq",
    title: "DMG Headquarters",
    update: "2025/09/12",
    short_description:
      "Headquarter website used by 30+ Developer Multigroup team members.",
    private: true,
    long_description: "Team headquarter website for making the use of other platforms easier in a central platform, connected to Cloudflare for Assets CDN. Hub for all MultiGroup resources like photos, 100+ documentations and team info. Tech Stack: Next.js, Tailwind, shadcn/ui, FumaDocs, Vercel, Cloudflare R2, Supabase Auth & Database"
  },
];

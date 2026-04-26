import GithubCommitHistory from "@/components/GithubCommitHistory";
import HomeIntro from "@/components/HomeIntro";
import HomeTools from "@/components/HomeTools";
import LatestSection, { type LatestItem } from "@/components/LatestSection";
import { getExperiences, getPosts } from "@/lib/content";
import { getGithubRepos } from "@/lib/github";
import { getRaindropLatest } from "@/lib/raindrop";
import unsplash from "@/lib/unsplash";

export const revalidate = 3600;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error("home latest fetch failed:", e);
    return fallback;
  }
}

export default async function Home() {
  const [experiences, posts, repos, bookmark, photos] = await Promise.all([
    safe(() => getExperiences(), []),
    safe(() => getPosts(), []),
    safe(() => getGithubRepos(), []),
    safe(() => getRaindropLatest(), null),
    safe(() => unsplash.getPhotos(1) as Promise<any[]>, [] as any[]),
  ]);

  const latestExperience = [...experiences].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    const parse = (s: string) => {
      const [d, m, y] = s.split("/").map(Number);
      return new Date(y || 0, (m || 1) - 1, d || 1).getTime();
    };
    return parse(b.start_date) - parse(a.start_date);
  })[0];
  const latestPost = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];
  const latestProject = [...repos].sort(
    (a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime(),
  )[0];
  const latestPhoto = photos[0];

  const items: LatestItem[] = [];

  if (latestExperience) {
    items.push({
      type: "experience",
      title: `${latestExperience.title} @ ${latestExperience.organization}`,
      href: "/experience",
      date: latestExperience.start_date,
    });
  }

  if (latestPost) {
    items.push({
      type: "writing",
      title: latestPost.title,
      href: `/writing/${latestPost.slug}`,
      date: latestPost.date,
    });
  }

  if (latestProject) {
    items.push({
      type: "project",
      title: latestProject.description
        ? `${latestProject.name} — ${latestProject.description}`
        : latestProject.name,
      href: `/projects/${latestProject.name}`,
      date: latestProject.pushed_at,
    });
  }

  if (bookmark) {
    items.push({
      type: "bookmark",
      title: bookmark.title,
      href: bookmark.link,
      date: bookmark.created,
      external: true,
    });
  }

  if (latestPhoto) {
    items.push({
      type: "photo",
      title: latestPhoto.alt_description || latestPhoto.slug || "Untitled",
      href: "/photos",
      date: latestPhoto.created_at,
    });
  }

  return (
    <>
      <HomeIntro />
      <LatestSection items={items} />
      <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 animate-fade-in-up delay-300">
        <GithubCommitHistory />
      </section>
      <HomeTools />
    </>
  );
}

import { Metadata } from "next";
import { getPosts, getThoughts } from "@/lib/content";
import FeedList, { type FeedItem } from "@/components/FeedList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thoughts | Furkan Ünsalan",
  description:
    "Whatever comes to mind, whenever it comes. No schedule, no plan.",
};

export default async function ThoughtsPage() {
  const [posts, thoughts] = await Promise.all([getPosts(), getThoughts()]);

  const feed: FeedItem[] = [
    ...posts.map(
      (p): FeedItem => ({
        kind: "post",
        id: p.slug,
        date: p.date,
        data: p,
      }),
    ),
    ...thoughts.map(
      (t): FeedItem => ({
        kind: "thought",
        id: String(t.id),
        date: t.createdAt,
        data: t,
      }),
    ),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-24 mb-16">
      <FeedList items={feed} />
    </div>
  );
}

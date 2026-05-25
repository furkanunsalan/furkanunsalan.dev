import { Metadata } from "next";
import KarakeepBookmarks from "@/components/KarakeepBookmarks";
import { BOOKMARK_LISTS } from "@/lib/karakeep";

export const metadata: Metadata = {
  title: "Bookmarks | Furkan Ünsalan",
  description:
    "A collection of my curated bookmarks and interesting finds from around the web.",
};

export default function BookmarksPage() {
  return (
    <div className="mt-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
      <KarakeepBookmarks lists={[...BOOKMARK_LISTS]} />
    </div>
  );
}

import { Metadata } from "next";
import RaindropBookmarks from "@/components/RaindropBookmarks";

export const metadata: Metadata = {
  title: "Bookmarks | Furkan Ünsalan",
  description:
    "A collection of my curated bookmarks and interesting finds from around the web.",
};

// Define your collections here
const collections = [
  {
    id: "54606666",
    title: "Good Posts Archive",
    description:
      "An archive for the posts that I've bookmarked and read along the way.",
  },
  {
    id: "54690874",
    title: "Videos",
    description:
      "The videos I've watched and found useful without any categorizations",
  },
];

export default function BookmarksPage() {
  return (
    <div className="min-h-screen px-4 py-8 mt-32">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Bookmarks
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            A curated collection of interesting articles, tools, and resources
            I&apos;ve found across the web.
          </p>
        </div>
        <RaindropBookmarks collections={collections} />
      </div>
    </div>
  );
}

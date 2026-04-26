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
    title: "Posts",
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
    <div className="mt-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
      <RaindropBookmarks collections={collections} />
    </div>
  );
}

import { Metadata } from "next";
import BookmarkGraph from "@/components/BookmarkGraph";

export const metadata: Metadata = {
  title: "Bookmarks | Furkan Ünsalan",
  description:
    "A graph of my curated bookmarks and the tags that connect them, from around the web.",
};

export default function BookmarksPage() {
  return <BookmarkGraph />;
}

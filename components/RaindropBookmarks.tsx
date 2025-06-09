"use client";

import { useEffect, useState } from "react";
import type { RaindropBookmark } from "@/lib/raindrop";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Collection {
  id: string;
  title: string;
  description: string;
}

interface RaindropBookmarksProps {
  collections: Collection[];
}

export default function RaindropBookmarks({
  collections,
}: RaindropBookmarksProps) {
  const [activeCollection, setActiveCollection] = useState(collections[0].id);
  const [bookmarks, setBookmarks] = useState<
    Record<string, RaindropBookmark[]>
  >({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const fetchBookmarks = async (collectionId: string) => {
      if (bookmarks[collectionId]) return; // Don't fetch if we already have the data

      setIsLoading((prev) => ({ ...prev, [collectionId]: true }));
      setError((prev) => ({ ...prev, [collectionId]: null }));

      try {
        const response = await fetch(
          `/api/raindrop?collectionId=${collectionId}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch bookmarks");
        }
        const data = await response.json();
        setBookmarks((prev) => ({ ...prev, [collectionId]: data }));
      } catch (err) {
        setError((prev) => ({
          ...prev,
          [collectionId]:
            err instanceof Error ? err.message : "Failed to load bookmarks",
        }));
      } finally {
        setIsLoading((prev) => ({ ...prev, [collectionId]: false }));
      }
    };

    fetchBookmarks(activeCollection);
  }, [activeCollection, bookmarks]);

  const renderBookmarks = (collectionId: string) => {
    if (isLoading[collectionId]) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-light-secondary dark:bg-dark-secondary rounded-lg animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (error[collectionId]) {
      return (
        <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800 rounded-md">
          Error: {error[collectionId]}
        </div>
      );
    }

    const collectionBookmarks = bookmarks[collectionId] || [];

    if (collectionBookmarks.length === 0) {
      return (
        <div className="text-center py-12 text-gray-600 dark:text-gray-400">
          <p className="text-lg">No bookmarks found in this collection.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {collectionBookmarks.map((bookmark) => (
          <article
            key={bookmark._id}
            className="bg-light-secondary dark:bg-dark-secondary hover:border-accent-primary dark:hover:border-accent-primary p-4 md:p-6 rounded-lg border border-light-third dark:border-dark-third transition-all duration-300 h-full flex flex-col"
          >
            <a
              href={bookmark.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block group h-full flex-col"
            >
              <div className="flex flex-col h-full">
                {bookmark.cover && (
                  <div className="relative w-full h-48 mb-4 rounded-md overflow-hidden">
                    <Image
                      src={bookmark.cover}
                      alt={bookmark.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 group-hover:text-accent-primary dark:group-hover:text-accent-primary transition-colors line-clamp-2">
                      {bookmark.title}
                    </h3>
                    <ExternalLink className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-1" />
                  </div>
                  {bookmark.excerpt && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 flex-1">
                      {bookmark.excerpt}
                    </p>
                  )}
                  <div className="mt-auto">
                    {bookmark.tags && bookmark.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {bookmark.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="bg-light-primary dark:bg-dark-primary text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                        {bookmark.tags.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{bookmark.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    <time className="block text-xs text-gray-500 dark:text-gray-400">
                      {new Date(bookmark.created).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                </div>
              </div>
            </a>
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Tabs defaultValue={collections[0].id} className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="flex flex-wrap justify-center gap-2 p-1">
            {collections.map((collection) => (
              <TabsTrigger
                key={collection.id}
                value={collection.id}
                onClick={() => setActiveCollection(collection.id)}
                className="text-sm md:text-base px-3 md:px-4 py-2"
              >
                {collection.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {collections.map((collection) => (
          <TabsContent key={collection.id} value={collection.id}>
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  {collection.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  {collection.description}
                </p>
              </div>
              {renderBookmarks(collection.id)}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

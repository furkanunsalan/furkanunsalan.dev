"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { RaindropBookmark } from "@/lib/raindrop";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsCard from "@/components/StatsCard";

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
  const [isLoadingMore, setIsLoadingMore] = useState<Record<string, boolean>>(
    {},
  );
  const [error, setError] = useState<Record<string, string | null>>({});
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({});
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef<Record<string, boolean>>({});
  const isLoadingMoreRef = useRef<Record<string, boolean>>({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<{
    counts: Record<string, number>;
    last24h: number;
  } | null>(null);

  useEffect(() => {
    const ids = collections.map((c) => c.id).join(",");
    fetch(`/api/raindrop/stats?collectionIds=${ids}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => {});
  }, [collections]);

  // Keep refs in sync with state
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  const fetchBookmarks = useCallback(
    async (collectionId: string, page: number = 0, append: boolean = false) => {
      // Don't fetch if already loading
      if (
        isLoadingRef.current[collectionId] ||
        isLoadingMoreRef.current[collectionId]
      )
        return;

      if (append) {
        setIsLoadingMore((prev) => ({ ...prev, [collectionId]: true }));
      } else {
        setIsLoading((prev) => ({ ...prev, [collectionId]: true }));
      }
      setError((prev) => ({ ...prev, [collectionId]: null }));

      try {
        const response = await fetch(
          `/api/raindrop?collectionId=${collectionId}&page=${page}&perPage=50`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch bookmarks");
        }
        const data = await response.json();
        const newBookmarks = data.items as RaindropBookmark[];

        if (append) {
          setBookmarks((prev) => ({
            ...prev,
            [collectionId]: [...(prev[collectionId] || []), ...newBookmarks],
          }));
        } else {
          setBookmarks((prev) => ({ ...prev, [collectionId]: newBookmarks }));
        }

        setCurrentPage((prev) => ({ ...prev, [collectionId]: page }));
        setHasMore((prev) => ({ ...prev, [collectionId]: data.hasMore }));
      } catch (err) {
        setError((prev) => ({
          ...prev,
          [collectionId]:
            err instanceof Error ? err.message : "Failed to load bookmarks",
        }));
      } finally {
        if (append) {
          setIsLoadingMore((prev) => ({ ...prev, [collectionId]: false }));
        } else {
          setIsLoading((prev) => ({ ...prev, [collectionId]: false }));
        }
      }
    },
    [],
  );

  // Update indicator position when active collection changes
  useEffect(() => {
    const updateIndicator = () => {
      const tabsListElement = tabsListRef.current;
      if (!tabsListElement) return;

      const activeTabElement = tabsListElement.querySelector(
        `[data-state="active"]`,
      ) as HTMLElement;

      if (activeTabElement) {
        const tabsListRect = tabsListElement.getBoundingClientRect();
        const activeTabRect = activeTabElement.getBoundingClientRect();
        const left = activeTabRect.left - tabsListRect.left;
        const width = activeTabRect.width;

        setIndicatorStyle({ left, width });
      }
    };

    updateIndicator();
    const frameId = requestAnimationFrame(updateIndicator);
    window.addEventListener("resize", updateIndicator);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeCollection, collections]);

  // Initial fetch when collection changes
  useEffect(() => {
    const collectionId = activeCollection;
    if (!bookmarks[collectionId] && !isLoading[collectionId]) {
      fetchBookmarks(collectionId, 0, false);
    }
  }, [activeCollection, bookmarks, isLoading, fetchBookmarks]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const collectionId = activeCollection;
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMore[collectionId]) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (
          entry.isIntersecting &&
          hasMore[collectionId] &&
          !isLoadingRef.current[collectionId] &&
          !isLoadingMoreRef.current[collectionId]
        ) {
          const nextPage = (currentPage[collectionId] || 0) + 1;
          fetchBookmarks(collectionId, nextPage, true);
        }
      },
      {
        rootMargin: "100px",
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [activeCollection, hasMore, currentPage, fetchBookmarks]);

  const renderBookmarks = (collectionId: string) => {
    if (isLoading[collectionId] && !bookmarks[collectionId]) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card h-32 flex flex-row overflow-hidden">
              <div className="skeleton w-2/5 h-full rounded-none" />
              <div className="flex-1 flex flex-col p-3 space-y-2">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
                <div className="mt-auto flex items-center justify-between">
                  <div className="skeleton h-3 w-20" />
                  <div className="skeleton h-4 w-12 rounded-full" />
                </div>
              </div>
            </div>
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

    if (collectionBookmarks.length === 0 && !isLoading[collectionId]) {
      return (
        <div className="text-center py-12 text-light-fourth">
          <p className="text-lg">No bookmarks found in this collection.</p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
          {collectionBookmarks.map((bookmark) => (
            <article
              key={bookmark._id}
              className="card-interactive group h-full overflow-hidden"
            >
              <a
                href={bookmark.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-row h-full"
              >
                {bookmark.cover && (
                  <div className="image-skeleton relative aspect-video w-2/5 flex-shrink-0 overflow-hidden media-zoom">
                    <Image
                      src={bookmark.cover}
                      alt={bookmark.title}
                      fill
                      sizes="(max-width: 640px) 40vw, 200px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 flex flex-col p-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-white group-hover:text-accent-primary transition-colors line-clamp-2">
                      {bookmark.title}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-light-fourth group-hover:text-accent-primary flex-shrink-0 mt-0.5 transition-colors" />
                  </div>
                  <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                    <time className="text-xs text-light-fourth">
                      {new Date(bookmark.created).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                    {bookmark.tags && bookmark.tags.length > 0 && (
                      <span className="chip truncate">{bookmark.tags[0]}</span>
                    )}
                  </div>
                </div>
              </a>
            </article>
          ))}
        </div>
        {/* Loading more indicator */}
        {isLoadingMore[collectionId] && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 animate-fade-in">
            {[1, 2].map((i) => (
              <div key={i} className="card h-32 flex flex-row overflow-hidden">
                <div className="skeleton w-2/5 h-full rounded-none" />
                <div className="flex-1 flex flex-col p-3 space-y-2">
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-3/4" />
                  <div className="mt-auto flex items-center justify-between">
                    <div className="skeleton h-3 w-20" />
                    <div className="skeleton h-4 w-12 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Sentinel element for infinite scroll */}
        {hasMore[collectionId] && (
          <div ref={sentinelRef} className="h-10 w-full" />
        )}
        {/* End of results message */}
        {!hasMore[collectionId] &&
          collectionBookmarks.length > 0 &&
          !isLoadingMore[collectionId] && (
            <div className="text-center py-8 text-light-fourth text-sm animate-fade-in">
              All bookmarks loaded
            </div>
          )}
      </>
    );
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-3 mb-8 stagger">
        {collections.map((collection) => (
          <StatsCard
            key={collection.id}
            title={collection.title}
            value={stats ? String(stats.counts[collection.id] ?? 0) : "—"}
          />
        ))}
        <StatsCard
          title="Last 24h"
          value={stats ? String(stats.last24h) : "—"}
        />
      </div>
      <Tabs
        defaultValue={collections[0].id}
        className="w-full"
        onValueChange={setActiveCollection}
      >
        <div className="flex justify-center mb-8">
          <div className="relative">
            <TabsList
              ref={tabsListRef}
              className="flex flex-wrap justify-center gap-2 p-0 bg-transparent relative"
            >
              {collections.map((collection) => (
                <TabsTrigger
                  key={collection.id}
                  value={collection.id}
                  className="px-4 py-2 text-sm bg-transparent hover:bg-transparent dark:hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-accent-primary rounded-none transition-colors duration-300"
                >
                  {collection.title}
                </TabsTrigger>
              ))}
              {/* Sliding indicator */}
              <div
                className="absolute bottom-0 h-0.5 bg-accent-primary transition-[left,width] duration-300 ease-out"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                }}
              />
            </TabsList>
          </div>
        </div>
        {collections.map((collection) => (
          <TabsContent
            key={collection.id}
            value={collection.id}
            className="animate-fade-in"
          >
            {renderBookmarks(collection.id)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { KarakeepBookmark } from "@/lib/karakeep";
import { ExternalLink } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsCard from "@/components/StatsCard";

interface KarakeepList {
  id: string;
  title: string;
  description: string;
}

interface KarakeepBookmarksProps {
  lists: KarakeepList[];
}

export default function KarakeepBookmarks({ lists }: KarakeepBookmarksProps) {
  const [activeList, setActiveList] = useState(lists[0].id);
  const [bookmarks, setBookmarks] = useState<
    Record<string, KarakeepBookmark[]>
  >({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [isLoadingMore, setIsLoadingMore] = useState<Record<string, boolean>>(
    {},
  );
  const [error, setError] = useState<Record<string, string | null>>({});
  const [cursors, setCursors] = useState<Record<string, string | null>>({});
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
    const ids = lists.map((l) => l.id).join(",");
    fetch(`/api/karakeep/stats?listIds=${ids}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => {});
  }, [lists]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  const fetchBookmarks = useCallback(
    async (
      listId: string,
      cursor: string | null = null,
      append: boolean = false,
    ) => {
      if (isLoadingRef.current[listId] || isLoadingMoreRef.current[listId])
        return;

      if (append) {
        setIsLoadingMore((prev) => ({ ...prev, [listId]: true }));
      } else {
        setIsLoading((prev) => ({ ...prev, [listId]: true }));
      }
      setError((prev) => ({ ...prev, [listId]: null }));

      try {
        const params = new URLSearchParams();
        params.set("listId", listId);
        params.set("limit", "50");
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/karakeep?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch bookmarks");
        }
        const data = await response.json();
        const newBookmarks = data.items as KarakeepBookmark[];

        if (append) {
          setBookmarks((prev) => ({
            ...prev,
            [listId]: [...(prev[listId] || []), ...newBookmarks],
          }));
        } else {
          setBookmarks((prev) => ({ ...prev, [listId]: newBookmarks }));
        }

        setCursors((prev) => ({ ...prev, [listId]: data.nextCursor }));
        setHasMore((prev) => ({ ...prev, [listId]: Boolean(data.nextCursor) }));
      } catch (err) {
        setError((prev) => ({
          ...prev,
          [listId]:
            err instanceof Error ? err.message : "Failed to load bookmarks",
        }));
      } finally {
        if (append) {
          setIsLoadingMore((prev) => ({ ...prev, [listId]: false }));
        } else {
          setIsLoading((prev) => ({ ...prev, [listId]: false }));
        }
      }
    },
    [],
  );

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
  }, [activeList, lists]);

  useEffect(() => {
    const listId = activeList;
    if (!bookmarks[listId] && !isLoading[listId]) {
      fetchBookmarks(listId, null, false);
    }
  }, [activeList, bookmarks, isLoading, fetchBookmarks]);

  useEffect(() => {
    const listId = activeList;
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMore[listId]) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (
          entry.isIntersecting &&
          hasMore[listId] &&
          !isLoadingRef.current[listId] &&
          !isLoadingMoreRef.current[listId]
        ) {
          fetchBookmarks(listId, cursors[listId] || null, true);
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
  }, [activeList, hasMore, cursors, fetchBookmarks]);

  const renderBookmarks = (listId: string) => {
    if (isLoading[listId] && !bookmarks[listId]) {
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

    if (error[listId]) {
      return (
        <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800 rounded-md">
          Error: {error[listId]}
        </div>
      );
    }

    const listBookmarks = bookmarks[listId] || [];

    if (listBookmarks.length === 0 && !isLoading[listId]) {
      return (
        <div className="text-center py-12 text-light-fourth">
          <p className="text-lg">No bookmarks found in this list.</p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
          {listBookmarks.map((bookmark) => (
            <article
              key={bookmark.id}
              className="card-interactive group h-full overflow-hidden"
            >
              <a
                href={bookmark.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-row h-full"
              >
                {bookmark.cover && (
                  <div className="relative aspect-video w-2/5 flex-shrink-0 overflow-hidden media-zoom">
                    <SmartImage
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
        {isLoadingMore[listId] && (
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
        {hasMore[listId] && <div ref={sentinelRef} className="h-10 w-full" />}
        {!hasMore[listId] &&
          listBookmarks.length > 0 &&
          !isLoadingMore[listId] && (
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
        {lists.map((list) => (
          <StatsCard
            key={list.id}
            title={list.title}
            value={stats ? String(stats.counts[list.id] ?? 0) : "—"}
          />
        ))}
        <StatsCard
          title="Last 24h"
          value={stats ? String(stats.last24h) : "—"}
        />
      </div>
      <Tabs
        defaultValue={lists[0].id}
        className="w-full"
        onValueChange={setActiveList}
      >
        <div className="flex justify-center mb-8">
          <div className="relative">
            <TabsList
              ref={tabsListRef}
              className="flex flex-wrap justify-center gap-2 p-0 bg-transparent relative"
            >
              {lists.map((list) => (
                <TabsTrigger
                  key={list.id}
                  value={list.id}
                  className="px-4 py-2 text-sm bg-transparent hover:bg-transparent dark:hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-accent-primary rounded-none transition-colors duration-300"
                >
                  {list.title}
                </TabsTrigger>
              ))}
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
        {lists.map((list) => (
          <TabsContent
            key={list.id}
            value={list.id}
            className="animate-fade-in"
          >
            {renderBookmarks(list.id)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

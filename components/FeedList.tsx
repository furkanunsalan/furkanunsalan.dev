"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import React from "react";
import Markdoc from "@markdoc/markdoc";
import {
  ArrowUpRight,
  Check,
  MessageSquare,
  PenLine,
  Rss,
  Search,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import type { BlogPost, Thought } from "@/types";
import ThoughtImageGallery from "@/components/ThoughtImageGallery";
import SmartImage from "@/components/SmartImage";

export type FeedItem =
  | { kind: "post"; id: string; date: string; data: BlogPost }
  | { kind: "thought"; id: string; date: string; data: Thought };

type TypeFilter = "all" | "essays" | "thoughts";

function formatRelative(iso: string): { relative: string; absolute: string } {
  const d = new Date(iso);
  const absolute = d.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  let relative: string;
  if (mins < 1) relative = "just now";
  else if (mins < 60) relative = `${mins}m ago`;
  else if (hours < 24) relative = `${hours}h ago`;
  else if (days < 7) relative = `${days}d ago`;
  else
    relative = d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year:
        d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    });
  return { relative, absolute };
}

function renderMarkdoc(body: string): React.ReactNode {
  if (!body.trim()) return null;
  try {
    const ast = Markdoc.parse(body);
    const transformed = Markdoc.transform(ast);
    return Markdoc.renderers.react(transformed, React);
  } catch {
    return (
      <pre className="whitespace-pre-wrap font-sans text-[15px] text-light-secondary/90">
        {body}
      </pre>
    );
  }
}

export default function FeedList({ items }: { items: FeedItem[] }) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [tag, setTag] = useState("");
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<null | "tags" | "type">(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: PointerEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenMenu(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const tags = it.kind === "post" ? it.data.tags : it.data.tags;
      tags?.forEach((t) => set.add(t));
    }
    return Array.from(set).sort();
  }, [items]);

  const counts = useMemo(
    () => ({
      all: items.length,
      essays: items.filter((i) => i.kind === "post").length,
      thoughts: items.filter((i) => i.kind === "thought").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (typeFilter === "essays" && it.kind !== "post") return false;
      if (typeFilter === "thoughts" && it.kind !== "thought") return false;
      const tags = it.kind === "post" ? it.data.tags : it.data.tags;
      if (tag && !tags?.includes(tag)) return false;
      if (!q) return true;
      const haystack =
        it.kind === "post"
          ? `${it.data.title} ${it.data.excerpt ?? ""}`
          : it.data.body;
      return haystack.toLowerCase().includes(q);
    });
  }, [items, typeFilter, tag, search]);

  return (
    <div>
      <div ref={barRef} className="relative mb-6">
        <div className="flex items-center gap-2 border-b border-white/[0.1] pb-2 transition-colors duration-200 focus-within:border-accent-primary/50">
          <Search className="h-4 w-4 shrink-0 text-light-fourth" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="flex-1 bg-transparent py-1 text-sm text-light-secondary placeholder:text-light-fourth focus:outline-none"
          />
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="RSS feed"
            title="RSS"
            className="p-1 text-light-fourth transition-colors hover:text-accent-primary"
          >
            <Rss className="h-4 w-4" />
          </a>

          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === "tags" ? null : "tags")}
            aria-label="Filter by tag"
            aria-expanded={openMenu === "tags"}
            title="Filter by tag"
            className={`relative p-1 transition-colors ${
              tag ? "text-accent-primary" : "text-light-fourth hover:text-white"
            }`}
          >
            <Tag className="h-4 w-4" />
            {tag && (
              <span className="absolute -right-0 -top-0 h-1.5 w-1.5 rounded-full bg-accent-primary" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === "type" ? null : "type")}
            aria-label="Filter by type"
            aria-expanded={openMenu === "type"}
            title="Filter by type"
            className={`relative p-1 transition-colors ${
              typeFilter !== "all"
                ? "text-accent-primary"
                : "text-light-fourth hover:text-white"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {typeFilter !== "all" && (
              <span className="absolute -right-0 -top-0 h-1.5 w-1.5 rounded-full bg-accent-primary" />
            )}
          </button>
        </div>

        {openMenu === "type" && (
          <Menu>
            {(["all", "essays", "thoughts"] as TypeFilter[]).map((t) => (
              <MenuItem
                key={t}
                active={typeFilter === t}
                onClick={() => {
                  setTypeFilter(t);
                  setOpenMenu(null);
                }}
              >
                <span className="capitalize">{t}</span>
                <span className="ml-auto tabular-nums text-light-fourth">
                  {counts[t]}
                </span>
              </MenuItem>
            ))}
          </Menu>
        )}

        {openMenu === "tags" && (
          <Menu>
            <MenuItem
              active={!tag}
              onClick={() => {
                setTag("");
                setOpenMenu(null);
              }}
            >
              All tags
            </MenuItem>
            {allTags.map((t) => (
              <MenuItem
                key={t}
                active={tag === t}
                onClick={() => {
                  setTag(t);
                  setOpenMenu(null);
                }}
              >
                #{t}
                {tag === t && <Check className="ml-auto h-3.5 w-3.5" />}
              </MenuItem>
            ))}
            {allTags.length === 0 && (
              <p className="px-3 py-1.5 text-sm text-light-fourth">No tags</p>
            )}
          </Menu>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 px-4 py-10 text-center text-sm text-light-fourth">
          Nothing matches.
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {filtered.map((item) =>
            item.kind === "post" ? (
              <PostRow key={`p-${item.id}`} post={item.data} />
            ) : (
              <ThoughtRow key={`t-${item.id}`} thought={item.data} />
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function Menu({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute right-0 top-full z-30 mt-2 max-h-64 w-48 overflow-auto rounded-lg border border-white/10 bg-zinc-950 py-1 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.9)] animate-fade-in"
      style={{ animationDuration: "120ms" }}
    >
      {children}
    </div>
  );
}

function MenuItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/[0.05] ${
        active ? "text-accent-primary" : "text-light-secondary hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function PostRow({ post }: { post: BlogPost }) {
  const dateLabel = new Date(post.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year:
      new Date(post.date).getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
  });

  return (
    <li>
      <Link
        href={`/writing/${post.slug}`}
        className="group block py-5 -mx-3 px-3 rounded transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-baseline gap-2 mb-1.5 text-[12px]">
          <PenLine className="w-3 h-3 text-white shrink-0 self-center" />
          <span className="font-mono tabular-nums text-light-fourth">
            {dateLabel}
          </span>
          {post.readingTime && (
            <>
              <span className="text-light-fourth/30" aria-hidden>
                ·
              </span>
              <span className="text-[10px] uppercase tracking-wider text-light-fourth/70">
                {post.readingTime}
              </span>
            </>
          )}
          <ArrowUpRight
            aria-hidden
            className="ml-auto w-3.5 h-3.5 text-accent-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
          />
        </div>

        <div className="flex gap-3">
          {post.banner && (
            <div className="relative shrink-0 w-24 h-16 sm:w-32 sm:h-20 rounded-md overflow-hidden ring-1 ring-white/[0.06] group-hover:ring-accent-primary/40 transition-[box-shadow] duration-300">
              <SmartImage
                src={post.banner}
                alt=""
                fill
                sizes="(max-width: 640px) 96px, 128px"
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-accent-primary transition-colors leading-snug">
              {post.title}
            </h3>
            {post.excerpt && (
              <p className="mt-1 text-sm text-light-secondary/80 line-clamp-2">
                {post.excerpt}
              </p>
            )}
            {post.tags && post.tags.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <li key={t}>
                    <span className="text-[10px] text-accent-primary/80">
                      #{t}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

function ThoughtRow({ thought }: { thought: Thought }) {
  const time = formatRelative(thought.createdAt);
  const anchor = `t-${thought.id}`;
  return (
    <li id={anchor} className="py-5 scroll-mt-24">
      <div className="flex items-baseline gap-2 mb-1.5 text-[12px]">
        <MessageSquare className="w-3 h-3 text-light-fourth shrink-0 self-center" />
        <Link
          href={`/writing#${anchor}`}
          title={time.absolute}
          className="font-mono tabular-nums text-light-fourth hover:text-accent-primary transition-colors"
        >
          <time dateTime={thought.createdAt}>{time.relative}</time>
        </Link>
        <span className="text-[10px] uppercase tracking-wider text-light-fourth/70">
          Thought
        </span>
      </div>

      {thought.body && (
        <div className="prose prose-invert max-w-none prose-p:my-1.5 prose-a:text-accent-primary text-light-secondary/95 text-[15px] leading-relaxed whitespace-pre-line">
          {renderMarkdoc(thought.body)}
        </div>
      )}

      <ThoughtImageGallery images={thought.images} id={thought.id} />

      {thought.tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {thought.tags.map((t) => (
            <li key={t}>
              <span className="text-[10px] text-accent-primary/80">#{t}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

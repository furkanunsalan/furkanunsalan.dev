"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import React from "react";
import Markdoc from "@markdoc/markdoc";
import {
  ArrowUpRight,
  MessageSquare,
  PenLine,
  Rss,
  Search,
} from "lucide-react";
import type { BlogPost, Thought } from "@/types";
import ThoughtImageGallery from "@/components/ThoughtImageGallery";

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
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="card relative flex-1 flex items-center px-3 text-sm transition-colors duration-200 focus-within:border-accent-primary/40">
          <Search className="w-3.5 h-3.5 text-light-fourth mr-1.5 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="flex-1 bg-transparent py-2 pr-2 text-light-secondary placeholder:text-light-fourth focus:outline-none"
          />
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="RSS feed"
            title="RSS"
            className="text-light-fourth hover:text-accent-primary transition-colors -mr-1 p-1"
          >
            <Rss className="w-4 h-4" />
          </a>
        </div>
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="bg-zinc-950 ring-1 ring-white/[0.06] focus:ring-white/20 outline-none rounded-lg px-3 py-2 text-sm text-light-secondary min-w-[120px]"
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1 mb-4">
        {(["all", "essays", "thoughts"] as TypeFilter[]).map((t) => {
          const active = typeFilter === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-wider ring-1 transition-colors ${
                active
                  ? "bg-accent-primary/15 text-accent-primary ring-accent-primary/40"
                  : "text-light-fourth ring-white/[0.06] hover:text-white hover:ring-white/20"
              }`}
            >
              <span>{t}</span>
              <span className="tabular-nums opacity-70">{counts[t]}</span>
            </button>
          );
        })}
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
          <PenLine className="w-3 h-3 text-accent-primary shrink-0 self-center" />
          <span className="font-mono tabular-nums text-light-fourth">
            {dateLabel}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-accent-primary/80">
            Essay
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
            <div className="image-skeleton relative shrink-0 w-24 h-16 sm:w-32 sm:h-20 rounded-md overflow-hidden ring-1 ring-white/[0.06] group-hover:ring-accent-primary/40 transition-[box-shadow] duration-300">
              <Image
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

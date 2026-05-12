"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Rss, Sparkle } from "lucide-react";
import type { BlogPost } from "@/types";
import TagSelect from "@/components/TagSelect";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export default function BlogPosts({ posts }: { posts: BlogPost[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");

  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((p) => p.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [posts]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return posts
      .filter((p) => {
        const matchesSearch = !q || p.title?.toLowerCase().includes(q);
        const matchesTag = !selectedTag || p.tags?.includes(selectedTag);
        return matchesSearch && matchesTag;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [posts, searchQuery, selectedTag]);

  const latest = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div>
      {/* Search bar + tag selector */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-10 animate-fade-in-down">
        <div className="card relative flex-1 flex items-center px-3 text-sm transition-colors duration-200 focus-within:border-accent-primary/40">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts..."
            className="flex-1 bg-transparent py-2 pr-2 text-light-secondary placeholder:text-light-fourth focus:outline-none"
          />
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="RSS feed"
            title="RSS feed"
            data-umami-event="RSS"
            className="text-light-fourth hover:text-accent-primary transition-colors duration-200 -mr-1 p-1"
          >
            <Rss className="w-4 h-4" />
          </a>
        </div>
        <TagSelect
          tags={uniqueTags}
          value={selectedTag}
          onChange={setSelectedTag}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-light-fourth">No posts found.</p>
      ) : (
        <>
          {/* Hero CTA — newest filtered post */}
          {latest && <LatestCTA post={latest} />}

          {rest.length > 0 && (
            <ul className="mt-10 divide-y divide-white/[0.04] stagger">
              {rest.map((post) => (
                <PostRow key={post.slug} post={post} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function LatestCTA({ post }: { post: BlogPost }) {
  const d = new Date(post.date);
  const formatted = d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link
      href={`/writing/${post.slug}`}
      className="group relative block animate-fade-in-up"
    >
      <div className="flex items-center gap-3 mb-4 font-mono text-[10px] uppercase tracking-[0.3em]">
        <span className="inline-flex items-center gap-2 text-accent-primary">
          <Sparkle className="w-2.5 h-2.5 fill-accent-primary" />
          Latest post
        </span>
        <span aria-hidden className="text-light-fourth/40">
          ·
        </span>
        <time className="text-light-fourth tabular-nums normal-case tracking-normal">
          {formatted}
        </time>
        <ArrowUpRight
          aria-hidden
          className="w-3 h-3 text-accent-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
        />
      </div>

      <div
        className={[
          "grid gap-6 sm:gap-8 items-start",
          post.banner ? "grid-cols-1 md:grid-cols-[1fr_1.2fr]" : "grid-cols-1",
        ].join(" ")}
      >
        {post.banner && (
          <div className="image-skeleton relative aspect-[16/10] rounded-xl overflow-hidden ring-1 ring-white/[0.06] group-hover:ring-accent-primary/40 transition-[box-shadow] duration-300">
            <Image
              src={post.banner}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white group-hover:text-accent-primary transition-colors duration-300 leading-tight">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="text-light-secondary/70 text-base sm:text-lg font-light leading-relaxed line-clamp-3">
              {post.excerpt}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function PostRow({ post }: { post: BlogPost }) {
  const d = new Date(post.date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = MONTH_SHORT[d.getMonth()];

  return (
    <li>
      <Link
        href={`/writing/${post.slug}`}
        className="group flex items-center gap-4 py-3 transition-colors"
      >
        {post.banner ? (
          <div className="image-skeleton relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 ring-1 ring-white/[0.06] group-hover:ring-accent-primary/50 transition-[box-shadow] duration-300">
            <Image
              src={post.banner}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
        ) : null}

        <span className="text-base sm:text-lg text-light-secondary group-hover:text-white transition-colors truncate flex-1">
          {post.title}
        </span>

        {/* Date slides slightly left on hover; arrow fades in to its right */}
        <span className="font-mono text-xs sm:text-sm text-light-fourth tabular-nums whitespace-nowrap transition-transform duration-300 group-hover:-translate-x-1">
          {day} {month}
        </span>
        <ArrowRight
          aria-hidden
          className="w-4 h-4 text-accent-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
        />
      </Link>
    </li>
  );
}

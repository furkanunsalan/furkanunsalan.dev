"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { FaChevronRight } from "react-icons/fa";
import type { BlogPost } from "@/types";

type SearchInputProps = {
  posts: BlogPost[];
};

export default function BlogPosts({ posts }: SearchInputProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");

  // Extract unique tags from all posts
  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((post) => {
      post.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [posts]);

  // Sort posts by date (example: oldest first)
  const sortedPosts = useMemo(() => {
    return [...posts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [posts]);

  // Filter posts based on search query and selected tag
  const filteredPosts = sortedPosts.filter((post) => {
    const matchesSearch = post.title
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || post.tags?.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div>
      {/* Search bar and tag selector container */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search posts..."
          className="card flex-1 px-3 py-2 text-sm text-light-secondary placeholder:text-light-fourth focus:outline-none focus:border-accent-primary/40"
        />
        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="card w-full sm:w-1/3 px-3 py-2 text-sm text-light-secondary appearance-none cursor-pointer focus:outline-none focus:border-accent-primary/40"
        >
          <option value="">All Tags</option>
          {uniqueTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      {/* Posts list */}
      <ul className="space-y-4">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <li
              key={post.slug}
              className="card-interactive group cursor-pointer p-3 sm:p-4"
            >
              <Link href={`/writing/${post.slug}`} className="block">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-xl font-semibold text-white group-hover:text-accent-primary transition-colors duration-300">
                      {post.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      <time className="text-xs sm:text-sm text-light-fourth">
                        {new Date(post.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {post.tags.map((tag, index) => (
                            <span key={index} className="chip">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <FaChevronRight className="text-light-fourth group-hover:text-accent-primary group-hover:translate-x-0.5 transition-all duration-300 mt-1.5 h-4 w-4 flex-shrink-0" />
                </div>
              </Link>
            </li>
          ))
        ) : (
          <p className="text-center text-light-fourth">No posts found.</p>
        )}
      </ul>
    </div>
  );
}

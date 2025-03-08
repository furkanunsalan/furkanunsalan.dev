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
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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
      <div className="flex gap-4 mb-8">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search posts..."
          className="flex-1 p-3 rounded-lg border border-light-third bg-light-secondary dark:bg-dark-secondary dark:border-dark-third dark:text-gray-200"
        />
        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="w-1/3 p-3 rounded-lg border border-light-third dark:bg-dark-secondary dark:border-dark-third dark:text-gray-200 appearance-none bg-light-secondary cursor-pointer"
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
      <ul className="space-y-6">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <li
              key={post.slug}
              className="bg-light-secondary dark:bg-dark-secondary hover:border-accent-primary dark:hover:border-accent-primary hover:cursor-pointer p-4 rounded-lg border border-light-third dark:border-dark-third transition-all duration-300"
            >
              <Link href={`/writing/${post.slug}`} className="block group">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                      {post.title}
                    </h2>
                    <div className="flex items-center space-x-4 mt-1">
                      <time className="text-sm text-black dark:text-gray-400">
                        {new Date(post.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          {post.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="bg-light-secondary border border-light-third dark:border-dark-third dark:bg-dark-secondary text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <FaChevronRight className="text-gray-500 dark:text-gray-400 ml-2 h-5 w-5" />
                </div>
              </Link>
            </li>
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">
            No posts found.
          </p>
        )}
      </ul>
    </div>
  );
}

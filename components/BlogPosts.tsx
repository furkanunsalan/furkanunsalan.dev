// components/SearchInput.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { FaChevronRight } from "react-icons/fa"; // Import the ChevronRight icon
import type { BlogPost } from "@/types";

type SearchInputProps = {
  posts: BlogPost[];
};

export default function BlogPosts({ posts }: SearchInputProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter posts based on search query
  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Search bar */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search posts..."
        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-secondary-dark dark:text-gray-200 mb-8"
      />

      {/* Posts list */}
      <ul className="space-y-6">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <li
              key={post.slug}
              className="bg-secondary-light dark:bg-secondary-dark hover:dark:bg-hover-dark hover:bg-hover-light hover:cursor-pointer p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-300"
            >
              <Link href={`/blog/${post.slug}`} className="block group">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                      {post.title}
                    </h2>
                    <div className="flex items-center space-x-4 mt-1">
                      <time className="text-sm text-gray-500 dark:text-gray-400">
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
                              className="bg-primary-light dark:bg-primary-dark text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Add the ">" icon */}
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

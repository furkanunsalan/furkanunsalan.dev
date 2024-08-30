import Link from 'next/link';
import { getBlogPosts } from '@/lib/getBlogPosts'; // Adjust the import to where your function is located
import type { BlogPost } from '@/types';

export default async function BlogPage() {
  const posts: BlogPost[] = await getBlogPosts(); // Type the posts array

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-center mb-4">Thoughts & Ideas</h1>
      <p className="text-lg text-center mb-12 text-gray-600 dark:text-gray-400">
        Welcome to my blog where I share insights, tutorials, and reflections on various topics in technology and beyond. Explore my latest articles and join the conversation!
      </p>
      
      <ul className="space-y-6">
        {posts.map((post) => (
          <li
            key={post.slug}
            className="bg-secondary-light dark:bg-secondary-dark hover:dark:bg-hover-dark hover:bg-hover-light hover:cursor-pointer p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-300"
          >
            <Link href={`/blog/${post.slug}`} className="block group">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                    {post.title}
                  </h2>
                  <div className="flex items-center space-x-4 mt-1">
                    <time className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap space-x-2">
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
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

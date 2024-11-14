import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { getBlogPostBySlug } from "@/lib/getBlogPosts";
import type { BlogPostData } from "@/types";
import Markdown from 'markdown-to-jsx';  // Import the markdown-to-jsx library

interface BlogPostProps {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  const files = fs.readdirSync(path.join(process.cwd(), "app/(pages)/blog"));
  return files.map((filename) => ({
    slug: filename.replace(".md", ""),
  }));
}

function calculateReadingTime(content: string) {
  const wordsPerMinute = 200; // Average reading speed
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

export default async function BlogPost({ params }: BlogPostProps) {
  const post: BlogPostData | null = await getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const { title, date, content, tags } = post;
  const readingTime = calculateReadingTime(content);

  // Custom renderers for markdown-to-jsx
  const options = {
    overrides: {
      img: {
        component: (props: any) => (
          <span className="block text-center"> {/* Using <span> instead of <figure> */}
            <img src={props.src} alt={props.alt} className="rounded-lg mx-auto" />
            {props.alt && <span className="mt-2 block text-sm text-gray-700 dark:text-gray-400">{props.alt}</span>}
          </span>
        ),
      },
    },
  };

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mt-16">
      <header className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-700 dark:text-gray-400 mb-2">
          {title}
        </h1>
        <time className="text-sm text-gray-500">
          {new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        <div className="text-sm text-gray-500">
          <time>
            {new Date(date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span className="mx-2">•</span>
          <span>{readingTime}</span>
        </div>

        {tags && tags.length > 0 && (
          <div className="mt-4 text-center">
            <ul className="mt-2 flex flex-wrap justify-center space-x-2">
              {tags.map((tag: string, index: number) => (
                <li key={index}>
                  <span className="bg-secondary-light dark:bg-secondary-dark text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
                    {tag}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      {/* Render Markdown to JSX with custom image rendering */}
      <div className="prose prose-lg mx-auto
        prose-a:text-indigo-500
        prose-headings:mt-8 
        prose-headings:mb-4 
        prose-headings:font-bold
        prose-headings:text-black dark:prose-headings:text-white
        prose-h1:text-4xl
        prose-h2:text-3xl
        prose-h3:text-2xl
        prose-h4:text-xl
        prose-h5:text-lg
        prose-h6:text-base
        prose-p:mb-6
        text-black dark:text-white opacity-60
        prose-strong:text-current 
        prose-strong:font-mono 
        prose-strong:font-thin
        prose-strong:underline">

        {/* Here we use the Markdown component to render the content as JSX */}
        <Markdown options={options}>{content}</Markdown>
      </div>
    </article>
  );
}

import { notFound } from "next/navigation";
import { getContentfulPostBySlug } from "@/lib/contentful";
import { BlogPostFields } from "@/types/contentful";
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import { Document, Text } from '@contentful/rich-text-types';

interface BlogPostProps {
  params: {
    slug: string;
  };
}

function calculateReadingTime(document: Document): string {
  const wordsPerMinute = 200;
  // Extract text content from rich text document
  const textContent = document.content
    .map(node => {
      if (node.nodeType === 'paragraph') {
        return node.content
          .map(content => {
            if ('value' in content) {
              return (content as Text).value;
            }
            return '';
          })
          .join(' ');
      }
      return '';
    })
    .join(' ');
  
  const words = textContent.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

export async function generateStaticParams() {
  // This will be handled by Contentful's ISR
  return [];
}

export default async function BlogPost({ params }: BlogPostProps) {
  const post = await getContentfulPostBySlug(params.slug);

  if (!post?.fields) {
    notFound();
  }

  const fields = post.fields as BlogPostFields;
  const { title, date, tags = [], body } = fields;

  if (!title || !date || !body) {
    notFound();
  }

  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const readingTime = calculateReadingTime(body as unknown as Document);

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mt-16">
      <header className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-700 dark:text-gray-400 mb-2">
          {title}
        </h1>
        <div className="text-sm text-gray-500">
          <time>{formattedDate}</time>
          <span className="mx-2">•</span>
          <span>{readingTime}</span>
        </div>

        {tags.length > 0 && (
          <div className="mt-4 text-center">
            <ul className="mt-2 flex flex-wrap justify-center space-x-2">
              {tags.map((tag: string, index: number) => (
                <li key={index}>
                  <span className="bg-light-secondary dark:bg-dark-secondary border border-light-third dark:border-dark-third text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
                    {tag}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <div className="prose prose-lg mx-auto
        prose-a:text-accent-primary
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
        {documentToReactComponents(body as unknown as Document)}
      </div>
    </article>
  );
}

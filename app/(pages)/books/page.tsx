"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

const STATUS_LABELS: Record<string, string> = {
  IS_READING: "Currently Reading",
  FINISHED: "Finished",
  WANTS_TO_READ: "Want to Read",
  DROPPED: "Dropped",
};

const STATUS_ORDER = ["IS_READING", "WANTS_TO_READ", "FINISHED", "DROPPED"];

export default function BooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setError(null);
        const response = await fetch("/api/literal?all=true");
        const data = await response.json();

        if (response.ok) {
          setBooks(data.books || []);
        } else {
          setError(data.error || "Failed to fetch books");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch books");
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const calculateProgress = (progress: any) => {
    if (!progress) return 0;
    if (progress.unit === "PERCENTAGE") {
      return progress.progress;
    }
    if (progress.capacity && progress.progress) {
      return (progress.progress / progress.capacity) * 100;
    }
    return 0;
  };

  const groupBooksByStatus = () => {
    const grouped: Record<string, any[]> = {};
    books.forEach((book) => {
      const status = book.status || "NONE";
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(book);
    });
    return grouped;
  };

  const groupedBooks = groupBooksByStatus();

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8 mt-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Loading books...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen px-4 py-8 mt-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <p className="text-lg text-red-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 mt-32">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            My Library
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            A collection of books I&apos;ve read, am reading, or plan to read.
          </p>
        </motion.div>

        {STATUS_ORDER.map((status, statusIndex) => {
          const statusBooks = groupedBooks[status] || [];
          if (statusBooks.length === 0) return null;

          return (
            <motion.section
              key={status}
              className="mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: statusIndex * 0.1 }}
            >
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">
                {STATUS_LABELS[status] || status}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {statusBooks.map((book) => {
                  const progressPercentage = calculateProgress(book.progress);
                  return (
                    <motion.div
                      key={book.id}
                      className="flex flex-col items-center"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="relative w-full aspect-[2/3] mb-3 group">
                        <Image
                          src={book.book.cover}
                          alt={book.book.title || "Book cover"}
                          fill
                          className="object-cover rounded shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                        />
                      </div>
                      {status === "IS_READING" && book.progress && (
                        <div className="w-full">
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent-primary transition-all duration-300 ease-out"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {book.book.title && (
                        <p className="text-sm text-center mt-2 text-gray-700 dark:text-gray-300 line-clamp-2">
                          {book.book.title}
                        </p>
                      )}
                      {book.book.authors && book.book.authors.length > 0 && (
                        <p className="text-xs text-center mt-1 text-gray-500 dark:text-gray-400 line-clamp-1">
                          {book.book.authors.map((a: any) => a.name).join(", ")}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          );
        })}

        {books.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600 dark:text-gray-400">
              No books found in your library.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


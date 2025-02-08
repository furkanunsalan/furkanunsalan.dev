"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Spotify from "@/components/NowPlaying";
import SocialNavigator from "@/components/SocialNavigator";
import ToolTabs from "@/components/ToolTabs";
import { tools } from "@/data/tools";
import { getCurrentlyReadingBooks, setAuthToken } from "@/lib/literalClient";
import LiteralLogin from "@/components/LiteralLogin";

export default function Me() {
  const [books, setBooks] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const routes = [
    { name: "Github", url: "https://github.com/furkanunsalan" },
    { name: "Linkedin", url: "https://linkedin.com/in/furkanunsalan" },
    { name: "Mail", url: "mailto:hi@furkanunsalan.dev" },
    { name: "CV", url: "/resume.pdf" },
  ];

  useEffect(() => {
    const token = localStorage.getItem('literalToken');
    if (token) {
      setAuthToken(token);
      setIsAuthenticated(true);
    }

    const fetchBooks = async () => {
      try {
        const booksData = await getCurrentlyReadingBooks();
        setBooks(booksData);
      } catch (error) {
        console.error("Failed to fetch books:", error);
        if ((error as any)?.response?.status === 401) {
          localStorage.removeItem('literalToken');
          setIsAuthenticated(false);
        }
      }
    };

    if (isAuthenticated) {
      fetchBooks();
    }
  }, [isAuthenticated]);

  return (
    <>
      <motion.div
        className="flex flex-col items-center text-center p-4 mt-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="text-3xl font-bold mb-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Hi! I&apos;m{" "}
          <span className="bg-red-500 dark:bg-red-600 text-white p-1 rounded-md">
            Furkan
          </span>
        </motion.h1>
        <motion.p
          className="text-lg mb-4 max-w-xl text-justify"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Dedicated software engineering student with a focus on frontend
          development. Enthusiastic about contributing to open-source projects
          and continually exploring new technologies. Excited to take on
          innovative challenges and grow within the tech industry.
        </motion.p>

        <SocialNavigator routes={routes} />

        <motion.div
          className="w-full max-w-xl text-left mb-4 mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <p className="text-xl font-semibold mb-2 text-center">Currently:</p>
          <ul className="list-none p-0">
            <motion.li
              className="mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <strong>📍 Living In:</strong> Istanbul
            </motion.li>
            <motion.li
              className="mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
            >
              <strong>📐 Working On:</strong>{" "}
              <a className="underline hover:text-accent-primary" href="https://github.com/buildog-dev/buildog">Buildog</a>
            </motion.li>
            <motion.li
              className="mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
              <strong>🍿 Last Watched:</strong> Silo Season 2
            </motion.li>
            <motion.li
              className="mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.4 }}
            >
              <strong>📖 Reading:</strong>
            </motion.li>
          </ul>
        </motion.div>

        {/* Books Section */}
        <motion.div
          className="w-full max-w-xl mx-auto" // Changed width classes to match other sections
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 2 }}
        >
          {!isAuthenticated ? (
            <LiteralLogin 
              onAuthSuccess={() => setIsAuthenticated(true)}
              onAuthError={(error) => setAuthError(error)}
            />
          ) : books.length === 0 ? (
            <p className="text-center">No books found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="p-4"
                >
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-auto max-h-72 object-cover rounded-md mb-4" // Added max-h-72 and changed h-72 to h-auto
                  />
                </div>
              ))}
            </div>
          )}
          {authError && <p className="text-red-500 text-center mt-2">{authError}</p>}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeIn", delay: 1.8 }}
      >
        <ToolTabs tools={tools} />
      </motion.div>
    </>
  );
}
"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import SocialNavigator from "@/components/SocialNavigator";
import ToolTabs from "@/components/ToolTabs";
import { tools } from "@/data/tools";
import { personalInfo } from "@/data/constants";
import LiteralCurrentlyReading from "@/components/LiteralCurrentlyReading";

export default function Me() {
  const routes = [
    { name: "Github", url: "https://github.com/furkanunsalan" },
    { name: "Linkedin", url: "https://linkedin.com/in/furkanunsalan" },
    { name: "Mail", url: "mailto:hi@furkanunsalan.dev" },
    { name: "CV", url: "/resume.pdf" },
  ];

  const [currentlyReading, setCurrentlyReading] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReadingData = async () => {
      try {
        setError(null);
        const response = await fetch("/api/literal");
        const data = await response.json();

        if (response.ok) {
          setCurrentlyReading(data.books || []);
        } else {
          setError(data.error || "Failed to fetch reading data");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch reading data");
      } finally {
        setLoading(false);
      }
    };

    fetchReadingData();
  }, []);

  return (
    <>
      <motion.div
        className="flex flex-col items-center text-center p-4 mt-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="text-3xl font-bold mb-4 select-none"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Hi! I&apos;m{" "}
          <span className="text-black dark:text-white p-1 rounded-md hover:cursor-default underline hover:text-accent-primary hover:dark:text-accent-primary transition-all duration-300">
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
          className="w-full max-w-xl text-left mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <p className="text-xl font-semibold text-left underline mb-4">
            Currently
          </p>
          <ul className="list-none p-0">
            <motion.li
              className="mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <strong>📍 Living In:</strong> {personalInfo.location}
            </motion.li>
            <motion.li
              className="mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
            >
              <strong>📐 Working On:</strong>{" "}
              {/* <a className="underline hover:text-accent-primary" href="https://github.com/buildog-dev/buildog">Buildog</a> */}
              {personalInfo.workingOn}
            </motion.li>
            <motion.li
              className="mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
              <strong>🍿 Last Watched:</strong>{" "}
              {personalInfo.lastWatched.map((item, index) => (
                <span key={item}>
                  {item}
                  {index < personalInfo.lastWatched.length - 1 ? ", " : ""}
                </span>
              ))}
            </motion.li>
            {/* <motion.li

              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.4 }}
            >
              <strong>📖 Reading:</strong>{" "}
              {personalInfo.reading.map((item, index) => (
                <span key={item}>
                  {item}
                  {index < personalInfo.reading.length - 1 ? ", " : ""}
                </span>
              ))}
            </motion.li> */}
            {error && (
              <div className="text-red-500 text-center my-4">{error}</div>
            )}

            <motion.div className="mb-12 mt-0">
              {loading ? (
                <div className="text-center my-4">Loading reading data...</div>
              ) : (
                currentlyReading.length > 0 && (
                  <section className="flex flex-col items-center w-full max-w-xl text-left mb-4 mx-auto">
                    <strong className="mb-4 text-left w-full">
                      📖 Reading:
                    </strong>
                    <LiteralCurrentlyReading books={currentlyReading} />
                  </section>
                )
              )}
            </motion.div>
          </ul>
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

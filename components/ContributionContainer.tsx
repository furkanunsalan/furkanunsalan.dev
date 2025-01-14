"use client";

import type { Contribution } from "@/types";
import { motion } from "framer-motion";

export default function ContributionContainer({ contribution }: { contribution: Contribution }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="mb-6 p-2 border-hover-light dark:border-dark-third border-l-4 pl-2 rounded-lg"
    >
      <div key={contribution.id} className="pb-2">
        <a href={contribution.link} target="blank" className="text-lg font-semibold text-black dark:text-white">{contribution.project_name}</a>
        <p className="mt-1 text-gray-700 dark:text-gray-300">{contribution.description}</p>

        {contribution.tags && contribution.tags.length > 0 && (
          <div className="mt-4 text-center">
            <ul className="mt-2 flex flex-wrap justify-left space-x-2">
              {contribution.tags.map((tag: string, index: number) => (
                <li key={index}>
                  <span className="bg-secondary-light dark:bg-dark-secondary border border-hover-light dark:border-dark-third text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
                    {tag}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}

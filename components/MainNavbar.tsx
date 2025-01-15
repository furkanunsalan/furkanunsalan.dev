"use client";

import Link from "next/link";
import React from "react";
import { motion } from "framer-motion";

const MainNavbar: React.FC<{ routes: string[] }> = ({ routes }) => {
  return (
    <nav className="mt-8 w-full max-w-4xl">
      <ul className="flex flex-wrap justify-center gap-4 md:gap-6">
        {routes.map((route, index) => {
          // Use the route for both href and display text
          const displayText = route === "/" ? "Home" : route.substring(1); // Adjust display text for root route

          return (
            <motion.li
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Link
                href={route}
                className="relative inline-block text-lg p-2 rounded-lg transition-colors duration-300 ease-in-out group"
                id="na-buttons"
                data-umami-event={route}
              >
                {`/${displayText}`}
                <span className="block absolute left-0 bottom-0 w-0 h-0.5 bg-black dark:bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MainNavbar;

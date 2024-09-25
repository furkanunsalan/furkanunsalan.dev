"use client";

import { motion } from "framer-motion";
import Spotify from "@/components/NowPlaying";
import SocialNavigator from "@/components/SocialNavigator";
import ToolTabs from "@/components/ToolTabs";
import { tools } from "@/lib/my-tools";
import { Link } from "lucide-react";

export default function Me() {
  return (
    <>
      <motion.div
        className="flex flex-col items-center text-center p-4 mt-8"
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
          <span className="bg-red-600 dark:bg-red-800 text-white p-1 rounded-md">
            Furkan
          </span>
        </motion.h1>
        <motion.p
          className="text-lg mb-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Student @ Haliç who loves software development and photography.
        </motion.p>

        <SocialNavigator />

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
              <strong>📖 Reading:</strong> Atomic Habits - James Clear
            </motion.li>
            <motion.li
              className="mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
              <strong>📐 Working On:</strong> <a href="https://github.com/buildog-dev/buildog">Buildog</a>
            </motion.li>
            <motion.li
              className="mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.4 }}
            >
              <strong className="mr-2">🎧 Listening:</strong>
              <div className="text-center mt-2">
                <Spotify />
              </div>
            </motion.li>
            <motion.li
              className="mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.6 }}
            >
              <strong>🍿 Watching:</strong> Nothing Currently
            </motion.li>
          </ul>
        </motion.div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeIn", delay: 1.8 }} // Adjust delay to ensure it appears last
      >
        <ToolTabs tools={tools} />
      </motion.div>
    </>
  );
}

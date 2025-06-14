"use client";

import React from "react";
import type { Project } from "@/types";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ProjectContainer({ project }: { project: Project }) {
  const { title, short_description, update, slug } = project;
  const router = useRouter();

  const handleNavigation = () => {
    router.push(`/projects/${slug}`);
  };

  return (
    <motion.div
      className="border border-light-third dark:border-dark-third bg-light-secondary dark:bg-dark-secondary hover:border-accent-primary dark:hover:border-accent-primary w-full p-4 rounded-lg flex justify-between items-start hover:cursor-pointer transition-all duration-300"
      onClick={handleNavigation}
      data-umami-event={slug}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="space-y-2">
        <p className="text-lg font-semibold dark:text-white">{title}</p>
        <p className="text-black dark:text-zinc-400">{short_description}</p>
      </div>
      <div className="text-right dark:text-zinc-400">
        <p>
          {new Date(update).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </p>
      </div>
    </motion.div>
  );
}

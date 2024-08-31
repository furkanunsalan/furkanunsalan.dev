'use client'

import React from "react";
import type { Project } from "@/types";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ProjectContainer({ project }: { project: Project }) {
  const { title, short_description, update, slug } = project;
  const router = useRouter();

  const handleNavigation = () => {
    router.push(`/projects/${slug}`); // Assuming you're using `id` for the slug, you could use a specific slug if available.
  };

  return (
    <motion.div
      className="bg-secondary-light dark:bg-secondary-dark hover:dark:bg-hover-dark hover:bg-hover-light w-5/6 md:w-1/3 p-4 mt-4 rounded-lg flex justify-between items-start hover:cursor-pointer"
      onClick={handleNavigation}
      data-umami-event={slug}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="space-y-2 ">
        <p className="text-lg font-semibold dark:text-white">{title}</p>
        <p className="text-black dark:text-zinc-400">{short_description}</p>
      </div>
      <div className="text-right dark:text-zinc-400">
        <p>{update}</p>
      </div>
    </motion.div>
  );
}

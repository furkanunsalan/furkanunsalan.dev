"use client";

import type { Experience } from "@/types";
import { motion } from "framer-motion";

export default function ExperienceContainer({ work }: { work: Experience }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div key={work.id} className="mb-8 border-b border-secondary-dark pb-4">
        {/* <p className="text-sm opacity-60">{work.type}</p> */}
        <p className="text-sm opacity-60 mt-1">
          {work.start_date} - {work.end_date || "Current"}
        </p>
        <h3 className="text-lg font-semibold">{work.title}</h3>
        <p className="opacity-60 mb-4">
          {work.organization}
        </p>
        <p className="mt-2 mb-4 font-light">{work.comment}</p>
        {work.link && <a href={work.link[1]} className="underline font-extralight hover:text-accent-primary">{work.link[0]}</a>}
      </div>
    </motion.div>
  );
}

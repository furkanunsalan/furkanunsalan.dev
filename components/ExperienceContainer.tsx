"use client";

import type { Work } from "@/types";
import { motion } from "framer-motion";

export default function ExperienceContainer({ work }: { work: Work }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div key={work.id} className="mb-8 border-b border-zinc-800 pb-4">
        {/* <p className="text-sm opacity-60">{work.type}</p> */}
        <h3 className="text-lg font-semibold">{work.title}</h3>
        <p className="opacity-60">{work.organization} - {work.type}</p>
        <p className="text-sm opacity-60 mt-1">
          {work.start_date} - {work.end_date || "Current"}
        </p>
        <p className="mt-2">{work.comment}</p>
      </div>
    </motion.div>
  );
}

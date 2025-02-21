"use client"

import NextImage from "next/image";
import Link from "next/link";
import { useState, MouseEvent } from "react";
import { motion } from "framer-motion";

interface PhotoProps {
  alt_description: string;
  links: {
    html: string;
  };
  urls: {
    raw: string;
  };
}

function Photo({ alt_description, links, urls }: PhotoProps) {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    
    const x = ((clientX - left) / width - 0.5) * 12;
    const y = ((clientY - top) / height - 0.5) * -12;

    setTilt({ rotateX: y, rotateY: x });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  return (
    <motion.figure
      className="relative w-80 p-6 rounded-xl shadow-lg transition-transform duration-500"
      style={{ perspective: "1000px" }}
      animate={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY }}
      transition={{ type: "spring", stiffness: 100, damping: 10 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative flex flex-col items-center rounded-lg bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl pt-4 pb-16">
        <Link href={links.html} target="_blank" className="block">
          {/* Fixed Image Size & Centered */}
          <div className="overflow-hidden rounded-sm w-64 h-48 flex items-center justify-center px-2">
            <NextImage
              src={`${urls.raw}&q=90&w=800`}
              alt={alt_description}
              width={300}
              height={300}
              className="w-full h-full object-cover rounded-lg"
              quality={90}
            />
          </div>
        </Link>
      </div>
    </motion.figure>
  );
}

interface PhotosProps {
  data: PhotoProps[];
}

function Photos({ data }: PhotosProps) {
  return (
    <div className="w-5/6 mb-6 mx-auto pr-3">
      <div className="grid items-center sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 justify-center">
        {data.map((item) => (
          <Photo key={item.alt_description} {...item} />
        ))}
      </div>
    </div>
  );
}

export default Photos;

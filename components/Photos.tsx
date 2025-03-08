"use client"

import NextImage from "next/image";
import Link from "next/link";
import { useState, MouseEvent } from "react";
import { motion } from "framer-motion";
import Masonry from 'react-masonry-css';
import { format } from 'date-fns'; // Import date-fns for date formatting

interface PhotoProps {
  id: string;
  created_at: string;
  alt_description: string;
  slug: string;
  links: {
    html: string;
  };
  urls: {
    raw: string;
  };
}

function Photo({ alt_description, links, urls, created_at, slug }: PhotoProps) {

  console.log(alt_description);
  
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

  const formattedDate = format(new Date(created_at), 'MMM dd, yyyy');

  return (
    <motion.figure
      className="relative w-full p-6 rounded-xl shadow-lg transition-transform duration-500"
      style={{ perspective: "1000px" }}
      animate={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY }}
      transition={{ type: "spring", stiffness: 100, damping: 10 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative flex flex-col items-center rounded-lg photo-container transition-all will-change-transform duration-300 transform hover:scale-105 border border-transparent hover:border-2 hover:border-accent-primary hover:dark:border-accent-primary">
        <Link href={links.html} target="_blank" className="block">
          <div className="overflow-hidden rounded-sm w-full flex items-center justify-center">
            <NextImage
              src={`${urls.raw}&q=90&w=800`}
              alt={slug}
              width={300}
              height={300}
              className="w-full h-full object-cover rounded-lg"
              quality={90}
            />
          </div>
        </Link>
        <div className="absolute bottom-2 select-none left-4 text-yellow-500 bg-black bg-opacity-50 p-1 rounded">
          {formattedDate}
        </div>
      </div>
    </motion.figure>
  );
}

interface PhotosProps {
  data: PhotoProps[];
}

const breakpointColumnsObj = {
  default: 4,
  1100: 3,
  700: 2,
  500: 1
};

function Photos({ data }: PhotosProps) {
  return (
    <div className="w-5/6 mb-6 mx-auto pr-3">
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {data.map((item) => (
          <Photo key={item.id} {...item} />
        ))}
      </Masonry>
    </div>
  );
}

export default Photos;

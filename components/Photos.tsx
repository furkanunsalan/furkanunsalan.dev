"use client";

import NextImage from "next/image";
import Masonry from "react-masonry-css";
import { useState } from "react";
import "./Photos.css";

interface PhotoProps {
  id: string;
  alt_description: string;
  slug: string;
  links: {
    html: string;
  };
  urls: {
    raw: string;
  };
}

function Photo({ slug, urls }: PhotoProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <figure
      data-loaded={loaded}
      className="photo-figure group relative w-full mb-3 overflow-hidden rounded-lg ring-1 ring-transparent hover:ring-accent-primary/60 hover:shadow-[0_0_24px_-12px_rgba(99,102,241,0.6)] transition-[box-shadow] duration-300"
    >
      <NextImage
        src={`${urls.raw}&q=90&w=800`}
        alt={slug}
        width={300}
        height={300}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className="relative z-[1] w-full h-full object-cover photo-img"
        quality={90}
      />
    </figure>
  );
}

interface PhotosProps {
  data: PhotoProps[];
}

const breakpointColumnsObj = {
  default: 4,
  1100: 3,
  700: 2,
  500: 1,
};

function Photos({ data }: PhotosProps) {
  return (
    <div className="w-5/6 mb-6 mx-auto pr-3 animate-fade-in">
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
        style={{ gap: "12px" }}
      >
        {data.map((item) => (
          <Photo key={item.id} {...item} />
        ))}
      </Masonry>
    </div>
  );
}

export default Photos;

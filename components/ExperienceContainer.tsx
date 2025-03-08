"use client";
import { useEffect, useState } from "react";
import type { Experience } from "@/types";
import { motion } from "framer-motion";
import Image from "next/image";
import { slugify } from "markdown-to-jsx";
import { X } from "lucide-react";

export default function ExperienceContainer({ work }: { work: Experience }) {
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    // Function to fetch images
    const fetchImages = async () => {
      try {
        // Create the directory path based on work organization and title
        const dirPath = `/photos/experiences/${slugify(work.organization.replace(/\s+/g, ''))}${slugify(work.title.replace(/\s+/g, ''))}`;
        // In client-side code, we need to fetch the images via an API route
        const response = await fetch(`/api/get-images?path=${encodeURIComponent(dirPath)}`);
        const data = await response.json();
        if (data.images && Array.isArray(data.images)) {
          setImages(data.images);
        }
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };
    
    fetchImages();
  }, [work.organization, work.title]);

  // Function to open the lightbox
  const openLightbox = (img: string) => {
    setSelectedImage(img);
    document.body.style.overflow = 'hidden'; // Prevent scrolling when lightbox is open
  };

  // Function to close the lightbox
  const closeLightbox = () => {
    setSelectedImage(null);
    document.body.style.overflow = ''; // Restore scrolling
  };

  // Close lightbox when Escape key is pressed
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedImage) {
        closeLightbox();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [selectedImage]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div key={work.id} className="mb-8 border-b border-light-secondary dark:border-dark-secondary pb-4">
        <p className="text-sm opacity-60 mt-1">
          {work.start_date} - {work.end_date || "Current"}
        </p>
        <h3 className="text-lg font-semibold">{work.title}</h3>
        <p className="opacity-60 mb-4">
          {work.organization}
        </p>
        <p className="mt-2 mb-4 font-light">{work.comment}</p>
        {work.link && <a href={work.link[1]} className="underline font-extralight hover:text-accent-primary transition-all duration-200">{work.link[0]}</a>}
        
        {/* Image Grid */}
        {images.length > 0 && (
          <div className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {images.map((img, index) => (
                <div 
                  key={index} 
                  className="relative h-32 overflow-hidden rounded cursor-pointer transition-all duration-300 border border-transparent hover:scale-105 hover:border-2 hover:border-accent-primary hover:dark:border-accent-primary hover:shadow-md"
                  onClick={() => openLightbox(img)}
                >
                  <Image
                    src={`/photos/experiences/${slugify(work.organization.replace(/\s+/g, ''))}${slugify(work.title.replace(/\s+/g, ''))}/`+ img}
                    alt={`${work.organization} - ${work.title} image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Lightbox */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <div className="relative max-w-4xl w-full h-full flex items-center justify-center">
              <div className="relative w-full h-auto max-h-[80vh] rounded-lg" onClick={(e) => e.stopPropagation()}>
                <Image
                  src={`/photos/experiences/${slugify(work.organization.replace(/\s+/g, ''))}${slugify(work.title.replace(/\s+/g, ''))}/`+ selectedImage}
                  alt={`${work.organization} - ${work.title} expanded view`}
                  className="object-contain max-h-[80vh] mx-auto rounded-lg"
                  width={1200}
                  height={800}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
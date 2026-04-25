"use client";
import { useState, useEffect } from "react";
import type { Experience } from "@/types";
import Image from "next/image";

export default function ExperienceContainer({
  work,
  isMainRole = false,
  isPreviousRole = false,
  hasPreviousRoles = false,
}: {
  work: Experience;
  isMainRole?: boolean;
  isPreviousRole?: boolean;
  hasPreviousRoles?: boolean;
}) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Function to open the lightbox
  const openLightbox = (img: string) => {
    setSelectedImage(img);
    document.body.style.overflow = "hidden"; // Prevent scrolling when lightbox is open
  };

  // Function to close the lightbox
  const closeLightbox = () => {
    setSelectedImage(null);
    document.body.style.overflow = ""; // Restore scrolling
  };

  // Close lightbox when Escape key is pressed
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedImage) {
        closeLightbox();
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [selectedImage]);

  return (
    <div>
      <div
        key={work.id}
        className={`${
          isPreviousRole ? "mb-4" : "mb-8"
        } ${!isPreviousRole && !hasPreviousRoles ? "border-b border-white/[0.06] pb-6" : ""}`}
      >
        <p className="text-sm text-light-fourth mt-1">
          {work.start_date} - {work.end_date || "Current"}
        </p>
        <h3 className="text-lg font-semibold text-white">{work.title}</h3>
        {!isPreviousRole && (
          <p className="text-light-fourth mb-4">{work.organization}</p>
        )}
        <p className="mt-2 mb-4 font-light whitespace-pre-line text-light-secondary/90">
          {work.comment}
        </p>
        {work.links && work.links.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {work.links.map((l) => (
              <li key={l.url}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-extralight hover:text-accent-primary transition-all duration-200"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}

        {/* Image Grid */}
        {work.images && work.images.length > 0 && (
          <div className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {work.images.map((img, index) => (
                <div
                  key={index}
                  className="relative h-32 overflow-hidden rounded-lg cursor-pointer transition-all duration-300 border border-white/[0.06] hover:scale-[1.02] hover:border-accent-primary/60 hover:shadow-[0_0_24px_-12px_rgba(99,102,241,0.6)]"
                  onClick={() => openLightbox(img)}
                >
                  <Image
                    src={img}
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
            <div className="flex items-center justify-center">
              <div
                className="rounded-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: "inline-block",
                  position: "relative",
                  maxWidth: "90vw",
                  maxHeight: "80vh",
                }}
              >
                <Image
                  src={selectedImage}
                  alt={`${work.organization} - ${work.title} expanded view`}
                  width={1200}
                  height={800}
                  className="rounded-lg"
                  style={{
                    maxWidth: "90vw",
                    maxHeight: "80vh",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

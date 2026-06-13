"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Experience } from "@/types";
import Image from "next/image";
import SmartImage from "@/components/SmartImage";

export default function ExperienceContainer({
  work,
  isPreviousRole = false,
  durationLabel,
}: {
  work: Experience;
  isPreviousRole?: boolean;
  durationLabel?: string;
}) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // Portal target only exists on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
        className={
          isPreviousRole
            ? ""
            : "mb-8 border-b border-white/[0.06] pb-8 md:border-b-0 md:pb-0"
        }
      >
        {isPreviousRole ? (
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-white">{work.title}</h3>
            <p className="text-sm text-light-fourth mt-0.5">
              {work.start_date} - {work.end_date || "Current"}
              {durationLabel ? ` · ${durationLabel}` : ""}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row items-start gap-3">
              {work.logo && (
                <div className="relative mt-1 shrink-0 w-11 h-11 overflow-hidden rounded-lg bg-white/[0.04]">
                  <Image
                    src={work.logo}
                    alt={`${work.organization} logo`}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm text-light-fourth mt-1">
                  {work.start_date} - {work.end_date || "Current"}
                </p>
                <p className="text-light-fourth">{work.organization}</p>
              </div>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">
              {work.title}
            </h3>
          </>
        )}
        <p className="mt-3 mb-4 font-light whitespace-pre-line text-light-secondary/90">
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 stagger">
              {work.images.map((img, index) => (
                <div
                  key={index}
                  className="relative h-32 overflow-hidden rounded-lg cursor-pointer transition-all duration-300 border border-white/[0.06] hover:scale-[1.02] hover:border-accent-primary/60 hover:shadow-[0_0_24px_-12px_rgba(99,102,241,0.6)]"
                  onClick={() => openLightbox(img)}
                >
                  <SmartImage
                    src={img}
                    alt={`${work.organization} - ${work.title} image ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 240px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lightbox — portaled to <body> so a transformed ancestor (the
            animate-* / stagger cards) can't trap position:fixed to its box. */}
        {mounted &&
          selectedImage &&
          createPortal(
            <div
              className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 animate-fade-in"
              onClick={closeLightbox}
            >
              <div className="flex items-center justify-center animate-scale-in">
                <div
                  className="image-skeleton rounded-lg overflow-hidden"
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
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}

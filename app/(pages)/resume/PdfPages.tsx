"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// Worker served via /pdf-worker (a route that streams the vendored file with a
// JS MIME). Static /public/*.mjs 404s under Next's standalone server, and
// bundling via `new URL(import.meta.url)` breaks Terser — this sidesteps both.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker";

// Renders the generated PDF as plain canvas pages — no toolbar, no backdrop,
// no controls. Just the document. Text/annotation layers are off (the CV is
// for viewing/printing, not in-page selection).
export default function PdfPages({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [width, setWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted]);

  return (
    <div ref={ref} className="w-full">
      {mounted && width > 0 && (
        <Document
          file={src}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="py-24 text-center text-sm text-light-fourth">
              Loading…
            </div>
          }
          error={
            <div className="py-24 text-center text-sm text-light-fourth">
              Couldn’t render —{" "}
              <a href={src} className="text-accent-primary underline">
                open the PDF
              </a>
              .
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, i) => (
            <Page
              key={i}
              pageNumber={i + 1}
              width={width}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="mb-6 overflow-hidden rounded-lg shadow-lg ring-1 ring-white/[0.06] last:mb-0"
            />
          ))}
        </Document>
      )}
    </div>
  );
}

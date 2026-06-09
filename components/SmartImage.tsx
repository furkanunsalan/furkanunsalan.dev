"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Lazy, load-gated image. Shows an animated shimmer in the image's box and
// keeps the picture hidden until the browser reports it fully decoded, then
// cross-fades it in. Images stay `loading="lazy"` (next/image default) so
// nothing below the fold fetches until it scrolls near the viewport.
//
// Two shapes:
//   • fill         — drop-in for `<Image fill />`; the parent must be
//                     positioned + clip overflow (as the existing grid tiles
//                     already are). Renders the shimmer as an absolute overlay.
//   • width/height — wraps the image in its own positioned box so the shimmer
//                     has something to cover. Pass `wrapperClassName` to size
//                     that box.
type SmartImageProps = ImageProps & {
  wrapperClassName?: string;
};

export default function SmartImage({
  className,
  wrapperClassName,
  fill,
  onLoad,
  ...props
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement | null>(null);

  // Images already in the browser cache can finish before React attaches the
  // onLoad handler, so check `complete` once on mount as a fallback.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, []);

  const img = (
    <Image
      {...props}
      fill={fill}
      ref={ref}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      className={cn(
        "transition-opacity duration-700 ease-out",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );

  if (fill) {
    return (
      <>
        <span
          aria-hidden
          className={cn(
            "image-shimmer pointer-events-none absolute inset-0 z-0 transition-opacity duration-500",
            loaded && "opacity-0",
          )}
        />
        {img}
      </>
    );
  }

  return (
    <span
      className={cn("relative inline-block overflow-hidden", wrapperClassName)}
    >
      <span
        aria-hidden
        className={cn(
          "image-shimmer pointer-events-none absolute inset-0 z-0 transition-opacity duration-500",
          loaded && "opacity-0",
        )}
      />
      {img}
    </span>
  );
}

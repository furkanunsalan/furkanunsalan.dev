"use client";

import * as React from "react";

// Drop-in replacements for the `next/*` APIs the ported React components relied
// on, so they render as Astro islands with no Next runtime. Components swap
//   import Link from "next/link"            -> import { Link } from "@/components/_compat"
//   import Image from "next/image"          -> import { Image } from "@/components/_compat"
//   import { useRouter } from "next/navigation" -> from "@/components/_compat"
// and the JSX / hook calls stay the same.

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string };
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};

export function Link({
  href,
  children,
  prefetch: _p,
  replace: _r,
  scroll: _s,
  ...rest
}: LinkProps) {
  const h = typeof href === "string" ? href : (href?.pathname ?? "#");
  return (
    <a href={h} {...rest}>
      {children}
    </a>
  );
}

export type ImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  src: string | { src: string };
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  sizes?: string;
};
type ImgProps = ImageProps;

export const Image = React.forwardRef<HTMLImageElement, ImgProps>(
  function Image(
    {
      src,
      alt = "",
      fill,
      priority,
      quality: _q,
      sizes: _sz,
      loading,
      style,
      ...rest
    },
    ref,
  ) {
    const s = typeof src === "string" ? src : src?.src;
    const fillStyle: React.CSSProperties = fill
      ? {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          ...(style || {}),
        }
      : style || {};
    return (
      <img
        ref={ref}
        src={s}
        alt={alt}
        loading={priority ? "eager" : loading || "lazy"}
        style={fillStyle}
        {...rest}
      />
    );
  },
);

// Default export too, for `import Image from ...` / `import Link from ...`
// call sites that keep the default form.
export default Image;

type Router = {
  push: (url: string) => void;
  replace: (url: string) => void;
  refresh: () => void;
  back: () => void;
  forward: () => void;
  prefetch: (url?: string) => void;
};

export function useRouter(): Router {
  return {
    push: (url) => {
      window.location.href = url;
    },
    replace: (url) => {
      window.location.replace(url);
    },
    refresh: () => {
      window.location.reload();
    },
    back: () => {
      window.history.back();
    },
    forward: () => {
      window.history.forward();
    },
    prefetch: () => {},
  };
}

export function usePathname(): string {
  const [pathname, setPathname] = React.useState<string>(
    typeof window !== "undefined" ? window.location.pathname : "/",
  );
  React.useEffect(() => {
    const on = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return pathname;
}

export function useSearchParams(): URLSearchParams {
  const [params, setParams] = React.useState<URLSearchParams>(
    new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    ),
  );
  React.useEffect(() => {
    const on = () => setParams(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return params;
}

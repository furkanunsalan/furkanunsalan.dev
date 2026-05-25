"use client";

import { usePathname } from "next/navigation";
import { Eye } from "lucide-react";

// Maps an admin path to its corresponding public-site URL. Returns null when
// there is no public counterpart (e.g. /admin/posts/new before the post has a
// slug) — the button is then hidden.
function publicUrlFor(pathname: string): string | null {
  // Posts → Writing
  const post = pathname.match(/^\/admin\/posts(?:\/(?!new)([^/]+))?\/?$/);
  if (post) return post[1] ? `/writing/${post[1]}` : "/writing";

  // Thoughts → /writing (merged feed; deep-link via #t-<id>)
  const thought = pathname.match(/^\/admin\/thoughts(?:\/(?!new)([^/]+))?\/?$/);
  if (thought) return thought[1] ? `/writing#t-${thought[1]}` : "/writing";

  // Custom projects → /projects
  const project = pathname.match(/^\/admin\/projects(?:\/(?!new)([^/]+))?\/?$/);
  if (project) return project[1] ? `/projects/${project[1]}` : "/projects";

  // Experiences → /experience (no per-row public page)
  if (pathname.startsWith("/admin/experiences")) return "/experience";

  // Tools live on the home page (no dedicated route)
  if (pathname.startsWith("/admin/tools")) return "/";

  // Places → /places (no per-row public page)
  if (pathname.startsWith("/admin/places")) return "/places";

  return null;
}

export default function ViewLink() {
  const pathname = usePathname() || "";
  const href = publicUrlFor(pathname);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-light-secondary hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-colors"
      title="Open public page in a new tab"
    >
      <Eye className="w-3.5 h-3.5" />
      <span>View</span>
    </a>
  );
}

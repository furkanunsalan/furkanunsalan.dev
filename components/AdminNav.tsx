"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PenLine,
  FolderGit2,
  Briefcase,
  Wrench,
  MapPin,
  Settings,
  Github,
  LayoutDashboard,
  List,
} from "lucide-react";

const ICON = "w-4 h-4";

const SECTIONS: {
  label: string;
  href: string;
  Icon: typeof Home;
  group?: string;
}[] = [
  { label: "Dashboard", href: "/admin", Icon: LayoutDashboard },
  { label: "Posts", href: "/admin/posts", Icon: PenLine, group: "Content" },
  {
    label: "Projects",
    href: "/admin/projects",
    Icon: FolderGit2,
    group: "Content",
  },
  {
    label: "Experiences",
    href: "/admin/experiences",
    Icon: Briefcase,
    group: "Content",
  },
  { label: "Tools", href: "/admin/tools", Icon: Wrench, group: "Content" },
  { label: "Places", href: "/admin/places", Icon: MapPin, group: "Content" },
  {
    label: "Home page",
    href: "/admin/settings/home",
    Icon: Settings,
    group: "Settings",
  },
  {
    label: "Place lists",
    href: "/admin/settings/place-lists",
    Icon: List,
    group: "Settings",
  },
  {
    label: "GitHub repos",
    href: "/admin/settings/github",
    Icon: Github,
    group: "Settings",
  },
];

export default function AdminNav() {
  const pathname = usePathname() || "";

  let lastGroup: string | undefined;
  return (
    <nav className="text-sm">
      <ul className="space-y-0.5">
        {SECTIONS.map((s) => {
          const isActive =
            s.href === "/admin"
              ? pathname === "/admin"
              : pathname === s.href || pathname.startsWith(s.href + "/");
          const showGroup = s.group && s.group !== lastGroup;
          lastGroup = s.group;
          return (
            <li key={s.href}>
              {showGroup && (
                <div className="mt-4 mb-1 px-2 text-[10px] uppercase tracking-widest text-light-fourth/70">
                  {s.group}
                </div>
              )}
              <Link
                href={s.href}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                  isActive
                    ? "bg-accent-primary/12 text-accent-primary ring-1 ring-accent-primary/30"
                    : "text-light-secondary hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <s.Icon className={ICON} />
                <span>{s.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

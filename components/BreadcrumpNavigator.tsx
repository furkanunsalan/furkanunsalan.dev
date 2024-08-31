"use client"; // Mark this file as a Client Component

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Helper function to convert a slugified string into title case
const toTitleCase = (str: string) => {
  return str
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function BreadcrumbNavigator() {
  const pathname = usePathname(); // Get the current pathname
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  // Split the pathname into segments
  const pathSegments = pathname?.split("/").filter((segment) => segment) || [];

  // Define your main routes
  const mainRoutes = [
    { name: "Home", href: "/" },
    { name: "Me", href: "/me" },
    { name: "Experience", href: "/experience" },
    { name: "Projects", href: "/projects" },
    { name: "Photos", href: "/photos" },
    { name: "Blog", href: "/blog" },
  ];

  // Determine the href and name of the latest breadcrumb item
  const latestBreadcrumbHref = "/" + pathSegments.join("/");
  const latestBreadcrumbName =
    pathSegments.length > 0 ? toTitleCase(pathSegments[pathSegments.length - 1]) : "Home";

  // Get the active route from the pathSegments
  const activeRoute = `/${pathSegments.join("/")}`;

  // Filter out the active route from the mainRoutes
  const filteredRoutes = mainRoutes.filter(
    (route) => route.href !== activeRoute && route.href !== "/"
  );

  return (
    <div className="relative flex justify-center mt-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/"
              className={
                pathname === "/" ? "text-green-500 text-xl" : "text-xl"
              }
            >
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <Slash />
          </BreadcrumbSeparator>
          {pathSegments.slice(0, -1).map((segment, index) => {
            const href = "/" + pathSegments.slice(0, index + 1).join("/");
            const isActive = pathname === href; // Check if the current segment is the active route
            return (
              <React.Fragment key={href}>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href={href}
                    className={isActive ? "text-green-700 text-xl" : "text-xl"}
                  >
                    {toTitleCase(segment)} {/* Convert segment to title case */}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <Slash />
                </BreadcrumbSeparator>
              </React.Fragment>
            );
          })}
          {/* Latest Breadcrumb Item as Dropdown Trigger */}
          {pathSegments.length > 0 && (
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="text-xl cursor-pointer text-green-500 hover:text-green-300"
                  onClick={() => setDropdownOpen(!isDropdownOpen)}
                >
                  {latestBreadcrumbName}
                </DropdownMenuTrigger>
                {isDropdownOpen && (
                  <DropdownMenuContent className="absolute left-0 mt-2 w-48 bg-white dark:bg-zinc-800 shadow-lg rounded-md border border-zinc-200 dark:border-zinc-700">
                    {filteredRoutes.map((route) => (
                      <DropdownMenuItem
                        key={route.href}
                        onClick={() => setDropdownOpen(false)}
                      >
                        <a
                          href={route.href}
                          className="rounded-md block px-4 py-2 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors duration-200"
                        >
                          {route.name}
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

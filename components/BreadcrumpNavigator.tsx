"use client"; // Mark this file as a Client Component

import React from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash } from "lucide-react";

export default function BreadcrumbNavigator() {
  const pathname = usePathname(); // Get the current pathname

  // Split the pathname into segments
  const pathSegments = pathname?.split("/").filter((segment) => segment) || [];

  return (
    <div className="flex justify-center mt-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className={pathname === "/" ? "text-green-500" : ""}>
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <Slash />
          </BreadcrumbSeparator>
          {pathSegments.map((segment, index) => {
            const href = "/" + pathSegments.slice(0, index + 1).join("/");
            const isActive = pathname === href; // Check if the current segment is the active route
            return (
              <React.Fragment key={href}>
                <BreadcrumbItem>
                  <BreadcrumbLink href={href} className={isActive ? "text-green-700" : ""}>
                    {segment.charAt(0).toUpperCase() + segment.slice(1)}{" "}
                    {/* Capitalize the first letter */}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {index < pathSegments.length - 1 && (
                  <BreadcrumbSeparator>
                    <Slash />
                  </BreadcrumbSeparator>
                )}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

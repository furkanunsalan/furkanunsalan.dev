import { Routes } from "@/types";
import Link from "next/link";
import React from "react";

export default function SocialNavigator({ routes }: { routes: Routes }) {
  return (
    <div className="flex justify-center space-x-4 mb-8 select-none">
      {routes.map((route, index) => (
        <React.Fragment key={route.name}>
          <Link
            href={route.url}
            target="_blank"
            rel="noopener noreferrer"
            data-umami-event={route.name}
          >
            <span className="hover:underline hover:text-accent-primary transition-all duration-200">
              {route.name}
            </span>
          </Link>
          {index < routes.length - 1 && <span>/</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure theme is rendered only on the client side
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="p-2 rounded-md focus:outline-none transition-colors duration-300 ease-in-out"
    >
      {theme === "light" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          className="group-hover:stroke-black group-hover:dark:stroke-white transition-colors duration-300 ease-in-out"
        >
          {" "}
          <circle cx="12" cy="12" r="5"></circle>{" "}
          <line x1="12" y1="1" x2="12" y2="3"></line>{" "}
          <line x1="12" y1="21" x2="12" y2="23"></line>{" "}
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>{" "}
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>{" "}
          <line x1="1" y1="12" x2="3" y2="12"></line>{" "}
          <line x1="21" y1="12" x2="23" y2="12"></line>{" "}
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>{" "}
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>{" "}
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          className="group-hover:stroke-black group-hover:dark:stroke-white transition-colors duration-300 ease-in-out"
        >
          {" "}
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>{" "}
        </svg>
      )}
    </button>
  );
};

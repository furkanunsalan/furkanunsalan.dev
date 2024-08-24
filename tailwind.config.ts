import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // Enables dark mode by toggling 'dark' class on the root element
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        'primary-dark': '#1f1f1f', // primary background and some hovers on /me
        'secondary-dark': '#3F3F46', // dark theme accent color - tailwind zinc-700
        'hover-dark': '#52525B', // dark theme main hover color - tailwind zin 600
        'primary-light': '#f5f5f4', // primary background and some hovers on /me
        'secondary-light': '#d4d4d8', // light theme accent color tailwind zinc-300
        'hover-light':'#e4e4e7' // light theme main hover color - tailwind zinc-200
        // Add one accent text color for what section of products, update date on project page etc.
      },
    },
  },
  plugins: [],
};

export default config;

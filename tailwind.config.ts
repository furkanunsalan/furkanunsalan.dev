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
      // You can add more theme-specific styles here if needed.
    },
  },
  plugins: [],
};

export default config;

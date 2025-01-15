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
        // DARK
        'dark-primary': '#1f1f1f', // custom
        'dark-secondary': '#27272A', // zinc-800
        'dark-third': '#3F3F46',  // zinc-700
        'dark-fourth': '#5252B', // zinc-600
        // LIGHT
        'light-primary': '#e4e4e7', // zinc-200
        'light-secondary': '#d4d4d4', // zinc-300
        'light-third':'#bbbdc1', // custom; a darker shade of zinc-300, but much lighter than zinc-400
        'light-fourth': '71717a', // zinc-500
        // ACCENT
        'accent-primary': '#6366F1' // indigo-500 // change also line 23 in global.css
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    // ... other plugins
  ],
};

export default config;

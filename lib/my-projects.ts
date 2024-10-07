import type { Project } from "@/types";

export const projects: Project[] = [
  {
    id: 1,
    slug: "travel-map",
    image: "/photos/projects/travel-map.png",
    title: "Travel Map",
    short_description:
      "A personal project for tracking and visualizing travel destinations using an interactive map, with features for bookmarking and rating places. ",
    description:
      "The Travel Map Website is a tool for tracking and visualizing travel destinations on an interactive map. Users can manage lists of places to visit, relax, or hang out, with custom markers and popups for each location. The website features a rating system, dynamic tabs for switching between lists, and a responsive design that adapts to mobile devices. Built with React, Tailwind CSS, MapTiler, and Firebase, the project offers a modern, fast, and scalable solution for organizing travel plans. Deployment is handled by Vercel, and Framer is used for smooth animations. Setup is straightforward, with instructions to clone the repository, install dependencies, and configure environment variables.e",
    link: "https://map.furkanunsalan.dev",
    github: "https://github.com/furkanunsalan/TravelMap",
    update: "06/10/2024",
  },
  {
    id: 2,
    slug: "golden-mind",
    image: "/photos/projects/golden-mind.png",
    title: "Golden Mind",
    short_description:
      "GoldenMind is a project developed to address issues like bullying and psychological support for students. It offers innovative tools to understand and solve these challenges using surveys, data analysis, and AI.",
    description:
      "The GoldenMind Project was developed as part of the 2024 Teknofest Psychology Technological Applications competition to tackle issues like bullying and the need for psychological support in schools. Over 8 months of development, GoldenMind implemented a series of innovative tools to gather and analyze student feedback, focusing on mental health and well-being. The project includes a mobile app compatible with both Android and iOS for interacting with students through brief surveys, a React-based web platform for centralized management and data visualization, and the GoldenAI tool that utilizes fine-tuned machine learning models for detailed personal, class, and school-level analysis. Despite the project's initial success and high evaluation, it did not advance past the competition&apos;s final stage but remains a significant step towards creating technology-driven psychological support systems in schools. GoldenMind is open to community contributions to further enhance its capabilities and impact.",
    link: "https://goldenmind.vercel.app",
    update: "23/07/2024",
  },
];

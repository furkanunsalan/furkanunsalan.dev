import type { Project } from "@/types";

export const projects: Project[] = [
  {
    id: 1,
    slug: "travel-map",
    image: "/photos/projects/travel-map.png",
    title: "Travel Map",
    short_description: "A personal project for tracking and visualizing travel destinations using an interactive map, with features for bookmarking and rating places. ",
    description: "The Travel Map Website is a tool for tracking and visualizing travel destinations on an interactive map. Users can manage lists of places to visit, relax, or hang out, with custom markers and popups for each location. The website features a rating system, dynamic tabs for switching between lists, and a responsive design that adapts to mobile devices. Built with React, Tailwind CSS, MapTiler, and Firebase, the project offers a modern, fast, and scalable solution for organizing travel plans. Deployment is handled by Vercel, and Framer is used for smooth animations. Setup is straightforward, with instructions to clone the repository, install dependencies, and configure environment variables.e",
    link: "https://map.furkanunsalan.dev",
    github: "https://github.com/furkanunsalan/TravelMap",
    update: "16-08-2024",
  },
  {
    id: 2,
    slug: "project-two",
    title: "Project Two",
    short_description: "Short description of project two",
    description: "Detailed description of project two",
    update: "2025-06-13",
  }
];

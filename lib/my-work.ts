import type { Work } from "@/types";
import { Certificate } from "@/types";

export const works: Work[] = [
  {
    id: 3,
    organization: "Open Source",
    title: "Contributor",
    start_date: "Sep 2024",
    comment: "I started contributing to open-source projects with local translations, but now I'm taking part in various projects, including web apps and other translations.",
    link: ["Check out all my contributions.", "/open-source"]
  },
  {
    id: 2,
    organization: "Google Developer Groups on Campus Haliç",
    title: "Vice President",
    start_date: "Aug 2024",
    comment: "I help organize workshops, networking events and take part in project teams as a guide and help others. I work with industry professionals to bring valuable insights to our members and promote collaboration among students passionate about technology.",
    achievements: ["Team Leading", "Event Managament"],
  },
  {
    id: 1,
    organization: "Google Developer Groups on Campus Haliç",
    title: "Project Team Core Member",
    start_date: "Oct 2023",
    end_date: "Aug 2024",
    comment:
      "As a core member of the Project Team at the Google Developer Student Club (GDSC) at Haliç, I actively contributed to the development and implementation of innovative tech projects. My role involved collaborating with fellow team members to design, develop, and deploy applications that address real-world problems. One of the notable projects we worked on was GoldenMind, which is highlighted in the Projects section. This experience enhanced my skills in project management, teamwork, and technical problem-solving, while also allowing me to contribute to the tech community on campus.",
    achievements: ["Team Managaments", "React", "Firebase"],
  },
];

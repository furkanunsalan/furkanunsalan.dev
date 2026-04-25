"use client";

import { Github, Linkedin, Mail, FileText, Rss } from "lucide-react";
import { FaMedium } from "react-icons/fa";
import Time from "@/components/Time";

const socials = [
  { name: "Github", url: "https://github.com/furkanunsalan", icon: Github },
  {
    name: "Linkedin",
    url: "https://linkedin.com/in/furkanunsalan",
    icon: Linkedin,
  },
  { name: "Mail", url: "mailto:hi@furkanunsalan.dev", icon: Mail },
  { name: "CV", url: "/resume.pdf", icon: FileText },
  {
    name: "Medium",
    url: "https://medium.com/@furkanunsalan",
    icon: FaMedium,
  },
  { name: "RSS", url: "/rss.xml", icon: Rss },
];

export default function HomeIntro() {
  return (
    <div className="flex flex-col items-start text-left mt-24 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="w-full flex items-start justify-between mb-3 select-none">
        <h1 className="text-xl font-semibold">Furkan Ünsalan</h1>
        <div className="flex flex-col items-end">
          <div className="text-sm text-light-fourth tabular-nums">
            <Time location="Europe/Istanbul" shortName="IST" />
          </div>
          <a
            href="/pgp.asc"
            className="text-[11px] font-mono text-light-fourth/70 hover:text-accent-primary transition-colors duration-200"
            title="Download PGP public key"
            data-umami-event="PGP key"
          >
            PGP A728E9CA9578CBA7
          </a>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        {socials.map(({ name, url, icon: Icon }) => (
          <a
            key={name}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={name}
            title={name}
            data-umami-event={name}
            className="text-white/40 hover:text-accent-primary transition-colors duration-200"
          >
            <Icon className="w-4 h-4" />
          </a>
        ))}
      </div>

      <p className="text-base mb-4 text-justify">
        Dedicated software engineering student with a focus on full-stack web
        development and special love for communities. Enthusiastic about
        creating and contributing to open-source projects while continually
        exploring and learning new technologies. Excited to take on innovative
        challenges and grow within the tech industry.
      </p>
    </div>
  );
}

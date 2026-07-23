import {
  Github,
  Linkedin,
  Mail,
  FileText,
  Rss,
  Youtube,
  Instagram,
  Globe,
} from "lucide-react";
import { FaMedium } from "react-icons/fa";
import { FaXTwitter, FaMastodon, FaBluesky } from "react-icons/fa6";
import type { HomeSocialIcon } from "@/lib/content";

const ICONS: Record<
  HomeSocialIcon,
  React.ComponentType<{ className?: string }>
> = {
  github: Github,
  linkedin: Linkedin,
  mail: Mail,
  cv: FileText,
  medium: FaMedium,
  rss: Rss,
  x: FaXTwitter,
  youtube: Youtube,
  instagram: Instagram,
  mastodon: FaMastodon,
  bluesky: FaBluesky,
  globe: Globe,
};

export function HomeSocialLink({
  social,
}: {
  social: { name: string; url: string; icon: HomeSocialIcon };
}) {
  const Icon = ICONS[social.icon] ?? Globe;
  const external = /^https?:\/\//.test(social.url);
  return (
    <a
      href={social.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={social.name}
      title={social.name}
      className="text-white/40 hover:text-accent-primary hover:-translate-y-0.5 transition-all duration-200"
    >
      <Icon className="w-4 h-4" />
    </a>
  );
}

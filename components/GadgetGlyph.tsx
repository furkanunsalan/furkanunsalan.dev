// Custom blueprint-style sketch library for gadgets. Each gadget stores an
// `icon` key that points at one of these sketches; the admin picks from the
// palette (GADGET_SKETCHES). When a row has no icon, we fall back to a sensible
// default derived from its `what` label. Adding a new device = adding one entry
// here (half-bespoke: a growing curated set, not one drawing per gadget).

import type { ReactNode } from "react";

const SHAPES: Record<string, ReactNode> = {
  phone: (
    <>
      <rect x="17" y="6" width="14" height="32" rx="3" />
      <line x1="21" y1="10" x2="27" y2="10" />
      <line x1="22.5" y1="34" x2="25.5" y2="34" />
    </>
  ),
  tablet: (
    <>
      <rect x="14" y="7" width="20" height="30" rx="2.5" />
      <line x1="22.5" y1="33" x2="25.5" y2="33" />
    </>
  ),
  laptop: (
    <>
      <rect x="13" y="10" width="22" height="15" rx="1.5" />
      <path d="M9 30 l4 -5 h22 l4 5 z" />
      <line x1="20.5" y1="30" x2="27.5" y2="30" />
    </>
  ),
  monitor: (
    <>
      <rect x="9" y="8" width="30" height="19" rx="1.5" />
      <line x1="24" y1="27" x2="24" y2="33" />
      <line x1="17" y1="33" x2="31" y2="33" />
    </>
  ),
  tv: (
    <>
      <rect x="8" y="9" width="32" height="20" rx="1.5" />
      <line x1="24" y1="29" x2="24" y2="34" />
      <line x1="18" y1="34" x2="30" y2="34" />
    </>
  ),
  keyboard: (
    <>
      <rect x="7" y="15" width="34" height="16" rx="2" />
      <line x1="11" y1="20" x2="13.5" y2="20" />
      <line x1="16.5" y1="20" x2="19" y2="20" />
      <line x1="22" y1="20" x2="24.5" y2="20" />
      <line x1="27.5" y1="20" x2="30" y2="20" />
      <line x1="33" y1="20" x2="35.5" y2="20" />
      <line x1="15" y1="26" x2="33" y2="26" />
    </>
  ),
  mouse: (
    <>
      <rect x="17" y="9" width="14" height="26" rx="7" />
      <line x1="24" y1="10" x2="24" y2="19" />
      <line x1="24" y1="13" x2="24" y2="16.5" />
    </>
  ),
  headphones: (
    <>
      <path d="M13 25 v-3 a11 11 0 0 1 22 0 v3" />
      <rect x="10.5" y="24" width="6" height="11" rx="2.5" />
      <rect x="31.5" y="24" width="6" height="11" rx="2.5" />
    </>
  ),
  earphones: (
    <>
      <rect x="16" y="14" width="16" height="16" rx="4" />
      <line x1="16" y1="20" x2="32" y2="20" />
      <circle cx="21" cy="25" r="1" />
      <circle cx="27" cy="25" r="1" />
    </>
  ),
  speaker: (
    <>
      <rect x="16" y="7" width="16" height="30" rx="2.5" />
      <circle cx="24" cy="15" r="2.5" />
      <circle cx="24" cy="27" r="4.5" />
    </>
  ),
  microphone: (
    <>
      <rect x="20" y="8" width="8" height="15" rx="4" />
      <path d="M16 20 a8 8 0 0 0 16 0" />
      <line x1="24" y1="28" x2="24" y2="34" />
      <line x1="20" y1="34" x2="28" y2="34" />
    </>
  ),
  watch: (
    <>
      <rect x="18" y="15" width="12" height="14" rx="3" />
      <path d="M20.5 15 l1 -6 h5 l1 6" />
      <path d="M20.5 29 l1 6 h5 l1 -6" />
      <line x1="30" y1="20" x2="32" y2="20" />
    </>
  ),
  watchanalog: (
    <>
      <circle cx="24" cy="22" r="9" />
      <path d="M20 13.5 l1 -5.5 h6 l1 5.5" />
      <path d="M20 30.5 l1 5.5 h6 l1 -5.5" />
      <line x1="33" y1="20.5" x2="35" y2="19.5" />
      <line x1="24" y1="22" x2="24" y2="16.5" />
      <line x1="24" y1="22" x2="27.5" y2="24" />
      <circle cx="24" cy="22" r="0.9" />
      <line x1="24" y1="14.5" x2="24" y2="15.5" />
      <line x1="31.5" y1="22" x2="30.5" y2="22" />
      <line x1="24" y1="29.5" x2="24" y2="28.5" />
      <line x1="16.5" y1="22" x2="17.5" y2="22" />
    </>
  ),
  camera: (
    <>
      <rect x="11" y="13" width="26" height="18" rx="2" />
      <circle cx="24" cy="22" r="5.5" />
      <circle cx="24" cy="22" r="2" />
      <path d="M18 13 l1.5 -3 h5 l1.5 3" />
      <circle cx="32" cy="17" r="0.7" />
    </>
  ),
  actioncam: (
    <>
      <rect x="15" y="13" width="18" height="18" rx="3" />
      <circle cx="24" cy="22" r="5" />
      <circle cx="24" cy="22" r="2" />
      <rect x="27.5" y="15" width="3" height="2" rx="0.5" />
    </>
  ),
  drone: (
    <>
      <circle cx="14" cy="14" r="4" />
      <circle cx="34" cy="14" r="4" />
      <circle cx="14" cy="30" r="4" />
      <circle cx="34" cy="30" r="4" />
      <rect x="20" y="18" width="8" height="8" rx="2" />
      <line x1="17" y1="17" x2="21" y2="21" />
      <line x1="31" y1="17" x2="27" y2="21" />
      <line x1="17" y1="27" x2="21" y2="23" />
      <line x1="31" y1="27" x2="27" y2="23" />
    </>
  ),
  controller: (
    <>
      <rect x="13" y="17" width="22" height="11" rx="5.5" />
      <line x1="18" y1="20.5" x2="18" y2="24.5" />
      <line x1="16" y1="22.5" x2="20" y2="22.5" />
      <circle cx="29" cy="21" r="1.2" />
      <circle cx="31.5" cy="24" r="1.2" />
    </>
  ),
  ereader: (
    <>
      <rect x="15" y="6" width="18" height="31" rx="2" />
      <line x1="19" y1="13" x2="29" y2="13" />
      <line x1="19" y1="17" x2="29" y2="17" />
      <line x1="19" y1="21" x2="29" y2="21" />
      <line x1="19" y1="25" x2="25" y2="25" />
    </>
  ),
  backpack: (
    <>
      <path d="M17 15 q7 -9 14 0 v15 a3 3 0 0 1 -3 3 h-8 a3 3 0 0 1 -3 -3 z" />
      <path d="M21 33 v-9 h6 v9" />
      <line x1="21" y1="27" x2="27" y2="27" />
      <path d="M20 16 q4 -3 8 0" />
    </>
  ),
  glasses: (
    <>
      <circle cx="16" cy="24" r="5" />
      <circle cx="32" cy="24" r="5" />
      <line x1="21" y1="23" x2="27" y2="23" />
      <line x1="11" y1="22" x2="8" y2="20" />
      <line x1="37" y1="22" x2="40" y2="20" />
    </>
  ),
  stylus: (
    <>
      <path d="M15 33 l2 -6 l13 -13 l4 4 l-13 13 z" />
      <line x1="28" y1="16" x2="32" y2="20" />
      <line x1="15" y1="33" x2="18.5" y2="31.5" />
    </>
  ),
  drive: (
    <>
      <rect x="12" y="14" width="24" height="16" rx="2" />
      <circle cx="30" cy="22" r="1" />
      <line x1="16" y1="18" x2="16" y2="26" />
    </>
  ),
  router: (
    <>
      <rect x="12" y="24" width="24" height="8" rx="2" />
      <circle cx="17" cy="28" r="1" />
      <line x1="24" y1="24" x2="24" y2="18" />
      <path d="M20 15 a6 6 0 0 1 8 0" />
      <path d="M22 18 a3 3 0 0 1 4 0" />
    </>
  ),
  chair: (
    <>
      <path d="M18 8 v14 h11" />
      <line x1="24" y1="22" x2="24" y2="30" />
      <path d="M18 34 h12" />
      <line x1="24" y1="30" x2="19.5" y2="34" />
      <line x1="24" y1="30" x2="28.5" y2="34" />
    </>
  ),
  desk: (
    <>
      <rect x="10" y="14" width="28" height="3" rx="0.5" />
      <line x1="14" y1="17" x2="14" y2="33" />
      <line x1="34" y1="17" x2="34" y2="33" />
      <line x1="14" y1="24" x2="16" y2="24" />
      <line x1="34" y1="24" x2="32" y2="24" />
    </>
  ),
  _fallback: (
    <>
      <rect x="12" y="12" width="24" height="20" rx="2" />
      <line x1="12" y1="19" x2="36" y2="19" />
    </>
  ),
};

// Palette the admin picks from (ordered, with display labels).
export const GADGET_SKETCHES: { key: string; label: string }[] = [
  { key: "phone", label: "Phone" },
  { key: "tablet", label: "Tablet" },
  { key: "laptop", label: "Laptop" },
  { key: "monitor", label: "Monitor" },
  { key: "tv", label: "TV" },
  { key: "keyboard", label: "Keyboard" },
  { key: "mouse", label: "Mouse" },
  { key: "headphones", label: "Headphones" },
  { key: "earphones", label: "Earbuds" },
  { key: "speaker", label: "Speaker" },
  { key: "microphone", label: "Microphone" },
  { key: "watch", label: "Watch" },
  { key: "watchanalog", label: "Analog watch" },
  { key: "camera", label: "Camera" },
  { key: "actioncam", label: "Action cam" },
  { key: "drone", label: "Drone" },
  { key: "controller", label: "Controller" },
  { key: "ereader", label: "E-reader" },
  { key: "backpack", label: "Backpack" },
  { key: "glasses", label: "Glasses" },
  { key: "stylus", label: "Stylus" },
  { key: "drive", label: "Drive" },
  { key: "router", label: "Router" },
  { key: "chair", label: "Chair" },
  { key: "desk", label: "Desk" },
];

// Fallback: derive a sketch from the free-text `what` when no icon is set.
const WHAT_DEFAULTS: Record<string, string> = {
  smartphone: "phone",
  ipad: "tablet",
  computer: "laptop",
  display: "monitor",
  television: "tv",
  earbuds: "earphones",
  airpods: "earphones",
  smartwatch: "watch",
  dslr: "camera",
  gopro: "actioncam",
  gamepad: "controller",
  gaming: "controller",
  console: "controller",
  ebook: "ereader",
  kindle: "ereader",
  bag: "backpack",
  mic: "microphone",
  pen: "stylus",
  ssd: "drive",
  hdd: "drive",
  harddrive: "drive",
  wifi: "router",
  modem: "router",
};

export function resolveSketchKey(
  icon: string | null | undefined,
  what: string,
): string {
  if (icon && SHAPES[icon]) return icon;
  const compact = what
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "");
  if (SHAPES[compact]) return compact;
  if (WHAT_DEFAULTS[compact]) return WHAT_DEFAULTS[compact];
  return "_fallback";
}

export default function GadgetGlyph({
  what = "",
  icon,
  className,
}: {
  what?: string;
  icon?: string | null;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 44"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {SHAPES[resolveSketchKey(icon, what)]}
    </svg>
  );
}

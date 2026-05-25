// Small shared input cleaners used across the admin route handlers.

import type { ExperienceLink } from "@/db/schema";

export function cleanLinks(raw: unknown): ExperienceLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (l): l is { label?: string; url?: string } =>
        !!l && typeof l === "object",
    )
    .filter((l) => typeof l.url === "string" && l.url.length > 0)
    .map((l) => ({ label: String(l.label || ""), url: String(l.url) }));
}

export function cleanStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.length > 0);
}

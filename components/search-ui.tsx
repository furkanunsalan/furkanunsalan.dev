import type React from "react";
import type { HitKind } from "@/lib/search-query";

export const KIND_LABEL: Record<HitKind, string> = {
  post: "POST",
  project: "PROJECT",
  repo: "REPO",
  place: "PLACE",
  tool: "TOOL",
  experience: "EXPERIENCE",
  thought: "THOUGHT",
};

const OPERATORS = new Set(["or", "and"]);

/** Browser-side mirror of the server's highlight terms — quotes and
 *  -exclusions stripped, boolean operators dropped. */
export function queryTerms(raw: string): string[] {
  const tokens = (raw || "").trim().match(/"[^"]*"?|\S+/g) ?? [];
  return tokens
    .map((t) => t.replace(/^-/, "").replace(/"/g, "").trim())
    .filter((t) => t.length > 1 && !OPERATORS.has(t.toLowerCase()));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wrap every term occurrence in <mark>. Terms come from user input, so they're
 *  escaped before they reach the RegExp. */
export function highlightTerms(text: string, terms: string[]): React.ReactNode {
  if (!text || terms.length === 0) return text;

  const pattern = terms
    .map(escapeRegExp)
    .sort((a, b) => b.length - a.length)
    .join("|");
  if (!pattern) return text;

  const parts = text.split(new RegExp(`(${pattern})`, "gi"));
  const lowered = new Set(terms.map((t) => t.toLowerCase()));

  return parts.map((part, i) =>
    lowered.has(part.toLowerCase()) ? (
      <mark key={i} className="bg-transparent text-white font-medium">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

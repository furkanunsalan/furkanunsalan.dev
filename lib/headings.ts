// Heading ids for post/project bodies. PostBody.tsx renders anchors with these
// exact ids, so global search can deep-link a body match straight to the
// section it was found in. Keep this the only definition of the slug rule.

export function slugifyHeading(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export type Section = {
  /** Heading anchor id, or null for the lead text before the first heading. */
  id: string | null;
  heading: string;
  /** Raw markdown of the section, heading line excluded. */
  body: string;
};

/**
 * Split a Markdoc/markdown body into heading-delimited sections, numbering
 * duplicate slugs the same way PostBody does so the ids line up.
 */
export function splitSections(source: string): Section[] {
  const sections: Section[] = [];
  const seen = new Map<string, number>();
  let current: Section = { id: null, heading: "", body: "" };
  let inFence = false;

  for (const line of (source || "").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      current.body += line + "\n";
      continue;
    }

    const m = !inFence ? line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/) : null;
    if (!m) {
      current.body += line + "\n";
      continue;
    }

    if (current.body.trim() || current.heading) sections.push(current);

    const text = m[2].trim();
    const base = slugifyHeading(text);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    current = {
      id: count > 0 ? `${base}-${count}` : base,
      heading: text,
      body: "",
    };
  }

  if (current.body.trim() || current.heading) sections.push(current);
  return sections;
}

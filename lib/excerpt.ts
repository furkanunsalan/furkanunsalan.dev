// Plain-text rendering of a Markdoc/markdown body. Used for post listing cards,
// DB seed/insert paths, and the snippets global search cuts around a match.

export function plainTextFromMarkdoc(body: string): string {
  return (
    (body || "")
      .replace(/```[\s\S]*?```/g, " ") // fenced code
      .replace(/`[^`]*`/g, " ") // inline code
      .replace(/\{%[\s\S]*?%\}/g, " ") // Markdoc tags
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ") // images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → label only
      .replace(/<[^>]+>/g, " ") // stray HTML/JSX
      .replace(/^\s{0,3}#{1,6}\s+/gm, " ") // heading markers
      .replace(/^\s{0,3}>\s?/gm, " ") // blockquotes
      .replace(/^\s{0,3}[-*+]\s+/gm, " ") // list bullets
      .replace(/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/gm, " ") // thematic breaks
      // Emphasis only — a bare hyphen is left alone so hyphenated words survive.
      .replace(/[*_~]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function excerptFromMarkdoc(body: string, maxWords = 32): string {
  const words = plainTextFromMarkdoc(body).split(" ").filter(Boolean);
  return words.length <= maxWords
    ? words.join(" ")
    : words.slice(0, maxWords).join(" ") + "…";
}

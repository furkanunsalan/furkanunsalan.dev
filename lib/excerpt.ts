// Plain-text excerpt from a Markdoc/markdown body. Used for post listing
// cards and DB seed/insert paths.
export function excerptFromMarkdoc(body: string, maxWords = 32): string {
  const text = body
    .replace(/```[\s\S]*?```/g, " ") // fenced code
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → label only
    .replace(/<[^>]+>/g, " ") // stray HTML/JSX
    .replace(/[#>*_~`-]+/g, " ") // markdown decoration
    .replace(/\s+/g, " ")
    .trim();
  const words = text.split(" ").filter(Boolean);
  return words.length <= maxWords
    ? words.join(" ")
    : words.slice(0, maxWords).join(" ") + "…";
}

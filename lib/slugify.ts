// Two slugifiers, used for different intents:
//   - slugify(text)            — Turkish-character-aware, preserves intent of
//                                display strings (e.g. heading IDs). Bypasses
//                                NFKD because `İ` decomposes to `I + ̇` and
//                                stripping diacritics would yield `i` + bare
//                                dot — not what readers expect.
//   - slugifyAscii(text, fb)   — NFKD-based, more aggressive. Used as the
//                                primary-key generator for DB rows (places,
//                                posts, projects, tools, experiences). Stable
//                                across machines and locales.

const TR_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  Ç: "C",
  Ğ: "G",
  İ: "I",
  Ö: "O",
  Ş: "S",
  Ü: "U",
};

export function slugify(text: string): string {
  return text
    .split("")
    .map((char) => TR_MAP[char] || char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export function slugifyAscii(text: string, fallback = "item"): string {
  return (
    String(text || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || fallback
  );
}

// User-typed slug → safe form. Spaces, slashes, `..`, unicode all get washed
// out so admin-supplied slugs can't end up as DB primary keys with characters
// that break URLs or revalidatePath. Returns null if the input sanitises to
// nothing so the caller can fall back to deriving from name/title.
export function cleanUserSlug(input: string | undefined | null): string | null {
  const cleaned = slugifyAscii(String(input || "").trim(), "");
  return cleaned ? cleaned : null;
}

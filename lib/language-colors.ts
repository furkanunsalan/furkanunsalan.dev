// GitHub Linguist language colors (common subset). Falls back to a neutral
// gray for anything not listed. Safe to import from client components.
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Go: "#00ADD8",
  Python: "#3572A5",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  "Objective-C": "#438eff",
  Ruby: "#701516",
  PHP: "#4F5D95",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Astro: "#ff5a03",
  Dart: "#00B4AB",
  Lua: "#000080",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Scala: "#c22d40",
  Clojure: "#db5855",
  Zig: "#ec915c",
  Solidity: "#AA6746",
  "Jupyter Notebook": "#DA5B0B",
  TeX: "#3D6117",
  Makefile: "#427819",
  Nix: "#7e7eff",
  "Vim Script": "#199f4b",
};

const FALLBACK = "#6e7681";

export function languageColor(name?: string | null): string {
  if (!name) return FALLBACK;
  return LANGUAGE_COLORS[name] ?? FALLBACK;
}

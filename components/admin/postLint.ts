export type LintIssue = {
  severity: "error" | "warning";
  line: number;
  message: string;
};

const IMG_DIR_ALLOWLIST = new Set([
  "posts",
  "projects",
  "experiences",
  "places",
  "misc",
  "thoughts",
]);

function slugifyHeading(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function lintMarkdown(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split("\n");

  let inFence = false;
  let fenceCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    const fenceHits = line.match(/```/g);
    if (fenceHits) {
      fenceCount += fenceHits.length;
      if (fenceHits.length % 2 === 1) inFence = !inFence;
    }
    if (inFence) continue;

    const imgRe = /!\[[^\]]*\]\(([^)]+)\)/g;
    let im: RegExpExecArray | null;
    while ((im = imgRe.exec(line)) !== null) {
      const url = im[1].trim();
      if (url.startsWith("/api/img/")) {
        const rest = url.slice("/api/img/".length);
        const parts = rest.split("/");
        if (parts.length < 2 || !parts[0]) {
          issues.push({
            severity: "error",
            line: lineNo,
            message: `Broken image ref "${url}" — missing directory.`,
          });
        } else if (!IMG_DIR_ALLOWLIST.has(parts[0])) {
          issues.push({
            severity: "error",
            line: lineNo,
            message: `Image dir "${parts[0]}" is not in the allowlist (posts | projects | experiences | places | misc | thoughts).`,
          });
        } else if (!parts.slice(1).join("/").trim()) {
          issues.push({
            severity: "error",
            line: lineNo,
            message: `Broken image ref "${url}" — missing filename.`,
          });
        }
      }
    }

    const linkRe = /(?<!!)\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
    let lm: RegExpExecArray | null;
    while ((lm = linkRe.exec(line)) !== null) {
      const url = lm[1];
      if (/[.,;:!?]+$/.test(url)) {
        issues.push({
          severity: "warning",
          line: lineNo,
          message: `Link URL ends with punctuation, likely swallowed from text: "${url}"`,
        });
      }
      if (/localhost|127\.0\.0\.1/.test(url)) {
        issues.push({
          severity: "warning",
          line: lineNo,
          message: `Localhost link: "${url}"`,
        });
      }
      if (url.startsWith("http://")) {
        issues.push({
          severity: "warning",
          line: lineNo,
          message: `Non-HTTPS link: "${url}"`,
        });
      }
    }
  }

  if (fenceCount % 2 !== 0) {
    issues.push({
      severity: "error",
      line: lines.length,
      message: `Unclosed code fence — found ${fenceCount} backtick fences (must be even).`,
    });
  }

  const headings: { line: number; level: number; text: string }[] = [];
  let inFence2 = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/```/.test(line)) {
      const hits = line.match(/```/g);
      if (hits && hits.length % 2 === 1) inFence2 = !inFence2;
    }
    if (inFence2) continue;
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      headings.push({ line: i + 1, level: m[1].length, text: m[2] });
    }
  }

  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1];
    const cur = headings[i];
    if (cur.level > prev.level + 1) {
      issues.push({
        severity: "warning",
        line: cur.line,
        message: `Heading skipped levels: h${prev.level} → h${cur.level} (insert intermediate heading${cur.level - prev.level > 2 ? "s" : ""}).`,
      });
    }
  }

  const slugMap = new Map<string, number[]>();
  for (const h of headings) {
    const slug = slugifyHeading(h.text);
    if (!slug) continue;
    const arr = slugMap.get(slug) || [];
    arr.push(h.line);
    slugMap.set(slug, arr);
  }
  for (const [slug, ls] of slugMap) {
    if (ls.length > 1) {
      for (let k = 1; k < ls.length; k++) {
        issues.push({
          severity: "warning",
          line: ls[k],
          message: `Duplicate heading id "${slug}" (also on line ${ls[0]}).`,
        });
      }
    }
  }

  issues.sort((a, b) => a.line - b.line);
  return issues;
}

export function offsetForLine(text: string, line: number): number {
  if (line <= 1) return 0;
  let count = 0;
  let cur = 1;
  for (let i = 0; i < text.length && cur < line; i++) {
    if (text[i] === "\n") {
      cur++;
      count = i + 1;
    }
  }
  return count;
}

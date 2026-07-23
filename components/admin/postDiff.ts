export type DiffLine =
  | { type: "equal"; text: string; aLine: number; bLine: number }
  | { type: "remove"; text: string; aLine: number }
  | { type: "add"; text: string; bLine: number };

export function diffLines(a: string, b: string): DiffLine[] {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const n = aLines.length;
  const m = bLines.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (aLines[i] === bLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      out.push({ type: "equal", text: aLines[i], aLine: i + 1, bLine: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "remove", text: aLines[i], aLine: i + 1 });
      i++;
    } else {
      out.push({ type: "add", text: bLines[j], bLine: j + 1 });
      j++;
    }
  }
  while (i < n) {
    out.push({ type: "remove", text: aLines[i], aLine: i + 1 });
    i++;
  }
  while (j < m) {
    out.push({ type: "add", text: bLines[j], bLine: j + 1 });
    j++;
  }
  return out;
}

export function hasRealChanges(lines: DiffLine[]): boolean {
  return lines.some((l) => l.type !== "equal");
}

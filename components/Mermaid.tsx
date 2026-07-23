"use client";

import { useEffect, useId, useState } from "react";

// Renders a ```mermaid fenced block from a post into an SVG. mermaid is a heavy
// dependency, so it's dynamically imported here — it only loads on post pages
// that actually contain a diagram. Themed to match the AMOLED + indigo site.
export default function Mermaid({ chart }: { chart: string }) {
  const rawId = useId();
  const id = "mmd-" + rawId.replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string>("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          themeVariables: {
            background: "transparent",
            primaryColor: "#18181b",
            primaryBorderColor: "#3f3f46",
            primaryTextColor: "#e4e4e7",
            lineColor: "#52525b",
            secondaryColor: "#1e1b4b",
            tertiaryColor: "#0a0a0a",
            clusterBkg: "#0f0f13",
            clusterBorder: "#27272a",
            edgeLabelBackground: "#0a0a0a",
            fontSize: "13px",
          },
        });
        const { svg } = await mermaid.render(id, chart.trim());
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  // Initial render (server + client-first) is always the skeleton, so there's
  // no hydration mismatch; the SVG or the code fallback swaps in after mount.
  if (svg) {
    return (
      <div
        className="not-prose my-6 overflow-x-auto rounded-xl border border-white/[0.06] bg-zinc-950/40 p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
        // mermaid output is authored by the admin and rendered with securityLevel:strict
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }
  if (failed) {
    return (
      <pre data-language="mermaid">
        <code>{chart}</code>
      </pre>
    );
  }
  return (
    <div className="my-6 h-40 w-full animate-pulse rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06]" />
  );
}

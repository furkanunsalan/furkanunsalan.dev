"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { KeyRound, Search } from "lucide-react";

type Column = {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  isPrimary: boolean;
};

type Table = {
  name: string;
  rowCount: number;
  columns: Column[];
  indexes: { name: string; def: string }[];
};

type ForeignKey = {
  src_table: string;
  src_column: string;
  tgt_table: string;
  tgt_column: string;
  soft: boolean;
};

type ApiResp = {
  ok: boolean;
  tables: Table[];
  foreignKeys: ForeignKey[];
  error?: string;
};

const NODE_W = 240;
const HEADER_H = 36;
const ROW_H = 22;
const GAP_X = 60;
const GAP_Y = 36;
const PADDING = 24;

function typeColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("char") || t === "text" || t === "uuid" || t === "name")
    return "text-violet-300";
  if (
    t === "smallint" ||
    t === "integer" ||
    t === "bigint" ||
    t === "numeric" ||
    t === "real" ||
    t.startsWith("double") ||
    t === "money"
  )
    return "text-sky-300";
  if (t === "boolean") return "text-emerald-300";
  if (t.includes("timestamp") || t === "date" || t === "time")
    return "text-amber-300";
  if (t === "json" || t === "jsonb") return "text-rose-300";
  if (t.endsWith("[]") || t === "array") return "text-fuchsia-300";
  if (t === "user-defined") return "text-teal-300";
  return "text-light-fourth";
}

function shortType(t: string): string {
  const l = t.toLowerCase();
  if (l === "timestamp with time zone") return "timestamptz";
  if (l === "timestamp without time zone") return "timestamp";
  if (l === "character varying") return "varchar";
  if (l === "double precision") return "float8";
  if (l === "user-defined") return "enum";
  if (l === "array") return "[]";
  return l;
}

function nodeHeight(t: Table): number {
  return HEADER_H + ROW_H * t.columns.length + 8;
}

// Pack tables into N columns trying to minimise the tallest column. Tallest
// tables placed first so the canvas reads top-down per column.
function gridLayout(
  tables: Table[],
  cols: number,
): {
  positions: Record<string, { x: number; y: number }>;
  w: number;
  h: number;
} {
  const sorted = [...tables].sort((a, b) => nodeHeight(b) - nodeHeight(a));
  const heightsPerCol: number[] = new Array(cols).fill(0);
  const positions: Record<string, { x: number; y: number }> = {};
  for (const t of sorted) {
    let target = 0;
    for (let i = 1; i < cols; i++) {
      if (heightsPerCol[i] < heightsPerCol[target]) target = i;
    }
    positions[t.name] = {
      x: target * (NODE_W + GAP_X),
      y: heightsPerCol[target],
    };
    heightsPerCol[target] += nodeHeight(t) + GAP_Y;
  }
  const w = cols * NODE_W + (cols - 1) * GAP_X;
  const h = Math.max(0, ...heightsPerCol) - GAP_Y;
  return { positions, w, h };
}

export default function SchemaTab() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [containerW, setContainerW] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/db/schema");
        const j = (await res.json()) as ApiResp;
        if (cancelled) return;
        if (!res.ok || !j.ok) {
          setError(j.error || `error ${res.status}`);
        } else {
          setData(j);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Wait for the canvas to actually mount (the wrapRef isn't attached during
  // the "Loading schema…" branch) before measuring, otherwise containerW stays
  // at 0 and the auto-fit picker collapses to one column.
  useLayoutEffect(() => {
    if (loading || error) return;
    const el = wrapRef.current;
    if (!el) return;
    setContainerW(el.clientWidth);
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerW(entry.contentRect.width);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loading, error]);

  // Pick the most columns we can fit while keeping each table readable.
  // Density wins — start from one column and accept any wider variant as long
  // as it doesn't force tables below MIN_SCALE.
  const layout = useMemo(() => {
    if (!data?.tables.length) return null;
    const availableW = Math.max(320, containerW - PADDING * 2);
    const MIN_SCALE = 0.55;
    const MAX_COLS = 4;
    let best: {
      cols: number;
      positions: Record<string, { x: number; y: number }>;
      w: number;
      h: number;
      scale: number;
    } | null = null;
    for (let cols = 1; cols <= MAX_COLS; cols++) {
      const { positions, w, h } = gridLayout(data.tables, cols);
      const scale = Math.min(1, availableW / w);
      // Always seed with 1-col so we have a fallback when nothing else clears
      // the readability floor.
      if (cols === 1) {
        best = { cols, positions, w, h, scale };
        continue;
      }
      if (scale >= MIN_SCALE) {
        best = { cols, positions, w, h, scale };
      }
    }
    return best!;
  }, [data, containerW]);

  type Edge = {
    key: string;
    d: string;
    soft: boolean;
    active: boolean;
  };
  const edges: Edge[] = useMemo(() => {
    if (!data || !layout) return [];
    const out: Edge[] = [];
    for (const fk of data.foreignKeys) {
      const src = layout.positions[fk.src_table];
      const tgt = layout.positions[fk.tgt_table];
      const srcTable = data.tables.find((t) => t.name === fk.src_table);
      const tgtTable = data.tables.find((t) => t.name === fk.tgt_table);
      if (!src || !tgt || !srcTable || !tgtTable) continue;
      const srcIdx = srcTable.columns.findIndex(
        (c) => c.name === fk.src_column,
      );
      const tgtIdx = tgtTable.columns.findIndex(
        (c) => c.name === fk.tgt_column,
      );
      const srcRowY =
        srcIdx >= 0 ? HEADER_H + srcIdx * ROW_H + ROW_H / 2 : HEADER_H / 2;
      const tgtRowY =
        tgtIdx >= 0 ? HEADER_H + tgtIdx * ROW_H + ROW_H / 2 : HEADER_H / 2;
      const useRightSrc = tgt.x > src.x;
      const sx = useRightSrc ? src.x + NODE_W : src.x;
      const sy = src.y + srcRowY;
      const tx = useRightSrc ? tgt.x : tgt.x + NODE_W;
      const ty = tgt.y + tgtRowY;
      const dx = Math.max(40, Math.abs(tx - sx) * 0.5);
      const c1x = sx + (useRightSrc ? dx : -dx);
      const c2x = tx + (useRightSrc ? -dx : dx);
      const active = hover === fk.src_table || hover === fk.tgt_table;
      out.push({
        key: `${fk.src_table}.${fk.src_column}->${fk.tgt_table}.${fk.tgt_column}`,
        d: `M ${sx} ${sy} C ${c1x} ${sy}, ${c2x} ${ty}, ${tx} ${ty}`,
        soft: fk.soft,
        active,
      });
    }
    return out;
  }, [data, layout, hover]);

  if (loading) {
    return <div className="text-sm text-light-fourth">Loading schema…</div>;
  }
  if (error) {
    return (
      <div className="rounded-lg ring-1 ring-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-400">
        {error}
      </div>
    );
  }
  if (!data) return null;

  const scaledH = layout
    ? Math.ceil(layout.h * layout.scale) + PADDING * 2
    : 200;
  const q = filter.trim().toLowerCase();
  const visible = (name: string) => !q || name.toLowerCase().includes(q);

  return (
    <div
      ref={wrapRef}
      className="relative rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-3 py-2 border-b border-white/[0.06]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-light-fourth" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Find table…"
            className="bg-black/70 ring-1 ring-white/10 focus:ring-white/20 outline-none rounded-md pl-7 pr-2 py-1 text-xs text-white placeholder:text-light-fourth w-40"
          />
        </div>
        <span className="text-[10px] uppercase tracking-widest text-light-fourth/60">
          {data.tables.length} tables · {data.foreignKeys.length} fks
        </span>
        <span className="ml-auto inline-flex items-center gap-3 text-[10px] uppercase tracking-widest text-light-fourth/60">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-px bg-white/30" /> hard fk
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-px border-t border-dashed border-white/30" />{" "}
            soft fk
          </span>
        </span>
      </div>

      <div
        className="relative overflow-hidden"
        style={{
          height: scaledH,
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {layout && (
          <div
            className="absolute"
            style={{
              left: PADDING,
              top: PADDING,
              transform: `scale(${layout.scale})`,
              transformOrigin: "0 0",
              width: layout.w,
              height: layout.h,
            }}
          >
            <svg
              className="absolute pointer-events-none"
              style={{
                left: 0,
                top: 0,
                width: layout.w,
                height: layout.h,
                overflow: "visible",
              }}
            >
              {edges.map((e) => (
                <path
                  key={e.key}
                  d={e.d}
                  fill="none"
                  stroke={
                    e.active ? "rgb(99,102,241)" : "rgba(255,255,255,0.3)"
                  }
                  strokeWidth={e.active ? 2 : 1.25}
                  strokeDasharray={e.soft ? "5 4" : undefined}
                />
              ))}
            </svg>

            {data.tables.map((t) => {
              const p = layout.positions[t.name];
              if (!p) return null;
              const isVisible = visible(t.name);
              const isHovered = hover === t.name;
              return (
                <div
                  key={t.name}
                  onMouseEnter={() => setHover(t.name)}
                  onMouseLeave={() =>
                    setHover((cur) => (cur === t.name ? null : cur))
                  }
                  style={{
                    position: "absolute",
                    left: p.x,
                    top: p.y,
                    width: NODE_W,
                    opacity: isVisible ? 1 : 0.2,
                  }}
                  className={`select-none rounded-lg bg-zinc-900 ring-1 transition-shadow ${
                    isHovered
                      ? "ring-accent-primary shadow-[0_0_24px_-8px_rgba(99,102,241,0.7)]"
                      : "ring-white/10"
                  }`}
                >
                  <div
                    className="px-3 flex items-center gap-2 border-b border-white/[0.06]"
                    style={{ height: HEADER_H }}
                  >
                    <span className="font-mono text-[12.5px] font-semibold text-white truncate">
                      {t.name}
                    </span>
                    <span className="ml-auto text-[10px] tabular-nums text-light-fourth/70">
                      {t.rowCount}
                    </span>
                  </div>
                  <ul>
                    {t.columns.map((c) => (
                      <li
                        key={c.name}
                        className="px-3 flex items-center gap-2 text-[11.5px] font-mono"
                        style={{ height: ROW_H }}
                        title={
                          c.default
                            ? `${c.type} · default: ${c.default}`
                            : c.type
                        }
                      >
                        {c.isPrimary ? (
                          <KeyRound
                            className="w-3 h-3 text-amber-400 shrink-0"
                            aria-label="primary key"
                          />
                        ) : (
                          <span className="w-3 shrink-0" aria-hidden />
                        )}
                        <span
                          className={`truncate ${c.isPrimary ? "text-white" : "text-light-secondary"}`}
                        >
                          {c.name}
                        </span>
                        <span
                          className={`ml-auto truncate uppercase tracking-wider text-[9.5px] ${typeColor(c.type)}`}
                        >
                          {shortType(c.type)}
                        </span>
                        {c.nullable && (
                          <span
                            className="text-[9px] text-amber-400/70"
                            title="nullable"
                          >
                            ?
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

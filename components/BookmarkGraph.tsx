"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ArrowUpRight } from "lucide-react";

type RawNode = {
  id: string;
  kind: "tag" | "bookmark";
  label: string;
  weight?: number;
  url?: string;
  list?: string;
  excerpt?: string;
  cover?: string | null;
  created?: string;
  tags?: string[];
};
type Raw = {
  nodes: RawNode[];
  links: { s: string; t: string }[];
  stats: { bookmarks: number; tags: number };
};

type N = RawNode & { r: number; x: number; y: number; vx: number; vy: number };
type L = { a: N; b: N };

const TAG = "129,140,248"; // indigo-400
const BM = "148,163,184"; // slate
const NAV = 64;

const REPULSION = 4800;
const SPRING = 0.025;
const REST = 44;
const GRAVITY = 0.03;
const DAMPING = 0.9;

// One physics tick (mutates node velocities/positions). Run off-screen to
// pre-settle the layout so the graph appears already laid out.
function tick(nodes: N[], links: L[], alpha: number) {
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 0.01) {
        dx = Math.random() - 0.5;
        dy = Math.random() - 0.5;
        d2 = 0.01;
      }
      const d = Math.sqrt(d2);
      // tag hubs push apart harder so their labels don't collide
      const rep =
        a.kind === "tag" && b.kind === "tag" ? REPULSION * 2.8 : REPULSION;
      const f = (rep * alpha) / d2;
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    }
  }
  for (const l of links) {
    const dx = l.b.x - l.a.x;
    const dy = l.b.y - l.a.y;
    const d = Math.hypot(dx, dy) || 0.01;
    const f = SPRING * (d - REST) * alpha;
    l.a.vx += (dx / d) * f;
    l.a.vy += (dy / d) * f;
    l.b.vx -= (dx / d) * f;
    l.b.vy -= (dy / d) * f;
  }
  for (const n of nodes) {
    n.vx -= n.x * GRAVITY * alpha;
    n.vy -= n.y * GRAVITY * alpha;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;
  }
}

export default function BookmarkGraph() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading",
  );
  const [stats, setStats] = useState<{
    bookmarks: number;
    tags: number;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<N[]>([]);
  const [hover, setHover] = useState<N | null>(null);

  const g = useRef({
    nodes: [] as N[],
    links: [] as L[],
    adj: new Map<string, Set<string>>(),
    byId: new Map<string, N>(),
    matches: null as Set<string> | null,
    tx: 0,
    ty: 0,
    k: 1,
    hover: null as N | null,
    panning: false,
    press: null as N | null,
    px: 0,
    py: 0,
    downX: 0,
    downY: 0,
    moved: false,
    raf: 0,
    dpr: 1,
    introStart: 0,
  });

  const fitTo = (nodes: N[], w: number, h: number) => {
    if (!nodes.length) return;
    // Percentile bounds so a few escaped outliers don't blow up the framing —
    // the dense cluster fills the view; stragglers sit just past the edges.
    const xs = nodes.map((n) => n.x).sort((a, b) => a - b);
    const ys = nodes.map((n) => n.y).sort((a, b) => a - b);
    const lo = Math.floor(nodes.length * 0.03);
    const hi = Math.min(nodes.length - 1, Math.ceil(nodes.length * 0.97));
    const minX = xs[lo],
      maxX = xs[hi],
      minY = ys[lo],
      maxY = ys[hi];
    const bw = maxX - minX || 1;
    const bh = maxY - minY || 1;
    const s = g.current;
    s.k = Math.max(0.4, Math.min((w * 0.78) / bw, (h * 0.72) / bh, 1.5));
    s.tx = w / 2 - ((minX + maxX) / 2) * s.k;
    s.ty = h / 2 - ((minY + maxY) / 2) * s.k;
  };

  // ---- fetch + pre-settle ----
  useEffect(() => {
    let alive = true;
    fetch("/api/karakeep/graph")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Raw) => {
        if (!alive) return;
        if (!data.nodes?.length) return setStatus("empty");
        const byId = new Map<string, N>();
        const R = 26 * Math.sqrt(data.nodes.length);
        for (const n of data.nodes) {
          const r = n.kind === "tag" ? 5 + Math.sqrt(n.weight ?? 1) * 3 : 3;
          byId.set(n.id, {
            ...n,
            r,
            x: (Math.random() - 0.5) * R,
            y: (Math.random() - 0.5) * R,
            vx: 0,
            vy: 0,
          });
        }
        const links: L[] = [];
        const adj = new Map<string, Set<string>>();
        const add = (id: string, o: string) => {
          let set = adj.get(id);
          if (!set) adj.set(id, (set = new Set()));
          set.add(o);
        };
        for (const l of data.links) {
          const a = byId.get(l.s);
          const b = byId.get(l.t);
          if (!a || !b) continue;
          links.push({ a, b });
          add(a.id, b.id);
          add(b.id, a.id);
        }
        const nodes = [...byId.values()];
        // pre-settle off-screen
        let alpha = 1;
        for (let i = 0; i < 420 && alpha > 0.005; i++) {
          tick(nodes, links, alpha);
          alpha *= 0.985;
        }
        Object.assign(g.current, { nodes, links, adj, byId });
        const w = wrapRef.current?.clientWidth || window.innerWidth;
        const h = wrapRef.current?.clientHeight || window.innerHeight;
        fitTo(nodes, w, h);
        setStats(data.stats);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, []);

  // ---- search ----
  useEffect(() => {
    const q = query.trim().toLowerCase();
    const s = g.current;
    if (!q || status !== "ready") {
      s.matches = null;
      setResults([]);
      return;
    }
    const m = s.nodes.filter((n) => n.label.toLowerCase().includes(q));
    s.matches = new Set(m.map((n) => n.id));
    m.sort((a, b) =>
      a.kind === b.kind
        ? (b.weight ?? 0) - (a.weight ?? 0) || a.label.localeCompare(b.label)
        : a.kind === "tag"
          ? -1
          : 1,
    );
    setResults(m.slice(0, 10));
  }, [query, status]);

  // ---- render (draw only; layout is already settled) ----
  useEffect(() => {
    if (status !== "ready") return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d")!;
    const s = g.current;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.dpr = dpr;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(s.dpr, s.dpr);
      ctx.translate(s.tx, s.ty);
      ctx.scale(s.k, s.k);

      const hov = s.hover;
      const nbrs = hov ? s.adj.get(hov.id) : null;
      const matches = s.matches;
      const isActive = (n: N) =>
        matches
          ? matches.has(n.id)
          : !hov || n.id === hov.id || (nbrs ? nbrs.has(n.id) : false);

      // entrance: nodes bloom outward from center + fade in (minimal, one-shot)
      if (!s.introStart) s.introStart = performance.now();
      const raw = Math.min(1, (performance.now() - s.introStart) / 850);
      const et = 1 - Math.pow(1 - raw, 3);
      const ps = 0.9 + 0.1 * et; // position scale (bloom)
      const rs = 0.4 + 0.6 * et; // radius scale
      const op = Math.min(1, et * 1.15); // opacity
      const labelOp = Math.max(0, (raw - 0.4) / 0.6) * 0.92;

      ctx.lineWidth = 1 / s.k;
      for (const l of s.links) {
        const lit = hov && (l.a.id === hov.id || l.b.id === hov.id);
        const faded = matches || (hov && !lit);
        ctx.strokeStyle = lit
          ? `rgba(${TAG},${0.6 * op})`
          : `rgba(255,255,255,${(faded ? 0.02 : 0.06) * op})`;
        ctx.beginPath();
        ctx.moveTo(l.a.x * ps, l.a.y * ps);
        ctx.lineTo(l.b.x * ps, l.b.y * ps);
        ctx.stroke();
      }

      for (const n of s.nodes) {
        const active = isActive(n);
        const a = (active ? 1 : 0.12) * op;
        ctx.beginPath();
        ctx.arc(n.x * ps, n.y * ps, n.r * rs, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.kind === "tag" ? TAG : BM},${a})`;
        ctx.fill();
        if (n === hov) {
          ctx.lineWidth = 2 / s.k;
          ctx.strokeStyle = `rgba(${TAG},0.95)`;
          ctx.stroke();
        }
      }

      // ---- labels in screen space: fixed size + collision avoidance so the
      // biggest hubs stay readable and never overlap (skipped labels reappear
      // as you zoom in / hover) ----
      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.font = "12px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const drawn: [number, number, number, number][] = [];
      if (labelOp > 0.02) {
        const tags = s.nodes
          .filter((n) => n.kind === "tag" && isActive(n))
          .sort((a, b) => b.r - a.r);
        for (const n of tags) {
          const sx = s.tx + s.k * n.x * ps;
          const sy = s.ty + s.k * n.y * ps + n.r * rs * s.k + 3;
          if (sx < -40 || sx > W + 40 || sy < NAV - 20 || sy > H + 20) continue;
          const w = ctx.measureText(n.label).width;
          const box: [number, number, number, number] = [
            sx - w / 2 - 3,
            sy - 1,
            sx + w / 2 + 3,
            sy + 13,
          ];
          const force = n === hov || (!!matches && matches.has(n.id));
          const hit = drawn.some(
            (d) =>
              !(
                box[2] < d[0] ||
                box[0] > d[2] ||
                box[3] < d[1] ||
                box[1] > d[3]
              ),
          );
          if (force || !hit) {
            ctx.fillStyle = `rgba(226,232,240,${labelOp})`;
            ctx.fillText(n.label, sx, sy);
            drawn.push(box);
          }
        }
      }

      if (hov && cardRef.current) {
        const card = cardRef.current;
        const sx = s.tx + s.k * hov.x;
        const sy = s.ty + s.k * hov.y;
        const cw = card.offsetWidth;
        const ch = card.offsetHeight;
        let left = sx + hov.r * s.k + 14;
        if (left + cw > W - 12) left = sx - hov.r * s.k - 14 - cw;
        left = Math.max(12, Math.min(left, W - cw - 12));
        const top = Math.max(NAV, Math.min(sy - ch / 2, H - ch - 12));
        card.style.transform = `translate(${left}px, ${top}px)`;
      }

      s.raf = requestAnimationFrame(draw);
    };
    s.raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(s.raf);
      ro.disconnect();
    };
  }, [status]);

  // ---- interactions (pan + zoom + click; no node dragging) ----
  const toGraph = (px: number, py: number) => {
    const s = g.current;
    return { x: (px - s.tx) / s.k, y: (py - s.ty) / s.k };
  };
  const pick = (px: number, py: number): N | null => {
    const s = g.current;
    const p = toGraph(px, py);
    let best: N | null = null;
    let bestD = Infinity;
    for (const n of s.nodes) {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < n.r + 7 / s.k && d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  };
  const xy = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const setHovered = (n: N | null) => {
    if (g.current.hover !== n) {
      g.current.hover = n;
      setHover(n);
    }
  };

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const s = g.current;
    const { x, y } = xy(e);
    s.downX = x;
    s.downY = y;
    s.moved = false;
    s.panning = true;
    s.press = pick(x, y);
    s.px = x;
    s.py = y;
  };
  const onMove = (e: React.PointerEvent) => {
    const s = g.current;
    const { x, y } = xy(e);
    if (s.panning) {
      if (Math.hypot(x - s.downX, y - s.downY) > 4) {
        s.moved = true;
        s.tx += x - s.px;
        s.ty += y - s.py;
      }
    } else {
      setHovered(pick(x, y));
    }
    s.px = x;
    s.py = y;
    (e.currentTarget as HTMLElement).style.cursor = s.moved
      ? "grabbing"
      : s.hover
        ? "pointer"
        : "grab";
  };
  const onUp = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s.moved && s.press) {
      if (s.press.kind === "bookmark" && s.press.url)
        window.open(s.press.url, "_blank", "noopener,noreferrer");
      else if (s.press.kind === "tag") centerOn(s.press);
    }
    s.panning = false;
    s.press = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };
  const onWheel = (e: React.WheelEvent) => {
    const s = g.current;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const k2 = Math.min(4, Math.max(0.15, s.k * Math.exp(-e.deltaY * 0.0015)));
    s.tx = mx - ((mx - s.tx) * k2) / s.k;
    s.ty = my - ((my - s.ty) * k2) / s.k;
    s.k = k2;
  };

  const centerOn = (n: N) => {
    const s = g.current;
    const wrap = wrapRef.current;
    if (!wrap) return;
    s.k = Math.max(s.k, 1.3);
    s.tx = wrap.clientWidth / 2 - n.x * s.k;
    s.ty = wrap.clientHeight / 2 - n.y * s.k;
    setHovered(n);
  };

  return (
    <div ref={wrapRef} className="fixed inset-0 z-0 bg-dark-primary">
      {status === "ready" && (
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none select-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={() => {
            setHovered(null);
            g.current.panning = false;
          }}
          onWheel={onWheel}
        />
      )}

      {status !== "ready" && (
        <div className="flex h-full items-center justify-center text-sm text-light-fourth">
          {status === "loading" && "Building the graph…"}
          {status === "empty" && "No tagged bookmarks to graph yet."}
          {status === "error" && "Could not load the graph."}
        </div>
      )}

      {/* search + results */}
      <div
        className="pointer-events-none absolute inset-x-0 flex justify-center px-4"
        style={{ top: NAV + 8 }}
      >
        <div className="pointer-events-auto w-full max-w-sm">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/85 px-4 py-2 backdrop-blur">
            <Search className="h-4 w-4 shrink-0 text-light-fourth" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tags & bookmarks…"
              className="w-full bg-transparent text-sm text-light-secondary placeholder:text-light-fourth focus:outline-none"
            />
            {stats && (
              <span className="shrink-0 font-mono text-[11px] text-light-fourth">
                {stats.tags}·{stats.bookmarks}
              </span>
            )}
          </div>

          {results.length > 0 && (
            <ul className="mt-2 max-h-[60vh] overflow-auto rounded-xl border border-white/10 bg-zinc-950/90 p-1 backdrop-blur">
              {results.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => centerOn(n)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-light-secondary transition-colors hover:bg-white/[0.05]"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: `rgb(${n.kind === "tag" ? TAG : BM})`,
                      }}
                    />
                    <span className="truncate">
                      {n.kind === "tag" ? `#${n.label}` : n.label}
                    </span>
                    {n.kind === "tag" && (
                      <span className="ml-auto shrink-0 text-[11px] text-light-fourth">
                        {n.weight}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* hover card */}
      {hover && (
        <div
          ref={cardRef}
          className="pointer-events-none absolute left-0 top-0 w-[280px] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)] backdrop-blur will-change-transform"
        >
          {hover.kind === "bookmark" ? (
            <>
              {hover.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hover.cover}
                  alt=""
                  className="h-28 w-full object-cover"
                />
              )}
              <div className="p-3">
                <div className="flex items-start gap-1.5">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                    {hover.label}
                  </h3>
                  <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-primary" />
                </div>
                {hover.excerpt && (
                  <p className="mt-1 line-clamp-2 text-xs text-light-secondary/70">
                    {hover.excerpt}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {(hover.tags ?? []).slice(0, 5).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-accent-primary/10 px-1.5 py-0.5 text-[10px] text-accent-primary/90"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-light-fourth">
                  {hover.list && <span>{hover.list}</span>}
                  {hover.created && (
                    <span>
                      {new Date(hover.created).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-mono text-sm font-semibold text-accent-primary">
                  #{hover.label}
                </h3>
                <span className="text-xs text-light-fourth">
                  {hover.weight} bookmark{hover.weight === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {[...(g.current.adj.get(hover.id) ?? [])]
                  .slice(0, 6)
                  .map((id) => g.current.byId.get(id))
                  .filter((n): n is N => !!n)
                  .map((n) => (
                    <li
                      key={n.id}
                      className="truncate text-xs text-light-secondary/80"
                    >
                      · {n.label}
                    </li>
                  ))}
                {(g.current.adj.get(hover.id)?.size ?? 0) > 6 && (
                  <li className="text-[11px] text-light-fourth">
                    +{(g.current.adj.get(hover.id)?.size ?? 0) - 6} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* hint */}
      <p className="pointer-events-none absolute bottom-4 left-4 text-[11px] text-light-fourth/50">
        drag to pan · scroll to zoom · hover for detail · click a bookmark to
        open
      </p>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ArrowUpRight } from "lucide-react";
import {
  CAMERA_TWEEN_MS,
  K_MIN,
  clampK,
  fitTransform,
  tweenTransform,
} from "@/lib/graph/camera";
import {
  isEdgeVisible,
  isNodeVisible,
  visibleBounds,
  type Bounds,
  type ViewTransform,
} from "@/lib/graph/culling";
import {
  EDGE_REST_ALPHA,
  blendAlpha,
  buildHoverHighlight,
  dimmingAfter,
  edgeShowsAccent,
  edgeTargetAlpha,
  nodeTargetAlpha,
  type DimSource,
  type HoverHighlight,
} from "@/lib/graph/hover";
import {
  HOVER_CARD_IN_MS,
  HOVER_CARD_OUT_MS,
  HOVER_DIM_IN_MS,
  HOVER_DIM_OUT_MS,
  advancePresence,
  hoverCardFrame,
} from "@/lib/graph/hoverCard";
import { ACCENT_INK, inkFor, layoutGraph } from "@/lib/graph/layout";
import { classifyRelease, crossedDragThreshold } from "@/lib/graph/pointer";

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

type N = RawNode & { r: number; x: number; y: number; group: number };
type L = { a: N; b: N };

const NAV = 64;

// How far outside the viewport (in screen px) a node may be and still have its
// label considered: half of a long tag label, plus the 40px of overshoot the
// label pass already tolerates, or a long label would pop at the edge. Divided
// by k to reach graph units.
const LABEL_CULL_PAD_PX = 200;

/** A camera move in flight: the framing it left and the one it is heading for.
 *  `fit` marks the opening framing, whose target is a function of the canvas
 *  box — so a resize recomputes it rather than dropping it (see the observer). */
type CameraTween = {
  from: ViewTransform;
  to: ViewTransform;
  start: number;
  fit: boolean;
};

// Everything the render loop and the pointer handlers share without going
// through React: a hover must never re-render the island, and a pan must never
// commit state. Grouped in one mutable object because it is one graph.
type GraphState = {
  nodes: N[];
  links: L[];
  /** The links as raw id pairs, for `buildHoverHighlight`. */
  pairs: { source: string; target: string }[];
  adj: Map<string, Set<string>>;
  byId: Map<string, N>;
  /** Node ids matching the search, or null when no search is active. */
  matches: Set<string> | null;
  view: ViewTransform;
  tween: CameraTween | null;
  /** The highlight the pointer is on, or null. */
  hover: HoverHighlight | null;
  /** The classification the dim layer is (or was) blending toward. Retained
   *  after a highlight ends until the dim reaches 0, so the release fades
   *  instead of collapsing. */
  dimSource: DimSource | null;
  dim: number;
  dimTarget: 0 | 1;
  reduce: boolean;
  panning: boolean;
  press: N | null;
  px: number;
  py: number;
  downX: number;
  downY: number;
  moved: boolean;
  raf: number;
  frameAt: number;
  /** The canvas CSS box and DPR, kept live so the render loop never measures
   *  the DOM (a rect read per frame forces layout). */
  cssW: number;
  cssH: number;
  dpr: number;
  introAt: number;
  maxRadius: number;
  /** The node whose card is mounted, and its presence animation. */
  card: N | null;
  cardTarget: 0 | 1;
  cardProgress: number;
  cardPos: { x: number; y: number } | null;
};

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
  // The node whose hover card is MOUNTED. Deliberately survives the hover
  // ending: the card fades out and unmounts once its presence reaches 0, rather
  // than disappearing on the frame the pointer left.
  const [card, setCard] = useState<N | null>(null);

  const g = useRef<GraphState>({
    nodes: [],
    links: [],
    pairs: [],
    adj: new Map(),
    byId: new Map(),
    matches: null,
    view: { x: 0, y: 0, k: 1 },
    tween: null,
    hover: null,
    dimSource: null,
    dim: 0,
    dimTarget: 0,
    reduce: false,
    panning: false,
    press: null,
    px: 0,
    py: 0,
    downX: 0,
    downY: 0,
    moved: false,
    raf: 0,
    frameAt: 0,
    cssW: 0,
    cssH: 0,
    dpr: 1,
    introAt: 0,
    maxRadius: 3,
    card: null,
    cardTarget: 0,
    cardProgress: 0,
    cardPos: null,
  });

  /** Start a programmatic camera move. It always tweens; only the reduced-motion
   *  gate snaps, and only a gesture bypasses it (by writing `view` directly). */
  const startCamera = (to: ViewTransform, fit = false) => {
    const s = g.current;
    if (s.reduce) {
      s.tween = null;
      s.view = to;
      return;
    }
    // From the frame the user can actually see, not from the previous target:
    // retargeting mid-flight has to continue the motion, not restart it.
    s.tween = { from: { ...s.view }, to, start: performance.now(), fit };
  };

  // ---- fetch + lay out ----
  // The layout is COMPUTED, not settled: see lib/graph/layout.ts. Nothing here
  // runs a tick loop or touches Math.random, so the same bookmarks produce the
  // same picture every time the page loads.
  useEffect(() => {
    let alive = true;
    fetch("/api/karakeep/graph")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Raw) => {
        if (!alive) return;
        if (!data.nodes?.length) return setStatus("empty");
        const laid = layoutGraph({ nodes: data.nodes, links: data.links });
        const raw = new Map(data.nodes.map((n) => [n.id, n]));
        const byId = new Map<string, N>();
        for (const p of laid.nodes) {
          byId.set(p.id, {
            ...raw.get(p.id)!,
            r: p.radius,
            x: p.x,
            y: p.y,
            group: p.group,
          });
        }
        const links: L[] = [];
        const pairs: { source: string; target: string }[] = [];
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
          pairs.push({ source: a.id, target: b.id });
          add(a.id, b.id);
          add(b.id, a.id);
        }
        Object.assign(g.current, {
          nodes: [...byId.values()],
          links,
          pairs,
          adj,
          byId,
          maxRadius: laid.maxRadius,
        });
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
    const matches =
      !q || status !== "ready"
        ? null
        : new Set(
            s.nodes
              .filter((n) => n.label.toLowerCase().includes(q))
              .map((n) => n.id),
          );
    s.matches = matches;
    // A search is the same kind of answer a hover is, so it dims through the
    // same layer — and the classification it starts from is kept while the dim
    // fades in, exactly like a hover's.
    const dim = dimmingAfter(s.dimSource, s.hover, matches);
    s.dimSource = dim.source;
    s.dimTarget = dim.target;
    if (!matches) return setResults([]);
    const m = s.nodes.filter((n) => matches.has(n.id));
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

    // The reduced-motion gate. It has to be a JavaScript read: a media query
    // provably cannot reach a canvas, which is drawn by script, so the global
    // CSS rule that zeroes animation does not cover any of this.
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    );
    const readReduceMotion = () => {
      s.reduce = reduceMotion?.matches === true;
    };
    readReduceMotion();
    reduceMotion?.addEventListener?.("change", readReduceMotion);

    // Returns whether anything actually changed, so the notification the
    // observer fires on `observe()` — which arrives AFTER the opening camera
    // move was started — cannot cancel it.
    const resize = (): boolean => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w === s.cssW && h === s.cssH && dpr === s.dpr) return false;
      s.dpr = dpr;
      s.cssW = w;
      s.cssH = h;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      return true;
    };
    resize();
    const ro = new ResizeObserver(() => {
      if (!resize()) return;
      // A camera move in flight was aimed at a box that no longer exists, so it
      // is dropped rather than completed: finishing a stale target is what
      // would move the graph off screen. The OPENING framing is the exception,
      // because its target is not stale — it is whatever fits the new box — and
      // dropping it would leave the graph unframed for good.
      if (s.tween?.fit)
        startCamera(fitTransform(s.nodes, s.cssW, s.cssH), true);
      else s.tween = null;
    });
    ro.observe(wrap);

    // The opening framing. It tweens because every programmatic move does — the
    // cloud settles into frame instead of teleporting into it, which is the
    // same "arrive rather than appear" the entrance bloom is doing.
    startCamera(fitTransform(s.nodes, s.cssW, s.cssH), true);

    const draw = (now: number) => {
      const dt = s.frameAt === 0 ? 16 : Math.min(64, now - s.frameAt);
      s.frameAt = now;

      // --- camera: a programmatic move tweens; a gesture has already written
      // the view, and cancelled any move that was in flight ---
      if (s.tween) {
        const tw = s.tween;
        const t = Math.min(1, (now - tw.start) / CAMERA_TWEEN_MS);
        if (t >= 1) {
          s.view = tw.to;
          s.tween = null;
        } else {
          s.view = tweenTransform(tw.from, tw.to, t);
        }
      }

      // --- the highlight dim eases toward its target instead of switching ---
      s.dim = s.reduce
        ? s.dimTarget
        : advancePresence(
            s.dim,
            s.dimTarget,
            dt,
            HOVER_DIM_IN_MS,
            HOVER_DIM_OUT_MS,
          );
      if (s.dimTarget === 0 && s.dim === 0) s.dimSource = null;

      // --- the hover card's presence, driven here rather than by React so a
      // fade never waits on a re-render ---
      s.cardProgress = s.reduce
        ? s.cardTarget
        : advancePresence(
            s.cardProgress,
            s.cardTarget,
            dt,
            HOVER_CARD_IN_MS,
            HOVER_CARD_OUT_MS,
          );

      const src = s.dimSource;
      const dim = s.dim;
      const lit = (n: N) => nodeTargetAlpha(src, n.id) === 1;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(s.dpr, s.dpr);
      ctx.translate(s.view.x, s.view.y);
      ctx.scale(s.view.k, s.view.k);

      // entrance: nodes bloom outward from center + fade in (minimal, one-shot)
      if (!s.introAt) s.introAt = now;
      const raw = Math.min(1, (now - s.introAt) / 850);
      const et = 1 - Math.pow(1 - raw, 3);
      const ps = 0.9 + 0.1 * et; // position scale (bloom)
      const rs = 0.4 + 0.6 * et; // radius scale
      const op = Math.min(1, et * 1.15); // opacity
      const labelOp = Math.max(0, (raw - 0.4) / 0.6) * 0.92;

      // The viewport box in graph units, grown so a node whose radius or label
      // pokes into view is not culled. Culling itself only starts once the
      // entrance is over: the bloom draws nodes away from the settled positions
      // the bounds were measured against.
      const bounds: Bounds = visibleBounds(
        s.view,
        s.cssW,
        s.cssH,
        s.maxRadius + LABEL_CULL_PAD_PX / Math.max(s.view.k, K_MIN),
      );
      const culling = raw >= 1;
      const inView = (n: N) => !culling || isNodeVisible(n, bounds);

      ctx.lineWidth = 1 / s.view.k;
      for (const l of s.links) {
        if (culling && !isEdgeVisible(l.a, l.b, bounds)) continue;
        const alpha =
          blendAlpha(
            EDGE_REST_ALPHA,
            edgeTargetAlpha(src, l.a.id, l.b.id),
            dim,
          ) * op;
        if (alpha < 0.004) continue;
        const rgb = edgeShowsAccent(src, l.a.id, l.b.id)
          ? ACCENT_INK
          : "255,255,255";
        ctx.strokeStyle = `rgba(${rgb},${alpha})`;
        ctx.beginPath();
        ctx.moveTo(l.a.x * ps, l.a.y * ps);
        ctx.lineTo(l.b.x * ps, l.b.y * ps);
        ctx.stroke();
      }

      for (const n of s.nodes) {
        if (!inView(n)) continue;
        const a = blendAlpha(1, nodeTargetAlpha(src, n.id), dim) * op;
        if (a < 0.004) continue;
        ctx.beginPath();
        ctx.arc(n.x * ps, n.y * ps, n.r * rs, 0, Math.PI * 2);
        // A node is drawn in its cluster's ink, so a hub and its ring of leaves
        // read as one object; an unclaimed node recedes to the neutral slate.
        // (myne-md/myne#727's colour-groups, reduced to one ink per hub.)
        ctx.fillStyle = `rgba(${inkFor(n.group)},${a})`;
        ctx.fill();
      }

      // A tag hub carries a ring in the neutral ink on top of its cluster
      // colour, so it reads as a hub against any of them — a tag is a category
      // rather than a bookmark. Drawn after every disc so it is never buried
      // under a neighbour, and it dims with the highlight exactly like a fill.
      ctx.lineWidth = 1.5 / s.view.k;
      for (const n of s.nodes) {
        if (n.kind !== "tag" || !inView(n)) continue;
        const a = blendAlpha(1, nodeTargetAlpha(src, n.id), dim) * op;
        if (a < 0.004) continue;
        ctx.strokeStyle = `rgba(226,232,240,${a})`;
        ctx.beginPath();
        ctx.arc(n.x * ps, n.y * ps, n.r * rs, 0, Math.PI * 2);
        ctx.stroke();
      }

      // The hovered node's anchor ring, drawn after every disc so it sits above
      // its neighbours: with several nodes the same size, the anchor of the
      // highlight has to be unmistakable. It fades with the dim, so releasing a
      // hover lets the ring go rather than plucking it off.
      const anchor = src?.hover ? s.byId.get(src.hover.id) : undefined;
      if (anchor && dim > 0.02 && inView(anchor)) {
        ctx.lineWidth = 2 / s.view.k;
        ctx.strokeStyle = `rgba(${ACCENT_INK},${0.95 * dim})`;
        ctx.beginPath();
        ctx.arc(anchor.x * ps, anchor.y * ps, anchor.r * rs, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ---- labels in screen space: fixed size + collision avoidance so the
      // biggest hubs stay readable and never overlap (skipped labels reappear
      // as you zoom in / hover) ----
      //
      // Placed to the RIGHT of the node and vertically centred on it, the way
      // myne sets a label (`n.x + radiusOf(n) + 2`, middle baseline) rather than
      // centred under it. Under a node a label costs its own height in vertical
      // space and collides with the ring of leaves beneath; beside it, it sits
      // in the clear gap the ring was laid out around.
      const W = s.cssW;
      const H = s.cssH;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.font = "12px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const drawn: [number, number, number, number][] = [];
      if (labelOp > 0.02) {
        // Lit labels claim their space first, then the big hubs: a dimmed
        // label must never push a highlighted one out of the way.
        const tags = s.nodes
          .filter((n) => n.kind === "tag" && inView(n))
          .sort((a, b) => Number(lit(b)) - Number(lit(a)) || b.r - a.r);
        for (const n of tags) {
          const sx = s.view.x + s.view.k * (n.x * ps + n.r * rs) + 4;
          const sy = s.view.y + s.view.k * n.y * ps;
          if (sx < -40 || sx > W + 40 || sy < NAV - 20 || sy > H + 20) continue;
          const w = ctx.measureText(n.label).width;
          const box: [number, number, number, number] = [
            sx - 2,
            sy - 7,
            sx + w + 2,
            sy + 7,
          ];
          const force = lit(n);
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
            const a = blendAlpha(1, nodeTargetAlpha(src, n.id), dim);
            ctx.fillStyle = `rgba(226,232,240,${labelOp * a})`;
            ctx.fillText(n.label, sx, sy);
            drawn.push(box);
          }
        }
      }

      if (s.card && cardRef.current) {
        const el = cardRef.current;
        const sx = s.view.x + s.view.k * s.card.x;
        const sy = s.view.y + s.view.k * s.card.y;
        const cw = el.offsetWidth;
        const ch = el.offsetHeight;
        let left = sx + s.card.r * s.view.k + 14;
        if (left + cw > W - 12) left = sx - s.card.r * s.view.k - 14 - cw;
        left = Math.max(12, Math.min(left, W - cw - 12));
        const top = Math.max(NAV, Math.min(sy - ch / 2, H - ch - 12));
        // Eased rather than assigned: hovering the next node slides the card
        // across instead of teleporting it there.
        if (s.cardPos === null || s.reduce) {
          s.cardPos = { x: left, y: top };
        } else {
          const ease = 1 - Math.exp(-dt / 90);
          s.cardPos.x += (left - s.cardPos.x) * ease;
          s.cardPos.y += (top - s.cardPos.y) * ease;
        }
        const frame = hoverCardFrame(s.cardProgress);
        el.style.opacity = String(frame.opacity);
        el.style.transform =
          `translate(${s.cardPos.x}px, ${s.cardPos.y}px) ` +
          `translateY(${frame.lift}px) scale(${frame.scale})`;
      }
      // Unmount only once the fade has actually finished.
      if (s.cardTarget === 0 && s.cardProgress <= 0 && s.card !== null) {
        s.card = null;
        s.cardPos = null;
        setCard(null);
      }

      s.raf = requestAnimationFrame(draw);
    };
    s.raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(s.raf);
      s.tween = null;
      ro.disconnect();
      reduceMotion?.removeEventListener?.("change", readReduceMotion);
    };
  }, [status]);

  // ---- interactions (pan + zoom + click; no node dragging) ----
  const toGraph = (px: number, py: number) => {
    const s = g.current;
    return { x: (px - s.view.x) / s.view.k, y: (py - s.view.y) / s.view.k };
  };
  const pick = (px: number, py: number): N | null => {
    const s = g.current;
    const p = toGraph(px, py);
    let best: N | null = null;
    let bestD = Infinity;
    for (const n of s.nodes) {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < n.r + 7 / s.view.k && d < bestD) {
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

  /** Point the highlight at a node (or nothing), and show/hide its card.
   *  The card's removal is only REQUESTED here; the render loop owns the fade
   *  and unmounts when the presence has run out. */
  const setHovered = (n: N | null) => {
    const s = g.current;
    const nextId = n?.id ?? null;
    if ((s.hover?.id ?? null) === nextId) return;
    s.hover = n ? buildHoverHighlight(n.id, s.pairs) : null;
    const dim = dimmingAfter(s.dimSource, s.hover, s.matches);
    s.dimSource = dim.source;
    s.dimTarget = dim.target;
    if (n) {
      if (s.card?.id !== n.id) {
        s.card = n;
        setCard(n);
      }
      s.cardTarget = 1;
    } else {
      s.cardTarget = 0;
    }
  };

  const centerOn = (n: N) => {
    const s = g.current;
    const wrap = wrapRef.current;
    if (!wrap) return;
    // Target from the framing the camera is heading for, not the one frame it
    // happens to be on, so a click during a wheel-zoom does not fight it.
    const from = s.tween ? s.tween.to : s.view;
    const k = Math.max(from.k, 1.3);
    startCamera({
      x: wrap.clientWidth / 2 - n.x * k,
      y: wrap.clientHeight / 2 - n.y * k,
      k,
    });
    setHovered(n);
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
      // Measured from the press, not from the previous event: a slow drag still
      // crosses the threshold, so a deliberate pan is never mistaken for a click.
      if (!s.moved && crossedDragThreshold(x - s.downX, y - s.downY)) {
        s.moved = true;
        // The hand takes the camera over the moment the press becomes a drag:
        // an in-flight programmatic move must not keep writing a target the
        // drag is contradicting. Deliberately HERE and not on pointerdown, so a
        // press that turns out to be a click cannot freeze a move in progress
        // (the opening framing is a move in progress).
        s.tween = null;
      }
      if (s.moved) {
        // 1:1 with the hand. A tween here would read as the interface lagging.
        s.view.x += x - s.px;
        s.view.y += y - s.py;
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
    const intent = classifyRelease(s.press?.id ?? null, s.moved);
    if (intent.kind === "node-click" && s.press) {
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
    // Zoom is accumulated on the TARGET, so a fast wheel spins through the
    // steps instead of every event restarting from wherever the tween is —
    // while the visible move stays smooth.
    const from = s.tween ? s.tween.to : s.view;
    const k2 = clampK(from.k * Math.exp(-e.deltaY * 0.0015));
    // Still anchored at the pointer: the graph point under the cursor is the
    // one that stays under it once the zoom lands.
    startCamera({
      x: mx - (mx - from.x) * (k2 / from.k),
      y: my - (my - from.y) * (k2 / from.k),
      k: k2,
    });
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
                      style={{ background: `rgb(${inkFor(n.group)})` }}
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

      {/* hover card — its position, opacity and settle are written by the render
          loop (the presence animation runs there), so it renders transparent at
          the origin and is placed on the next frame. */}
      {card && (
        <div
          ref={cardRef}
          className="pointer-events-none absolute left-0 top-0 w-[280px] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)] backdrop-blur will-change-transform"
          style={{ opacity: 0, transformOrigin: "left center" }}
        >
          {card.kind === "bookmark" ? (
            <>
              {card.cover && (
                <img
                  src={card.cover}
                  alt=""
                  className="h-28 w-full object-cover"
                />
              )}
              <div className="p-3">
                <div className="flex items-start gap-1.5">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                    {card.label}
                  </h3>
                  <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-primary" />
                </div>
                {card.excerpt && (
                  <p className="mt-1 line-clamp-2 text-xs text-light-secondary/70">
                    {card.excerpt}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {(card.tags ?? []).slice(0, 5).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-accent-primary/10 px-1.5 py-0.5 text-[10px] text-accent-primary/90"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-light-fourth">
                  {card.list && <span>{card.list}</span>}
                  {card.created && (
                    <span>
                      {new Date(card.created).toLocaleDateString("en-US", {
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
                  #{card.label}
                </h3>
                <span className="text-xs text-light-fourth">
                  {card.weight} bookmark{card.weight === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {[...(g.current.adj.get(card.id) ?? [])]
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
                {(g.current.adj.get(card.id)?.size ?? 0) > 6 && (
                  <li className="text-[11px] text-light-fourth">
                    +{(g.current.adj.get(card.id)?.size ?? 0) - 6} more
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

import {
  Boxes,
  Cpu,
  Database,
  ExternalLink,
  Github,
  Globe,
  HardDrive,
  Layers,
  Radio,
  ServerOff,
  Sparkles,
} from "lucide-react";

// Bespoke, diagram-first showcase of the MultiGroup Cloudflare infrastructure.
// Everything here is hand-drawn SVG themed to the site (AMOLED + indigo) — no
// diagram library. Rendered by app/(pages)/projects/[slug]/page.tsx for the
// `multigroup-infra` slug.

const C = {
  app: "#6366f1", // Workers / apps — indigo
  data: "#22d3ee", // D1 / KV / R2 / Vectorize — cyan
  async: "#f59e0b", // queues / cron / email — amber
  id: "#a855f7", // identity (Warden) — violet
  live: "#34d399", // durable objects / realtime — emerald
  ext: "#a1a1aa", // external — zinc
};

type ProjectMeta = {
  name: string;
  description: string | null;
  metric: string | null;
  link: string | null;
};

/* ----------------------------- svg primitives ---------------------------- */

function Box({
  x,
  y,
  w = 150,
  h = 46,
  title,
  sub,
  color = C.app,
  center = false,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  title: string;
  sub?: string;
  color?: string;
  center?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={9}
        fill="#0a0a0c"
        stroke={color}
        strokeOpacity={0.42}
      />
      {center ? (
        <text
          x={x + w / 2}
          y={y + h / 2 + 4}
          textAnchor="middle"
          fontSize={12.5}
          fontFamily="ui-monospace, monospace"
          fill="#e4e4e7"
        >
          {title}
        </text>
      ) : (
        <>
          <text
            x={x + 14}
            y={sub ? y + 20 : y + h / 2 + 4.5}
            fontSize={12.5}
            fontFamily="ui-monospace, monospace"
            fill="#e4e4e7"
          >
            {title}
          </text>
          {sub && (
            <text
              x={x + 14}
              y={y + 34}
              fontSize={9.5}
              fontFamily="ui-monospace, monospace"
              fill="#71717a"
            >
              {sub}
            </text>
          )}
        </>
      )}
    </g>
  );
}

function EdgeLabel({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={9.5}
      fontFamily="ui-monospace, monospace"
      fill="#a1a1aa"
    >
      {children}
    </text>
  );
}

function Diagram({
  title,
  caption,
  viewBox,
  minW,
  children,
}: {
  title: string;
  caption?: string;
  viewBox: string;
  minW: number;
  children: React.ReactNode;
}) {
  return (
    <figure className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 sm:p-5">
      <figcaption className="mb-3">
        <h3 className="font-mono text-sm text-white">{title}</h3>
        {caption && (
          <p className="mt-0.5 text-xs text-light-fourth">{caption}</p>
        )}
      </figcaption>
      <div className="overflow-x-auto">
        <svg
          viewBox={viewBox}
          className="h-auto w-full"
          style={{ minWidth: minW }}
          role="img"
          aria-label={title}
        >
          {children}
        </svg>
      </div>
    </figure>
  );
}

// Shared arrow markers (one set for the whole page).
function ArrowDefs() {
  const mk = (id: string, fill: string) => (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="8.5"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path d="M0,0 L10,5 L0,10 z" fill={fill} />
    </marker>
  );
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        {mk("aNeutral", "rgba(255,255,255,0.38)")}
        {mk("aAmber", "rgba(245,158,11,0.7)")}
        {mk("aViolet", "rgba(168,85,247,0.7)")}
        {mk("aLive", "rgba(52,211,153,0.7)")}
      </defs>
    </svg>
  );
}

const L = {
  neutral: {
    stroke: "rgba(255,255,255,0.2)",
    strokeWidth: 1.5,
    markerEnd: "url(#aNeutral)",
  },
  amber: {
    stroke: "rgba(245,158,11,0.55)",
    strokeWidth: 1.5,
    markerEnd: "url(#aAmber)",
  },
  live: {
    stroke: "rgba(52,211,153,0.55)",
    strokeWidth: 1.5,
    markerEnd: "url(#aLive)",
  },
} as const;

/* ------------------------------ page content ----------------------------- */

const STATS = [
  { icon: Cpu, value: "11", label: "Workers deployed" },
  { icon: Database, value: "8", label: "D1 databases" },
  { icon: HardDrive, value: "10", label: "R2 buckets" },
  { icon: Layers, value: "5", label: "KV namespaces" },
  { icon: Radio, value: "5", label: "Queues" },
  { icon: Sparkles, value: "2", label: "Vectorize + Workers AI" },
  { icon: Globe, value: "4", label: "zones · 5 custom domains" },
  { icon: ServerOff, value: "0", label: "origin servers" },
];

const APPS = [
  {
    name: "Warden",
    tag: "identity",
    color: C.id,
    desc: "Self-hosted OAuth 2.1 / OIDC provider — one MultiGroup login.",
    stack: "Astro · Better Auth · EdDSA JWKS · D1",
  },
  {
    name: "devmultigroup.com",
    tag: "community",
    color: C.app,
    desc: "Public community site: D1-backed CMS, newsletter, store, edge search.",
    stack: "Astro SSR · D1 · Workers AI · Vectorize",
  },
  {
    name: "Talaria",
    tag: "email",
    color: C.app,
    desc: "Visual email-template builder + bulk campaign sender on Queues.",
    stack: "Next.js 16 · OpenNext · Queues · Email Sending",
  },
  {
    name: "Practical Learning Institute",
    tag: "LMS",
    color: C.app,
    desc: "Premium LMS with live interactive classes recorded to VOD.",
    stack: "Astro · Durable Objects · Realtime SFU",
  },
  {
    name: "Strider",
    tag: "maps",
    color: C.app,
    desc: "Map-first, gamified social index of events, cafés & places.",
    stack: "Astro · MapLibre · Protomaps PMTiles · D1 geo",
  },
];

const HIGHLIGHTS = [
  {
    title: "A self-hosted identity provider at the edge",
    body: "Warden runs OAuth 2.1 / OIDC on Workers + D1 with asymmetric (EdDSA) ID tokens and a JWKS endpoint — dropping Auth0. Four apps federate to it, yet each keeps its own sessions and local roles: login is federated, authorization stays local.",
  },
  {
    title: "Real Durable Objects + WebRTC, not a toy",
    body: "The Institute runs live classrooms on an app-authored LiveRoom Durable Object (WebSocket Hibernation, presence, chat, hand-raise, attendance → D1) fronted by Cloudflare's Realtime SFU, gated by a 60-second HMAC handshake.",
  },
  {
    title: "A three-Worker email platform",
    body: "app + cron + queue-consumer turn Cloudflare Email Sending's ~200/day soft cap into a feature: per-batch quota reservation in D1, park-and-resume across days, send-time bounce auto-suppression, click tracking with no open pixels — all KVKK-compliant.",
  },
  {
    title: "One cache idiom, reused fleet-wide",
    body: "Every SSR app uses a version-stamped KV read-through cache (c:ns:version:key + a cv:ns counter), so an admin write bumps a version and invalidates a whole namespace in O(1) — no purge API, guaranteed-fresh first read.",
  },
  {
    title: "Edge semantic search, done honestly",
    body: "Workers AI (bge-m3, 1024-dim) → Vectorize, routed through an AI Gateway for cost logging, embeddings de-duplicated by content hash in KV — with a graceful D1 LIKE fallback when the binding is absent.",
  },
];

/* --------------------------------- page ---------------------------------- */

export default function InfraShowcase({ project }: { project: ProjectMeta }) {
  return (
    <div className="mt-24 max-w-3xl mx-auto px-4 pb-24 sm:px-6 lg:px-8">
      <ArrowDefs />

      {/* header */}
      <header className="animate-fade-in-up">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-accent-primary/80">
          Infrastructure · Cloudflare-native
        </p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          {project.name}
        </h1>
        {project.description && (
          <p className="mt-4 max-w-3xl text-light-secondary/85 leading-relaxed">
            {project.description}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {project.metric && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-3 py-1 font-mono text-xs text-accent-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {project.metric}
            </span>
          )}
          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-zinc-950 px-3 py-1.5 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-primary/50"
            >
              <ExternalLink className="h-4 w-4" />
              devmultigroup.com
            </a>
          )}
          <a
            href="https://github.com/multigroupco"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-zinc-950 px-3 py-1.5 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-primary/50"
          >
            <Github className="h-4 w-4" />
            github.com/multigroupco
          </a>
        </div>
      </header>

      {/* stat tiles */}
      <section className="mt-10 grid grid-cols-2 gap-3 animate-fade-in-up delay-100 sm:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4"
          >
            <s.icon className="h-4 w-4 text-accent-primary/70" />
            <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-white">
              {s.value}
            </div>
            <div className="mt-0.5 text-[11px] leading-tight text-light-fourth">
              {s.label}
            </div>
          </div>
        ))}
      </section>

      {/* architecture */}
      <section className="mt-12 animate-fade-in-up delay-150">
        <SectionTitle>System map</SectionTitle>
        <p className="mb-4 max-w-3xl text-sm text-light-secondary/70">
          One Cloudflare account, one identity spine, a fleet of edge-rendered
          apps sitting on a shared platform fabric.
        </p>
        <Diagram
          title="Edge → apps → shared fabric"
          caption="Every request is SSR'd on a Worker; all apps authenticate through Warden and read/write per-app data stores on the same fabric."
          viewBox="0 0 900 560"
          minW={600}
        >
          <ArchitectureDiagram />
        </Diagram>
      </section>

      {/* apps */}
      <section className="mt-12 animate-fade-in-up">
        <SectionTitle>The apps</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {APPS.map((a) => (
            <div
              key={a.name}
              className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 transition-colors hover:border-white/[0.12]"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: a.color }}
                />
                <h3 className="font-semibold text-white">{a.name}</h3>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-light-fourth">
                  {a.tag}
                </span>
              </div>
              <p className="mt-2 text-sm text-light-secondary/80">{a.desc}</p>
              <p className="mt-2 font-mono text-[11px] text-light-fourth">
                {a.stack}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* subsystem flows */}
      <section className="mt-12 animate-fade-in-up">
        <SectionTitle>How the pieces move</SectionTitle>
        <div className="grid gap-4">
          <Diagram
            title="Warden — single sign-on"
            caption="Every app is an OIDC relying party; Warden federates login, apps gate authorization locally."
            viewBox="0 0 920 170"
            minW={600}
          >
            <WardenFlow />
          </Diagram>

          <Diagram
            title="Talaria — email campaign pipeline"
            caption="Fire-and-forget sends: the API enqueues in ~50ms; a cron + queue-consumer meter delivery against the daily cap and auto-suppress bounces."
            viewBox="0 0 920 210"
            minW={600}
          >
            <EmailFlow />
          </Diagram>

          <Diagram
            title="Institute — live classroom"
            caption="A LiveRoom Durable Object handles presence & chat over hibernating WebSockets; media flows peer-to-SFU over WebRTC."
            viewBox="0 0 920 190"
            minW={600}
          >
            <LiveFlow />
          </Diagram>
        </div>
      </section>

      {/* highlights */}
      <section className="mt-12 animate-fade-in-up">
        <SectionTitle>Engineering highlights</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {HIGHLIGHTS.map((h) => (
            <div
              key={h.title}
              className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4"
            >
              <h3 className="font-semibold text-white">{h.title}</h3>
              <p className="mt-1.5 text-sm text-light-secondary/75 leading-relaxed">
                {h.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
      <Boxes className="h-4 w-4 text-accent-primary/70" />
      {children}
    </h2>
  );
}

/* ------------------------------- diagrams -------------------------------- */

function ArchitectureDiagram() {
  const apps = [
    { name: "Warden", sub: "identity", color: C.id },
    { name: "devmultigroup", sub: "community", color: C.app },
    { name: "Talaria", sub: "email", color: C.app },
    { name: "Institute", sub: "LMS · live", color: C.app },
    { name: "Strider", sub: "maps", color: C.app },
  ];
  const AW = 150;
  const step = 172.5;
  const x = (i: number) => 30 + i * step;
  const cx = (i: number) => x(i) + AW / 2;
  const appY = 150;
  const appH = 66;

  return (
    <>
      {/* edge pill */}
      <rect
        x={30}
        y={28}
        width={840}
        height={36}
        rx={18}
        fill="#0a0a0c"
        stroke={C.ext}
        strokeOpacity={0.4}
      />
      <text
        x={450}
        y={51}
        textAnchor="middle"
        fontSize={12.5}
        fontFamily="ui-monospace, monospace"
        fill="#d4d4d8"
      >
        Cloudflare DNS · Edge · WAF — devmultigroup.com
      </text>

      {/* edge → apps */}
      {apps.map((_, i) => (
        <line key={i} x1={cx(i)} y1={64} x2={cx(i)} y2={appY} {...L.neutral} />
      ))}

      {/* OIDC identity bus (Warden → RP apps) */}
      <path
        d={`M ${cx(0)} ${appY} L ${cx(0)} 132 L ${cx(4)} 132`}
        fill="none"
        stroke={C.id}
        strokeOpacity={0.5}
        strokeWidth={1.4}
        strokeDasharray="4 4"
      />
      {[1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={cx(i)}
          y1={132}
          x2={cx(i)}
          y2={appY}
          stroke={C.id}
          strokeOpacity={0.5}
          strokeWidth={1.4}
          strokeDasharray="4 4"
        />
      ))}
      <text
        x={cx(2) + 6}
        y={126}
        textAnchor="middle"
        fontSize={9.5}
        fontFamily="ui-monospace, monospace"
        fill={C.id}
      >
        OIDC · single sign-on
      </text>

      {/* apps */}
      {apps.map((a, i) => (
        <Box
          key={a.name}
          x={x(i)}
          y={appY}
          w={AW}
          h={appH}
          title={a.name}
          sub={a.sub}
          color={a.color}
        />
      ))}

      {/* apps → fabric */}
      {apps.map((_, i) => (
        <line
          key={i}
          x1={cx(i)}
          y1={appY + appH}
          x2={cx(i)}
          y2={300}
          {...L.neutral}
        />
      ))}

      {/* fabric container */}
      <rect
        x={30}
        y={300}
        width={840}
        height={232}
        rx={14}
        fill="rgba(255,255,255,0.015)"
        stroke="rgba(255,255,255,0.08)"
      />
      <text
        x={46}
        y={322}
        fontSize={11}
        fontFamily="ui-monospace, monospace"
        fill="#71717a"
      >
        SHARED PLATFORM FABRIC
      </text>

      {/* fabric chips — row 1 (data) */}
      {[
        { t: "D1 · ×8", s: "per-app SQLite", c: C.data },
        { t: "KV · ×5", s: "version-stamped cache", c: C.data },
        { t: "R2 · ×10", s: "media + assets", c: C.data },
        { t: "Workers AI + Vectorize", s: "bge-m3 · ×2 indexes", c: C.data },
      ].map((chip, j) => (
        <Box
          key={chip.t}
          x={44 + j * 207.3}
          y={340}
          w={190}
          h={48}
          title={chip.t}
          sub={chip.s}
          color={chip.c}
        />
      ))}

      {/* fabric chips — row 2 (async + realtime) */}
      {[
        { t: "Queues · ×5", s: "mail-sends · embeds (+DLQ)", c: C.async },
        { t: "Cron", s: "talaria-cron · every min", c: C.async },
        { t: "Email Sending", s: "SPF · DKIM · DMARC", c: C.async },
        { t: "Durable Objects + SFU", s: "live classrooms", c: C.live },
      ].map((chip, j) => (
        <Box
          key={chip.t}
          x={44 + j * 207.3}
          y={456}
          w={190}
          h={48}
          title={chip.t}
          sub={chip.s}
          color={chip.c}
        />
      ))}
    </>
  );
}

function WardenFlow() {
  return (
    <>
      <Box x={20} y={60} w={130} title="User" color={C.ext} center />
      <Box
        x={230}
        y={60}
        w={150}
        title="App (RP)"
        sub="PKCE + state"
        color={C.app}
      />
      <Box
        x={470}
        y={60}
        w={150}
        title="Warden IdP"
        sub="/authorize"
        color={C.id}
      />
      <Box
        x={720}
        y={60}
        w={170}
        title="D1 kunye-db"
        sub="verify user + role"
        color={C.data}
      />

      <line x1={150} y1={83} x2={230} y2={83} {...L.neutral} />
      <EdgeLabel x={190} y={76}>
        gated route
      </EdgeLabel>

      <line x1={380} y1={83} x2={470} y2={83} {...L.neutral} />
      <EdgeLabel x={425} y={76}>
        302 redirect
      </EdgeLabel>

      <line x1={620} y1={83} x2={720} y2={83} {...L.neutral} />
      <EdgeLabel x={670} y={76}>
        lookup
      </EdgeLabel>

      {/* return: Warden → App (ID token) */}
      <path
        d="M 545 106 L 545 140 L 305 140 L 305 106"
        fill="none"
        stroke="rgba(168,85,247,0.5)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        markerEnd="url(#aViolet)"
      />
      <text
        x={425}
        y={156}
        textAnchor="middle"
        fontSize={9.5}
        fontFamily="ui-monospace, monospace"
        fill={C.id}
      >
        ID token (EdDSA) + role claim · verified via /jwks
      </text>
    </>
  );
}

function EmailFlow() {
  return (
    <>
      <Box x={20} y={82} w={140} title="Campaign UI" color={C.app} />
      <Box x={200} y={82} w={140} title="API /send" color={C.app} />
      <Box x={380} y={82} w={150} title="Queue mail-sends" color={C.async} />
      <Box x={570} y={82} w={150} title="queue-consumer" color={C.app} />
      <Box x={760} y={20} w={140} title="Email Sending" color={C.async} />
      <Box
        x={760}
        y={144}
        w={140}
        title="unsubscribes"
        sub="D1 suppress-list"
        color={C.data}
      />
      <Box
        x={380}
        y={20}
        w={150}
        title="talaria-cron"
        sub="every minute"
        color={C.async}
      />

      <line x1={160} y1={105} x2={200} y2={105} {...L.neutral} />
      <line x1={340} y1={105} x2={380} y2={105} {...L.neutral} />
      <EdgeLabel x={360} y={98}>
        enqueue
      </EdgeLabel>
      <line x1={530} y1={105} x2={570} y2={105} {...L.neutral} />
      <EdgeLabel x={550} y={98}>
        batch·retry×3
      </EdgeLabel>

      {/* consumer → email */}
      <path d="M 720 95 L 745 95 L 745 44 L 760 44" fill="none" {...L.amber} />
      <EdgeLabel x={735} y={70}>
        send
      </EdgeLabel>
      {/* consumer → unsubscribes */}
      <path
        d="M 720 115 L 745 115 L 745 168 L 760 168"
        fill="none"
        stroke="rgba(34,211,238,0.5)"
        strokeWidth={1.5}
        markerEnd="url(#aNeutral)"
      />
      <EdgeLabel x={735} y={140}>
        bounce → suppress
      </EdgeLabel>

      {/* cron → queue */}
      <path d="M 455 68 L 455 82" fill="none" {...L.amber} />
      <EdgeLabel x={455} y={64}>
        due scheduled
      </EdgeLabel>
    </>
  );
}

function LiveFlow() {
  return (
    <>
      <Box
        x={20}
        y={72}
        w={140}
        title="Browser"
        sub="React island"
        color={C.app}
      />
      <Box
        x={230}
        y={20}
        w={170}
        title="Institute Worker"
        sub="auth · 60s HMAC"
        color={C.app}
      />
      <Box
        x={230}
        y={122}
        w={170}
        title="Realtime SFU"
        sub="media relay"
        color={C.live}
      />
      <Box
        x={480}
        y={72}
        w={180}
        title="LiveRoom DO"
        sub="WS hibernation"
        color={C.live}
      />
      <Box
        x={730}
        y={72}
        w={170}
        title="D1 institute-db"
        sub="attendance"
        color={C.data}
      />

      {/* token */}
      <path
        d="M 160 88 L 195 88 L 195 44 L 230 44"
        fill="none"
        {...L.neutral}
      />
      <EdgeLabel x={205} y={72}>
        token
      </EdgeLabel>
      {/* WS to DO */}
      <line x1={400} y1={95} x2={480} y2={95} {...L.live} />
      <EdgeLabel x={440} y={88}>
        WS /rooms
      </EdgeLabel>
      {/* DO -> D1 */}
      <line x1={660} y1={95} x2={730} y2={95} {...L.neutral} />
      <EdgeLabel x={695} y={88}>
        attendance
      </EdgeLabel>
      {/* WebRTC browser <-> SFU */}
      <path
        d="M 160 120 L 195 120 L 195 146 L 230 146"
        fill="none"
        stroke="rgba(52,211,153,0.55)"
        strokeWidth={1.5}
        markerEnd="url(#aLive)"
        markerStart="url(#aLive)"
      />
      <EdgeLabel x={205} y={168}>
        WebRTC
      </EdgeLabel>
    </>
  );
}

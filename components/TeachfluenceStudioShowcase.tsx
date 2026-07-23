import { ExternalLink } from "lucide-react";

// Bespoke, text-focused showcase for the Teachfluence Studio mobile app.
// Rendered by app/(pages)/projects/[slug]/page.tsx for the `teachfluence-studio`
// slug. Images live in /public/projects/teachfluence-studio/.

const IMG = "/projects/teachfluence-studio";

type ProjectMeta = {
  name: string;
  description: string | null;
  metric: string | null;
  link: string | null;
};

const SHOTS = [
  { src: "home", cap: "Home · KPIs & triage" },
  { src: "sales", cap: "Sales & revenue" },
  { src: "students", cap: "Students roster" },
  { src: "support", cap: "Support inbox" },
  { src: "community", cap: "Community" },
  { src: "notifications", cap: "Notifications" },
  { src: "promotions", cap: "Promotions" },
  { src: "profile", cap: "Profile" },
];

const FEATURES = [
  {
    name: "Home",
    body: "A KPI snapshot, an “action needed” triage queue, and quick org switching, backed by iOS home-screen widgets.",
  },
  {
    name: "Sales & revenue",
    body: "Net revenue, orders, subscribers, product & promotion performance, and payouts.",
  },
  {
    name: "Students",
    body: "The org roster: search, tag filters, multi-select bulk actions, and a filter-driven export via the native Save-to-Files picker.",
  },
  {
    name: "Support",
    body: "The support console: status & channel filters, assignment, reply, and resolve.",
  },
  {
    name: "Community",
    body: "Dashboard, spaces, posts, moderation, events, and gamification.",
  },
  {
    name: "Notifications",
    body: "In-app feed plus push that deep-links straight to the screen that needs you.",
  },
];

const TECH = [
  "Expo SDK 56",
  "React Native 0.85",
  "React 19",
  "expo-router",
  "Relay (GraphQL)",
  "TypeScript (strict)",
  "Reanimated 4",
  "iOS widgets",
];

const NOTES = [
  {
    t: "Multi-tenant & admin-only",
    b: "Org-scoped auth (OTP email + Google Sign-In). Every screen gates on the loaded role before its query mounts, so admin-only fields never fire for a non-admin, and org tenancy is enforced server-side too.",
  },
  {
    t: "A bottom bar you configure",
    b: "Home + up to three configurable middle slots + More, stored per org. Each pool item has two entry points: a root tab (no back button) and a flat route the More hub pushes.",
  },
  {
    t: "Product-module gating",
    b: "Surfaces tied to a product module (Community, Support, Forms, CRM…) hide from both the bar and the More hub when the module is off, optimistically while the role loads.",
  },
  {
    t: "i18n in tr / en / de",
    b: "An external-store pattern (not Context) with one namespace file per feature; every key exists in all three locales or falls back to English.",
  },
];

export default function TeachfluenceStudioShowcase({
  project,
}: {
  project: ProjectMeta;
}) {
  return (
    <div className="mt-24 max-w-3xl mx-auto px-4 pb-24 sm:px-6 lg:px-8">
      {/* header */}
      <header className="animate-fade-in-up">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-accent-primary/80">
          Mobile · admin companion
        </p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          {project.name}
        </h1>
        {project.description && (
          <p className="mt-4 text-light-secondary/85 leading-relaxed">
            {project.description}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {project.metric && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-3 py-1 font-mono text-xs text-accent-primary">
              {project.metric}
            </span>
          )}
          <a
            href="https://teachfluence.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-zinc-950 px-3 py-1.5 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-primary/50"
          >
            <ExternalLink className="h-4 w-4" />
            teachfluence.com
          </a>
        </div>
      </header>

      {/* banner */}
      <img
        src={`${IMG}/banner.webp`}
        alt="Teachfluence Studio, the admin companion app"
        className="mt-8 w-full rounded-xl border border-white/[0.06] animate-fade-in delay-100"
        loading="eager"
      />

      {/* overview */}
      <section className="mt-10 animate-fade-in-up">
        <p className="text-light-secondary/85 leading-relaxed">
          <strong className="text-white">Teachfluence Studio</strong> is the
          admin/agent-only mobile companion to the Teachfluence academy
          platform. It is deliberately <em>not</em> a learner app. Every screen
          sits behind an organization admin/agent role and reads admin-only data
          over the same GraphQL API as the web admin.
        </p>
        <p className="mt-4 text-light-secondary/85 leading-relaxed">
          It’s built to be a focused, on-the-go surface: check today’s numbers,
          clear the grading and support queues, moderate the community, look up
          a student, and get a push when something needs you, without opening a
          laptop.
        </p>
      </section>

      {/* features */}
      <section className="mt-12 animate-fade-in-up">
        <SectionTitle>What it does</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.name}
              className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4"
            >
              <h3 className="font-semibold text-white">{f.name}</h3>
              <p className="mt-1.5 text-sm text-light-secondary/75 leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* screenshot gallery */}
      <section className="mt-12 animate-fade-in-up">
        <SectionTitle>A look inside</SectionTitle>
        <div
          className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, #000 2rem, #000 calc(100% - 2rem), transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, #000 2rem, #000 calc(100% - 2rem), transparent)",
          }}
        >
          <ul className="flex w-max gap-4 pb-2">
            {SHOTS.map((s) => (
              <li key={s.src} className="w-[190px] shrink-0">
                <img
                  src={`${IMG}/${s.src}.webp`}
                  alt={`${s.cap}, Teachfluence Studio screenshot`}
                  className="w-full rounded-2xl border border-white/[0.08]"
                  loading="lazy"
                />
                <p className="mt-2 text-center text-xs text-light-fourth">
                  {s.cap}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* under the hood */}
      <section className="mt-12 animate-fade-in-up">
        <SectionTitle>Under the hood</SectionTitle>
        <ul className="mb-5 flex flex-wrap gap-2">
          {TECH.map((t) => (
            <li
              key={t}
              className="rounded-full border border-white/[0.08] bg-zinc-950/60 px-3 py-1 font-mono text-xs text-light-secondary"
            >
              {t}
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          {NOTES.map((n) => (
            <div
              key={n.t}
              className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4"
            >
              <h3 className="font-semibold text-white">{n.t}</h3>
              <p className="mt-1.5 text-sm text-light-secondary/75 leading-relaxed">
                {n.b}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* role */}
      <section className="mt-12 animate-fade-in-up">
        <SectionTitle>My role</SectionTitle>
        <p className="text-light-secondary/85 leading-relaxed">
          I lead this app end-to-end at Teachfluence: architecture, the
          Relay/GraphQL data layer, the customizable per-org navigation, the
          admin-only gating model, the tr/en/de localization, and the iOS
          home-screen widgets. It’s the on-the-go half of the Teachfluence admin
          experience.
        </p>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-lg font-semibold text-white">{children}</h2>;
}

import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));

// SSR everywhere (this site is DB-backed and dynamic), served by the standalone
// Node adapter (containerized). React components from the old Next app are reused
// as islands. Native deps (sharp/argon2/postgres/exifr) stay external so they're
// required from node_modules at runtime rather than bundled.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  // Prefetch same-origin links on hover so a click is served from the HTTP
  // cache instead of paying a full document round-trip. `prefetchAll: false`
  // keeps it to links the reader actually hovers (prefetchAll would fire a
  // request for every link on load).
  prefetch: { prefetchAll: false, defaultStrategy: "hover" },
  integrations: [react(), tailwind({ applyBaseStyles: false })],
  vite: {
    resolve: {
      alias: { "@": root.replace(/\/$/, "") },
    },
    ssr: {
      external: [
        "sharp",
        "argon2",
        "postgres",
        "exifr",
        "iron-session",
        "@markdoc/markdoc",
      ],
    },
  },
  server: { port: 3000, host: true },
});

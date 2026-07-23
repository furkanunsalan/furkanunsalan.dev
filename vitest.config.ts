import { defineConfig } from "vitest/config";
import path from "node:path";

const root = process.cwd();

// Pure-function unit tests. `server-only` is aliased to a stub so server-side
// helpers (uploads, db-errors, …) import cleanly under the node test env.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: [
      {
        find: "server-only",
        replacement: path.resolve(root, "tests/stubs/server-only.ts"),
      },
      { find: /^@\//, replacement: path.resolve(root) + "/" },
    ],
  },
});

import "dotenv/config";
import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  // Drizzle Kit runs locally — fall back to .env.local for the URL.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("node:fs");
  try {
    const raw = fs.readFileSync(".env.local", "utf8");
    const match = raw.match(/^DATABASE_URL=(.+)$/m);
    if (match) process.env.DATABASE_URL = match[1].trim();
  } catch {
    /* no .env.local */
  }
}

export default {
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;

#!/usr/bin/env node
/**
 * Apply pending Drizzle migrations. Reads DATABASE_URL from env (or .env.local).
 *
 *   node scripts/db-migrate.mjs
 *
 * For local dev, point DATABASE_URL at the SSH tunnel:
 *   ssh -L 15432:127.0.0.1:5432 vps -N
 *   DATABASE_URL=postgres://fu_app:...@127.0.0.1:15432/furkanunsalan
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

if (!process.env.DATABASE_URL) {
  try {
    const raw = fs.readFileSync(path.join(root, ".env.local"), "utf8");
    const m = raw.match(/^DATABASE_URL=(.+)$/m);
    if (m) process.env.DATABASE_URL = m[1].trim();
  } catch {
    /* no .env.local */
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Add it to .env.local or export it.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(sql);

console.log("running migrations…");
await migrate(db, { migrationsFolder: path.join(root, "db", "migrations") });
console.log("done.");
await sql.end({ timeout: 5 });

#!/usr/bin/env node
/**
 * Hash the admin password with argon2id and write ADMIN_PASSWORD_HASH into
 * .env.pm2.secrets — a sidecar env file that PM2's ecosystem.config.cjs
 * loads but Next.js's @next/env does NOT auto-read. Next's dotenv-expand
 * silently drops every `$` in the argon2 PHC hash from any .env.* file it
 * reads at runtime, so the hash must live outside that set.
 *
 *   npm run admin:set-password -- "your password here"
 *
 * Quotes are mandatory if the password has spaces. The plaintext password is
 * never written to disk by this script.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envFile = path.join(root, ".env.pm2.secrets");

const password = process.argv.slice(2).join(" ").trim();
if (!password) {
  console.error('Usage: npm run admin:set-password -- "your password"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password too short (use at least 8 chars).");
  process.exit(1);
}

const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64 MB
  timeCost: 3,
  parallelism: 1,
});

const raw = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
const lines = raw
  .split("\n")
  .filter((l) => !l.startsWith("ADMIN_PASSWORD_HASH=") && !l.startsWith("# ADMIN_PASSWORD_HASH="));
lines.push("ADMIN_PASSWORD_HASH=" + hash);
fs.writeFileSync(envFile, lines.filter(Boolean).join("\n") + "\n", { mode: 0o600 });

console.log("Wrote ADMIN_PASSWORD_HASH to .env.pm2.secrets (chmod 600)");
console.log("");
console.log("For production, copy the same file to the VPS:");
console.log("  scp .env.pm2.secrets <vps>:/root/furkanunsalan.dev/");
console.log("  ssh <vps> 'pm2 restart furkanunsalan --update-env'");

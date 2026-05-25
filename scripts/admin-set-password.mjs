#!/usr/bin/env node
/**
 * Hash the admin password with argon2id and write ADMIN_PASSWORD_HASH into
 * .env.local. Also prints the hash on stdout so you can paste it into
 * .env.production on the VPS.
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
const envFile = path.join(root, ".env.local");

const password = process.argv.slice(2).join(" ").trim();
if (!password) {
  console.error('Usage: npm run admin:set-password -- "your password"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password too short (use at least 8 chars).");
  process.exit(1);
}

// argon2id with tuned defaults — strong but not pathological on a 7-GB VPS.
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64 MB
  timeCost: 3,
  parallelism: 1,
});

// Next's @next/env runs dotenv-expand, which treats $X in values as variable
// substitution. The argon2 PHC hash starts with $argon2id$v=19$m=… so every
// $ would silently disappear. Escape each $ with \$ before writing.
const escaped = hash.replace(/\$/g, "\\$");

const raw = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
const lines = raw
  .split("\n")
  .filter((l) => !l.startsWith("ADMIN_PASSWORD_HASH=") && !l.startsWith("# ADMIN_PASSWORD_HASH="));
lines.push("ADMIN_PASSWORD_HASH=" + escaped);
fs.writeFileSync(envFile, lines.filter(Boolean).join("\n") + "\n");

console.log("Wrote ADMIN_PASSWORD_HASH to .env.local");
console.log("");
console.log("For production, paste this single line into .env.production on the VPS:");
console.log("");
console.log("ADMIN_PASSWORD_HASH=" + escaped);
console.log("");
console.log("Then restart the app: pm2 restart furkanunsalan");

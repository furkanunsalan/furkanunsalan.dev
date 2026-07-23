#!/usr/bin/env node
/**
 * Hash the admin password with argon2id and write ADMIN_PASSWORD_HASH into
 * .env.local — the env file `npm run dev` loads via node's `--env-file`. The
 * hash is written verbatim (plain `$`, no escaping): node's `--env-file` does
 * NOT do variable expansion, so the argon2 PHC string round-trips as-is. (Do
 * not hand-edit the value to `\$…` — that backslash survives into process.env
 * and argon2.verify then throws, which surfaces as "invalid password".)
 *
 *   npm run admin:set-password -- "your password here"
 *
 * Quotes are mandatory if the password has spaces. The plaintext password is
 * never written to disk.
 *
 * For the container stack, put the same ADMIN_PASSWORD_HASH line in the compose
 * `.env` file (see .env.example) and `docker compose up -d --force-recreate app`.
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

const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64 MB
  timeCost: 3,
  parallelism: 1,
});

// Preserve every other line (including blank lines) — only the existing hash
// line is replaced, so the rest of .env.local keeps its structure.
const raw = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
const kept = raw
  .split("\n")
  .filter(
    (l) =>
      !l.startsWith("ADMIN_PASSWORD_HASH=") &&
      !l.startsWith("# ADMIN_PASSWORD_HASH="),
  );
while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
kept.push("ADMIN_PASSWORD_HASH=" + hash);
fs.writeFileSync(envFile, kept.join("\n") + "\n", { mode: 0o600 });

console.log("Wrote ADMIN_PASSWORD_HASH to .env.local (chmod 600).");
console.log("");
console.log("For the container stack, set the same line in the compose .env:");
console.log("  docker compose up -d --force-recreate app");

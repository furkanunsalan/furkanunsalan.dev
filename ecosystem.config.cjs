// PM2's `env_file` directive isn't honored across all minor versions, so we
// parse env files ourselves at PM2-start time and inject every key into the
// `env` object. PM2 then propagates these into the Next.js standalone process
// at fork. Reads relative to PM2's cwd (the standalone bundle root).
//
// Two files are loaded:
//   - .env.production  — non-secret runtime config (DATABASE_URL etc.). Next's
//     @next/env ALSO reads this at request time, but its values don't contain
//     characters dotenv-expand mangles.
//   - .env.pm2.secrets — vars whose values contain literal `$` (notably the
//     argon2 PHC hash). @next/env's dotenv-expand silently drops `$VAR`-style
//     interpolations from any .env.* file it reads, including escaped `\$`
//     under some dotenv versions. Keeping these in a file Next does NOT
//     auto-load prevents the override. .secrets values win on conflict.
const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile(filename) {
  const out = {};
  const filepath = path.join(__dirname, filename);
  if (!fs.existsSync(filepath)) return out;
  for (const raw of fs.readFileSync(filepath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    val = val.replace(/\\\$/g, "$");
    out[key] = val;
  }
  return out;
}

module.exports = {
  apps: [
    {
      name: "furkanunsalan",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: "3010",
        ...loadEnvFile(".env.production"),
        ...loadEnvFile(".env.pm2.secrets"),
      },
      max_memory_restart: "512M",
    },
  ],
};

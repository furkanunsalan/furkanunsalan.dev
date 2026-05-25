#!/usr/bin/env node
/**
 * Open the SSH tunnel to the prod Postgres on a local port if it isn't already open.
 * Runs as `predev` so `npm run dev` "just works" without a separate terminal.
 *
 * Reads from .env.local:
 *   VPS_SSH_TARGET   e.g. "root@vps.example.com" (required)
 *   DB_TUNNEL_PORT   local forward port (optional, default 3333)
 *
 * The tunnel is opened with `ssh -fN -L <port>:127.0.0.1:5432 <target>` and persists
 * in the background until you kill it or restart your machine. Re-running is a no-op
 * when the port is already listening.
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const out = {};
  try {
    const raw = fs.readFileSync(path.join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  } catch {}
  return out;
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host: "127.0.0.1", port, timeout: 500 });
    sock.once("connect", () => {
      sock.end();
      resolve(true);
    });
    sock.once("error", () => resolve(false));
    sock.once("timeout", () => {
      sock.destroy();
      resolve(false);
    });
  });
}

const env = { ...loadEnvLocal(), ...process.env };
const port = Number(env.DB_TUNNEL_PORT || 3333);
const target = env.VPS_SSH_TARGET;

if (!target) {
  console.error(
    "[dev-tunnel] VPS_SSH_TARGET is not set. Add it to .env.local, e.g.:\n" +
      '  VPS_SSH_TARGET=root@your-vps-host\n' +
      "Skipping tunnel; `next dev` will start but DB reads will fail until the tunnel is up.",
  );
  process.exit(0);
}

const already = await isPortOpen(port);
if (already) {
  console.log(`[dev-tunnel] 127.0.0.1:${port} is already listening — reusing existing tunnel.`);
  process.exit(0);
}

console.log(`[dev-tunnel] opening ssh -fN -L ${port}:127.0.0.1:5432 ${target}`);
const r = spawnSync(
  "ssh",
  [
    "-fN",
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=5",
    "-o",
    "ExitOnForwardFailure=yes",
    "-o",
    "ServerAliveInterval=30",
    "-L",
    `${port}:127.0.0.1:5432`,
    target,
  ],
  { stdio: "inherit", timeout: 8000 },
);
if (r.status !== 0) {
  console.error(
    `[dev-tunnel] ssh ${r.signal ? `killed by ${r.signal}` : `exited ${r.status}`}. Continuing without tunnel — DB-backed pages will fail until prod is reachable.`,
  );
  process.exit(0);
}
console.log(`[dev-tunnel] tunnel up on 127.0.0.1:${port}`);

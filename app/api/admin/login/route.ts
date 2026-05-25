import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import argon2 from "argon2";
import { sessionOptions, type AdminSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";

// Two-tier in-memory rate limit. PM2 is single-fork so this is sufficient;
// if we ever scale out we'd move it to Postgres.
//
//   - per-IP bucket caps focused brute-force against a single attacker
//   - GLOBAL bucket is the backstop. We sit behind nginx that rewrites the
//     client IP into `x-forwarded-for`, but a malicious upstream (or anyone
//     who reaches the Next process directly) can rotate that header per
//     request and evade the per-IP throttle. The global counter ensures the
//     argon2 verify-rate stays bounded regardless of header spoofing.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8; // per IP per minute
const MAX_GLOBAL_ATTEMPTS = 60; // total across all IPs per minute
const MAX_BODY_BYTES = 1024;

let globalCount = 0;
let globalResetAt = 0;

function rateLimit(ip: string): boolean {
  const now = Date.now();

  // Global backstop first — cheap and resists header spoofing.
  if (globalResetAt < now) {
    globalCount = 0;
    globalResetAt = now + WINDOW_MS;
  }
  globalCount++;
  if (globalCount > MAX_GLOBAL_ATTEMPTS) return false;

  // Periodically drop expired entries so a flood of distinct IPs can't grow
  // the map without bound — cheap O(n) sweep, runs only when over a threshold.
  if (attempts.size > 256) {
    attempts.forEach((v, k) => {
      if (v.resetAt < now) attempts.delete(k);
    });
  }
  const cur = attempts.get(ip);
  if (!cur || cur.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  cur.count++;
  return cur.count <= MAX_ATTEMPTS;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "too many attempts, wait a minute" },
      { status: 429 },
    );
  }

  // Reject obviously oversized bodies early so a junk POST can't make us
  // allocate megabytes before realising it isn't a password attempt.
  const len = Number(req.headers.get("content-length") || "0");
  if (len > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "body too large" }, { status: 413 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const password = (body.password || "").trim();
  if (!password)
    return NextResponse.json({ error: "password required" }, { status: 400 });

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    // Don't disclose that the admin is mis-provisioned to unauthenticated
    // probes — that's useful recon for an attacker. Log it server-side and
    // return the same generic 401 as a wrong password.
    console.error("[admin/login] ADMIN_PASSWORD_HASH is missing — refusing");
    await new Promise((r) => setTimeout(r, 250));
    return NextResponse.json({ error: "invalid password" }, { status: 401 });
  }

  let ok = false;
  try {
    ok = await argon2.verify(hash, password);
  } catch {
    ok = false;
  }

  // Log every attempt to admin_logins so we can spot brute-force in the DB.
  await db
    .insert(schema.adminLogins)
    .values({ ip, ok })
    .catch((e) => {
      // Don't fail the login on audit-write failure, but never silently —
      // an attacker can otherwise brute-force during a Postgres outage and
      // leave no trace.
      console.error("[admin/login] audit insert failed:", e);
    });

  if (!ok) {
    // Add a tiny constant-time delay to slow online guessing further.
    await new Promise((r) => setTimeout(r, 250));
    return NextResponse.json({ error: "invalid password" }, { status: 401 });
  }

  const session = await getIronSession<AdminSession>(cookies(), sessionOptions);
  session.isAuthed = true;
  session.loggedInAt = Date.now();
  await session.save();

  return NextResponse.json({ ok: true });
}

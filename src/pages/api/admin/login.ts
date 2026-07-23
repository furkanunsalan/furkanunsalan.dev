import type { APIRoute } from "astro";
import argon2 from "argon2";
import { db, schema } from "@/lib/db";
import { saveSession } from "@/lib/session";

export const prerender = false;

// Two-tier in-memory rate limit (per-IP + global backstop that resists
// x-forwarded-for spoofing). Single container = single process, so a Map holds.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;
const MAX_GLOBAL_ATTEMPTS = 60;
const MAX_BODY_BYTES = 1024;
let globalCount = 0;
let globalResetAt = 0;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  if (globalResetAt < now) {
    globalCount = 0;
    globalResetAt = now + WINDOW_MS;
  }
  globalCount++;
  if (globalCount > MAX_GLOBAL_ATTEMPTS) return false;

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

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const POST: APIRoute = async ({ request, clientAddress, cookies }) => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    clientAddress ||
    "unknown";
  if (!rateLimit(ip)) {
    return json({ error: "too many attempts, wait a minute" }, 429);
  }

  const len = Number(request.headers.get("content-length") || "0");
  if (len > MAX_BODY_BYTES) return json({ error: "body too large" }, 413);

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const password = (body.password || "").trim();
  if (!password) return json({ error: "password required" }, 400);

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    console.error("[admin/login] ADMIN_PASSWORD_HASH is missing — refusing");
    await sleep(250);
    return json({ error: "invalid password" }, 401);
  }

  let ok = false;
  try {
    ok = await argon2.verify(hash, password);
  } catch {
    ok = false;
  }

  await db
    .insert(schema.adminLogins)
    .values({ ip, ok })
    .catch((e) => console.error("[admin/login] audit insert failed:", e));

  if (!ok) {
    await sleep(250);
    return json({ error: "invalid password" }, 401);
  }

  await saveSession(cookies, { isAuthed: true, loggedInAt: Date.now() });
  return json({ ok: true }, 200);
};

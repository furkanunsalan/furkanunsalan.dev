import type { APIRoute } from "astro";
import { sql } from "drizzle-orm";
import fs from "node:fs/promises";
import { db } from "@/lib/db";
import { UPLOADS_DIR } from "@/lib/uploads";

export const prerender = false;

// Liveness/readiness probe for Uptime-Kuma / compose. 200 when healthy, 503
// when a dependency is down. Public, no secrets in the payload.
export const GET: APIRoute = async () => {
  const checks: Record<string, "ok" | "fail"> = {};
  try {
    await db.execute(sql`select 1`);
    checks.db = "ok";
  } catch {
    checks.db = "fail";
  }
  try {
    await fs.access(UPLOADS_DIR);
    checks.uploads = "ok";
  } catch {
    checks.uploads = "fail";
  }
  const ok = Object.values(checks).every((v) => v === "ok");
  return new Response(
    JSON.stringify({
      status: ok ? "ok" : "degraded",
      checks,
      ts: new Date().toISOString(),
    }),
    {
      status: ok ? 200 : 503,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    },
  );
};

import type { APIRoute } from "astro";
import { friendlyDbError } from "@/lib/db-errors";
import { knownTables } from "@/lib/db-tables";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const GET: APIRoute = async () => {
  try {
    const tables = knownTables()
      .map((t) => t.name)
      .sort();
    return json({ ok: true, tables });
  } catch (e) {
    const f = friendlyDbError(e, "tables");
    return json({ error: f.error }, f.status);
  }
};

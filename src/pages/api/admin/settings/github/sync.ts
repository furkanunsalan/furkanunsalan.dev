import type { APIRoute } from "astro";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { revalidateCollection } from "@/lib/revalidate";
import { recordAudit } from "@/lib/audit";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

// Fetch the live public repo list from GitHub and reconcile it with the
// existing visibility rows: add new repos as visible/unpinned, preserve toggles
// for known repos, drop rows whose repo no longer exists.
export const POST: APIRoute = async ({ request }) => {
  const user = process.env.GITHUB_USERNAME || "furkanunsalan";
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return json({ error: "GITHUB_TOKEN not set on the server" }, 500);
  }
  const res = await fetch(
    `https://api.github.com/users/${user}/repos?per_page=100&type=owner&sort=updated`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!res.ok) {
    return json({ error: `github ${res.status}` }, 502);
  }
  const all = await res.json();
  const live: string[] = (
    all as {
      name: string;
      fork: boolean;
      archived: boolean;
      stargazers_count: number;
    }[]
  )
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .map((r) => r.name);

  // Reconcile in a transaction with bulk statements — replaces the previous
  // per-row loop (~100 round trips) with at most 3 queries total.
  const result = await db.transaction(async (tx) => {
    const existing = await tx.select().from(schema.githubProjectVisibility);
    const prev = new Set(existing.map((r) => r.name.toLowerCase()));
    const liveLower = new Set(live.map((n) => n.toLowerCase()));
    const toAdd = live.filter((n) => !prev.has(n.toLowerCase()));
    const toRemove = existing
      .filter((r) => !liveLower.has(r.name.toLowerCase()))
      .map((r) => r.name);

    if (toAdd.length > 0) {
      await tx.insert(schema.githubProjectVisibility).values(
        toAdd.map((name) => ({
          name,
          visible: true,
          pinned: false,
          pinOrder: 0,
        })),
      );
    }
    if (toRemove.length > 0) {
      await tx
        .delete(schema.githubProjectVisibility)
        .where(inArray(schema.githubProjectVisibility.name, toRemove));
    }
    return {
      added: toAdd.length,
      preserved: existing.length - toRemove.length,
      removed: toRemove.length,
    };
  });

  revalidateCollection("github");
  await recordAudit({
    req: request,
    action: "update",
    resource: "github",
    rowId: "sync",
    after: { ...result, total: live.length },
  });
  return json({ ok: true, ...result, total: live.length });
};

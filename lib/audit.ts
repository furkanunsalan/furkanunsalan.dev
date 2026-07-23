import { db, schema } from "@/lib/db";

export type AuditAction =
  "create" | "update" | "delete" | "restore" | "purge" | "bulk-delete";

const MAX_FIELD_BYTES = 4 * 1024;

// JSONB columns can't store Date / undefined cleanly, and Postgres rows are
// cheaper to store small. Walk the snapshot once, drop undefined keys, coerce
// Dates, and replace any single field whose serialized size exceeds 4 KB.
function trimSnapshot(
  snap: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!snap) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(snap)) {
    if (v === undefined) continue;
    let value: unknown = v;
    if (v instanceof Date) value = v.toISOString();
    let json: string;
    try {
      json = JSON.stringify(value);
    } catch {
      out[k] = "[unserializable]";
      continue;
    }
    if (json && json.length > MAX_FIELD_BYTES) {
      out[k] = "[truncated]";
    } else {
      out[k] = value;
    }
  }
  return out;
}

export async function recordAudit(opts: {
  req?: Request;
  action: AuditAction;
  resource: string;
  rowId: string | number;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const ip =
      opts.req?.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
    await db.insert(schema.auditEvents).values({
      action: opts.action,
      resource: opts.resource,
      rowId: String(opts.rowId),
      ip,
      before: trimSnapshot(opts.before),
      after: trimSnapshot(opts.after),
    });
  } catch (e) {
    // Audit write should never break the calling mutation; log and swallow.
    console.error("[audit] failed:", e);
  }
}

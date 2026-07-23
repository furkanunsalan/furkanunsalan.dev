// Drizzle wraps the real PostgresError in `cause`. The user-facing `.message`
// on the outer error is the SQL + params, which is useless to the user and
// dangerous to leak. Pull out the PG error code + message instead.
export function pgError(e: unknown): {
  code?: string;
  message: string;
  detail?: string;
} {
  if (!e || typeof e !== "object") return { message: String(e) };
  const cause = (e as { cause?: unknown }).cause;
  const inner =
    cause && typeof cause === "object"
      ? (cause as { code?: string; message?: string; detail?: string })
      : (e as { code?: string; message?: string; detail?: string });
  return {
    code: inner.code,
    message: inner.message || (e as { message?: string }).message || "db error",
    detail: inner.detail,
  };
}

export type FriendlyDbError = { error: string; status: number };

// Maps a thrown Drizzle error into a clean { error, status } pair suitable to
// return from a route handler. Pass the resource label ("place", "post", …)
// so the message reads naturally.
export function friendlyDbError(e: unknown, resource: string): FriendlyDbError {
  const { code, message, detail } = pgError(e);
  switch (code) {
    case "23505":
      return { error: `that ${resource} already exists`, status: 409 };
    case "23503":
      return { error: `referenced ${resource} not found`, status: 409 };
    case "23502":
      return { error: `missing required field`, status: 400 };
    case "22001":
      return { error: `value too long`, status: 400 };
    case "22P02":
      return { error: `invalid value (${detail || message})`, status: 400 };
    default:
      // Surface the inner message but never the SQL/params blob.
      return { error: message, status: 500 };
  }
}

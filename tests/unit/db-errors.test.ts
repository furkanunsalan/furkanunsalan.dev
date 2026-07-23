import { describe, it, expect } from "vitest";
import { friendlyDbError, pgError } from "@/lib/db-errors";

// Drizzle wraps the real PostgresError in `cause`; the outer `.message` is the
// SQL + bound params, which must never reach a client.
const drizzleLike = (code: string, message: string) => ({
  message: "SELECT secret FROM users WHERE token = $1 -- raw SQL blob",
  cause: { code, message },
});

describe("pgError", () => {
  it("prefers the inner PG message over the outer SQL blob", () => {
    const p = pgError(drizzleLike("23505", "duplicate key value"));
    expect(p.code).toBe("23505");
    expect(p.message).toBe("duplicate key value");
    expect(p.message).not.toContain("SELECT");
  });

  it("handles a plain error object", () => {
    expect(pgError(new Error("boom")).message).toBe("boom");
  });
});

describe("friendlyDbError", () => {
  it("maps unique violation (23505) to 409", () => {
    expect(friendlyDbError(drizzleLike("23505", "dup"), "post")).toEqual({
      error: "that post already exists",
      status: 409,
    });
  });

  it("maps not-null violation (23502) to 400", () => {
    expect(
      friendlyDbError(drizzleLike("23502", "null value"), "post").status,
    ).toBe(400);
  });

  it("maps value-too-long (22001) to 400", () => {
    expect(
      friendlyDbError(drizzleLike("22001", "too long"), "post").status,
    ).toBe(400);
  });

  it("never surfaces the raw SQL blob for unknown codes", () => {
    const f = friendlyDbError(
      drizzleLike("XX999", "some internal detail"),
      "post",
    );
    expect(f.status).toBe(500);
    expect(f.error).toBe("some internal detail");
    expect(f.error).not.toContain("SELECT");
  });

  it("handles a plain Error", () => {
    expect(friendlyDbError(new Error("nope"), "post")).toEqual({
      error: "nope",
      status: 500,
    });
  });
});

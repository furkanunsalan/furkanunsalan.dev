import { NextResponse } from "next/server";
import { z } from "zod";

// Validate a JSON request body against a zod schema at the API boundary.
// Returns { data } on success, or { response } — a 400 naming the first bad
// field — that the handler returns directly:
//
//   const parsed = await readJson(req, ToolCreate);
//   if ("response" in parsed) return parsed.response;
//   const { data } = parsed;
export async function readJson<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ data: z.infer<S> } | { response: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      response: NextResponse.json({ error: "bad json" }, { status: 400 }),
    };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path?.join(".");
    const msg = where
      ? `${where}: ${issue.message}`
      : issue?.message || "invalid input";
    return { response: NextResponse.json({ error: msg }, { status: 400 }) };
  }
  return { data: parsed.data };
}

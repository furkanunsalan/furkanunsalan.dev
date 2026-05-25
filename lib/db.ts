import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

declare global {
  // eslint-disable-next-line no-var
  var __pg: ReturnType<typeof postgres> | undefined;
}

function url() {
  const u = process.env.DATABASE_URL;
  if (!u) throw new Error("DATABASE_URL is not set");
  return u;
}

// Reuse the postgres-js client across HMR reloads in dev to avoid leaking
// connections every time a server file changes.
const client = global.__pg ?? postgres(url(), { max: 10, prepare: false });
if (process.env.NODE_ENV !== "production") global.__pg = client;

export const db = drizzle(client, { schema });
export { schema };

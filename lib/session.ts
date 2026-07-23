import { sealData, unsealData } from "iron-session";
import type { AstroCookies } from "astro";
import { sessionOptions, type AdminSession } from "@/lib/auth";

const password = sessionOptions.password as string;
const ttl = sessionOptions.cookieOptions?.maxAge ?? 60 * 60 * 24 * 14;

// iron-session over Astro cookies, using the low-level seal/unseal API so it
// doesn't depend on Next's req/res or cookies() helper.
export async function getSession(cookies: AstroCookies): Promise<AdminSession> {
  const raw = cookies.get(sessionOptions.cookieName)?.value;
  if (!raw) return {};
  try {
    return await unsealData<AdminSession>(raw, { password, ttl });
  } catch {
    return {};
  }
}

export async function saveSession(
  cookies: AstroCookies,
  data: AdminSession,
): Promise<void> {
  const sealed = await sealData(data, { password, ttl });
  cookies.set(sessionOptions.cookieName, sealed, {
    ...sessionOptions.cookieOptions,
  });
}

export function clearSession(cookies: AstroCookies): void {
  cookies.delete(sessionOptions.cookieName, { path: "/" });
}

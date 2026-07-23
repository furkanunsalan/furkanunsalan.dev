// Framework-agnostic in-memory data cache (replaces Next's unstable_cache).
// Single-process (one container / one Node server), so a plain Map is enough:
// successful reads are cached with a TTL + per-collection tags, a query FAILURE
// is never cached (falls through to the caller's fallback), and admin mutations
// bust the relevant tag via lib/revalidate.ts. If this ever runs multi-instance,
// swap the store for Valkey/Redis behind the same interface.

type Entry = { value: unknown; expires: number };

const TTL_MS = 60 * 60 * 1000; // 1h backstop
const store = new Map<string, Entry>();
const tagIndex = new Map<string, Set<string>>();

function keyOf(parts: string[], args: unknown[]): string {
  return parts.join(":") + "|" + JSON.stringify(args);
}

export function cachedReader<A extends unknown[], T>(
  keyParts: string[],
  tags: string[],
  fn: (...args: A) => Promise<T>,
  fallback: T,
): (...args: A) => Promise<T> {
  return async (...args: A): Promise<T> => {
    const key = keyOf(keyParts, args);
    const hit = store.get(key);
    if (hit && hit.expires > Date.now()) return hit.value as T;
    try {
      const value = await fn(...args);
      store.set(key, { value, expires: Date.now() + TTL_MS });
      for (const t of tags) {
        let set = tagIndex.get(t);
        if (!set) {
          set = new Set();
          tagIndex.set(t, set);
        }
        set.add(key);
      }
      return value;
    } catch (e) {
      console.error(`[cache:${keyParts.join(":")}] read failed:`, e);
      return fallback;
    }
  };
}

// Invalidate every cached read tagged with `tag`.
export function bustTag(tag: string): void {
  const set = tagIndex.get(tag);
  if (!set) return;
  for (const key of set) store.delete(key);
  tagIndex.delete(tag);
}

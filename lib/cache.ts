import "server-only";
import { unstable_cache } from "next/cache";

// Wrap a DB reader so successful reads are cached in Next's data cache (busted by
// tag on mutation, with a 1h backstop), while a query FAILURE is never cached:
// it falls through to `fallback` for that one request and the next request
// retries. The wrapped `fn` must THROW on failure (no internal fail-soft) for the
// not-cached-on-error guarantee to hold, and must return a JSON-serializable
// value (readers that return a Map or a Markdoc AST stay uncached).
export function cachedReader<A extends unknown[], T>(
  keyParts: string[],
  tags: string[],
  fn: (...args: A) => Promise<T>,
  fallback: T,
): (...args: A) => Promise<T> {
  const cached = unstable_cache(fn, keyParts, { tags, revalidate: 3600 });
  return async (...args: A): Promise<T> => {
    try {
      return await cached(...args);
    } catch (e) {
      console.error(`[cache:${keyParts.join(":")}] read failed:`, e);
      return fallback;
    }
  };
}

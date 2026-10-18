// Opening the search modal crosses island boundaries: the overlay lives in a
// single island mounted from the layout, while its triggers (SiteNav's
// magnifier, the ⌘K/`/` shortcuts) live in other islands. Astro islands are
// independent React roots with no shared context, so they talk over a window
// event instead. No DB import here — this rides in the client bundle.

export const SEARCH_OPEN_EVENT = "search:open";

declare global {
  interface Window {
    __searchReady?: boolean;
  }
}

type SearchOpenDetail = { query?: string };

/** Ask the overlay to open, optionally seeded with a query (deep links). */
export function openSearch(query?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<SearchOpenDetail>(SEARCH_OPEN_EVENT, {
      detail: { query },
    }),
  );
}

/** Subscribe to open requests. Returns the unsubscribe function. */
export function onOpenSearch(fn: (query: string) => void): () => void {
  const handler = (e: Event) => {
    fn((e as CustomEvent<SearchOpenDetail>).detail?.query ?? "");
  };
  window.addEventListener(SEARCH_OPEN_EVENT, handler);
  return () => window.removeEventListener(SEARCH_OPEN_EVENT, handler);
}

/** The overlay is a `client:idle` island, so a magnifier click can land before
 *  anything is listening. It marks itself ready on mount; until then a trigger
 *  lets the click through to /search rather than swallowing it. */
export function markSearchReady(): void {
  if (typeof window !== "undefined") window.__searchReady = true;
}

export function isSearchReady(): boolean {
  return typeof window !== "undefined" && window.__searchReady === true;
}

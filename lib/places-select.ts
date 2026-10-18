// Selection handoff for the places page, which is two islands rather than one:
// the map (client-only — Leaflet touches `window` at import time) and the list
// (server-rendered, so the places are in the HTML before any JS runs). React
// state cannot cross that boundary, so a row click is a window event — the same
// arrangement the nav's search affordance uses to reach the search overlay.
//
// Before the split the whole page was one client-only island, which meant the
// list's content did not exist until ~128 KB of JS had loaded and run.

const EVENT = "places:select";

/** Ask the map to focus a place, as a row click does. */
export function selectPlace(slug: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: slug }));
}

/** Subscribe to row clicks. Returns the unsubscribe. */
export function onSelectPlace(fn: (slug: string) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

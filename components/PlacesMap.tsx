"use client";

import type { Place } from "@/types";
import PlacesMapView from "./PlacesMapView";

// Leaflet touches `window` at import time, so this whole component is mounted as
// a `client:only="react"` island in Astro — it never renders on the server.

interface Props {
  places: Place[];
  lists: { name: string; icon: string }[];
  selectedSlug?: string | null;
  selectionNonce?: number;
}

export default function PlacesMap({
  places,
  lists,
  selectedSlug,
  selectionNonce,
}: Props) {
  const valid = places.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      !(p.lat === 0 && p.lng === 0),
  );
  const [centerLat, centerLng] = valid.length
    ? [
        valid.reduce((s, p) => s + p.lat, 0) / valid.length,
        valid.reduce((s, p) => s + p.lng, 0) / valid.length,
      ]
    : [41.0082, 28.9784]; // Istanbul fallback

  return (
    <div>
      <PlacesMapView
        places={valid}
        lists={lists}
        center={[centerLat, centerLng]}
        zoom={valid.length > 1 ? 11 : 13}
        selectedSlug={selectedSlug ?? null}
        selectionNonce={selectionNonce ?? 0}
      />
      {/* Attribution moved out of the map (zoom/attribution widgets are hidden
          for a cleaner look) — kept here so OSM + CARTO usage stays compliant. */}
      <p className="mt-1.5 text-[10px] text-light-fourth/60 text-right">
        Tiles{" "}
        <a
          href="https://carto.com/attributions"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-light-fourth"
        >
          © CARTO
        </a>{" "}
        ·{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-light-fourth"
        >
          © OpenStreetMap
        </a>
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { Place } from "@/types";
import PlacesMapView from "./PlacesMapView";
import { onSelectPlace } from "@/lib/places-select";

// Leaflet touches `window` at import time, so this whole component is mounted as
// a `client:only="react"` island in Astro — it never renders on the server.
//
// Selection lives here rather than in a shared parent, because the parent would
// have to be an island too and that is exactly what kept the list out of the
// HTML. The list publishes a row click on `lib/places-select` instead.

interface Props {
  places: Place[];
  lists: { name: string; icon: string }[];
}

export default function PlacesMap({ places, lists }: Props) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  // Bumps even when the same slug is picked twice in a row, so the view's effect
  // re-fires and re-focuses.
  const [nonce, setNonce] = useState(0);

  useEffect(
    () =>
      onSelectPlace((slug) => {
        setSelectedSlug(slug);
        setNonce((n) => n + 1);
      }),
    [],
  );

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
        selectedSlug={selectedSlug}
        selectionNonce={nonce}
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

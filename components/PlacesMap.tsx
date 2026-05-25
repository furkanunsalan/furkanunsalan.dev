"use client";

import dynamic from "next/dynamic";
import type { Place } from "@/types";

// Leaflet touches `window` at import time and react-leaflet ships ESM that
// breaks Next's RSC graph if rendered server-side. Dynamic import with
// ssr:false keeps the whole map bundle client-only.
const PlacesMapView = dynamic(() => import("./PlacesMapView"), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] w-full rounded-xl bg-zinc-950 grid place-items-center text-xs text-light-fourth">
      loading map…
    </div>
  ),
});

interface Props {
  places: Place[];
  lists: { name: string; icon: string }[];
}

export default function PlacesMap({ places, lists }: Props) {
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

"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { ArrowUpRight, Bookmark, Check, Heart } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./PlacesMapView.css";
import type { Place, PlaceStatus } from "@/types";

// Per-status accent. Keep in sync with STATUS_META in PlacesList.
const STATUS_COLOR: Record<PlaceStatus, string> = {
  "want-to-go": "#6366F1", // accent-primary (indigo-500)
  been: "#10b981", // emerald-500
  favorite: "#f43f5e", // rose-500
};

// Lucide-style icon paths, normalized to a 24x24 viewport so they can be
// embedded inside the pin's <g transform="translate(...) scale(...)">.
const STATUS_ICON_PATH: Record<PlaceStatus, string> = {
  // bookmark
  "want-to-go": "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
  // check
  been: "M20 6L9 17l-5-5",
  // heart
  favorite:
    "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
};

const STATUS_LABEL: Record<PlaceStatus, string> = {
  "want-to-go": "Want to go",
  been: "Been there",
  favorite: "Favorite",
};

const STATUS_RING: Record<PlaceStatus, string> = {
  "want-to-go": "ring-accent-primary",
  been: "ring-emerald-500",
  favorite: "ring-rose-500",
};

const STATUS_ICON: Record<PlaceStatus, typeof Bookmark> = {
  "want-to-go": Bookmark,
  been: Check,
  favorite: Heart,
};

// Black coin with a vibrant accent ring and a white icon in the middle.
// Mirrors the list-badge style — no teardrop tail.
function makeIcon(status: PlaceStatus) {
  const stroke = STATUS_COLOR[status];
  const iconPath = STATUS_ICON_PATH[status];
  // size: 28, ring stroke: 3 → inner black radius = 11 (28/2 - 3).
  const html = `
    <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 1.5px 2px rgba(0,0,0,.35));">
      <circle cx="14" cy="14" r="12.5" fill="#000000" stroke="${stroke}" stroke-width="3"/>
      <g transform="translate(8,8) scale(0.5)" fill="none" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="${iconPath}"/>
      </g>
    </svg>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

interface Props {
  places: Place[];
  center: [number, number];
  zoom: number;
}

export default function PlacesMapView({ places, center, zoom }: Props) {
  const icons = useMemo<Record<PlaceStatus, L.DivIcon>>(
    () => ({
      "want-to-go": makeIcon("want-to-go"),
      been: makeIcon("been"),
      favorite: makeIcon("favorite"),
    }),
    [],
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      zoomControl={false}
      attributionControl={false}
      className="places-map h-[480px] w-full rounded-xl overflow-hidden z-0"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      {places.map((p) => {
        const StatusIcon = STATUS_ICON[p.status];
        return (
          <Marker key={p.slug} position={[p.lat, p.lng]} icon={icons[p.status]}>
            <Popup>
              <div className="popup-card">
                <div className="popup-head">
                  <span
                    aria-hidden
                    className={`popup-badge inline-flex items-center justify-center w-6 h-6 rounded-full bg-black ring-2 ${STATUS_RING[p.status]} text-white shrink-0`}
                  >
                    <StatusIcon className="w-3 h-3" />
                  </span>
                  <div className="popup-name min-w-0">{p.name}</div>
                </div>
                {p.address && <p className="popup-address">{p.address}</p>}
                <div className="popup-actions">
                  {p.sourceUrl && (
                    <a
                      href={p.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="popup-action"
                    >
                      Open
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  )}
                  <span
                    className={`popup-status-chip inline-flex items-center gap-1 ${STATUS_RING[p.status]}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

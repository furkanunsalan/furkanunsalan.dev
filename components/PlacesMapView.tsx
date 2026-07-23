"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { ArrowUpRight } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./PlacesMapView.css";
import type { Place, PlaceStatus } from "@/types";
import {
  PLACE_LIST_ICON_PATHS,
  iconKey,
  type ListIconKey,
} from "@/lib/place-list-icons";
import { PLACE_LIST_ICON_COMPONENTS } from "@/lib/place-list-icons-react";

// Status drives the pin's ring color (kept in sync with PlacesList's chips).
const STATUS_COLOR: Record<PlaceStatus, string> = {
  "want-to-go": "#6366F1", // accent-primary (indigo-500)
  been: "#10b981", // emerald-500
  favorite: "#f43f5e", // rose-500
};

const STATUS_LABEL: Record<PlaceStatus, string> = {
  "want-to-go": "Want to go",
  been: "Been there",
  favorite: "Favorite",
};

const STATUS_RING_CLASS: Record<PlaceStatus, string> = {
  "want-to-go": "ring-accent-primary",
  been: "ring-emerald-500",
  favorite: "ring-rose-500",
};

// Black coin, status-colored ring, white list icon centered. The list icon's
// SVG content comes from PLACE_LIST_ICONS so it stays consistent with the
// admin picker and list chips.
function makeIcon(status: PlaceStatus, iconK: ListIconKey): L.DivIcon {
  const stroke = STATUS_COLOR[status];
  const iconContent = PLACE_LIST_ICON_PATHS[iconK];
  const html = `
    <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 1.5px 2px rgba(0,0,0,.35));">
      <circle cx="14" cy="14" r="12.5" fill="#000000" stroke="${stroke}" stroke-width="3"/>
      <g transform="translate(8,8) scale(0.5)" fill="none" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
        ${iconContent}
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
  lists: { name: string; icon: string }[];
  center: [number, number];
  zoom: number;
  selectedSlug: string | null;
  selectionNonce: number;
}

export default function PlacesMapView({
  places,
  lists,
  center,
  zoom,
  selectedSlug,
  selectionNonce,
}: Props) {
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  // Build a name → iconKey lookup from the available lists.
  const iconByList = useMemo(() => {
    const m = new Map<string, ListIconKey>();
    for (const l of lists) m.set(l.name, iconKey(l.icon));
    return m;
  }, [lists]);

  // Memoize DivIcons by "status|iconKey" so we don't recreate per render or
  // per marker. Computed lazily per combination we actually see.
  const iconCache = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    return (status: PlaceStatus, ik: ListIconKey) => {
      const key = `${status}|${ik}`;
      let icon = cache.get(key);
      if (!icon) {
        icon = makeIcon(status, ik);
        cache.set(key, icon);
      }
      return icon;
    };
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      zoomControl={false}
      attributionControl={false}
      className="places-map h-[480px] w-full rounded-xl overflow-hidden z-0"
    >
      <SelectionDriver
        places={places}
        selectedSlug={selectedSlug}
        selectionNonce={selectionNonce}
        markerRefs={markerRefs}
      />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <PlaceMarkers
        places={places}
        iconByList={iconByList}
        iconCache={iconCache}
        markerRefs={markerRefs}
      />
    </MapContainer>
  );
}

// Wraps the marker rendering so we can call useMap() and attach a click
// handler that recenters the map on the clicked pin — same behavior as
// selecting a row in the list. Leaflet still opens the popup on click by
// default, so we only need to fly here.
function PlaceMarkers({
  places,
  iconByList,
  iconCache,
  markerRefs,
}: {
  places: Place[];
  iconByList: Map<string, ListIconKey>;
  iconCache: (status: PlaceStatus, ik: ListIconKey) => L.DivIcon;
  markerRefs: React.MutableRefObject<Map<string, L.Marker>>;
}) {
  const map = useMap();
  return (
    <>
      {places.map((p) => {
        const ik = iconByList.get(p.list || "") ?? iconKey(null);
        const IconComp = PLACE_LIST_ICON_COMPONENTS[ik];
        return (
          <Marker
            key={p.slug}
            position={[p.lat, p.lng]}
            icon={iconCache(p.status, ik)}
            eventHandlers={{
              click: () => {
                const desiredZoom = Math.max(map.getZoom(), 15);
                map.flyTo([p.lat, p.lng], desiredZoom, { duration: 0.6 });
              },
            }}
            ref={(m) => {
              if (m) markerRefs.current.set(p.slug, m);
              else markerRefs.current.delete(p.slug);
            }}
          >
            <Popup autoPan={false}>
              <div className="popup-card">
                <div className="popup-head">
                  <span
                    aria-hidden
                    className={`popup-badge inline-flex items-center justify-center w-6 h-6 rounded-full bg-black ring-2 ${STATUS_RING_CLASS[p.status]} text-white shrink-0`}
                  >
                    <IconComp className="w-3 h-3" />
                  </span>
                  <div className="popup-name min-w-0">{p.name}</div>
                </div>
                {p.address && <p className="popup-address">{p.address}</p>}
                {p.notes && <p className="popup-notes">{p.notes}</p>}
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
                    className={`popup-status-chip inline-flex items-center gap-1 ${STATUS_RING_CLASS[p.status]}`}
                  >
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

// Drives map view + popup state from props passed in from outside the
// MapContainer. Lives inside MapContainer so it can call useMap(). Re-fires
// whenever selectionNonce bumps — even when the same slug is clicked twice.
function SelectionDriver({
  places,
  selectedSlug,
  selectionNonce,
  markerRefs,
}: {
  places: Place[];
  selectedSlug: string | null;
  selectionNonce: number;
  markerRefs: React.MutableRefObject<Map<string, L.Marker>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedSlug) return;
    const target = places.find((p) => p.slug === selectedSlug);
    if (!target) return;
    const desiredZoom = Math.max(map.getZoom(), 15);
    map.getContainer().scrollIntoView({ behavior: "smooth", block: "center" });
    map.flyTo([target.lat, target.lng], desiredZoom, { duration: 0.6 });
    const openOnDone = () => {
      markerRefs.current.get(selectedSlug)?.openPopup();
    };
    map.once("moveend", openOnDone);
    return () => {
      map.off("moveend", openOnDone);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug, selectionNonce]);
  return null;
}

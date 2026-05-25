"use client";

import { useCallback, useRef, useState } from "react";
import PlacesMap from "./PlacesMap";
import PlacesList from "./PlacesList";
import type { Place } from "@/types";

interface Props {
  places: Place[];
  lists: { name: string; icon: string }[];
}

// Lifts selection state so a row click in the list can drive a flyTo + popup
// open in the map. The nonce bumps even when the same slug is clicked twice in
// a row so the map effect re-fires.
export default function PlacesSection({ places, lists }: Props) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const nonceRef = useRef(0);
  const [nonce, setNonce] = useState(0);

  const selectPlace = useCallback((slug: string) => {
    setSelectedSlug(slug);
    nonceRef.current += 1;
    setNonce(nonceRef.current);
  }, []);

  return (
    <>
      <PlacesMap
        places={places}
        lists={lists}
        selectedSlug={selectedSlug}
        selectionNonce={nonce}
      />
      <div className="mt-10">
        <PlacesList places={places} lists={lists} onSelect={selectPlace} />
      </div>
    </>
  );
}

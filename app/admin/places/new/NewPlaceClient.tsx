"use client";

import { useState } from "react";
import PlaceForm, { type PlaceFormValue } from "../PlaceForm";
import ResolveUrlPanel from "../ResolveUrlPanel";

const EMPTY: PlaceFormValue = {
  slug: "",
  name: "",
  lat: null,
  lng: null,
  address: "",
  list: "",
  category: "",
  city: "",
  country: "",
  status: "want-to-go",
  sourceUrl: "",
  notes: "",
  tags: [],
  addedAt: new Date().toISOString(),
};

export default function NewPlaceClient({
  lists,
}: {
  lists: { name: string; icon: string }[];
}) {
  const [initial, setInitial] = useState<PlaceFormValue>(EMPTY);
  // Bumped each time the URL panel resolves — used as PlaceForm key so its
  // internal state re-initializes with the prefilled values.
  const [version, setVersion] = useState(0);

  function applyResolved(patch: Partial<PlaceFormValue>) {
    setInitial((cur) => ({ ...cur, ...patch }));
    setVersion((v) => v + 1);
  }

  return (
    <>
      <ResolveUrlPanel onResolved={applyResolved} />
      <PlaceForm key={version} mode="new" initial={initial} lists={lists} />
    </>
  );
}

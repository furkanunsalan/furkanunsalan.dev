"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
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
  categories,
}: {
  lists: { name: string; icon: string }[];
  categories: string[];
}) {
  const [initial, setInitial] = useState<PlaceFormValue>(EMPTY);
  // Bumped each time the URL panel resolves — used as PlaceForm key so its
  // internal state re-initializes with the prefilled values.
  const [version, setVersion] = useState(0);
  const presetUrl = useSearchParams().get("url") ?? "";

  function applyResolved(patch: Partial<PlaceFormValue>) {
    setInitial((cur) => ({ ...cur, ...patch }));
    setVersion((v) => v + 1);
  }

  return (
    <>
      <ResolveUrlPanel
        onResolved={applyResolved}
        defaultUrl={presetUrl}
        autoResolve={Boolean(presetUrl)}
      />
      <PlaceForm
        key={version}
        mode="new"
        initial={initial}
        lists={lists}
        categories={categories}
      />
    </>
  );
}

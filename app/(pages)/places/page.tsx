import type { Metadata } from "next";
import { getPlaces, getPlaceLists } from "@/lib/content";
import PlacesMap from "@/components/PlacesMap";
import PlacesList from "@/components/PlacesList";

export const metadata: Metadata = {
  title: "Places | Furkan Ünsalan",
  description:
    "A self-owned map of places I've curated — no Google data dependencies at runtime.",
};

// DB-backed: avoid prerender at build time (CI has no access to the VPS pg).
export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const [places, lists] = await Promise.all([getPlaces(), getPlaceLists()]);

  return (
    <div className="mt-24 mb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
      {places.length === 0 ? (
        <div className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-6 text-sm text-light-fourth">
          No places yet. Add one in{" "}
          <code className="text-accent-primary">/admin/places/new</code>.
        </div>
      ) : (
        <>
          <PlacesMap places={places} lists={lists} />
          <div className="mt-10">
            <PlacesList places={places} lists={lists} />
          </div>
        </>
      )}
    </div>
  );
}

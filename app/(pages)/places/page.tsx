import type { Metadata } from "next";
import { getPlaces } from "@/lib/content";
import PlacesMap from "@/components/PlacesMap";
import PlacesList from "@/components/PlacesList";

export const metadata: Metadata = {
  title: "Places | Furkan Ünsalan",
  description:
    "A self-owned map of places I've curated — no Google data dependencies at runtime.",
};

export const revalidate = 3600;

export default async function PlacesPage() {
  const places = await getPlaces();

  return (
    <div className="mt-24 mb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
      {places.length === 0 ? (
        <div className="rounded-xl ring-1 ring-white/[0.06] bg-zinc-950 p-6 text-sm text-light-fourth">
          No places yet. Run{" "}
          <code className="text-accent-primary">
            npm run import:placelist -- &lt;file&gt;
          </code>{" "}
          or{" "}
          <code className="text-accent-primary">
            npm run add:place -- &lt;url&gt;
          </code>
          .
        </div>
      ) : (
        <>
          <PlacesMap places={places} />
          <div className="mt-10">
            <PlacesList places={places} />
          </div>
        </>
      )}
    </div>
  );
}

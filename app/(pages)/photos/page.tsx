import { Metadata } from "next";
import { getPhotos } from "@/lib/content";
import Photos from "@/components/Photos";

export const metadata: Metadata = {
  title: "Photos | Furkan Ünsalan",
  description:
    "A collection of moments and scenes I've captured through my lens.",
};

// DB-backed: avoid prerender at build time (CI has no access to the VPS pg).
export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const photos = await getPhotos();
  return (
    <div className="mt-24">
      <Photos data={photos} />
    </div>
  );
}

import unsplash from "@/lib/unsplash";
import Photos from "@/components/Photos";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photos | Furkan Ünsalan",
  description:
    "A collection of moments and scenes I've captured through my lens.",
};

export const revalidate = 3600; // 60*60*24

export default async function PhotosPage() {
  const photos = await unsplash.getPhotos();

  return (
    <div className="mt-24">
      <Photos data={photos} />
    </div>
  );
}

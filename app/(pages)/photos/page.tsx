import unsplash from "@/lib/unsplash";
import Photos from "@/components/Photos";
import StatsCard from "@/components/StatsCard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photos | Furkan Ünsalan",
  description:
    "This is a collection of moments and scenes I&apos;ve captured through my lens. Each photo reflects my journey, experiences, and the beauty I see in the world around me. I hope you enjoy exploring my work as much as I enjoyed taking these photos.",
};

export const revalidate = 3600; // 60*60*24

export default async function PhotosPage() {
  const photos = await unsplash.getPhotos();
  const stats = await unsplash.getStats();

  return (
    <>
      <div className="w-5/6 md:w-1/3 text-center font-mono font-thin mx-auto mt-32">
        Photos by{" "}
        <a
          href="https://unsplash.com/@furkanunsalan"
          target="blank"
          className="underline italic hover:text-accent-primary transition-all duration-300"
        >
          Furkan Ünsalan
        </a>{" "}
        @{" "}
        <a
          href="https://unsplash.com"
          target="blank"
          className="underline italic hover:text-accent-primary transition-all duration-300"
        >
          Unsplash
        </a>
      </div>
      <div className="w-5/6 lg:w-2/3 xl:w-1/3 text-justify font-mono mx-auto mt-8">
        This is a collection of moments and scenes I&apos;ve captured through my
        lens. Each photo reflects my journey, experiences, and the beauty I see
        in the world around me. I hope you enjoy exploring my work as much as I
        enjoyed taking these photos.
      </div>

      <div className="max-w-2xl mx-auto mt-14 sm:mt-20 px-4">
        {/* Statistics Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mb-12 w-5/6 md:w-full mx-auto">
          <StatsCard title="Total Views" value={stats.views.total} />
          <StatsCard title="Total Downloads" value={stats.downloads.total} />
        </div>

        {/* Photos Section */}
      </div>
      <Photos data={photos} />
    </>
  );
}

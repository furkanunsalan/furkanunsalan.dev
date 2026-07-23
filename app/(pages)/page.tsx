import HomeIntro from "@/components/HomeIntro";
import JsonLd from "@/components/JsonLd";
import { getHomeSettings } from "@/lib/content";

// DB-backed: avoid prerender at build time (CI has no access to the VPS pg).
export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://furkanunsalan.dev";

export default async function Home() {
  const settings = await getHomeSettings();
  const sameAs = settings.socials
    .map((s) => s.url)
    .filter((u) => u.startsWith("http"));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Furkan Ünsalan",
          alternateName: "Furkan Unsalan",
          url: BASE,
          jobTitle: "Full Stack Developer",
          homeLocation: { "@type": "Place", name: settings.location },
          sameAs,
        }}
      />
      <HomeIntro />
    </>
  );
}

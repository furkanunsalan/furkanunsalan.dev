import { getHomeSettings } from "@/lib/content";
import { HomeSocialLink } from "@/components/HomeSocialLink";
import Time from "@/components/Time";

export default async function HomeIntro() {
  const settings = await getHomeSettings();

  return (
    <div className="flex flex-col items-start text-left mt-24 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="w-full flex items-start justify-between mb-1 select-none animate-fade-in-down">
        <h1 className="text-xl font-semibold">Furkan Ünsalan</h1>
        <div className="flex flex-col items-end">
          <div className="text-sm text-light-fourth tabular-nums">
            <Time
              location={settings.timezone}
              shortName={settings.timezoneLabel}
            />
          </div>
          {settings.pgpId && (
            <a
              href="/pgp.asc"
              className="text-[11px] font-mono text-light-fourth/70 hover:text-accent-primary transition-colors duration-200"
              title="Download PGP public key"
              data-umami-event="PGP key"
            >
              PGP {settings.pgpId}
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 stagger">
        {settings.socials.map((s) => (
          <HomeSocialLink key={s.name + s.url} social={s} />
        ))}
      </div>

      <p className="text-base mb-4 text-justify animate-fade-in-up delay-200 whitespace-pre-line">
        {settings.intro}
      </p>
    </div>
  );
}

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import HomeSettingsForm, { type Social } from "./HomeSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminHomeSettings() {
  const [row] = await db
    .select()
    .from(schema.homeSettings)
    .where(eq(schema.homeSettings.id, 1))
    .limit(1);

  return (
    <div>
      <PageHeader
        title="Home page"
        description="Intro, socials, timezone, PGP key — drives /."
      />
      <HomeSettingsForm
        initial={{
          intro: row?.intro || "",
          location: row?.location || "",
          focus: row?.focus || "",
          watching: row?.watching || "",
          timezone: row?.timezone || "Europe/Istanbul",
          timezoneLabel: row?.timezoneLabel || "IST",
          pgpId: row?.pgpId || "",
          socials: (row?.socials as Social[] | undefined) || [],
        }}
      />
    </div>
  );
}

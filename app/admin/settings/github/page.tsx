import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/admin/form";
import GithubVisibilityEditor from "./GithubVisibilityEditor";

export const dynamic = "force-dynamic";

export default async function AdminGithubSettings() {
  const rows = await db
    .select()
    .from(schema.githubProjectVisibility)
    .orderBy(
      asc(schema.githubProjectVisibility.pinOrder),
      asc(schema.githubProjectVisibility.name),
    );

  return (
    <div>
      <PageHeader
        title="GitHub repo visibility"
        description="Which repos appear on /projects, and which are pinned to the top. Sync re-imports the live repo list from GitHub while preserving your toggles."
      />
      <GithubVisibilityEditor initial={rows} />
    </div>
  );
}

import { PageHeader } from "@/components/admin/form";
import DbConsole from "./DbConsole";

export const dynamic = "force-dynamic";

type Tab = "browse" | "schema" | "migrations";

const TABS: Tab[] = ["browse", "schema", "migrations"];

export default function AdminDbPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const raw = (searchParams.tab || "browse").toLowerCase();
  const initial: Tab = (TABS as string[]).includes(raw)
    ? (raw as Tab)
    : "browse";

  return (
    <div>
      <PageHeader
        title="Database"
        description="Inspect tables and review schema and migrations."
      />
      <DbConsole initial={initial} />
    </div>
  );
}

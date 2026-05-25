import { PageHeader } from "@/components/admin/form";
import RestoreScroll from "@/components/admin/RestoreScroll";
import UploadsLibrary from "./UploadsLibrary";

export const dynamic = "force-dynamic";

export default function AdminUploadsPage() {
  return (
    <div>
      <RestoreScroll storageKey="admin:uploads:scroll" />
      <PageHeader
        title="Uploads"
        description="Files in UPLOADS_DIR, grouped by collection. Each card shows the content rows referencing it; the Orphans tab lists files that the sweep would delete."
      />
      <UploadsLibrary />
    </div>
  );
}

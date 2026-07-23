import ToolForm from "../ToolForm";
import { PageHeader } from "@/components/admin/form";

export default function NewToolPage() {
  return (
    <div>
      <PageHeader title="New tool" back={{ href: "/admin/tools" }} />
      <ToolForm
        mode="new"
        initial={{
          name: "",
          brand: "",
          what: "",
          category: "tech",
          comment: "",
          favorite: false,
          link: "",
          icon: "",
        }}
      />
    </div>
  );
}

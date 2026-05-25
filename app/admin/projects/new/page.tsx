import ProjectForm from "../ProjectForm";
import { PageHeader } from "@/components/admin/form";

export default function NewProjectPage() {
  return (
    <div>
      <PageHeader title="New project" back={{ href: "/admin/projects" }} />
      <ProjectForm
        mode="new"
        initial={{
          slug: "",
          name: "",
          description: "",
          metric: "",
          link: "",
          language: "",
          order: 100,
          image: undefined,
          content: "",
        }}
      />
    </div>
  );
}

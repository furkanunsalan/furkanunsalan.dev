import ExperienceForm from "../ExperienceForm";
import { PageHeader } from "@/components/admin/form";

export default function NewExperiencePage() {
  return (
    <div>
      <PageHeader
        title="New experience"
        back={{ href: "/admin/experiences" }}
      />
      <ExperienceForm
        mode="new"
        initial={{
          id: "",
          order: 100,
          organization: "",
          title: "",
          startDate: new Date().toISOString().slice(0, 10),
          endDate: "",
          comment: "",
          links: [],
          images: [],
        }}
      />
    </div>
  );
}

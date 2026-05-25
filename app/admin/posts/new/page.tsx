import PostForm from "../PostForm";
import { PageHeader } from "@/components/admin/form";

export default function NewPostPage() {
  return (
    <div>
      <PageHeader title="New post" />
      <PostForm
        mode="new"
        initial={{
          slug: "",
          title: "",
          date: new Date().toISOString().slice(0, 10),
          tags: [],
          banner: undefined,
          content: "",
        }}
      />
    </div>
  );
}

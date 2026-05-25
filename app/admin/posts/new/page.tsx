import PostForm from "../PostForm";

export default function NewPostPage() {
  return (
    <PostForm
      mode="new"
      chrome={{ title: "New post", backHref: "/admin/posts" }}
      initial={{
        slug: "",
        title: "",
        date: new Date().toISOString().slice(0, 10),
        tags: [],
        banner: undefined,
        content: "",
        draft: true,
      }}
    />
  );
}

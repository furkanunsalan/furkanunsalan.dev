import ThoughtForm from "../ThoughtForm";

export default function NewThoughtPage() {
  return (
    <ThoughtForm
      mode="new"
      chrome={{ title: "New thought", back: { href: "/admin/thoughts" } }}
      initial={{
        body: "",
        images: [],
        tags: [],
        draft: false,
      }}
    />
  );
}

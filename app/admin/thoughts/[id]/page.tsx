import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import ThoughtForm from "../ThoughtForm";

export const dynamic = "force-dynamic";

export default async function EditThoughtPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [row] = await db
    .select()
    .from(schema.thoughts)
    .where(eq(schema.thoughts.id, id))
    .limit(1);
  if (!row) notFound();

  const preview = (row.body || "").replace(/\s+/g, " ").trim().slice(0, 60);
  return (
    <ThoughtForm
      id={row.id}
      mode="edit"
      chrome={{
        title: preview || `Thought #${row.id}`,
        description: `#t-${row.id} · ${row.createdAt.toISOString().slice(0, 10)}`,
        back: { href: "/admin/thoughts" },
      }}
      initial={{
        body: row.body || "",
        images: row.images || [],
        tags: row.tags || [],
        draft: row.draft,
      }}
    />
  );
}

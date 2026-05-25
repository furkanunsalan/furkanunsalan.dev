import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import PostForm from "../PostForm";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const [row] = await db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.slug, params.slug))
    .limit(1);
  if (!row) notFound();
  return (
    <PostForm
      mode="edit"
      chrome={{
        title: row.title,
        description: `/writing/${row.slug}`,
        backHref: "/admin/posts",
      }}
      initial={{
        slug: row.slug,
        title: row.title,
        date: String(row.date),
        tags: row.tags,
        banner: row.banner || undefined,
        content: row.content,
        draft: row.draft,
      }}
    />
  );
}

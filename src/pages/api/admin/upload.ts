import type { APIRoute } from "astro";
import { saveUpload } from "@/lib/uploads";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "expected multipart/form-data" }, 400);
  }
  const file = form.get("file");
  const dir = (form.get("dir") as string) || "misc";
  if (!(file instanceof File)) {
    return json({ error: "missing file" }, 400);
  }
  const result = await saveUpload(file, dir);
  if (!result.ok) {
    return json({ error: result.error }, result.status);
  }
  return json(result);
};

import "server-only";
import { db, schema } from "@/lib/db";

// Directories the upload route allows. Mirrored from lib/uploads.ts; kept in
// sync by hand because importing the runtime allowlist would also drag in the
// fs/child_process surface area.
export const UPLOAD_DIRS = [
  "posts",
  "projects",
  "experiences",
  "places",
  "thoughts",
  "misc",
] as const;
export type UploadDir = (typeof UPLOAD_DIRS)[number];

// Collections whose rows can embed an /api/img/* reference. Order is the
// canonical iteration order used by callers.
export const REF_COLLECTIONS = [
  "posts",
  "projects",
  "experiences",
  "thoughts",
] as const;
export type RefCollection = (typeof REF_COLLECTIONS)[number];

export type RefField =
  | "content"
  | "banner"
  | "image"
  | "images"
  | "logo"
  | "body";

// Reference-extraction regex. Anchored to /api/img/<dir>/<filename> so we
// don't accidentally match a stray substring. Filenames are restricted to
// the alphabet the upload route generates.
export function uploadRefRegex(dir: UploadDir): RegExp {
  return new RegExp(`/api/img/${dir}/([A-Za-z0-9._-]+)`, "g");
}

// Pull all filename references for `dir` out of an arbitrary text blob.
export function collectRefs(
  text: string | null | undefined,
  dir: UploadDir,
  into: Set<string>,
) {
  if (!text) return;
  for (const m of text.matchAll(uploadRefRegex(dir))) into.add(m[1]);
}

// Build the same {dir → Set<filename>} structure the sweep route uses to
// decide what's safe to delete. Walks every content/image column across the
// four collections that can embed uploads, including cross-collection refs
// (e.g. a project body embedding /api/img/posts/X).
export async function referencedByDir(): Promise<
  Record<UploadDir, Set<string>>
> {
  const out: Record<UploadDir, Set<string>> = {
    posts: new Set(),
    projects: new Set(),
    experiences: new Set(),
    places: new Set(),
    thoughts: new Set(),
    misc: new Set(),
  };

  const [posts, projects, experiences, thoughts] = await Promise.all([
    db
      .select({
        content: schema.posts.content,
        banner: schema.posts.banner,
      })
      .from(schema.posts),
    db
      .select({
        content: schema.projects.content,
        image: schema.projects.image,
      })
      .from(schema.projects),
    db
      .select({
        images: schema.experiences.images,
        logo: schema.experiences.logo,
      })
      .from(schema.experiences),
    db
      .select({ body: schema.thoughts.body, images: schema.thoughts.images })
      .from(schema.thoughts),
  ]);

  for (const p of posts) {
    for (const d of UPLOAD_DIRS) {
      collectRefs(p.content, d, out[d]);
      collectRefs(p.banner, d, out[d]);
    }
  }
  for (const p of projects) {
    for (const d of UPLOAD_DIRS) {
      collectRefs(p.content, d, out[d]);
      collectRefs(p.image, d, out[d]);
    }
  }
  for (const e of experiences) {
    for (const u of e.images || []) {
      for (const d of UPLOAD_DIRS) collectRefs(u, d, out[d]);
    }
    for (const d of UPLOAD_DIRS) collectRefs(e.logo, d, out[d]);
  }
  for (const t of thoughts) {
    for (const d of UPLOAD_DIRS) {
      collectRefs(t.body, d, out[d]);
      for (const u of t.images || []) collectRefs(u, d, out[d]);
    }
  }

  return out;
}

// ---- usage-map specific shape ------------------------------------------------

export type RowRef = {
  collection: RefCollection;
  id: string;
  title?: string;
  field: RefField;
};

export type FileWithRefs = {
  dir: UploadDir;
  name: string;
  url: string;
  refs: RowRef[];
};

export type RowAssets = {
  collection: RefCollection;
  id: string;
  title?: string;
  assets: { dir: UploadDir; name: string; url: string }[];
};

// Per-row source records used to build both maps. Each row carries the fields
// that can hold upload references; nullish fields are dropped during scan.
type RowSource = {
  collection: RefCollection;
  id: string;
  title?: string;
  fields: { field: RefField; text: string }[];
};

async function collectRowSources(): Promise<RowSource[]> {
  const out: RowSource[] = [];

  const [posts, projects, experiences, thoughts] = await Promise.all([
    db
      .select({
        slug: schema.posts.slug,
        title: schema.posts.title,
        content: schema.posts.content,
        banner: schema.posts.banner,
      })
      .from(schema.posts),
    db
      .select({
        slug: schema.projects.slug,
        name: schema.projects.name,
        content: schema.projects.content,
        image: schema.projects.image,
      })
      .from(schema.projects),
    db
      .select({
        id: schema.experiences.id,
        organization: schema.experiences.organization,
        title: schema.experiences.title,
        images: schema.experiences.images,
        logo: schema.experiences.logo,
      })
      .from(schema.experiences),
    db
      .select({
        id: schema.thoughts.id,
        body: schema.thoughts.body,
        images: schema.thoughts.images,
      })
      .from(schema.thoughts),
  ]);

  for (const p of posts) {
    const fields: RowSource["fields"] = [];
    if (p.content) fields.push({ field: "content", text: p.content });
    if (p.banner) fields.push({ field: "banner", text: p.banner });
    if (fields.length) {
      out.push({ collection: "posts", id: p.slug, title: p.title, fields });
    }
  }
  for (const p of projects) {
    const fields: RowSource["fields"] = [];
    if (p.content) fields.push({ field: "content", text: p.content });
    if (p.image) fields.push({ field: "image", text: p.image });
    if (fields.length) {
      out.push({ collection: "projects", id: p.slug, title: p.name, fields });
    }
  }
  for (const e of experiences) {
    const fields: RowSource["fields"] = (e.images || []).map((u) => ({
      field: "images" as const,
      text: u,
    }));
    if (e.logo) fields.push({ field: "logo", text: e.logo });
    if (fields.length) {
      out.push({
        collection: "experiences",
        id: e.id,
        title: `${e.organization} — ${e.title}`,
        fields,
      });
    }
  }
  for (const t of thoughts) {
    const fields: RowSource["fields"] = [];
    if (t.body) fields.push({ field: "body", text: t.body });
    for (const u of t.images || []) fields.push({ field: "images", text: u });
    if (fields.length) {
      const preview = (t.body || "").replace(/\s+/g, " ").trim().slice(0, 60);
      out.push({
        collection: "thoughts",
        id: String(t.id),
        title: preview || `thought #${t.id}`,
        fields,
      });
    }
  }

  return out;
}

// Build the full usage map: for each on-disk file → which rows reference it,
// and the inverse for-each-row → its assets. Caller passes the file inventory
// already gathered per dir (so the route can reuse parseUploadRemote / fs).
export async function buildUsageMap(
  filesByDir: Record<UploadDir, string[]>,
): Promise<{
  fileRefs: FileWithRefs[];
  rowAssets: RowAssets[];
  orphans: { dir: UploadDir; name: string; url: string }[];
}> {
  const rows = await collectRowSources();

  // Lookup: dir -> name -> RowRef[]
  const refIndex: Record<UploadDir, Map<string, RowRef[]>> = {
    posts: new Map(),
    projects: new Map(),
    experiences: new Map(),
    places: new Map(),
    thoughts: new Map(),
    misc: new Map(),
  };

  // For inverse map: collection|id -> {meta + asset set}
  const rowMap = new Map<
    string,
    {
      collection: RefCollection;
      id: string;
      title?: string;
      assets: Map<string, { dir: UploadDir; name: string; url: string }>;
    }
  >();

  for (const row of rows) {
    const rowKey = `${row.collection}|${row.id}`;
    for (const f of row.fields) {
      for (const dir of UPLOAD_DIRS) {
        for (const m of f.text.matchAll(uploadRefRegex(dir))) {
          const name = m[1];
          const list = refIndex[dir].get(name) ?? [];
          list.push({
            collection: row.collection,
            id: row.id,
            title: row.title,
            field: f.field,
          });
          refIndex[dir].set(name, list);

          let entry = rowMap.get(rowKey);
          if (!entry) {
            entry = {
              collection: row.collection,
              id: row.id,
              title: row.title,
              assets: new Map(),
            };
            rowMap.set(rowKey, entry);
          }
          const assetKey = `${dir}/${name}`;
          if (!entry.assets.has(assetKey)) {
            entry.assets.set(assetKey, {
              dir,
              name,
              url: `/api/img/${dir}/${name}`,
            });
          }
        }
      }
    }
  }

  const fileRefs: FileWithRefs[] = [];
  const orphans: { dir: UploadDir; name: string; url: string }[] = [];

  for (const dir of UPLOAD_DIRS) {
    const files = filesByDir[dir] || [];
    for (const name of files) {
      const refs = refIndex[dir].get(name) ?? [];
      const entry = {
        dir,
        name,
        url: `/api/img/${dir}/${name}`,
        refs,
      };
      fileRefs.push(entry);
      if (refs.length === 0) {
        orphans.push({ dir, name, url: entry.url });
      }
    }
  }

  // Dedupe refs per file (a single row may reference the same file from
  // multiple fields — keep the first occurrence, which is good enough for the
  // UI list).
  for (const f of fileRefs) {
    const seen = new Set<string>();
    f.refs = f.refs.filter((r) => {
      const k = `${r.collection}|${r.id}|${r.field}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  const rowAssets: RowAssets[] = [];
  for (const entry of rowMap.values()) {
    rowAssets.push({
      collection: entry.collection,
      id: entry.id,
      title: entry.title,
      assets: [...entry.assets.values()].sort((a, b) =>
        a.dir === b.dir
          ? a.name.localeCompare(b.name)
          : a.dir.localeCompare(b.dir),
      ),
    });
  }
  rowAssets.sort((a, b) =>
    a.collection === b.collection
      ? a.id.localeCompare(b.id)
      : a.collection.localeCompare(b.collection),
  );

  return { fileRefs, rowAssets, orphans };
}

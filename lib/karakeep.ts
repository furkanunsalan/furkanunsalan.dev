export type KarakeepBookmark = {
  id: string;
  title: string;
  excerpt: string;
  link: string;
  created: string;
  tags: string[];
  cover: string | null;
};

type RawTag = { id: string; name: string; attachedBy?: string };

type RawBookmark = {
  id: string;
  createdAt: string;
  title: string | null;
  tags: RawTag[];
  content: {
    type: string;
    url?: string;
    title?: string | null;
    description?: string | null;
    imageUrl?: string | null;
  };
};

type BookmarksResponse = {
  bookmarks: RawBookmark[];
  nextCursor: string | null;
};

const DEFAULT_HOST = "https://bookmarks.furkanunsalan.dev";

export const BOOKMARK_LISTS = [
  {
    id: "oalr80pga230xqpupf836v31",
    title: "Posts",
    description:
      "An archive for the posts that I've bookmarked and read along the way.",
  },
  {
    id: "zy0ciwhnnm9lr113ze8ex51a",
    title: "Videos",
    description:
      "The videos I've watched and found useful without any categorizations",
  },
] as const;

function host(): string {
  return process.env.KARAKEEP_API_URL || DEFAULT_HOST;
}

function authHeaders(): HeadersInit {
  const key = process.env.KARAKEEP_API_KEY;
  if (!key) throw new Error("Karakeep API key is not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function normalize(raw: RawBookmark): KarakeepBookmark {
  const c = raw.content || ({} as RawBookmark["content"]);
  return {
    id: raw.id,
    title: raw.title || c.title || c.url || "Untitled",
    excerpt: c.description || "",
    link: c.url || "#",
    created: raw.createdAt,
    tags: (raw.tags || []).map((t) => t.name),
    cover: c.imageUrl || null,
  };
}

async function fetchBookmarksPage(
  path: string,
  cursor: string | null,
  limit: number,
): Promise<BookmarksResponse> {
  const url = new URL(`${host()}${path}`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("includeContent", "false");
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url.toString(), {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Karakeep request failed: ${res.status}`);
  }
  return (await res.json()) as BookmarksResponse;
}

export async function getKarakeepBookmarks(
  listId: string,
  cursor: string | null = null,
  limit: number = 50,
) {
  const data = await fetchBookmarksPage(
    `/api/v1/lists/${listId}/bookmarks`,
    cursor,
    limit,
  );
  return {
    items: data.bookmarks.map(normalize),
    nextCursor: data.nextCursor,
  };
}

export async function getKarakeepListCount(listId: string): Promise<number> {
  let cursor: string | null = null;
  let total = 0;
  do {
    const data = await fetchBookmarksPage(
      `/api/v1/lists/${listId}/bookmarks`,
      cursor,
      100,
    );
    total += data.bookmarks.length;
    cursor = data.nextCursor;
  } while (cursor);
  return total;
}

export async function getKarakeepLatest(): Promise<KarakeepBookmark | null> {
  const data = await fetchBookmarksPage(`/api/v1/bookmarks`, null, 1);
  const first = data.bookmarks[0];
  return first ? normalize(first) : null;
}

export async function getKarakeepLatestFromLists(
  listIds: string[],
): Promise<KarakeepBookmark | null> {
  const heads = await Promise.all(
    listIds.map(async (id) => {
      const data = await fetchBookmarksPage(
        `/api/v1/lists/${id}/bookmarks`,
        null,
        1,
      );
      return data.bookmarks[0] ? normalize(data.bookmarks[0]) : null;
    }),
  );
  const valid = heads.filter((b): b is KarakeepBookmark => b !== null);
  if (valid.length === 0) return null;
  return valid.sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
  )[0];
}

export async function getKarakeepLast24hCount(): Promise<number> {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  let cursor: string | null = null;
  let count = 0;
  while (true) {
    const data: BookmarksResponse = await fetchBookmarksPage(
      `/api/v1/bookmarks`,
      cursor,
      50,
    );
    let stop = false;
    for (const b of data.bookmarks) {
      if (new Date(b.createdAt).getTime() >= cutoff) {
        count += 1;
      } else {
        stop = true;
        break;
      }
    }
    if (stop || !data.nextCursor) break;
    cursor = data.nextCursor;
  }
  return count;
}

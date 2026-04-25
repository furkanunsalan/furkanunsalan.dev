export type RaindropBookmark = {
  _id: string;
  title: string;
  excerpt: string;
  link: string;
  created: string;
  tags: string[];
  cover: string;
};

export type RaindropCollection = {
  _id: number;
  title: string;
  count: number;
};

export async function getRaindropBookmarks(
  collectionId: string,
  page: number = 0,
  perPage: number = 50,
) {
  const token = process.env.RAINDROP_TOKEN;

  if (!token) {
    throw new Error("Raindrop token is not configured");
  }

  const url = new URL(
    `https://api.raindrop.io/rest/v1/raindrops/${collectionId}`,
  );
  url.searchParams.set("perpage", perPage.toString());
  url.searchParams.set("page", page.toString());

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store", // Disable caching to always fetch fresh data
  });

  if (!response.ok) {
    throw new Error("Failed to fetch bookmarks from Raindrop");
  }

  const data = await response.json();
  return data.items as RaindropBookmark[];
}

export async function getRaindropCollectionCount(
  collectionId: string,
): Promise<number> {
  const token = process.env.RAINDROP_TOKEN;
  if (!token) throw new Error("Raindrop token is not configured");

  const url = new URL(
    `https://api.raindrop.io/rest/v1/raindrops/${collectionId}`,
  );
  url.searchParams.set("perpage", "0");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Failed to fetch collection count");

  const data = await response.json();
  return (data.count as number) ?? 0;
}

export async function getRaindropLatest(): Promise<RaindropBookmark | null> {
  const token = process.env.RAINDROP_TOKEN;
  if (!token) throw new Error("Raindrop token is not configured");

  const url = new URL("https://api.raindrop.io/rest/v1/raindrops/0");
  url.searchParams.set("perpage", "1");
  url.searchParams.set("sort", "-created");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 1800 },
  });

  if (!response.ok) return null;

  const data = await response.json();
  return (data.items as RaindropBookmark[])[0] ?? null;
}

export async function getRaindropLast24hCount(): Promise<number> {
  const token = process.env.RAINDROP_TOKEN;
  if (!token) throw new Error("Raindrop token is not configured");

  const url = new URL("https://api.raindrop.io/rest/v1/raindrops/0");
  url.searchParams.set("perpage", "50");
  url.searchParams.set("sort", "-created");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Failed to fetch recent bookmarks");

  const data = await response.json();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return (data.items as { created: string }[]).filter(
    (item) => new Date(item.created).getTime() >= cutoff,
  ).length;
}

export async function getRaindropCollections() {
  const token = process.env.RAINDROP_TOKEN;

  if (!token) {
    throw new Error("Raindrop token is not configured");
  }

  const response = await fetch("https://api.raindrop.io/rest/v1/collections", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store", // Disable caching to always fetch fresh data
  });

  if (!response.ok) {
    throw new Error("Failed to fetch collections from Raindrop");
  }

  const data = await response.json();
  return data.items as RaindropCollection[];
}

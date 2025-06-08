import { headers } from 'next/headers';

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

export async function getRaindropBookmarks(collectionId: string) {
  const headersList = headers();
  const token = process.env.RAINDROP_TOKEN;

  if (!token) {
    throw new Error('Raindrop token is not configured');
  }

  const response = await fetch(
    `https://api.raindrop.io/rest/v1/raindrops/${collectionId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch bookmarks from Raindrop');
  }

  const data = await response.json();
  return data.items as RaindropBookmark[];
}

export async function getRaindropCollections() {
  const token = process.env.RAINDROP_TOKEN;

  if (!token) {
    throw new Error('Raindrop token is not configured');
  }

  const response = await fetch('https://api.raindrop.io/rest/v1/collections', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error('Failed to fetch collections from Raindrop');
  }

  const data = await response.json();
  return data.items as RaindropCollection[];
} 
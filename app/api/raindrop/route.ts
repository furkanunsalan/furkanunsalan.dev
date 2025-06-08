import { NextRequest } from 'next/server';
import { getRaindropBookmarks } from '@/lib/raindrop';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const collectionId = searchParams.get('collectionId');

    if (!collectionId) {
      return new Response(
        JSON.stringify({ error: 'Collection ID is required' }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }

    const bookmarks = await getRaindropBookmarks(collectionId);

    return new Response(JSON.stringify(bookmarks), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Error in /api/raindrop:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch bookmarks' }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json',
        },
      }
    );
  }
} 
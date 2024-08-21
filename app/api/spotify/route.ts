// app/api/now-playing/route.ts
import { NextResponse } from 'next/server';
import { getNowPlaying } from '@/lib/spotify'; // Adjust the import path accordingly

export async function GET() {
  try {
    const response = await getNowPlaying();
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch now playing' }, { status: 500 });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

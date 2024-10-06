import { NextRequest } from "next/server";
import { getNowPlaying, getRecentlyPlayed } from "@/lib/spotify"; // Import the getRecentlyPlayed function

export const runtime = "experimental-edge";

export async function GET(req: NextRequest) {
  try {
    // Attempt to get the currently playing song
    const nowPlayingResponse = await getNowPlaying();

    // If there's no currently playing song, fallback to recently played
    if (nowPlayingResponse.status === 204 || nowPlayingResponse.status > 400) {
      // Fetch the recently played track instead
      const recentlyPlayedResponse = await getRecentlyPlayed();

      if (recentlyPlayedResponse.status > 400) {
        return new Response(JSON.stringify({ isPlaying: false }), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-cache", // Ensure no caching
          },
        });
      }

      const recentlyPlayedData = await recentlyPlayedResponse.json();
      const lastPlayedSong = recentlyPlayedData.items[0]?.track;

      if (!lastPlayedSong) {
        return new Response(JSON.stringify({ isPlaying: false }), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-cache", // Ensure no caching
          },
        });
      }

      // Return the last played song details
      const title = lastPlayedSong.name;
      const artist = lastPlayedSong.artists[0]?.name ?? "Unknown Artist";
      const album = lastPlayedSong.album.name;
      const albumImageUrl = lastPlayedSong.album.images[0]?.url ?? "";
      const songUrl = lastPlayedSong.external_urls.spotify;

      return new Response(
        JSON.stringify({
          album,
          albumImageUrl,
          artist,
          isPlaying: false, // Since it's a recently played song
          songUrl,
          title,
          isLastPlayed: true, // Custom flag to indicate it's the last played song
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-cache", // Ensure no caching
          },
        }
      );
    }

    const nowPlayingData = await nowPlayingResponse.json();

    if (nowPlayingData.item === null) {
      return new Response(JSON.stringify({ isPlaying: false }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-cache", // Ensure no caching
        },
      });
    }

    // Return the currently playing song details
    const isPlaying = nowPlayingData.is_playing;
    const title = nowPlayingData.item.name;
    const artist = nowPlayingData.item.artists[0]?.name ?? "Unknown Artist"; // Get the first artist's name or fallback
    const album = nowPlayingData.item.album.name;
    const albumImageUrl = nowPlayingData.item.album.images[0]?.url ?? ""; // Fallback if no image URL
    const songUrl = nowPlayingData.item.external_urls.spotify;

    return new Response(
      JSON.stringify({
        album,
        albumImageUrl,
        artist,
        isPlaying,
        songUrl,
        title,
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-cache", // Ensure no caching
        },
      }
    );
  } catch (err) {
    console.error("Error in /api/spotify:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-cache", // Ensure no caching
      },
    });
  }
}

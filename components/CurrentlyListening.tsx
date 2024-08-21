'use client'

import React, { useEffect, useState } from 'react';

export interface SpotifyTrack {
  item: {
    name: string;
    artists: { name: string }[];
    album: {
      name: string;
      images: { url: string }[];
    };
  };
}

const NowPlaying: React.FC = () => {
  const [nowPlaying, setNowPlaying] = useState<SpotifyTrack | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const response = await fetch('/api/spotify');
        if (!response.ok) {
          throw new Error('Failed to fetch now playing');
        }
        const data: SpotifyTrack = await response.json();
        setNowPlaying(data);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    fetchNowPlaying();
    const intervalId = setInterval(fetchNowPlaying, 60000); // Refresh every 60 seconds

    return () => clearInterval(intervalId); // Clean up interval on component unmount
  }, []);

  if (error) {
    return <div className="p-4 bg-red-100 text-red-800 border border-red-300 rounded-md">Error: {error}</div>;
  }

  if (!nowPlaying) {
    return <div className="p-4 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-md">No song is currently playing</div>;
  }

  return (
    <div className="flex items-center p-4 bg-gray-100 rounded-lg shadow-md max-w-lg mx-auto">
      <div className="flex-1 mr-4">
        <h3 className="text-xl font-semibold mb-2">Now Playing</h3>
        <p className="text-2xl font-bold mb-1">{nowPlaying.item.name}</p>
        <p className="text-gray-700 mb-1">Artist: {nowPlaying.item.artists.map(artist => artist.name).join(', ')}</p>
        <p className="text-gray-700">Album: {nowPlaying.item.album.name}</p>
      </div>
      <div className="flex-shrink-0">
        <img
          src={nowPlaying.item.album.images[0].url}
          alt="Album Art"
          className="w-36 h-36 object-cover rounded-lg"
          onError={(e) => (e.currentTarget.src = '/path/to/placeholder-image.png')} // Fallback image
        />
      </div>
    </div>
  );
};

export default NowPlaying;

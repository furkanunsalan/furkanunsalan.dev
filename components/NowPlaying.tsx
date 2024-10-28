"use client";

import React from "react";
import useSWR from "swr";
import { animate } from "motion";

type NowPlayingSong = {
  songUrl: string;
  title: string;
  artist: string;
  isPlaying: boolean; // Boolean to check if song is currently playing
};

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((res) => res.json());

function AnimatedBars() {
  React.useEffect(() => {
    animate(
      "#bar1",
      {
        transform: [
          "scaleY(1.0) translateY(0rem)",
          "scaleY(1.5) translateY(-0.082rem)",
          "scaleY(1.0) translateY(0rem)",
        ],
      },
      {
        duration: 1.0,
        repeat: Infinity,
        easing: ["ease-in-out"],
      }
    );
    animate(
      "#bar2",
      {
        transform: [
          "scaleY(1.0) translateY(0rem)",
          "scaleY(3) translateY(-0.083rem)",
          "scaleY(1.0) translateY(0rem)",
        ],
      },
      {
        delay: 0.2,
        duration: 1.5,
        repeat: Infinity,
        easing: ["ease-in-out"],
      }
    );
    animate(
      "#bar3",
      {
        transform: [
          "scaleY(1.0) translateY(0rem)",
          "scaleY(0.5) translateY(0.37rem)",
          "scaleY(1.0) translateY(0rem)",
        ],
      },
      {
        delay: 0.3,
        duration: 1.5,
        repeat: Infinity,
        easing: ["ease-in-out"],
      }
    );
  }, []);

  return (
    <div className="flex items-end space-x-1 overflow-hidden">
      <span
        id="bar1"
        className="w-2 h-8 bg-gray-300 dark:bg-gray-500 rounded-sm opacity-75"
      />
      <span
        id="bar2"
        className="w-2 h-6 bg-gray-300 dark:bg-gray-500 rounded-sm"
      />
      <span
        id="bar3"
        className="w-2 h-10 bg-gray-300 dark:bg-gray-500 rounded-sm opacity-80"
      />
    </div>
  );
}

export default function Spotify() {
  const { data, error } = useSWR<NowPlayingSong>("/api/spotify", fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 0,
  });

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-800 border border-red-300 rounded-md">
        Error: {error.message}
      </div>
    );
  }

  return (
    <div className="flex flex-row-reverse items-center sm:flex-row mb-8 mt-4 space-x-0 sm:space-x-2 w-full">
      {data?.isPlaying && (
        <AnimatedBars />
      )}
      <div className="inline-flex flex-col sm:flex-row w-full max-w-full truncate">
        {data?.songUrl && data.isPlaying ? (
          <a
            className="capsize text-gray-800 dark:text-gray-200 font-medium max-w-max truncate"
            href={data.songUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {data.title}
          </a>
        ) : data?.title ? (
          // Display the last played song in italic if no song is currently playing
          <p className="capsize text-left text-gray-800 dark:text-gray-200 font-medium italic">
            Last Played: {data.title}
          </p>
        ) : (
          <p className="capsize text-gray-800 dark:text-gray-200 font-medium">
            Not Playing
          </p>
        )}
        <span className="capsize mx-2 text-gray-500 dark:text-gray-300 hidden sm:block">
          {" – "}
        </span>
        <p className="capsize text-gray-500 dark:text-gray-300 max-w-max truncate italic">
          {data?.artist ?? "Spotify"}
        </p>
      </div>
    </div>
  );
}

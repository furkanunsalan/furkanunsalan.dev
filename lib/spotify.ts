const client_id = process.env.SPOTIFY_CLIENT_ID ?? ""; // Fallback to empty string if undefined
const client_secret = process.env.SPOTIFY_CLIENT_SECRET ?? ""; // Fallback to empty string if undefined
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN ?? ""; // Fallback to empty string if undefined

const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64"); // `btoa` is browser-specific, use Buffer in Node.js
const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
const TOP_TRACKS_ENDPOINT = `https://api.spotify.com/v1/me/top/tracks`;
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;

const getAccessToken = async () => {
  if (!refresh_token) {
    throw new Error("Refresh token is required");
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch access token: ${response.statusText}`);
  }
  return response.json();
};

export const getNowPlaying = async () => {
  const { access_token } = await getAccessToken();

  return fetch(NOW_PLAYING_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
};

export const getTopTracks = async () => {
  const { access_token } = await getAccessToken();

  return fetch(TOP_TRACKS_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
};

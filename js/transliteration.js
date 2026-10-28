
/*
 * Free English-to-Telugu phonetic transliteration.
 *
 * This endpoint is not a guaranteed, documented public API.
 * Availability and browser CORS support can change. The app
 * always falls back to the original English text on failure.
 */
const ENDPOINT = "https://inputtools.google.com/request";
const CACHE_PREFIX = "bhajan-te-translit:v1:";

function readCache(text) {
  try {
    return localStorage.getItem(CACHE_PREFIX + text);
  } catch {
    return null;
  }
}

function writeCache(text, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + text, value);
  } catch {
    // Ignore storage failures.
  }
}

export async function transliterateTelugu(text) {
  const original = String(text || "").trim();

  if (!original) return "";

  const cached = readCache(original);
  if (cached) return cached;

  const url = new URL(ENDPOINT);
  url.searchParams.set("text", original);
  url.searchParams.set("itc", "te-t-i0-und");
  url.searchParams.set("num", "1");

  const response = await fetch(url.toString(), {
    method: "GET",
    mode: "cors"
  });

  if (!response.ok) {
    throw new Error("Telugu transliteration service is unavailable.");
  }

  const payload = await response.json();

  // Typical successful response:
  // ["SUCCESS", [["original text", ["తెలుగు"], ...]]]
  const candidate = payload?.[1]?.[0]?.[1]?.[0];

  if (
    payload?.[0] !== "SUCCESS" ||
    typeof candidate !== "string" ||
    !candidate
  ) {
    throw new Error("No Telugu transliteration was returned.");
  }

  writeCache(original, candidate);
  return candidate;
}

// Process distinct song and singer names to reduce repeat requests.
export async function transliterateSongs(songs) {
  const unique = [
    ...new Set(
      songs
        .flatMap((song) => [song.songName, song.singer])
        .filter(Boolean)
    )
  ];

  const results = new Map();

  // Sequential requests avoid sending a large burst of requests.
  for (const text of unique) {
    try {
      results.set(text, await transliterateTelugu(text));
    } catch {
      results.set(text, text);
    }
  }

  return songs.map((song) => ({
    ...song,
    displayName: results.get(song.songName) || song.songName,
    displaySinger: song.singer
      ? results.get(song.singer) || song.singer
      : ""
  }));
}

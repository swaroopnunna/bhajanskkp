
import { REFRESH_INTERVAL_MS } from "./config.js";
import { fetchSongs, getCachedSongs } from "./sheets.js";
import { transliterateSongs } from "./transliteration.js";

const currentNumber = document.querySelector("#current-number");
const songList = document.querySelector("#audience-song-list");
const status = document.querySelector("#status");
const updated = document.querySelector("#last-updated");
const languageSelect = document.querySelector("#language-select");

let latestSongs = [];
let renderToken = 0;
let staleData = false;

function setStatus(message, kind = "info") {
  status.textContent = message;
  status.dataset.kind = kind;
  status.hidden = !message;
}

function formatTime(iso) {
  if (!iso) return "Not updated yet";

  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function getCurrentSong(songs) {
  if (!songs.length) return null;

  return songs.reduce((best, song) =>
    Number(song.songNumber) > Number(best.songNumber)
      ? song
      : best
  , songs[0]);
}

function makeSongCard(song) {
  const card = document.createElement("article");
  card.className = "song-card";

  const number = document.createElement("div");
  number.className = "song-card-number";
  number.textContent = song.songNumber;

  const body = document.createElement("div");
  body.className = "song-card-body";

  const name = document.createElement("h2");
  name.className = "song-card-name";
  name.textContent = song.displayName || song.songName;

  const singer = document.createElement("p");
  singer.className = "song-card-singer";
  singer.textContent =
    song.displaySinger || song.singer || "Singer not provided";

  body.append(name, singer);
  card.append(number, body);

  return card;
}

async function renderSongs(songs) {
  // Ignore older async transliteration results if a newer render starts.
  const token = ++renderToken;
  const language = languageSelect.value;

  let displaySongs = songs;

  if (language === "te" && songs.length) {
    setStatus("Preparing Telugu text…", "info");

    displaySongs = await transliterateSongs(songs);

    if (token !== renderToken) return;
  }

  songList.replaceChildren();

  if (!displaySongs.length) {
    currentNumber.textContent = "—";

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No completed songs yet.";

    songList.append(empty);
  } else {
    // Current song is the highest-numbered completed song.
    const current = getCurrentSong(displaySongs);
    currentNumber.textContent = current.songNumber;

    // Newest completed songs appear first on the audience page.
    displaySongs.slice().reverse().forEach((song) => {
      songList.append(makeSongCard(song));
    });
  }

  // Do not erase the offline/error message after rendering.
  if (staleData) {
    setStatus(
      "Offline or unable to refresh — showing the last saved data.",
      "warning"
    );
  } else if (!navigator.onLine) {
    setStatus("You appear to be offline.", "warning");
  } else {
    setStatus("");
  }
}

async function showSnapshot(snapshot, stale = false) {
  latestSongs = snapshot.songs;
  staleData = stale;

  updated.textContent =
    `Last updated: ${formatTime(snapshot.updatedAt)}`;

  await renderSongs(latestSongs);
}

async function refresh() {
  try {
    const result = await fetchSongs();
    await showSnapshot(result, false);
  } catch (error) {
    const cached = getCachedSongs();

    if (cached) {
      await showSnapshot(cached, true);
    } else {
      staleData = false;
      currentNumber.textContent = "—";

      setStatus(
        error.message ||
        "Could not load songs. Check your connection and sheet sharing.",
        "error"
      );
    }
  }
}

// Changing language re-renders the current data without reloading the sheet.
languageSelect.addEventListener("change", () => {
  renderSongs(latestSongs);
});

// Display cached content immediately while the live fetch runs.
const cached = getCachedSongs();

if (cached) {
  showSnapshot(cached, true);
} else {
  setStatus("Loading songs from Google Sheets…", "info");
}

refresh();
setInterval(refresh, REFRESH_INTERVAL_MS);

window.addEventListener("online", refresh);

window.addEventListener("offline", () => {
  staleData = true;
  setStatus(
    "Offline — showing saved data where available.",
    "warning"
  );
});


import { REFRESH_INTERVAL_MS } from "./config.js";
import { fetchSongs, getCachedSongs } from "./sheets.js";

const currentNumber = document.querySelector("#current-number");
const songList = document.querySelector("#song-list");
const status = document.querySelector("#status");
const updated = document.querySelector("#last-updated");

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

// Display connection/loading messages.
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
  return songs.reduce((best, song) =>
    Number(song.songNumber) > Number(best.songNumber)
      ? song
      : best
  , songs[0]);
}

function makeSongRow(song) {
  // Create elements instead of injecting sheet values as HTML.
  const row = document.createElement("div");
  row.className = "tv-song-row";

  const number = document.createElement("div");
  number.className = "tv-song-number";
  number.textContent = song.songNumber;

  const details = document.createElement("div");
  details.className = "tv-song-details";

  const name = document.createElement("div");
  name.className = "tv-song-name";
  name.textContent = song.songName;

  const singer = document.createElement("div");
  singer.className = "tv-song-singer";
  singer.textContent = song.singer || "Singer not provided";

  details.append(name, singer);
  row.append(number, details);

  return row;
}

function renderSongs(songs) {
  songList.replaceChildren();

  if (!songs.length) {
    currentNumber.textContent = "—";

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Waiting for the first song…";
    songList.append(empty);
    return;
  }

  // Current song = highest-numbered row with a Song Name.
  const current = getCurrentSong(songs);
  currentNumber.textContent = current.songNumber;

  // First copy contains the real list.
  const first = document.createElement("div");
  first.className = "marquee-group";

  songs.forEach((song) => {
    first.append(makeSongRow(song));
  });

  // Second copy allows the animation to loop seamlessly.
  const second = first.cloneNode(true);
  second.setAttribute("aria-hidden", "true");

  songList.append(first, second);

  // Move by exactly one group's height for a clean loop.
  const distance = first.getBoundingClientRect().height;
  const duration = Math.max(20, distance / 28);

  songList.style.setProperty(
    "--marquee-distance",
    `${distance}px`
  );
  songList.style.setProperty(
    "--marquee-duration",
    `${duration}s`
  );

  songList.classList.toggle(
    "no-motion",
    reducedMotion.matches
  );
}

function showSnapshot(snapshot, stale = false) {
  renderSongs(snapshot.songs);
  updated.textContent = `Last updated: ${formatTime(snapshot.updatedAt)}`;

  if (stale) {
    setStatus(
      "Offline or unable to refresh — showing the last saved data.",
      "warning"
    );
  }
}

async function refresh() {
  try {
    const result = await fetchSongs();

    showSnapshot(result);

    if (!navigator.onLine) {
      setStatus("You appear to be offline.", "warning");
    } else {
      setStatus("");
    }
  } catch (error) {
    const cached = getCachedSongs();

    if (cached) {
      showSnapshot(cached, true);
    } else {
      currentNumber.textContent = "—";
      songList.replaceChildren();

      setStatus(
        error.message ||
        "Could not load songs. Check your connection and sheet sharing.",
        "error"
      );
    }
  }
}

// Show saved data immediately, if available.
const cached = getCachedSongs();

if (cached) {
  showSnapshot(cached, true);
} else {
  setStatus("Loading songs from Google Sheets…", "info");
}

// Fetch now and then refresh automatically.
refresh();
setInterval(refresh, REFRESH_INTERVAL_MS);

window.addEventListener("online", refresh);

window.addEventListener("offline", () => {
  setStatus(
    "Offline — waiting for connection. Cached songs remain visible.",
    "warning"
  );
});

// Recalculate the marquee if the user changes reduced-motion preference.
reducedMotion.addEventListener?.("change", () => {
  const cachedData = getCachedSongs();
  if (cachedData) renderSongs(cachedData.songs);
});

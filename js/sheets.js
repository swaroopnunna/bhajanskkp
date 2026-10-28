
import { SHEET_ID, SHEET_GID, STORAGE_KEY } from "./config.js";

// Normalize headers to support variations in capitalization and spaces.
function normalizeHeader(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Google Visualization wraps JSON in a JavaScript function call.
function parseVisualizationResponse(rawText) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("Google Sheets returned an unexpected response.");
  }

  return JSON.parse(rawText.slice(start, end + 1));
}

// Prefer Google's formatted cell value, falling back to its raw value.
function cellValue(cell) {
  if (!cell) return "";
  return String(cell.f ?? cell.v ?? "").trim();
}

// Find the requested columns from the header labels.
function readColumnIndexes(table) {
  const headers = (table.cols || []).map((col) =>
    normalizeHeader(col.label || col.id || "")
  );

  const find = (aliases, fallback) => {
    const index = headers.findIndex((header) =>
      aliases.includes(header)
    );
    return index >= 0 ? index : fallback;
  };

  const number = find(
    ["songnumber", "number", "songno", "sno"], 0
  );
  const name = find(
    ["songname", "song", "name"], 1
  );
  const singer = find(
    ["singer", "singername", "participant"], 2
  );

  if (headers.length < 2) {
    throw new Error(
      "The sheet needs at least Song Number and Song Name columns."
    );
  }

  return { number, name, singer };
}

// Read the last successful snapshot from this browser.
export function getCachedSongs() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    return Array.isArray(parsed.songs) ? parsed : null;
  } catch {
    return null;
  }
}

// Save the latest good response for offline/error recovery.
function saveCachedSongs(songs, updatedAt) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ songs, updatedAt })
    );
  } catch {
    // Storage may be disabled or full. Live fetching still works.
  }
}

// Fetch and normalize completed songs from the public spreadsheet.
export async function fetchSongs() {
  const configuredSheetId = String(SHEET_ID || "").trim();

  if (
    !configuredSheetId ||
    configuredSheetId === "PASTE_YOUR_SHEET_ID_HERE"
  ) {
    throw new Error(
      "Google Sheet ID is missing. Check js/config.js."
    );
  }

  const url = new URL(
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
      configuredSheetId
    )}/gviz/tq`
  );

  url.searchParams.set("gid", String(SHEET_GID || "0"));
  url.searchParams.set("tqx", "out:json");

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `Google Sheets request failed (HTTP ${response.status}).`
    );
  }

  const payload = parseVisualizationResponse(
    await response.text()
  );

  if (payload.status !== "ok" || !payload.table) {
    throw new Error(
      "Google Sheets could not provide the data. Check sharing permissions and tab ID."
    );
  }

  const table = payload.table;
  const columns = readColumnIndexes(table);

  const songs = (table.rows || [])
    .map((row, index) => {
      const cells = row.c || [];

      return {
        songNumber:
          cellValue(cells[columns.number]) || String(index + 1),
        songName: cellValue(cells[columns.name]),
        singer: cellValue(cells[columns.singer])
      };
    })
    .filter((song) => song.songName.length > 0)
    .sort((a, b) => {
      const aNum = Number(a.songNumber);
      const bNum = Number(b.songNumber);

      if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
        return aNum - bNum;
      }

      return String(a.songNumber).localeCompare(
        String(b.songNumber)
      );
    });

  const result = {
    songs,
    updatedAt: new Date().toISOString(),
    source: "live"
  };

  saveCachedSongs(result.songs, result.updatedAt);
  return result;
}

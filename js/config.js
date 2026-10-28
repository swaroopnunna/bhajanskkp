
/*
 * Shared configuration for both pages.
 * Find the sheet ID in:
 * https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
 */
export const SHEET_ID = "1jpmKr-eecSDzO5RycAnSQ7MDzo6TeksoscKVP2eLxDQ";

// Numeric gid for the worksheet tab. The default tab is often gid=0.
export const SHEET_GID = "0";

// Automatically refresh data every 15 seconds.
export const REFRESH_INTERVAL_MS = 15000;

// Local cache for the most recently retrieved data.
export const STORAGE_KEY = "bhajan-song-display:last-good:v1";


# Bhajan Song Display

A static Google Sheets-powered display built with HTML, CSS, and vanilla JavaScript.

## Features

- TV display with large current song number
- Continuous vertical song-list marquee
- Mobile-friendly audience page
- English and Telugu language options
- Automatic refresh every 15 seconds
- Last-updated timestamp
- Local cache for offline/error recovery
- No backend, database, framework, API key, or paid service

## Setup

1. Replace PASTE_YOUR_SHEET_ID_HERE in js/config.js.
2. Make sure the sheet is shared with "Anyone with the link — Viewer".
3. Ensure row 1 contains Song Number, Song Name, and Singer.
4. Check SHEET_GID in js/config.js if using a different worksheet tab.
5. Serve the folder locally or publish it to GitHub Pages.

## Local testing

Open a terminal in the project folder and run:

python -m http.server 8000

Then open:

http://localhost:8000/

TV display:
http://localhost:8000/index.html

Audience page:
http://localhost:8000/audience.html

Use a local HTTP server instead of opening the HTML files directly,
because JavaScript ES modules may not work through file:// URLs.

## GitHub Pages

1. Create a GitHub repository.
2. Upload all project files, preserving the folder structure.
3. In Settings > Pages, configure deployment from your branch.
4. Open the published index.html page for the TV.
5. Share the published audience.html URL with participants.

## Telugu transliteration

Telugu mode uses the free Google Input Tools endpoint.
Transliteration is phonetic and may not perfectly reproduce names.
Successful results are cached locally. If the service fails,
the page displays the original English text.

## Data rule

Only rows with a non-empty Song Name are displayed.
The current song is the completed song with the highest song number.
A blank Singer cell is allowed.

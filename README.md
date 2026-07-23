# Fetchify

**🌐 Live Demo → [fetchify-y32i.onrender.com](https://fetchify-y32i.onrender.com)**

A local-first web app for downloading YouTube videos as **MP3** or **MP4**. Built with React + Vite on the frontend and Express on the backend.

---

## Features

- Search YouTube directly from the app — no URL copying needed
- Download as MP3 (up to 320 Kbps) or MP4 (up to 1080p+)
- Real-time download progress via Server-Sent Events
- Batch queue — add multiple tracks and download them all at once
- Per-track format and quality selection
- Saves files to a local `Fetchify` subfolder in your Downloads

---

## Prerequisites

**Node.js v18+** — [nodejs.org](https://nodejs.org)

**yt-dlp** — must be available in your system PATH.

```bash
# Windows
winget install yt-dlp

# macOS
brew install yt-dlp

# Linux
pip install yt-dlp
```

> `ffmpeg` is bundled via `ffmpeg-static` — no separate install required.

---

## Getting Started

```bash
git clone https://github.com/YOUR_USERNAME/fetchify.git
cd fetchify
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Production

```bash
npm run build
npm start
```

Serves the built frontend through the Express server on port `5000` (or `$PORT`).

---

## Announcement Banner

Create an `info.txt` file in the project root with any text to display a banner inside the app. Leave it empty or delete it to hide the banner. See `info.txt.example` for reference.

---

## Project Structure

```
├── src/           # React frontend
│   ├── App.jsx
│   ├── App.css
│   └── index.css
├── server.js      # Express API server
├── dev.js         # Development runner (Vite + Express)
├── vite.config.js
└── package.json
```

---

## Tech Stack

- **Frontend:** React 19, Vite 8, Vanilla CSS
- **Backend:** Node.js, Express
- **Downloader:** yt-dlp
- **Audio/Video:** ffmpeg (via ffmpeg-static)

---

## Disclaimer

For personal use only. Downloading copyrighted content may violate YouTube's Terms of Service. Use responsibly.

---

## License

MIT

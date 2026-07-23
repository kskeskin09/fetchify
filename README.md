# 🎵 BeatStream — YouTube MP3 & MP4 Downloader

A modern, full-stack desktop web app for downloading YouTube videos as **MP3** or **MP4** with a beautiful, responsive UI built with **React + Vite** and an **Express** backend.

![BeatStream Screenshot](https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=800&auto=format&fit=crop&q=60)

---

## ✨ Features

- 🔍 **YouTube Search** — Search directly from the app, no URL needed
- 🎵 **MP3 Download** — Extract audio at up to 320 Kbps
- 🎬 **MP4 Download** — Download video at various quality levels (144p–best)
- 📊 **Real-time Progress** — Live download progress via Server-Sent Events (SSE)
- 📁 **Custom Download Path** — Choose where your files are saved (local use)
- 📢 **Announcement Banner** — Edit `info.txt` to show a banner message in the app
- 🌗 **Dark, premium UI** — Glassmorphism design with smooth animations

---

## 🛠️ Prerequisites

Before running the app, make sure you have the following installed:

### 1. Node.js (v18+)
Download from [nodejs.org](https://nodejs.org)

### 2. yt-dlp
`yt-dlp` is required for searching and downloading. It must be available in your system PATH.

**Windows:**
```powershell
winget install yt-dlp
# or download from https://github.com/yt-dlp/yt-dlp/releases
```

**macOS:**
```bash
brew install yt-dlp
```

**Linux:**
```bash
sudo apt install yt-dlp
# or
pip install yt-dlp
```

> **Note:** `ffmpeg` is bundled via the `ffmpeg-static` npm package — no separate install needed.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/youtube-mp3-downloader-ui.git
cd youtube-mp3-downloader-ui
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run in development mode

```bash
npm run dev
```

This starts both the **Vite frontend** (hot-reload) and the **Express backend** concurrently. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Production Build

```bash
npm run build
npm start
```

This builds the React app and serves it via the Express server on port `5000`.

---

## ⚙️ Configuration

| Option | Default | Description |
|---|---|---|
| `PORT` | `5000` | Express server port (env var) |
| Download path | `~/Downloads/BeatStream` | Can be set per-download in the UI |
| `info.txt` | *(empty)* | Edit this file to display an announcement banner in the app |

---

## 📁 Project Structure

```
├── src/               # React frontend (Vite)
│   ├── App.jsx        # Main application component
│   ├── App.css        # Component styles
│   └── index.css      # Global styles & design system
├── server.js          # Express backend (search + download API)
├── dev.js             # Development concurrency script
├── vite.config.js     # Vite configuration
├── info.txt           # Editable announcement banner text
└── package.json
```

---

## ⚠️ Legal Disclaimer

This tool is intended for **personal use only**. Downloading copyrighted content without permission may violate YouTube's Terms of Service and applicable laws. Use responsibly.

---

## 🧰 Tech Stack

- **Frontend:** React 19, Vite 8, Vanilla CSS (glassmorphism)
- **Backend:** Node.js, Express
- **Downloader:** yt-dlp
- **Audio/Video processing:** ffmpeg (via ffmpeg-static)
- **Dev tooling:** Oxlint

---

## 📄 License

MIT — feel free to use, modify, and distribute.

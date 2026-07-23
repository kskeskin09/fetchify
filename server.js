import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
const ffmpeg = require('ffmpeg-static');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const activeDownloads = {};
let sseClients = [];

const broadcastProgress = (videoId) => {
  const update = activeDownloads[videoId];
  if (!update) return;
  const data = JSON.stringify(update);
  sseClients.forEach((client) => {
    client.write(`data: ${data}\n\n`);
  });
};

app.get('/api/progress', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write(`data: ${JSON.stringify(Object.values(activeDownloads))}\n\n`);
  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter((client) => client !== res);
  });
});

app.get('/api/search', (req, res) => {
  const query = req.query.q;
  const musicOnly = req.query.musicOnly === 'true';

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const searchQuery = musicOnly ? `${query} music` : query;

  const ytDlp = spawn('yt-dlp', [
    `ytsearch12:${searchQuery}`,
    '--flat-playlist',
    '--dump-single-json',
    '--no-playlist',
    '--no-warnings',
    '--no-update',
  ]);

  let stdoutData = '';
  let stderrData = '';

  ytDlp.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });

  ytDlp.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  ytDlp.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: 'Search failed', details: stderrData });
    }

    try {
      const parsed = JSON.parse(stdoutData);
      const entries = (parsed.entries || []).map((entry) => {
        let thumbnailUrl = 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=360&auto=format&fit=crop&q=60';
        if (entry.thumbnails && entry.thumbnails.length > 0) {
          const sorted = [...entry.thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
          thumbnailUrl = sorted[0].url;
        }

        return {
          id: entry.id,
          title: entry.title,
          artist: entry.uploader || entry.channel || 'Unknown Artist',
          duration: entry.duration || 0,
          thumbnail: thumbnailUrl,
          url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
        };
      });

      res.json({ results: entries });
    } catch (err) {
      res.status(500).json({ error: 'Failed to parse search response' });
    }
  });
});

app.get('/api/announcement', (req, res) => {
  const filePath = path.join(process.cwd(), 'info.txt');
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8').trim();
      return res.json({ message: content });
    } catch (e) {
      return res.json({ message: '' });
    }
  }
  res.json({ message: '' });
});

app.post('/api/download', (req, res) => {
  const { id, title, format = 'mp3', quality = 'best', downloadPath, createSubfolder = true } = req.body;

  if (!id || !title) {
    return res.status(400).json({ error: 'Video id and title are required' });
  }

  if (activeDownloads[id] && (activeDownloads[id].status === 'downloading' || activeDownloads[id].status === 'transcoding')) {
    return res.json({ message: 'Download already in progress', status: activeDownloads[id].status });
  }

  const host = req.headers.host || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('192.168.') || host.includes('::1');

  let targetDir;
  if (isLocal) {
    targetDir = downloadPath ? path.resolve(downloadPath) : path.join(os.homedir(), 'Downloads');
    if (createSubfolder) {
      targetDir = path.join(targetDir, 'Fetchify');
    }
  } else {
    targetDir = path.join(__dirname, 'temp_downloads');
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  activeDownloads[id] = {
    id,
    title,
    format,
    quality,
    progress: 0,
    status: 'downloading',
    error: null,
  };
  broadcastProgress(id);

  let args = [];

  if (format === 'mp3') {
    let audioQuality = '320K';
    if (quality === 'high') audioQuality = '256K';
    else if (quality === 'medium') audioQuality = '192K';
    else if (quality === 'low') audioQuality = '128K';

    args = [
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', audioQuality,
      '--ffmpeg-location', ffmpeg,
      '--no-update',
      '--no-playlist',
      '-o', path.join(targetDir, '%(title)s.%(ext)s'),
      `https://www.youtube.com/watch?v=${id}`,
    ];
  } else {
    const formatSort = quality === 'best'
      ? 'res,ext:mp4:m4a'
      : quality === 'high'
        ? 'res:1080,ext:mp4:m4a'
        : quality === 'medium'
          ? 'res:720,ext:mp4:m4a'
          : quality === 'low'
            ? 'res:480,ext:mp4:m4a'
            : quality === '360p'
              ? 'res:360,ext:mp4:m4a'
              : quality === '240p'
                ? 'res:240,ext:mp4:m4a'
                : 'res:144,ext:mp4:m4a';

    args = [
      '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best',
      '-S', formatSort,
      '--ffmpeg-location', ffmpeg,
      '--no-update',
      '--no-playlist',
      '-o', path.join(targetDir, '%(title)s.%(ext)s'),
      `https://www.youtube.com/watch?v=${id}`,
    ];
  }

  const ytDlp = spawn('yt-dlp', args);

  ytDlp.stdout.on('data', (data) => {
    const line = data.toString();

    const downloadMatch = line.match(/\[download\]\s+(\d+\.?\d*)%/);
    if (downloadMatch) {
      const progress = parseFloat(downloadMatch[1]);
      activeDownloads[id].progress = progress;
      activeDownloads[id].status = progress === 100 ? 'transcoding' : 'downloading';
      broadcastProgress(id);
    }

    if (line.includes('[ExtractAudio]') || line.includes('[ffmpeg]')) {
      activeDownloads[id].status = 'transcoding';
      broadcastProgress(id);
    }
  });

  ytDlp.stderr.on('data', (data) => {
    console.error(`[yt-dlp ${id}]:`, data.toString());
  });

  ytDlp.on('close', (code) => {
    if (code === 0) {
      activeDownloads[id].status = 'completed';
      activeDownloads[id].progress = 100;

      try {
        if (fs.existsSync(targetDir)) {
          const files = fs.readdirSync(targetDir);
          const cleanTitle = title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 15);
          const matchedFile = files.find((f) =>
            (f.toLowerCase().includes(cleanTitle.toLowerCase()) ||
              f.toLowerCase().includes(title.toLowerCase().substring(0, 10))) &&
            f.endsWith(format)
          );
          if (matchedFile) {
            activeDownloads[id].filePath = path.join(targetDir, matchedFile);
          }
        }
      } catch (err) {
        console.error('Failed to locate downloaded file:', err);
      }
    } else {
      activeDownloads[id].status = 'failed';
      activeDownloads[id].error = `Failed with exit code ${code}`;
    }
    broadcastProgress(id);
  });

  res.json({ message: 'Download initiated', id });
});

app.get('/api/download-file', (req, res) => {
  const { id } = req.query;
  const download = activeDownloads[id];
  if (download && download.status === 'completed' && download.filePath && fs.existsSync(download.filePath)) {
    res.download(download.filePath, path.basename(download.filePath));
  } else {
    res.status(404).json({ error: 'File not found or download not completed' });
  }
});

const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Fetchify server running at http://localhost:${PORT}`);
});

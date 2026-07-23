# Fetchify

YouTube videolarını MP3 veya MP4 olarak indirmenizi sağlayan hızlı ve modern bir web uygulaması.

👉 **[Hemen Tarayıcıda Kullan (Canlı Demo)](https://fetchify-y32i.onrender.com)** — Herhangi bir kurulum yapmadan direkt kullanabilirsiniz.

---

## ⚡ Özellikler

- 🔍 **Doğrudan Arama:** YouTube URL'si kopyalamanıza gerek kalmadan uygulama içinden arama yapın.
- 🎵 **MP3 & MP4 Desteği:** İster yüksek kalitede ses (320kbps'e kadar) ister video (1080p'ye kadar) indirin.
- 📊 **Canlı İlerleme:** İndirme durumunu ve yüzdesini anlık olarak takip edin.
- 📑 **Toplu İndirme Kuyruğu:** Birden fazla içeriği listeye ekleyip sırayla veya tek tıkla indirin.

---

## 💻 Kendi Bilgisayarında Çalıştırmak İsteyenler İçin (Local Setup)

Uygulamayı kendi yerel sunucunuzda çalıştırmak veya geliştirmek isterseniz aşağıdaki adımları izleyebilirsiniz.

### Ön Gereksinimler

1. **Node.js (v18+)** — [nodejs.org](https://nodejs.org)
2. **yt-dlp** — Bilgisayarınızda kurulu olmalıdır:
   - **Windows:** `winget install yt-dlp`
   - **macOS:** `brew install yt-dlp`
   - **Linux:** `pip install yt-dlp`

### Kurulum Adımları

1. Repoyu klonlayın:
   ```bash
   git clone https://github.com/kskeskin09/fetchify.git
   cd fetchify
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. Geliştirici modunda çalıştırın:
   ```bash
   npm run dev
   ```
   Tarayıcınızda `http://localhost:5173` adresine giderek kullanabilirsiniz.

---

## 🛠️ Teknolojiler

- **Frontend:** React, Vite, CSS (Glassmorphism UI)
- **Backend:** Node.js, Express
- **İndirme & Dönüştürme:** yt-dlp, ffmpeg

---

## 📄 Lisans

[MIT License](LICENSE)

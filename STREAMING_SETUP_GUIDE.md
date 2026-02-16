# Panduan Setup Live Streaming (OBS ke Web)

Karena browser tidak bisa memutar protokol RTMP secara langsung, kita perlu menggunakan perantara (Streaming Provider).

## Cara Kerja
`OBS (RTMP)` -> `Streaming Provider` -> `Website (HLS/m3u8)`

## Langkah 1: Pilih Streaming Provider (Server)
Anda membutuhkan server yang menerima RTMP dan mengeluarkan link HLS (`.m3u8`). Beberapa pilihan:

1. **Cloudflare Stream (Rekomendasi)**: Sangat stabil, murah (pay-as-you-go), dan mudah diatur.
2. **Mux.com**: Sangat ramah untuk developer.
3. **Restream.io / Livepush.io**: Jika Anda ingin restream ke banyak platform sekaligus.
4. **Ant Media / OvenMediaEngine**: Jika ingin delay yang sangat rendah (ultra-low latency).

## Langkah 2: Setup di OBS
Setelah Anda mendapatkan **RTMP URL** dan **Stream Key** dari provider di atas:

1. Buka **OBS Studio**.
2. Pergi ke **Settings** -> **Stream**.
3. Pilih Service: **Custom**.
4. Masukkan **Server** (RTMP URL) dan **Stream Key**.
5. Di bagian **Output**:
   - Encoder: **x264** atau **NVIDIA NVENC**.
   - Rate Control: **CBR**.
   - Bitrate: **4000 - 6000 Kbps** (untuk 1080p).
   - Keyframe Interval: **2 s** (Penting untuk streaming web!).

## Langkah 3: Masukkan Link di Website
Provider akan memberikan link yang berakhiran `.m3u8` (HLS link). Link inilah yang akan kita masukkan ke kode website di `src/pages/Streaming.jsx`.

---

> [!TIP]
> **Cloudflare Stream** adalah pilihan terbaik jika Anda ingin memulai dengan cepat dan hanya membayar sesuai pemakaian. Mereka memberikan dashboard yang jelas untuk melihat status stream Anda.

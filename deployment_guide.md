# Panduan Hosting Website (Deploy ke Vercel)

Vercel adalah cara termudah dan tercepat untuk mengonlinekan website React/Vite Anda secara gratis.

## Cara 1: Upload Manual (Paling Cepat untuk Pemula)

1.  **Build Project**: Buka terminal di folder project Anda dan ketik:
    ```bash
    npm run build
    ```
    *(Saya sudah mencoba ini untuk Anda, dan berhasil! Perintah ini membuat folder `dist` yang berisi semua file website yang siap online).*
2.  **Siapkan Folder**: Di File Explorer Anda, pastikan folder `dist` sudah muncul di dalam folder `PROJRCT WEBSITE`.
3.  **Buka Vercel**: Pergi ke [vercel.com/deploy](https://vercel.com/deploy).
4.  **Drag & Drop**: Tarik (drag) folder `dist` tadi dan jatuhkan (drop) ke area upload di browser Vercel.
5.  **Selesai**: Tunggu sebentar, dan Vercel akan memberikan link website Anda yang sudah online!

## Cara 2: Pakai GitHub (Sangat Disarankan)

Jika Anda ingin website otomatis terupdate setiap kali ada perubahan, kodenya harus ada di GitHub.

### Masalah: "git : The term 'git' is not recognized"
Jika muncul error ini, artinya laptop Anda belum terinstal aplikasi **Git**.

**Pilihan A: Install Git (Rekomendasi)**
1.  Download dan Install Git dari: [git-scm.com/download/win](https://git-scm.com/download/win).
2.  Setelah install, restart terminal/VS Code Anda.
3.  Coba jalankan perintah `git init` lagi.

**Pilihan B: Upload Tanpa Git (Manual)**
1.  Buka [github.com/new](https://github.com/new) dan buat repository baru.
2.  Di halaman repository baru, cari tulisan **"uploading an existing file"**.
3.  Tarik (drag) semua file dari folder `PROJRCT WEBSITE` (kecuali folder `node_modules` dan `dist`) ke browser.
4.  Klik **"Commit changes"**.

## Cara 3: Menghubungkan ke Vercel
 CLI (Lewat Terminal)

Saya bisa membantu Anda mencoba proses build-nya sekarang. Ikuti langkah ini:

1.  **Install Vercel CLI**:
    ```bash
    npm install -g vercel
    ```
2.  **Login**:
    ```bash
    vercel login
    ```
3.  **Deploy**: 
    Jalankan perintah ini di folder project Anda:
    ```bash
    vercel
    ```
    Ikuti instruksinya (pilih "Yes" untuk semua pertanyaan). Setelah selesai, Anda akan mendapatkan **Production URL**.

---

### Penting: Persiapan Sebelum Hosting
Sebelum di-onlinekan, kita harus memastikan link streaming dan sistem tiketnya sudah siap di dalam kode.

> [!NOTE]
> Setelah di-onlinekan, link Anda akan menjadi seperti: `nama-project-anda.vercel.app`. Link inilah yang nanti Anda kirim ke pembeli.

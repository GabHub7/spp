# PoncolPay — Sistem Informasi Pembayaran SPP

Aplikasi web pencatatan pembayaran SPP untuk **SMK Poncol Jakarta**. Mengelola
data siswa, tagihan SPP otomatis, pembayaran (tunai / transfer / QRIS),
tunggakan, laporan keuangan, audit log, hingga backup & restore data.

Dibangun dengan **Next.js 16** (App Router) + **Supabase** (Postgres), siap
di-deploy ke **Vercel**. Tema warna sekolah: merah · hitam · putih · oranye
dengan gaya UI claymorphism dan ikon (tanpa emoji).

## Fitur

- **Autentikasi** berbasis peran:
  - **Staf** — Admin (kontrol penuh), Bendahara, Kepala Sekolah (read-only)
  - **Orang Tua** — login & bayar SPP sendiri lewat web
  - **Lupa password** — reset password lewat email terdaftar (Supabase Auth)
- **Portal Orang Tua** (mobile-friendly) — daftar via NIS anak, lihat tagihan, bayar via **Transfer Bank** atau **QRIS (gambar)** dengan **unggah bukti**, lihat status & cetak bukti
- **Verifikasi pembayaran** — staf meninjau bukti pembayaran online lalu menyetujui/menolak
- **Dashboard** — total siswa, pembayaran harian/bulanan, tunggakan, grafik, notifikasi verifikasi
- **Master Data** — siswa, kelas, jurusan, tahun ajaran, tarif SPP (tambah / **edit** / **hapus**)
- **Import / Export Excel** data siswa (kolom: NIS, Nama, Jurusan, Kelas, No HP Orang Tua, dll.)
- **Tagihan otomatis** SPP per bulan (Juli–Juni) untuk siswa aktif
- **Jenis tagihan lain** — Seragam, PTS, PAS, Daftar Ulang, dll. (per kelas atau semua siswa aktif)
- **Pembayaran** tunai/transfer/QRIS — **Lunas** atau **Cicilan** (nominal cicilan bebas), nomor transaksi unik `SPP-YYYYMMDD-XXXX`, **bukti pembayaran** ukuran **kwitansi (±80mm)** siap cetak / PDF
- **Pengaturan metode pembayaran** — Admin atur rekening bank & unggah gambar QRIS statis
- **Riwayat & Tunggakan** dengan filter, kolom status (Lunas/Cicilan) + export Excel/PDF
- **Tampilan responsif** — tabel berubah jadi kartu di layar HP (tanpa geser ke samping)
- **Laporan** harian/bulanan/tahunan + export
- **Audit log** (append-only) dan **Backup/Restore** database (JSON)

## Menjalankan secara lokal

1. **Install dependency**

   ```bash
   npm install
   ```

2. **Buat project Supabase** lalu salin kredensial ke `.env.local` (lihat `.env.example`):

   ```bash
   cp .env.example .env.local
   # isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Terapkan migrasi database** — jalankan isi `supabase/migrations/*.sql`
   **berurutan 001 → 006** via **Supabase SQL Editor**, atau dengan Supabase CLI:

   ```bash
   supabase db push
   ```

   > Migrasi `005_revisions.sql` menambahkan: jenis tagihan (Seragam/PTS/PAS/Daftar
   > Ulang), kolom cicilan (`paid_amount` + status `PARTIAL`), dan flag `is_installment`.
   > Migrasi `006_branding.sql` menambahkan tabel `school_settings` untuk identitas
   > aplikasi (nama sekolah, nama aplikasi, logo, favicon, warna tema) — lihat
   > bagian **White-label** di bawah.

4. **Jalankan**

   ```bash
   npm run dev
   ```

5. **Buat akun admin pertama** — buka [`/setup`](http://localhost:3000/setup),
   isi nama, username, dan password (min. 8 karakter, ada huruf besar, kecil,
   angka). Setelah admin dibuat, halaman ini otomatis nonaktif. Masuk di `/login`.

6. **Orang tua** mendaftar sendiri di [`/daftar`](http://localhost:3000/daftar)
   menggunakan **NIS anak** (siswa harus sudah ada di data, mis. via import Excel
   oleh admin). Setelah masuk, orang tua diarahkan ke `/portal` untuk membayar.

> Catatan: fitur unggah bukti & gambar QRIS memakai **Supabase Storage** (bucket
> `uploads`, dibuat otomatis oleh migrasi `004`). Pastikan Storage aktif di
> project Supabase Anda.

## Reset Password (Lupa Password)

Fitur "Lupa Password" memakai **Supabase Auth** (`resetPasswordForEmail`). Email
yang dipakai adalah email **asli** yang diisi saat membuat akun (admin, staf,
maupun orang tua). Agar tautan reset terkirim & valid, konfigurasi di
**Supabase Dashboard → Authentication**:

1. **URL Configuration**
   - **Site URL**: domain utama, mis. `https://poncolspp.web.id`
   - **Redirect URLs** (tambahkan semua domain yang dipakai):
     - `https://poncolspp.web.id/reset-password`
     - `https://spp-rust.vercel.app/reset-password`
     - `http://localhost:3000/reset-password` (untuk pengembangan)

   Halaman web otomatis memakai domain tempat user membuka aplikasi, jadi tautan
   reset akan kembali ke domain yang sama selama domain tersebut terdaftar di sini.

2. **Email / SMTP** — Authentication → **Emails**. Untuk produksi sebaiknya pasang
   **Custom SMTP** (mis. Resend, SendGrid, Gmail SMTP) agar email reset terkirim
   andal. Template **Reset Password** menggunakan `{{ .ConfirmationURL }}`.

3. **Akun lama** yang dibuat sebelum fitur ini (mis. masih beremail `…@poncolpay.local`)
   tidak bisa menerima email reset sampai emailnya diisi. Admin dapat
   memperbaruinya di **Pengaturan → Pengguna → tombol Email** pada tiap akun.

## Deploy ke Vercel

1. Import repository ke Vercel.
2. Tambahkan Environment Variables yang sama seperti `.env.example`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`).
3. Deploy. Pastikan migrasi database sudah diterapkan ke project Supabase,
   lalu buka `/setup` pada URL produksi untuk membuat admin pertama.

## Logo sekolah

Lambang sekolah berada di `public/logo.svg` (latar transparan, vektor, skalabel)
sebagai fallback bawaan. Untuk identitas per sekolah, gunakan **White-label**
di bawah — tidak perlu mengganti file source.

## White-label (satu source code, banyak sekolah)

Setiap sekolah dijalankan sebagai **deployment terpisah**: project Supabase
sendiri, domain sendiri, hanya source code ini yang sama. Semua identitas
visual bisa diatur lewat UI, tanpa menyentuh kode:

**Pengaturan → Identitas Aplikasi & Sekolah** (khusus Admin):
- Nama Sekolah & Nama Aplikasi (tampil di sidebar, judul tab browser, struk)
- Tingkat Sekolah (SD/SMP/SMA/SMK/Lainnya) — bersifat informasi
- Logo & Favicon — unggah dari perangkat (tersimpan di Supabase Storage) atau
  tempel URL gambar langsung
- Warna Utama & Warna Kedua — lewat color picker (hex) atau ketik manual
  `#rrggbb` / `rgb(r, g, b)`; seluruh tema klaymorphism (tombol, badge, grafik)
  otomatis mengikuti

**Kelas** juga mendukung tingkat bebas (bukan cuma X/XI/XII) — isi sesuai
jenjang: SD (1–6), SMP (7–9), SMA/SMK (X–XII), dll.

Untuk sekolah baru: clone repo → buat project Supabase baru → jalankan migrasi
001–006 → deploy ke domain sendiri → buka `/setup` untuk admin pertama →
atur identitas di Pengaturan. Data SMK Poncol Jakarta yang sudah ada tidak
terpengaruh — migrasi 006 mengisi nilai default sesuai sekolah ini.

## Catatan teknis

Lihat `CLAUDE.md` untuk arsitektur, konvensi server actions, auth guard, dan
design system.

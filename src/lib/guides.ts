export interface GuideSection {
  heading: string
  points: string[]
}

export interface PageGuide {
  title: string
  intro: string
  sections: GuideSection[]
}

/**
 * Per-page usage guides shown by the "Panduan Penggunaan" button in the admin
 * navbar. Keyed by the route pathname (longest-prefix match against the
 * current URL), written top-to-bottom in the order a staff member would
 * actually use the page.
 */
export const PAGE_GUIDES: Record<string, PageGuide> = {
  '/': {
    title: 'Dashboard',
    intro: 'Ringkasan kondisi keuangan SPP sekolah saat ini.',
    sections: [
      { heading: '1. Kartu statistik', points: [
        'Total siswa aktif, pembayaran hari ini, pembayaran bulan ini, dan total tunggakan ditampilkan di bagian atas.',
        'Angka ini otomatis diperbarui setiap kali ada pembayaran baru atau verifikasi.',
      ] },
      { heading: '2. Grafik pembayaran', points: [
        'Grafik batang menunjukkan tren pembayaran per bulan pada tahun ajaran berjalan.',
        'Gunakan untuk melihat bulan-bulan dengan pemasukan SPP rendah.',
      ] },
      { heading: '3. Notifikasi verifikasi', points: [
        'Jika ada pembayaran online (transfer/QRIS) dari orang tua yang menunggu, akan muncul badge di menu Verifikasi.',
      ] },
    ],
  },
  '/siswa': {
    title: 'Data Siswa',
    intro: 'Kelola data induk siswa: tambah, ubah, cari, filter, import/export, dan hapus siswa yang sudah keluar.',
    sections: [
      { heading: '1. Cari & filter', points: [
        'Gunakan kolom pencarian untuk cari berdasarkan NIS, nama, atau nama orang tua.',
        'Filter Kelas, Jurusan, dan Status bisa dikombinasikan sekaligus.',
        'Klik "Reset Filter" untuk mengembalikan tampilan ke semua siswa.',
      ] },
      { heading: '2. Tambah siswa', points: [
        'Klik "Tambah Siswa", isi NIS (wajib unik), nama, kelas, jurusan, dan data orang tua.',
        'Setelah disimpan akan muncul notifikasi hijau di atas tabel.',
      ] },
      { heading: '3. Import massal dari Excel', points: [
        'Klik "Template" untuk unduh format Excel kosong.',
        'Isi data sesuai kolom template, lalu klik "Import" dan pilih file tersebut.',
        'Baris dengan NIS yang sudah ada otomatis dilewati (tidak menimpa data lama).',
      ] },
      { heading: '4. Edit & checklist massal', points: [
        'Klik "Edit" pada baris siswa untuk mengubah datanya, termasuk status (Aktif/Lulus/Pindah/Keluar).',
        'Centang beberapa siswa sekaligus untuk mengubah status banyak siswa dalam satu klik ("Ubah status massal…").',
      ] },
      { heading: '5. Hapus siswa Keluar', points: [
        'Tombol "Hapus" hanya muncul untuk siswa berstatus Keluar.',
        'Menghapus siswa akan ikut menghapus seluruh riwayat tagihan & pembayarannya secara permanen — pastikan sudah tidak diperlukan lagi (misalnya sudah di-backup).',
        'Bisa dihapus satu per satu, atau dicentang banyak sekaligus lalu klik "Hapus X Siswa Keluar".',
      ] },
      { heading: '6. Export', points: [
        'Tombol "Export" mengunduh seluruh data siswa dalam format Excel.',
      ] },
    ],
  },
  '/tagihan': {
    title: 'Tagihan',
    intro: 'Kelola tagihan SPP bulanan otomatis dan tagihan jenis lain (Seragam, PTS, PAS, Daftar Ulang, dll).',
    sections: [
      { heading: '1. Pilih jenis tagihan', points: [
        'Dropdown "Jenis" di filter memilih kategori: SPP, Seragam, PTS, PAS, Daftar Ulang, atau Lainnya.',
        'Untuk SPP, muncul juga pilihan bulan/periode karena SPP dibuat per bulan.',
      ] },
      { heading: '2. Generate tagihan SPP', points: [
        'Klik "Generate Tagihan" untuk membuat tagihan SPP bulan berjalan bagi semua siswa aktif secara otomatis.',
        'Aman diklik berkali-kali — siswa yang sudah punya tagihan pada periode itu tidak akan dibuat ulang (idempotent).',
        'Pastikan Tarif SPP untuk tahun ajaran aktif sudah diisi sebelum generate.',
      ] },
      { heading: '3. Buat tagihan jenis lain', points: [
        'Klik "Tagihan Lain", pilih jenis (Seragam/PTS/PAS/dll), isi judul & nominal, lalu pilih sasaran: satu kelas atau semua siswa aktif.',
      ] },
      { heading: '4. Edit & hapus tagihan', points: [
        'Tagihan yang belum ada pembayaran sama sekali bisa diedit nominalnya atau dihapus lewat tombol "Edit"/"Hapus" di setiap baris.',
        'Tagihan yang sudah ada pembayaran (termasuk cicilan sebagian) tidak bisa diubah/dihapus untuk menjaga riwayat keuangan tetap akurat.',
        'Centang beberapa baris sekaligus untuk hapus massal via "Hapus Terpilih".',
      ] },
      { heading: '5. Status tagihan', points: [
        'Belum Bayar → belum ada pembayaran sama sekali.',
        'Cicilan → sudah dibayar sebagian, sisa tagihan tertera di bawah nominal.',
        'Lunas → sudah dibayar penuh.',
      ] },
    ],
  },
  '/pembayaran': {
    title: 'Pembayaran',
    intro: 'Catat pembayaran tunai/transfer/QRIS dari siswa yang datang langsung ke petugas.',
    sections: [
      { heading: '1. Cari siswa', points: [
        'Ketik NIS atau nama siswa, tekan Enter atau klik "Cari".',
        'Pilih siswa dari hasil pencarian untuk melihat daftar tagihan yang belum lunas.',
      ] },
      { heading: '2. Pilih mode pembayaran', points: [
        '"Bayar Lunas" — centang satu atau beberapa tagihan sekaligus, totalnya otomatis dijumlahkan.',
        '"Cicilan" — pilih satu tagihan, lalu masukkan nominal cicilan (bebas, maksimal sebesar sisa tagihan).',
      ] },
      { heading: '3. Metode & catatan', points: [
        'Pilih metode: Tunai, Transfer Bank, atau QRIS.',
        'Catatan bersifat opsional, misalnya "Cicilan ke-2".',
      ] },
      { heading: '4. Simpan & cetak bukti', points: [
        'Klik "Bayar & Cetak Bukti" — nomor transaksi dibuat otomatis, dan halaman struk kwitansi langsung terbuka untuk dicetak.',
      ] },
      { heading: '5. Riwayat pembayaran terbaru', points: [
        'Tabel di bawah menampilkan 15 transaksi terakhir beserta tombol untuk mencetak ulang buktinya.',
      ] },
    ],
  },
  '/verifikasi': {
    title: 'Verifikasi Pembayaran',
    intro: 'Meninjau pembayaran online (transfer/QRIS) yang diajukan orang tua lewat Portal sebelum tagihan dianggap lunas.',
    sections: [
      { heading: '1. Cari & filter', points: [
        'Gunakan kolom pencarian untuk cari berdasarkan nama siswa, NIS, atau nomor transaksi.',
        'Filter Kelas dan Metode bisa dikombinasikan sekaligus untuk mempersempit daftar pengajuan.',
        'Klik "Reset Filter" untuk mengembalikan tampilan ke semua pengajuan yang menunggu.',
      ] },
      { heading: '2. Lihat bukti pembayaran', points: [
        'Setiap kartu menampilkan nama siswa, jenis tagihan, nominal, dan metode.',
        'Klik "Lihat Bukti" untuk membuka foto/PDF bukti transfer yang diunggah orang tua.',
      ] },
      { heading: '3. Setujui atau tolak', points: [
        '"Verifikasi" — tagihan otomatis ter-update jadi Lunas (atau Cicilan jika nominalnya belum menutupi tagihan penuh).',
        '"Tolak" — pengajuan dibatalkan, tagihan kembali berstatus belum bayar, dan orang tua bisa mengajukan ulang.',
      ] },
      { heading: '4. Catatan penting', points: [
        'Selalu cocokkan nominal & nama pengirim di bukti transfer dengan data sebelum menyetujui.',
        'Pembayaran yang sudah diproses (disetujui/ditolak) tidak muncul lagi di daftar ini.',
      ] },
    ],
  },
  '/riwayat': {
    title: 'Riwayat Pembayaran',
    intro: 'Daftar seluruh transaksi pembayaran yang sudah berhasil (tunai, transfer, QRIS, cicilan).',
    sections: [
      { heading: '1. Filter', points: [
        'Cari berdasarkan nama/NIS/no. transaksi, rentang tanggal, atau metode pembayaran.',
      ] },
      { heading: '2. Kolom Status', points: [
        'Lunas — tagihan sudah dibayar penuh (baik langsung maupun setelah cicilan terakhir melunasi tagihan).',
        'Cicilan — pembayaran ini baru sebagian dan tagihan masih ada sisa.',
      ] },
      { heading: '3. Export', points: [
        '"Export Excel" mengunduh data sesuai filter yang aktif.',
        '"Export PDF" membuat laporan cetak siap print dari data yang sama.',
      ] },
    ],
  },
  '/tunggakan': {
    title: 'Tunggakan',
    intro: 'Rekap siswa yang masih memiliki tagihan belum lunas, dikelompokkan per siswa.',
    sections: [
      { heading: '1. Membaca tabel', points: [
        '"Tagihan" menunjukkan jumlah tagihan yang belum lunas untuk siswa tersebut.',
        '"Total Tunggakan" adalah akumulasi sisa yang harus dibayar (amount − paid_amount) dari semua tagihan tersebut.',
        '"Rincian" berisi daftar nama tagihan yang menunggak (arahkan kursor untuk lihat lengkap jika terpotong).',
      ] },
      { heading: '2. Kelola tagihan siswa', points: [
        'Klik "Kelola" pada baris siswa untuk langsung dibawa ke halaman Tagihan dengan pencarian NIS siswa tersebut — di sana bisa diedit/dihapus/proses pembayarannya.',
      ] },
      { heading: '3. Export', points: [
        'Tersedia Export Excel dan Export PDF terpisah untuk laporan ke kepala sekolah/rapat.',
      ] },
    ],
  },
  '/kelas': {
    title: 'Kelas',
    intro: 'Master data rombongan belajar (rombel), misalnya "X RPL 1".',
    sections: [
      { heading: '1. Tambah/Edit kelas', points: [
        'Isi nama kelas, tingkat (X/XI/XII), dan jurusan terkait.',
        'Nama kelas harus unik di seluruh sistem.',
      ] },
      { heading: '2. Dampak ke data lain', points: [
        'Kelas dipakai saat menambah/edit siswa dan saat membuat "Tagihan Lain" per kelas.',
        'Menghapus kelas tidak menghapus siswanya — kelas siswa hanya menjadi kosong.',
      ] },
    ],
  },
  '/jurusan': {
    title: 'Jurusan',
    intro: 'Master data program keahlian/jurusan, misalnya RPL, TKJ, Akuntansi.',
    sections: [
      { heading: '1. Tambah/Edit jurusan', points: [
        'Isi kode singkat (mis. RPL) dan nama lengkap jurusan.',
        'Kode jurusan dipakai sebagai label singkat di tabel siswa & laporan.',
      ] },
    ],
  },
  '/tahun-ajaran': {
    title: 'Tahun Ajaran',
    intro: 'Menentukan tahun ajaran yang sedang berjalan — semua tagihan SPP baru mengikuti tahun ajaran yang aktif.',
    sections: [
      { heading: '1. Tambah tahun ajaran', points: [
        'Klik "Tambah Tahun Ajaran", pilih Tahun Mulai dari dropdown — tahun ajaran (mis. 2026/2027) terbentuk otomatis, tidak perlu mengetik manual.',
        'Centang "Jadikan tahun ajaran aktif" jika ingin langsung mengaktifkannya.',
      ] },
      { heading: '2. Mengaktifkan tahun ajaran', points: [
        'Hanya satu tahun ajaran yang boleh aktif di satu waktu.',
        'Klik "Aktifkan" pada baris tahun ajaran yang diinginkan — tahun ajaran lain otomatis nonaktif.',
      ] },
      { heading: '3. Penting sebelum ganti tahun ajaran', points: [
        'Pastikan Tarif SPP untuk tahun ajaran baru sudah diisi di menu Tarif SPP sebelum menggunakan Generate Tagihan.',
      ] },
    ],
  },
  '/tarif': {
    title: 'Tarif SPP',
    intro: 'Menentukan nominal SPP bulanan yang berlaku untuk tahun ajaran aktif.',
    sections: [
      { heading: '1. Edit harga SPP', points: [
        'Jika tahun ajaran aktif sudah punya tarif, tombol utama otomatis menjadi "Edit Harga SPP" — klik untuk langsung mengubah nominalnya.',
        'Jika belum ada tarif untuk tahun ajaran aktif, tombol menjadi "Tambah Tarif".',
      ] },
      { heading: '2. Riwayat perubahan', points: [
        'Setiap tahun ajaran menyimpan riwayat tarifnya sendiri, bisa diedit atau dihapus dari tabel di bawah.',
        'Mengubah tarif SPP tidak mengubah nominal tagihan SPP yang sudah terlanjur dibuat — hanya berlaku untuk tagihan baru yang di-generate setelahnya.',
      ] },
    ],
  },
  '/laporan': {
    title: 'Laporan',
    intro: 'Rekap keuangan SPP tahunan per bulan untuk kebutuhan pelaporan ke kepala sekolah/yayasan.',
    sections: [
      { heading: '1. Kartu ringkasan', points: [
        'Menampilkan pembayaran hari ini, bulan ini, total tahun berjalan, dan total tunggakan.',
      ] },
      { heading: '2. Tabel rekap bulanan', points: [
        'Menunjukkan jumlah transaksi & total pembayaran setiap bulan pada tahun kalender berjalan.',
      ] },
      { heading: '3. Export', points: [
        'Export Excel dan Export PDF tersedia terpisah sebagai lampiran laporan resmi.',
      ] },
    ],
  },
  '/audit': {
    title: 'Audit Log',
    intro: 'Catatan seluruh aktivitas penting di sistem (siapa melakukan apa, kapan) — bersifat permanen dan tidak bisa dihapus/diedit.',
    sections: [
      { heading: '1. Membaca log', points: [
        'Setiap baris berisi waktu, pengguna, role, jenis aksi, entitas yang terpengaruh, detail, dan alamat IP.',
      ] },
      { heading: '2. Kegunaan', points: [
        'Dipakai untuk menelusuri perubahan data yang mencurigakan atau untuk verifikasi internal/audit keuangan sekolah.',
      ] },
      { heading: '3. Export', points: [
        'Export Excel dan Export PDF tersedia untuk arsip/laporan audit.',
      ] },
    ],
  },
  '/panduan': {
    title: 'Panduan Penggunaan',
    intro: 'Kumpulan panduan cara pakai setiap halaman PoncolPay — bisa dicari langsung tanpa harus membuka setiap halaman satu per satu.',
    sections: [
      { heading: '1. Cari panduan', points: [
        'Ketik kata kunci di kolom pencarian, misalnya "import excel" atau "verifikasi" — hasil akan menyaring daftar halaman di sebelah kiri.',
      ] },
      { heading: '2. Pilih halaman', points: [
        'Klik salah satu halaman di daftar untuk membaca panduan lengkapnya di panel kanan.',
      ] },
    ],
  },
  '/pengaturan': {
    title: 'Pengaturan',
    intro: 'Konfigurasi metode pembayaran, tampilan, akun pengguna staf, dan backup/restore data.',
    sections: [
      { heading: '1. Metode Pembayaran', points: [
        'Isi rekening bank untuk transfer dan unggah gambar QRIS statis — keduanya akan tampil ke orang tua saat membayar online di Portal.',
      ] },
      { heading: '2. Tampilan', points: [
        'Ganti tema Terang/Gelap untuk seluruh aplikasi.',
      ] },
      { heading: '3. Pengguna', points: [
        '"Tambah Pengguna" membuat akun staf baru (Admin/Bendahara/Kepala Sekolah) lengkap dengan email asli untuk reset password.',
        '"Email" mengubah email login seorang staf — penting untuk akun lama yang belum punya email asli.',
        '"Nonaktifkan"/"Aktifkan" mengunci akses login staf tanpa menghapus datanya.',
      ] },
      { heading: '4. Backup & Restore', points: [
        '"Backup Sekarang" mengunduh seluruh data sebagai file .json — inilah file yang dipakai untuk restore.',
        '"Restore dari File" memulihkan data dari file backup .json sebelumnya (data dengan ID sama akan ditimpa) — gunakan hati-hati.',
        'Untuk laporan yang mudah dibaca manusia (bukan untuk restore), gunakan tombol Export Excel/PDF di masing-masing halaman (Siswa, Riwayat, Tunggakan, Laporan, Audit Log).',
      ] },
    ],
  },
}

/** Longest-prefix match so nested routes (e.g. /pembayaran/xxx/struk) still resolve to a guide. */
export function getGuideForPath(pathname: string): PageGuide | null {
  if (PAGE_GUIDES[pathname]) return PAGE_GUIDES[pathname]
  const candidates = Object.keys(PAGE_GUIDES)
    .filter((p) => p !== '/' && pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)
  return candidates.length > 0 ? PAGE_GUIDES[candidates[0]] : null
}

/** All guides as a flat list, keyed by path — used by the /panduan page. */
export function getAllGuides(): Array<PageGuide & { path: string }> {
  return Object.entries(PAGE_GUIDES).map(([path, guide]) => ({ path, ...guide }))
}

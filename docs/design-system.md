# Design System

**Proyek:** Sistem Manajemen Kualitas Produk\
**Versi:** 0.1\
**Status:** Draft

## 1. Arah Visual

Antarmuka menggunakan gaya dashboard enterprise: sederhana, konsisten,
padat informasi, dan mudah dipindai. Hindari dekorasi yang tidak
membantu tugas pengguna.

## 2. Prinsip

-   Prioritaskan keterbacaan tabel dan formulir.
-   Gunakan istilah operasional yang konsisten.
-   Tampilkan status inspeksi secara jelas.
-   Berikan feedback untuk setiap aksi penting.
-   Desain responsif, dengan prioritas desktop/tablet untuk penggunaan
    dashboard.

## 3. Token Warna

  Token            Nilai       Penggunaan
  ---------------- ----------- ------------------------------
  Background       `#F8FAFC`   Latar halaman
  Surface          `#FFFFFF`   Card, panel, tabel
  Text Primary     `#0F172A`   Teks utama
  Text Secondary   `#64748B`   Teks pendukung
  Border           `#E2E8F0`   Garis dan pemisah
  Primary          `#2563EB`   Aksi utama dan tautan
  Sidebar          `#0F172A`   Navigasi samping
  PASS             `#16A34A`   Hasil memenuhi standar
  WARNING          `#D97706`   Perlu perhatian
  FAIL             `#DC2626`   Hasil tidak memenuhi standar

Jangan mengandalkan warna saja untuk menyampaikan status. Sertakan label
teks atau ikon yang bermakna.

## 4. Tipografi

-   Font utama: Inter atau font sans-serif sistem.
-   Judul halaman: 24--30 px, semibold.
-   Judul bagian: 16--20 px, semibold.
-   Isi: 14--16 px.
-   Metadata: 12--13 px.
-   Gunakan hierarki konsisten dan hindari terlalu banyak ukuran font.

## 5. Spacing dan Bentuk

-   Basis spacing: kelipatan 4 px.
-   Padding card: 20--24 px.
-   Jarak antarbagian: 24--32 px.
-   Radius card/input: 8--12 px.
-   Border tipis dan shadow minimal.

## 6. Struktur Layout

-   Sidebar untuk navigasi utama.
-   Header untuk judul halaman, breadcrumb, dan menu pengguna.
-   Area konten utama untuk KPI, tabel, grafik, atau formulir.
-   Pada layar kecil, sidebar berubah menjadi navigasi yang dapat
    dibuka/tutup.

## 7. Komponen

### Button

Varian: primary, secondary, outline, danger, ghost.\
State: default, hover, focus, disabled, loading.

### Card

Digunakan untuk ringkasan metrik, panel informasi, dan kelompok konten.

### Data Table

Wajib mendukung: - Header kolom yang jelas. - Loading dan empty state. -
Error state. - Pagination jika data banyak. - Aksi baris yang tidak
membingungkan. - Tampilan responsif atau alternatif kartu pada layar
sempit.

### Form

-   Label selalu terlihat.
-   Validasi dekat dengan field terkait.
-   Tampilkan field wajib.
-   Pertahankan input pengguna ketika terjadi error server bila
    memungkinkan.

### Status Badge

Status yang disarankan: PASS, FAIL, PENDING, dan NEEDS_REVIEW.
Finalisasi sesuai aturan bisnis.

### Dialog dan Toast

Gunakan dialog untuk konfirmasi aksi destruktif. Toast untuk feedback
singkat, bukan untuk menggantikan pesan error penting di formulir.

## 8. State Antarmuka

Setiap halaman data perlu mempertimbangkan: - Loading: indikator proses
yang tidak mengganggu. - Empty: jelaskan mengapa belum ada data dan
tindakan berikutnya. - Error: pesan ringkas dan opsi mencoba kembali
bila relevan. - Success: konfirmasi bahwa aksi berhasil. - Disabled:
jelaskan atau buat jelas mengapa aksi tidak tersedia.

## 9. Aksesibilitas

-   Kontras teks memadai.
-   Semua kontrol dapat diakses melalui keyboard.
-   Focus state terlihat.
-   Label form terhubung dengan input.
-   Status tidak disampaikan hanya dengan warna.
-   Gunakan elemen semantik dan teks alternatif untuk gambar bermakna.

## 10. Implementasi

-   Framework: Next.js.
-   Styling: Tailwind CSS.
-   Komponen reusable disimpan di `frontend/src/components/`.
-   Komponen spesifik fitur disimpan di `frontend/src/features/`.
-   Hindari membuat abstraksi komponen sebelum pola penggunaan berulang
    terlihat.

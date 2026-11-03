# Design System

**Project:** Sistem Manajemen Kualitas Produk  
**Version:** 0.2  
**Status:** Draft

## 1. Design Overview

Sistem Manajemen Kualitas Produk menggunakan desain antarmuka dashboard admin yang minimalis, konsisten, dan mudah digunakan.

Prinsip desain:

1. **Clarity:** Informasi harus mudah dibaca dan dipahami.
2. **Consistency:** Komponen memiliki tampilan dan perilaku yang konsisten.
3. **Simplicity:** Hindari elemen visual yang tidak diperlukan.
4. **Efficiency:** Pengguna dapat menyelesaikan tugas dengan langkah minimal.
5. **Responsiveness:** Tampilan menyesuaikan ukuran layar.

## 2. Visual Identity

### 2.1 Design Direction

- Style: Modern Dashboard.
- Layout: Sidebar Navigation.
- Theme: Light Mode.
- Typography: Sans-serif.
- Visual approach: Clean, minimal, dan data-focused.

### 2.2 Color Palette

**Primary Colors**

| Token | Color | Usage |
|---|---|---|
| Primary | `#2563EB` | Tombol utama, link, elemen aktif |
| Primary Hover | `#1D4ED8` | Kondisi hover |
| Primary Light | `#DBEAFE` | Background elemen aktif |

**Neutral Colors**

| Token | Color | Usage |
|---|---|---|
| Background | `#F8FAFC` | Background halaman |
| Surface | `#FFFFFF` | Card dan modal |
| Border | `#E2E8F0` | Garis pembatas |
| Text Primary | `#0F172A` | Judul dan teks utama |
| Text Secondary | `#64748B` | Teks pendukung |
| Text Muted | `#94A3B8` | Placeholder dan metadata |

**Status Colors**

| Status | Color | Usage |
|---|---|---|
| PASS | `#16A34A` | Evaluasi berhasil |
| FAIL | `#DC2626` | Evaluasi gagal |
| INCOMPLETE | `#D97706` | Evaluasi belum selesai |
| INFO | `#2563EB` | Informasi umum |

Warna status harus digunakan secara konsisten. Status juga harus disertai teks, bukan hanya warna.

## 3. Typography

Gunakan font **Inter** sebagai font utama.

| Element | Size | Weight |
|---|---|---|
| Page Heading | 24–28px | 600–700 |
| Section Heading | 18–20px | 600 |
| Card Heading | 16px | 600 |
| Body Text | 14px | 400 |
| Label | 13–14px | 500 |
| Caption | 12px | 400 |

Gunakan line-height yang nyaman dibaca dan hindari penggunaan terlalu banyak variasi ukuran font.

## 4. Layout System

### 4.1 Main Layout

Dashboard menggunakan struktur:

- Sidebar di sebelah kiri.
- Header di bagian atas.
- Main content di bagian tengah.
- Konten menyesuaikan lebar layar.

### 4.2 Sidebar Navigation

Menu navigasi utama:

1. Dashboard
2. Products
3. Categories
4. Quality Criteria
5. Evaluations
6. Reports
7. Users (khusus Admin)

Sidebar harus menampilkan menu aktif dengan indikator visual yang jelas.

### 4.3 Spacing

Gunakan sistem spacing berbasis kelipatan 4px.

| Token | Value |
|---|---|
| XS | 4px |
| SM | 8px |
| MD | 12px |
| LG | 16px |
| XL | 24px |
| 2XL | 32px |
| 3XL | 48px |

### 4.4 Container

- Gunakan padding halaman yang konsisten.
- Batasi lebar konten jika diperlukan.
- Berikan jarak yang cukup antara section.
- Hindari layout yang terlalu padat.

## 5. UI Components

### 5.1 Buttons

Jenis tombol:

| Variant | Usage |
|---|---|
| Primary | Aksi utama |
| Secondary | Aksi alternatif |
| Outline | Aksi dengan penekanan rendah |
| Destructive | Aksi penghapusan |
| Ghost | Aksi minimal |

Setiap tombol harus memiliki:
- Default state.
- Hover state.
- Focus state.
- Disabled state.
- Loading state jika menjalankan proses asynchronous.

### 5.2 Cards

Card digunakan untuk:
- Statistik dashboard.
- Informasi produk.
- Ringkasan evaluasi.
- Informasi laporan.

Card menggunakan background putih, border tipis, dan radius konsisten.

### 5.3 Tables

Tabel digunakan untuk menampilkan:
- Daftar produk.
- Daftar kategori.
- Daftar kriteria.
- Riwayat evaluasi.

Tabel harus mendukung:
- Header yang jelas.
- Pagination jika data banyak.
- Search dan filter jika diperlukan.
- Empty state.
- Loading state.
- Action menu.

### 5.4 Forms

Form digunakan untuk:
- Input produk.
- Input kategori.
- Pengaturan kriteria.
- Pengisian evaluasi.

Ketentuan:
- Setiap input memiliki label.
- Field wajib diberi penanda.
- Validasi ditampilkan dekat field terkait.
- Pesan error harus menjelaskan masalah.
- Tombol submit memiliki loading state.

### 5.5 Badges

Badge digunakan untuk menunjukkan status.

Contoh:
- PASS: hijau.
- FAIL: merah.
- INCOMPLETE: kuning atau amber.
- ACTIVE: hijau.
- INACTIVE: abu-abu.

### 5.6 Modal and Dialog

Modal digunakan untuk:
- Konfirmasi penghapusan.
- Form sederhana.
- Detail informasi.
- Konfirmasi tindakan penting.

Penghapusan data harus menggunakan dialog konfirmasi.

## 6. Dashboard Design

Dashboard menampilkan informasi utama secara ringkas.

Komponen:
- Total Products.
- Total Evaluations.
- PASS Evaluations.
- FAIL Evaluations.
- Recent Evaluations.
- Evaluation Statistics.

Gunakan card statistik untuk informasi ringkas dan tabel untuk data evaluasi terbaru.

## 7. Evaluation Interface

Halaman evaluasi harus memudahkan evaluator mengisi setiap kriteria.

### 7.1 Evaluation Form

Setiap kriteria menampilkan:
- Nama kriteria.
- Deskripsi.
- Standar kualitas.
- Metode evaluasi.
- Input sesuai metode.
- Status wajib atau opsional.

Jenis input:

| Method | Input Component |
|---|---|
| Rating 1–5 | Rating selector |
| Numeric | Number input |
| Pass/Fail | Two-option selection |

### 7.2 Evaluation Result

Hasil evaluasi menampilkan:
- Nama produk.
- Waktu evaluasi.
- Nama evaluator.
- Status akhir.
- Detail hasil setiap kriteria.

Gunakan indikator visual untuk membedakan PASS, FAIL, dan INCOMPLETE.

## 8. Responsive Design

Sistem harus mendukung tiga ukuran layar:

| Device | Layout |
|---|---|
| Desktop | Sidebar dan konten utama |
| Tablet | Sidebar dapat diperkecil atau disembunyikan |
| Mobile | Navigasi menggunakan drawer atau menu mobile |

Ketentuan:
- Tabel harus tetap dapat diakses pada layar kecil.
- Form menggunakan lebar yang sesuai.
- Tombol mudah digunakan melalui layar sentuh.
- Konten tidak boleh menyebabkan horizontal overflow yang tidak diperlukan.

## 9. Accessibility

- Gunakan kontras warna yang memadai.
- Setiap input memiliki label.
- Gunakan semantic HTML.
- Semua interaksi dapat diakses menggunakan keyboard.
- Focus state harus terlihat.
- Jangan menggunakan warna sebagai satu-satunya indikator status.
- Gunakan ukuran teks yang nyaman dibaca.

## 10. Frontend Implementation Guidelines

Teknologi implementasi:

- Next.js.
- TypeScript.
- Tailwind CSS.

Ketentuan implementasi:
1. Gunakan reusable components.
2. Pisahkan komponen berdasarkan tanggung jawab.
3. Gunakan design tokens untuk warna, spacing, dan typography.
4. Hindari styling yang berulang.
5. Gunakan komponen form dan tabel secara konsisten.
6. Pisahkan UI components dari business logic.
7. Gunakan loading, error, dan empty states.
8. Pastikan tampilan responsif.

## 11. Design Principles

1. Utamakan fungsi dibanding dekorasi.
2. Gunakan warna secara konsisten.
3. Hindari terlalu banyak elemen dalam satu halaman.
4. Pertahankan hierarki informasi.
5. Gunakan komponen yang dapat digunakan kembali.
6. Pastikan setiap tindakan pengguna memberikan feedback yang jelas.

---

**End of Document**
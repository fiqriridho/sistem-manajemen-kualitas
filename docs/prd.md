# Product Requirements Document (PRD)

**Project:** Sistem Manajemen Kualitas Produk  
**Version:** 0.2
**Status:** Draft

## 1. Project Overview

### 1.1 Purpose

Sistem Manajemen Kualitas Produk merupakan aplikasi berbasis web untuk mengelola data produk, kategori, kriteria kualitas, proses evaluasi, dan hasil penilaian kualitas produk.

Sistem menggunakan beberapa metode evaluasi untuk menentukan apakah suatu produk memenuhi standar kualitas yang telah ditentukan.

### 1.2 Project Scope

Sistem berfokus pada pengelolaan dan evaluasi kualitas produk secara digital menggunakan data produk simulasi atau fiktif.

Sistem tidak mencakup:
- Pengelolaan stok barang.
- Manajemen gudang.
- Proses produksi.
- Transaksi penjualan.
- Pengelolaan distribusi produk.

## 2. User Roles

Sistem memiliki tiga jenis pengguna:

| Role | Responsibility |
|---|---|
| Admin | Mengelola pengguna, kategori, produk, dan kriteria kualitas |
| Evaluator | Melakukan evaluasi kualitas produk |
| Supervisor | Memantau hasil evaluasi dan laporan |

## 3. Functional Requirements

### 3.1 Dashboard

Sistem menyediakan dashboard yang menampilkan:
- Jumlah produk.
- Jumlah evaluasi.
- Jumlah produk dengan status PASS.
- Jumlah produk dengan status FAIL.
- Ringkasan statistik kualitas produk.

### 3.2 Product Management

Admin dapat:
- Menambahkan produk.
- Melihat daftar produk.
- Mengubah informasi produk.
- Menghapus produk.
- Mencari dan memfilter produk.

Informasi produk meliputi:
- Kode produk.
- Nama produk.
- Kategori.
- Deskripsi.
- Status produk.

### 3.3 Category Management

Admin dapat:
- Menambahkan kategori.
- Melihat daftar kategori.
- Mengubah kategori.
- Menghapus kategori.

### 3.4 Quality Criteria Management

Admin dapat mengelola kriteria kualitas untuk setiap produk.

Informasi kriteria meliputi:
- Nama kriteria.
- Deskripsi.
- Metode evaluasi.
- Standar penilaian.
- Status wajib atau opsional.
- Status aktif atau tidak aktif.

Sistem mendukung tiga metode evaluasi.

**A. Rating 1–5**

Evaluator memberikan nilai antara 1 sampai 5.

Aturan:
- PASS jika nilai aktual lebih besar atau sama dengan nilai minimum.
- FAIL jika nilai aktual lebih kecil dari nilai minimum.

**B. Numeric**

Evaluator memasukkan nilai numerik sesuai standar yang ditentukan.

Standar dapat berupa:
- Nilai minimum.
- Nilai maksimum.
- Rentang nilai.

Status PASS diberikan jika nilai aktual memenuhi standar.

**C. Pass/Fail**

Evaluator menentukan hasil secara langsung dengan memilih:
- PASS.
- FAIL.

### 3.5 Quality Evaluation

Evaluator dapat:
- Memilih produk yang akan dievaluasi.
- Melihat kriteria kualitas aktif.
- Mengisi hasil setiap kriteria.
- Mengirim hasil evaluasi.
- Melihat hasil evaluasi.

Sistem melakukan validasi dan perhitungan hasil evaluasi melalui backend.

Setiap evaluasi menyimpan:
- Produk yang dievaluasi.
- Pengguna yang melakukan evaluasi.
- Waktu evaluasi.
- Hasil setiap kriteria.
- Status akhir evaluasi.

### 3.6 Evaluation Results

Sistem menentukan status akhir evaluasi berdasarkan kriteria wajib.

| Condition | Final Status |
|---|---|
| Masih ada kriteria wajib yang belum diisi | INCOMPLETE |
| Semua kriteria wajib selesai dan terdapat hasil FAIL | FAIL |
| Semua kriteria wajib selesai dan seluruhnya PASS | PASS |

Kriteria opsional tidak memengaruhi status akhir evaluasi.

Nilai rata-rata rating dapat ditampilkan sebagai informasi tambahan, tetapi tidak digunakan sebagai penentu kelulusan.

### 3.7 Evaluation History

Sistem menyimpan riwayat evaluasi agar pengguna dapat:
- Melihat evaluasi sebelumnya.
- Melihat detail hasil evaluasi.
- Melihat hasil evaluasi berdasarkan produk.
- Membandingkan hasil evaluasi dari waktu ke waktu.

Perubahan kriteria kualitas tidak boleh mengubah hasil evaluasi historis.

### 3.8 Reports

Sistem menyediakan laporan yang mencakup:
- Riwayat evaluasi.
- Hasil evaluasi setiap produk.
- Distribusi status PASS dan FAIL.
- Detail hasil setiap kriteria.
- Filter berdasarkan produk, kategori, dan periode.

## 4. Non-Functional Requirements

### 4.1 Performance

- Sistem dapat menampilkan data dengan waktu respons yang wajar.
- Proses evaluasi dilakukan melalui backend.
- Query database dibuat secara efisien.

### 4.2 Security

- Sistem menerapkan autentikasi pengguna.
- Hak akses dibatasi berdasarkan role.
- Password disimpan dalam bentuk hash.
- Validasi input dilakukan di backend.
- Informasi sensitif disimpan melalui environment variables.

### 4.3 Usability

- Antarmuka mudah dipahami.
- Navigasi konsisten.
- Formulir evaluasi mudah digunakan.
- Status hasil evaluasi ditampilkan dengan jelas.

### 4.4 Maintainability

- Frontend dan backend dipisahkan.
- Backend menggunakan arsitektur modular.
- Kode menggunakan TypeScript.
- Database dikelola menggunakan Prisma ORM.

## 5. Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js |
| Programming Language | TypeScript |
| Styling | Tailwind CSS |
| Backend | NestJS |
| API | REST API |
| ORM | Prisma |
| Database | MySQL |
| Local Development Environment | Laragon |
| Version Control | Git & GitHub |

### Database Configuration

Database menggunakan MySQL yang dijalankan melalui Laragon pada lingkungan pengembangan lokal.

Backend menggunakan Prisma ORM untuk mengelola operasi database.

Frontend berkomunikasi dengan database melalui backend REST API dan tidak mengakses database secara langsung.

## 6. MVP Scope

Versi awal sistem mencakup:

1. Autentikasi dan pengelolaan role pengguna.
2. CRUD kategori produk.
3. CRUD data produk.
4. CRUD kriteria kualitas.
5. Tiga metode evaluasi: Rating, Numeric, dan Pass/Fail.
6. Perhitungan status setiap kriteria.
7. Perhitungan status akhir evaluasi.
8. Penyimpanan riwayat evaluasi.
9. Dashboard dan laporan sederhana.

Fitur di luar daftar tersebut dapat dikembangkan pada tahap berikutnya.

## 7. Acceptance Criteria

Sistem dinyatakan memenuhi kebutuhan MVP apabila:

- Admin dapat mengelola kategori dan produk.
- Admin dapat membuat kriteria kualitas dengan tiga metode evaluasi.
- Evaluator dapat melakukan evaluasi terhadap produk.
- Sistem dapat memvalidasi hasil setiap kriteria.
- Sistem dapat menentukan status PASS, FAIL, atau INCOMPLETE dengan benar.
- Kriteria opsional tidak memengaruhi status akhir.
- Hasil evaluasi tersimpan dalam database.
- Riwayat evaluasi dapat ditampilkan kembali.
- Perubahan standar kriteria tidak mengubah hasil evaluasi historis.
- Pengguna hanya dapat mengakses fitur sesuai role.

## 8. Assumptions and Constraints

### Assumptions

- Produk yang digunakan dapat berupa data simulasi atau fiktif.
- Setiap produk memiliki kriteria kualitas masing-masing.
- Kriteria dapat bersifat wajib atau opsional.
- Evaluasi dilakukan oleh pengguna yang terdaftar.
- Backend menjadi sumber utama perhitungan hasil evaluasi.
- Detail evaluasi menyimpan snapshot kriteria saat evaluasi dilakukan.

### Constraints

- Pengembangan dilakukan dengan Next.js dan NestJS.
- Database menggunakan MySQL melalui Laragon untuk development lokal.
- Komunikasi frontend dan backend menggunakan REST API.
- Pengelolaan database menggunakan Prisma ORM.
- Implementasi awal berfokus pada kebutuhan MVP.

## 9. Future Development

Fitur berikut dapat dipertimbangkan untuk pengembangan selanjutnya:

- Template kriteria kualitas yang dapat digunakan ulang.
- Ekspor laporan ke PDF dan Excel.
- Grafik tren kualitas produk.
- Riwayat perubahan kriteria.
- Persetujuan hasil evaluasi oleh supervisor.
- Deployment aplikasi ke server agar dapat diakses secara online.
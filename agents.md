# AI Coding Agent Instructions

**Project:** Sistem Manajemen Kualitas Produk  
**Version:** 0.2

## 1. Project Overview

Proyek ini adalah aplikasi web Sistem Manajemen Kualitas Produk untuk mengelola data produk, kategori, kriteria kualitas, evaluasi, dan laporan hasil evaluasi.

Produk yang digunakan dapat berupa data simulasi atau fiktif.

Sistem tidak mencakup manajemen stok, gudang, produksi, maupun transaksi penjualan.

## 2. Documentation Priority

Sebelum mengembangkan fitur, baca dokumentasi berikut:

1. `docs/prd.md` — kebutuhan dan ruang lingkup sistem.
2. `docs/architecture.md` — arsitektur dan struktur teknis.
3. `docs/design-system.md` — pedoman desain antarmuka.
4. `agents.md` — instruksi pengembangan.

Jika terdapat konflik, prioritaskan PRD untuk kebutuhan bisnis dan Architecture untuk keputusan teknis.

Jangan membuat fitur di luar ruang lingkup tanpa persetujuan pengguna.

## 3. Technology Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS

### Backend
- NestJS
- TypeScript
- REST API
- Prisma ORM

### Database
- MySQL
- Laragon sebagai lingkungan database lokal

Frontend dan backend harus berada dalam direktori terpisah.

## 4. Project Structure

Gunakan struktur repository berikut:

```text
sistem-manajemen-kualitas/
├── frontend/
├── backend/
├── docs/
│   ├── prd.md
│   ├── architecture.md
│   └── design-system.md
├── agents.md
├── README.md
└── .gitignore
```

Jangan mengubah struktur utama tanpa alasan teknis yang jelas dan persetujuan pengguna.

## 5. Development Principles

### 5.1 General Rules

- Gunakan TypeScript.
- Tulis kode yang sederhana dan mudah dipahami.
- Hindari duplikasi kode.
- Gunakan reusable components dan services.
- Terapkan separation of concerns.
- Hindari overengineering.
- Jangan menambahkan dependency tanpa kebutuhan jelas.
- Jangan mengubah konfigurasi yang tidak berkaitan dengan tugas.

### 5.2 Frontend Rules

- Gunakan Next.js App Router.
- Gunakan Tailwind CSS untuk styling.
- Pisahkan UI components, services, hooks, dan types.
- Gunakan reusable components.
- Gunakan REST API untuk komunikasi dengan backend.
- Jangan mengakses database langsung dari frontend.
- Hindari menempatkan business logic utama di komponen UI.
- Implementasikan loading, error, dan empty states.

### 5.3 Backend Rules

- Gunakan NestJS dengan pendekatan modular.
- Pisahkan Controller, Service, dan DTO.
- Controller bertanggung jawab menerima request dan mengirim response.
- Service menangani business logic.
- DTO digunakan untuk validasi request.
- Gunakan Prisma untuk operasi database.
- Terapkan autentikasi dan otorisasi sesuai role.
- Jangan menempatkan business logic utama di Controller.

## 6. Database Rules

- Gunakan MySQL.
- Gunakan Prisma ORM.
- Simpan konfigurasi database melalui environment variables.
- Jangan menulis credential secara langsung dalam source code.
- Gunakan migration untuk perubahan struktur database.
- Hindari mengubah atau menghapus data tanpa kebutuhan yang jelas.
- Gunakan relasi dan constraint untuk menjaga integritas data.

Contoh environment variable:

```env
DATABASE_URL="mysql://root:@localhost:3306/sistem_kualitas"
```

Jangan commit file `.env` ke repository.

## 7. Quality Evaluation Business Rules

Aturan evaluasi merupakan bagian penting dari sistem dan tidak boleh diubah tanpa persetujuan pengguna.

### 7.1 Evaluation Methods

Sistem mendukung tiga metode:

**Rating 1–5**
- Input berupa angka 1 sampai 5.
- PASS jika nilai aktual memenuhi atau melebihi nilai minimum.
- FAIL jika nilai aktual di bawah nilai minimum.

**Numeric**
- Input berupa angka.
- Standar dapat berupa minimum, maksimum, atau rentang.
- PASS jika nilai aktual memenuhi standar.
- FAIL jika nilai aktual tidak memenuhi standar.

**Pass/Fail**
- Evaluator memilih PASS atau FAIL secara langsung.

### 7.2 Final Evaluation Status

Gunakan aturan berikut:

| Condition | Result |
|---|---|
| Ada kriteria aktif (wajib atau opsional) yang belum diisi | INCOMPLETE |
| Semua kriteria wajib selesai dan ada yang FAIL | FAIL |
| Semua kriteria wajib selesai dan seluruhnya PASS | PASS |

Ketentuan tambahan:
- Kriteria aktif (wajib atau opsional) wajib diisi; hasil PASS/FAIL kriteria opsional tidak menentukan status akhir.
- Backend menjadi sumber utama perhitungan.
- Frontend hanya menampilkan hasil dari backend.
- Rata-rata rating bukan penentu status akhir.
- Validasi input harus dilakukan di backend.

### 7.3 Historical Evaluation

- Simpan snapshot kriteria saat evaluasi dilakukan.
- Perubahan nama atau standar kriteria tidak boleh mengubah riwayat evaluasi.
- Jangan menghapus riwayat evaluasi ketika data master berubah.

## 8. API Development Rules

- Gunakan REST API.
- Gunakan HTTP methods sesuai fungsinya.
- Gunakan status code HTTP yang tepat.
- Validasi request menggunakan DTO.
- Gunakan response structure yang konsisten.
- Tangani error dengan mekanisme exception NestJS.
- Jangan mengirim informasi sensitif dalam response.

Contoh endpoint:

```text
/api/auth
/api/users
/api/categories
/api/products
/api/quality-criteria
/api/evaluations
/api/dashboard
/api/reports
```

Endpoint tersebut merupakan rancangan awal dan dapat disesuaikan saat implementasi.

## 9. UI/UX Rules

- Ikuti `docs/design-system.md`.
- Gunakan desain dashboard minimalis dan modern.
- Gunakan warna dan typography secara konsisten.
- Pastikan tampilan responsif.
- Gunakan badge untuk status PASS, FAIL, dan INCOMPLETE.
- Sediakan feedback untuk setiap aksi pengguna.
- Hindari elemen dekoratif yang tidak memiliki fungsi.

## 10. Security Rules

- Password harus di-hash sebelum disimpan.
- Jangan menyimpan secret dalam source code.
- Lindungi endpoint berdasarkan role.
- Validasi semua input dari pengguna.
- Jangan mempercayai hasil evaluasi yang dihitung oleh frontend.
- Jangan mengekspos credential database atau JWT secret.
- Jangan menonaktifkan mekanisme keamanan hanya untuk mengatasi error.

## 11. Git and Code Management

- Gunakan nama branch yang deskriptif.
- Gunakan commit message yang jelas.
- Jangan menghapus perubahan pengguna yang sudah ada.
- Jangan melakukan force push tanpa persetujuan.
- Jangan commit file `.env`, build output, atau dependency folder.
- Periksa perubahan sebelum menyelesaikan tugas.

Contoh commit message:

```text
feat: add product management
fix: correct evaluation calculation
refactor: improve evaluation service
docs: update project architecture
```

## 12. Agent Workflow

Setiap kali menerima tugas:

1. Baca dokumentasi yang relevan.
2. Periksa struktur dan kode yang sudah ada.
3. Identifikasi file yang perlu diubah.
4. Jelaskan rencana singkat sebelum perubahan besar.
5. Implementasikan solusi paling sederhana yang memenuhi kebutuhan.
6. Jalankan pemeriksaan atau pengujian yang relevan.
7. Periksa apakah perubahan merusak fitur lain.
8. Laporkan file yang diubah dan hasil pengujian.

### Important Restrictions

- Jangan membuat fitur yang tidak diminta.
- Jangan mengubah business rules tanpa persetujuan.
- Jangan mengganti technology stack tanpa persetujuan.
- Jangan membuat asumsi database schema yang bertentangan dengan dokumentasi.
- Jangan mengklaim pengujian berhasil jika belum dijalankan.
- Jika terdapat requirement yang ambigu, tanyakan sebelum mengambil keputusan yang berdampak besar.

## 13. Final Instruction

Prioritaskan:
1. Correctness.
2. Simplicity.
3. Maintainability.
4. Security.
5. Consistency with project documentation.

Bangun sistem secara bertahap. Selesaikan dan validasi satu fitur sebelum melanjutkan ke fitur berikutnya.

---

**End of Document**
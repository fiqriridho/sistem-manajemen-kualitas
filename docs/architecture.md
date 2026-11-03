# Architecture Document

**Proyek:** Sistem Manajemen Kualitas Produk\
**Versi:** 0.1\
**Status:** Draft

## 1. Tujuan Arsitektur

Dokumen ini menjelaskan struktur teknis awal. Arsitektur dibuat
sederhana agar dapat dikembangkan oleh satu developer, tetapi tetap
memisahkan UI, API, dan akses database.

## 2. Keputusan Teknologi

  Bagian       Teknologi
  ------------ ------------------------------------------------------
  Frontend     Next.js + TypeScript
  Styling      Tailwind CSS
  Backend      NestJS + TypeScript
  API          REST
  ORM          Prisma
  Database     Supabase PostgreSQL
  Repository   Monorepo dengan folder frontend dan backend terpisah

Supabase pada tahap awal dipakai sebagai layanan PostgreSQL terkelola.
Frontend tidak mengakses database secara langsung. Semua aturan bisnis
dan akses database berada di NestJS.

## 3. Gambaran Arsitektur

``` text
Browser
   |
   v
Next.js Frontend
   |
   | HTTPS / REST JSON
   v
NestJS Backend
   |
   | Prisma ORM
   v
Supabase PostgreSQL
```

## 4. Struktur Repository

Gunakan satu repository Git dengan dua aplikasi yang berdiri sendiri.
`frontend/` dan `backend/` masing-masing memiliki `package.json`,
dependency, konfigurasi, dan perintah development sendiri.

``` text
sistem-manajemen-kualitas/
├── frontend/                  # Next.js
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   └── types/
│   ├── package.json
│   └── .env.local
├── backend/                   # NestJS
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── common/
│   │   ├── config/
│   │   ├── prisma/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   ├── quality-standards/
│   │   │   ├── inspections/
│   │   │   └── defects/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   └── .env
├── docs/
│   ├── prd.md
│   ├── design-system.md
│   └── architecture.md
├── agents.md
├── README.md
└── .gitignore
```

## 5. Tanggung Jawab Tiap Bagian

### Frontend

-   Menampilkan halaman dan komponen UI.
-   Mengelola state tampilan dan interaksi pengguna.
-   Memanggil REST API backend.
-   Tidak menyimpan secret database.
-   Tidak menjalankan aturan evaluasi kualitas sebagai sumber kebenaran.

### Backend

-   Menyediakan REST API.
-   Memvalidasi request melalui DTO.
-   Menjalankan aturan bisnis.
-   Memeriksa autentikasi dan otorisasi.
-   Mengakses database melalui Prisma.

### Database

-   Menyimpan data secara persisten.
-   Menegakkan constraint seperti unique dan foreign key.
-   Dikelola melalui Prisma migration.

## 6. Struktur Modul Backend

Modul awal: - `auth`: autentikasi dan sesi/token jika dibutuhkan. -
`products`: CRUD produk. - `categories`: CRUD kategori. -
`quality-standards`: standar dan parameter kualitas. - `inspections`:
inspeksi dan detail pengukuran. - `defects`: ketidaksesuaian dan
tindakan korektif.

Pola modul NestJS:

``` text
products/
├── products.module.ts
├── products.controller.ts
├── products.service.ts
└── dto/
    ├── create-product.dto.ts
    └── update-product.dto.ts
```

Controller menangani HTTP. Service berisi aturan bisnis. DTO memvalidasi
input. PrismaService menangani akses database.

## 7. Struktur Frontend

Gunakan Next.js App Router. - `src/app/`: route dan layout. -
`src/components/`: komponen UI umum. - `src/features/`: komponen dan
logic per fitur. - `src/lib/`: API client dan helper. - `src/types/`:
tipe TypeScript bersama di frontend.

Server Components menjadi default. Gunakan Client Components hanya
ketika membutuhkan interaksi browser atau state interaktif.

## 8. Konvensi API

Base path lokal: `/api`. Contoh endpoint: \| Method \| Endpoint \|
Fungsi \| \|---\|---\|---\| \| GET \| `/api/products` \| Daftar produk
\| \| GET \| `/api/products/:id` \| Detail produk \| \| POST \|
`/api/products` \| Tambah produk \| \| PATCH \| `/api/products/:id` \|
Ubah produk \| \| DELETE \| `/api/products/:id` \| Hapus produk \| \|
GET \| `/api/categories` \| Daftar kategori \|

Gunakan status HTTP secara konsisten: 200 untuk sukses, 201 untuk data
dibuat, 204 untuk sukses tanpa body, 400 untuk validasi gagal, 401 untuk
belum terautentikasi, 403 untuk tidak berwenang, 404 untuk data tidak
ditemukan, dan 500 untuk kesalahan server.

## 9. Validasi dan Keamanan

-   Aktifkan `ValidationPipe` global di NestJS.
-   Gunakan `whitelist` dan `forbidNonWhitelisted`.
-   Jangan percaya data dari frontend.
-   Simpan secret di environment variable.
-   Jangan commit `.env`.
-   Batasi CORS ke origin frontend yang diizinkan.
-   Jika autentikasi lokal dipakai, hash password dengan algoritma yang
    sesuai.
-   Terapkan pemeriksaan role/permission di backend.
-   Jangan pernah mengekspos kredensial database atau service-role key
    ke browser.

## 10. Database dan Prisma

-   Gunakan Prisma schema sebagai representasi model data.
-   Gunakan migration untuk perubahan struktur.
-   Simpan connection string di environment variable backend.
-   Untuk Supabase, pilih connection mode yang sesuai dengan runtime dan
    kebutuhan migration. Periksa panduan Prisma dan Supabase terkini
    sebelum menetapkan format `DATABASE_URL` dan `DIRECT_URL`, karena
    konfigurasi dapat berbeda menurut versi Prisma dan jenis koneksi.
-   Jangan menjalankan migration produksi secara sembarang dari
    environment development.

## 11. Environment Variable

Contoh nama variabel, bukan nilai rahasia:

Backend `.env`:

``` env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
PORT=3001
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="replace-with-a-long-random-secret"
```

Frontend `.env.local`:

``` env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

`JWT_SECRET` hanya diperlukan jika autentikasi JWT diterapkan. Jangan
menaruh `DATABASE_URL`, `DIRECT_URL`, atau `JWT_SECRET` dalam variabel
`NEXT_PUBLIC_`.

## 12. Pengembangan Lokal

Jalankan frontend dan backend di terminal terpisah: - Frontend:
`cd frontend` lalu `npm run dev` (umumnya port 3000). - Backend:
`cd backend` lalu `npm run start:dev` (atur port 3001). - Pastikan
`NEXT_PUBLIC_API_URL` mengarah ke backend. - Pastikan CORS backend
mengizinkan origin frontend.

## 13. Strategi Implementasi Bertahap

1.  Inisialisasi repository dan dua aplikasi.
2.  Siapkan Supabase PostgreSQL dan Prisma.
3.  Buat model Product minimal.
4.  Implementasikan CRUD Product pada NestJS.
5.  Buat daftar dan form produk di Next.js.
6.  Integrasikan API, validasi, dan error state.
7.  Setelah alur ini stabil, lanjutkan kategori, standar, inspeksi, dan
    modul lain.

## 14. Catatan Keputusan yang Belum Final

-   Versi Prisma dan format konfigurasi koneksi.
-   Strategi autentikasi: JWT NestJS atau solusi lain.
-   Soft delete versus hard delete.
-   Versioning standar kualitas.
-   Bentuk model inspeksi per unit/batch/sampel.
-   Strategi upload bukti foto/dokumen.

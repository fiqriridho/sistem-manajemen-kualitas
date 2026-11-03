# AGENTS.md

Panduan kerja untuk AI coding agent dan developer pada repository Sistem
Manajemen Kualitas Produk.

## 1. Baca Konteks Sebelum Mengubah Kode

Sebelum implementasi, baca: 1. `docs/prd.md` 2. `docs/design-system.md`
3. `docs/architecture.md`

Jika dokumen belum menjawab aturan bisnis, jangan mengarang keputusan.
Catat pertanyaan dan minta konfirmasi.

## 2. Prinsip Umum

-   Ikuti stack yang sudah ditentukan: Next.js, NestJS, TypeScript,
    Prisma, Supabase PostgreSQL.
-   Pertahankan struktur monorepo dengan folder root `frontend/` dan
    `backend/`.
-   Utamakan solusi sederhana, terbaca, dan mudah diuji.
-   Hindari abstraksi berlebihan untuk proyek yang dikerjakan satu
    developer.
-   Jangan mengganti stack atau arsitektur tanpa persetujuan.
-   Jangan menambahkan dependency jika fitur dapat dibuat secara wajar
    tanpa dependency tersebut.
-   Jangan menggunakan `any` kecuali benar-benar diperlukan dan
    alasannya jelas.

## 3. Aturan Frontend

-   Gunakan Next.js App Router.
-   Gunakan TypeScript.
-   Server Component adalah default.
-   Tambahkan `"use client"` hanya jika membutuhkan state, event
    handler, atau API browser.
-   Semua komunikasi data aplikasi dilakukan melalui REST API NestJS.
-   Jangan mengakses Supabase PostgreSQL langsung dari browser.
-   Pisahkan komponen umum di `src/components/` dan kode spesifik fitur
    di `src/features/`.
-   Ikuti design system dan sediakan loading, empty, error, serta
    success state.

## 4. Aturan Backend

-   Gunakan struktur modular NestJS.
-   Controller menangani request/response HTTP.
-   Service menangani aturan bisnis.
-   DTO menangani validasi input.
-   Gunakan PrismaService untuk akses database.
-   Validasi seluruh input dari client.
-   Evaluasi kualitas harus dilakukan di backend.
-   Gunakan status HTTP dan format error secara konsisten.

## 5. Database

-   Perubahan schema harus disertai migration.
-   Jangan mengubah migration lama yang sudah diterapkan pada database
    bersama; buat migration baru.
-   Gunakan constraint database untuk integritas data.
-   Pertimbangkan histori dan snapshot standar kualitas agar perubahan
    standar tidak mengubah hasil inspeksi lama.
-   Jangan melakukan hard delete terhadap data historis tanpa aturan
    bisnis yang jelas.

## 6. Keamanan

-   Jangan menampilkan atau mencatat secret.
-   Jangan commit file `.env` atau `.env.local`.
-   Jangan mengekspos kredensial database melalui variabel
    `NEXT_PUBLIC_`.
-   Hash password jika autentikasi lokal digunakan.
-   Periksa otorisasi di backend, bukan hanya menyembunyikan tombol di
    frontend.
-   Batasi CORS ke origin yang diperlukan.

## 7. Alur Kerja Setiap Tugas

1.  Periksa struktur dan file yang sudah ada.
2.  Baca dokumentasi terkait.
3.  Identifikasi kebutuhan dan kriteria selesai.
4.  Buat perubahan terkecil yang menyelesaikan tugas.
5.  Tambahkan atau perbarui test yang relevan.
6.  Jalankan formatter, lint, type-check, test, atau build yang
    tersedia.
7.  Perbaiki error yang muncul.
8.  Perbarui dokumentasi bila perilaku atau keputusan berubah.
9.  Laporkan file yang berubah, keputusan penting, dan hasil
    pemeriksaan.

## 8. Konvensi Kode

-   Gunakan nama variabel dan fungsi yang deskriptif.
-   Gunakan konsistensi penamaan file dan class sesuai konvensi
    framework.
-   Hindari fungsi terlalu besar.
-   Hindari duplikasi logic bisnis.
-   Jangan menaruh business logic di controller atau komponen
    presentasi.
-   Tangani error secara eksplisit.

## 9. Git

-   Gunakan commit kecil dengan pesan yang menjelaskan perubahan.
-   Jangan memasukkan file hasil build, dependency, atau secret.
-   Periksa `git status` sebelum commit.

## 10. Definition of Done

Tugas dinyatakan selesai jika: - Sesuai PRD dan keputusan arsitektur. -
Tidak merusak fitur yang sudah ada. - TypeScript/lint/build yang relevan
lolos. - Test relevan tersedia dan lolos, atau keterbatasannya
dijelaskan. - Dokumentasi diperbarui jika diperlukan. - Tidak ada secret
yang ikut ter-commit.

## 11. Pelaporan

Setelah menyelesaikan tugas, laporkan: - Ringkasan implementasi. - File
yang dibuat/diubah. - Perintah pemeriksaan yang dijalankan. - Hasil
test/build secara jujur. - Hal yang masih perlu dikonfirmasi.

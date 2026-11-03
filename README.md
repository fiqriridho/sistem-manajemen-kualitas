# Sistem Manajemen Kualitas Produk

Aplikasi berbasis web untuk mengelola data produk, kriteria kualitas, proses evaluasi, dan laporan hasil penilaian kualitas produk.

## 1. Project Overview

Sistem Manajemen Kualitas Produk membantu pengguna melakukan evaluasi kualitas produk berdasarkan standar yang telah ditentukan.

Sistem menyediakan tiga metode evaluasi:

- **Rating 1–5:** Penilaian berdasarkan nilai minimum.
- **Numeric:** Penilaian berdasarkan batas minimum, maksimum, atau rentang nilai.
- **Pass/Fail:** Penilaian langsung berdasarkan status kelulusan.

Hasil evaluasi akhir terdiri dari:

- `PASS`: Semua kriteria wajib memenuhi standar.
- `FAIL`: Terdapat kriteria wajib yang tidak memenuhi standar.
- `INCOMPLETE`: Masih terdapat kriteria wajib yang belum dievaluasi.

Produk yang digunakan dapat berupa data simulasi atau fiktif.

## 2. Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend | NestJS |
| API | REST API |
| ORM | Prisma |
| Database | MySQL |
| Local Environment | Laragon |

## 3. Project Structure

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

## 4. Prerequisites

Pastikan perangkat telah memiliki:

- Node.js versi LTS.
- npm.
- Laragon.
- MySQL.
- Git.

## 5. Installation

### 5.1 Clone Repository

```bash
git clone https://github.com/fiqriridho/sistem-manajemen-kualitas.git

cd sistem-manajemen-kualitas
```

### 5.2 Setup Database

1. Jalankan Laragon.
2. Start Apache dan MySQL.
3. Buka database management tool.
4. Buat database dengan nama:

```sql
CREATE DATABASE sistem_kualitas;
```

### 5.3 Setup Backend

Masuk ke direktori backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Buat file `.env`:

```env
DATABASE_URL="mysql://root:@localhost:3306/sistem_kualitas"
JWT_SECRET="your-secret-key"
PORT=3001
```

Sesuaikan username, password, dan konfigurasi MySQL dengan lingkungan lokal.

Setelah Prisma Schema tersedia, jalankan migration:

```bash
npx prisma migrate dev --name init
```

Jalankan backend:

```bash
npm run start:dev
```

### 5.4 Setup Frontend

Buka terminal baru:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Buat file `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Jalankan frontend:

```bash
npm run dev
```

Buka aplikasi melalui:

```text
http://localhost:3000
```

## 6. Development Workflow

Pengembangan dilakukan secara bertahap:

1. Setup project frontend dan backend.
2. Konfigurasi database dan Prisma.
3. Implementasi autentikasi dan role pengguna.
4. Implementasi CRUD kategori dan produk.
5. Implementasi CRUD kriteria kualitas.
6. Implementasi proses evaluasi.
7. Implementasi dashboard.
8. Implementasi laporan dan riwayat evaluasi.
9. Testing dan perbaikan.

## 7. Documentation

Dokumentasi proyek tersedia di direktori `docs/`.

| File | Description |
|---|---|
| `prd.md` | Kebutuhan dan ruang lingkup sistem |
| `architecture.md` | Arsitektur dan struktur teknis |
| `design-system.md` | Pedoman desain antarmuka |
| `agents.md` | Instruksi untuk AI coding agent |

## 8. Project Status

<text>Status: Under Development</text>

Fitur dan struktur proyek masih dalam tahap pengembangan. Petunjuk instalasi dapat disesuaikan seiring implementasi.

## 9. License

Project ini dikembangkan untuk keperluan pembelajaran dan pengembangan sistem manajemen kualitas produk.
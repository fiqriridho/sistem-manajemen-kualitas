# Product Requirements Document (PRD)

**Proyek:** Sistem Manajemen Kualitas Produk\
**Versi:** 0.1\
**Status:** Draft untuk validasi kebutuhan

## 1. Ringkasan

Sistem Manajemen Kualitas Produk adalah aplikasi web untuk membantu
pencatatan data produk, standar kualitas, inspeksi, hasil evaluasi, dan
tindak lanjut ketidaksesuaian. Dokumen ini merupakan rancangan awal,
bukan spesifikasi final. Alur dan aturan bisnis harus divalidasi dengan
pihak laboratorium/pengguna sebelum implementasi penuh.

## 2. Tujuan

-   Memusatkan data produk dan standar kualitas.
-   Mendokumentasikan proses inspeksi secara konsisten.
-   Menghasilkan status inspeksi berdasarkan aturan yang ditetapkan.
-   Memudahkan pemantauan hasil inspeksi dan tindak lanjut.

## 3. Pengguna dan Peran

  -----------------------------------------------------------------------
  Peran                               Tanggung jawab awal
  ----------------------------------- -----------------------------------
  Admin                               Mengelola akun, kategori, produk,
                                      dan konfigurasi

  Quality Control (QC)                Melakukan inspeksi dan memasukkan
                                      hasil pengukuran

  Supervisor                          Memantau hasil dan meninjau tindak
                                      lanjut
  -----------------------------------------------------------------------

Hak akses di atas masih perlu dikonfirmasi. Jangan menganggap seluruh
peran wajib ada pada MVP.

## 4. Ruang Lingkup Kandidat

### 4.1 Modul

1.  Autentikasi dan otorisasi.
2.  Dashboard ringkasan.
3.  Manajemen kategori.
4.  Manajemen produk.
5.  Manajemen standar kualitas.
6.  Pencatatan inspeksi.
7.  Evaluasi PASS/FAIL.
8.  Pencatatan cacat dan tindakan korektif.
9.  Laporan dan riwayat inspeksi.

### 4.2 Di luar MVP awal

-   Integrasi perangkat pengukuran.
-   Notifikasi otomatis.
-   Ekspor laporan kompleks.
-   Multi-cabang atau multi-organisasi.
-   Workflow persetujuan berlapis.

## 5. Alur Proses Kandidat

1.  Admin membuat kategori dan data produk.
2.  Admin menetapkan standar kualitas untuk produk.
3.  QC membuat catatan inspeksi untuk produk atau batch.
4.  QC memasukkan nilai parameter yang diperiksa.
5.  Sistem mengevaluasi nilai terhadap standar.
6.  Jika ada parameter gagal, inspeksi ditandai FAIL dan ketidaksesuaian
    dicatat.
7.  Supervisor meninjau hasil dan tindak lanjut bila proses tersebut
    memang diperlukan.

## 6. Kebutuhan Fungsional Kandidat

  -----------------------------------------------------------------------
  ID                      Kebutuhan               Prioritas awal
  ----------------------- ----------------------- -----------------------
  FR-01                   Sistem menyediakan      Medium
                          autentikasi pengguna    

  FR-02                   Admin dapat membuat,    High
                          melihat, mengubah, dan  
                          menghapus kategori      

  FR-03                   Admin dapat mengelola   High
                          data produk             

  FR-04                   Pengguna berwenang      High
                          dapat mengelola standar 
                          kualitas                

  FR-05                   QC dapat membuat        High
                          inspeksi                

  FR-06                   QC dapat memasukkan     High
                          hasil pengukuran per    
                          parameter               

  FR-07                   Sistem mengevaluasi     High
                          hasil inspeksi          
                          berdasarkan standar     

  FR-08                   Pengguna dapat melihat  Medium
                          riwayat inspeksi        

  FR-09                   Ketidaksesuaian dapat   Medium
                          dicatat dan             
                          ditindaklanjuti         

  FR-10                   Dashboard menampilkan   Low
                          ringkasan data          
  -----------------------------------------------------------------------

Prioritas harus ditinjau ulang setelah kebutuhan pengguna dikonfirmasi.

## 7. Aturan Bisnis Sementara

-   Status PASS hanya diberikan jika seluruh parameter wajib memenuhi
    standar.
-   Status FAIL diberikan jika minimal satu parameter wajib tidak
    memenuhi standar.
-   Evaluasi dilakukan di backend, bukan hanya di frontend.
-   Nilai batas minimum/maksimum bersifat inklusif sebagai asumsi awal;
    konfirmasi apakah batas inklusif atau eksklusif.
-   Inspeksi harus menyimpan waktu, pelaksana, produk/batch, dan detail
    parameter.
-   Perubahan standar tidak boleh diam-diam mengubah hasil inspeksi
    historis. Simpan snapshot standar atau versi standar saat inspeksi
    dilakukan.

## 8. Kebutuhan Non-Fungsional

-   Validasi input dilakukan di backend.
-   Password disimpan dalam bentuk hash jika autentikasi lokal
    digunakan.
-   Otorisasi diperiksa di backend.
-   Kredensial database tidak boleh dikirim ke browser.
-   Endpoint daftar mendukung pagination dan filter saat data bertambah.
-   UI menyediakan state loading, empty, error, dan success.
-   Struktur kode modular dan mudah diuji.
-   Perubahan skema database dikelola dengan migration.

## 9. MVP Minggu Pertama

Target realistis: satu alur end-to-end untuk membuktikan fondasi
aplikasi. - Repository monorepo dengan folder `frontend/` dan
`backend/`. - Next.js dan NestJS dapat dijalankan terpisah. - NestJS
terhubung ke Supabase PostgreSQL melalui Prisma. - Modul produk memiliki
CRUD dasar. - Frontend menampilkan daftar produk dan form tambah/edit. -
Validasi dasar dan penanganan error API tersedia.

Tidak termasuk target minggu pertama: seluruh modul inspeksi, dashboard
final, RBAC lengkap, laporan, dan workflow tindakan korektif.

## 10. Kriteria Penerimaan MVP

-   Frontend berjalan secara lokal.
-   Backend berjalan secara lokal.
-   Backend berhasil terhubung ke database Supabase.
-   Data produk dapat dibuat, dibaca, diubah, dan dihapus melalui API.
-   Perubahan data tersimpan di database.
-   Frontend menggunakan API backend, bukan mengakses database secara
    langsung.
-   Input tidak valid ditolak dengan respons yang dapat dipahami.
-   Error API ditampilkan secara wajar pada UI.

## 11. Pertanyaan yang Harus Divalidasi

1.  Produk apa yang dikelola dan apa identitas uniknya?
2.  Inspeksi dilakukan per unit, batch, atau sampel?
3.  Siapa yang boleh membuat dan mengubah standar?
4.  Apakah satu produk memiliki beberapa standar atau versi standar?
5.  Parameter kualitas berupa angka, kategori, checklist, atau
    kombinasi?
6.  Apakah nilai batas minimum dan maksimum inklusif?
7.  Apakah inspeksi memerlukan persetujuan supervisor?
8.  Apakah hasil inspeksi yang sudah disimpan boleh diedit?
9.  Apakah perlu foto bukti, lampiran, atau tanda tangan?
10. Apakah laporan PDF/Excel dibutuhkan?
11. Apakah autentikasi dan pembagian role wajib untuk versi pertama?

## 12. Risiko dan Asumsi

-   Risiko utama: aturan inspeksi belum tervalidasi.
-   Risiko: model data berubah setelah proses bisnis dipahami.
-   Asumsi: satu organisasi menggunakan sistem pada tahap awal.
-   Asumsi: Supabase digunakan sebagai PostgreSQL terkelola, bukan
    sebagai akses database langsung dari frontend.

## 13. Definisi Selesai

Fitur dianggap selesai jika kebutuhan dan aturan bisnisnya jelas,
implementasi berjalan, validasi dan error handling tersedia, pengujian
relevan dilakukan, serta dokumentasi diperbarui.

# Komite PMKP

Portal pengelolaan dokumen Peningkatan Mutu dan Keselamatan Pasien.

## Status saat ini

- Source aplikasi Next.js, endpoint API, autentikasi, dan schema Prisma berada di repository ini.
- Database PMKP menggunakan Supabase PostgreSQL melalui Prisma; kredensial database harus disimpan sebagai environment server-side.
- Database memiliki tabel PMKP yang terisolasi. Dokumen, aktivitas, dan lampiran simulasi tidak diimpor.
- GitHub Pages hanya menyajikan landing page statis `index.html`. Pages tidak menjalankan Next.js API, session cookie server, maupun Prisma. Dashboard operasional perlu di-host pada platform yang mendukung Next.js server runtime.

## Variabel environment

Atur variabel berikut pada host aplikasi (bukan di Git):

- `DATABASE_URL`: koneksi PostgreSQL Supabase untuk server, dengan TLS.
- `AUTH_SECRET`: secret acak minimal 32 karakter.
- `ADMIN_USERNAME=superadmin`
- `ADMIN_NAME=Komite PMKP`
- `ADMIN_INITIAL_PASSWORD`: hanya dipakai untuk bootstrap jika akun belum ada.

Akun `superadmin` sudah disiapkan di tabel `public."User"`, nama `Komite PMKP`, role `superadmin`, dan status wajib ganti password awal. Password awal adalah kredensial sementara dan harus segera diganti saat masuk. Jangan masukkan password aktual atau connection string ke `.env.example`, source code, atau variabel berawalan `NEXT_PUBLIC_`.

## Database

Migration `supabase/migrations/20261013000000_komite_pmkp_core_schema.sql` membuat tabel PMKP dan mengaktifkan Row Level Security. Akses langsung dari peran Supabase `anon` dan `authenticated` ditolak; aplikasi mengakses database dari server menggunakan `DATABASE_URL`.

Skema yang disiapkan:
- `PmkpStandard`
- `PmkpDocument`
- `PmkpActivity`
- `PmkpAttachment`
- `User`

Tidak ada data dokumen, aktivitas, atau lampiran contoh. Pada login pertama, aplikasi menyiapkan taksonomi 11 standar PMKP sebagai referensi kosong—bukan data simulasi.

## Menjalankan aplikasi

Versi Node.js 20.9 atau lebih baru direkomendasikan.

1. Salin `.env.example` menjadi `.env` hanya di lingkungan lokal dan isi nilai rahasia.
2. Jalankan `npm install`.
3. Jalankan `npm run dev` untuk pengembangan.
4. Gunakan `npm run check`, `npm run lint`, dan `npm run build` sebelum deployment.

Untuk deployment server, hubungkan repository ke platform Next.js (misalnya Vercel), lalu atur environment variables di dashboard platform dan jalankan build. Tidak diperlukan database seed untuk dokumen simulasi.

## Catatan produksi

Lampiran saat ini memakai direktori filesystem. Untuk deployment serverless/multi-instance, pindahkan lampiran ke Supabase Storage private bucket sebelum menggunakan fitur unggah sebagai penyimpanan bukti operasional. Setelah deployment, uji login, penggantian password, CRUD, akses tanpa sesi, dan unduh lampiran.

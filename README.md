# Komite PMKP

Portal pengelolaan dokumen Peningkatan Mutu dan Keselamatan Pasien.

## Status saat ini

- Source aplikasi Next.js, endpoint API, autentikasi, dan schema Prisma berada di repository ini.
- Proyek Supabase khusus Komite PMKP **belum dibuat**. Aplikasi ini tidak menggunakan database proyek AUREKA.
- Migration khusus PMKP tersedia di repository dan baru boleh diterapkan pada proyek Supabase baru yang telah dikonfirmasi.
- GitHub Pages hanya menyajikan landing page statis index.html. Pages tidak menjalankan Next.js API, session cookie server, maupun Prisma. Dashboard operasional perlu di-host pada platform yang mendukung Next.js server runtime.

## Variabel environment

Atur variabel berikut pada host aplikasi (bukan di Git):

- DATABASE_URL: koneksi PostgreSQL dari proyek Supabase khusus Komite PMKP, dengan TLS.
- AUTH_SECRET: secret acak minimal 32 karakter.
- ADMIN_USERNAME=superadmin
- ADMIN_NAME=Komite PMKP
- ADMIN_INITIAL_PASSWORD: password bootstrap sementara; wajib diganti sesudah login pertama.

Akun superadmin belum dibuat pada proyek database baru karena proyek tersebut menunggu konfirmasi pembuatan. Jangan memasukkan password aktual atau connection string ke .env.example, source code, atau variabel berawalan NEXT_PUBLIC_.

## Database

Migration supabase/migrations/20261013000000_komite_pmkp_core_schema.sql menyiapkan tabel PmkpStandard, PmkpDocument, PmkpActivity, PmkpAttachment, dan User. Migration ini belum diterapkan pada proyek PMKP sampai proyek Supabase terpisah dibuat. RLS diaktifkan dan akses langsung dari peran Supabase anon/authenticated ditolak. Aplikasi mengakses database dari server menggunakan DATABASE_URL.

Tidak ada data dokumen, aktivitas, atau lampiran simulasi. Setelah proyek baru tersedia dan variabel environment terpasang, login pertama menyiapkan taksonomi 11 standar sebagai referensi kosong, bukan data dokumen contoh.

## Menjalankan aplikasi

Versi Node.js 20.9 atau lebih baru direkomendasikan.

1. Salin .env.example menjadi .env hanya di lingkungan lokal dan isi nilai rahasia.
2. Jalankan npm install.
3. Jalankan npm run dev untuk pengembangan.
4. Jalankan npm run check, npm run lint, dan npm run build sebelum deployment.

Untuk deployment server, hubungkan repository ke platform Next.js, lalu atur environment variables di dashboard platform dan jalankan build.

## Catatan produksi

Lampiran saat ini memakai direktori filesystem. Untuk hosting serverless/multi-instance, pindahkan lampiran ke Supabase Storage private bucket sebelum digunakan untuk menyimpan bukti operasional. Setelah deployment, uji login, penggantian password, CRUD, akses tanpa sesi, dan unduh lampiran.

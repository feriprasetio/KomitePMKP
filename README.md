# Komite PMKP

Portal untuk pengelolaan dokumen dan program Peningkatan Mutu dan Keselamatan Pasien.

## Status deployment saat ini

- index.html adalah landing page statis untuk GitHub Pages.
- GitHub Pages tidak menjalankan Next.js API routes, autentikasi server, atau Prisma. Karena itu, landing page bukan dashboard operasional.
- Skema inti PMKP sudah diterapkan pada proyek Supabase yang terhubung. Objek PMKP dipisahkan secara nama dan tidak mengubah tabel AUREKA yang sudah ada.
- Source aplikasi Next.js lengkap belum tersedia pada branch main, sehingga runtime aplikasi belum dapat dinyatakan ter-deploy.

## Konfigurasi aplikasi server

Aplikasi membutuhkan hosting yang mendukung Next.js server runtime (misalnya Vercel atau Node server), Prisma Client, dan penyimpanan lampiran persisten.

Atur variabel rahasia di dashboard hosting, bukan di Git:

- DATABASE_URL: koneksi server-side ke PostgreSQL Supabase, dengan TLS.
- AUTH_SECRET: nilai acak minimal 32 karakter.
- ADMIN_USERNAME: default superadmin.
- ADMIN_NAME: Komite PMKP.
- ADMIN_INITIAL_PASSWORD: password sementara untuk bootstrap.

Password awal harus segera diganti setelah login pertama. Jangan menyimpan password atau connection string asli pada source repository, halaman statis, atau variabel NEXT_PUBLIC_*.

## Database Supabase

Migration berada pada supabase/migrations/20261013000000_komite_pmkp_core_schema.sql dan membuat tabel PmkpStandard, PmkpDocument, PmkpActivity, PmkpAttachment, dan User. RLS diaktifkan dan akses API publik ditolak. Server aplikasi harus mengakses database secara server-side menggunakan kredensial yang disimpan di environment hosting.

Data operasional belum dimasukkan. Tidak ada dokumen, aktivitas, atau lampiran simulasi di tabel PMKP.

## Deployment

1. Push seluruh source Next.js aplikasi ke repository.
2. Hubungkan repository ke hosting server-side, bukan GitHub Pages.
3. Set environment variables pada hosting.
4. Jalankan Prisma generate dan migrasi yang sudah ditinjau.
5. Uji login, perubahan password, CRUD, audit trail, unggah/unduh lampiran, dan akses tanpa sesi sebelum digunakan operasional.

## Struktur

- prisma/schema.prisma — model data Prisma untuk PostgreSQL.
- supabase/migrations/ — skema database.
- index.html — landing page GitHub Pages.
- .env.example — contoh konfigurasi tanpa secret nyata.

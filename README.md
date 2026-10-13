# Dokumen Akreditasi PMKP

Aplikasi kerja internal untuk item Playbook STARKES PMKP, checklist bukti administratif, progres, penanggung jawab dan repository berkas privat.

## Status source dan data
- Repository: \`feriprasetio/KomitePMKP\`.
- Database aplikasi: proyek Supabase **Dokumen Akreditasi PMKP**, ref \`brpwisafomtahjupyxyl\`. Database AUREKA tidak digunakan oleh aplikasi ini.
- Schema, kolom playbook, bucket Storage privat dan seed checklist telah diterapkan pada proyek Supabase PMKP.
- Seed kerja memuat 146 item di 12 kelompok: PMKP 1, 2, 3, 4, 4.1, 5, 6, 7, 8, 9, 10, dan 11. Halaman sumber PDF disimpan per item.
- Deskripsi kegiatan merupakan ringkasan untuk membantu kerja. Periksa isi pada halaman PDF yang dirujuk serta regulasi rumah sakit sebelum digunakan sebagai bukti formal; progres aplikasi tidak menggantikan penilaian evaluator.

## Fitur
- Dashboard ringkas; progress bar per checklist/per standar; pencarian, filter dan pagination.
- Rincian elemen penilaian, rekomendasi regulasi, usulan program kerja, aktivitas implementasi, fasilitas pendukung dan halaman sumber.
- Checklist bukti administratif dengan progres berdasar jumlah item yang diverifikasi.
- Upload, kategori, preview dan download dokumen privat (maks. 20 MB) serta audit trail.
- Autentikasi sesi httpOnly, bootstrap admin yang wajib mengganti password, dan pembatasan penghapusan untuk superadmin.

## Environment server
Konfigurasikan nilai aktual melalui secret manager host, bukan source code:
- \`DATABASE_URL\`: PostgreSQL connection string proyek Supabase PMKP dengan SSL.
- \`SUPABASE_URL=https://brpwisafomtahjupyxyl.supabase.co\`.
- \`SUPABASE_SERVICE_ROLE_KEY\`: secret/service-role key khusus server, jangan gunakan publishable/anon key dan jangan letakkan pada \`NEXT_PUBLIC_*\`.
- \`AUTH_SECRET\`: secret acak minimal 32 karakter.
- \`ADMIN_USERNAME=superadmin\`, \`ADMIN_NAME=Komite PMKP\`.
- \`ADMIN_INITIAL_PASSWORD\`: password sementara minimal 12 karakter, wajib diganti setelah login pertama.

Rahasia database dan Storage tidak dimasukkan ke Git. Runtime baru dapat diaktifkan sesudah secret dipasang di host.

## Lokal dan pemeriksaan
Gunakan Node.js 20.9+. Isi \`.env\` dari \`.env.example\` pada lingkungan lokal pribadi, kemudian jalankan \`npm install\`, \`npm run db:generate\`, \`npm run dev\`. Untuk release jalankan \`npm run check\`, \`npm run lint\`, dan \`npm run build\`. CI GitHub menjalankan pemeriksaan tersebut pada push/PR.

## Hosting
GitHub Pages hanya menyajikan landing page statis, bukan Next.js API, autentikasi, Prisma atau Storage privat. Aplikasi operasional harus di-host pada platform yang mendukung runtime server Next.js dan mendapat environment variables di atas. Uji login, CRUD, akses tanpa sesi, upload, preview serta penghapusan berkas sebelum pemakaian operasional.

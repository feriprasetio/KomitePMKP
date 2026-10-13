# Dokumen Akreditasi PMKP

Workspace interaktif untuk menjalankan checklist **Playbook STARKES — Peningkatan Mutu dan Keselamatan Pasien (PMKP)**.

## Release scope

- **Sumber kerja:** Playbook PMKP yang menjadi basis ekstraksi 138 aktivitas/subtopik pada standar PMKP 1–11. Setiap item menyimpan standar, elemen penilaian, uraian subtopik, saran program, aktivitas implementasi, bukti administratif yang berpotensi muncul, fasilitas pendukung, dan halaman sumber.
- **UI:** dashboard ringkas; progres checklist otomatis; pencarian dan filter; detail aktivitas dalam panel; tab checklist, detail, dan bukti; PIC, prioritas, tenggat dan catatan.
- **Repository bukti:** unggah kategori PDF/Office/CSV/teks/gambar hingga 20 MB, metadata terhubung ke aktivitas, signed URL sementara untuk pratinjau/unduh.
- **Audit trail:** log checklist dan unggahan.
- **Akses:** Supabase Auth, signup berbasis undangan, role admin/member yang ditetapkan server/database, dan aktivasi administrator pertama satu-kali.
- **Data:** checklist persisten tersimpan di database Supabase PMKP, bukan localStorage.

## Infrastruktur proyek

| Komponen | Nilai |
|---|---|
| GitHub | [feriprasetio/KomitePMKP](https://github.com/feriprasetio/KomitePMKP) |
| GitHub Pages | [feriprasetio.github.io/KomitePMKP](https://feriprasetio.github.io/KomitePMKP/) |
| Supabase project | Dokumen Akreditasi PMKP |
| Project ref | `brpwisafomtahjupyxyl` |
| Region | `ap-southeast-1` |
| Private evidence bucket | `pmkp-evidence` |

**Database AUREKA tidak dipakai oleh aplikasi ini.** Publishable key yang disematkan ke frontend memang ditujukan untuk pemakaian publik dan bukan secret. Service-role key tidak pernah diletakkan dalam frontend atau repository.

## Aktivasi administrator pertama

1. Buka GitHub Pages di atas, lalu pilih **Aktivasi administrator pertama**.
2. Masukkan kode aktivasi yang diberikan secara pribadi oleh pengelola deployment, nama administrator, email nyata yang dapat diakses, dan password minimal 14 karakter.
3. Simpan password dengan aman. Aktivasi hanya diterima sebelum pengguna Auth pertama dibuat; setelah sukses, kode tersebut tidak dapat digunakan kembali.
4. Login menggunakan email/password yang baru dibuat.
5. Tambahkan email staf dari menu **Pengguna**. Staf memakai **Saya diundang · aktivasi akun** dan membuat password mereka sendiri.

Kode aktivasi tidak disimpan di repositori atau HTML publik. Jangan membagikannya ke staf atau menyimpannya di dokumen bersama. Jika fungsi bootstrap sudah digunakan, penambahan admin berikutnya dilakukan melalui mekanisme akun yang dikelola, bukan dengan mengulang bootstrap.

## Kebijakan checklist

Checklist adalah alat kerja internal untuk memastikan jejak regulasi, rencana, implementasi, bukti, dan verifikasi/tindak lanjut dapat ditelusuri. Persentase yang terlihat merupakan persentase butir checklist yang dicentang; bukan skor akreditasi resmi dan bukan klaim pemenuhan elemen penilaian. Periksa selalu halaman Playbook sumber, regulasi yang berlaku, dan bukti yang sah sebelum menandai suatu butir selesai.

Butir checklist dibentuk dari konten Playbook setiap subtopik: regulasi rekomendasi, usulan program kerja, aktivitas implementasi, bukti administratif dan fasilitas pendukung, lalu tambahan langkah verifikasi/tindak lanjut. Tambahan langkah ini adalah bantuan alur kerja, bukan kutipan persis dari Playbook.

## Keamanan berkas dan data

- Bucket `pmkp-evidence` disetel **private**; pembacaan mengandalkan sesi autentikasi dan signed URL berumur 10 menit.
- Format file dibatasi PDF, Microsoft Office, teks/CSV, serta PNG/JPEG/WebP. Batas penyimpanan 20 MB per berkas.
- Jangan unggah berkas yang memuat informasi kesehatan atau identitas pasien kecuali memang diperlukan, berwenang, dan sesuai kebijakan tata kelola data rumah sakit.
- RLS aktif pada tabel aplikasi. `PmkpAllowedUser` dibatasi kepada role admin; role ditentukan dari allowlist oleh trigger database.
- Aplikasi tidak menyediakan self-registration terbuka. Email harus terlebih dahulu ditambahkan oleh administrator.
- Periksa secara berkala pengguna Auth dan daftar undangan. Menghapus entri undangan tidak otomatis mencabut sesi pengguna yang sudah aktif.

## Deployment

GitHub Actions menyiapkan artefak GitHub Pages berisi `index.html` dan `playbook-seed.gz.b64`. Dataset diunduh satu kali per browser session startup bila item belum tercatat di database, lalu di-upsert per batch; seed tidak menimpa checklist yang telah diisi.

Bila memodifikasi source:
- Perubahan UI: `index.html`.
- Data aktivitas Playbook: `playbook-seed.gz.b64` (base64 dari JSON gzip).
- Database/migration: `supabase/migrations/`; terapkan migrasi hanya ke proyek Supabase Dokumen Akreditasi PMKP.
- Deployment: push ke `main`, kemudian cek [GitHub Actions](https://github.com/feriprasetio/KomitePMKP/actions) hingga job Pages `success`.

## Batasan dan verifikasi operasional

UI sudah dirancang sebagai single-page static app dan memakai Supabase langsung untuk Auth/database/storage; GitHub Pages tidak menjalankan Next.js API atau file system server. Pastikan GitHub Pages berhasil deploy dan lakukan uji login/bootstrap, invite/signup, checklist, refresh/persistensi, unggah, signed-URL preview, serta RLS menggunakan browser sebelum dipakai sebagai sistem produksi rutin.

Playbook disajikan sebagai referensi operasional. Field yang diringkas atau dinormalisasi harus diperiksa terhadap halaman sumber PDF. Aplikasi bukan pengganti penilaian evaluator, keputusan Direktur, dan regulasi rumah sakit.

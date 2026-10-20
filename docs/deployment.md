# Deploy ke Cloudflare

Desk berjalan di Cloudflare Workers (lewat [OpenNext](https://opennext.js.org/cloudflare)) dengan D1 sebagai database dan R2 untuk file.

`wrangler.jsonc` berisi konfigurasi akun Cloudflare-mu (ID database, domain, email pengirim) dan sengaja di-ignore git. Repo hanya menyimpan templatenya, `wrangler.example.jsonc`.

## 1. Buat resource

```bash
pnpm exec wrangler login
pnpm exec wrangler d1 create projectdesk-db
pnpm exec wrangler r2 bucket create projectdesk-files
```

## 2. Isi `wrangler.jsonc`

Salin dari template kalau belum ada:

```bash
cp wrangler.example.jsonc wrangler.jsonc
```

Lalu sesuaikan:

- `d1_databases[0].database_id`: dari output `wrangler d1 create` di atas.
- `vars.APP_URL` dan `vars.BETTER_AUTH_URL`: URL publik aplikasi, misalnya `https://desk.example.com`.
- `vars.EMAIL_FROM`: alamat pengirim, misalnya `Desk <noreply@example.com>`. Domainnya harus terverifikasi di Resend.
- `routes`: aktifkan kalau memakai custom domain.

## 3. Pasang secret

Secret tidak pernah disimpan di repo atau di `wrangler.jsonc`:

```bash
pnpm exec wrangler secret put BETTER_AUTH_SECRET   # string acak, misalnya: openssl rand -base64 32
pnpm exec wrangler secret put RESEND_API_KEY       # dari dashboard Resend, permission "Sending access"
```

## 4. Migrasi lalu deploy

Selalu jalankan migrasi **sebelum** deploy. Kode baru bisa bergantung pada tabel baru (misalnya tabel `rate_limit` dipakai di setiap request login).

```bash
pnpm db:migrate:remote
pnpm run deploy
```

> Pakai `pnpm run deploy`, bukan `pnpm deploy`. `pnpm deploy` adalah perintah bawaan pnpm untuk workspace, bukan script di `package.json`.

## Cron

`triggers.crons` di `wrangler.jsonc` menjalankan tugas harian pukul 20:00 UTC (03:00 WIB):

- mengirim email pengingat termin pembayaran yang jatuh tempo dalam 3 hari atau sudah lewat (maksimal sekali per 3 hari per termin),
- menghapus sesi portal client yang kedaluwarsa dan data rate limit lama,
- menghapus permanen file R2 dan project yang sudah dihapus lebih dari 30 hari.

## Checklist setelah deploy

- Buka `/login` dan pastikan halaman tampil.
- Daftar akun baru dan pastikan email verifikasi diterima.
- Buat project, bagikan link portal, lalu buka di jendela incognito.

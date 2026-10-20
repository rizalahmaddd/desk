# Arsitektur

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- shadcn/ui (Radix) + Tailwind CSS v4
- Cloudflare Workers via `@opennextjs/cloudflare`, D1 (SQLite) untuk data, R2 untuk file
- Drizzle ORM + migrasi SQL di `drizzle/`
- better-auth untuk akun freelancer (password, magic link, verifikasi email)
- Resend untuk email transaksional
- Vitest untuk unit test

## Struktur folder

```
src/
  app/
    (auth)/          login, register, lupa & reset password, verifikasi email
    (owner)/         area freelancer: dashboard, project, customer, laporan, notifikasi, pengaturan, /shared
    portal/          portal client (diakses lewat link share)
    s/[token]/       menukar token link share menjadi sesi portal
    api/
      auth/          handler better-auth
      files/         upload & download file (R2)
      v1/            REST API publik
    actions/         server actions
  components/        komponen UI (shadcn/ui di components/ui)
  lib/               logika server: auth, query, akses file, share, email, rate limit, validasi
drizzle/             migrasi SQL D1
mcp-server/          MCP server (paket terpisah) untuk AI agent
worker.mjs           entry Worker: meneruskan request ke OpenNext + handler cron
```

## Model akses

| Peran | Cara masuk | Cakupan |
|---|---|---|
| Freelancer (owner) | Akun better-auth | Semua project miliknya |
| Client lewat link | `/s/[token]` → cookie sesi portal | Satu project, sesuai izin link |
| Client dengan akun | Email terverifikasi yang sama dengan email customer | Semua project yang dibagikan ke email itu (`/shared`) |
| Integrasi | API key `pdk_live_…` (header `Authorization: Bearer`) | Sama seperti owner pemilik key |

Satu akun bisa sekaligus jadi freelancer untuk project sendiri dan client di project orang lain. Hak owner hanya berlaku untuk project miliknya sendiri; selebihnya memakai sesi portal.

Izin per link: `scope` (`view` atau `comment`), `canViewFinancials`, masa berlaku, dicabut, atau dirotasi. Switch "bagikan keuangan" di level project menimpa izin semua link.

## Route utama

| Route | Akses |
|---|---|
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Publik |
| `/dashboard`, `/projects`, `/clients`, `/reports`, `/notifications`, `/settings` | Owner |
| `/projects/[id]` + tab timeline, progress, pembayaran, file, diskusi, akses, pengaturan | Owner |
| `/shared` | Project yang dibagikan ke email akun |
| `/s/[token]` | Penukaran link client |
| `/portal` + progress, pembayaran, file, diskusi, notifikasi | Client |
| `/api/v1/*` | API key atau sesi owner |

## Aturan keamanan yang ditegakkan

- Upload maksimal 50 MB per file, 10 file per pesan, kuota 10 GB per owner.
- Ekstensi berbahaya ditolak; tipe MIME dicocokkan dengan magic bytes isi file.
- Bucket R2 privat; file hanya bisa diunduh lewat `/api/files/[id]` yang memeriksa hak akses.
- Client tidak pernah melihat komentar/update internal, lampirannya, isi komentar yang sudah dihapus, atau bukti pembayaran kalau keuangan tidak dibagikan.
- Rate limit per IP untuk login, registrasi, magic link, reset password, dan kirim ulang verifikasi. Disimpan di D1 dengan satu upsert atomik per request.
- Kepemilikan customer, termin, dan lampiran selalu divalidasi; ID milik akun lain ditolak.
- API key disimpan sebagai hash SHA-256. Token link share juga disimpan sebagai hash; salinan aslinya dipakai untuk fitur "salin link".
- Header keamanan: CSP, `X-Frame-Options: DENY`, `nosniff`, HSTS.
- Nominal uang disimpan sebagai integer minor unit; IDR memakai 0 desimal. Tanggal tampilan memakai zona waktu Asia/Jakarta.

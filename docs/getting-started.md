# Memulai

Panduan menjalankan Desk di komputer lokal.

## Prasyarat

- Node.js 22+
- pnpm 10+
- Login Wrangler (`pnpm exec wrangler login`) hanya diperlukan untuk deploy, tidak untuk development lokal.

## Setup

```bash
pnpm install
cp wrangler.example.jsonc wrangler.jsonc   # konfigurasi Cloudflare milikmu, di-ignore git
cp .env.example .dev.vars                  # lalu isi BETTER_AUTH_SECRET
pnpm db:migrate:local
pnpm dev
```

Isi `BETTER_AUTH_SECRET` dengan string acak, misalnya hasil `openssl rand -base64 32`.

Buka `http://localhost:3000`.

## Catatan

- Tanpa `RESEND_API_KEY`, email verifikasi, magic link, dan reset password tidak dikirim, tapi dicetak ke terminal sebagai `[email:dev] ... url=...`.
- Registrasi membutuhkan verifikasi email. Ambil link verifikasi dari terminal, buka di browser, lalu masuk.
- Binding `DB` (D1) dan `FILES` (R2) disediakan otomatis oleh OpenNext saat `next dev`, memakai penyimpanan lokal di `.wrangler/`.
- Rate limit login dan registrasi tetap aktif di lokal. Kalau terkena batas saat testing, kosongkan dengan `pnpm exec wrangler d1 execute DB --local --command "DELETE FROM rate_limit"`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Dev server Next.js dengan binding lokal |
| `pnpm build` | Build Next.js |
| `pnpm preview` | Build + jalankan Worker Cloudflare lokal |
| `pnpm run deploy` | Build + deploy ke Cloudflare |
| `pnpm db:generate` | Generate migrasi Drizzle dari perubahan `src/lib/db/schema.ts` |
| `pnpm db:migrate:local` | Terapkan migrasi ke D1 lokal |
| `pnpm db:migrate:remote` | Terapkan migrasi ke D1 production |
| `pnpm typecheck` | TypeScript tanpa emit |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit test (Vitest) |

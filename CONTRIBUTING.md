# Berkontribusi

Terima kasih sudah tertarik berkontribusi ke Desk!

## Alur

1. Buka issue dulu untuk perubahan besar, supaya arahnya disepakati sebelum mulai coding.
2. Fork repo, buat branch dari `main`.
3. Jalankan project di lokal mengikuti [docs/getting-started.md](./docs/getting-started.md).
4. Pastikan semua cek lolos sebelum membuat pull request:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   ```

5. Kalau mengubah `src/lib/db/schema.ts`, buat migrasi dengan `pnpm db:generate` dan sertakan file migrasinya.

## Panduan kode

- TypeScript strict, tanpa `any` implisit.
- Teks yang terlihat user memakai Bahasa Indonesia.
- Tulis komentar hanya untuk menjelaskan *alasan*, bukan mengulang apa yang dilakukan kode.
- Jangan pernah meng-commit secret, `.dev.vars`, atau `wrangler.jsonc` milikmu.

## Melaporkan bug

Gunakan template **Laporan bug** saat membuat issue. Untuk celah keamanan, ikuti [SECURITY.md](./SECURITY.md).

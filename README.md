# Desk

Portal project untuk freelancer dan studio kecil. Kelola project, milestone, pembayaran, file, dan diskusi di satu tempat, lalu bagikan ke client lewat satu link, tanpa client perlu membuat akun.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers_·_D1_·_R2-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/workers/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![better-auth](https://img.shields.io/badge/better--auth-auth-111111?logo=betterauth&logoColor=white)](https://www.better-auth.com)
[![Resend](https://img.shields.io/badge/Resend-email-000000?logo=resend&logoColor=white)](https://resend.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Demo](https://img.shields.io/badge/Demo-desk.ai.id-1f7a4d?logo=googlechrome&logoColor=white)](https://desk.ai.id)

![Demo Desk: dashboard studio, detail project, timeline Gantt, pembayaran, diskusi dengan lampiran, pencarian Cmd+K, dan portal client](./docs/media/demo.webp)

---

## Fitur

### Kelola project
- **Dashboard studio:** project aktif, total nilai kontrak, pembayaran diterima, sisa tagihan, dan klaim pembayaran yang menunggu verifikasi.
- **Milestone & progress:** progress dihitung otomatis dari bobot milestone, atau diatur manual.
- **Timeline 4 tampilan:** Gantt, kalender, roadmap, dan feed aktivitas.
- **Penanda urgensi:** hitung mundur deadline dan badge untuk project yang lewat jatuh tempo.
- **Duplikat & template:** kloning project lengkap dengan milestone dan termin pembayarannya.
- **Customer:** data client terpusat beserta semua project-nya.
- **Pencarian cepat (Cmd+K)** ke project dan customer dari halaman mana pun.

### Pembayaran
- **Termin pembayaran** (DP, pelunasan, dll.) dengan status lunas, sebagian, atau jatuh tempo.
- **Catat dan verifikasi pembayaran**, termasuk klaim pembayaran yang dikirim client beserta bukti transfer.
- **Kwitansi siap cetak** untuk setiap pembayaran.
- **Laporan keuangan studio** dengan ekspor CSV.
- **Pengingat tagihan otomatis** ke email kamu untuk termin yang mendekati atau melewati jatuh tempo.
- Multi mata uang: IDR, USD, EUR, SGD.

### Portal client
- **Satu link, tanpa akun:** client melihat progress, pembayaran, file, dan diskusi.
- **Hak akses per link:** hanya lihat atau boleh berdiskusi, tampilkan atau sembunyikan keuangan, atur masa berlaku, cabut, atau buat link baru kapan saja.
- **"Dibagikan ke Saya":** client yang punya akun melihat semua project yang dibagikan ke email-nya di satu halaman.
- **Kirim lewat WhatsApp atau email:** pesan undangan, ringkasan progress, dan pengingat siap kirim.

### Kolaborasi
- **Diskusi dengan balasan** dan lampiran; gambar tampil langsung di dalam komentar.
- **Catatan internal** yang tidak pernah terlihat client.
- **Update progress** untuk mengabarkan perkembangan pekerjaan.
- **File & deliverable** tersimpan privat di Cloudflare R2.
- **Notifikasi** di aplikasi untuk freelancer dan client, plus email ke freelancer saat ada komentar atau klaim pembayaran.

### Integrasi & platform
- **REST API** dengan API key per akun.
- **MCP server** agar Claude, Cursor, atau AI agent lain bisa mengelola project lewat percakapan.
- **PWA:** bisa di-install di HP, dengan navigasi mobile yang ringkas.
- **Mode gelap.**
- **Login** dengan password atau magic link, plus verifikasi email.
- **Keamanan:** rate limit login, file client dipisahkan dari catatan internal, dan secret tidak pernah disimpan di repo.

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [Memulai](./docs/getting-started.md) | Menjalankan Desk di komputer lokal |
| [Deploy ke Cloudflare](./docs/deployment.md) | Setup D1, R2, secret, migrasi, dan custom domain |
| [Arsitektur](./docs/architecture.md) | Stack, struktur folder, route, dan aturan keamanan |
| [REST API & MCP](./docs/api.md) | Endpoint API dan integrasi AI agent |

## Berkontribusi

Pull request dan laporan bug sangat diterima. Baca [CONTRIBUTING.md](./CONTRIBUTING.md) dulu. Celah keamanan dilaporkan secara privat sesuai [SECURITY.md](./SECURITY.md).

## Lisensi

Dirilis di bawah [lisensi MIT](./LICENSE).

## Kontak

Dibuat oleh [@rizalahmaddd](https://github.com/rizalahmaddd). Butuh bantuan atau kustomisasi?

- WhatsApp: [+62 857-7777-5477](https://wa.me/6285777775477)
- Website: [solusikoding.com](https://solusikoding.com)

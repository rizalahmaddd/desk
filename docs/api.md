# REST API & MCP

## Autentikasi

Buat API key di **Pengaturan → API & Integrasi AI**. Key berbentuk `pdk_live_…` dan hanya ditampilkan sekali saat dibuat.

Kirim di setiap request:

```
Authorization: Bearer pdk_live_xxx
```

Header `x-api-key: pdk_live_xxx` juga diterima. Dari browser yang sudah login, sesi owner juga bisa dipakai.

## Format respons

Sukses:

```json
{ "success": true, "...": "..." }
```

Gagal:

```json
{ "success": false, "error": "ValidationError", "message": "Penjelasan dalam bahasa Indonesia" }
```

Kode status yang dipakai: `400` payload tidak valid, `401` key tidak valid, `404` data tidak ditemukan atau bukan milikmu, `409` konflik (kode project atau email customer sudah dipakai, ganti mata uang saat sudah ada termin), `422` validasi gagal.

## Endpoint

Parameter `{id}` project bisa berupa ID atau kode project (misalnya `PRJ-ABC123`).

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/v1/me` | Info akun pemilik key |
| GET | `/api/v1/stats` | Ringkasan dashboard |
| GET | `/api/v1/projects` | Daftar project (`?status=`, `?clientId=`, `?search=`, `?archived=true`) |
| POST | `/api/v1/projects` | Buat project |
| GET | `/api/v1/projects/{id}` | Detail project + milestone, termin, pembayaran, update |
| PATCH | `/api/v1/projects/{id}` | Ubah project |
| DELETE | `/api/v1/projects/{id}` | Hapus project |
| GET, POST | `/api/v1/projects/{id}/milestones` | Daftar / tambah milestone |
| PATCH, DELETE | `/api/v1/projects/{id}/milestones/{milestoneId}` | Ubah / hapus milestone |
| GET, POST | `/api/v1/projects/{id}/payment-terms` | Daftar / tambah termin |
| GET, POST | `/api/v1/projects/{id}/payments` | Daftar / catat pembayaran |
| GET, POST | `/api/v1/projects/{id}/updates` | Daftar / posting update progress |
| GET, POST | `/api/v1/projects/{id}/comments` | Daftar / kirim komentar (dukung `parentId` untuk balasan) |
| GET, POST | `/api/v1/clients` | Daftar / tambah customer |
| GET, PATCH, DELETE | `/api/v1/clients/{id}` | Detail / ubah / hapus customer |

Validasi utama:

- `currency`: `IDR`, `USD`, `EUR`, atau `SGD`.
- Tanggal (`startDate`, `dueDate`, `paidAt`): format `YYYY-MM-DD`.
- `code` project: huruf, angka, dan tanda hubung, 2–32 karakter, unik per akun.
- `clientId` dan `termId` harus milik akun pemilik key.
- `PATCH` hanya mengubah field yang dikirim.

Contoh membuat project:

```bash
curl -X POST https://desk.example.com/api/v1/projects \
  -H "Authorization: Bearer pdk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"name":"Website Toko","currency":"IDR","totalAmount":15000000,"clientName":"Budi","clientEmail":"budi@example.com","dueDate":"2026-12-31"}'
```

## MCP server

Folder [`mcp-server/`](../mcp-server) berisi MCP server agar Claude Desktop, Cursor, atau AI agent lain bisa mengelola project lewat percakapan: membaca dashboard, membuat project, menambah milestone, mencatat pembayaran, dan lainnya.

Cara pasang dan daftar tool lengkapnya ada di [`mcp-server/README.md`](../mcp-server/README.md).

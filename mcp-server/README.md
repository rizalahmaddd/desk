# Desk Model Context Protocol (MCP) Server

Server MCP resmi untuk **Desk**. Memungkinkan asisten AI (seperti **Claude Desktop**, **Cursor AI**, **Antigravity**, **Windsurf**, dll.) untuk mengelola data freelance Anda secara langsung melalui percakapan alami.

---

## 🛠️ Fitur & Kemampuan AI Tools

AI yang terhubung dapat melakukan:
- 📊 **`get_dashboard_stats`**: Melihat ringkasan pendapatan, project aktif, dan sisa piutang.
- 📁 **`list_projects`**: Menampilkan daftar project aktif/draft/selesai.
- 🔍 **`get_project`**: Melihat detail project, milestones, termin pembayaran, dan client terkait.
- ➕ **`create_project`**: Membuat project baru beserta estimasi nilai dan deadline.
- ✏️ **`update_project`**: Memperbarui status, progress pengerjaan, atau deadline.
- 👥 **`list_clients` & `create_client`**: Mengelola direktori kontak customer/client.
- 🎯 **`list_milestones` & `create_milestone`**: Menambah fase pengerjaan project (otomatis kalkulasi progress).
- ✅ **`update_milestone`**: Menandai milestone selesai (`done`), sedang dikerjakan (`in_progress`), dll.
- 💰 **`record_payment`**: Mencatat pembayaran masuk dan kuitansi otomatis.
- 📢 **`post_update`**: Mengirim siaran progress ke portal client.
- 💬 **`post_comment`**: Menulis komentar diskusi project.

---

## 🚀 Cara Setup & Menghubungkan

### 1. Dapatkan API Key
1. Buka Desk di browser (misalnya [https://desk.ai.id](https://desk.ai.id)).
2. Masuk ke menu **Pengaturan** (`/settings`).
3. Pada bagian **API & Integrasi AI (MCP)**, klik **"Buat API Key Baru"**.
4. Beri nama (contoh: `Claude Desktop`), lalu salin kunci yang muncul (awalan `pdk_live_...`).

---

### 2. Konfigurasi Claude Desktop

Buka file konfigurasi Claude Desktop Anda:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Tambahkan entry berikut pada objek `mcpServers`:

```json
{
  "mcpServers": {
    "projectdesk": {
      "command": "node",
      "args": ["/path/ke/projectdesk/mcp-server/dist/index.js"],
      "env": {
        "PROJECTDESK_URL": "https://desk.ai.id",
        "PROJECTDESK_API_KEY": "pdk_live_kunci_api_anda_disini"
      }
    }
  }
}
```

*Atau menggunakan `tsx` langsung tanpa build:*
```json
{
  "mcpServers": {
    "projectdesk": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/path/ke/projectdesk/mcp-server/src/index.ts"
      ],
      "env": {
        "PROJECTDESK_URL": "https://desk.ai.id",
        "PROJECTDESK_API_KEY": "pdk_live_kunci_api_anda_disini"
      }
    }
  }
}
```

---

### 3. Konfigurasi Cursor AI

Buka **Cursor Settings** > **Features** > **MCP Servers** > **Add New MCP Server**:
- **Name**: `projectdesk`
- **Type**: `command`
- **Command**: `npx -y tsx /path/ke/projectdesk/mcp-server/src/index.ts`
- Environment variables:
  - `PROJECTDESK_URL`: `https://desk.ai.id`
  - `PROJECTDESK_API_KEY`: `pdk_live_kunci_api_anda_disini`

---

## 💬 Contoh Prompt yang Bisa Anda Tanyakan ke AI

Setelah terhubung, Anda bisa langsung berbicara santai dengan AI:
- *"Tolong cek berapa sisa tagihan project yang belum lunas bulan ini."*
- *"Buatkan project baru untuk PT Sinar Abadi: Website Redesign senilai Rp 25.000.000, deadline akhir bulan depan."*
- *"Update milestone 'Slicing UI' di project PRJ-A1B2C3 jadi selesai (done)."*
- *"Catat pembayaran DP masuk dari Pak Budi sebesar Rp 10.000.000 hari ini via transfer BCA."*
- *"Kirim siaran update ke portal client: 'Backend API dan integrasi auth sudah selesai diuji'."*

#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const PROJECTDESK_URL = (
  process.env.PROJECTDESK_URL || "https://desk.ai.id"
).replace(/\/+$/, "");

const PROJECTDESK_API_KEY = process.env.PROJECTDESK_API_KEY || "";

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function apiRequest<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    params?: Record<string, string | undefined>;
  } = {},
): Promise<T> {
  if (!PROJECTDESK_API_KEY) {
    throw new Error(
      "PROJECTDESK_API_KEY is not set. Please provide your API key in the environment variables (e.g. pdk_live_...).",
    );
  }

  let url = `${PROJECTDESK_URL}${path}`;
  if (options.params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(options.params)) {
      if (v) sp.set(k, v);
    }
    const q = sp.toString();
    if (q) url += `?${q}`;
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${PROJECTDESK_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Desk-MCP/1.0.0",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Desk API returned non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`,
    );
  }

  if (!res.ok) {
    const msg =
      typeof json.message === "string"
        ? json.message
        : typeof json.error === "string"
          ? json.error
          : `Desk API error (${res.status})`;
    throw new Error(msg);
  }

  return json as T;
}

const server = new McpServer({
  name: "projectdesk",
  version: "1.0.0",
});

// Tool 1: get_dashboard_stats
server.tool(
  "get_dashboard_stats",
  "Dapatkan ringkasan metrik dashboard studio: jumlah project aktif, total nilai kontrak, total pembayaran masuk, dan sisa tagihan.",
  {},
  async () => {
    try {
      const data = await apiRequest("/api/v1/stats");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal mengambil statistik: ${formatError(err)}` }],
      };
    }
  },
);

// Tool 2: list_projects
server.tool(
  "list_projects",
  "Daftar seluruh project freelance di Desk dengan filter status, customer, atau pencarian nama.",
  {
    status: z
      .enum(["all", "draft", "active", "on_hold", "completed", "cancelled"])
      .optional()
      .describe("Filter berdasarkan status project"),
    clientId: z.string().optional().describe("Filter berdasarkan ID customer"),
    search: z.string().optional().describe("Pencarian berdasarkan nama project atau kode"),
  },
  async ({ status, clientId, search }) => {
    try {
      const data = await apiRequest("/api/v1/projects", {
        params: { status, clientId, search },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal mengambil daftar project: ${formatError(err)}` }],
      };
    }
  },
);

// Tool 3: get_project
server.tool(
  "get_project",
  "Dapatkan rincian lengkap satu project berdasarkan ID atau Kode Project (milestones, termin pembayaran, riwayat transaksi, dan customer).",
  {
    projectId: z.string().describe("ID project atau Kode Project (contoh: PRJ-XXXXXX)"),
  },
  async ({ projectId }) => {
    try {
      const data = await apiRequest(`/api/v1/projects/${encodeURIComponent(projectId)}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal mengambil rincian project: ${formatError(err)}` }],
      };
    }
  },
);

// Tool 4: create_project
server.tool(
  "create_project",
  "Buat project baru di Desk. Dapat otomatis menghubungkan atau membuat data customer baru.",
  {
    name: z.string().describe("Nama project (minimal 2 karakter)"),
    totalAmount: z
      .union([z.string(), z.number()])
      .describe("Nilai total kontrak project (contoh: 15000000 atau '15.000.000')"),
    currency: z.string().default("IDR").describe("Mata uang, contoh: IDR, USD"),
    status: z
      .enum(["draft", "active", "on_hold", "completed", "cancelled"])
      .default("active")
      .describe("Status awal project"),
    clientName: z.string().optional().describe("Nama client / customer"),
    clientEmail: z.string().optional().describe("Email client / customer"),
    clientCompany: z.string().optional().describe("Nama perusahaan client"),
    clientId: z.string().optional().describe("ID customer yang sudah ada (opsional jika clientName diisi)"),
    description: z.string().optional().describe("Deskripsi ruang lingkup project"),
    startDate: z.string().optional().describe("Tanggal mulai (format YYYY-MM-DD)"),
    dueDate: z.string().optional().describe("Deadline project (format YYYY-MM-DD)"),
    progressMode: z.enum(["auto", "manual"]).default("auto").describe("Mode kalkulasi progress"),
    progressPercent: z.number().min(0).max(100).default(0).describe("Persentase jika progressMode manual"),
  },
  async (args) => {
    try {
      const data = await apiRequest("/api/v1/projects", {
        method: "POST",
        body: args,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal membuat project: ${formatError(err)}` }],
      };
    }
  },
);

// Tool 5: update_project
server.tool(
  "update_project",
  "Perbarui informasi project: status, progress, deadline, deskripsi, atau nilai kontrak.",
  {
    projectId: z.string().describe("ID project atau Kode Project"),
    name: z.string().optional().describe("Nama baru project"),
    status: z
      .enum(["draft", "active", "on_hold", "completed", "cancelled"])
      .optional()
      .describe("Status baru project"),
    totalAmount: z
      .union([z.string(), z.number()])
      .optional()
      .describe("Nilai kontrak baru"),
    description: z.string().optional().describe("Deskripsi project"),
    dueDate: z.string().optional().describe("Deadline baru (YYYY-MM-DD)"),
    startDate: z.string().optional().describe("Tanggal mulai (YYYY-MM-DD)"),
    progressMode: z.enum(["auto", "manual"]).optional().describe("Mode kalkulasi progress"),
    progressPercent: z.number().min(0).max(100).optional().describe("Persentase progress manual"),
    clientId: z.string().optional().describe("ID customer terkait"),
  },
  async ({ projectId, ...body }) => {
    try {
      const data = await apiRequest(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
        method: "PATCH",
        body,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal memperbarui project: ${formatError(err)}` }],
      };
    }
  },
);

// Tool 6: list_clients
server.tool(
  "list_clients",
  "Daftar seluruh customer / client beserta statistik project dan total nilai pembayaran.",
  {
    search: z.string().optional().describe("Pencarian berdasarkan nama, email, atau perusahaan"),
  },
  async ({ search }) => {
    try {
      const data = await apiRequest("/api/v1/clients", {
        params: { search },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal mengambil daftar customer: ${formatError(err)}` }],
      };
    }
  },
);

// Tool 7: create_client
server.tool(
  "create_client",
  "Tambahkan data customer / client baru.",
  {
    name: z.string().describe("Nama lengkap atau kontak customer"),
    email: z.string().optional().describe("Alamat email customer"),
    company: z.string().optional().describe("Perusahaan atau brand customer"),
    phone: z.string().optional().describe("Nomor telepon / WhatsApp customer"),
  },
  async (args) => {
    try {
      const data = await apiRequest("/api/v1/clients", {
        method: "POST",
        body: args,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal membuat customer: ${formatError(err)}` }],
      };
    }
  },
);

// Tool 8: list_milestones
server.tool(
  "list_milestones",
  "Daftar tahapan / milestone kerja pada sebuah project.",
  {
    projectId: z.string().describe("ID project atau Kode Project"),
  },
  async ({ projectId }) => {
    try {
      const data = await apiRequest(
        `/api/v1/projects/${encodeURIComponent(projectId)}/milestones`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal mengambil milestones: ${formatError(err)}` }],
      };
    }
  },
);

// Tool 9: create_milestone
server.tool(
  "create_milestone",
  "Tambahkan tahapan milestone baru pada project. Progress project akan otomatis dihitung ulang jika mode auto.",
  {
    projectId: z.string().describe("ID project atau Kode Project"),
    title: z.string().describe("Judul milestone (contoh: 'Slicing UI & Responsif')"),
    description: z.string().optional().describe("Deskripsi rincian pengerjaan milestone"),
    weight: z.number().min(1).default(1).describe("Bobot milestone untuk kalkulasi progress"),
    dueDate: z.string().optional().describe("Target selesai (YYYY-MM-DD)"),
    status: z
      .enum(["not_started", "in_progress", "done", "blocked"])
      .default("not_started")
      .describe("Status awal milestone"),
  },
  async ({ projectId, ...body }) => {
    try {
      const data = await apiRequest(
        `/api/v1/projects/${encodeURIComponent(projectId)}/milestones`,
        {
          method: "POST",
          body,
        },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal menambahkan milestone: ${formatError(err)}` }],
      };
    }
  },
);

// Tool 10: update_milestone
server.tool(
  "update_milestone",
  "Perbarui status, bobot, target waktu, atau judul sebuah milestone.",
  {
    projectId: z.string().describe("ID project atau Kode Project"),
    milestoneId: z.string().describe("ID milestone"),
    status: z
      .enum(["not_started", "in_progress", "done", "blocked"])
      .optional()
      .describe("Status baru milestone (misal: 'done' saat selesai)"),
    title: z.string().optional().describe("Judul baru"),
    description: z.string().optional().describe("Deskripsi"),
    weight: z.number().min(1).optional().describe("Bobot baru"),
    dueDate: z.string().optional().describe("Target baru (YYYY-MM-DD)"),
  },
  async ({ projectId, milestoneId, ...body }) => {
    try {
      const data = await apiRequest(
        `/api/v1/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(milestoneId)}`,
        {
          method: "PATCH",
          body,
        },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal memperbarui milestone: ${formatError(err)}` }],
      };
    }
  },
);

// Tool 11: add_payment_term
server.tool(
  "add_payment_term",
  "Tambahkan termin jadwal pembayaran ke dalam project (misal DP 40%, Termin 2 40%, Pelunasan 20%).",
  {
    projectId: z.string().describe("ID project atau Kode Project"),
    label: z.string().describe("Nama atau label termin (contoh: 'DP 40% Kickoff & Server')"),
    amount: z
      .union([z.string(), z.number()])
      .describe("Nominal termin (contoh: 6472592 atau '6.472.592')"),
    dueDate: z.string().optional().describe("Jatuh tempo termin (YYYY-MM-DD)"),
    status: z
      .enum(["unpaid", "partial", "paid", "overdue"])
      .default("unpaid")
      .describe("Status awal termin"),
  },
  async ({ projectId, ...body }) => {
    try {
      const data = await apiRequest(
        `/api/v1/projects/${encodeURIComponent(projectId)}/payment-terms`,
        {
          method: "POST",
          body,
        },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal menambahkan termin pembayaran: ${formatError(err)}` }],
      };
    }
  },
);

// Tool 12: record_payment
server.tool(
  "record_payment",
  "Catat penerimaan pembayaran dari client ke dalam project.",
  {
    projectId: z.string().describe("ID project atau Kode Project"),
    amount: z
      .union([z.string(), z.number()])
      .describe("Nominal yang dibayar (contoh: 5000000 atau '5.000.000')"),
    paidAt: z.string().optional().describe("Tanggal pembayaran diterima (YYYY-MM-DD, default hari ini)"),
    method: z.string().default("Transfer Bank").describe("Metode bayar (contoh: BCA, Mandiri, PayPal)"),
    note: z.string().optional().describe("Catatan atau keterangan pembayaran"),
    status: z
      .enum(["verified", "pending"])
      .default("verified")
      .describe("Status verifikasi pembayaran"),
    termId: z.string().optional().describe("ID termin pembayaran terkait (opsional)"),
  },
  async ({ projectId, ...body }) => {
    try {
      const data = await apiRequest(
        `/api/v1/projects/${encodeURIComponent(projectId)}/payments`,
        {
          method: "POST",
          body,
        },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal mencatat pembayaran: ${formatError(err)}` }],
      };
    }
  },
);

// Tool 12: post_update
server.tool(
  "post_update",
  "Posting pembaruan progress atau siaran log pengerjaan yang dapat dilihat client di portal.",
  {
    projectId: z.string().describe("ID project atau Kode Project"),
    title: z.string().describe("Judul pembaruan (contoh: 'Fitur autentikasi telah rampung')"),
    body: z.string().optional().describe("Rincian pembaruan yang dikerjakan"),
    visibility: z
      .enum(["client", "internal"])
      .default("client")
      .describe("Visibilitas siaran: 'client' (terlihat di portal) atau 'internal'"),
  },
  async ({ projectId, ...body }) => {
    try {
      const data = await apiRequest(
        `/api/v1/projects/${encodeURIComponent(projectId)}/updates`,
        {
          method: "POST",
          body,
        },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal memposting pembaruan: ${formatError(err)}` }],
      };
    }
  },
);

// Tool 13: post_comment
server.tool(
  "post_comment",
  "Tulis komentar diskusi pada project atau komponen tertentu.",
  {
    projectId: z.string().describe("ID project atau Kode Project"),
    body: z.string().describe("Isi pesan komentar"),
    entityType: z
      .enum(["project", "milestone", "update", "payment"])
      .default("project")
      .describe("Objek yang dikomentari"),
    entityId: z.string().optional().describe("ID objek jika mengomentari milestone/payment"),
    visibility: z.enum(["client", "internal"]).default("client"),
  },
  async ({ projectId, ...body }) => {
    try {
      const data = await apiRequest(
        `/api/v1/projects/${encodeURIComponent(projectId)}/comments`,
        {
          method: "POST",
          body,
        },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Gagal mengirim komentar: ${formatError(err)}` }],
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Desk MCP Server running via stdio");
}

main().catch((error) => {
  console.error("Fatal error in Desk MCP Server:", error);
  process.exit(1);
});

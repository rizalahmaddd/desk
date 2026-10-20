export const APP_NAME = "Desk";

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_FILES_PER_MESSAGE = 10;
export const OWNER_STORAGE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024;
export const SHARE_SESSION_DAYS = 7;

export const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
  "video/webm",
]);

export const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "ps1",
  "sh",
  "jar",
  "app",
  "dmg",
  "php",
  "js",
  "mjs",
  "html",
  "htm",
  "svg",
]);

export const PROJECT_STATUS_LABELS = {
  draft: "Draft",
  active: "Aktif",
  on_hold: "Ditahan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
} as const;

export const MILESTONE_STATUS_LABELS = {
  not_started: "Belum mulai",
  in_progress: "Dikerjakan",
  done: "Selesai",
  blocked: "Terhambat",
} as const;

export const PAYMENT_STATUS_LABELS = {
  pending: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
  refunded: "Refund",
} as const;

export const PAYMENT_TERM_STATUS_LABELS = {
  unpaid: "Belum dibayar",
  partial: "Dibayar sebagian",
  paid: "Lunas",
  overdue: "Jatuh tempo",
} as const;

export const PAYMENT_METHODS = [
  "Transfer bank",
  "QRIS",
  "Tunai",
  "E-wallet",
  "Lainnya",
] as const;

export const SUPPORTED_CURRENCIES = ["IDR", "USD", "EUR", "SGD"] as const;

export const PROJECT_STATUSES = [
  "draft",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export const MILESTONE_STATUSES = [
  "not_started",
  "in_progress",
  "done",
  "blocked",
] as const;

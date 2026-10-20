/**
 * WhatsApp Helper Utilities for Freelancers & Studios
 * Generates formatted direct WhatsApp links and localized message templates.
 */

import { formatDate } from "./dates";
import { formatMoney } from "./money";

/**
 * Normalizes an Indonesian / International phone number for WhatsApp:
 * Examples:
 * - "0812-3456-7890" -> "6281234567890"
 * - "+62 812 3456 7890" -> "6281234567890"
 * - "6281234567890" -> "6281234567890"
 * - "08123456789" -> "628123456789"
 */
export function normalizeWhatsAppPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith("62")) {
    return digits;
  }
  if (digits.startsWith("8")) {
    return `62${digits}`;
  }
  return digits;
}

/**
 * Builds direct WhatsApp URL:
 * - If phone is valid: https://wa.me/{phone}?text={encoded}
 * - If phone is empty: https://wa.me/?text={encoded} (WhatsApp prompts to pick a contact)
 */
export function buildWhatsAppUrl(phone?: string | null, text?: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  const encodedText = text ? encodeURIComponent(text.trim()) : "";

  if (normalized) {
    return `https://wa.me/${normalized}${encodedText ? `?text=${encodedText}` : ""}`;
  }
  return `https://wa.me/${encodedText ? `?text=${encodedText}` : ""}`;
}

/**
 * Template: Pengingat Tagihan Termin / Invoice
 */
export function formatInvoiceReminderText({
  clientName,
  projectName,
  termLabel,
  amount,
  currency = "IDR",
  dueDate,
  invoiceNo,
  portalUrl,
}: {
  clientName?: string | null;
  projectName: string;
  termLabel: string;
  amount: number;
  currency?: string;
  dueDate?: string | null;
  invoiceNo?: string | null;
  portalUrl?: string | null;
}): string {
  const greeting = clientName ? `Halo Kak *${clientName}*,` : "Halo Kak,";
  const dueInfo = dueDate ? `\n⏳ *Jatuh Tempo:* ${formatDate(dueDate)}` : "";
  const invoiceInfo = invoiceNo ? `\n🧾 *Invoice:* ${invoiceNo}` : "";
  const portalInfo = portalUrl ? `\n\n🔗 *Rincian & Portal Proyek:* \n${portalUrl}` : "";

  return (
    `${greeting}\n\n` +
    `Berikut pengingat pembayaran untuk termin proyek *${projectName}*:\n` +
    `📌 *Termin:* ${termLabel}\n` +
    `💰 *Nominal:* ${formatMoney(amount, currency)}` +
    `${dueInfo}` +
    `${invoiceInfo}` +
    `${portalInfo}\n\n` +
    `Mohon konfirmasi jika pembayaran telah dilakukan. Terima kasih banyak atas kerjasamanya! 🙏`
  );
}

/**
 * Template: Bukti Pembayaran / Kwitansi Diterima
 */
export function formatReceiptNotificationText({
  clientName,
  projectName,
  invoiceNo,
  amount,
  currency = "IDR",
  paidAt,
  method,
  portalUrl,
}: {
  clientName?: string | null;
  projectName: string;
  invoiceNo: string;
  amount: number;
  currency?: string;
  paidAt?: string | null;
  method?: string | null;
  portalUrl?: string | null;
}): string {
  const greeting = clientName ? `Halo Kak *${clientName}*,` : "Halo Kak,";
  const paidDate = paidAt ? formatDate(paidAt) : formatDate(new Date().toISOString());
  const methodInfo = method ? ` via ${method}` : "";
  const portalInfo = portalUrl ? `\n\n🔗 *Lihat Bukti Kwitansi Resmi:* \n${portalUrl}` : "";

  return (
    `${greeting}\n\n` +
    `Pembayaran Anda untuk proyek *${projectName}* telah berhasil kami terima dan verifikasi:\n\n` +
    `🧾 *No. Kwitansi:* ${invoiceNo}\n` +
    `💰 *Nominal Diterima:* ${formatMoney(amount, currency)}\n` +
    `📅 *Tanggal:* ${paidDate}${methodInfo}` +
    `${portalInfo}\n\n` +
    `Terima kasih atas pembayarannya! Pengerjaan proyek akan terus kami perbarui di portal. 🙏`
  );
}

/**
 * Template: Akses Link Portal Klien
 */
export function formatPortalShareText({
  clientName,
  projectName,
  portalUrl,
}: {
  clientName?: string | null;
  projectName: string;
  portalUrl: string;
}): string {
  const greeting = clientName ? `Halo Kak *${clientName}*,` : "Halo Kak,";

  return (
    `${greeting}\n\n` +
    `Berikut tautan portal klien untuk memantau progres, jadwal milestone, dan berkas proyek *${projectName}*:\n\n` +
    `🔗 *Portal Klien Langsung:*\n${portalUrl}\n\n` +
    `Tautan ini dapat diakses kapan saja tanpa perlu kata sandi. Silakan bookmark untuk kemudahan akses. Terima kasih! 🙏`
  );
}

/**
 * Template: Ringkasan Progres Proyek untuk Chat Klien
 */
export function formatProjectProgressSummary({
  clientName,
  projectName,
  progressPercent,
  currentMilestone,
  dueDate,
  daysLeft,
  portalUrl,
}: {
  clientName?: string | null;
  projectName: string;
  progressPercent: number;
  currentMilestone?: string | null;
  dueDate?: string | null;
  daysLeft?: number | null;
  portalUrl?: string | null;
}): string {
  const greeting = clientName ? `Halo Kak *${clientName}*,` : "Halo Kak,";
  const milestoneInfo = currentMilestone
    ? `\n📌 *Sedang Dikerjakan:* ${currentMilestone}`
    : "";
  
  let deadlineInfo = "";
  if (dueDate) {
    deadlineInfo = `\n⏳ *Target Selesai:* ${formatDate(dueDate)}`;
    if (daysLeft !== null && daysLeft !== undefined) {
      if (daysLeft < 0) {
        deadlineInfo += ` (Terlambat ${Math.abs(daysLeft)} hari)`;
      } else if (daysLeft === 0) {
        deadlineInfo += ` (Target hari ini!)`;
      } else {
        deadlineInfo += ` (${daysLeft} hari lagi)`;
      }
    }
  }

  const portalInfo = portalUrl ? `\n\n🔗 *Pantau detail progres di sini:*\n${portalUrl}` : "";

  return (
    `${greeting}\n\n` +
    `Berikut update ringkas progres pengerjaan proyek *${projectName}*:\n\n` +
    `🚀 *Progres Keseluruhan:* ${progressPercent}%` +
    `${milestoneInfo}` +
    `${deadlineInfo}` +
    `${portalInfo}\n\n` +
    `Jika ada catatan atau masukan, silakan kabari ya Kak. Terima kasih! 🙌`
  );
}
